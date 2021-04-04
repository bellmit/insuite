/*
 @author: jm
 @date: 2014-10-13
 */
//TRANSLATION INCOMPLETE!! MOJ-3201
/**
 * Library for printer features.
 */

/*global YUI */



YUI.add( 'dcprinter', function( Y, NAME ) {

        const
            { formatPromiseResult } = require( 'dc-core' ).utils,
            { logEnter, logExit } = require( '../../../server/utils/logWrapping.js' )(Y, NAME),
            shell_exec = require( 'child_process' ).exec;

        /**
         *  Enumerate printers and their properties
         *
         *  Used by clients to enumerate printers and check their status, and by server to validate printer names
         *
         *  @param   params      {Object}    May have optional printerName property
         *  @param   callback    {Function}  Of the forn fn(err, printersArray)
         */

        async function getPrinter( params, callback ) {
            let printerName = params.printerName || '';     //untrusted

            let [err, shellCmd] = await formatPromiseResult(
                Y.doccirrus.binutilsapi.constructShellCommand( {
                    bin: 'lpstat',
                    shellArgs: [
                        '-l',
                        '-d',
                        '-p'
                    ]
                } )
            );
            if( err ) {
                callback( err );
                return;
            }

            try {
                shell_exec( shellCmd, onListPrinters );
            } catch( e ) {
                callback( e );
                return;
            }

            function onListPrinters( error, stdout, stderr ) {
                if( error || stderr ) {
                    callback( Y.doccirrus.errors.rest( 400, error || stderr ) );
                    return;
                }

                var ret = [],
                    lines = stdout.split( '\n' ),
                    lastSubGroup = '',
                    i;

                for( i = 0; i < lines.length; i++ ) {
                    let line = lines[i];

                    if( 'no system default destination' === line || '' === line.trim() ) {
                        continue;
                    }

                    if( 'printer ' === line.substring( 0, 8 ) ) {

                        let printerChunks = line.split( ' ' );
                        ret.push( {
                            name: printerChunks[1],
                            status: printerChunks[3]
                        } );

                    } else if( "	" === line[0] && "	" !== line[1] ) {
                        let attributeChunks = line.split( ':' );
                        switch( attributeChunks[0] ) {
                            case "	Form mounted"         :
                                ret[ret.length - 1].formMounted = attributeChunks[1];
                                break;
                            case "	Content types"        :
                                ret[ret.length - 1].contentTypes = attributeChunks[1];
                                break;
                            case "	Printer types"        :
                                ret[ret.length - 1].printerTypes = attributeChunks[1];
                                break;
                            case "	Description"          :
                                ret[ret.length - 1].description = attributeChunks[1];
                                break;
                            case "	Alerts"               :
                                ret[ret.length - 1].alerts = attributeChunks[1];
                                break;
                            case "	Location"             :
                                ret[ret.length - 1].location = attributeChunks[1];
                                break;
                            case "	Connection"           :
                                ret[ret.length - 1].connection = attributeChunks[1];
                                break;
                            case "	Interface"            :
                                ret[ret.length - 1].interface = attributeChunks[1];
                                break;
                            case "	On fault"             :
                                ret[ret.length - 1].onFault = attributeChunks[1];
                                break;
                            case "	After fault"          :
                                ret[ret.length - 1].afterFault = attributeChunks[1];
                                break;
                            case "	Users allowed"        :
                                ret[ret.length - 1].usersAllowed = [];
                                lastSubGroup = "usersAllowed";
                                break;
                            case "	Forms allowed"        :
                                ret[ret.length - 1].formsAllowed = [];
                                lastSubGroup = "formsAllowed";
                                break;
                            case "	Banner required"      :
                                break;
                            case "	Charset sets"         :
                                ret[ret.length - 1].charsetSets = [];
                                lastSubGroup = "charsetSets";
                                break;
                            case "	Default pitch"        :
                                ret[ret.length - 1].formMounted = attributeChunks[1];
                                break;
                            case "	Default page size"    :
                                ret[ret.length - 1].formMounted = attributeChunks[1];
                                break;
                            case "	Default port settings":
                                ret[ret.length - 1].formMounted = attributeChunks[1];
                                break;
                        }
                    } else if( "	" === line[0] && "	" === line[1] ) {
                        if( lastSubGroup ) {
                            if( "(none)" !== line.trim() ) {
                                ret[ret.length - 1][lastSubGroup].push( line.trim() );
                            }
                        }
                    } else {
                        Y.log( "bad printer line?: " + line );
                    }//dbg("\n\nret so far:\n"+ util.inspect(ret));
                }

                //  if a param.printerName was passed, filter to that
                if( '' !== printerName ) {
                    for( i = 0; i < ret.length; i++ ) {
                        if( ret[i].name === printerName ) {
                            callback( null, [ret[i]] );
                            return;
                        }
                    }

                    //  params.printerName was passed but is not valid
                    Y.log( '[security] Requested printer was not found: ' + printerName, 'warn', NAME );
                    callback( Y.doccirrus.errors.rest( 404, 'Printer not found' ) );
                    return;
                }

                //  no specific printer was requested\, return all
                callback( null, ret );
            }
        }

        /**
         * Check the status of print jobs in the queue
         *
         * @param   params      {Object}    May have optional jobId property
         * @param   callback    {Function}  Of the form fn(err, jobNames)
         */

        function getJob( params, callback ) {

            if( params.jobId && '' !== params.jobId ) {
                getByJobId( params.printerName, params.jobId, callback );
                return;
            }

            //  check for command injection view printerName param
            getPrinter( {}, onPrintersEnumerated );

            async function onPrintersEnumerated( err, printers ) {

                if( err ) {
                    callback( err );
                    return;
                }

                var
                    printerName = params.printerName || '',
                    found = false,
                    shellCmd,
                    i;

                for( i = 0; i < printers.length; i++ ) {
                    if( printers[i].name === printerName ) {
                        found = true;
                    }
                }

                if( false === found ) {
                    //  supplied printerName param is not a printer, discard
                    Y.log( 'Discarding invalid printer requested by client (security): ' + printerName, 'warn', NAME );
                    printerName = '';
                }

                //  make safe for use on the command line
                //  (prevent crafted printerName strings from being injected)
                printerName = sanitizePrinterName( printerName );

                [err, shellCmd] = await formatPromiseResult(
                    Y.doccirrus.binutilsapi.constructShellCommand( {
                        bin: 'lpstat',
                        shellArgs: [
                            '-o',
                            printerName
                        ]
                    } )
                );
                if( err ) {
                    return callback( err );
                }

                try {
                    shell_exec( shellCmd, onLPStat );
                } catch( e ) {
                    callback( e );
                }
            }

            function onLPStat( error, stdout, stderr ) {
                if( error || stderr || !stdout ) {
                    callback( stdout ? Y.doccirrus.errors.rest( 400, error || stderr ) : '' );
                    return;
                }

                var lines = stdout.split( '\n' ),
                    jobNames = [],
                    jName,
                    jID;

                lines.forEach( function( line ) {
                    if( line.length ) {
                        jName = line.split( ' ' )[0];
                        jID = jName && jName.substr( jName.lastIndexOf( '-' ) + 1 );
                        jobNames.push( {jobName: jName, jobId: jID} );
                    }
                } );

                callback( null, jobNames );
            }

        }

        function getByJobId( printerName, jobId, callback ) {
            var
                cupsClient = require( 'printer' );
            try {
                callback( null, cupsClient.getJob( printerName, +jobId ) );
            } catch( e ) {
                callback( Y.doccirrus.errors.rest( 400, e.message ) );
            }

        }

        /**
         *  Add a print job to the queue of a named printer
         *
         *  @param  {Object}             params
         *  @param  {String}             params.printerName      Must be an extant printer
         *  @param  {String}             params.filePath         Must be trusted, not directly supplied by the client
         *  @param  {Function}           callback                Of the form fn(err, stdout)
         */
        function printFile( params, callback ) {
            const timer = logEnter( `printFile ${params.printerName} ${params.filePath}` );
            Y.log( 'printFile params: ' + require( 'util' ).inspect( params ), 'debug', NAME );
            var
                printerName = params.printerName || '',
                filePath = params.filePath || '';

            if( '' === printerName || '' === filePath ) {
                callback( Y.doccirrus.errors.rest( 400, 'insufficient print params' ) );
                return;
            }

            //  check printer name is valid
            getPrinter( {}, onPrintersListed );

            async function onPrintersListed( err, printers ) {
                if( err ) {
                    callback( err );
                    return;
                }

                var found = false,
                    jobTitle,
                    shellCmd,
                    i;

                for( i = 0; i < printers.length; i++ ) {
                    if( printerName === printers[i].name ) {
                        found = true;
                    }
                }

                if( false === found ) {
                    Y.log( 'Invalid printer name: ' + printerName, 'warn', NAME );
                    callback( Y.doccirrus.errors.rest( 404, 'printer not found' ) );
                    return;
                }

                //params.filePath = Y.doccirrus.media.pathIsInDir( params.filePath, Y.doccirrus.forms.exportutils.getExportDir() ); // TODO security issue: path should be checked

                //  make safe for use on the command line
                //  (prevent crafted printerName strings from being injected)
                printerName = sanitizePrinterName( printerName );

                //  used for special cases, eg SUP-3632
                jobTitle = printerName + '__delimit__' + Y.doccirrus.utils.generateSecureToken();

                //  printer exists, try and spool to it
                [err, shellCmd] = await formatPromiseResult(
                    Y.doccirrus.binutilsapi.constructShellCommand( {
                        bin: 'lp',
                        shellArgs: [
                            '-d',
                            printerName,
                            '-t',
                            `"${jobTitle}"`,
                            '-o',
                            'fit-to-page',
                            `"${params.filePath}"`
                        ]
                    } )
                );

                if( err ) {
                    return callback( err );
                }

                try {
                    Y.log( 'Executing print command: ' + shellCmd, 'debug', NAME );
                    shell_exec( shellCmd, onJobAdded );
                } catch( e ) {
                    Y.log( 'Error invoking CUPS: ' + JSON.stringify( err ), 'warn', NAME );
                    callback( e );
                }
            }

            function onJobAdded( error, stdout, stderr ) {
                if( error || stderr || !stdout ) {
                    Y.log( 'Print failure, stderr: ' + JSON.stringify( stderr ), 'warn', NAME );
                    Y.log( 'Print failure, stdout: ' + JSON.stringify( stdout ), 'warn', NAME );
                    Y.log( 'Print failure, error: ' + JSON.stringify( error ), 'warn', NAME );
                    callback( error || stderr );
                    return;
                }
                Y.log( 'Print job added by CUPS, stdout: ' + stdout, 'debug', NAME );
                logExit( timer );
                callback( null, stdout );
            }

        }

        /**
         * Check for lpstat utility
         *
         * @param   callback    {Function}  Of the form fn (err, boolean)
         */

        function isCUPSInstalled( callback ) {
            return callback( null, Y.doccirrus.api.cli.getDccliSupportedFeatures().cups );
        }


        /**
         *  Make printer name safe for use on command line
         *  @param printerName
         *  @return {string}
         */

        function sanitizePrinterName( printerName ) {
            var

                allowChars = '' +
                    'abcdefghijklmnopqrstuvwxyz' +
                    'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
                    '1234567890-_äÄöÖÜüéçßËë',
                safeName = '',
                char,
                i;

            for( i = 0; i < printerName.length; i++ ) {
                char = printerName.substr( i, 1 );
                if ( -1 !== allowChars.indexOf( char ) ) {
                    safeName = safeName + char;
                }
            }

            return safeName;
        }

        Y.namespace( 'doccirrus' ).printer = {
            getPrinter: getPrinter,
            getJob: getJob,
            printFile: printFile,
            isCUPSInstalled: isCUPSInstalled,
            sanitizePrinterName: sanitizePrinterName
        };

    },
    '0.0.1',
    {
        requires: [
            //  hosts API to for binutils config and methods to sanitize strings passed to the shell
            'mojito',
            'mojito-http-addon',
            'mojito-assets-addon',
            'mojito-params-addon',
            'mojito-models-addon',
            'mojito-intl-addon',
            'mojito-data-addon',
            'dcmedia-store'
        ]
    }
);