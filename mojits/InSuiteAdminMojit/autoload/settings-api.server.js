/**
 * User: mahmoud
 * Date: 05/11/14  16:36
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


/*global YUI*/


YUI.add( 'settings-api', function( Y, NAME ) {
        const
            {logEnter, logExit} = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME );

        var
            myCache;

        function logoutRemoteUsers( user, callback ) {
            var
                dcUtil = require( process.cwd() + '/middleware/dc-util.js' ),
                dcServerMiddleware = dcUtil.getServerMiddleware(),
                dcLogout = dcServerMiddleware.dclogout,
                doLogout = dcLogout && dcLogout.doLogout,
                async = require( 'async' );
            //read identities
            // read auth entries
            // doLogout for each

            callback = callback || function( err ) {
                if( err ) {
                    Y.log( 'error in logout Remote Users: ' + JSON.stringify( err ), NAME, 'error' );
                }
            };

            function kickThemOut( identity, session ) {
                // front-end logout
                Y.doccirrus.communication.emitEventForSession( {
                    sessionId: session.sessionId,
                    event: 'timeoutWarn',
                    msg: {data: 0}
                } );
                // sever side logout
                identity.tenantId = session.tenantId;
                doLogout( session.sessionId, { user: identity } );
            }

            function checkUser( sessionData, cb ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'identity',
                    query: {_id: sessionData.identityId},
                    callback: function( err, result ) {
                        if( err || !result || !result[0] ) {
                            return cb( err );
                        }
                        result.forEach( function( item ) {
                            if( !Y.doccirrus.auth.hasExternalAccess( item ) ) {
                                kickThemOut( item, sessionData );
                            }
                        } );
                        cb();
                    }
                } );
            }

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'auth',
                query: {},
                callback: function( err, result ) {
                    if( err || !result || !result[0] ) {
                        return callback( err );

                    }
                    async.each( result, function( item, cb ) {
                        // if an external session then logout user
                        if( item.sessionId && item.host ) {
                            Y.doccirrus.auth.isExternalAccess( item.host, function( err, isRemote ) {
                                if( err ) {
                                    Y.log( 'Error during checking external access:' + JSON.stringify( err ), 'error' );
                                }
                                if( !isRemote ) {
                                    return cb();
                                }
                                checkUser( item, cb );
                            } );
                        }
                    }, function( err ) {
                        if( err ) {
                            Y.log( 'error in checking external users: ' + JSON.stringify( err ), 'error', NAME );
                        }
                        callback( err );
                    } );

                }
            } );
        }

        /**
         * @method loadFromDBandPopulateCache
         * @public
         *
         * NOTE: used for manual populating global settings cache from mocha suite
         * reason: mocha user is not part of migration users list
         *
         * @param {Object} dbUser
         * @param {Array} tenants
         * @param {Function} cb
         */
        function loadFromDBandPopulateCache( dbUser, tenants, cb ){
            Y.doccirrus.api.settings.get( {
                migrate: true,
                user: dbUser,
                callback: function( err, result ) {
                    let
                        data = {};
                    if( err || !result || !result[0] ) {
                        Y.log( 'failed to initialize settings cache: ' + err + ', tenant: ' + dbUser.tenantId + ' on ' + Y.doccirrus.ipc.whoAmI(), 'error', NAME );
                        return cb( err );
                    }
                    data[dbUser.tenantId] = result[0];
                    if( !myCache || !myCache.local_settings ) {
                        myCache = Y.doccirrus.cache.getCacheBase( {local_settings: {}} );
                    }
                    myCache.local_settings[dbUser.tenantId] = result[0];
                    tenants.push( dbUser.tenantId );
                    cb();
                }
            } );
        }


        // load settings from DB into a global cache
        function initSettingsCache( callback ) {
            var
                tenants = [],
                migrate = require( 'dc-core' ).migrate;

            if( !Y.doccirrus.ipc.isMaster() ) {
                // worker
                Y.log( 'initSettingsCache done on ' + Y.doccirrus.ipc.whoAmI(), 'debug', NAME );
                myCache = Y.doccirrus.cache.getCacheBase( {local_settings: {}} ); // will pull the data from master
                return callback();
            }

            migrate.eachTenantParallelLimit( (dbUser, cb) => {
                    loadFromDBandPopulateCache(dbUser, tenants, cb);
                },
                1,
                function( err ) {
                    if( err ) {
                        Y.log( 'error in initSettingsCache:' + JSON.stringify( err ) + ' on ' + Y.doccirrus.ipc.whoAmI(), 'error', NAME );
                    } else {
                        Y.log( 'initSettingsCache done for tenants ' + tenants.join( ',' ) + ' on ' + Y.doccirrus.ipc.whoAmI(), 'debug', NAME );
                    }
                    callback( err );
                } );
        }

        /**
         * Get the owner employee of the table configuration preset
         * @param {Object}  args
         */
        function getKotableconfigurationPresetOwner( args ) {
            Y.log('Entering Y.doccirrus.api.settings.getKotableconfigurationPresetOwner', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.settings.getKotableconfigurationPresetOwner');
            }
            var
                user = args.user,
                callback = args.callback;

            Y.doccirrus.api.settings.get( {
                user: user,
                callback: function( error, result ) {
                    var
                        setting = Array.isArray( result ) && result[0];

                    if( error ) {
                        return callback( error, result );
                    }

                    if( !(setting && setting.kotableconfigurationPresetOwnerId) ) {
                        return callback( error, [] );
                    }
                    else {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'identity',
                            action: 'get',
                            query: {
                                username: setting.kotableconfigurationPresetOwnerId
                            },
                            callback: function( error, result ) {

                                if( error || !(result && result.length) ) {
                                    return callback( error, result );
                                }

                                Y.doccirrus.mongodb.runDb( {
                                    user: user,
                                    model: 'employee',
                                    action: 'get',
                                    query: {
                                        _id: result[0].specifiedBy
                                    },
                                    callback: callback
                                } );
                            }
                        } );
                    }

                }
            } );

        }

        /**
         * Get the created time of the table configuration preset
         * @param {Object} args
         */
        function getKotableconfigurationPresetCreated( args ) {
            Y.log('Entering Y.doccirrus.api.settings.getKotableconfigurationPresetCreated', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.settings.getKotableconfigurationPresetCreated');
            }
            var
                user = args.user,
                callback = args.callback;

            Y.doccirrus.api.settings.get( {
                user: user,
                callback: function( error, result ) {
                    var
                        setting = Array.isArray( result ) && result[0];

                    if( error ) {
                        return callback( error, result );
                    }

                    if( !(setting && setting.kotableconfigurationPresetCreated) ) {
                        return callback( error, null );
                    }
                    else {
                        return callback( error, setting.kotableconfigurationPresetCreated );
                    }

                }
            } );

        }

        function getLogFile( args ){
            Y.log( 'Entering Y.doccirrus.api.settings.getLogFile', 'info', NAME );

            if (args.callback) {
                args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.settings.getLogFile' );
            }

            if ( !Y.doccirrus.auth.isPRC() ) {
                return callback();
            }

            const { callback, query } = args,
                { logType } = query,
                logLines = 1000,
                logFile = Y.doccirrus.auth.getLogPath(),
                logFilter = {
                    timing: 'TIMING',
                    error: '[0-9:]\\+ error:',
                    warn: '[0-9:]\\+ warn:'
                },
                exec = require( 'child_process' ).exec,
                fs = require( 'fs' );

            if ( logType in logFilter === false ) {
                Y.log( `Log type ${JSON.stringify( logType )} not supported`, 'error', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Uknown log type.' } ) );
            }

            if ( !logFile || !fs.existsSync( logFile ) ) {
                Y.log( `Log file ${JSON.stringify( logFile )} does not exist`, 'error', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 500, { message: 'Log file not found.' } ) );
            }

            // TODO LAM-735
            exec( `tac ${logFile} | grep -m ${logLines} '${logFilter[logType]}' | tac`, ( error, result ) => {
                if ( error > 1 ) {
                    Y.log( `Can not read log file: ${JSON.stringify( error )}`, 'error', NAME );
                    return callback( new Y.doccirrus.commonerrors.DCError( 500, { message: 'Log file not readable.' } ) );
                }
                return callback( null, result );
            });
        }

        function verifySmtpConfiguration( args ) {
            Y.log('Entering Y.doccirrus.api.settings.verifySmtpConfiguration', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.settings.verifySmtpConfiguration');
            }
            let
                smtpConfig = args.data,
                testInitiator = smtpConfig.testInitiator,
                callback = args.callback,
                emailJob,
                emailPriv;

            delete smtpConfig.testInitiator;

            Y.doccirrus.mongodb.runDb( {
                user: args.user,
                model: 'employee',
                action: 'get',
                query: {
                    _id: args.user.specifiedBy
                }
            }, ( err, employeeArr ) => {
                if( err ) {
                    Y.log(`verifySmtpConfiguration: ${err.stack || err}`, 'error', NAME);
                    return callback( err );
                }
                if( employeeArr && Array.isArray( employeeArr ) && employeeArr.length ) {
                    if( employeeArr[0].communications && employeeArr[0].communications.length ) {
                        employeeArr[0].communications.forEach( ( communication ) => {
                            if( communication.type === "EMAILPRIV" && !emailPriv ) {
                                emailPriv = communication.value;
                            } else if( communication.type === "EMAILJOB" && !emailJob ) {
                                emailJob = communication.value;
                            }
                        } );

                        if( !emailPriv && !emailJob ) {
                            return callback( "No registered email address found" ); //should ideally never come here
                        }
                        Y.doccirrus.email.verifySmtpConfiguration( smtpConfig, emailJob || emailPriv, testInitiator, callback );

                    } else {
                        return callback( "No communications present" ); //Should ideally never come here
                    }
                } else {
                    return callback( "Employee not found" ); //Should ideally never come here
                }
            } );
        }

        function getPatientPortalUrl( args ) {
            Y.log('Entering Y.doccirrus.api.settings.getPatientPortalUrl', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.settings.getPatientPortalUrl');
            }
            const
                { user, callback } = args;
            Y.doccirrus.mongodb.runDb( {
                user,
                model: 'settings',
                action: 'get',
                query: {},
                options: { limit: 1 }
            }, ( err, results ) => {
                if( err ) {
                    return callback( err );
                }
                callback( null, results && results[ 0 ] && { patientPortalUrl: results[ 0 ].patientPortalUrl } || {} );
            } );
        }

        Y.namespace( 'doccirrus.api' ).settings = {

            runOnStart: initSettingsCache,

            /**
             * returns the settings for a tenant
             * this is the synchronous alternative to get
             * @param   {Object}    args
             * @returns {module:settingsSchema.settings} settings
             */
            getSettings: function( args ) {
                /* gets called very often reducing to debug */
                let timer = logEnter( 'Entering Y.doccirrus.api.settings.getSettings', 'debug' );

                var
                    result,
                    user = args && args.user || args;

                if( myCache && myCache.local_settings ) {
                    result = myCache.local_settings[user.tenantId];
                }
                if( args.callback ) {
                    args.callback( null, result ); //  eslint-disable-line callback-return
                }

                logExit( timer );
                return result;
            },

            get: function( args ) {
                Y.log('Entering Y.doccirrus.api.settings.get', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.settings.get');
                }
                var
                    user = args.user,
                    callback = args.callback,
                    useCache = args.useCacheParam;

                Y.doccirrus.mongodb.runDb( {
                    migrate: args.migrate,
                    user: user,
                    model: 'settings',
                    action: 'get',
                    query: {},
                    useCache: useCache,
                    options: {
                        limit: 1,
                        lean: true
                    },
                    callback: function( err, result ) {
                        var
                            settings = result && result[0] || {},
                            defaults = Y.doccirrus.schemas.settings.getDefaultSettings();
                        if( err ) {
                            Y.log( 'error in getting the settings: ' + JSON.stringify( err ), 'error', NAME );
                            callback( err );
                            return;
                        }
                        if (settings.dynamsoft && !settings.dynamsoft.length) {
                            settings.dynamsoft = defaults.dynamsoft;
                        }
                        settings = Y.mix( settings, defaults, false );    // don't overwrite
                        if( settings.timeoutDelay < settings.warnInadvance ) {  // a sanity check
                            settings.warnInadvance = settings.timeoutDelay * 0.5;
                        }
                        callback( null, [settings] );
                    }
                } );
            },

            /**
             * updates DB
             * applies any change that affects current state of system
             * updates the cross-system cache
             * @param {Object}  args
             */
            put: function( args ) {
                Y.log('Entering Y.doccirrus.api.settings.put', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.settings.put');
                }
                var
                    user = args.user,
                    data = args.data,
                    query = args.query,
                    callback = args.callback,
                    fields = args.fields;
                data = Y.doccirrus.filters.cleanDbObject( data );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'settings',
                    action: 'put',
                    query: query,
                    fields: fields,
                    data: data,
                    options: {
                        quiet: true
                    },
                    callback: function( err, result ) {
                        if( err ) {
                            Y.log( 'error in PUT settings: ' + JSON.stringify( err ), 'error', NAME );
                            return callback( err );
                        }
                        myCache.local_settings[user.tenantId] = result.toObject();
                        myCache.local_settings = myCache.local_settings; // a hack to force updating the shared repo
                        if( !data.remoteAccess || 'false' === data.remoteAccess ) {
                            logoutRemoteUsers( user );
                        }
                        Y.doccirrus.schemas.auth.resetTTLIndex( user, function( err1 ) {
                            callback( err1, result );
                        } );
                    }
                } );
            },
            isRemoteAllowed: function( args ) {
                Y.log('Entering Y.doccirrus.api.settings.isRemoteAllowed', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.settings.isRemoteAllowed');
                }
                var
                    callback = args.callback,
                    user = args.user;
                Y.doccirrus.api.settings.get( {
                    user: user,
                    callback: function( err, result ) {
                        var
                            settings = result && result[0];
                        if( err || !settings ) {
                            return callback( err, false ); // error or false as default
                        }
                        callback( null, {remoteAccess: settings.remoteAccess, loginWithTAN: settings.loginWithTAN} );
                    }
                } );
            },
            countOpenTabs: function( args ) {
                Y.log('Entering Y.doccirrus.api.settings.countOpenTabs', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.settings.countOpenTabs');
                }
                var
                    callback = args.callback,
                    user = args.user,
                    req = args.httpRequest;
                Y.doccirrus.communication.countUserSockets( {identityId: user.identityId, sessionID: req.sessionID}, function( count ) {
                    callback( null, {openTabs: count} );
                } );
            },
            dynamsoft: function( args ) {
                Y.log('Entering Y.doccirrus.api.settings.dynamsoft', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.settings.dynamsoft');
                }
                var
                    callback = args.callback,
                    user = args.user;

                Y.doccirrus.api.settings.get( {
                    user: user,
                    callback: function( err, result ) {
                        var
                            dynamsoft = result && result[0] && result[0].dynamsoft && result[0].dynamsoft[0];

                        callback( err, dynamsoft );
                    }
                } );

            },
            getKotableconfigurationPresetOwner: getKotableconfigurationPresetOwner,
            getKotableconfigurationPresetCreated: getKotableconfigurationPresetCreated,
            getLogFile: getLogFile,
            verifySmtpConfiguration: verifySmtpConfiguration,
            getPatientPortalUrl,
            // --------- For mocha test ---------
            loadFromDBandPopulateCache
        };
    },
    '0.0.1', {requires: ['settings-schema', 'employee-api', 'dccache', 'dcemail','dcutils']}
);
