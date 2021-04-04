/**
 *  Client-side utils to reduce duplication in various KO tables showing reports
 *
 *  @author strix
 *  @date:  2018-05-31
 */

/*eslint prefer-template:0, strict:0 */
/*global YUI */
YUI.add( 'csv-utils', function( Y, NAME ) {
    'use strict';

    const
        { formatPromiseResult, promisifyArgsCallback, handleResult } = require( 'dc-core' ).utils,
        { logEnter, logExit } = require( '../../../../server/utils/logWrapping.js' )(Y, NAME),
        util = require( 'util' ),
        moment = require( 'moment' ),
        fs = require( 'fs' ),
        path = require( 'path' ),
        i18n = Y.doccirrus.i18n,
        TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),
        PAGE_SIZE = 100,
        promisify = util.promisify,
        exec = require( 'child_process' ).exec,
        execProm = promisify( exec ),
        execOptions = {
            cwd: process.cwd(),
            detached: false,
            shell: true
        };

    /**
     *  Given a cursor and CSV column definitions, format and write all rows to the given fileName
     *
     *  @param  {String}    fileName            Location to write csv
     *  @param  {Object}    cursor              A mongoose cursor
     *  @param  {Object}    displayFields       As in report configuration
     *  @param  {Object}    options             Formatting options
     *  @param  {Object}    options.separator   Separator, comma by default
     *  @param  {Object}    options.newline     Line break, newline by default
     *  @param  {Boolean}   isRequestFromSol    True when request is coming from a sol
     *  @return {Promise<void>}
     */

    async function cursorToCSV( fileName, cursor, displayFields, options, isRequestFromSol ) {
        const
            timer = logEnter( `cursorToCSV: ${fileName}` ),

            inCaseSchema = Y.dcforms.schema.InCase_T,

            openFileP = util.promisify( fs.open ),
            writeFileP = util.promisify( fs.write ),
            closeFileP = util.promisify( fs.close );

        let
            separator = options.separator || ',',
            newline = options.newline || '\n',
            lang = options.lang || 'de',
            row, err,
            fileHandle,
            line, field, label, i,
            lineCount = 1;

        //  1.  Open the file and write the title line

        [ err, fileHandle ] = await formatPromiseResult( openFileP( fileName, 'w' ) );

        if ( err ) {
            Y.log( `Could not open CSV file ${fileName} for writing: ${err.stack||err}`, 'error', NAME );
            throw err;
        }

        line = [];
        for ( i = 0; i < displayFields.length; i++ ) {
            field = displayFields[i];

            label = `"${field.value}"`;

            if ( inCaseSchema[ field.value ] && inCaseSchema[ field.value ].label && inCaseSchema[ field.value ].label[lang] ) {
                label = `"${inCaseSchema[ field.value ].label[lang]}"`;
                //console.log( `(****) set label from schema: ${field.value} -> ${label}` );
            }

            if ( field.label && field.label[lang] ) {
                label = `"${field.label[lang]}"`;
            }

            line.push( label );
        }

        [ err ] = await formatPromiseResult( writeFileP( fileHandle, line.join( separator ) + newline ) );

        if ( err ) {
            Y.log( `Could not write CSV file headline ${fileName}: ${err.stack||err}`, 'error', NAME );
            throw err;
        }

        //  2.  Stream all rows from the cursor

        while ( row = await cursor.next() ) {       //  eslint-disable-line no-cond-assign
            line = [];
            lineCount++;

            //  2.1 Format a line of results

            for ( i = 0; i < displayFields.length; i++ ) {
                field = displayFields[i];

                if ( row.hasOwnProperty( field.value ) ) {
                    line.push( applyCustomRenderers( field, row[field.value] ) );
                } else {
                    line.push( "" );
                }

            }

            //  2.2 Write it to the file

            [ err ] = await formatPromiseResult( writeFileP( fileHandle, line.join( separator ) + newline ) );

            if ( err ) {
                Y.log( `Could not write CSV file ${fileName}: ${err.stack||err}`, 'error', NAME );
                throw err;
            }
        }

        //  3.  Close the file

        [ err ] = await formatPromiseResult( closeFileP( fileHandle ) );

        if ( err ) {
            Y.log( `Could not close CSV file ${fileName}: ${err.stack||err}`, 'error', NAME );
            throw err;
        }

        // For sols to be able to read the created file on production systems, the group needs to be changed to sols
        if( isRequestFromSol && !Y.doccirrus.auth.isDevServer() ) {
            [ err ] = await formatPromiseResult( execProm( `chown prc:sols ${fileName}`, execOptions) );
            if ( err ) {
                Y.log( `Could not change group of ${fileName} to sols: ${err.stack||err}`, 'error', NAME );
                throw err;
            }
        }

        timer.message += ` wrote ${lineCount} lines`;
        logExit( timer );
    }

    /**
     *  Page through a source of table data, keeping the query and options set in KoTable
     *
     *  @param  {Object}    args
     *  @param  {Object}    args.originalParams
     *  @param  {Object}    args.originalParams.apiName             API to request data from
     *  @param  {Object}    args.originalParams.methodName          Name of API method to use
     *  @param  {Object}    args.originalParams.displayFields       Column names and value types, same format as reports
     *  @param  {Object}    args.originalParams.separator           CSV value separator, defaults to ','
     *  @param  {Object}    args.originalParams.newline             CSV newline character, defaults to '\n'
     *  @param  {Object}    args.callback
     *  @param  {Object}    fileName                                trusted path to write the CSV into
     */

    async function pagedAPIToCSV( fileName, args ) {
        const
            //  Do not send these to jsonrpc
            noCopyParams = [ 'fileName', 'apiName', 'methodName', 'separator', '0' ],

            jsonRpcP = util.promisify( Y.doccirrus.JSONRPCController.handleRequest ),

            openFileP = util.promisify( fs.open ),
            writeFileP = util.promisify( fs.write ),
            closeFileP = util.promisify( fs.close ),

            rpcs = Y.doccirrus.jsonrpc.reflection._clientIdMap,
            params = args.originalParams || {},

            apiName = params.apiName || '',
            methodName = params.methodName || '',

            displayFields = params.displayFields || [],


            separator = params.separator || ',',
            newline = params.newline || '\n',
            lang = params.lang || 'de',

            timer = logEnter( `pagedAPIToCSV: ${fileName}` );

        let
            err, result,
            foundRPC,
            fileHandle,
            totalItems,
            numPages,
            lineCount = 0,

            row, field, line,

            i, j, k,

            config;

        //  Check that the requested endpoint is in the JSON RPC Reflection definition (security)

        for ( k in rpcs ) {
            if ( rpcs.hasOwnProperty( k ) ) {

                if ( rpcs[k].namespace === apiName && rpcs[k].method === methodName ) {
                    foundRPC = rpcs[k];
                }

            }
        }

        if ( !foundRPC ) {
            Y.log( `Attempted to generate CSV from an invalid method: ${apiName} ${methodName}.`, 'error', NAME );
            return handleResult( new Error('method not found'), null, args.callback );
        }

        //  Make a template for JSONRPC requests

        config = {
            lang: lang,
            req: {
                user: args.user
            },
            params: {
                id: foundRPC.clientId,
                jsonrpc: '2.0',
                method: `${apiName}.${methodName}`,
                params: {}
            }
        };

        params.query = params.query || {};

        for ( k  in params ) {
            if ( params.hasOwnProperty( k ) ) {
                if ( -1 === noCopyParams.indexOf( k) ) {
                    config.params.params[k] = params[k];
                }
            }
        }

        //  Run a single entry through jsonrpc endpoint to get count

        config.params.params.ignoreCountLimit = true;
        config.params.params.page = 1;
        config.params.params.itemsPerPage = 1;

        [ err, result ] = await formatPromiseResult( jsonRpcP( config ) );

        if ( err ) {
            Y.log( `JSON RPC error ${err.stack||err}`, 'error', NAME );
            return handleResult( err, null, args.callback );
        }

        try {
            result = JSON.parse( result.data );
            result = result.result;
        } catch ( parseErr ) {
            Y.log( `Could not parse JSONRPC result: ${parseErr.stack||parseErr}`, 'debug', NAME );
            return handleResult( parseErr, null, args.callback );
        }

        totalItems = ( result.meta && result.meta.totalItems ) || 0;
        numPages = Math.ceil( totalItems / PAGE_SIZE );
        Y.log( `Making paged CSV, have totalItems: ${totalItems} numPages: ${numPages}, endpoint: ${foundRPC.clientId}`, 'info', NAME );

        //  Dev/fallback - make the displayFields from the first row

        if ( 0 === displayFields.length && result.data && result.data[0] ) {
            row = result.data[0];

            for ( k in row ) {
                if ( row.hasOwnProperty( k ) ) {
                    displayFields.push( {
                        value: k,
                        type: ( typeof row[k] === 'number' ) ? 'Number' : 'String',
                        label: { de: k, en: k }
                    } );
                }
            }
        }

        //  Open the file and write the title line

        [ err, fileHandle ] = await formatPromiseResult( openFileP( fileName, 'w' ) );

        if ( err ) {
            Y.log( `Could not open CSV file ${fileName} for writing: ${err.stack||err}`, 'error', NAME );
            throw err;
        }

        line = [];
        for ( i = 0; i < displayFields.length; i++ ) {
            if ( displayFields[i].label && displayFields[i].label[lang] ) {
                line.push( displayFields[i].label[lang] );
            } else {
                line.push( displayFields[i].value );
            }
        }

        [ err ] = await formatPromiseResult( writeFileP( fileHandle, line.join( separator ) + newline ) );

        //  Get results, one page at a time

        for ( i = 0; i < numPages; i++ ) {

            config.params.params.page = i + 1;
            config.params.params.itemsPerPage = PAGE_SIZE;

            //  Get next page of results

            Y.log( `Loading page ${i} of ${numPages} for ${apiName} ${methodName} CSV`, 'info', NAME );
            [ err, result ] = await formatPromiseResult( jsonRpcP( config ) );

            if ( err ) {
                Y.log( `JSON RPC error ${err.stack||err}`, 'error', NAME );
                return handleResult( err, null, args.callback );
            }

            try {
                result = JSON.parse( result.data );
                result = result.result;
            } catch ( parseErr ) {
                Y.log( `Could not parse JSONRPC result: ${parseErr.stack||parseErr}`, 'debug', NAME );
                return handleResult( parseErr, null, args.callback );
            }

            if ( result.meta && result.meta.errors && result.meta.errors.length > 0 ) {
                Y.log( `Error in JSPNRPC call ${apiName} ${methodName}: ${JSON.stringify(result.meta.errors)}`, 'debug', NAME );
                return handleResult( result.meta.errors[0], null, args.callback );
            }

            //  Write each line to the file

            for ( j = 0; j < result.data.length; j++ ) {
                row = result.data[j];
                line = [];

                //  2.1 Format a line of results

                for ( k = 0; k < displayFields.length; k++ ) {
                    field = displayFields[k];

                    if ( row.hasOwnProperty( field.value ) ) {
                        line.push( applyCustomRenderers( field, row[field.value] ) );
                    } else {
                        line.push( "" );
                    }

                }

                //  2.2 Write it to the file

                [ err ] = await formatPromiseResult( writeFileP( fileHandle, line.join( separator ) + newline ) );

                if ( err ) {
                    Y.log( `Could not write CSV file ${fileName}: ${err.stack||err}`, 'error', NAME );
                    throw err;
                }

                lineCount++;
            }

        }

        if ( err ) {
            Y.log( `Could not write CSV file ${fileName}: ${err.stack||err}`, 'error', NAME );
            throw err;
        }

        //  Close the file

        [ err ] = await formatPromiseResult( closeFileP( fileHandle ) );

        if ( err ) {
            Y.log( `Could not close CSV file ${fileName}: ${err.stack||err}`, 'error', NAME );
            throw err;
        }

        timer.message += ` wrote ${lineCount} lines`;
        logExit( timer );
        handleResult( null, { fileName }, args.callback );
    }

    /**
     *  Server-side version of report-table-utils.client.js
     *  Not quite the same, since values in CSV do not use HTML, color, etc
     *
     *  @param field
     *  @param value
     */

    function applyCustomRenderers( field, value ) {
        var translateEnum = Y.doccirrus.schemaloader.translateEnumValue;

        if( value === null ) {
            return "";
        }

        //  Implicit renderer names
        switch( field.type ) {
            case 'Date':    field.rendererName = field.rendererName || 'Date';  break;
            case 'Number':  field.rendererName = field.rendererName || 'Number';    break;
        }

        //  Translate enums
        switch( field.value ) {
            case 'actType':
                value = translateEnum( 'i18n', value, Y.doccirrus.schemas.activity.types.Activity_E.list, 'k.A.' );
                break;
        }

        //  Custom renderers for reporting columns
        switch ( field.rendererName ) {

            case 'Image':
                //  can't show images in CSV
                value = '';
                break;

            case 'Number':
                //  TODO: type checking here?
                break;

            case 'Date':
                value = moment( value );
                if ( value.isValid() ) {
                    value = moment( value ).format( TIMESTAMP_FORMAT );
                } else {
                    //  leave out invalid dates instead of showing the Unix epoch
                    value = "";
                }
                break;
        }

        //  Strings should be quoted and linebreaks removed
        if ( 'Number' !== field.type ) {
            value = `"${value}"`.replace(/\n/gm," ");
        }
        return value;

    }

    /**
     * Gets a path for the given CSV file name within the general temporary folder
     *
     * Makes sure, the path can be trusted.
     *
     * @param {String} fileName name of the CSV file
     * @returns {String}
     */
    function getTemporaryFilePathForCSV( fileName ) {
        const
            envConfig = Y.doccirrus.utils.getConfig( 'env.json' );

        let
            workingDir = envConfig.directories.tmp,
            filePath = path.join( workingDir, fileName ),
            cleanPath = Y.doccirrus.media.pathIsInDir( filePath, workingDir );


        if( !envConfig || !envConfig.directories || !envConfig.directories.tmp ) {
            Y.log( 'getTemporaryFilePathForCSV, Couldn\'t get tmp directory from env.json.', 'error', NAME );
            throw ('Missing configuration. Couldn\'t locate directory to write the file to.');
        }


        if( cleanPath.includes( '/blocked.directory.traversal' ) ) {
            Y.log( `getSharedFilePathForCSV, Aborted incoming request due to blocked directory traversal caused by the given filename: ${fileName}.`, 'error', NAME );
            throw new Y.doccirrus.commonerrors.DCError( 400, {message: 'Aborted incoming request due to blocked directory traversal caused by the given filename.'} );
        }

        return cleanPath;

    }

    /**
     * Gets a path for the given CSV file name within the SOL workspace
     *
     * Makes sure, the path can be trusted.
     *
     * @param {String} fileName name of the CSV file
     * @param {String} solName name of the SOL
     * @returns {String}
     */
    function getSharedFilePathForCSV( fileName, solName ) {
        const
            solsConfig = Y.doccirrus.utils.tryGetConfig( 'sols.json', null );

        let workingDir,
            filePath,
            cleanPath;

        if( !solsConfig || !solsConfig.workBaseDir ) {
            Y.log( 'getSharedFilePathForCSV, Couldn\'t get workBaseDir from sols.json.', 'error', NAME );
            throw ('Missing configuration. Couldn\'t locate directory to write the file to.');
        }

        // The shared workBaseDir is set up slightly differently in dev and production systems
        if( Y.doccirrus.auth.isDevServer() ) {
            workingDir = path.join( solsConfig.workBaseDir, solName, 'work' );
        } else {
            workingDir = path.join( solsConfig.workBaseDir, solName );
        }

        filePath = path.join( workingDir, fileName );

        cleanPath = Y.doccirrus.media.pathIsInDir( filePath, workingDir );

        if( cleanPath.includes( '/blocked.directory.traversal' ) ) {
            Y.log( `getSharedFilePathForCSV, Aborted incoming request due to blocked directory traversal caused by the given filename: ${fileName}.`, 'error', NAME );
            throw new Y.doccirrus.commonerrors.DCError( 400, {message: 'Aborted incoming request due to blocked directory traversal caused by the given filename.'} );
        }

        return cleanPath;
    }


    /**
     *  Route for CSV rendering from reports
     *
     *  Format is same as requested by inSight KO Tables, but with a fileName property
     *     *
     *  @param  {Object}    args
     *  @param  {Object}    args.user
     *  @param  {Object}    args.originalParams
     *  @param  {String}    args.originalParams.insightConfigId             insight2 Config Id
     *  @param  {String}    args.originalParams.fileName
     *  @param  {Object}    args.originalParams.dates
     *  @param  {String}    args.originalParams.dates.startDate
     *  @param  {String}    args.originalParams.dates.endDate
     *  @param  {Object}    args.originalParams.sort                        Optional table sorters
     *  @return {String}    trustedPathToCSV
     */

    async function createCSVFromCursor( args ) {
        const
            getDataByConfigIdP = promisifyArgsCallback( Y.doccirrus.insight2.aggregations.getDataByConfigId ),

            params = args.req && args.req.body || args.originalParams,
            insightConfigId = params.insightConfigId || '575154d9719f70f7221d2b7c',
            startDate = params.startDate || '2019-03-31T22:00:00.000Z',
            endDate = params.endDate || '2020-06-30T21:59:59.999Z',
            fileName = params.fileName || 'test.csv';

        let
            err, config, cursor,

            options = {
                separator: params.separator || ',',
                newline: params.newline || '\n',
                lang: params.lang || 'de'
            },
            configOptions = {
                user: args.user,
                originalParams: {
                    noTimeout: true,
                    dates: {
                        startDate: startDate,
                        endDate: endDate
                    },
                    insightConfigId: insightConfigId,
                    sort: { patientName: 1 },
                    query: {}
                },
                asCursor: true
            },
            isRequestFromSol = args.httpRequest.friendData && args.httpRequest.friendData.appName ? true : false,
            trustedPathToCSV = isRequestFromSol ? getSharedFilePathForCSV( fileName, args.httpRequest.friendData.appName ) : getTemporaryFilePathForCSV( fileName );


        [ err, config ] = await formatPromiseResult( Y.doccirrus.insight2.aggregations.getInsightConfig( insightConfigId, args.user ) );

        if ( err ) {
            Y.log( `createCSVFromCursor: Could not load insight2 config object: ${err.stack||err}`, 'error', NAME );
            throw( err );
        }

        Y.log( `createCSVFromCursor: Getting cursor data from options ${JSON.stringify(configOptions.originalParams)}`, 'info', NAME );
        [ err, cursor ] = await formatPromiseResult( getDataByConfigIdP( configOptions ) );

        if ( err ) {
            Y.log( `createCSVFromCursor: Could not create a cursor on the aggregation: ${err.stack||err}`, 'error', NAME );
            throw( err );
        }

        [err] = await formatPromiseResult( cursorToCSV( trustedPathToCSV, cursor, config.displayFields, options, isRequestFromSol ) );

        if ( err ) {
            Y.log( `createCSVFromCursor: Could not export cursor to CSV: ${err.stack||err}`, 'error', NAME );
            throw( err );
        }

        return trustedPathToCSV;
    }


    /**
     *  Route for CSV rendering from a paged API
     *
     *  @param  {Object}    args
     *  @param  {String}    args.originalParams.fileName
     *  @param  {String}    args.originalParams.apiName
     *  @param  {String}    args.originalParams.methodName
     *
     */
    function createCSVFromPagedAPI( args ) {
        const params = args.originalParams,
            fileName = params.fileName || 'test.csv',
            isRequestFromSol = args.httpRequest.friendData && args.httpRequest.friendData.appName,
            trustedPathToCSV = isRequestFromSol ? getSharedFilePathForCSV( fileName, args.httpRequest.friendData.appName ) : getTemporaryFilePathForCSV( fileName );

        params.apiName = params.apiName || 'basecontact';
        params.methodName = params.methodName || 'read';

        pagedAPIToCSV( trustedPathToCSV, args );
    }

    /*
     *  Expose API
     */

    Y.namespace( 'doccirrus.insight2' ).csv = {
        createCSVFromCursor,
        createCSVFromPagedAPI,
        cursorToCSV,
        pagedAPIToCSV
    };

}, '1.0.0', {
    requires: []
} );