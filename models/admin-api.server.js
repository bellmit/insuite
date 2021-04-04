/*global YUI */

YUI.add(
    'admin-api',
    function( Y, NAME ) {
        const
            { formatPromiseResult, handleResult } = require( 'dc-core' ).utils,
            ObjectId = require( 'mongoose' ).Types.ObjectId,
            moment = require( 'moment' ),
            cluster = require( 'cluster' ),
            {v4: uuidv4} = require( 'node-uuid' );

        class AdminApi {

            /**
             * Initialize the admin API
             *
             * @param {Function} callback
             */
            static async init( callback ) {
                Y.log(
                    `Init admin`,
                    'info',
                    NAME
                );

                Y.doccirrus.i18n = Y.doccirrus.intl.createSynchronization(Y.doccirrus.i18n);

                const [error, result] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: Y.doccirrus.auth.getSUForLocal(),
                        model: 'admin',
                        query: {
                            _id: new ObjectId(
                                Y.doccirrus.schemas.admin.getLanguageId()
                            )
                        },
                        action: 'get'
                    } )
                );

                if ( error ) {
                    Y.log( `Error getting language ${ error.message }`, 'error', this.constructor.name );
                    return callback( error );
                }

                const language = ( ( result || [] ).pop().language || Y.config.lang ).toLowerCase().replace( /-[a-zA-Z]+$/, value => value.toUpperCase() );

                if ( Y.doccirrus.i18n.language === language ) {
                    return callback();
                }

                Y.log( `Set language to ${language}`, 'info', NAME );

                Y.doccirrus.i18n.language = language;

                callback();
            }

            /**
             * Sets up the app license serials token in the admin entry on system startup
             * will only be run on DCPRC systems
             * @param {Object} args
             * @param {Function} [args.callback]
             * @returns {Promise<undefined|error>}
             */
            async setUpAppLicenseSerialsToken( args ) {
                const
                    {callback} = args,
                    user = Y.doccirrus.auth.getSUForLocal(),
                    adminId = Y.doccirrus.schemas.admin.getDCPRCAppLicenseSerialsId();
                let error, count, result;

                [error, count] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'admin',
                        action: 'count',
                        query: {
                            _id: adminId,
                            appLicenseSerialsToken: {$exists: true}
                        }
                    } )
                );

                if( error ) {
                    Y.log( `setUpAppLicenseSerialsToken: error while checking for admin: ${error.stack || error}`, 'error', NAME );
                    return handleResult( error, undefined, callback );
                }

                if( !count ) {
                    [error, result] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'admin',
                            action: 'upsert',
                            migrate: true,
                            query: {
                                _id: adminId
                            },
                            data: {
                                appLicenseSerialsToken: uuidv4(),
                                skipcheck_: true
                            }
                        } )
                    );

                    if( error ) {
                        Y.log( `setUpAppLicenseSerialsToken: error adding new admin: ${error.stack || error}`, 'error', NAME );
                        return handleResult( error, undefined, callback );
                    }

                    Y.log( `setUpAppLicenseSerialsToken: added new adming ${result}`, 'debug', NAME );
                }

                return handleResult( undefined, undefined, callback );
            }

            /**
             * Returns the token to access /3/appLicenseSerials
             * will only be called if user is ADMIN
             * @param {Object} args
             * @param {Object} args.user
             * @param {Function} [args.callback]
             * @returns {Promise<String|undefined>}
             */
            async getAppLicenseSerialToken( args ) {
                Y.log( 'Entering Y.doccirrus.api.admin.getAppLicenseSerialToken', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.admin.getAppLicenseSerialToken' );
                }
                const
                    {callback, user} = args,
                    adminId = Y.doccirrus.schemas.admin.getDCPRCAppLicenseSerialsId();
                let error, admins;

                [error, admins] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'admin',
                        action: 'get',
                        query: {
                            _id: adminId,
                            appLicenseSerialsToken: {$exists: true}
                        }
                    } )
                );

                if( error ) {
                    Y.log( `getAppLicenseSerialToken: error getting admin: ${error.stack || error}`, 'error', NAME );
                    return handleResult( error, undefined, callback );
                }

                if( !admins || !admins[0] || !admins[0].appLicenseSerialsToken ) {
                    Y.log( `getAppLicenseSerialToken: no admin with appLicenseSerialsToken found for ${adminId}`, 'warn', NAME );
                    return handleResult( undefined, undefined, callback );
                }

                return handleResult( undefined, admins[0].appLicenseSerialsToken, callback );
            }

            /**
             * Checks if the db version is up-to-date, if not - saves new version in db
             * calls callback with object: {versionFromDb: String, currentVersion: String, isUpToDate: Boolean}
             *
             * @method checkAndUpdateVersion
             * @param {Object} args
             * @param {Object} args.callback
             * @see isUpToDateVersion
             * @for doccirrus.api.admin
             */
            checkAndUpdateVersion( args ) {
                Y.log(
                    'Entering Y.doccirrus.api.admin.checkAndUpdateVersion',
                    'info',
                    NAME
                );
                if ( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )(
                        Y,
                        NAME
                    ).wrapAndLogExitAsync(
                        args.callback,
                        'Exiting Y.doccirrus.api.admin.checkAndUpdateVersion'
                    );
                }
                this.isUpToDateVersion( {
                    callback: function( err, results ) {
                        var data;
                        if ( err ) {
                            return args.callback( err );
                        }
                        if ( !results[0].areVersionsIdentical ) {
                            data = {
                                currentVersion: results[0].currentVersion
                            };
                            Y.doccirrus.filters.cleanDbObject( data );
                            Y.doccirrus.mongodb.runDb(
                                {
                                    action: 'put',
                                    user: Y.doccirrus.auth.getSUForLocal(),
                                    fields: 'currentVersion',
                                    model: 'admin',
                                    migrate: true,
                                    query: {
                                        _id: Y.doccirrus.schemas.admin.getId()
                                    },
                                    data: data
                                },
                                function( err ) {
                                    if ( err ) {
                                        return args.callback( err );
                                    }
                                    args.callback( err, results[0] );
                                }
                            );
                        } else {
                            return args.callback( err, results[0] );
                        }
                    }
                } );
            }

            /**
             * Checks that current system version(from package.json) is equal the version which is stored in db
             * ignores patch version in the comparison.
             *
             * Calls callback with object: {versionFromDb: String, currentVersion: String, isUpToDate: Boolean}
             *  versionFromDb - version which is stored in DB
             *  currentVersion - version from package.json
             *  isUpToDate - versionFromDb_major.minor === currentVersion_major.minor
             * @method isUpToDateVersion
             * @param {Object} args
             * @param {Function} args.callback
             * @for doccirrus.api.admin
             * */
            isUpToDateVersion( args ) {
                var packageJson = require( process.cwd() + '/package.json' );
                Y.doccirrus.mongodb.runDb(
                    {
                        action: 'get',
                        user: Y.doccirrus.auth.getSUForLocal(),
                        migrate: true,
                        model: 'admin',
                        query: {
                            _id: Y.doccirrus.schemas.admin.getId()
                        },
                        options: {
                            select: {
                                currentVersion: 1
                            }
                        }
                    },
                    function( err, results ) {
                        var result = {
                                versionFromDb: '',
                                currentVersion: packageJson.version,
                                isUpToDate: false
                            },
                            compVersionDb,
                            compVersionCurrent = packageJson.version.substr(
                                0,
                                packageJson.version.lastIndexOf( '.' )
                            );
                        if ( err ) {
                            return args.callback( err );
                        }
                        if ( results && results[0] ) {
                            result.versionFromDb =
                                results[0].currentVersion || '';
                            compVersionDb = result.versionFromDb.substr(
                                0,
                                result.versionFromDb.lastIndexOf( '.' )
                            );
                            result.isUpToDate =
                                compVersionCurrent === compVersionDb;
                            result.areVersionsIdentical =
                                packageJson.version === result.versionFromDb;
                        }
                        args.callback( err, [result] );
                    }
                );
            }

            /**
             * Get public data of this PRC/tenant
             *
             * @param {object} user
             * @param {Function} _callback
             */
            getPRCPublicData( user, _callback ) {
                Y.log( 'entered getPRCPublicData', 'debug', NAME );
                var async = require( 'async' );

                function getKeys( cb ) {
                    Y.doccirrus.auth.getKeyPair( user, function( err, data ) {
                        if ( err ) {
                            if ( 7303 === err.code ) {
                                // key is expired
                                return cb( null, {} );
                            } else {
                                return cb( err );
                            }
                        } else if ( data ) {
                            return cb( err, data );
                        } else {
                            Y.doccirrus.auth.generateKeysOnStartUp( user, cb );
                        }
                    } );
                }

                async.parallel(
                    {
                        pkData: getKeys,
                        practice: function( cb ) {
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'practice',
                                options: { limit: 1 },
                                callback: function( err, result ) {
                                    cb( err, result && result[0] );
                                }
                            } );
                        }
                    },
                    function done( err, data ) {
                        var publicData;
                        if ( err ) {
                            _callback(
                                'error in getting data to register PRC on PUC: ' +
                                    JSON.stringify( err ),
                                'error',
                                NAME
                            );
                        } else {
                            let systemType = Y.doccirrus.auth.getSystemType(),
                                dcCustomerNo =
                                    data.practice && data.practice.dcCustomerNo;
                            if ( !systemType && !dcCustomerNo ) {
                                return _callback(
                                    'error in getting data to register PRC on PUC: not enough data. dcCustomerNo: ' +
                                        JSON.stringify( dcCustomerNo ) +
                                        ', systemType: ' +
                                        JSON.stringify( systemType ),
                                    'error',
                                    NAME
                                );
                            }
                            data.pkData = data.pkData || {};
                            publicData = {
                                publicKey: data.pkData.publicKey,
                                expireDate: data.pkData.expireDate,
                                dcCustomerNo: dcCustomerNo,
                                host: Y.doccirrus.auth.getMyHost(
                                    user.tenantId,
                                    true
                                ),
                                systemType: systemType
                            };
                            _callback( null, publicData );
                        }
                    }
                );
            }

            /**
             * Generate the fp of public key
             *
             * @param {*} args
             * @param {Function} cb
             */
            getFingerPrint( args, cb ) {
                var user = args.user || args,
                    callback = args.callback || cb;

                Y.doccirrus.auth.getKeyPair( user, function( err, data ) {
                    var fp;
                    if ( err || !data ) {
                        return callback( err );
                    }

                    fp = Y.doccirrus.authpub.generateHash( data.publicKey );
                    callback( null, {
                        fingerprint: fp,
                        publicKey: data.publicKey,
                        expireDate: data.expireDate
                    } );
                } );
            }

            /**
             * Generate new keys, store them locally, and push the public key to puc
             *
             * @param {*} args
             */
            generateKeys( args ) {
                Y.log(
                    'Entering Y.doccirrus.api.admin.generateKeys',
                    'info',
                    NAME
                );
                if ( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )(
                        Y,
                        NAME
                    ).wrapAndLogExitAsync(
                        args.callback,
                        'Exiting Y.doccirrus.api.admin.generateKeys'
                    );
                }
                var user = args.user,
                    callback = args.callback,
                    fp;
                Y.doccirrus.auth.generateKeys( user, function( err, data ) {
                    if ( err ) {
                        return callback( err );
                    }
                    Y.doccirrus.api.partnerreg.registerOnPUC( user, function(
                        err1
                    ) {
                        if ( err1 ) {
                            return callback(
                                'error in generateKeys: ' +
                                    JSON.stringify( err.message || err ),
                                'error',
                                NAME
                            );
                        }
                        fp = Y.doccirrus.authpub.generateHash(
                            data.publicKey
                        );
                        callback( null, {
                            fingerprint: fp,
                            expireDate: data.expireDate
                        } );
                    } );
                } );
            }

            /**
             * For MOJ-7985, in admins collection, we have added a new document with _id = '000000000000000000000015' which contains details of
             * datasafeBackup cron job details. The document has structure = {cronTimeHoursInDay: [Number], cronJobName: <String>}.
             * cronTimeHoursInDay represents at what hours everyday day user has selected to initiate backup of Datasafe.
             *
             * This API just returns the backup hours user has saved.
             *
             * Errors returned:
             *   if Callback passed then
             *       callback(err) -> for db error
             *       callback('NO_RECORD_FOUND') -> record not found
             *   else return Promise with reject
             *       err -> for db error
             *       NO_RECORD_FOUND -> record not found
             *
             * Successful response:
             *   if callback is present
             *       return: callback( null, {cronTimeHoursInDay:[Number], cronJobName: <String>} )
             *   else
             *       return Promise with resolve value as {cronTimeHoursInDay:[Number], cronJobName: <String>}
             *
             * @param {*} args
             */
            async getConfiguredDatasafeBackupJob( args ) {
                //jshint ignore:line
                Y.log(
                    'Entering Y.doccirrus.api.admin.getConfiguredDatasafeBackupJob',
                    'info',
                    NAME
                );
                if ( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )(
                        Y,
                        NAME
                    ).wrapAndLogExitAsync(
                        args.callback,
                        'Exiting Y.doccirrus.api.admin.getConfiguredDatasafeBackupJob'
                    );
                }
                const { user, callback } = args,
                    datasafeBackupJobId = Y.doccirrus.schemas.admin.getDatasafeBackupJobId();

                let err, result;

                [err, result] = await formatPromiseResult(
                    //jshint ignore:line
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'admin',
                        action: 'get',
                        query: {
                            _id: datasafeBackupJobId
                        }
                    } )
                );

                if ( err ) {
                    Y.log(
                        `getConfiguredDatasafeBackupJob: Error while fetching record from Admins collection for ID: ${datasafeBackupJobId}. Error: ${err.stack ||
                            err}`,
                        'error',
                        NAME
                    );
                    if ( callback ) {
                        return callback( err );
                    }
                    throw err;
                }

                if ( !result || !Array.isArray( result ) || !result.length ) {
                    Y.log(
                        `getConfiguredDatasafeBackupJob: Got 0 records. Expected 1 record in admins collection for ID: ${datasafeBackupJobId}`,
                        'error',
                        NAME
                    );
                    if ( callback ) {
                        return callback( 'NO_RECORD_FOUND' );
                    }
                    throw 'NO_RECORD_FOUND';
                }

                if ( callback ) {
                    return callback( null, result[0] );
                }

                return result[0];
            }

            /**
             * This method is used to set below:
             *
             * {
             *   _id: '000000000000000000000015',
             *   'cronJobName': 'datasafeBackup',
             *   'cronTimeHoursInDay': [Number] // <-- set this value, in this API, as selected by user from UI
             * }
             *
             * @param {object} args
             *   ex:
             *    args= {
             *       user: <Object>,
             *       data: {
             *           selectedBackupHours: <Number>
             *       },
             *       callback: <Function>
             *     }
             *
             * @returns {string} via callback as below:
             *   callback('NOT_MASTER') -> Not a master cluster
             *   callback('MISSING_INPUT') -> selectedBackupHours is not present or is empty array
             *   callback('INVALID_INPUT') -> Values inside 'selectedBackupHours' array is not valid
             *   callback('JOB_NOT_FOUND') -> Job not found in kronnd jobs array
             *   callback('FAILED') -> Job schedule update failed at kronnd level
             *   callback(err) -> DB error while updating cronTimeHoursInDay
             *
             *   callback( null, 'SUCCESSFUL' ) -> SUCCESSFULLY updated kronnd job schedule and DB entry
             */
            async setDatasafeBackupTime( args ) {
                //jshint ignore:line
                Y.log(
                    'Entering Y.doccirrus.api.admin.setDatasafeBackupTime',
                    'info',
                    NAME
                );
                if ( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )(
                        Y,
                        NAME
                    ).wrapAndLogExitAsync(
                        args.callback,
                        'Exiting Y.doccirrus.api.admin.setDatasafeBackupTime'
                    );
                }

                const {
                        user,
                        callback,
                        data: { selectedBackupHours }
                    } = args,
                    {
                        _id: datasafeBackupJobId,
                        cronJobName
                    } = Y.doccirrus.schemas.admin.getDatasafeDefaultBackupJobDetails();

                let err, result, adminModel;

                // ------------------------ 1. Validate input -----------------------------------------------------------
                if (
                    !Y.doccirrus.auth.isAdminUser( user ) ||
                    user.tenantId !== Y.doccirrus.auth.getLocalTenantId() ||
                    !Y.doccirrus.api.cli.getDccliSupportedFeatures().backup
                ) {
                    return callback( Y.doccirrus.errors.rest( 401 ) );
                }

                if ( !cluster.isMaster ) {
                    return callback( 'NOT_MASTER' );
                }

                if (
                    !selectedBackupHours ||
                    !Array.isArray( selectedBackupHours ) ||
                    !selectedBackupHours.length
                ) {
                    return callback( 'MISSING_INPUT' );
                }

                for ( let hour of selectedBackupHours ) {
                    if (
                        typeof hour !== 'number' ||
                        hour < 0 ||
                        hour > 23 ||
                        hour === 21 ||
                        hour === 22
                    ) {
                        return callback( 'INVALID_INPUT' );
                    }
                }
                // ------------------------ 1. END ----------------------------------------------------------------------

                // ------------------------ 2. Update cronJob schedule for cronJobName ----------------------------------------------
                err = Y.doccirrus.kronnd.changeDailyJobScheduleHours(
                    user,
                    cronJobName,
                    selectedBackupHours
                );

                if ( err === 'NOT_MASTER' ) {
                    return callback( 'NOT_MASTER' );
                } else if ( err === 'JOB_NOT_FOUND' ) {
                    return callback( 'JOB_NOT_FOUND' );
                } else if ( err === 'FAILED' ) {
                    return callback( 'FAILED' );
                }
                // ------------------------ 2. END ----------------------------------------------------------------------

                // ------------------------ 3. Get Admins collection model ----------------------------------------------
                [err, result] = await formatPromiseResult(
                    //jshint ignore:line
                    new Promise( ( resolve, reject ) => {
                        Y.doccirrus.mongodb.getModel(
                            user,
                            'admin',
                            false,
                            ( modelErr, model ) => {
                                if ( modelErr ) {
                                    reject( modelErr );
                                } else {
                                    resolve( model );
                                }
                            }
                        );
                    } )
                );

                if ( err ) {
                    Y.log(
                        `setDatasafeBackupTime: Error getting 'admin' collection model. Error: ${err.stack ||
                            err}`,
                        'error',
                        NAME
                    );
                    return callback( err );
                }

                if ( !result ) {
                    Y.log(
                        `setDatasafeBackupTime: Failed to fetch 'admin' collection model`,
                        'error',
                        NAME
                    );
                    return callback( `Failed to fetch 'admin' collection model` );
                }

                adminModel = result;
                // ------------------------ 3. END ----------------------------------------------------------------------

                // ------------------------ 4. Update cronTimeHoursInDay by selectedBackupHours in DB -------------------
                [err, result] = await formatPromiseResult(
                    //jshint ignore:line
                    adminModel.mongoose.collection.updateOne(
                        { _id: ObjectId( datasafeBackupJobId ) },
                        { $set: { cronTimeHoursInDay: selectedBackupHours } }
                    )
                );

                if ( err ) {
                    Y.log(
                        `setDatasafeBackupTime: Error while saving cronTimeHoursInDay = ${JSON.stringify(
                            selectedBackupHours
                        )} in admins collection for ID: ${datasafeBackupJobId}. Error: ${err.stack ||
                            err}`,
                        'error',
                        NAME
                    );
                    return callback( err );
                }

                if ( !result || !result.result || result.result.n !== 1 ) {
                    Y.log(
                        `setDatasafeBackupTime: Failed to update cronTimeHoursInDay = ${JSON.stringify(
                            selectedBackupHours
                        )} in admins collection for ID: ${datasafeBackupJobId}`,
                        'error',
                        NAME
                    );
                    return callback(
                        `Failed to update cronTimeHoursInDay = ${JSON.stringify(
                            selectedBackupHours
                        )} in admins collection for ID: ${datasafeBackupJobId}`
                    );
                }
                // ---------------------- 4. END ------------------------------------------------------------------------

                return callback( null, 'SUCCESSFUL' );
            }

            /**
             * Get the current language from memory (i18n)
             *
             * @param {*} args
             */
            getLanguage( args ) {
                Y.log(
                    'Entering Y.doccirrus.api.admin.getLanguage',
                    'debug',
                    NAME
                );

                args.callback( null, Y.doccirrus.i18n.language );
            }

            /**
             * Set the current language and notify the other workers
             *
             * @param {*} args
             */
            async setLanguage( args ) {
                Y.log(
                    'Entering Y.doccirrus.api.admin.setLanguage',
                    'debug',
                    NAME
                );

                const { user, originalParams: data = {} } = args;

                if ( args.callback ) {
                    args.callback = require( '../server/utils/logWrapping.js' )(
                        Y,
                        NAME
                    ).wrapAndLogExitAsync(
                        args.callback,
                        'Exiting Y.doccirrus.api.admin.setLanguage',
                        'debug'
                    );
                }

                const language = ( data.set || '' ).toLowerCase().replace( /-[a-zA-Z]+$/, value => value.toUpperCase() );

                if ( !language || Y.doccirrus.i18n.language === language ) {
                    Y.log(
                        `Current is already set to ${Y.doccirrus.i18n.language}`,
                        'debug',
                        NAME
                    );
                    return args.callback( null, Y.doccirrus.i18n.language );
                }

                const [error] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'admin',
                        query: {
                            _id: new ObjectId(
                                Y.doccirrus.schemas.admin.getLanguageId()
                            )
                        },
                        fields: 'language',
                        data: Y.doccirrus.filters.cleanDbObject( {
                            language
                        } ),
                        action: 'put'
                    } )
                );

                if ( error ) {
                    Y.log(
                        `Setting language failed with ${error.message}`,
                        'error',
                        NAME
                    );
                    return args.callback( error );
                }

                Y.doccirrus.i18n.language = language;

                // set moment to use specific lang on backend
                moment.locale( language && 'function' === typeof language.toLowerCase && language.toLowerCase() || 'de' );

                Y.doccirrus.communication.emitEventForAll( {
                    event: 'languageChange',
                    msg: {
                        data: {
                            language: language && 'function' === typeof language.toLowerCase && language.toLowerCase() || 'de'
                        }
                    },
                    global: 'true'
                } );

                return args.callback( null, Y.doccirrus.i18n.language );
            }
        }

        Y.namespace( 'doccirrus.api' ).admin = new AdminApi();
    },
    '0.0.1',
    {
        requires: [
            'dcauth',
            'admin-schema',
            'dcutils',
            'dcipc',
            'doccirrus',
            'admin-process',
            'i18n-synchronization-factory'
        ]
    }
);
