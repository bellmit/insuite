/**
 * User: rrrw
 * Date: 14/12/2017  11:38
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */

YUI.add( 'import-api', function( Y, NAME ) {
        

        const
            async = require( 'async' ),
            fs = require( 'fs' ),
            childProcess = require( 'child_process' ),
            cluster = require( 'cluster' ),
            { formatPromiseResult } = require( 'dc-core' ).utils,
            {promisify} = require( 'util' ),
            exec = promisify( childProcess.exec ),
            DCError = Y.doccirrus.commonerrors.DCError,
            isDevServer = Y.doccirrus.auth.isDevServer(),
            importDir = Y.doccirrus.auth.getImportDir(),
            smbRootIn = Y.doccirrus.auth.getDirectories( 'smbRootIn' ),
            dataImportAppName = Y.doccirrus.schemas.apptoken.builtinAppNames.DATAIMPORT,
            dbAppName = Y.doccirrus.appUtils.getAppDbName( dataImportAppName ),
            dataImportDir = `${importDir}/${dbAppName}`,
            bdtFileDirPath = `/bdtFile`,
            EMITDATAIMPORTEVENT = 'emitWebHookEvent',
            collectionObj = {
                employeeLocationArr: [
                    {model: "employee", bsonFileName: "employees"},
                    {model: "location", bsonFileName: "locations"},
                    {model: "identity", bsonFileName: "identities"}
                ],
                calendarScheduleArr: [
                    {model: "calendar", bsonFileName: "calendars"},
                    {model: "schedule", bsonFileName: "schedules"}
                ],
                otherActArr: [
                    {model: "activity", bsonFileName: "activities"},
                    {model: "patient", bsonFileName: "patients"},
                    {model: "patientversion", bsonFileName: "patientversions"},
                    {model: "basecontact", bsonFileName: "basecontacts"},
                    {model: "scheduletype", bsonFileName: "scheduletypes"},
                    {model: "casefolder", bsonFileName: "casefolders"}
                ]
            };

        const createThenableSpawn = () => {
            const spawn = ( { command, args = [], options = {}, callback } = {} ) => {
                let stdout = '';
                let stderr = '';
                const cmd = childProcess.spawn( command, args, options );
                cmd.stdout.on( 'data', data => {
                    stdout += data;
                } );
                cmd.stderr.on( 'data', data => {
                    stderr += data;
                } );
                return new Promise( ( resolve, reject ) => {
                    cmd.on( 'exit', ( code, signal ) => {
                        if ( code ) {
                            cmd.emit( 'error', { code, signal, command, stderr } );
                        } else {
                            stdout = stdout.replace( /(\r\n|\n|\r)$/, '' );
                            if ( callback ) {
                                return callback( null, stdout );
                            }
                            resolve( stdout );
                        }
                    } );
                    cmd.on( 'error', error => {
                        if ( callback ) {
                            return callback( error, null );
                        }
                        reject( error );
                    } );
                } );
            };
            return {
                spawn
            };
        };

        const {
            spawn
        } = createThenableSpawn();

        const getMongodumpCommand = () => {
            let command;
            if ( isDevServer ) {
                command = 'command -v mongodump';
            } else {
                return Promise.resolve( 'mongodump' );
            }
            return new Promise( ( resolve, reject ) => {
                spawn( {
                    command,
                    options: {
                        shell: true
                    }
                } ).
                then( resolve ).
                catch( reject );
            });
        };

        const runMongodump = ( { db, collection, query = {}, out, dbArgs = [] } = {} ) => {
            if ( db ) {
                dbArgs.push( '--db', `${db}` );
            }
            if ( collection ) {
                dbArgs.push( '--collection', `${collection}` );
            }
            if ( Object.keys( query ).length ) {
                dbArgs.push( '--query', `'${JSON.stringify( query )}'` );
            }
            if ( out ) {
                dbArgs.push( '--out', `${out}` );
            }
            return new Promise( ( resolve, reject ) => {
                getMongodumpCommand().
                then( mongodump => {
                    return new Promise( ( resolve, reject ) => {
                        spawn( {
                            command: `${mongodump} ${dbArgs.join( ' ' )}`,
                            options: {
                                shell: true
                            }
                        } ).then( resolve ).catch( reject );
                    } );
                } ).then( resolve ).catch( reject );
            } );
        };

        // Added for sol dataimport
        function callEmitWebHookEvent( params ) {
            Y.doccirrus.communication.emitWebHookEvent( {
                payload: params.msg,
                roomData: {
                    hook: 'dataImport',
                    action: params.eventAction,
                    query: {}
                },
                action: params.eventAction
            } );
        }

        if( cluster.isMaster ) {
            Y.doccirrus.ipc.subscribeNamed( EMITDATAIMPORTEVENT, NAME, true, callEmitWebHookEvent );
        }

        function eventEmitter( params ) {
            if( Y.doccirrus.ipc.isMaster() ) {
                callEmitWebHookEvent( params );
            } else {
                Y.doccirrus.ipc.send( EMITDATAIMPORTEVENT, params, true, true );
            }
        }

        function queryDb( user, model, action, query, options, callback ) {
            Y.log( `queryDb: Loading records from ${model}, Params - User: ${user.U}, action: ${action}, query: ${JSON.stringify(query)}, options: ${JSON.stringify(options)}`, 'info', NAME );

            return Y.doccirrus.mongodb.runDb( {
                user,
                model,
                action,
                query,
                options,
                useCache: false,
                callback
            } );
        }

        function handleErrorMsg( user, msg, eventAction ) {
            Y.doccirrus.schemas.sysnum.releaseDataImportCombineLock( user, () => {} );
            Y.log( msg, 'error', NAME );
            eventEmitter( {eventAction, msg} );
        }

        function checkAndGetLockForProcess( functionToCall, params, args ) {

            if( Y.doccirrus.schemas.apptoken.builtinAppNames.DATAIMPORT !== args.user.U || !args.user.superuser ) {
                return args.callback( new DCError( 401 ) );
            }

            Y.doccirrus.schemas.sysnum.getDataImportCombineLock( args.user, function( err, lock ) {
                if( err ) {
                    Y.log( `checkAndGetLockForProcess: Could not get lock for ${args.action}: ${JSON.stringify( err )}`, 'error', NAME );
                    return args.callback( err );
                } else if( !lock ) {
                    Y.log( `checkAndGetLockForProcess: process is locked`, 'warn', NAME );
                    return args.callback( new DCError( 500, {message: `Process is busy. Try after sometime`} ) );
                } else {
                    Y.log( `checkAndGetLockForProcess: Process for ${args.action} has been successfully locked`, 'info', NAME );
                    functionToCall( ...params );
                    return args.callback();
                }
            } );
        }

        /**
         * @method PUBLIC
         *
         * This method gets the sol config
         *
         * @returns {Promise<any>} If successful then resolves to solConfig or rejects with error
         */
        async function getAppConfig( user, appName ) {

            let
                config = {},
                solsConfig,
                err,
                results,
                query,
                fields;

            try {
                solsConfig = Y.doccirrus.api.appreg._getSolsConfig( {appName} );

                if( solsConfig && Object.keys( solsConfig ).length ) {

                    config.dbName = dbAppName;
                    config.dbUser = appName;
                    config.dbHost = solsConfig.mongoDBHost;
                    config.dbPort = solsConfig.mongoDBPort;
                    config.workBaseDir = solsConfig.workBaseDir;

                } else {
                    Y.log( `Error occurred : sols.json not found`, 'error', NAME );
                    throw new Error( 'sols.json not found' );
                }
            } catch( error ) {
                Y.log( `Error occurred while fetching sols config: ${JSON.stringify( error )}`, 'error', NAME );
                throw error;
            }

            query = {appName, hasAccess: true};
            fields = {select: {limit: 1, appCurrentPort: 1, dbPassword: 1}};

            [err, results] = await formatPromiseResult( queryDb( user, 'appreg', 'get', query, fields ) );

            if( err ) {
                Y.log( `Error occurred when querying appreg : ${JSON.stringify( err )} `, 'error', NAME );
                throw err;
            }

            if( !results.length ) {
                Y.log( `Error occurred : ${appName} - App not found`, 'error', NAME );
                throw new Error( `${appName} App is not found` );
            }

            config.appCurrentPort = results[0].appCurrentPort;
            config.dbPassword = results[0].dbPassword;

            return config;
        }

        async function getSolsConfig( user, dataImportAppName, msg, eventAction ) {
            let
                err,
                solsConfig;

            [ err, solsConfig ] = await formatPromiseResult( getAppConfig( user, dataImportAppName ) );

            if( err || !solsConfig || !Object.keys( solsConfig ).length ) {

                if( !solsConfig || !Object.keys( solsConfig ).length ) {
                    err = `Sol config for ${dataImportAppName} is empty, please check.`;
                }

                Y.log( `Error occurred when fetching sols config : ${JSON.stringify( err )} `, 'error', NAME );
                return handleErrorMsg( user, msg, eventAction, err );
            }

            return solsConfig;
        }

        function dumpRestoreAndDelete( collectionDetailsArr, args, isClear ) {
            const
                {callback, user} = args,
                tenantId = user.tenantId;
            let
                collectionList = [],
                messageList = '',
                eventAction = isClear ? 'delete' : 'import',
                arr = collectionDetailsArr.map( ( {bsonFileName} ) => bsonFileName );

            if( !isClear && !fs.existsSync( dataImportDir ) ) {

                eventEmitter( {eventAction, msg: {msg: new DCError( '26500' )}} );

                Y.doccirrus.schemas.sysnum.releaseDataImportCombineLock( args.user, () => {} );
                return callback( new DCError( '26500' ) );
            }
            /*
             * 1] checkIfRecordsExistsInCollection
             * 2] checkAndDumpCollection
             * 3] checkAndRestoreCollection
             * 4] checkAndDeleteCollection (only if isClear flag is true)
             * */
            let iterator = function( collectionDetailsObj, done ) {
                async.waterfall( [

                    function checkIfRecordsExistsInCollection( waterfallCb ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: collectionDetailsObj.model,
                            action: 'get',
                            query: {},
                            options: {lean: true, limit: 1},
                            callback: function( err, result ) {
                                if( err ) {
                                    Y.log( `Error querying ${collectionDetailsObj.model} collection. error: ${JSON.stringify( err )}`, 'error', NAME );
                                    return waterfallCb( err );
                                } else if( result && result.length ) {
                                    //If records exists then first dump those
                                    waterfallCb( null, true );
                                } else {
                                    //No need to dump
                                    waterfallCb( null, false );
                                }
                            }
                        } );
                    },

                    function checkAndDumpCollection( shouldDump, waterfallCb ) {
                        if( shouldDump ) {
                            Y.doccirrus.mongoutils.dump( collectionDetailsObj.bsonFileName, tenantId, function( err ) {
                                if( err ) {
                                    Y.log( `dumpRestoreAndDelete: Error while dumping collection ${collectionDetailsObj.model}. Stopping..Error: ${err}`, 'error', NAME );
                                    return waterfallCb( err );
                                } else {
                                    Y.log( `dumpRestoreAndDelete: Successfully dumped collection ${collectionDetailsObj.model}`, 'info', NAME );
                                    waterfallCb();
                                }
                            } );
                        } else {
                            Y.log( `dumpRestoreAndDelete: No records found for collection ${collectionDetailsObj.model}. Nothing to dump... `, 'info', NAME );
                            waterfallCb();
                        }
                    },

                    function checkAndRestoreCollection( waterfallCb ) {

                        if( !isClear && fs.existsSync( dataImportDir + `/${collectionDetailsObj.bsonFileName}.bson` ) ) {

                            // Deletes all records of employees and identities except user before restore
                            if( collectionDetailsObj.model === 'employee' || collectionDetailsObj.model === 'identity' ) {

                                Y.doccirrus.mongodb.runDb( {
                                    user: user,
                                    model: collectionDetailsObj.model,
                                    action: 'delete',
                                    query: {username: {$ne: Y.doccirrus.schemas.identity.getSupportIdentityObj().username}},
                                    options: {lean: true, override: true},
                                    callback: function( err, result ) {
                                        if( err ) {
                                            Y.log( `dumpRestoreAndDelete: Could not delete ${collectionDetailsObj.bsonFileName}. error: ${JSON.stringify( err )}`, 'error', NAME );
                                            return waterfallCb( err );
                                        } else {
                                            Y.log( `dumpRestoreAndDelete: No of ${collectionDetailsObj.bsonFileName} deleted - ${Object.keys( result ).length}`, 'info', NAME );

                                            Y.doccirrus.mongoutils.restore( collectionDetailsObj.bsonFileName, tenantId, null, dataImportDir + `/${collectionDetailsObj.bsonFileName}.bson`, waterfallCb, true, true );
                                        }
                                    }
                                } );

                            } else {
                                //drops & restores the dump
                                Y.doccirrus.mongoutils.restore( collectionDetailsObj.bsonFileName, tenantId, null, dataImportDir + `/${collectionDetailsObj.bsonFileName}.bson`, waterfallCb, false, true );
                            }
                        } else if( isClear ) {
                            Y.log( `dumpRestoreAndDelete: isClear flag is ${isClear} so proceed to clear ${collectionDetailsObj.bsonFileName} collection...`, 'info', NAME );
                            waterfallCb();
                        } else {
                            collectionList.push( collectionDetailsObj.bsonFileName );
                            Y.log( `dumpRestoreAndDelete: Bson file for ${collectionDetailsObj.bsonFileName} does not exist. Nothing to restore...`, 'info', NAME );
                            waterfallCb();
                        }
                    },

                    function checkAndDeleteCollection( waterfallCb ) {
                        if( isClear ) {
                            let query = {};

                            if( collectionDetailsObj.model === 'employee' || collectionDetailsObj.model === 'identity' ) {
                                query = {username: {$ne: Y.doccirrus.schemas.identity.getSupportIdentityObj().username}};
                            }

                            async.waterfall( [
                                function getModel( next ) {
                                    Y.doccirrus.mongodb.getModel( user, collectionDetailsObj.model, false, next );
                                },
                                function clearRecords( model, next ) {
                                    model.mongoose.collection.deleteMany( query, {}, next );
                                }
                            ], function finalCb( err ) {
                                if( err ) {
                                    Y.log( `checkAndDeleteCollection: Error clearing all records of collection ${collectionDetailsObj.bsonFileName}. Error: ${err}`, 'error', NAME );
                                    waterfallCb( err );
                                } else {
                                    Y.log( `checkAndDeleteCollection: Successfully removed records from collection: ${collectionDetailsObj.bsonFileName}`, 'info', NAME );
                                    waterfallCb();
                                }
                            } );
                        } else {
                            Y.log( `dumpRestoreAndDelete: isClear flag is  ${isClear}. Nothing to do...`, 'info', NAME );
                            waterfallCb();
                        }
                    }

                ], ( err ) => {
                    if( err ) {
                        Y.log( `dumpRestoreAndDelete: Error in operation for collection ${collectionDetailsObj.bsonFileName}. Error -> ${err}`, 'error', NAME );
                        return done( err );
                    }
                    Y.log( `dumpRestoreAndDelete: Operation successful for collection ${collectionDetailsObj.bsonFileName}`, 'info', NAME );
                    done();
                } );
            };

            /*
             * For each collection
             * 1] Dump
             * 2] Restore
             * 3] Delete
             * */
            async.eachSeries( collectionDetailsArr, iterator, ( err ) => {

                Y.log( `dumpRestoreAndDelete: Releasing the lock`,'info', NAME );
                Y.doccirrus.schemas.sysnum.releaseDataImportCombineLock( args.user, () => {} );

                if( err ) {
                    eventEmitter( {eventAction, msg: {"arr": arr, "msg": `Error: ${JSON.stringify( err )}`}} );
                    Y.log( `dumpRestoreAndDelete: Error in operation. error: ${JSON.stringify( err )}`, 'error', NAME );
                    return callback( err );
                } else {
                    Y.log( `dumpRestoreAndDelete: Operation successful...`, 'info', NAME );
                    if ( collectionList && collectionList.length){
                        messageList = `Warnings:<br/> Bson files for ${collectionList.join( ', ' )} does not exist, hence no records were imported`;
                    }
                    eventEmitter( {eventAction, msg: {"arr": arr, "msg": `Operation successful...<br>${messageList}`}} );
                    return callback( null, messageList );
                }
            } );
        }

        function importEmployeeLocations( args ) {
            Y.log('Entering Y.doccirrus.api.import.importEmployeeLocations', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.import.importEmployeeLocations');
            }
            let functionArgs = [collectionObj.employeeLocationArr, args];
            checkAndGetLockForProcess( dumpRestoreAndDelete, functionArgs, args );
        }

        function importCalendarsAndSchedules( args ) {
            Y.log('Entering Y.doccirrus.api.import.importCalendarsAndSchedules', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.import.importCalendarsAndSchedules');
            }
            let functionArgs = [ collectionObj.calendarScheduleArr, args];
            checkAndGetLockForProcess( dumpRestoreAndDelete, functionArgs, args );
        }

        function importAllOtherCollections( args ) {
            Y.log('Entering Y.doccirrus.api.import.importAllOtherCollections', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.import.importAllOtherCollections');
            }
            let functionArgs = [ collectionObj.otherActArr, args ];
            checkAndGetLockForProcess( dumpRestoreAndDelete, functionArgs, args );
        }

        /**
         *
         * @param   {String}            path
         * @param   {Boolean}           includePath
         * @param   {Array}             excludeList         List of paths that needs to be excluded
         * @returns {error || null}
         */
        function deleteAndCreateDir( path, includePath, excludeList ) {
            try {
                if( fs.existsSync( path ) ) {
                    Y.doccirrus.fileutils.cleanDirSync( path, includePath, excludeList );
                }

                Y.log( `deleteAndCreateDir: Creating directory - ${path} `, 'info', NAME );

                Y.doccirrus.fileutils.mkdirpSync( path );

            } catch( fsError ) {
                Y.log( `deleteAndCreateDir: Error while creating directory: ${JSON.stringify( fsError )}`, 'error', NAME );
                return fsError;
            }
            return null;
        }

        async function restoreAndChangeGroupOwner( path, user, msg, eventAction ) {

            let
                stats,
                solsConfig,
                referencePath,
                err,
                result;

            const
                uid = process.geteuid();

            solsConfig = await getSolsConfig( user, dataImportAppName, msg, eventAction );

            if ( isDevServer ) {
                referencePath = `${solsConfig.workBaseDir}/${dataImportAppName}/work`;
            } else {
                referencePath = `${solsConfig.workBaseDir}/${dataImportAppName}`;
            }

            try {
                stats = fs.statSync( referencePath );
            } catch( error ) {
                Y.log( `restoreAndChangeGroupOwner: Error occurred while getting stats on path : ${referencePath} - ${error}`, 'error', NAME );
            }

            [err, result] = await formatPromiseResult( exec( `restorecon -R ${path}` ) );

            if( err ) {
                Y.log( `restoreAndChangeGroupOwner: Error occurred while executing restorecon command on ${path}- ${err}`, 'error', NAME );
            }

            if( result ) {
                Y.log( `restoreAndChangeGroupOwner: Restorecon command executed - stdout: ${result.stdout}, stderr: ${result.stderr}`, 'info', NAME );
            }

            if( stats && stats.gid && uid ) {

                [err, result] = await formatPromiseResult( exec( `chown -R ${uid}:${stats.gid} ${path}` ) );

                if( err ) {
                    Y.log( `restoreAndChangeGroupOwner: Error occurred while executing chown command - ${err}`, 'error', NAME );
                }

                if( result ) {
                    Y.log( `restoreAndChangeGroupOwner: Group owner for ${path} has been changed - stdout: ${result.stdout}, stderr: ${result.stderr}`, 'info', NAME );
                }
            } else {
                Y.log( `restoreAndChangeGroupOwner: Error occurred while changing group owner for ${path}, as one of the parameters uid:${uid} or gid:${stats.gid} is missing.`, 'error', NAME );
            }
        }

        /*
         * uploads & unzip the .zip file
         */
        function uploadBdtFile( args ) {

            Y.log( 'Entering Y.doccirrus.api.import.uploadBdtFile', 'info', NAME );

            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.import.uploadBdtFile' );
            }

            const
                {callback, httpRequest, user} = args,
                eventAction = 'uploadbdt',
                Busboy = require( 'busboy' ),
                busboy = new Busboy( {headers: args.httpRequest.headers, limits: {files: 1}} ),
                unzipBdtFileCmd = `unzip -q $filename$  -x '*/*' && find . -type f -name '*.bdt' -exec mv '{}' customerDataImport.bdt ';'`;

            let
                err,
                result,
                fileExtension,
                solsConfig,
                pathToUploadFile;

            busboy.on( 'file', async ( fieldname, file, filename, encoding, mimetype ) => {

                fileExtension = filename.split( '.' ).pop();

                // Input file validation
                if( !(/\.zip$/.test( filename )) ) {

                    file.resume();
                    Y.log( `uploadBdtFile: Uploaded file extension is: .${fileExtension} - mimetype: ${mimetype}, instead upload (.zip) zipped file`, 'error', NAME );

                    return callback( new DCError( 26501, { data: {$fileExtension: `.${fileExtension}`, $mimetype: mimetype} } ) );
                }

                solsConfig = await getSolsConfig( user, dataImportAppName, 'uploadBdtFile', eventAction );

                if( isDevServer ) {

                    pathToUploadFile = `${solsConfig.workBaseDir}/${dataImportAppName}/work${bdtFileDirPath}`;

                } else if( solsConfig && Object.keys( solsConfig ).length && solsConfig.workBaseDir ) {

                    pathToUploadFile = `${solsConfig.workBaseDir}/${dataImportAppName}${bdtFileDirPath}`;

                } else {
                    file.resume();
                    Y.log( `uploadBdtFile: sols.json not found, could not find "workBaseDir" path to upload bdt file`, 'error', NAME );
                    return callback( new DCError( 400, {message: 'sols.json not found, could not find "workBaseDir" path to upload bdt file'} ) );
                }

                // Delete & create directory to upload the file
                err = deleteAndCreateDir( pathToUploadFile, false );

                if( err ) {
                    file.resume();
                    Y.log( `uploadBdtFile: Error occurred while creating directory - ${err}`, 'error', NAME );
                    return callback( new DCError( 500, {message: `Error occurred while creating directory - ${err}`} ) );
                }

                Y.log( `uploadBdtFile: Writing in to the directory `, 'info', NAME );

                file
                    .pipe( fs.createWriteStream( `${pathToUploadFile}/${filename}` ) )
                    .on( 'finish', async () => {

                        Y.log( `uploadBdtFile: ${filename} file has been uploaded successfully : ${pathToUploadFile}`, 'info', NAME );

                        // callback is passed immediately after writing the file
                        callback(); //eslint-disable-line callback-return

                        // unzip & rename the file
                        [err, result] = await formatPromiseResult(
                            exec( unzipBdtFileCmd.replace( '$filename$', filename ),
                                {'cwd': pathToUploadFile, 'shell': true} ) );

                        if( err ) {
                            Y.log( `uploadBdtFile: Error occurred while executing unzip command on ${pathToUploadFile}/${filename} - ${err}`, 'error', NAME );
                        }

                        if( result ) {
                            Y.log( `uploadBdtFile: Uploaded file is extracted, continuing to change the permissions - stdout: ${result.stdout}, stderr: ${result.stderr}`, 'info', NAME );
                        }

                        // change group owner & restore context
                        if( !isDevServer ) {
                            restoreAndChangeGroupOwner( pathToUploadFile, user, 'uploadBdtFile', eventAction );
                        }
                    } );
            } );

            busboy.on( 'finish', () => {
                Y.log( 'uploadBdtFile: Busboy finished parsing the form', 'info', NAME );
            } );

            return httpRequest.pipe( busboy );
        }

        async function uploadBriefe( args ) {

            const
                {user} = args,
                fsCopyFileProm = promisify( fs.copyFile ),
                eventAction = 'briefeimport',
                briefeImportPath = `${importDir}/briefe.zip`,
                briefeShellCmd = `jar xf ${briefeImportPath} && rm -rf ${briefeImportPath}`;

            let
                err,
                result,
                briefeFile;

            eventEmitter( {eventAction, msg: `uploadBriefe: InProgress`} );

            // 1. check if the smbRootIn dir & breife.zip file exists
            if( !fs.existsSync( smbRootIn ) ) {
                handleErrorMsg( user, `uploadBriefe: Error - ${smbRootIn} path does not exists`, eventAction );
                return;
            }

            briefeFile = fs.readdirSync( smbRootIn )
                .filter( f => {
                    return /briefe.zip/ig.test( f ) ? f : '';
                } )[0];

            if( !briefeFile ) {
                handleErrorMsg( user, `uploadBriefe: Error - Briefe.zip file is missing, Please upload the file.`, eventAction );
                return;
            }

            // 2. Delete Briefe dir ( if exists ) & create Import directory
            err = deleteAndCreateDir( importDir, false, [dataImportDir] );

            if( err ) {
                handleErrorMsg( user, `uploadBriefe: Error occurred - ${JSON.stringify( err )}`, eventAction );
                return;
            }

            // 3. Copy the file from smbroot to import dir
            [err] = await formatPromiseResult( fsCopyFileProm( `${smbRootIn}/${briefeFile}`, briefeImportPath ) );

            if( err ) {
                handleErrorMsg( user, `uploadBriefe: Error occurred while copying the zipped file: ${JSON.stringify( err )}`, eventAction );
                return;
            }

            Y.log( `uploadBriefe: Proceeding to unzip the file`, 'info', NAME );
            eventEmitter( {eventAction, msg: `uploadBriefe: File has been copied to import directory successfully. <br/>Extracting images - InProgress`} );

            // 4. Unzip the file
            [err, result] = await formatPromiseResult( exec( briefeShellCmd, {'cwd': importDir, shell: true} ) );

            if( err ) {
                handleErrorMsg( user, `Error occurred while extracting data from zipped file: ${JSON.stringify( err )}`, eventAction );
                return;
            }

            Y.log( `uploadBriefe: Process completed successfully - stderr: ${result.stderr} & stdout: ${result.stdout}`, 'info', NAME );
            Y.doccirrus.schemas.sysnum.releaseDataImportCombineLock( args.user, () => {} );
            eventEmitter( {eventAction, msg: `Process completed successfully. <br/>StdErr: ${result.stderr} <br/>StdOut: ${result.stdout}`} );
        }

        function uploadBriefeFile( args ) {

            Y.log( 'Entering Y.doccirrus.api.import.uploadBriefeFile', 'info', NAME );

            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.import.uploadBriefeFile' );
            }

            let
                functionArgs = [args];

            checkAndGetLockForProcess( uploadBriefe, functionArgs, args );
        }

        /*
         * This method is exposed via /REST/2 for Sol
         * @param args
         * @returns {Promise<>}
         */
        async function getSeedDataForFinalDataImport( args ) {
            const {
                user
            } = args;
            const eventAction = 'seeddata';
            const db = Y.doccirrus.auth.getLocalTenantId();
            let err, solsConfig, out;

            solsConfig = await getSolsConfig( user, dataImportAppName, 'getSeedDataForSol', eventAction );

            if ( isDevServer ) {
                out = `${solsConfig.workBaseDir}/${dataImportAppName}/work`;
            } else {
                out = `${solsConfig.workBaseDir}/${dataImportAppName}`;
            }

            eventEmitter( {eventAction, msg: `Extracting Data from insuite db`} );

            let collectionArr = collectionObj.employeeLocationArr;

            for( const {model, bsonFileName} of collectionArr ) {

                let query = {};

                if( model === 'employee' || model === 'identity' ) {
                    query = {username: {$ne: Y.doccirrus.schemas.identity.getSupportIdentityObj().username}};
                }
                [ err ] = await formatPromiseResult( runMongodump( {
                    db,
                    dbArgs: Y.doccirrus.mongoutils.getMongoDbArgs( db ),
                    collection: bsonFileName,
                    query,
                    out
                } ) );

                if( err ) {
                    handleErrorMsg( user, `getSeedDataForFinalDataImport: Error while dumping collection ${bsonFileName} from ${db} db: ${err}`, eventAction );
                    Y.log( `getSeedDataForFinalDataImport: ${JSON.stringify( err )}`, 'error', NAME );
                    return;
                }
            }

            if( !isDevServer ) {
                await formatPromiseResult( restoreAndChangeGroupOwner( `${out}/${db}`, user, 'getSeedDataForSol', eventAction ) );
            }

            eventEmitter( { eventAction, msg: 'seeddata_mongodump_success' } );

            Y.doccirrus.schemas.sysnum.releaseDataImportCombineLock( user, () => {} );
            Y.log( `getSeedDataForSol: Seed Data is dumped successfully`, 'info', NAME );

        }

        function getSeedDataForSol( args ) {

            Y.log( 'Entering Y.doccirrus.api.import.getSeedDataForSol', 'info', NAME );

            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.import.getSeedDataForSol' );
            }

            let
                functionArgs = [args];

            checkAndGetLockForProcess( getSeedDataForFinalDataImport, functionArgs, args );
        }

        async function copyDumpedData( args ) {

            const
                dest = `${dataImportDir}`,
                {user} = args,
                eventAction = 'copydata';

            let
                err,
                src,
                solsConfig;

            solsConfig = await getSolsConfig( user, dataImportAppName, 'copyDumpedDataFromSol', eventAction );

            if ( isDevServer ) {
                src = `${solsConfig.workBaseDir}/${dataImportAppName}/work/${dbAppName}`;
            } else {
                src = `${solsConfig.workBaseDir}/${dataImportAppName}/${dbAppName}`;
            }

            eventEmitter( {eventAction, msg: `Copying Data from sol workbase to import dir`} );

            try {
                // 2. Clean dataImportDir if exists
                if( fs.existsSync( dest ) ) {
                    Y.doccirrus.fileutils.cleanDirSync( dest, false );
                } else {
                    Y.doccirrus.fileutils.mkdirpSync( dest );
                }
                await formatPromiseResult( spawn( {
                    command: `restorecon -R ${src}`,
                    options: {
                        shell: true
                    }
                } ) );
                [ err ] = await formatPromiseResult( spawn( {
                    command: `cp ${src}/*.* ${dest}`,
                    options: {
                        shell: true
                    }
                } ) );
                if ( err ) {
                    throw err;
                }
                // Clean workBaseDir
                Y.doccirrus.fileutils.cleanDirSync( src, true );
            } catch( err ) {
                // Logging the error here rather than sending it sol as it contains user data
                Y.log( `copyDumpedDataFromSol: ${JSON.stringify( err )}`, 'error', NAME );
                return handleErrorMsg( user, `copyDumpedDataFromSol: Error occurred while copying data from ${dataImportAppName}, please check logs`, eventAction );
            }

            eventEmitter( { eventAction, msg: 'datacopy_success' } );

            Y.doccirrus.schemas.sysnum.releaseDataImportCombineLock( args.user, () => {} );
            Y.log( `copyDumpedDataFromSol: Imported Data Dump copied successfully`, 'info', NAME );
        }

        function copyDumpedDataFromSol(  args ) {
            Y.log( 'Entering Y.doccirrus.api.import.copyDumpedDataFromSol', 'info', NAME );

            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.import.copyDumpedDataFromSol' );
            }

            let
                functionArgs = [args];

            checkAndGetLockForProcess( copyDumpedData, functionArgs, args );
        }

        Y.namespace( 'doccirrus.api' ).import = {

            name: NAME,
            getSeedDataForSol,
            copyDumpedDataFromSol,
            importEmployeeLocations,
            importCalendarsAndSchedules,
            importAllOtherCollections,
            uploadBdtFile,
            uploadBriefeFile,
            post: function( args ) {
                Y.log('Entering Y.doccirrus.api.import.post', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.import.post');
                }
                args.callback();
            },
            put: function( args ) {
                Y.log('Entering Y.doccirrus.api.import.put', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.import.put');
                }
                args.callback();
            },
            get: function( args ) {
                Y.log('Entering Y.doccirrus.api.import.get', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.import.get');
                }
                args.callback();
            },
            delete: function( args ) {
                Y.log('Entering Y.doccirrus.api.import.delete', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.import.delete');
                }
                args.callback();
            }

        };
    },
    '0.0.1', {
        requires: [
            'dcerror',
            'dccommunication',
            'dcerrortable',
            'doccirrus',
            'dcauth',
            'dcmongoutils',
            'dcRuleImportExport',
            'dcfileutils',
            'dcmedia-store',
            'dcutils'
        ]
    }
);
