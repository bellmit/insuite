/**
 * User: pi
 * Date: 01/03/2018  12:00
 * (c) 2018, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'appreg-api', function( Y, NAME ) {

        /**
         * @module appreg-api
         */
        const
            appUtils = Y.doccirrus.appUtils,
            i18n = Y.doccirrus.i18n,
            {formatPromiseResult, handleResult} = require( 'dc-core' ).utils,
            Promise = require( 'bluebird' ),
            fs = require( 'fs' ),
            path = require( 'path' ),
            promisify = require('util').promisify,
            getCachedDataProm = promisify( Y.doccirrus.cacheUtils.dataCache.getData.bind( Y.doccirrus.cacheUtils.dataCache ) ),
            setCachedDataProm = promisify( Y.doccirrus.cacheUtils.dataCache.setData.bind( Y.doccirrus.cacheUtils.dataCache ) );

        const
            RESTART_COMMAND_TIMEOUT = 1000 * 60, // 1 minute
            DEFAULT_SOL_HOST_TYPE = 'LOCAL',
            // emits - should be moved to a new common library.
            MSG_INSTALL_COMPLETE ='APPREG_MSG_INSTALL_COMPLETE',
            MSG_UPLOAD_COMPLETE ='APPREG_MSG_UPLOAD_COMPLETE',
            MSG_INSTALL_DEV ='APPREG_MSG_INSTALL_DEV',
            MSG_INSTALL_FAILED ='APPREG_MSG_INSTALL_FAILED',
            MSG_UPLOAD_FAILED ='APPREG_MSG_UPLOAD_FAILED'/*,
            MSG_SERVICE_STARTING ='APPREG_MSG_INSTALL_STARTING',
            MSG_SERVICE_UP ='APPREG_MSG_INSTALL_UP',
            MSG_INSTALL_FAILED ='APPREG_MSG_INSTALL_FAILED'*/;

        /**
         * Uses the bluebird promise timeout feature
         * or returns normal formatPromiseResult
         *
         * @param {Promise} prom
         * @param {Number} [timeout]
         * @returns {*}
         */
        function formatPromiseResultWithTimeout( prom, timeout ) {
            if( !timeout ) {
                return formatPromiseResult( prom );
            }

            return new Promise( ( resolve, reject ) => {
                prom.then( resolve ).catch( reject );
            } )
                .timeout( timeout )
                .then( ( result ) => {
                    return [null, result];
                } )
                .catch( ( err ) => {
                    return [err];
                } );
        }

        /**
         * Returns boolean true if appHostType is 'REMOTE'
         * @param   {String}            appHostType
         * @returns {boolean}
         */
        function isAppRemote( appHostType ) {
            return (appHostType === 'REMOTE');
        }

        /**
         * Handles the "Entering..." and "Exiting..." logs
         * @param {Object} args
         * @param {Function} args.callback
         * @param {String} functionName
         * @returns {Function} callback
         */
        function logEntryAndExit( args, functionName ) {
            const callback = args && args.callback;

            if( !callback ) {
                return Y.log( `Executing Y.doccirrus.api.appreg.${functionName}`, 'info', NAME );
            }

            Y.log(`Entering Y.doccirrus.api.appreg.${functionName}`, 'info', NAME);

            return require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(callback, `Exiting Y.doccirrus.api.appreg.${functionName}`);
        }

        /**
         * Logs the execution of a function
         * @param {String} functionName e.g. order_66
         */
        function logExecution(functionName) {
            Y.log(`Executing Y.doccirrus.api.appreg.${functionName}`, 'info', NAME);
        }

        /**
         * Logs the error
         * @param   {String}            functionName
         * @param   {Object}            error
         * @param   {String}            extraMessage
         */
        function logError(functionName, error, extraMessage) {
            Y.log( `${functionName}: ${extraMessage && (extraMessage + ':') || ''} ${error.stack || error}`, 'error', NAME );
        }

        /**
         * Logs the warning
         * @param   {String}            functionName
         * @param   {Object}            error
         * @param   {String}            extraMessage
         */
        function logWarn(functionName, error, extraMessage) {
            Y.log( `${functionName}: ${extraMessage && (extraMessage + ':') || ''} ${error ? (error.stack || error) : ''}`, 'warn', NAME );
        }

        /**
         * Logs at info level
         * @param   {String}            functionName
         * @param   {String}            extraMessage
         */
        function logInfo(functionName, extraMessage) {
            Y.log( `${functionName}: ${extraMessage || ''}`, 'info', NAME );
        }

        /**
         * Logs at debug level
         * @param   {String}            functionName
         * @param   {String}            extraMessage
         */
        function logDebug(functionName, extraMessage) {
            Y.log( `${functionName}: ${extraMessage || ''}`, 'debug', NAME );
        }

        /**
         * @method get
         * @param {Object} args
         * @param {Object} args.query
         * @param {Object} [args.options]
         * @param {Function} args.callback
         * @return {Promise} if callback is not provided
         * @for Y.doccirrus.api.appreg
         */
        function getEntry( args ) {
            const
                { query, options, user = Y.doccirrus.auth.getSUForLocal() } = args,
                command = {
                    action: 'get',
                    model: 'appreg',
                    user,
                    query,
                    options
                };
            if( args.callback ) {
                const callback = logEntryAndExit( args, 'getEntry' );
                Y.doccirrus.mongodb.runDb( command, callback );
            } else {
                logExecution( 'getEntry' );
                return Y.doccirrus.mongodb.runDb( command );
            }
        }

        /**
         * Creates the Sol string path
         * @param   {String}            solName
         * @returns {string}
         * @private
         */
        function _getSolPath( solName ) {
            const
                relativeSolPath = `../dc-insuite-sol-${solName}/`;

            if( !Y.doccirrus.auth.isDevServer() ) {
                return `/usr/share/sols/${solName}/`;
            }

            return path.join( process.cwd(), relativeSolPath );
        }

        /**
         * Creates the Sol's documentation and changelog paths to use by fs.readFile
         *
         * @param {Object} args
         * @param {String} args.solPath
         * @param {String} args.lang
         * @returns {{documentationPath: String, changelogPath: String}}
         * @private
         */
        function _getDocsPaths( args ) {
            const
                {solPath, lang = 'en'} = args,
                relativeSolDocsPath = `docs/${lang}/`,
                documentationPath = `${relativeSolDocsPath}/documentation.md`,
                changelogPath = `${relativeSolDocsPath}/changelog.md`;

            return {
                documentationPath: path.join( solPath, documentationPath ),
                changelogPath: path.join( solPath, changelogPath )
            };
        }

        /**
         * Returns promisified version of fs.readFile
         * @param   {String}         encoding
         * @returns {Function}
         */
        function readFileFactory( encoding = 'utf8' ) {
            const
                readFileProm = promisify( fs.readFile );

            return async function( filePath ) {
                return await readFileProm( filePath, encoding );
            };
        }

        /**
         * Returns the Sol's version by reading it from the sol.manifest
         *
         * @param {Object} args
         * @param {String} args.solPath
         * @param {Function} [args.readFile]
         * @param {String} [args.callback]
         * @returns {Promise<void>}
         */
        async function getSolVersionFromFS( args ) {
            logExecution('getSolVersionFromFS');
            const
                {solPath, readFile = readFileFactory(), callback} = args,
                solManifestFindVersionRegEx = /SOLVERSION=.*/;
            let error, solManifest, solVersion;

            [error, solManifest] = await formatPromiseResult(
                getDataFromSolManifest( {solPath, findRegEx: solManifestFindVersionRegEx, readFile} )
            );

            if( error ) {
                Y.log( `getSolVersionFromFS: could not get sol.manifest from ${solPath}: ${error}`, 'warn', NAME );
                return handleResult( error, solVersion, callback );
            }

            solVersion = solManifest.SOLVERSION;

            return handleResult( error, solVersion, callback );
        }

        /**
         * Returns the version of the given Sol name by
         * obtaining it from the dc-sols-list CLI tool
         * @param {Object} args
         * @param {String} args.solName
         * @param {Function} [args.callback]
         * @returns {Promise<String>}
         */
        async function getSolVersion( args ) {
            logExecution('getSolVersion');
            const {callback, solName} = args;
            let error, solsList, solVersion;

            [error, solsList] = await formatPromiseResult(
                getSolsListData( {solName} )
            );

            if( error ) {
                logWarn('getSolVersion', error, 'could not get Sols list');
                return handleResult( error, undefined, callback );
            }

            if( !solsList.length ) {
                error = new Error( `getSolVersion: could not find data for ${solName}` );
                return handleResult( error, undefined, callback );
            }

            solVersion = solsList[0].version;

            return handleResult( error, solVersion, callback );
        }

        /**
         * Creates markdown string with technical Sol data for the user
         * @param   {Object}            args
         * @param   {String}            args.solName
         * @param   {String}            args.solPath
         * @param   {String}            [args.readFile]
         * @private
         */
        async function _getDefaultSolData( args ) {
            const {solName, solPath, readFile = readFileFactory()} = args;
            let error, solVersion, description;

            [error, solVersion] = await formatPromiseResult(
                getSolVersion( {solName} )
            );

            if( error ) {
                logWarn( '_getDefaultSolData', error, 'could not get Sol version from CLI' );
                [error, solVersion] = await formatPromiseResult(
                    getSolVersionFromFS( {solPath, readFile} )
                );
            }

            if( error || !solVersion ) {
                solVersion = '';
            }

            // TODO add more default data such as Sol description from appreg

            description = '';

            return (
                `# ${solName}\n### version ${solVersion}\n${description}`
            );
        }

        /**
         * Obtains the Sol documentation and changelog file contents from Sol filesystem
         * and defaults to sending technical information if this content is not available
         *
         * @param {Object} args
         * @param {String} args.query.solName
         * @param {Function} [args.callback]
         * @returns {Promise<Object|*>}
         */
        async function getSolDocumentation( args ) {
            if( args.callback ) {
                args.callback = logEntryAndExit( args, 'getSolDocumentation' );
            } else {
                logExecution( 'getSolDocumentation' );
            }

            const
                {query: {solName} = {}, callback} = args,
                lang = i18n.language,
                solPath = _getSolPath( solName ),
                {documentationPath, changelogPath} = _getDocsPaths( {solPath, lang} ),
                readFile = readFileFactory();

            let error, mdDoc, mdChangelog;

            [error, mdDoc] = await formatPromiseResult(
                readFile( documentationPath )
            );

            if( error ) {
                Y.log( `could not read Sol documentation for ${solName} from filesystem: ${error}`, 'warn', NAME );

                [error, mdDoc] = await formatPromiseResult(
                    _getDefaultSolData( {solName, solPath, readFile} )
                );

                if( error ) {
                    Y.log( `could not create default Sol information: ${error}`, 'error', NAME );
                    mdDoc = mdDoc || null;
                }
            }

            [error, mdChangelog] = await formatPromiseResult(
                readFile( changelogPath )
            );

            if( error ) {
                Y.log( `could not read Sol changelog for ${solName} from filesystem: ${error}`, 'warn', NAME );
                mdChangelog = mdChangelog || null;
            }

            return handleResult( undefined, {mdDoc, mdChangelog}, callback );
        }

        /**
         * Uses the DC CLI tool dc-sols-list to get information about the Sols
         * running in the system. Can be filtered by name if provided
         *
         * @param {Object} args
         * @param {String} [args.solName]
         * @param {Function} [args.callback]
         * @returns {Promise<Object|*>}
         */
        async function getSolsListData( args ) {
            logExecution( 'getSolsListData' );

            const
                {solName, callback} = args || {},
                commandName = 'listCommand';

            let error, stdout, solsList;

            [error, stdout] = await formatPromiseResult(
                Y.doccirrus.api.appreg._executeSolCommand( {
                    commandName
                } )
            );

            if( error || !stdout ) {
                error = error || new Error( 'stdout is empty' );
                logWarn( 'getSolsListData', error, 'could not get Sol list data' );
                return handleResult( error, undefined, callback );
            }

            solsList = JSON.parse( stdout );
            solsList = solsList.installedSols || [];

            if( solName ) {
                solsList = solsList.filter( ( solObj ) => solObj.name === solName );
                return handleResult( error, solsList, callback );
            }

            return handleResult( error, solsList, callback );
        }

        /**
         * Returns the Sol's sol.manifest data as an object
         * and by passing a custom findRegEx it will only
         * return the desired variable
         *
         * @param {Object} args
         * @param {String} args.solPath
         * @param {String} [args.findRegEx]
         * @param {String} [args.readFile]
         * @param {String} [args.callback]
         * @returns {Promise<Object|*>}
         */
        async function getDataFromSolManifest( args ) {
            logExecution('getDataFromSolManifest');
            const {solPath, findRegEx = /\w+=.*/gi, readFile = readFileFactory(), callback} = args;
            let error, solManifest, solManifestObject, key, value;

            [error, solManifest] = await formatPromiseResult(
                readFile( `${solPath}sol.manifest` )
            );

            if( error ) {
                Y.log( `getDataFromSolManifest: could not get sol.manifest from ${solPath}: ${error}`, 'warn', NAME );
                return handleResult( error, solManifestObject, callback );
            }

            if( !solManifest ) {
                error = new Error( 'sol.manifest is empty or could not be found' );
                Y.log( `getDataFromSolManifest: could not get sol.manifest from ${solPath}: ${error}`, 'warn', NAME );
                return handleResult( error, solManifestObject, callback );
            }

            let variablesMatch = solManifest.match( findRegEx );

            if( variablesMatch && variablesMatch.length ) {
                solManifestObject = variablesMatch.reduce( ( acc, match ) => {
                    key = match.replace( /=.*/, '' );
                    value = match.replace( /\w+=/, '' );
                    acc[key] = value;
                    return acc;
                }, {} );
            }

            return handleResult( error, solManifestObject, callback );
        }

        /**
         * Returns the Sol's vendor by reading it from the sol.manifest
         *
         * @param {Object} args
         * @param {String} args.solPath
         * @param {String} [args.readFile]
         * @param {String} [args.callback]
         * @returns {Promise<void>}
         */
        async function getSolVendor( args ) {
            logExecution('getSolVendor');
            const
                // eslint-disable-next-line no-undef
                {solPath, readFile = readFileFactory(), callback} = args,
                solManifestFindVendorRegEx = /SOLVENDOR=.*/;
            let error, result, solVendor;

            [error, result] = await formatPromiseResult(
                getDataFromSolManifest( {solPath, findRegEx: solManifestFindVendorRegEx, readFile} )
            );

            if( error ) {
                Y.log( `getSolVendor: could not get sol.manifest from ${solPath}: ${error}`, 'warn', NAME );
                return handleResult( error, solVendor, callback );
            }

            solVendor = result.SOLVENDOR;

            if( !solVendor ) {
                error = new Error( 'could not find SOLVENDOR in sol.manifest' );
                Y.log( `getSolVendor: could not find SOLVENDOR in sol.manifest from ${solPath}: ${error}`, 'warn', NAME );
                return handleResult( error, solVendor, callback );
            }

            return handleResult( error, solVendor, callback );
        }

        /**
         * Wrapper for getPopulated which will filter the data to be sent to the client
         * @method populateAppAccessManagerTable
         * @param {Object} args
         * @param {Object} args.query
         * @param {Object} [args.options]
         * @param {Function} [args.callback]
         * @for Y.doccirrus.api.appreg
         */
        async function populateAppAccessManagerTable( args ) {
            if( args.callback ) {
                args.callback = logEntryAndExit( args, 'populateAppAccessManagerTable' );
            } else {
                logExecution( 'populateAppAccessManagerTable' );
            }

            args.options = {
                ...args.options,
                fields: {
                    appName: 1,
                    title: 1,
                    description: 1,
                    hasAccess: 1,
                    solToken: 1,
                    inSuiteToken: 1,
                    appHostType: 1,
                    appVersion: 1,
                    versionIsOutdated: 1
                }
            };

            return await Y.doccirrus.api.appreg.getPopulated( args );
        }

        /**
         * Custom populateAppRegs table for the version table
         * @param {Object} args
         * @param {Object} [args.query]
         * @param {Object} [args.options]
         * @param {Function} [args.callback]
         * @returns {Promise<*>}
         */
        async function populateVersionUpdateTable( args ) {
            if( args && args.callback ) {
                args.callback = logEntryAndExit( args, 'populateVersionUpdateTable' );
            } else {
                logExecution( 'populateVersionUpdateTable' );
            }

            const {options = {}, query = {}} = args || {};

            args.options = {
                ...options,
                fields: {
                    appName: 1,
                    title: 1,
                    appVersion: 1,
                    storeVersion: 1,
                    appHostType: 1,
                    versionIsOutdated: 1
                }
            };

            args.query = {
                ...query,
                versionIsOutdated: true,
                appHostType: {$not: /REMOTE/}
            };

            return await Y.doccirrus.api.appreg.getPopulated( args );
        }

        /**
         * Populates the appreg objects by
         * 1. Obtaining them from appregs collection
         * 2. Adding solHostType if isTestLicense (if not already present)
         * @method getPopulated
         * @param {Object} args
         * @param {Object} args.query
         * @param {Object} [args.options]
         * @param {Function} [args.callback]
         * @for Y.doccirrus.api.appreg
         */
        async function getPopulated( args ) {
            if( args.callback ) {
                args.callback = logEntryAndExit( args, 'getPopulated' );
            } else {
                logExecution( 'getPopulated' );
            }

            const {callback, query = {}, options: {limit, skip, ...options} = {}, user} = args;
            let error, appRegs;

            [error, appRegs] = await formatPromiseResult(
                Y.doccirrus.api.appreg.get( {user, query, options} )
            );

            if( error ) {
                Y.log( `Could not get appregs: ${error.stack || error}`, 'error', NAME );
                return handleResult( error, undefined, callback );
            }

            appRegs = appRegs.result || appRegs;

            if( !appRegs || !appRegs.length ) {
                Y.log( `Could not find any appregs with query ${query} and options ${options}`, 'debug', NAME );
                return handleResult( error, [], callback );
            }

            // custom paging
            if( limit && skip ) {
                Y.log( `getPopulated: custom paging with limit ${limit} and skip ${skip}`, 'debug', NAME );
                appRegs = appRegs.slice( skip, (limit + skip) );
            }

            const isTestLicense = (user && Y.doccirrus.licmgr.hasSupportLevel( user.tenantId, Y.doccirrus.schemas.settings.supportLevels.TEST ));

            if( isTestLicense ) {
                appRegs.forEach( ( appReg ) => {
                    appReg.appHostType = appReg.appHostType || DEFAULT_SOL_HOST_TYPE;
                } );
            }

            Y.log( `getPopulated: finished with ${appRegs.length} Sols`, 'info', NAME );

            return handleResult( error, appRegs, callback );
        }

        /**
         * Performs a POST action for appreg model
         * If no callback is provided, it will return a Promise
         *
         * @method post
         * @param {Object} args
         * @param {Object} args.data
         * @param {Object} [args.options]
         * @param {Function} args.callback
         * @for Y.doccirrus.api.appreg
         *
         * @return {Promise}
         */
        function post( args ) {
            const
                {options, data} = args,
                user = Y.doccirrus.auth.getSUForLocal(),
                command = {
                    action: 'post',
                    model: 'appreg',
                    user: user,
                    data: Y.doccirrus.filters.cleanDbObject( data ),
                    options: options
                };

            if( args.callback ) {
                const callback = logEntryAndExit( args, 'post' );
                Y.doccirrus.mongodb.runDb( command, callback );
            } else {
                logExecution( 'post' );
                return Y.doccirrus.mongodb.runDb( command );
            }
        }

        /**
         * Performs a PUT action for appreg model
         * If no callback is provided, it will return a Promise
         *
         * @method put
         * @param {Object} args
         * @param {Object} args.data
         * @param {Object} args.query
         * @param {Object} [args.fields]
         * @param {Object} [args.options]
         * @param {Function} args.callback
         * @for Y.doccirrus.api.appreg
         *
         * @return {Promise}
         */
        function put( args ) {
            const {query, options, fields, data} = args;
            const user = Y.doccirrus.auth.getSUForLocal();
            const command = {
                action: 'put',
                model: 'appreg',
                user,
                query,
                fields: fields || Object.keys( data ),
                data: Y.doccirrus.filters.cleanDbObject( data ),
                options
            };
            if( args.callback ) {
                const callback = logEntryAndExit( args, 'put' );
                Y.doccirrus.mongodb.runDb( command, callback );
            } else {
                logExecution( 'put' );
                return Y.doccirrus.mongodb.runDb( command );
            }
        }

        /**
         * @method delete
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Object} [args.options]
         * @param {Function} args.callback
         * @for Y.doccirrus.api.appreg
         */
        function deleteEntry( args ) {
            const
                { query, options, callback } = args,
                user = Y.doccirrus.auth.getSUForLocal();
            Y.doccirrus.mongodb.runDb( {
                action: 'delete',
                model: 'appreg',
                user: user,
                query: query,
                options: options
            }, callback );
        }

        /**
         * Checks whether the /register endpoints' params are correct
         * handles error with 4** response
         * @param {Object} args
         * @param {String} args.appName
         * @param {Object} args.configuration
         * @returns {Error|null}
         */
        function genericAssertRegisterEndpointParams( args ) {
            const {appName, configuration} = args;
            if( !appName ) {
                return new Y.doccirrus.commonerrors.DCError( 401, {message: 'Missing Sol name in request headers.'} );
            }
            if( !configuration || !Array.isArray( configuration ) ) {
                return new Y.doccirrus.commonerrors.DCError( 400, {message: 'Missing configuration list.'} );
            }
            if( !configuration.length ) {
                /* it could be that the user wants to unregister the configurations */
                return null;
            }
            if( configuration.some( item => !item.targetUrl ) ) {
                return new Y.doccirrus.commonerrors.DCError( 400, {message: 'Required parameter "targetUrl" is missing.'} );
            }
            if( configuration.some( item => !item.type ) ) {
                return new Y.doccirrus.commonerrors.DCError( 400, {message: 'Required parameter "type" is missing.'} );
            }
            return null;
        }

        /**
         * Validates the UI configuration objects
         * @param uiConfiguration
         * @returns {DCError|null}
         */
        async function validateUIConfigurations( uiConfiguration ) {
            logExecution( 'validateUIConfigurations' );
            logDebug( 'validateUIConfigurations', JSON.stringify( uiConfiguration ) );

            const
                {uiConfigurationTypes, types: {UIConfiguration_T}} = Y.doccirrus.schemas.appreg,
                uiConfigurationTypesStrings = Object.values( uiConfigurationTypes ),
                uiConfigurationFields = Object.keys( UIConfiguration_T );
            let _uiConfigFields, _uiConfig, _uiConfigFieldName, _schemaFieldType, error;

            for( _uiConfig of uiConfiguration ) {

                /* validate the UI configuration type is correct */
                if( !uiConfigurationTypesStrings.includes( _uiConfig.type ) ) {
                    error = `UI type ${_uiConfig.type} not recognised`;
                    logError( 'validateUIConfigurations', error );
                    return new Y.doccirrus.commonerrors.DCError( 400, {message: error} );
                }

                /* validate the UI configuration fields are all correct */
                _uiConfigFields = Object.keys( _uiConfig );
                for( _uiConfigFieldName of _uiConfigFields ) {

                    /* validate the field exists */
                    if( !uiConfigurationFields.includes( _uiConfigFieldName ) ) {
                        error = `Unrecognised field "${_uiConfigFieldName}", allowed: ${JSON.stringify( uiConfigurationFields )}`;
                        logError( 'validateUIConfigurations', error );
                        return new Y.doccirrus.commonerrors.DCError( 400, {
                            message: error
                        } );
                    }

                    /* skip complex field types for now */
                    if( UIConfiguration_T[_uiConfigFieldName].complex ) {
                        continue;
                    }

                    /* validate the value type is correct */
                    _schemaFieldType = UIConfiguration_T[_uiConfigFieldName].type;
                    if( Array.isArray( _schemaFieldType ) ) {

                        /* validate array type */
                        if( !Array.isArray( _uiConfig[_uiConfigFieldName] ) ) {
                            error = `Expected array for ${_uiConfigFieldName}, received ${typeof _uiConfig[_uiConfigFieldName]}`;
                            logError( 'validateUIConfigurations', error );
                            return new Y.doccirrus.commonerrors.DCError( 400, {
                                message: error
                            } );
                        }

                        const
                            type = _schemaFieldType[0].toLowerCase(),
                            isEveryEntryOfTypeString = typeof _schemaFieldType[0] === 'string' && _uiConfig[_uiConfigFieldName].every(i => typeof i === type);

                        /* validate array element types */
                        if(!isEveryEntryOfTypeString) {
                            error = `Expected array of ${_schemaFieldType[0].toLowerCase()} for ${_uiConfigFieldName}, received ${typeof _uiConfig[_uiConfigFieldName]}`;
                            logError( 'validateUIConfigurations', error );
                            return new Y.doccirrus.commonerrors.DCError( 400, {
                                message: error
                            } );
                        }

                        continue;
                    }

                    /* validate all other types */
                    if( typeof _uiConfig[_uiConfigFieldName] !== _schemaFieldType.toLowerCase() ) {
                        error = `Expected ${_schemaFieldType.toLowerCase()} for ${_uiConfigFieldName}, received ${typeof _uiConfig[_uiConfigFieldName]}`;
                        logError( 'validateUIConfigurations', error );
                        return new Y.doccirrus.commonerrors.DCError( 400, {
                            message: error
                        } );
                    }
                }
            }

            return null;
        }

        /**
         * Constructs an object with solHost and solPort after some checks
         * @param {Object} args
         * @param {String|undefined|null} args.solHost
         * @param {String|undefined|null} args.solPort
         * @returns {Array} returns [Error|null, putObj]
         */
        function createRegisterPUTObject( args ) {
            const {solHost, solPort} = args;
            const portRegex = /^\d+$/;
            let putObj = {};
            if( solHost === null ) {
                // Means user is explicitly asking to delete this field from DB
                putObj.appHost = solHost;
            } else if( solHost ) {
                if( typeof solHost !== "string" ) {
                    return [new Y.doccirrus.commonerrors.DCError( 400, {message: 'solHost must be a string'} )];
                } else if( !solHost.startsWith( "http://" ) && !solHost.startsWith( "https://" ) ) {
                    return [new Y.doccirrus.commonerrors.DCError( 400, {message: 'solHost must start with http:// or https://'} )];
                } else {
                    putObj.appHost = solHost;
                }
            }

            if( solPort === null ) {
                // Means user is explicitly asking to delete this field from DB
                putObj.appCurrentPort = solPort;
            } else if( solPort ) {
                if( typeof solPort !== "string" ) {
                    return [new Y.doccirrus.commonerrors.DCError( 400, {message: `'solPort' must be passed as a string. ex: '3000'`} )];
                } else if( !portRegex.test( solPort ) ) {
                    return [new Y.doccirrus.commonerrors.DCError( 400, {message: `'solPort' must be a valid port number as a string`} )];
                } else {
                    putObj.appCurrentPort = solPort;
                }
            }

            return [null, putObj];
        }

        /**
         * Removes the trailing slashes if they are present in the URL
         * in order to better check if it is registered in dcapp-proxy.handleWebHookProxying
         *
         * @param {Array}configList
         * @returns {Object}
         */
        function removeTrailingSlashFromTargetUrls( configList ) {
            if( configList && configList.length ) {
                return configList.map(function(configItem){
                    if( configItem.targetUrl.match( /\/.*\/$/ ) ) {
                        configItem.targetUrl = configItem.targetUrl && configItem.targetUrl.replace( /\/$/, '' );
                    }
                    return configItem;
                });
            }
            return configList;
        }

        /**
         * Handles the database update function
         * by using the Promise version
         * @param {Object} args
         * @param {Object} args.putObj
         * @param {Object} args.appName
         * @returns {Promise} which returns the appReg object
         */
         function updateAppRegForRegistration( args ) {
            const {putObj, appName} = args;
            return Y.doccirrus.api.appreg.put( {
                fields: Object.keys( putObj ),
                data: putObj,
                query: {
                    appName
                }
            } );
        }

        /**
         * Handles emitting a namespace event for system.changedAppReg
         * by wrapping it as a promise
         * @param {Object} args
         * @param {String} args.appName
         * @param {Object} args.uiConfiguration
         * @param {Object} args.routeOverrideConfiguration
         * @param {Object} args.appReg
         */
        function emitChangedAppRegNamespaceEvent( args ) {
            const { appName, uiConfiguration, routeOverrideConfiguration, appReg } = args;
            Y.doccirrus.communication.emitNamespaceEvent( {
                nsp: 'default',
                event: 'system.changedAppReg',
                msg: {
                    data: {
                        appName,
                        uiConfiguration: uiConfiguration || appReg.uiConfiguration || [],
                        routeOverrideConfiguration: routeOverrideConfiguration || appReg.routeOverrideConfiguration || [],
                        // TODO decide whether to also send the webhooks configuration
                        hasAccess: (appReg && typeof appReg.hasAccess === "boolean") ? appReg.hasAccess : true
                    }
                },
                doNotChangeData: true
            } );
        }

        /**
         * Wrapper for setCachedDataProm for appReg in dcapp-proxy
         *
         * @param {Object} appReg
         * @param {Object} appReg.appName
         * @param {Object} appReg.solToken
         * @param {Object} appReg.appCurrentPort
         * @param {Object} appReg.appHost
         * @returns {Promise<void>}
         */
        function saveAppRegDataToCache( appReg ) {
            logExecution( 'saveAppRegDataToCache' );
            const {appName, solToken, appCurrentPort, appHost} = appReg;
            return setCachedDataProm( {
                key: `DcAppReg:${appName}`,
                data: {appName, solToken, appCurrentPort, appHost},
                expirySeconds: 60 * 60 // 1 hour
            } );
        }

        /**
         * Wrapper for dataCache.getData for appReg in dcapp-proxy
         * returns the appReg data for appName from cache
         *
         * @param {String} appName
         * @returns {Object|null}
         */
        async function getAppRegDataFromCache( appName ) {
            logExecution( `getAppRegDataFromCache for app ${appName}` );

            let [err, appReg] = await formatPromiseResult( getCachedDataProm( {
                key: `DcAppReg:${appName}`
            } ) );

            if( err ) {
                Y.log( `Error while getting appReg data from cache for ${appName}: ${err}`, 'error', NAME );
                throw err;
            }

            return appReg;
        }

        /**
         * Returns webHooksConfiguration from cache
         *
         * @param {String} appName
         * @returns {Promise}
         */
        async function getWebHooksConfigFromCache( appName ) {
            logExecution( 'getWebHooksConfigFromCache' );
            let [err, webHooksConfiguration] = await formatPromiseResult( getCachedDataProm( {
                key: `webhook:reg:${appName}`
            } ) );
            if( err ) {
                Y.log( `Error while checking cache in getWebHooksConfigFromCache: ${err}`, 'error', NAME );
                throw err;
            }
            return webHooksConfiguration;
        }

        /**
         * Updates Redis cache with new webHooksConfiguration
         * in order for dcapp-proxy to get the updated changes
         * @param {Object} args
         * @param {String} args.appName
         * @param {Array} args.webHooksConfiguration
         * @param {Object} [args.appReg]
         * @returns {Promise}
         */
        async function saveWebHooksConfigToCache( args ) {
            const {appName, webHooksConfiguration, appReg = {}} = args || {};
            let [error] = await formatPromiseResult( setCachedDataProm( {
                key: `webhook:reg:${appName}`,
                data: webHooksConfiguration || appReg.webHooksConfiguration || [],
                expirySeconds: 60 * 60 * 24 // 1 day
            } ) );
            if( error ) {
                Y.log( `Error while saving data to cache in saveWebHooksConfigToCache: ${error}`, 'error', NAME );
                throw error;
            }
            return appReg;
        }

        /**
         * For external usage by SOLs
         * Registers webhook endpoint configurations for the SOL app which made the request
         * 1. asserts if the params are correct
         * 2. creates a data object to PUT in the database
         * 3. updates the appreg document in the database
         * 4. updates the webhooksconfiguration for app in dataCache
         * 5. emits a namespace event
         * @method registerWebHook
         * @param {Object} args
         * @param {String} args.user.U.appName
         * @param {Array} args.data.webHooksConfiguration
         * @param {Array} args.data.solPort
         * @param {Array} args.data.solHost
         * @param {Function} args.callback
         * @for Y.doccirrus.appreg
         */
        async function registerWebHook( args ) {
            if( args.callback ) {
                args.callback = logEntryAndExit( args, 'registerWebHook' );
            } else {
                logExecution( 'registerWebHook' );
            }
            const
                {user = {}, data: {webHooksConfiguration, solHost, solPort} = {}, callback} = args,
                appName = user.U;
            let error, putObj, appReg;

            error = genericAssertRegisterEndpointParams( {appName, configuration: webHooksConfiguration} );

            if( error ) {
                return handleResult( error, undefined, callback );
            }

            if( !webHooksConfiguration.length ) {
                return await Y.doccirrus.api.appreg.unRegisterWebHook( args );
            }

            [error, putObj] = createRegisterPUTObject( {solHost, solPort} );

            if( error ) {
                Y.log(`registerWebHook: Error creating PUT object: ${error}`, 'error', NAME);
                return handleResult( new Y.doccirrus.commonerrors.DCError( 500, {message: error.stack || error} ), undefined, callback );
            }

            putObj.webHooksConfiguration = removeTrailingSlashFromTargetUrls( webHooksConfiguration );

            logExecution( `registerWebHook: updating appreg collection for sol: ${appName}` );

            [error, appReg] = await formatPromiseResult(
                updateAppRegForRegistration( {putObj, appName} )
            );

            if( error ) {
                Y.log(`registerWebHook: Error updating appReg: ${error}`, 'error', NAME);
                return handleResult( new Y.doccirrus.commonerrors.DCError( 500, {message: error.stack || error} ), undefined, callback );
            }

            [error, appReg] = await formatPromiseResult(
                saveWebHooksConfigToCache( {
                    appName,
                    webHooksConfiguration: putObj.webHooksConfiguration,
                    appReg
                } )
            );

            if( error ) {
                Y.log( `registerWebHook: Error saving webhook config to cache: ${error}`, 'error', NAME);
                return handleResult( undefined, undefined, callback );
            }

            emitChangedAppRegNamespaceEvent( {appName, appReg} );

            return handleResult( undefined, undefined, callback );
        }

        /**
         * For Ext Usage!
         * Deregisters webhook endpoint configuration of the app which made the request
         * For now it deregisters all the endpoints
         * 1. asserts if appName is present
         * 2. creates a data object to PUT in the database
         * 3. updates the appreg document in the database
         * 4. updates the webhooksconfiguration for app in dataCache
         * 5. emits a namespace event
         * @param {Object} args
         * @param {String} args.user.U.appName
         * @param {Function} args.callback
         * @returns {*}
         */
        async function unRegisterWebHook( args ) {
            const
                {user = {}} = args,
                appName = user.U;
            if( args.callback ) {
                args.callback = logEntryAndExit( args, `unRegisterWebHook for solName='${appName}'` );
            } else {
                logExecution( `unRegisterWebHook for solName='${appName}'` );
            }
            const {callback} = args;
            let error, appReg;

            if( !appName ) {
                return handleResult( new Y.doccirrus.commonerrors.DCError( 401, {message: 'Missing Sol name in request headers.'} ), undefined, callback );
            }

            let putObj = {
                webHooksConfiguration: []
            };

            [error, appReg] = await formatPromiseResult( updateAppRegForRegistration( {putObj, appName} ) );

            if( error ) {
                Y.log( `unRegisterWebHook: Error updating appReg: ${error.stack || error}`, 'error', NAME );
                return handleResult( new Y.doccirrus.commonerrors.DCError( 500, {message: error.stack || error} ), undefined, callback );
            }

            [error, appReg] = await formatPromiseResult( saveWebHooksConfigToCache( {
                appName,
                webHooksConfiguration: [],
                appReg
            } ) );

            if( error ) {
                Y.log( `unRegisterWebHook: Error saving webhook config to cache: ${error}`, 'error', NAME );
                return handleResult( undefined, undefined, callback );
            }

            emitChangedAppRegNamespaceEvent( {appName, appReg} );

            return handleResult( undefined, undefined, callback );
        }

        /**
         * For Ext Usage!
         * Registers UI menu configuration for the app which made the request
         * 1. asserts if the params are correct
         * 2. creates a data object to PUT in the database
         * 3. updates the appreg document in the database
         * 4. emits a namespace event
         * @method registerUIMenu
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {String} [args.data.solHost] host address of the solution (should be present if running on different machine)
         * @param {Object} args.callback
         * @for Y.doccirrus.api.appreg
         * @return {Function}
         */
        async function registerUIMenu( args ) {
            const
                {user = {}} = args,
                appName = user.U;
            let error, putObj, appReg;

            if( args.callback ) {
                args.callback = logEntryAndExit( args, `registerUIMenu for solName='${appName}'` );
            } else {
                logExecution( `registerUIMenu for solName='${appName}'` );
            }

            const {data: {uiConfiguration, solHost, solPort} = {}, callback} = args;

            error = genericAssertRegisterEndpointParams( {appName, configuration: uiConfiguration} );

            if( error ) {
                logError( 'registerUIMenu', error, 'failed to pass first parameter assertion' );
                return handleResult( error, undefined, callback );
            }

            if( !uiConfiguration.length ) {
                return await Y.doccirrus.api.appreg.unRegisterUIMenu( args );
            }

            error = await validateUIConfigurations( uiConfiguration );

            if( error ) {
                logError( 'registerUIMenu', error, 'failed to pass UI configuration assertion' );
                return handleResult( error, undefined, callback );
            }

            [error, putObj] = createRegisterPUTObject( {solHost, solPort} );

            if( error ) {
                logError( 'registerUIMenu', error, 'could not create new appreg' );
                return handleResult( new Y.doccirrus.commonerrors.DCError( 500, {message: error.stack || error} ), undefined, callback );
            }

            putObj.uiConfiguration = uiConfiguration;

            logExecution( `registerUIMenu: updating appreg collection for sol: ${appName}` );

            [error, appReg] = await formatPromiseResult( updateAppRegForRegistration( {putObj, appName} ) );

            if( error ) {
                Y.log( `registerUIMenu: Error updating appReg: ${error}`, 'error', NAME );
                return handleResult( new Y.doccirrus.commonerrors.DCError( 500, {message: error.stack || error} ), undefined, callback );
            }

            emitChangedAppRegNamespaceEvent( {appName, uiConfiguration, appReg} );

            return handleResult( undefined, undefined, callback );
        }

        /**
         * For Ext Usage!
         * Deregisters UI menu configuration of the app which made the request
         * @method unRegisterUIMenu
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Object} args.callback
         * @for Y.doccirrus.api.appreg
         * @return {Function}
         */
        async function unRegisterUIMenu( args ) {
            const
                {user = {}} = args,
                appName = user.U;
            let error, appReg;

            if( args.callback ) {
                args.callback = logEntryAndExit( args, `unRegisterUIMenu for solName='${appName}'` );
            } else {
                logExecution( `unRegisterUIMenu for solName='${appName}'` );
            }

            const {callback} = args;

            if( !appName ) {
                return handleResult( new Y.doccirrus.commonerrors.DCError( 401, {message: 'Missing Sol name in request headers.'} ), undefined, callback );
            }

            [error, appReg] = await formatPromiseResult(
                Y.doccirrus.api.appreg.put( {
                    fields: ['uiConfiguration'],
                    data: {
                        uiConfiguration: []
                    },
                    query: {
                        appName
                    }
                })
            );

            if( error ) {
                logError( 'unRegisterUIMenu', error, 'could not update appreg' );
                return handleResult( new Y.doccirrus.commonerrors.DCError( 500, {message: error.stack || error.message || error} ), undefined, callback );
            }

            emitChangedAppRegNamespaceEvent( {
                appName,
                uiConfiguration: [],
                appReg
            } );

            return handleResult( undefined, undefined, callback );
        }

        /**
         * For Ext Usage!
         * Registers DCRouter overrides for the app which made the request
         * 1. asserts if the params are correct
         * 2. creates a data object to PUT in the database
         * 3. updates the appreg document in the database
         * 4. emits a namespace event
         * @method registerRouteOverride
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {String} [args.data.solHost] host address of the solution (should be present if running on different machine)
         * @param {Object} args.callback
         * @for Y.doccirrus.api.appreg
         * @return {undefined}
         */
        async function registerRouteOverride( args ) {
            const
                { user: { U: appName } = {} } = args;
            let error, putObj, appReg;

            if( args.callback ) {
                args.callback = logEntryAndExit( args, `registerRouteOverride for solName='${appName}'` );
            } else {
                logExecution( `registerRouteOverride for solName='${appName}'` );
            }

            const { data: { routeOverrideConfiguration, solHost, solPort } = {}, callback } = args;

            [error, putObj] = createRegisterPUTObject( { solHost, solPort } );

            if( error ) {
                return callback( error );
            }

            // set config object, and override some parameters which the sol is not allowed to set (e.g. its own name)
            putObj.routeOverrideConfiguration = routeOverrideConfiguration.map( ( config ) => Object.assign(
                config,
                {
                    appName: appName
                } ) );

            logInfo( 'registerRouteOverride', `updating appreg collection for sol: ${appName}` );

            [error, appReg] = await formatPromiseResult( updateAppRegForRegistration( { putObj, appName } ) );

            if( error ) {
                logError( 'registerRouteOverride', error, 'error updating appReg' );
                return handleResult( error, undefined, callback );
            }

            emitChangedAppRegNamespaceEvent( { appName, routeOverrideConfiguration, appReg } );

            return handleResult( undefined, undefined, callback );
        }

        /**
         * For Ext Usage!
         * Deregisters DCRouter overrides of the app which made the request
         * @method deregisterRouteOverride
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Object} args.callback
         * @for Y.doccirrus.api.appreg
         * @return {undefined}
         */
        async function deregisterRouteOverride( args ) {
            const
                { user: { U: appName } = {} } = args;

            if( args.callback ) {
                args.callback = logEntryAndExit( args, `deregisterRouteOverride for solName='${appName}'` );
            } else {
                logExecution( `deregisterRouteOverride for solName='${appName}'` );
            }

            const { callback } = args;
            let error, appReg;

            if( !appName ) {
                return handleResult( new Y.doccirrus.commonerrors.DCError( 401 ), undefined, callback );
            }

            let putObj = {
                routeOverrideConfiguration: []
            };

            [error, appReg] = await formatPromiseResult( updateAppRegForRegistration( { putObj, appName } ) );

            if( error ) {
                logError( 'deregisterRouteOverride', error, 'error updating appReg' );
                return handleResult( error, undefined, callback );
            }

            emitChangedAppRegNamespaceEvent( { appName, appReg } );

            return handleResult( undefined, undefined, callback );
        }

        /**
         * Makes post call to url configured in CASEFILE uiConfiguration type of an app
         * @method callApp
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {String} args.data.appName
         * @param {Array} args.data.selectedActivities
         * @param {String} args.data.patientId
         * @param {Object} args.callback
         * @for Y.doccirrus.api.appreg
         */
        function callApp( args ) {
            if( args.callback ) {
                args.callback = logEntryAndExit( args, 'callApp' );
            } else {
                logExecution( 'callApp' );
            }
            const
                { data = {}, callback } = args,
                async = require( 'async' );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.api.appreg.get( {
                        query: {
                            appName: data.appName
                        },
                        callback( err, results ) {
                            let
                                appReg,
                                targetUrl;
                            if( err ) {
                                return next( err );
                            }
                            if( !results.length ) {
                                return next( new Y.doccirrus.commonerrors.DCError( 400, { message: 'appreg not found' } ) );
                            }
                            appReg = results[ 0 ];
                            appReg.uiConfiguration.some( item => {
                                if( item.type === Y.doccirrus.schemas.appreg.uiConfigurationTypes.CASEFILE ) {
                                    targetUrl = item.targetUrl;
                                    return true;
                                }
                            } );
                            next( null, targetUrl );
                        }
                    } );
                },
                function( targetUrl, next ) {
                    const
                        needle = require( 'needle' );
                    needle.post( targetUrl, {
                        activities: data.selectedActivities,
                        patientId: data.patientId
                    }, { json: true, timeout: 10000, headers: args.httpRequest.headers }, function( err, resp ) {
                        if( err ) {
                            if( 'ECONNREFUSED' === err.code ) {
                                return next( new Y.doccirrus.commonerrors.DCError( 503, { message: `App is not available.` } ) );
                            }
                            return next( err );
                        }
                        if( 200 !== resp.statusCode ) {
                            return next( new Y.doccirrus.commonerrors.DCError( resp.statusCode, { message: `${resp.statusMessage} (${resp.statusCode})` } ) );
                        }
                        next( null, { message: resp && resp.body } );
                    } );
                }
            ], callback );

        }

        function checkApiAccess( params, callback ) {
            const
                { rest: { action } = {} } = params,
                forbidden = new Y.doccirrus.commonerrors.DCError( 401 ),
                whiteList = ['registerRouteOverride', 'deregisterRouteOverride', 'unRegisterUIMenu', 'registerUIMenu', 'registerWebHook', 'unRegisterWebHook'];

            if( whiteList.includes( action ) ) {
                return setImmediate( callback );
            }
            return setImmediate( callback, forbidden );
        }

        /**
         * @method PRIVATE
         *
         * This method sets hasAccess to false for appreg._id = _id in DB.
         *
         * @param {Object} args
         *    @param {Object} args.user
         *    @param {string} args._id - Appreg database ID
         *    @param {string} args.appname - Solution name
         *    @param {string} [args.methodName] - This method will log message using 'methodName' keyword
         * @returns {Promise<void>}
         */
        async function disableSol( args ) {
            const
                {user, _id, appName, methodName} = args;

            let err;

            Y.log(`${methodName || "disableSol"}: Setting hasAccess = false for sol: ${appName} with _id: ${_id}`, "info", NAME);

            [err] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                model: 'appreg',
                                action: 'put',
                                user: user,
                                query: {_id},
                                data: Y.doccirrus.filters.cleanDbObject( {
                                    hasAccess: false
                                } ),
                                fields: ['hasAccess']
                            } )
                          );

            if( err ) {
                Y.log(`${methodName || "disableSol"}: Error while setting hasAccess to false for appregs._id = ${_id}. Error: ${err.stack || err}`, "error", NAME);
                throw err;
            }

            Y.log(`${methodName || "disableSol"}: Successfully set hasAccess = false for sol: ${appName} with _id: ${_id}`, "info", NAME);
        }

        /**
         * @method PRIVATE
         *
         * Given appreg "_id" or "appName" returns its respective appreg record from the "appregs" collection
         *
         * @param {Object} args
         *     @param {Object} args.user
         *     @param {string} [args._id] - Query 'appregs' collection by "_id"
         *     @param {string} [args.appName] - Query 'appregs' collection by "appName"
         *     @param {string} args.methodName - Use this name to log messages in this function
         * @returns {Promise<Object>}
         */
        async function _getAppregByIdOrName( args ) {
            const
                {user, _id, appName, methodName, options} = args;

            let
                err,
                result,
                command = {
                    user: user,
                    model: 'appreg',
                    action: 'get'
                },
                appregDbQuery = {};

            // ----------------------------------------------- 1. Validations ---------------------------------------------------------------------------
            if( !_id && !appName ) {
                throw new Error(`'query' must be present with either '_id' or 'appName'`);
            }

            if( _id ) {
                if( typeof _id !== "string" ) {
                    throw new Error( `'query._id' must be string`);
                }
                appregDbQuery._id = _id;
            }

            if( appName ) {
                if( typeof appName !== "string" ) {
                    throw new Error( `'query.appName' must be string` );
                }
                appregDbQuery.appName = appName;
            }

            command.query = appregDbQuery;

            if( options ) {
                command.options = options;
            }
            // ------------------------------------------------------ 1. END ---------------------------------------------------------------------

            // ------------------------------ 2. Check whether "appregDbQuery" has any record in DB --------------------------------------------

            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( command )
            );

            if( err ) {
                Y.log(`${methodName || "_getAppregByIdOrName"}: Error querying 'appreg' collection for query: ${JSON.stringify(appregDbQuery)}. Error: ${err.stack || err} `, "error", NAME);
                throw new Error(`Error querying 'appreg' collection for query: ${JSON.stringify(appregDbQuery)}. Error message: ${err}`);
            }

            if( !result || !Array.isArray(result) || !result.length ) {
                Y.log(`${methodName || "_getAppregByIdOrName"}: No appreg found in DB for query: ${JSON.stringify(appregDbQuery)}.`, "info", NAME);
                return undefined;
            }

            if( result.length > 1 ) {
                Y.log(`${methodName || "_getAppregByIdOrName"}: More than one appreg found in DB for query: ${JSON.stringify(appregDbQuery)}. Expected only one result.`, "info", NAME);
                throw new Error(`More than one appreg found in DB for query: ${JSON.stringify(appregDbQuery)}. Expected only one result.`);
            }

            if( !result[0].appName ) {
                Y.log(`${methodName || "_getAppregByIdOrName"}: Queried appreg for query: ${JSON.stringify(appregDbQuery)} does not have 'appName'. 'appName' must be present`, "warn", NAME);
                throw new Error(`Queried appreg for query: ${JSON.stringify(appregDbQuery)} does not have 'appName'. 'appName' must be present`);
            }
            // ---------------------------------------------------- 2. END -----------------------------------------------------------------------

            return result[0];
        }

        /**
         * This method returns a boolean for if a sol with given solName is licensed on local tenant.
         * A sol is licensed, when there is an entry in the appregs collection.
         *
         * @param {string} solName
         * @returns {Boolean}
         */
        async function isSolLicensed( solName ) {

            const
                user = Y.doccirrus.auth.getSUForLocal(),
                command = {
                    user: user,
                    model: 'appreg',
                    action: 'count',
                    query: {
                        appName: solName
                    }
                },
                [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( command ) );

            if( err ) {
                Y.log( `isSolLicensed: Error querying 'appreg' collection for sol ${solName}. Error: ${err.stack || err}`, 'error', NAME );
                return false;
            }
            return Boolean( result > 0 );
        }

        /**
         * @method PUBLIC
         * @async
         * @JsonRpcApi
         *
         * NOTE: Should be called from websocket on master cluster
         *
         * This method does below:
         * 1] Validates the query input
         * 2] Checks whether "args.query" returns only a single and valid appreg record from DB
         * 3] If production environment then enables the solution by executing the enable command
         * 4] Starts the solution and sets "hasAccess" flag to true in appreg collection
         *
         * @param {Object} args
         *    @param {Object} args.user
         *    @param {function} [args.callback] - If present then response will be sent via callback
         *    @param {Object} args.query
         *        @param {string} [args.query._id] - Give access tp appreg with ID. This will always be present from UI call.
         *        @param {string} [args.query.appName] - Give access to appreg with appName. This will always be present from appreg-test.js call.
         *        @param {Boolean} [args.query.appIsRemote] - 'true' if the Sol app is running outside of the datensafe (i.e. while being developed)
         *        @param {Boolean} [args.query.appHostType] - either 'LOCAL' (Sol running in datensafe) or 'REMOTE' (Sol running remotely)
         * @returns {Promise<undefined>}
         */
        async function giveAccess( args ) {
            if( args.callback ) {
                args.callback = logEntryAndExit( args, 'giveAccess' );
            } else {
                logExecution( 'giveAccess' );
            }

            const
                { user, query = {}, callback } = args,
                { _id, appName, appHostType = DEFAULT_SOL_HOST_TYPE } = query,
                { appIsRemote = (appHostType !== 'LOCAL') } = query,
                activateAppProm = promisify( activateApp ),
                isTestLicense = (user && Y.doccirrus.licmgr.hasSupportLevel( user.tenantId, Y.doccirrus.schemas.settings.supportLevels.TEST ));

            let
                err,
                result,
                queriedAppreg;

            // ------------------------------ 1. Get 'appreg' by "_id" or "appName" ------------------------------

            [err, queriedAppreg] = await formatPromiseResult(
                                            _getAppregByIdOrName({
                                                user,
                                                _id,
                                                appName,
                                                methodName: "giveAccess"
                                            })
                                          );

            if( err ) {
                return handleResult(
                    Y.doccirrus.errors.createError(err.message),
                    undefined,
                    callback
                );
            }

            if( queriedAppreg.hasAccess ) {
                return handleResult(
                    Y.doccirrus.errors.createError(`Sol: ${queriedAppreg.appName} is already active`),
                    undefined,
                    callback
                );
            }
            // ------------------------------ 1. END ------------------------------

            // ------------------------------ 2. Audit the solution start operation ------------------------------

            await formatPromiseResult(
                Y.doccirrus.api.audit.postBasicEntry( user, 'start', 'sol', queriedAppreg.appName )
            );

            // ------------------------------ 2. END ------------------------------

            // ------------------------------ 3. Activate the sol ------------------------------

            // In order to get the SOLTOKEN (a.k.a. TTAS) and add it to the Sol config (see EXTMOJ-2353), the user is also passed to activateApp
            queriedAppreg.user = user;

            // the appIsRemote flag is used to enable/disable writing config file (see MOJ-11997)
            // appHostType will be saved into the appreg document
            queriedAppreg.appIsRemote = appIsRemote; // boolean
            queriedAppreg.appHostType = appHostType; // string

            /**
             * 3.2 check if app is installed before enabling, install if not already
             * TODO remove this by 2022
             */

            if( !appIsRemote && !Y.doccirrus.auth.isDevServer() && await isAppInstalled( appName ) ) {
                logInfo( 'giveAccess', `sol ${appName} is not installed - this check is deprecated and should be removed in future versions` );

                [err] = await formatPromiseResult(
                    installApp( {appName} )
                );

                if( err ) {
                    logError( 'giveAccess', err );
                }
            }

            /**
             * NOTE: activateAppProm also sets hasAccess = true just before starting the solution.
             * The reason we have updated hasAccess = true before starting sol is because in "activateAppProm" function last step is
             * starting solution. Once the sol has started then it can hit the "registerUiMenu" function to update "uiConfiguration",
             * "appCurrentPort" and "appHost" values in appreg collection. If we update appreg collection after starting the solution
             * then it can create race condition as both the sol with "registerUiMenu" call and our call to update hasAccess = true
             * can happen at once so its better to first update the "appreg" collection before starting the solution
             *
             * @type {ActivateAppRetObj} result
             */
            [err, result] = await formatPromiseResult(
                activateAppProm( queriedAppreg )
            );

            if( err ) {
                Y.log(`giveAccess: Error while starting sol: '${queriedAppreg.appName}'. Error: ${err.stack || err}`, "error", NAME);

                /**
                 * If for any reason the solution start fails then this method returns error representing
                 * unsuccessful solution start. In this case set back hasAccess = false in DB for this solution
                 * just to ensure that database exactly represents which solutions are active
                 *
                 * NOTE: Errors are already handled in disableSol method. Those errors are not exceptions though so nothing to handle here
                 */
                await formatPromiseResult(
                        disableSol({
                            user,
                            methodName: "giveAccess",
                            _id: queriedAppreg._id.toString(),
                            appName: queriedAppreg.appName
                        })
                      );

                return handleResult( Y.doccirrus.errors.createError(`Error while starting sol: '${queriedAppreg.appName}'. Error message: ${err}`), undefined, callback );
            }

            // ------------------------------ 3. END ------------------------------

            // ------------------------------ 4. Send notification to user ------------------------------

            Y.doccirrus.communication.emitNamespaceEvent( {
                nsp: 'default',
                event: 'system.changedAppReg',
                msg: {
                    data: {
                        appName: result.data.appName,
                        uiConfiguration: result.data.uiConfiguration,
                        routeOverrideConfiguration: result.data.routeOverrideConfiguration,
                        hasAccess: true,
                        // configString: (isTestLicense && result.configString) ? result.configString : '', // config should only be sent to UI if in test license
                        appHostType
                    }
                },
                doNotChangeData: true
            } );

            if( isTestLicense && appIsRemote && result.configString ) {
                Y.doccirrus.communication.emitEventForUser( {
                    targetId: user.identityId,
                    event: 'system.showAppRegConfigString',
                    msg: {
                        data: {
                            appName: result.data.appName,
                            configString: result.configString // config should only be sent to UI if in test license
                        }
                    }
                } );
            }

            // ------------------------------ 4. END ------------------------------

            Y.log('Exiting Y.doccirrus.api.appreg.giveAccess', "info", NAME);
            return handleResult( undefined, undefined, callback );
        }

        /**
         * To be used by the appAccessManager view to render the update apps section
         * @param {Object} args
         * @param {Object} args.user
         * @param {Function} [args.callback]
         * @returns {Promise<Object|*>}
         */
        async function getOutdatedAppsCount( args ) {
            if( args && args.callback ) {
                args.callback = logEntryAndExit( args, 'getOutdatedAppsCount' );
            } else {
                logExecution( 'getOutdatedAppsCount' );
            }
            const {callback, user = Y.doccirrus.auth.getSUForLocal()} = args || {};
            let error, count;

            [error, count] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'appreg',
                    action: 'count',
                    query: {versionIsOutdated: true}
                } )
            );

            if( error ) {
                Y.log( `Could not get outdated app count: ${error.stack || error}`, 'error', NAME );
                return handleResult( error, undefined, callback );
            }

            if( !count && count !== 0 ) {
                Y.log( `Could not get outdated app count: count is ${count}`, 'warn', NAME );
                count = 0;
            }

            return handleResult( undefined, count, callback );
        }

        /**
         * Handles updating the Sol to the newest version
         * 1. gets the Sol's appreg
         * 2. uninstalls current version
         * 3. installs newest version
         * 4. restarts the Sol by writing a new config and re-enabling
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {String} args.query.appName
         * @param {String} args.query.appHostType
         * @param {Function} [args.callback]
         * @returns {Promise<Object|*>}
         */
        async function updateAppVersion( args ) {
            if( args && args.callback ) {
                args.callback = logEntryAndExit( args, 'updateAppVersion' );
            } else {
                logExecution( 'updateAppVersion' );
            }

            const
                {user = Y.doccirrus.auth.getSUForLocal(), query = {}, callback} = args || {},
                activateAppProm = promisify( activateApp ),
                {appName, appHostType, appIsRemote} = query;

            let error, appReg;

            if( !appName ) {
                error = new Y.doccirrus.commonerrors.DCError( 400, {message: 'Sol name must be provided'} );
                return handleResult( error, undefined, callback );
            }

            if( appIsRemote || appHostType !== 'LOCAL' ) {
                error = new Y.doccirrus.commonerrors.DCError( 400, {message: 'Sol must be of type "LOCAL" to be updated'} );
                return handleResult( error, undefined, callback );
            }

            // get the appreg for the Sol
            [error, appReg] = await formatPromiseResult(
                _getAppregByIdOrName( {
                    appName,
                    user
                } )
            );

            if( error ) {
                logError( 'updateAppVersion', error, `could not get appReg for ${appName}` );
                return handleResult( error, undefined, callback );
            }

            if( !Y.doccirrus.auth.isDevServer() ) {

                // uninstall app
                [error] = await formatPromiseResult(
                    _executeRemoveCommand( {appName} )
                );

                if( error ) {
                    logError( 'updateAppVersion', error, `could not uninstall ${appName}` );
                    return handleResult( error, undefined, callback );
                }

                // install app
                [error] = await formatPromiseResult(
                    _executeInstallCommand( {appName} )
                );

                if( error ) {
                    logError( 'updateAppVersion', error, `could not install new version for ${appName}` );
                    return handleResult( error, undefined, callback );
                }
            }

            /**
             * If the Sol is deactivated, leave it inactive
             */
            if( !appReg.hasAccess ) {
                return handleResult( undefined, undefined, callback );
            }

            /**
             * Use activateApp in order to write the Sol config
             * and update the Sol version in the appreg to show in the table
             */
            [error] = await formatPromiseResult(
                activateAppProm( appReg )
            );

            if( error ) {
                logError( 'updateAppVersion', error, `error while starting ${appName}` );

                // errors are handled in the function
                await formatPromiseResult(
                    disableSol( {
                        user,
                        methodName: 'updateAppVersion',
                        appName
                    } )
                );

                return handleResult( error, undefined, callback );
            }

            return handleResult( undefined, undefined, callback );
        }

        /**
         * Updates all Sols to the latest version
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} [args.callback]
         * @returns {Promise<Object|*>}
         */
        async function updateAllAppVersions( args ) {
            if( args.callback ) {
                args.callback = logEntryAndExit( args, 'updateAllAppVersions' );
            } else {
                logExecution( 'updateAllAppVersions' );
            }

            const {user = Y.doccirrus.auth.getSUForLocal(), callback} = args;
            let error, appregs;

            [error, appregs] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'appreg',
                    action: 'get',
                    query: {},
                    options: {fields: {appName: 1}}
                } )
            );

            if( error ) {
                logError( 'updateAllAppVersions', error, 'getting appregs from db' );
                return handleResult( error, undefined, callback );
            }

            if( !appregs || !appregs.length ) {
                logWarn( 'updateAllAppVersions', 'appregs is empty' );
                return handleResult( undefined, undefined, callback );
            }

            for( const appreg of appregs ) {
                [error] = await formatPromiseResult(
                    updateAppVersion( appreg )
                );

                if( error ) {
                    logWarn( 'updateAllAppVersions', error );
                }
            }

            return handleResult( undefined, undefined, callback );
        }

        /**
         * Checks if the given appName is installed on the system
         * @param {String} appName
         * @returns {Promise<boolean|*>}
         */
        async function isAppInstalled( appName ) {
            logExecution( 'isAppInstalled' );

            if( !appName || typeof appName !== 'string' ) {
                logWarn( 'isAppInstalled', `expected appName to be a string, received ${typeof appName}` );
                return false;
            }

            const [error, solsListData] = await formatPromiseResult(
                Y.doccirrus.api.appreg.getSolsListData( {} )
            );

            if( error ) {
                logWarn( 'appreg.isAppInstalled', error, 'Error while getting list of installed apps' );
                return false;
            }

            if( !solsListData || !Array.isArray( solsListData ) || !solsListData.length ) {
                logInfo( 'appreg.runOnStart', 'No installed apps' );
                return false;
            }

            const installedAppsNames = solsListData.map( app => app.name );

            return installedAppsNames.includes( appName );
        }

        /**
         * Install the given appName
         * @param {Object} args
         * @param {Object} args.appName
         * @param {Function} [args.callback]
         * @returns {Promise<Object|*>}
         * @for licmanager
         */
        async function installApp( args ) {
            if( args.callback ) {
                args.callback = logEntryAndExit( args, 'installApp' );
            } else {
                logExecution( 'installApp' );
            }

            const {appName, callback} = args || {};
            let error;

            if( !appName ) {
                error = new Error( 'appName is missing from arguments' );
                return handleResult( error, undefined, callback );
            }

            [error] = await formatPromiseResult(
                _executeInstallCommand( {appName} )
            );

            if( error ) {
                logError( 'installApp', error, `error while installing ${appName}` );
                return handleResult( error, undefined, callback );
            }

            return handleResult( undefined, appName, callback );
        }

        /**
         * Uninstall the given appName
         * @param {Object} args
         * @param {Object} args.appName
         * @param {Function} [args.callback]
         * @returns {Promise<Object|*>}
         * @for licmanager
         */
        async function unInstallApp( args ) {
            if( args.callback ) {
                args.callback = logEntryAndExit( args, 'unInstallApp' );
            } else {
                logExecution( 'unInstallApp' );
            }

            const {appName, callback} = args || {};
            let error;

            if( !appName ) {
                error = new Error( 'appName is missing from arguments' );
                return handleResult( error, undefined, callback );
            }

            [error] = await formatPromiseResult(
                _executeRemoveCommand( {appName} )
            );

            if( error ) {
                logError( 'unInstallApp', error, `error while removing ${appName}` );
                return handleResult( error, undefined, callback );
            }

            return handleResult( undefined, appName, callback );
        }

        /**
         * Checks if the current version is lower than the store version
         * @param args
         * @param args.currentVersion
         * @param args.storeVersion
         * @returns {boolean}
         * @private
         */
        function _isSolVersionOutdated( args ) {
            const
                {currentVersion, storeVersion} = args,
                currentVersionParts = currentVersion.split( '.' ),
                storeVersionParts = storeVersion.split( '.' );

            function _isPositiveInteger( x ) {
                return /^\d+$/.test( x );
            }

            // First, validate both numbers are true version numbers
            function validateParts( parts ) {
                for( let i = 0; i < parts.length; ++i ) {
                    if( !_isPositiveInteger( parts[i] ) ) {
                        return false;
                    }
                }
                return true;
            }

            if( !validateParts( currentVersionParts ) || !validateParts( storeVersionParts ) ) {
                logDebug( '_isSolVersionOutdated', `could not compare versions of ${currentVersion} and ${storeVersion}` );
                return false;
            }

            for( let i = 0; i < currentVersionParts.length; ++i ) {
                if( storeVersionParts.length === i ) {
                    return false;
                }

                if( currentVersionParts[i] === storeVersionParts[i] ) {
                    continue;
                }
                if( currentVersionParts[i] > storeVersionParts[i] ) {
                    return false;
                }
                return true;
            }

            return currentVersionParts.length !== storeVersionParts.length;
        }

        /**
         * Runs from licmanager for updating the storeVersion in the appreg
         * and adding the versionIsOutdated flag
         * 1. gets all appregs
         * 2. gets solUpdatesList with available updates
         * 3. for each appreg it adds the storeVersion and checks if it is up to date
         * @param {Object} args
         * @param {Object} [args.callback]
         * @param {Object} args.user
         * @returns {Promise<Object|*>}
         */
        async function checkForNewAppVersionsInStore( args ) {
            if( args && args.callback ) {
                args.callback = logEntryAndExit( args, 'checkForNewAppVersionsInStore' );
            } else {
                logExecution( 'checkForNewAppVersionsInStore' );
            }

            const {user = Y.doccirrus.auth.getSUForLocal(), callback} = args || {};
            let error, appregs, appEntry, solUpdatesList, solManifest;

            [error, appregs] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'appreg',
                    action: 'get',
                    query: {},
                    options: {
                        fields: {
                            appName: 1,
                            appVersion: 1,
                            storeVersion: 1,
                            versionIsOutdated: 1
                        }
                    }
                } )
            );

            if( error ) {
                logError( 'checkForNewAppVersionsInStore', error, 'getting appregs from db' );
                return handleResult( error, undefined, callback );
            }

            if( !appregs || !appregs.length ) {
                logWarn( 'checkForNewAppVersionsInStore', 'appregs is empty' );
                return handleResult( undefined, undefined, callback );
            }

            [error, solUpdatesList] = await formatPromiseResult(
                getSolUpdatesList()
            );

            if( error ) {
                logError( 'checkForNewAppVersionsInStore', error, 'getting solUpdatesList' );
                return handleResult( error, undefined, callback );
            }

            if( !solUpdatesList || !solUpdatesList.length ) {
                logWarn( 'checkForNewAppVersionsInStore', 'solUpdatesList is empty' );
                return handleResult( undefined, undefined, callback );
            }

            logDebug( 'checkForNewAppVersionsInStore', JSON.stringify( solUpdatesList, null, 2 ) );

            for( const appreg of appregs ) {
                appEntry = solUpdatesList.find( ( solUpdate ) => solUpdate.name === appreg.appName );

                if( !appEntry ) {
                    logDebug( 'checkForNewAppVersionsInStore', `no store version found for ${appreg.appName}` );
                    continue;
                }

                appreg.storeVersion = appEntry.version;
                appreg.versionIsOutdated = _isSolVersionOutdated( {
                    currentVersion: appreg.appVersion,
                    storeVersion: appreg.storeVersion
                } );

                [error] = await formatPromiseResult(
                    Y.doccirrus.api.appreg.put( {
                        query: {
                            _id: appreg._id
                        },
                        fields: ['storeVersion', 'versionIsOutdated'],
                        data: {
                            versionIsOutdated: appreg.versionIsOutdated,
                            storeVersion: appreg.storeVersion
                        }
                    } )
                );

                if( error ) {
                    logError( 'checkForNewAppVersionsInStore', error, `unable to update appreg ${appreg.appName}` );
                    return handleResult( error, undefined, callback );
                }

                if( !appreg.versionIsOutdated ) {
                    continue;
                }

                /* if current version is outdated check for AUTOUPDATE flag
                *  this solution should be temporary until we find a better one */

                [error, solManifest] = await formatPromiseResult(
                    getDataFromSolManifest( {
                        solPath: _getSolPath( appreg.appName ),
                        findRegEx: /AUTOUPDATE=.*/,
                        readFile: readFileFactory()
                    } )
                );

                if( solManifest && solManifest.AUTOUPDATE === 'true' ) {
                    const testLicense = Y.doccirrus.licmgr.hasSupportLevel( user.tenantId, Y.doccirrus.schemas.settings.supportLevels.TEST );

                    [error] = await formatPromiseResult(
                        updateAppVersion( {
                            user,
                            query: {
                                _id: appreg._id,
                                appName: appreg.appName,
                                appHostType: (testLicense && appreg.appHostType) || 'LOCAL'
                            }
                        } )
                    );

                    if( error ) {
                        logError( 'checkForNewAppVersionsInStore', error, `unable to auto update appreg ${appreg.appName}` );

                        return handleResult( error, undefined, callback );
                    }
                }
            }

            return handleResult( undefined, undefined, callback );
        }

        /**
         * Returns the Sol versions available for installation
         * @param {Function} [callback]
         * @returns {Promise<Array|undefined>}
         */
        async function getSolUpdatesList( callback ) {
            if( callback ) {
                callback = logEntryAndExit( {callback}, 'getSolUpdatesList' );
            } else {
                logExecution( 'getSolUpdatesList' );
            }

            const
                timeout = 30000, /* 30 seconds */
                commandName = 'listUpdatesCommand';
            let error, stdout, solUpdatesList;

            [error, stdout] = await formatPromiseResult(
                Y.doccirrus.api.appreg._executeSolCommand( {
                    commandName,
                    timeout
                } )
            );

            if( error || !stdout ) {
                error = error || new Error( 'stdout is empty' );
                logWarn( 'getSolUpdatesList', error, 'could not get Sol list data' );
                return handleResult( error, undefined, callback );
            }

            solUpdatesList = JSON.parse( stdout );
            solUpdatesList = solUpdatesList.updateSols || [];

            return handleResult( undefined, solUpdatesList, callback );
        }

        /**
         * @method PUBLIC
         * @JsonRpcApi
         * @async
         *
         * NOTE: Should be called from websocket on master cluster
         *
         * This methods first stops the sol and then sets "hasAccess" to false in "appregs" collection
         * for args.query._id or args.query.appName
         *
         * @param {Object} args
         *    @param {Object} args.user
         *    @param {function} [args.callback]
         *    @param {Object} args.query
         *        @param {string} [args.query._id] - Disable appreg document by ID. This will always be present from UI call.
         *        @param {string} [args.query.appName] - Disable appreg document by appName. This will always be present from appreg-test.js call.
         * @returns {Promise<undefined>}
         */
        async function denyAccess( args ) {
            if( args.callback ) {
                args.callback = logEntryAndExit( args, 'denyAccess' );
            } else {
                logExecution( 'denyAccess' );
            }

            const
                { user, query = {}, callback } = args,
                { _id, appName } = query,
                _disableAppProm = promisify( _disableApp );

            let
                err,
                queriedAppreg;

            // ------------------------------ 1. Get 'appreg' by "_id" or "appName" ----------------------------
            [err, queriedAppreg] = await formatPromiseResult(
                                            _getAppregByIdOrName({
                                                user,
                                                _id,
                                                appName,
                                                methodName: "denyAccess"
                                            })
                                          );

            if( err ) {
                return handleResult( Y.doccirrus.errors.createError(err.message), undefined, callback );
            }

            if( !queriedAppreg.hasAccess ) {
                return handleResult( Y.doccirrus.errors.createError(`Sol: ${queriedAppreg.appName} is already inactive`), undefined, callback );
            }
            // -------------------------------------------- 1. END --------------------------------------------


            // ----------------------------------- 2. Audit the solution finish operation ------------------------------------------------
            await formatPromiseResult( Y.doccirrus.api.audit.postBasicEntry(user, 'finish', 'sol', queriedAppreg.appName) );
            // ------------------------------------------------- 2. END -----------------------------------------------------------------


            // --------------------------------------------------------- 2. Stop the sol ------------------------------------------------------------------
            /**
             * NOTE: _disableAppProm will also set hasAccess to false in DB
             */
            const {appHostType = DEFAULT_SOL_HOST_TYPE} = queriedAppreg;
            [err] = await formatPromiseResult(
                _disableAppProm( {appName: queriedAppreg.appName, appHostType} )
            );

            if( err ) {
                Y.log(`denyAccess: Error while stopping sol: ${queriedAppreg.appName}. Error: ${err.stack || err}`, "error", NAME);
                return handleResult( Y.doccirrus.errors.createError(`Error while stopping sol: '${queriedAppreg.appName}'. Error message: ${err}`), undefined, callback );
            }
            // --------------------------------------------------------- 2. END ---------------------------------------------------------------------------


            // ----------------------------------------- 3. Notify UI --------------------------
            Y.doccirrus.communication.emitNamespaceEvent( {
                nsp: 'default',
                event: 'system.changedAppReg',
                msg: {
                    data: {
                        appName: queriedAppreg.appName,
                        uiConfiguration: [],
                        routeOverrideConfiguration: [],
                        hasAccess: false,
                        appHostType
                    }
                },
                doNotChangeData: true
            } );
           // ----------------------------------------------- 3 .END ------------------------------

            Y.log('Exiting Y.doccirrus.api.appreg.denyAccess', "info", NAME);
            return handleResult( undefined, undefined, callback );
        }

        /**
         * Infinite loop possible
         * Tries to assign a free port for a Sol
         * If port range is given in config, uses these boundaries for the port
         * By default uses port between 40000 and 60000
         * @param {Function} callback
         * @param {Number} [counter=0]
         */
        function _getFreePortForApp( callback, counter = 1 ) {
            const
                solsConfig = Y.doccirrus.api.appreg._getSolsConfig(),
                isPortRangeSpecified = solsConfig.minLocalPort && solsConfig.maxLocalPort,

                // default port range from 40000 to 60000
                minimumPort = isPortRangeSpecified ? solsConfig.minLocalPort : 40000,
                maximumPort = isPortRangeSpecified ? solsConfig.maxLocalPort : 60000,

                port = minimumPort + Math.floor( Math.random() * (maximumPort - minimumPort) );

            Y.doccirrus.utils.isPortAvailable( port )
                .then( isAvailable => {
                    if( isAvailable ) {
                        return callback( null, port );
                    }
                    if( 8000 < counter ) {
                        return callback( new Y.doccirrus.commonerrors.DCError( 500, { message: 'Server was not able to find free port' } ) );
                    }
                    _getFreePortForApp( callback, ++counter );
                } )
                .catch( err => {
                    callback( err );
                } );
        }

        /**
         * Checks if port is within the port range defined in sols.json
         * @param {Number} port
         * @return {Boolean}
         */
        function _isPortInConfigRange( port ) {
            const
                solsConfig = Y.doccirrus.api.appreg._getSolsConfig(),
                isPortRangeSpecified = solsConfig.minLocalPort && solsConfig.maxLocalPort;

            if( !isPortRangeSpecified ) {
                logInfo( '_isPortInConfigRange', 'No port range configured, no check possible.' );
                return true;
            }

            return port >= solsConfig.minLocalPort && port <= solsConfig.maxLocalPort;
        }

        /**
         * 1. Stops app
         * 2. Unset app port from app reg entry
         * 3. Removes db user
         * @param {Object} params
         * @param {String} params.appName
         * @param {Function} callback
         * @return {undefined}
         */
        function _disableApp( params, callback ) {
            if( callback ) {
                callback = logEntryAndExit( {callback}, '_disableApp' );
            } else {
                logExecution( '_disableApp' );
            }
            const
                { appName, appHostType } = params,
                DB = require( 'dc-core' ).db,
                async = require( 'async' );

            // central audit point
            Y.doccirrus.api.audit.postBasicEntry( Y.doccirrus.auth.getSUForLocal(), 'check', 'sol', `Stop: ${appName}`  );

            async.waterfall( [
                function( next ) {
                    if( isAppRemote( appHostType ) ) {
                        return next( null );
                    }

                    _executeDisableCommand( {
                        appName,
                        callback: ( error, stdout ) => {
                            if( error ) {
                                logError( 'appreg._disableApp', error );
                                return next( error );
                            }
                            logDebug( 'appreg._disableApp', `disabled app ${appName}: ${stdout}` );
                            next( null );
                        }
                    } );
                },
                function( next ) {
                    if( isAppRemote( appHostType ) ) {
                        return next( null );
                    }

                    const configFileName = getConfigFileName( {appName} );

                    deleteConfigFile( {
                        appName,
                        configFileName
                    }, ( error ) => {
                        if( error ) {
                            logError( 'appreg._disableApp', error, 'could not delete config file' );
                            return next( error );
                        }
                        next( null );
                    } );
                },
                function( next ) {
                    DB.removeDbUser( {
                        dbName: appUtils.getAppDbName( appName ),
                        userName: appName
                    }, ( err ) => next( err ) );
                },
                function( next ) {
                    Y.doccirrus.api.appreg.put( {
                        query: {
                            appName
                        },
                        fields: [ 'appCurrentPort', 'dbPassword', 'hasAccess' ],
                        data: {hasAccess: false},
                        callback: next
                    } );
                }
            ], ( error, result ) => {
                if( error ) {
                    logError( 'appreg._disableApp', error );
                    return callback( error );
                }
                callback( undefined, result );
            } );

        }

        function getConfigFileName( params = {} ) {
            const
                { appName } = params;
            if( Y.doccirrus.auth.isDevServer() ) {
                return 'config';
            } else {
                return appName;
            }
        }

        /**
         * Returns object with app secrets: inSuiteToken and solToken
         * as well as appName and hasAccess property
         *
         * @param {Object} params
         * @param {String} params.appName
         * @param {String} params.user
         * @param {Function} callback
         * @returns {Promise<Object|*>}
         */
        async function getSecretForApp( params, callback ) {
            const
                {appName, user = Y.doccirrus.auth.getSUForLocal()} = params;
            let error, appReg;

            [error, appReg] = await formatPromiseResult(
                _getAppregByIdOrName( {
                    appName,
                    user,
                    options: {
                        fields: {
                            inSuiteToken: 1,
                            solToken: 1,
                            appName: 1,
                            hasAccess: 1
                        }
                    }
                } )
            );

            if( error ) {
                Y.log(`getSecretForApp: error occured while getting appreg for ${appName}`, 'error', NAME);
                return handleResult( error, undefined, callback );
            }

            if( !appReg ) {
                Y.log(`getSecretForApp: no appreg found for ${appName}`, 'warn', NAME);
                return handleResult( undefined, undefined, callback );
            }

            return handleResult( undefined, appReg, callback );
        }

        /**
         * 1. Signs the Sol tokens created by DCPRC with practice information
         *  and creates the solToken (a.k.a. appAccessToken or SOLTOKEN or TTAS)
         *
         * 2. Saves secrets into appreg collection
         *
         * @param {Object} args
         * @param {Array} args.appTokens
         * @param {Object} [args.user]
         * @param {Function} args.callback
         * @returns {Promise<Object|*>}
         */
        async function setSecretsForApps( args ) {
            const
                {appTokens = [], user = Y.doccirrus.auth.getSUForLocal(), callback} = args,
                dcSdk = require( 'dc-sdk-communications' );

            let
                item,
                error,
                results;

            [error, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'practice',
                action: 'get',
                query: {},
                options: {
                    limit: 1
                }
            } ) );

            if( error ) {
                Y.log( `Error getting practice information from db: ${error}`, 'error', NAME );
                return handleResult( error, undefined, callback );
            }

            let practice = results && results[0];

            if( !practice ) {
                Y.log(`setSecretsForApp: no practices found`, 'error', NAME);
                return handleResult( new Y.doccirrus.commonerrors.DCError( 500, {message: 'Practice entry not found'} ), undefined, callback );
            }

            // sign the token
            for( item of appTokens ) {
                item.originalToken = item.token;
                item.inSuiteToken = await dcSdk.auth.signObject( {
                    objectToSign: item.originalToken,
                    secretKey: `${practice._id.toString()}${practice.dcCustomerNo}`
                } );
                item.solToken = await dcSdk.auth.signObject( {
                    objectToSign: item.originalToken,
                    secretKey: `${item.appName}${item.inSuiteToken}`
                } );
            }

            [error] = await formatPromiseResult( Y.doccirrus.api.appreg.updateAppRegs( {
                user,
                appTokens: appTokens || []
            } ) );

            if( error ) {
                Y.log( `Error updating Sol tokens to db: ${error}`, 'error', NAME );
            }

            return handleResult( error, undefined, callback );
        }



        /**
         * Gets existing Sols from appreg collection and cross checks with
         * the tokens coming from DCPRC to see if there are new Sols and if
         * some Sols should be deleted and returns organised object
         *
         * @param  {Object} args
         * @param {Object} args.user
         * @param {Array} args.appTokens
         * @returns {Promise<{newApps: [], deletedApps: [], remainingAppsWithToken: []}>}
         * @private
         * @for updateAppRegs
         */
        async function _getAppsDataFromDbAndCrossCheckWithDCPRCTokens( args ) {
            const {user, appTokens} = args;
            let
                error, result, appRegNames, appNamesFromDCPRC,
                data = {
                    newApps: [],
                    deletedApps: [],
                    remainingAppsWithToken: []
                };

            [error, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'appreg',
                action: 'get',
                query: {}
            } ) );

            if( error ) {
                Y.log(`_getAppsDataFromDbAndCrossCheckWithDCPRCTokens: could not get appregs from db: ${error}`, 'error', NAME);
                throw error;
            }

            appRegNames = result.map( ( item ) => item.appName );
            appNamesFromDCPRC = appTokens.map( ( item ) => item.appName );
            appNamesFromDCPRC.forEach( ( item ) => {
                if( !appRegNames.includes( item ) ) {
                    data.newApps.push( item );
                } else {
                    data.remainingAppsWithToken.push( item );
                }
            } );
            appRegNames.forEach( ( item ) => {
                if( !appNamesFromDCPRC.includes( item ) ) {
                    data.deletedApps.push( item );
                }
            } );

            return data;
        }

        /**
         * Adds new Sols to appreg collection
         * @param {Object}  args
         * @param {Object} args.user
         * @param {Array} args.newAppNames
         * @param {Array} args.appTokens
         * @returns {Promise<boolean>}
         * @private
         * @for updateAppRegs
         */
        async function _addNewAppsToDb( args ) {
            const {user, newAppNames, appTokens} = args;
            let appName, appVersion, error;

            for( appName of newAppNames ) {
                const data = {
                    appName,
                    hasAccess: false
                };

                // eslint-disable-next-line no-loop-func
                const appData = appTokens.find( ( item ) => {
                    return item.appName === appName;
                } );

                if( appData ) {
                    const {inSuiteToken, solToken, title} = appData || {};
                    data.inSuiteToken = inSuiteToken;
                    data.solToken = solToken;
                    data.title = title || appName;
                }

                [error, appVersion] = await formatPromiseResult(
                    tryGetSolVersion( {solName: appName} )
                );

                if( error ) {
                    logWarn( '_addNewAppsToDb', error, 'could not get Sol version' );
                }

                if( appVersion ) {
                    data.appVersion = appVersion;
                }

                [error] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'appreg',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( data )
                } ) );

                if( error ) {
                    Y.log( `_addNewAppsToDb: could not add appreg to db: ${error}`, 'error', NAME );
                    throw error;
                }
            }

            return true;
        }

        /**
         * Deletes Sols from appreg collection
         *
         * @param {Object} args
         * @returns {Promise<boolean>}
         * @private
         * @for updateAppRegs
         */
        async function _deleteAppsFromDb( args ) {
            const {user, deletedApps} = args;
            let [error] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'appreg',
                action: 'delete',
                query: {
                    appName: {$in: deletedApps}
                },
                options: {
                    override: true
                }
            } ) );
            if( error ) {
                Y.log(`_addNewAppsToDb: could not delete appregs from db: ${error}`, 'error', NAME);
                throw error;
            }
            return true;
        }

        /**
         * Updates the app title, description, tokens and version
         * on the appreg entries
         * @param {Object} params
         * @returns {Promise<void>}
         * @private
         * @for updateAppRegs
         */
        async function _updateTokensForApps( args ) {
            const {user, appNames = [], appTokens} = args;
            let appData, error, appVersion;

            for( appData of appTokens ) {
                if( !appNames.includes( appData.appName ) ) {
                    continue;
                }

                Y.log( `_updateTokensForApps: updating tokens and title for: ${appData.title || appData.appName}`, 'debug', NAME );

                const
                    {inSuiteToken, solToken, title, description} = appData,
                    data = {
                        inSuiteToken,
                        solToken,
                        description: description || '',
                        title: title || appData.appName
                    };

                [error, appVersion] = await formatPromiseResult(
                    tryGetSolVersion( {solName: appData.appName} )
                );

                if( error ) {
                    Y.log( `_updateTokensForApps: Could not get Sol version for ${appData.title || appData.appName}: ${error}`, 'warn', NAME );
                }

                if( appVersion ) {
                    data.appVersion = appVersion;
                }

                [error] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'appreg',
                    action: 'put',
                    query: {appName: appData.appName},
                    fields: ['inSuiteToken', 'solToken', 'title', 'description', 'appVersion'],
                    data: Y.doccirrus.filters.cleanDbObject( data )
                } ) );

                if( error ) {
                    Y.log( `_updateTokensForApps: could not update appreg in db: ${error}`, 'error', NAME );
                    throw error;
                }
            }
        }

        /**
         * Gets Sol version depending on environment

         * @param {Object}  args
         * @param {String} args.solName
         * @param {String} [args.solPath]
         * @param {Function} [args.readFile]
         * @param {Function} [args.callback]
         * @public
         */
        async function tryGetSolVersion( args ) {
            if( args.callback ) {
                args.callback = logEntryAndExit( args, 'tryGetSolVersion' );
            } else {
                logExecution( 'tryGetSolVersion' );
            }

            const {solName, solPath = _getSolPath( solName ), readFile = readFileFactory(), callback} = args;
            let error, solVersion;

            if( Y.doccirrus.auth.isDevServer() ) {

                // If sol is not installed at solPath, no need to look up its version
                if( !fs.existsSync( solPath ) ) {
                    error = new Error( `sol not installed at expected path "${solPath}"` );
                    return handleResult( error, undefined, callback );
                }

                [error, solVersion] = await formatPromiseResult(
                    getSolVersionFromFS( {solPath, readFile} )
                );

                if( error ) {
                    logWarn( 'tryGetSolVersion', error, `could not get Sol version from sol.manifest of Sol ${solName || solPath}` );
                    return handleResult( error, undefined, callback );
                }

                if( !solVersion ) {
                    error = new Error( 'solVersion is empty' );
                    logWarn( 'tryGetSolVersion', error, `solVersion for ${solName || solPath} is empty` );
                    return handleResult( error, undefined, callback );
                }

                logInfo( 'tryGetSolVersion', `found ${solName} with version ${solVersion}` );
                return handleResult( undefined, solVersion, callback );
            }

            [error, solVersion] = await formatPromiseResult(
                getSolVersion( {solName} )
            );

            if( error ) {
                logWarn( 'tryGetSolVersion', error, 'could not get Sol version from CLI' );
                return handleResult( error, undefined, callback );
            }

            if( !solVersion ) {
                error = new Error( `solVersion for ${solName || solPath} not found` );
                logWarn( 'tryGetSolVersion', error, 'could not get Sol version from CLI' );
                return handleResult( error, undefined, callback );
            }

            logInfo( 'tryGetSolVersion', `found ${solName} with version ${solVersion}` );
            return handleResult( undefined, solVersion, callback );

        }

        /**
         * Updates appregs collection:
         *  1. inserts new tokens
         *  2. deletes deleted tokens
         *  3. updates existing appregs with new tokens
         *
         * @param {Object} params
         * @param {Array} params.appTokens
         * @param {Object} params.user
         * @param {function} [callback]
         * @returns {Promise<Object|*>}
         */
        async function updateAppRegs( params, callback ) {
            Y.log( `Executing Y.doccirrus.api.appreg.updateAppRegs`, 'info', NAME );
            const {appTokens, user} = params;
            let error, apps;

            if( !appTokens || !appTokens.length ) {
                Y.log( `appreg collection was not updated: appTokens array is empty`, 'warn', NAME );
                return handleResult( undefined, undefined, callback );
            }

            [error, apps] = await formatPromiseResult( _getAppsDataFromDbAndCrossCheckWithDCPRCTokens( {user, appTokens} ) );

            if( error ) {
                Y.log( `Error getting Sol information from db: ${error}`, 'error', NAME );
                return handleResult( error, undefined, callback );
            }

            Y.log( `Adding ${apps.newApps.length} new apps, updating ${apps.remainingAppsWithToken.length} and deleting ${apps.deletedApps.length}`, 'info', NAME );

            if( apps.newApps.length ) {
                [error] = await formatPromiseResult( _addNewAppsToDb( {
                    user,
                    newAppNames: apps.newApps,
                    appTokens
                } ) );
                if( error ) {
                    Y.log( `Error adding new Sols to db: ${error}`, 'error', NAME );
                    return handleResult( error, undefined, callback );
                }
            }

            if( apps.deletedApps.length ) {
                [error] = await formatPromiseResult( _deleteAppsFromDb( {
                    user,
                    deletedApps: apps.deletedApps
                } ) );
                if( error ) {
                    Y.log( `Error deleting Sols from db: ${error}`, 'error', NAME );
                    return handleResult( error, undefined, callback );
                }
            }

            if( apps.remainingAppsWithToken.length ) {
                [error] = await formatPromiseResult( _updateTokensForApps( {
                    user,
                    appNames: apps.remainingAppsWithToken,
                    appTokens
                } ) );
                if( error ) {
                    Y.log( `Error updating Sols's tokens in db: ${error}`, 'error', NAME );
                    return handleResult( error, undefined, callback );
                }
            }

            return handleResult( undefined, undefined, callback );
        }

        /**
         * Executes the enable command for a given Sol
         * @param {Object} args
         * @param {Object} args.appName
         * @param {Function} args.callback
         * @returns {*}
         * @private
         */
        // eslint-disable-next-line no-unused-vars
        async function _executeEnableCommand( args ) {
            if( args.callback ) {
                args.callback = logEntryAndExit( args, '_executeEnableCommand' );
            } else {
                logExecution( '_executeEnableCommand' );
            }

            const
                {appName, callback} = args,
                commandName = 'enableCommand';
            let error, stdout;

            [error, stdout] = await formatPromiseResult(
                Y.doccirrus.api.appreg._executeSolCommand( {
                    commandName,
                    appName
                } )
            );

            if( error ) {
                logWarn( '_executeEnableCommand', error, `could not enable ${appName}` );
                return handleResult( error, undefined, callback );
            }

            return handleResult( undefined, stdout, callback );
        }

        /**
         * Executes the install command for a given Sol
         * @param {Object} args
         * @param {Object} args.appName
         * @param {Function} args.callback
         * @returns {Promise<Object|*>}
         * @private
         */
        async function _executeInstallCommand( args ) {
            if( args.callback ) {
                args.callback = logEntryAndExit( args, '_executeInstallCommand' );
            } else {
                logExecution( '_executeInstallCommand' );
            }

            const
                {appName, callback, timeout = 30000} = args,
                commandName = 'installCommand';
            let error, stdout;

            [error, stdout] = await formatPromiseResult(
                Y.doccirrus.api.appreg._executeSolCommand( {
                    commandName,
                    appName,
                    timeout
                } )
            );

            if( error ) {
                logWarn( '_executeInstallCommand', error, `could not install ${appName}` );
                return handleResult( error, undefined, callback );
            }

            return handleResult( undefined, stdout, callback );
        }

        /**
         * Executes the restart (re-enable) command for a given Sol
         * @param {Object} args
         * @param {Object} args.appName
         * @param {Function} args.callback
         * @returns {Promise<Object|*>}
         * @private
         */
        async function _executeRestartCommand( args ) {
            if( args.callback ) {
                args.callback = logEntryAndExit( args, '_executeRestartCommand' );
            } else {
                logExecution( '_executeRestartCommand' );
            }

            const
                {appName, callback, timeout = RESTART_COMMAND_TIMEOUT} = args,
                commandName = 'restartCommand';
            let error, stdout;

            [error, stdout] = await formatPromiseResult(
                Y.doccirrus.api.appreg._executeSolCommand( {
                    commandName,
                    appName,
                    timeout
                } )
            );

            if( error ) {
                logWarn( '_executeRestartCommand', error, `could not restart Sol ${appName}` );
                return handleResult( error, undefined, callback );
            }

            return handleResult( undefined, stdout, callback );
        }

        /**
         * Executes the remove command, which is for uninstalling the Sol
         *
         * @param {Object} args
         * @param {String} args.appName
         * @param {function} args.callback
         * @param {Number} args.timeout
         *
         * @returns {*}
         * @private
         */
        async function _executeRemoveCommand( args ) {
            if( args.callback ) {
                args.callback = logEntryAndExit( args, '_executeRemoveCommand' );
            } else {
                logExecution( '_executeRemoveCommand' );
            }

            const
                {appName, callback, timeout = 30000} = args,
                commandName = 'removeCommand';
            let error, stdout;

            [error, stdout] = await formatPromiseResult(
                Y.doccirrus.api.appreg._executeSolCommand( {
                    commandName,
                    appName,
                    timeout
                } )
            );

            if( error ) {
                logWarn( '_executeRemoveCommand', error, `could not remove ${appName}` );
                return handleResult( error, undefined, callback );
            }

            return handleResult( undefined, stdout, callback );
        }

        /**
         * Executes the disable command, which is for disabling the Sol only
         *
         * @param {Object} args
         * @param {String} args.appName
         * @param {function} [args.callback]
         * @param {Number} [args.timeout]
         *
         * @returns {*}
         * @private
         */
        async function _executeDisableCommand( args ) {
            if( args.callback ) {
                args.callback = logEntryAndExit( args, '_executeDisableCommand' );
            } else {
                logExecution( '_executeDisableCommand' );
            }

            const
                {appName, callback, timeout = 30000} = args,
                commandName = 'disableCommand';
            let error, stdout;

            [error, stdout] = await formatPromiseResult(
                Y.doccirrus.api.appreg._executeSolCommand( {
                    commandName,
                    appName,
                    timeout
                } )
            );

            if( error ) {
                logWarn( '_executeDisableCommand', error, `could not disable ${appName}` );
                return handleResult( error, undefined, callback );
            }

            return handleResult( undefined, stdout, callback );
        }

        /**
         * Returns an array of Sol names (string) that should be uninstalled
         * @param {Object} args
         * @param {Object} args.user
         * @param {Function} args.callback
         * @returns {Promise<[]|*>}
         * @private
         * @for removeUnlicensedApps
         */
        async function _getListOfAppsToRemove( args ) {
            const {user, callback} = args;
            let
                error, appRegs, appRegNames, solsList, installedSolsNames, appsToRemove = [];

            // receive AppsData from db
            [error, appRegs] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'appreg',
                action: 'get',
                query: {}
            } ) );

            if( error ) {
                logError( '_getListOfAppsToRemove', error, 'could not get appRegs from db' );
                return handleResult( error, undefined, callback );
            }

            appRegNames = appRegs.map( item => item.appName );

            // receive list of installed sols
            [error, solsList] = await formatPromiseResult( Y.doccirrus.api.appreg.getSolsListData() );

            if( error ) {
                logWarn( '_getListOfAppsToRemove', error, 'could not get Sols list' );
                return handleResult( error, undefined, callback );
            }

            installedSolsNames = solsList.map( solItem => solItem.name );

            installedSolsNames.forEach( appName => {
                if( !appRegNames.includes( appName ) ) {
                    appsToRemove.push( appName );
                }
            } );

            return handleResult( undefined, appsToRemove, callback );
        }

        /**
         * Uninstalls the apps that do not have an appreg entry and are currently installed
         * @param {Object} args
         * @param {Object} args.user
         * @param {Function} [args.callback]
         * @returns {Promise<*>}
         */
        async function removeUnlicensedApps( args ) {
            Y.log( `Executing Y.doccirrus.api.appreg.removeUnlicensedApps`, 'info', NAME );

            const {user, callback} = args;
            let error, appsToRemove, appName;

            [error, appsToRemove] = await formatPromiseResult(
                _getListOfAppsToRemove( {user} )
            );

            if( error ) {
                logWarn( 'removeUnlicensedApps', error, 'failed to get list of which apps to remove' );
                return handleResult( error, undefined, callback );
            }

            if( !appsToRemove.length ) {
                return handleResult( undefined, undefined, callback );
            }

            logInfo( 'removeUnlicensedApps', `list of sols to remove: ${appsToRemove.join( ", " )}` );

            for( appName of appsToRemove ) {
                [error] = await formatPromiseResult(
                    _executeRemoveCommand( {appName} )
                );

                if( error ) {
                    logWarn( 'removeUnlicensedApps', error, `Could not execute remove command for sol ${appName}` );
                }
            }

            return handleResult( undefined, undefined, callback );
        }

        /**
         * @typedef {Object} ActivateAppRetObj -  user configured value option for a particular dicom tag
         *   @property {number} appCurrentPort - Ex: 58222
         *   @property {string} appName - Ex. "sample-vue"
         *   @property {string} appToken - Ex. "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.IjhFN..."
         *   @property {string} configFileName - If dev env. then "config" else ex. "sample-vue"
         *   @property {string} dbPassword - Ex. "qXLA2ftmWcgCeiIbcbVVcqNdZbGcfQ3HlFvnN914X4yGG2yRZVjbuH62eQmxdN30"
         *   @property {string} dbUser - Ex. "sample-vue"
         *   @property {boolean} newAppCurrentPort - true if computed. false if already present
         *   @property {boolean} newDbPassword - true
         *   @property {Array.<{type: String, targetUrl: String}>} uiConfiguration - ex. [{type: "MAIN_PAGE", targetUrl: "/sol/sol-name"}]
         */

        /**
         * 1. Checks that the app is registered and has a rights
         * 2. Checks db user for the app, if does not exist - creates it
         * 3. Writes app port to app reg entry (dynamically generated)
         * 4. Enables app (dc-cli).
         * 5. Returns the Sol config string
         * @param {Object} appReg
         *    @param {String} appReg.appName
         *    @param {number} [appReg.appCurrentPort]
         *    @param {String} [appReg.dbPassword]
         *    @param {Array.<{type: string, targetUrl: string}>} [appReg.uiConfiguration]
         *    @param {function(Error, ActivateAppRetObj):void} callback
         *    @param {Object} appReg.user to pass on to _enableApp
         *    @param {Boolean} appReg.appIsRemote true if the Sol app is running outside of the datensafe (i.e. while being developed)
         *    @param {String} appReg.appHostType either 'LOCAL' (Sol running in datensafe) or 'REMOTE' (Sol running remotely)
         * @return {undefined}
         */
        function activateApp( appReg, callback ) {
            if( callback ) {
                callback = logEntryAndExit( {callback}, 'activateApp' );
            } else {
                logExecution( 'activateApp' );
            }
            const
                { appName, appCurrentPort, dbPassword, uiConfiguration, routeOverrideConfiguration, user, appIsRemote, appHostType, storeVersion } = appReg,
                async = require( 'async' ),
                DB = require( 'dc-core' ).db,
                configFileName = getConfigFileName( { appName } );

            if( 'admin' === appName ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Bad name' } ) );
            }
            // central audit point
            Y.doccirrus.api.audit.postBasicEntry( Y.doccirrus.auth.getSUForLocal(), 'check', 'sol', `Start: ${appName}` );

            Y.log( `activateApp: Starting ${appName} application`, 'debug', NAME );
            async.waterfall( [
                function( next ) {
                    const data = {
                        appName,
                        configFileName,
                        appCurrentPort,
                        dbPassword,
                        uiConfiguration,
                        routeOverrideConfiguration
                    };

                    next( null, data );
                },
                function( data, next ) {
                    Y.doccirrus.api.appreg.getSecretForApp( {
                        appName,
                        user
                    }, ( err, tokens ) => {
                        if( err ) {
                            return next( err );
                        }
                        data.inSuiteToken = tokens.inSuiteToken;
                        data.solToken = tokens.solToken;
                        next( null, data );
                    } );
                },
                function( data, next ) {
                    /**
                     * checks db user for this app
                     */
                    DB.getDbUser( {
                        userName: appName,
                        dbName: appUtils.getAppDbName( appName )
                    }, ( err, results = [] ) => {
                        if( err ) {
                            return next( err );
                        }
                        data.dbUser = results[ 0 ] && results[ 0 ].user;
                        next( null, data );
                    } );
                },
                function( data, next ) {
                    if( !data.dbUser ) {
                        return setImmediate( next, null, data );
                    }
                    DB.removeDbUser( {
                        dbName: appUtils.getAppDbName( appName ),
                        userName: appName
                    }, ( err ) => next( err, data ) );
                },
                function( data, next ) {
                    let
                        dbPassword;
                    /**
                     * creates db user for this app
                     */
                    dbPassword = Y.doccirrus.comctl.getRandomString( 64, '#aA' );
                    DB.createDbUser( {
                        dbName: appUtils.getAppDbName( appName ),
                        userName: appName,
                        password: dbPassword
                    }, ( err, results = [] ) => {
                        if( err ) {
                            if( 11000 === err.code ) {
                                return next( null, data );
                            }
                            return next( err );
                        }
                        data.dbUser = results[ 0 ] && results[ 0 ].user;
                        data.newDbPassword = true;
                        data.dbPassword = dbPassword;
                        next( null, data );
                    } );
                },
                function( data, next ) {
                    const
                        { appCurrentPort } = data;

                    if( appCurrentPort && _isPortInConfigRange( appCurrentPort ) ) {
                        return setImmediate( next, null, data );
                    }

                    _getFreePortForApp( ( err, port ) => {
                        data.appCurrentPort = port;
                        data.newAppCurrentPort = true;
                        next( err, data );
                    } );
                },
                function( data, next ) {
                    const
                        { newAppCurrentPort, newDbPassword, appCurrentPort, dbPassword } = data,
                        fields = ['hasAccess'],
                        _data = {hasAccess: true};

                    if( ['LOCAL', 'REMOTE'].includes( appHostType ) ) {
                        _data.appHostType = appHostType;
                        fields.push( 'appHostType' );
                    }

                    if( newDbPassword ) {
                        _data.dbPassword = dbPassword;
                        fields.push( 'dbPassword' );
                    }

                    if( newAppCurrentPort ) {
                        _data.appCurrentPort = appCurrentPort;
                        fields.push( 'appCurrentPort' );
                    }

                    /**
                     * Writes port and db password to app reg
                     */
                    Y.doccirrus.api.appreg.put( {
                        query: {
                            appName
                        },
                        fields,
                        data: _data,
                        callback( err ) {
                            next( err, data );
                        }
                    } );
                },
                function( data, next ) {
                    data.appIsRemote = appIsRemote;

                    _enableApp( data, ( error, configString ) => {
                        if( error ) {
                            return next( error );
                        }
                        return next( null, {data, configString} );
                    } );
                },
                function( result, next ) {
                  tryGetSolVersion( {solName: appName} )
                        .then( ( appVersion ) => {
                            if( !appVersion ) {
                                return next( null, result );
                            }

                            const
                                appRegData = {appVersion},
                                fields = ['appVersion'];

                            if( storeVersion ) {
                                appRegData.versionIsOutdated = (storeVersion !== appVersion);
                                fields.push( 'versionIsOutdated' );
                            }

                            /**
                             * Writes Sol version to appreg
                             */
                            Y.doccirrus.api.appreg.put( {
                                query: {
                                    appName
                                },
                                fields,
                                data: appRegData,
                                callback( err ) {
                                    next( err, result );
                                }
                            } );
                        } )
                        .catch( ( err ) => {
                            logWarn( 'activateApp', err, `error when obtaining Sol version for ${appName}` );
                            /* we continue the flow because getting the Sol version is optional */
                            next( null, result );
                        } );
                }
            ], ( err, result ) => {
                if( err ) {
                    Y.log( `activateApp: Could not start app ${appName}. Error: ${JSON.stringify( err )}`, 'error', NAME );
                } else {
                    Y.log( `activateApp: App ${appName} is started with port - ${result.data.appCurrentPort}`, 'debug', NAME );
                }
                callback( err, result );
            } );
        }

        /**
         * Creates config string
         * @param {Object} params
         *  @param {String} params.appName
         *  @param {String} params.inSuiteToken
         *  @param {String} params.solToken the SOLTOKEN (a.k.a. TTAS)
         *  @param {String} params.appPort
         *  @param {String} [params.insuiteHost='127.0.0.1']
         *  @param {String} [params.insuitePort='80']
         *  @param {String} params.dbPort
         *  @param {String} [params.dbHost='127.0.0.1']
         *  @param {String} [params.dbAuth='admin']
         *  @param {String} params.dbName
         *  @param {String} params.dbUser
         *  @param {String} params.dbPass
         *  @param {String} params.baseUrl
         * @return {String}
         */
        function prepareAppConfig( params ) {
            const
                {appName = "", inSuiteToken = "", solToken = "", appPort = "", dbPort = "", dbHost = "", dbAuth = 'admin', dbName = "", dbUser = "", dbPass = "", baseUrl = "", insuiteHost = "", insuitePort = "", appIsRemote} = params;
            let
                solport2 = '',
                scholzDbMSSQLPw = '';

            switch( appName ) {
                case 'sumex':
                case 'roser':
                    solport2 = '2575';
                    break;
                case 'scholzdb':
                    scholzDbMSSQLPw = `#${Y.doccirrus.comctl.getRandId()}`;
                    solport2 = '1443';
            }

            const configItems = [
                inSuiteToken && `ISTOKEN=${inSuiteToken}`,
                appName && `SOLNAME=${appName}`,
                appPort && `SOLPORT=${appPort}`,
                baseUrl && `SOLURL=${baseUrl}`,
                insuiteHost && `ISHOST=${insuiteHost}`,
                insuitePort && `ISPORT=${insuitePort}`,
                solport2 && `SOLPORT2=${solport2}`,
                solToken && `SOLTOKEN=${solToken}`,
                scholzDbMSSQLPw && `MSSQLPASSWORD=${scholzDbMSSQLPw}`,
                dbHost && `DBHOST=${!appIsRemote && dbHost || ''}`,
                dbPort && `DBPORT=${!appIsRemote && dbPort || ''}`,
                dbAuth && `DBAUTH=${!appIsRemote && dbAuth || ''}`,
                dbName && `DBNAME=${!appIsRemote && dbName || ''}`,
                dbUser && !Y.doccirrus.auth.isDevServer() && `DBUSER=${!appIsRemote && dbUser || ''}`,
                dbPass && !Y.doccirrus.auth.isDevServer() && `DBPASS=${!appIsRemote && dbPass || ''}`
            ];

            return configItems
                    .filter( Boolean )
                    .join( '\n' );
        }

        /**
         * Deletes the Sol config file
         * @param {Object} args
         * @param {Object} args.appName
         * @param {Object} args.configFileName
         * @param {Function} [callback]
         * @returns {Promise<unknown>}
         */
        async function deleteConfigFile( args, callback ) {
            logExecution( 'deleteConfigFile' );

            const {appName, configFileName} = args;

            if( callback ) {
                return writeConfigFile( {
                    appName,
                    configFileName,
                    deleteConfig: true
                }, callback );
            }

            const writeConfigFileProm = promisify( writeConfigFile );

            return writeConfigFileProm( {
                appName,
                configFileName,
                deleteConfig: true
            } );
        }

        /**
         * Prepares config file structure and writes it to the app folder or delete config file
         * @param {Object} params
         * @param {String} params.appCurrentPort
         * @param {String} params.appName
         * @param {String} params.inSuiteToken
         * @param {String} params.solToken the SOLTOKEN (a.k.a. TTAS) for the config file
         * @param {String} params.dbUser
         * @param {String} params.dbPassword
         * @param {String} params.configFileName
         * @param {Boolean} params.deleteConfig - if true delete config file
         * @param {Function} callback
         * @return {Function } callback
         */
        function writeConfigFile( params, callback ) {
            if( callback ) {
                callback = logEntryAndExit( {callback}, 'writeConfigFile' );
            } else {
                logExecution( 'writeConfigFile' );
            }
            const
                { appCurrentPort, appName, inSuiteToken, solToken, dbUser, dbPassword, configFileName, deleteConfig = false, appIsRemote = false } = params,
                baseUrl = _getBaseUrl( { appName } ),
                solsConfig = Y.doccirrus.api.appreg._getSolsConfig( { appName } ),
                configBaseDir = solsConfig.configBaseDir,
                mongoDBHost = solsConfig.mongoDBHost,
                mongoDBPort = solsConfig.mongoDBPort,
                insuiteHost = solsConfig.inSuiteHost,
                insuitePort = solsConfig.inSuitePort,
                configString = prepareAppConfig( {
                    appName,
                    inSuiteToken,
                    solToken,
                    appPort: appCurrentPort,
                    dbPort: mongoDBPort,
                    dbHost: mongoDBHost,
                    dbName: appUtils.getAppDbName( appName ),
                    dbUser,
                    baseUrl,
                    dbPass: dbPassword,
                    insuiteHost,
                    insuitePort,
                    appIsRemote
                } );
            if( !Object.keys( solsConfig ).length ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'sols config is invalid' } ) );
            }
            // if test-license: output configString in UI for user
            if( appIsRemote ) {
                return callback(null, configString);
            } else {
                Y.doccirrus.api.appreg._writeConfigFile( {
                    configBaseDir,
                    configFileName,
                    configString,
                    deleteConfig
                }, callback );
            }
        }

        function _writeConfigFile( params, callback ) {
            const
                { configBaseDir, configFileName, configString, deleteConfig = false } = params;

            if(deleteConfig){
                fs.unlink( path.join( configBaseDir, configFileName ), ( err ) => callback( err ) );
            } else {
                fs.writeFile( path.join( configBaseDir, configFileName ), configString, 'utf8', ( err ) => callback( err, configString ) );
            }
        }

        function _getBaseUrl( params ) {
            const
                { appName } = params;
            return `sol/${appName}`;
        }

        /**
         * Creates the Sol config file and restarts the Sol
         * returns the Sol config string
         *
         * @param  {Object}      params
         * @param  {String}      params.appCurrentPort
         * @param  {String}      params.appName
         * @param  {String}      params.inSuiteToken
         * @param  {String}      params.solToken the SOLTOKEN (a.k.a. TTAS) for the config file
         * @param  {String}      params.dbUser
         * @param  {String}      params.dbPassword
         * @param  {String}      params.configFileName
         * @param  {Boolean}     params.appIsRemote {Boolean} whether the Sol app is running outside of the datensafe (i.e. while being developed)
         * @param  {Function}    callback
         * @private
         */
        async function _enableApp( args, callback ) {
            const
                {appCurrentPort, appName, inSuiteToken, solToken, dbUser, dbPassword, configFileName, appIsRemote = false} = args,
                writeConfigFileProm = promisify( writeConfigFile );
            let error, configString;

            Y.log( `_enableApp: Starting app: ${appName}.`, 'info', NAME );

            /**
             * write Sol config
             */
            [error, configString] = await formatPromiseResult(
                writeConfigFileProm( {
                    appCurrentPort,
                    appName,
                    inSuiteToken,
                    solToken,
                    dbUser,
                    dbPassword,
                    configFileName,
                    appIsRemote
                } )
            );

            if( error ) {
                logWarn( '_enableApp', error, `while writing the config file for ${appName}` );
                return handleResult( error, undefined, callback );
            }

            if( !configString ) {
                logWarn( '_enableApp', 'no configString found' );
                return handleResult( undefined, configString, callback );
            }

            /**
             * Stop here if Sol is remote or in dev server
             */
            if( appIsRemote || Y.doccirrus.auth.isDevServer() ) {
                return handleResult( undefined, configString, callback );
            }

            /**
             * Restart Sol in order to take the new Sol config
             */
            [error] = await formatPromiseResult(
                _executeRestartCommand( {appName} )
            );

            if( error ) {
                logWarn( '_enableApp', error, `while restarting ${appName}` );
                return handleResult( error, undefined, callback );
            }

            return handleResult( undefined, configString, callback );
        }

        /**
         * Executes the sol command with the given appName (Sol name)
         *
         * @param   {Object}  args
         * @returns {Promise<Object|*>}
         * @private
         */
        async function _executeSolCommand( args ) {
            logExecution( '_executeSolCommand' );
            const
                {commandName, appName, callback, timeout} = args,
                exec = require( 'child_process' ).exec,
                execProm = promisify( exec ),
                execOptions = {
                    cwd: process.cwd(),
                    detached: false,
                    shell: true
                },
                solsConfig = Y.doccirrus.api.appreg._getSolsConfig( {appName} );
            let error, result;

            if( !Object.keys( solsConfig ).includes( commandName ) ) {
                return handleResult(
                    new Error( `Sols config is invalid: missing ${commandName}` ),
                    undefined,
                    callback
                );
            }

            const command = `${solsConfig[commandName]} ${appName || ''}`;

            logInfo( '_executeSolCommand', `executing sol command: ${command}`);

            [error, result] = await formatPromiseResultWithTimeout(
                execProm( command, execOptions ),
                timeout
            );

            if( error || !result ) {
                if( error && error.name === "TimeoutError" ) {
                    logWarn(
                        '_executeSolCommand',
                        error,
                        `This is not a command error. Promise timed out after 1 minute while executing command: ${command}. The command is still running in background but unblocking the user who initiated this operation` );
                    return handleResult( undefined, undefined, callback );
                }
                error = error || new Error( 'result is empty' );
                logWarn( '_executeSolCommand', error, `could not execute command: ${command}` );
                return handleResult( error, undefined, callback );
            }

            const {stdout, stderr} = result;

            if( stderr ) {
                error = new Error( stderr );
                logWarn( '_executeSolCommand', error, 'stderr' );
                return handleResult( error, undefined, callback );
            }

            logDebug( '_executeSolCommand', `stdout: ${stdout}` );

            return handleResult( undefined, stdout, callback );
        }

        function cleanup( params ) {
            const
                { fileName, qquuid } = params,
                async = require( 'async' );
            async.series( [
                function( next ) {
                    if( !qquuid || '' === Y.doccirrus.media.cleanFileName( qquuid ) ) {
                        return next( new Y.doccirrus.commonerrors.DCError( 500, { message: 'Missing qquuid of chunked upload' } ) );
                    }
                    Y.doccirrus.media.upload.removeChunkedUploadDir( qquuid, () => next() );
                },
                function( next ) {
                    Y.doccirrus.media.tempRemove( fileName, err => next( err ) );
                }
            ], err => {
                if( err ) {
                    Y.log( `Could not clean tmp folder: ${JSON.stringify( err )}`, 'error', NAME );
                }
            } );
        }

        /**
         * Uploads rpm to tmp folder and executes install command
         *
         * Does license check, triggers actual working function and then returns immediately.
         *
         * NB:  currently usable by DC developers and in Production by externals who
         * do not have access to insuite and cannot change the datasafe.
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Function} args.callback
         *
         * @return {Function} callback
         */
        function uploadRPM( args ) {
            if( args.callback ) {
                args.callback = logEntryAndExit( args, 'uploadRPM' );
            } else {
                logExecution( 'uploadRPM' );
            }
            let
                { user, callback } = args;

            if( !Y.doccirrus.licmgr.hasSupportLevel( user.tenantId, Y.doccirrus.schemas.settings.supportLevels.TEST ) ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Only available with test license' } ) ); // should never happen
            }
            setTimeout( (() => {_uploadRPM( args );}), 0);
            callback( null, { 'success': true } );
        }

        async function _uploadRPM(args) {
            let
                params = args.originalParams,
                partIndex = (params.hasOwnProperty('qqpartindex') ? params.qqpartindex : null),
                files = args.originalfiles || {},
                {user} = args;
            const
                uploadFilename = params.qqfilename;
            let
                err, result, fileName;

            // ----- 1. do chunk upload  or single file upload (because there are multiple result arguments, we have to wrap with Promise... ) ----------
            if (null === partIndex) {
                Y.log('uploadRPM: Performing simple file upload...', 'debug', NAME);
                [err, result] = await formatPromiseResult(new Promise((resolve, reject) => {
                        Y.doccirrus.media.upload.simple(files.qqfile, params, (err, complete, fileName) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve({complete, fileName});
                            }
                        });
                    })
                );
            } else {
                Y.log('uploadRPM: Performing chunked file upload...', 'debug', NAME);
                [err, result] = await formatPromiseResult(new Promise((resolve, reject) => {
                        Y.doccirrus.media.upload.chunked(files.qqfile, params, (err, complete, fileName) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve({complete, fileName});
                            }
                        });
                    })
                );
            }
            if (err) {
                Y.log(`uploadRPM: Error occured during RPM upload stage 1, try again. ${err}`, 'error', NAME);
                Y.doccirrus.communication.emitEventForUser({
                    targetId: user.identityId,
                    nsp: 'default',
                    event: MSG_UPLOAD_FAILED,
                    msg: {
                        data: {
                            filename: uploadFilename
                        }
                    }
                });
                if( result.fileName ) {
                    // cleanup to prevent leaks on disk
                    return cleanup({
                        fileName: uploadFilename,
                        qquuid: params.qquuid
                    });
                }
                return;
            }
            //  (if still waiting on file parts then we can skip this step)
            if (!result.complete) {
                return;
            }

            // ----- 2. on getting the entire file, we can try to install it ----------
            Y.doccirrus.communication.emitEventForUser({
                targetId: user.identityId,
                nsp: 'default',
                event: MSG_UPLOAD_COMPLETE,
                msg: {
                    data: {
                        filename: uploadFilename
                    }
                }
            });
            // get config and error check. If error, short-circuit.
            const
                solsConfig = Y.doccirrus.api.appreg._getSolsConfig();
            if (!Object.keys(solsConfig).length || !solsConfig.installCommand) {
                return Y.doccirrus.communication.emitEventForUser({
                    targetId: user.identityId,
                    nsp: 'default',
                    event: MSG_INSTALL_FAILED,
                    msg: {
                        data: {
                            message: 'Sols config is invalid',
                            filename: uploadFilename
                        }
                    }
                });
            }

            // ----- 3. run the actual install cli function, & collect result ----------
            fileName = result.fileName;
            Y.log(`install app command is executing: ${solsConfig.installCommand} ${fileName}`, 'debug', NAME);
            const
                exec = require('child_process').exec,
                execOptions = {
                    cwd: process.cwd(),
                    detached: false,
                    shell: true
                },
            isDev = ( -1 !== process.argv.indexOf('--dev') );
            let stdout, stderr;

            [err, {stdout, stderr}={}] = await formatPromiseResult(
                                    new Promise((resolve, reject) => {
                                        exec(`${solsConfig.installCommand} ${fileName}`, execOptions, (err, stdOut, stdErr) => {
                                            if( err ) {
                                                reject(err);
                                            } else {
                                                resolve({stdOut, stdErr});
                                            }
                                        });
                                    })
                                  );

            if ( err &&  !isDev ) {
                Y.log(`uploadRPM: Could not install rpm. ${err}`, 'error', NAME);
                Y.doccirrus.communication.emitEventForUser({
                    targetId: user.identityId,
                    nsp: 'default',
                    event: MSG_INSTALL_FAILED,
                    msg: {
                        data: {
                            filename: uploadFilename,
                            err: err && err.toString()
                        }
                    }
                });
            } else {
                Y.log(`uploadRPM: installation command stdout ${stdout}`, 'debug', NAME);
                Y.log(`uploadRPM: installation command stderr ${stderr}`, 'debug', NAME);
                if ( isDev ) {
                    Y.doccirrus.communication.emitEventForUser({
                        targetId: user.identityId,
                        nsp: 'default',
                        event: MSG_INSTALL_DEV,
                        msg: {
                            data: {
                                filename: uploadFilename
                            }
                        }
                    });
                } else {
                    Y.doccirrus.communication.emitEventForUser({
                        targetId: user.identityId,
                        nsp: 'default',
                        event: MSG_INSTALL_COMPLETE,
                        msg: {
                            data: {
                                filename: uploadFilename
                            }
                        }
                    });
                }
            }

            // ----- 4. finally cleanup ----------
            cleanup({
                fileName: fileName,
                qquuid: params.qquuid
            });

        }

        function _getSolsConfig( params = {} ) {
            if( params && params.callback ) {
                params.callback = logEntryAndExit( params, '_getSolsConfig' );
            } else {
                logExecution( '_getSolsConfig' );
            }

            const
                {appName = ''} = params || {};
            if( Y.doccirrus.auth.isDevServer() ) {
                const
                    solsConfig = {},
                    appPath = `../dc-insuite-sol-${appName}/`,
                    dcCore = require( 'dc-core' ),
                    dbConfig = dcCore.config.load( process.cwd() + '/db.json' ) || {};
                solsConfig.workBaseDir = path.resolve( __dirname, '../../../../../dc-sols/' );
                solsConfig.disableCommand = `./src/bash/stop_sol_dev.sh`;
                solsConfig.configBaseDir = path.join( process.cwd(), appPath );
                solsConfig.restartCommand = path.join( process.cwd(), `./src/bash/start_sol_dev.sh ${solsConfig.configBaseDir}` );
                solsConfig.installCommand = path.join( process.cwd(), `./src/bash/mockCommand.sh installCommand ${solsConfig.configBaseDir}` );

                //MOJ-11937
                solsConfig.removeCommand = path.join( process.cwd(), `./src/bash/remove_sol_dev.sh ${solsConfig.configBaseDir}` );
                solsConfig.listUpdatesCommand = path.join( process.cwd(), `./src/bash/list_sol_updates_dev.sh ${path.resolve( __dirname, '../../../../' )}` );
                solsConfig.mongoDBHost = '172.17.0.1';
                solsConfig.mongoDBPort = dbConfig.mongoDb.port;
                solsConfig.inSuiteHost = '172.17.0.1';
                solsConfig.inSuitePort = 80;
                solsConfig.minLocalPort = 4200;
                solsConfig.maxLocalPort = 4399;

                return solsConfig;
            }
            return Y.doccirrus.utils.tryGetConfig( 'sols.json', null ) || {};
        }

        /**
         * Called from dbdb.server.js during startup
         * Only runs on master and if not devServer
         *
         * Checks for activated and installed apps
         * Creates the app configs and restarts the apps
         *
         * @param {Function} callback
         */
        async function runOnStart( callback ) {

            if( callback ) {
                callback = logEntryAndExit( {callback}, 'runOnStart' );
            } else {
                logExecution( 'runOnStart' );
            }

            if( !Y.doccirrus.auth.isPRC() && !Y.doccirrus.auth.isVPRC() ) {
                return callback();
            }

            const
                user = Y.doccirrus.auth.getSUForLocal(),
                DB = require( 'dc-core' ).db,
                getDbUser = promisify( DB.getDbUser );

            let
                params,
                appName,
                appCurrentPort,
                dbUser,
                dbPassword,
                inSuiteToken,
                solToken,
                _id,
                err,
                activatedApps,
                solsListData;

            // Get Active apps
            [err, activatedApps] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'appreg',
                    migrate: true,
                    query: {hasAccess: true}
                } ) );

            if( err || !activatedApps || !Array.isArray( activatedApps ) || !activatedApps.length ) {
                if( err ) {
                    Y.log( `appreg.runOnStart: Error occured while fetching active apps - ${err.stack || err}`, 'warn', NAME );
                } else {
                    Y.log( 'appreg.runOnStart: No active app registrations', 'info', NAME );
                }
                return callback();
            }

            // Get installed apps
            [err, solsListData] = await formatPromiseResult(
                Y.doccirrus.api.appreg.getSolsListData( {} )
            );

            if( err ) {
                Y.log( `appreg.runOnStart: Error while getting list of installed apps: ${err.stack || err}`, 'warn', NAME );
                return callback();
            }

            if( !solsListData || !Array.isArray( solsListData )  || !solsListData.length ) {
                Y.log( 'appreg.runOnStart: No installed apps', 'info', NAME );
                return callback();
            }

            const installedAppsNames = solsListData.map( app => app.name );
            const activatedAndInstalledApps = activatedApps.filter( app => installedAppsNames.includes( app.appName ) );
            const appsNamesToRestart = activatedAndInstalledApps.map( app => app.appName );

            Y.log( `appreg.runOnStart: Restarting active and installed app registrations: ${appsNamesToRestart.join( ', ' )}`, 'info', NAME );

            // Restart all the active and installed apps one by one
            for( {appName, appCurrentPort, dbPassword, inSuiteToken, solToken, _id} of activatedAndInstalledApps ) {

                if( !appCurrentPort ) {
                    Y.log(`appreg.runOnStart: Missing appCurrentPort for appreg.appName: ${appName} and appreg._id: ${_id}. Not restarting this app.`, "error", NAME);
                    continue;
                }

                if( !dbPassword ) {
                    Y.log(`appreg.runOnStart: Missing dbPassword for appreg.appName: ${appName} and appreg._id: ${_id}. Not restarting this app.`, "error", NAME);
                    continue;
                }

                if( !inSuiteToken ) {
                    Y.log(`appreg.runOnStart: Missing dbPassword for appreg.appName: ${appName} and appreg._id: ${_id}. Not restarting this app.`, "error", NAME);
                    continue;
                }

                if( !solToken ) {
                    Y.log(`appreg.runOnStart: Missing dbPassword for appreg.appName: ${appName} and appreg._id: ${_id}. Not restarting this app.`, "error", NAME);
                    continue;
                }

                /**
                 * 1. Init params
                 */
                params = {appName, appCurrentPort, dbPassword, inSuiteToken, solToken};

                //get dbUser
                [err, dbUser] = await formatPromiseResult( getDbUser( {
                    userName: appName,
                    dbName: appUtils.getAppDbName( appName )
                } ) );

                if( err ) {
                    Y.log( `appreg.runOnStart: Error while fetching dbUser for appreg.appName: '${appName}' and appreg._id: ${_id}. Not restarting this app. Error:  ${err.stack || err}. `, 'error', NAME );
                    continue;
                }

                /**
                 * 2. Set dbUser
                 */
                params.dbUser = dbUser && dbUser[0] && dbUser[0].user;

                if( !params.dbUser ) {
                    Y.log( `appreg.runOnStart: No DB user found for appreg.appName: '${appName}' and appreg._id: ${_id}. Not restarting this app.`, 'error', NAME );
                    continue;
                }

                /**
                 * 3. Set configFileName
                 */
                params.configFileName = getConfigFileName( {appName} );

                /**
                 * 4. write config file and execute restart command
                 */
                [err] = await formatPromiseResult(
                    _enableApp( params )
                );

                if( err ) {
                    Y.log( `appreg.runOnStart: Error occurred while restarting appreg.appName: '${appName}' and appreg._id: ${_id}. Error: ${err.stack || err}`, 'error', NAME );
                }
            }

            return callback();
        }

        /**
         * @method PUBLIC
         *
         * This method returns true if sols are supported on current system
         * or returns false if sols are not supported (it will happen for centos 6 systems)
         *
         * @deprecated
         * @returns {boolean}
         */
        function isSolsSupported() {
            if( Y.doccirrus.auth.isDevServer() ) {
                return true;
            } else {
                return Y.doccirrus.api.cli.getDccliSupportedFeatures().sols;
            }
        }

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        /**
         * @class appreg
         * @namespace doccirrus.api
         */
        Y.namespace( 'doccirrus.api' ).appreg = {

            name: NAME,
            getPopulated,
            populateAppAccessManagerTable,
            populateVersionUpdateTable,
            updateAppVersion,
            updateAllAppVersions,
            getOutdatedAppsCount,
            checkForNewAppVersionsInStore,
            get: getEntry,
            callApp,
            put,
            post,
            "delete": deleteEntry,
            saveAppRegDataToCache,
            getAppRegDataFromCache,
            getWebHooksConfigFromCache,
            saveWebHooksConfigToCache,
            getSolDocumentation,
            registerWebHook,
            unRegisterWebHook,
            registerUIMenu,
            unRegisterUIMenu,
            registerRouteOverride,
            deregisterRouteOverride,
            checkApiAccess,
            isSolLicensed,
            giveAccess,
            denyAccess,
            uploadRPM,
            runOnStart,
            _getSolPath,
            getDataFromSolManifest,
            getSolVendor,
            getSolVersionFromFS,
            getSecretForApp,
            getSolsListData,
            setSecretsForApps,
            updateAppRegs,
            removeUnlicensedApps,
            isSolsSupported,
            installApp,
            unInstallApp,
            _getSolsConfig,
            _executeSolCommand,
            _writeConfigFile
        };

    },
    '0.0.1', { requires: [ 'dcauth', 'appreg-schema', 'appUtils', 'dcutils', 'settings-schema', 'cache-utils' ] }
);
