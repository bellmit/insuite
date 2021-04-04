/*
 * Copyright (c) 2012 Doc-Cirrus GmbH All rights reserved.
 * @author rw
 */

/**
 * This Mongo DB driver module brings the Doc Cirrus database layer into the
 * Mojito realms, making it accessible to the mojits, etc. i.e. this is the Mojito
 * side of the Database Layer.
 *
 * Usage:
 *
 * Doc Cirrus Mojito models must follow the Doc Cirrus model pattern, as exemplified
 * at several places - namely global models in autoload and mojit models in individual
 * mojits.
 *
 * Uses the YUI namespace.
 */



/*jslint anon:true, nomen:true */
/*global YUI*/


YUI.add(
    'dcmongodb',
    function( Y, NAME ) {
        const
            {formatPromiseResult} = require('dc-core').utils; //jshint ignore:line

        var
            systemVersionChanged = false,
            DCDB = require( 'dc-core' ).db,
            DCDBWATCHDBCHANGES = 'dcdb.watchForDBChanges',
            EMITWEBHOOKEVENT = 'dcdb.emitWebHookEvent',
            WARN_SLOW_TIME = 1000,

            // this is the singleton Layer for the application
            myLayer;

        if( !Y.doccirrus.schemas ) {
            Y.namespace( 'doccirrus' ).schemas = {};
        }

        /**
         * Constructor for the module class.
         *
         * @class DCDb
         * @private
         */
        function DCDbLayer() {
            // purely static object at the moment, nothing in the instances.
        }

        /**
         * The dbmodule  to make a single point of access to MongoDB databases.
         *
         * @module dbmodule
         */

        function checkReplicationStatus( callback ) {
            if( !Y.doccirrus.mongodb.isReplMaster() ) {
                console.error( "is not repl master" );        //  eslint-disable-line no-console
                process.exit( 1 );
            }
            callback();
        }

        function forceCatalogInit( callback ) {
            // MOJ-3014:
            // force initialisation of the catalogs in this process
            // by calling GET
            Y.doccirrus.mongodb.runDb( { //todo
                user: Y.doccirrus.auth.getSUForLocal(),
                model: 'catalog',
                query: {},
                options: { limit: 1 },
                migrate: true
            }, function( err ) {
                Y.log( 'catalog collection initialized', 'debug', NAME );
                callback( err );
            } );
        }

        /**
         * Self-check schemas have been correctly initialised when the DB Layer
         * starts up.
         *
         * Non public initializer function, triggered by mojito resource store.
         */
        function init() {
            var mySchemas = Y.doccirrus.schemas;
            DCDB.setLogger( Y );

            Y.log( 'Initting.  Mojito DCDBLayer Adapter', 'debug', NAME );

            Y.Object.each( mySchemas, function( schema ) {

                if( !schema.schema || !Object.keys( schema ).length ) {
                    Y.log( `Could not generate schema or empty schema.  \nSchema: ${ schema.name}`,
                        'warn', NAME );
                }
            } );
        }

        function checkCurrentSystemVersion( callback ) {
            var
                i18n = Y.doccirrus.i18n,
                NEW_VERSION = i18n( 'communications.message.NEW_VERSION' ),
                VERSION_PAGE = i18n( 'communications.message.VERSION_PAGE' );
            Y.doccirrus.api.admin.checkAndUpdateVersion( {
                callback: function( err, result ) {
                    if( result && !result.isUpToDate ) {
                        systemVersionChanged = true;
                        Y.log( 'New version of system was released', 'info', NAME );
                        Y.doccirrus.communication.emitEventForAll( {
                            event: 'message',
                            eventType: Y.doccirrus.schemas.socketioevent.eventTypes.CONFIRM,
                            msg: { data: `${NEW_VERSION }<a href="/version" class="removeSocketIOEvent" data-messageId="">${ VERSION_PAGE }</a>` },
                            global: 'true',
                            label: Y.doccirrus.schemas.socketioevent.labels.SYSTEM_VERSION
                        } );
                    }
                    callback( err );
                }
            } );

        }

        function reloadRules( callback ){
            callback();             //  eslint-disable-line callback-return
            if( Y.doccirrus.auth.isPUC() || Y.doccirrus.auth.isDCPRC() ){
                return;
            }

            const cluster = require( 'cluster' );
            //run only on reporting worker, or if the master notices it has no workers.
            if( !(cluster.isWorker && cluster.worker.process.env.REPORTING_WORKER
                  || cluster.workers && Object.keys(cluster.workers).length === 0) ) {
                Y.log( `Initial rules check being skipped for process ${cluster.worker && cluster.worker.id || 0}`, 'info', NAME );
                return;
            }

            Y.log( 'Initial rules check for new started', 'info', NAME );
            var user = Y.doccirrus.auth.getSUForLocal();

            Y.doccirrus.api.ruleimportexport.docCirrusImportAll({
                user: user,
                originalParams: {
                    regenerate: '0'
                },
                callback: function( err ){

                    if( err ){
                        Y.log( `Initial rules import failed with ${ err.message}`, 'error', NAME );
                    } else {
                        Y.log( 'Initial rules check/import finished', 'info', NAME );
                        Y.doccirrus.schemas.sysnum.resetRuleImportLock( Y.doccirrus.auth.getSUForLocal(), function(){
                        } );
                    }
                }
            });
        }

        function run() {
            var cluster = require( 'cluster' );

            //  connect the IPC API to REDIS:
            Y.doccirrus.ipc.connectRedis();

            if( cluster.isMaster ) {

                // this all happens on master, so the workers can overtake the master while this is happening

                // All of the following steps must be registered once per cluster.
                // Running them in the master and then in each worker instance
                // leads to race conditions that leave the system in an undefined
                // state.
                //
                //           ---  runs per each tenant only in master ---
                //DCDB.addTenantStartup( Y.doccirrus.errors.registerSegFaultHandler );
                DCDB.addTenantStartup( Y.doccirrus.schemas.sysnum.resetSemaphores );
                DCDB.addTenantStartup( Y.doccirrus.forms.importutils.runOnStart );
                DCDB.addTenantStartup( Y.doccirrus.media.fonts.runOnStart );
                DCDB.addTenantStartup( Y.doccirrus.schemas.auth.resetTTLIndex );
                DCDB.addTenantStartup( Y.doccirrus.scheduling.doCloseDayOnStartup );
                if( !Y.doccirrus.auth.isPUC() ) {
                    DCDB.addTenantStartup( Y.doccirrus.schemas.partnerreg.resetPresenceList );
                }
                DCDB.addTenantStartup( Y.doccirrus.auth.generateKeysOnStartUp );
                DCDB.addTenantStartup( Y.doccirrus.api.employee.checkSupportAccount );
                //
                //          ---  run irrespective of tenant only in master ---
                // this should not clash with the catalog import case (handled by mongoDb)

                DCDB.registerInitializer( checkReplicationStatus );
                DCDB.registerInitializer( forceCatalogInit );
                if( !Y.doccirrus.auth.isPUC() ) {
                    DCDB.addTenantStartup( Y.doccirrus.api.practice.runOnStart );
                }
                DCDB.addTenantStartup( function updatePresetsPerTenant( user, cb ) {
                    //if( Y.doccirrus.licmgr.hasAdditionalService( Y.doccirrus.schemas.settings.additionalServiceKinds.INSIGHT ) ) {
                    Y.doccirrus.api.insight2.updatePresets( user, cb );
                    //}
                } );

                //  IPC subscriptions on master only

                Y.doccirrus.ipc.subscribeNamed( DCDBWATCHDBCHANGES, NAME, true, function( params ) {
                    watchForDBChanges( params.command, params.result );
                } );
                Y.doccirrus.ipc.subscribeNamed( EMITWEBHOOKEVENT, NAME, true, function( params ) {
                    emitWebHooks( params.command );
                } );
            }

            DCDB.addTenantStartup( Y.doccirrus.api.formfolder.runOnStart );
            DCDB.addTenantStartup( Y.doccirrus.api.formtemplate.runOnStart );

            DCDB.registerInitializer( Y.doccirrus.licmgr.loadSystemTypeFromDb );

            DCDB.registerInitializer( function loadLicenses(callback) {
                Y.doccirrus.licmgr.loadLicensesFromDb( (err) => {
                    if( err ) {
                        Y.log(`loadLicensesFromDb: Error while loading license from DB. Error: ${err.stack || err}`, "error", NAME);
                        return callback(err);
                    }
                    Y.log(`loadLicensesFromDb: successfully loaded license from DB`, "info", NAME);
                    callback();
                } );
            } );

            // ----   run Once per Process Instance !!!! ----
            // All of the following steps must be run once per instance.
            // they in some way help setup up startup context for the
            // process.
            //

            // configure the boot sequence:
            // 1 - only in master setup the catalog from schema
            // 2 - setup catalogs for each node in the cluster (may include complete restore)
            // 3 - do the migration and post-migration tenant startup
            // 4 - boot workers
            // 5 - load form export directories
            // 6 - load settings into cache
            // 7 - setup jreport server
            // 8 - setup partnerregs (PUC)
            // 9 - enable RTC telecommunications
            // 10 - setup medneo billing system
            DCDB.registerInitializer( Y.doccirrus.api.catalog.resetImportLock );
            DCDB.registerInitializer( Y.doccirrus.api.catalog.init );
            DCDB.registerInitializer( Y.doccirrus.api.medicationscatalogsimport.init );
            DCDB.registerInitializer( Y.doccirrus.api.mmi.init );
            DCDB.registerInitializer( Y.doccirrus.api.invoiceconfiguration.init );
            DCDB.registerInitializer( Y.doccirrus.api.settings.runOnStart );

            DCDB.registerInitializer( function setupRedisCache( callback ) {
                Y.doccirrus.cacheUtils.init({
                    flushall: Y.doccirrus.ipc.isMaster()
                }, callback );
            } );

            if( Y.doccirrus.ipc.isMaster() ) {
                DCDB.registerInitializer( checkCurrentSystemVersion );
                DCDB.registerInitializer( Y.doccirrus.api.activityTransfer.runOnStart );
                DCDB.registerInitializer( Y.doccirrus.api.partner.runOnStart );
            }

            DCDB.registerInitializer( Y.doccirrus.migrate.init );

            DCDB.registerInitializer( Y.doccirrus.server.bootWorkers );

            DCDB.registerInitializer( Y.doccirrus.api.admin.constructor.init );

            DCDB.registerInitializer( Y.doccirrus.api.rule.runOnStart );
            DCDB.registerInitializer( Y.doccirrus.forms.exportutils.runOnStart );
            // DCDB.registerInitializer( Y.doccirrus.jreport.runOnStart );
            // DCDB.registerInitializer( Y.doccirrus.api.jreport.runOnStart );


            DCDB.registerInitializer( Y.doccirrus.api.billing.runOnStart );
            DCDB.registerInitializer( Y.doccirrus.api.cli.runOnStart );
            // DCDB.registerInitializer( Y.doccirrus.api.inpacsconfiguration.runOnStartOrthanc );

            DCDB.registerInitializer( Y.doccirrus.api.reporting.runOnStart );
            DCDB.registerInitializer( Y.doccirrus.insight2.utils.runOnStart );

            if( Y.doccirrus.ipc.isMaster() ) {
                if( Y.doccirrus.auth.isDCPRC() ) {
                    DCDB.registerInitializer( Y.doccirrus.api.apptoken.runOnStart );
                    DCDB.registerInitializer( Y.doccirrus.api.admin.setUpAppLicenseSerialsToken );
                }

                DCDB.registerInitializer( Y.doccirrus.auth.checkIPAddessChanged );
                DCDB.registerInitializer( function forceRefreshLicense( callback ){
                    Y.doccirrus.licmgr.forceRefresh( err => {
                        if( err ) {
                            Y.log( `could not refresh license at the startup. Error: ${JSON.stringify( err )}`, 'warn', NAME );
                        }
                        callback();
                    } );
                } );
                if( Y.doccirrus.auth.isPRC() || Y.doccirrus.auth.isVPRC() ) {
                    DCDB.registerInitializer( Y.doccirrus.api.communication.runOnStart );
                    DCDB.registerInitializer( Y.doccirrus.api.marker.runOnStart );
                }

                // TODO: VL remove this call in next version
                DCDB.addTenantStartup( Y.doccirrus.api.diagnosis.runOnStart );
            }

            DCDB.registerInitializer( Y.doccirrus.api.performance.runOnStart );
            DCDB.registerInitializer( Y.doccirrus.api.printer.runOnStart );
            DCDB.registerInitializer( Y.doccirrus.labutils.initLabUtils );
            DCDB.registerInitializer( Y.doccirrus.api.practice.savePracticeCountryModeToConfigs );
            DCDB.registerInitializer( Y.doccirrus.kvconnectManager.init );
            //must run after countryCode init
            DCDB.registerInitializer( Y.doccirrus.HCICatalogUpdater.init );

            if( !Y.doccirrus.auth.isPUC() ) {
                DCDB.registerInitializer( Y.doccirrus.RESTController_2.init );
            }
            if( Y.doccirrus.ipc.isMaster() ) {
                DCDB.registerInitializer( Y.doccirrus.eventloopmonitor.runOnStart );
            }

            // add server.listen, and start socket IO
            // open server for outside communications
            if( !Y.doccirrus.ipc.isMaster() ) {
                DCDB.registerInitializer( Y.doccirrus.server.bootHttp );
            } else {
                DCDB.registerInitializer( Y.doccirrus.api.kbvutility2.init );
                // boot master listener (and socketIO runner inside of it)
                DCDB.registerInitializer( Y.doccirrus.server.boot );
                // swiss websocket solution, will be moved to a sol. MOJ-14447
                DCDB.addTenantStartup( Y.doccirrus.api.inphone.leanSyncStart );
            }

            //[MOJ-11509]
            // these two calls should be made after bootIoRunner call since they need real SocketIO running
            DCDB.registerInitializer( Y.doccirrus.api.partnerreg.runOnStart );
            DCDB.registerInitializer( Y.doccirrus.api.telecommunication.runOnStart );
            DCDB.registerInitializer( Y.doccirrus.schemas.activity.runOnStart );

            /*jshint ignore:start*/
            //  must run after cli features are queried by Y.doccirrus.api.cli.runOnStart
            //  can start late in the sequence, bcs only does timed functions anyway.
            DCDB.registerInitializer( async function runKronnd( callback ) {
                await formatPromiseResult( Y.doccirrus.kronnd.init() );
                callback();
            } );
            /*jshint ignore:end*/

            // now run on reporting worker
            if( !Y.doccirrus.auth.isPUC() ) {
                DCDB.registerInitializer( reloadRules );
            }

            /**
             * Start Sols after all workers have booted up
             */
            if( Y.doccirrus.ipc.isMaster() && !Y.doccirrus.auth.isDevServer() ) {
                DCDB.registerInitializer( Y.doccirrus.api.appreg.runOnStart );
            }

            //DCDB.registerInitializer( Y.doccirrus.api.dispatch.syncPRCWithDispatcher );

            // execute the boot sequence
            setImmediate( DCDB.allRegistered );
        }

        /**
         * The Model is the single point of access to the database.  The model
         * exposes all CRUD functions, and makes sure access to the data is
         * done in accordance with user rights.
         *
         * The user is also required for multi-tenancy and it is the model
         * that completly abstracts multi-tenancy concerns from the developer.
         *
         * @method getModel
         * @param {Object} user  user object, generally from HTTP req
         * @param {String} schemaName  name of the schema (obtained with derive() usually)
         * @param {Boolean} migrate optional (can be completely omitted)
         * @param {Function} [callback]  (err,model)  model is a DCModel object, if no error occurred
         * @return {Promise<Object>}
         */
        DCDbLayer.prototype.getModel = function( user, schemaName, migrate, callback ) {
            let
                schema,
                useCache;
            if( schemaName ) {
                schema = Y.doccirrus.schemas[ schemaName ];
                useCache = schema && schema.cacheQuery && Y.doccirrus.cacheUtils.mongoDbCache.isClientConnected();
                if( useCache ) {
                    Y.doccirrus.cacheUtils.mongoDbCache.removeCache( {
                        tenantId: user.tenantId,
                        model: schemaName
                    }, ( err ) => {
                        if( err ) {
                            Y.log( `could not remove cache data: ${JSON.stringify( err )}`, 'error', NAME );
                        }
                    } );
                }
            }
            // don't allow access during migrate phase
            if( callback ) {
                DCDB.getModel( Y, user, schemaName, migrate, callback );
            } else {
                return new Promise( ( resolve, reject ) => {
                    DCDB.getModel( Y, user, schemaName, migrate, ( error, result) => {
                        if(error) {
                            reject(error);
                        } else {
                            resolve(result);
                        }
                    });
                } );
            }

        };
        DCDbLayer.prototype.getModelReadOnly = function( user, schemaName, migrate, callback ) {
            // don't allow access during migrate phase
            DCDB.getModel( Y, user, schemaName, migrate, callback );
        };

        /**
         * Simplified access to the model.
         *
         * Dispatches calls to the DB, using Model Objects.
         *
         * Encapsulates the correct DB Layer access workflow.
         *
         * Must always be used to access the DB correctly via models.
         *
         * Usage examples:  FIXMEDOC
         * @method runDb
         * @param {Object} command Command
         * @param {String} command.model - the model (i.e. schema) name
         * @param {module:authSchema.auth} command.user - user object, generally from HTTP req
         * @param {String} command.action - 'get', 'put', 'post', 'delete' or custom function
         * @param {Array} [command.args] - arguments for a custom function call (ignored if not a custom call)
         * @param {String|Object} command.query - uses mongodb expressions [GET / PUT / DELETE only]
         * @param {String|Array} command.fields - list of fields to PUT
         * @param {Object} command.options - the parameters in the options object depend on action:
         *                                   see the master doc in the dc-core/lib/model.js
         * @param {Object|Array} [command.data] - [POST / PUT only]
         * @param {Boolean} [command.migrate] - tells runDb to work in the OPEN state
         *                                    If the database is UP, server will stop!
         *                                    Only use if migrating.
         * @param {Function} [callback]  <pre>function (err, result)
         *                  The result for
         *                  GET
         *                  An array of mongoose docs
         *
         *                  PUT
         *                  An array of mongoose docs.
         *                  Put only works on the first object it finds by default.
         *                  Multi-update is possible, see model.js doc.
         *
         *                  POST
         *                  An array of ids as String of the created object
         *                  unless the option {entireRec:true} is set, in
         *                  which case you get back an array of mongoose docs
         *
         *                  DELETE
         *                  As of 1.3, the result is an array of the mongoose
         *                  docs that were deleted.
         *                  </pre>
         *@returns {Promise}
         */
        DCDbLayer.prototype.runDb = function( command, callback ) {
            var _callback = callback || command.callback,
                model = command.model,
                schema,
                useCache = false,
                query = Object.assign( {}, command.query || {} ),
                options = Object.assign( {}, command.options || {} ),
                isGetOrCountCommand = (!command.action || 'get' === command.action.toLowerCase() || 'count' === command.action.toLowerCase()),
                isChangeOperation = 'put' === command.action || 'upsert' === command.action || 'post' === command.action || 'delete' === command.action;
            command.context = command.context || {};
            if( model ) {
                schema = Y.doccirrus.schemas[ model ];
                useCache = schema && schema.cacheQuery && Y.doccirrus.cacheUtils.mongoDbCache.isClientConnected();
            }

            if( "boolean" === typeof command.useCache ) {
                useCache = command.useCache;
                delete command.useCache;
            }

            return new Promise( ( resolve, reject ) => {
                let startTime = new Date().getTime();

                function handleResult( err, result ) {
                    function done() {
                        let endTime = new Date().getTime();
                        if ( ( endTime - startTime ) > WARN_SLOW_TIME ) {
                            Y.log( `slow query, ${(endTime - startTime)}ms, ${command.action} ${command.model}`, 'warn', NAME );
                        }

                        if( _callback ) {
                            _callback( null, result );
                        } else {
                            resolve( result );
                        }
                    }
                    if( err ) {
                        let
                            _error = err;
                        /**
                         * Translate cast errors to dc error
                         */
                        if( 'CastError' === err.name ) {
                            _error = new Y.doccirrus.commonerrors.DCError( '27000', { data: { $message: err.message || '' } } );
                        }
                        if( _callback ) {
                            _callback( _error );
                        } else {
                            reject( _error );
                        }
                        return;
                    }

                    if( useCache ) {
                        if( isGetOrCountCommand ) {
                            Y.doccirrus.cacheUtils.mongoDbCache.setQuery( {
                                query: {
                                    query: query,
                                    options: options,
                                    action: command.action
                                },
                                user: command.user,
                                model: command.model,
                                data: result
                            }, ( err ) => {
                                if( err ) {
                                    Y.log( `could not cache data: ${JSON.stringify( err )}`, 'warn', NAME );
                                }
                                done();
                            } );
                        } else {
                            Y.doccirrus.cacheUtils.mongoDbCache.removeCache( {
                                tenantId: command.user.tenantId,
                                model: command.model
                            }, ( err ) => {
                                if( err ) {
                                    Y.log( `could not remove cache data: ${JSON.stringify( err )}`, 'warn', NAME );
                                }
                                done();
                            } );
                        }
                    } else {
                        done(); // eslint-disable-line callback-return
                    }

                    /**
                     * Emits mongodb watcher events
                     */
                    if( command.user && 'su' !== command.user.id && isChangeOperation ) {
                        if( Y.doccirrus.ipc.isMaster() ) {
                            watchForDBChanges( command, result );
                        } else {
                            let
                                params = {
                                    command: command,
                                    result
                                };
                            Y.doccirrus.ipc.send( DCDBWATCHDBCHANGES, JSON.parse( JSON.stringify( params ) ), true, true );
                        }
                    }

                    /**
                     * Emits web hooks
                     */
                    if( command.user && isChangeOperation ) {
                        if( Y.doccirrus.ipc.isMaster() ) {
                            emitWebHooks( command );
                        } else {
                            let
                                params = {
                                    command: command
                                };
                            Y.doccirrus.ipc.send( EMITWEBHOOKEVENT, JSON.parse( JSON.stringify( params ) ), true, true );
                        }
                    }

                }

                if( useCache && isGetOrCountCommand ) {
                    Y.doccirrus.cacheUtils.mongoDbCache.getQuery( {
                        query: {
                            query: query,
                            options: options,
                            action: command.action
                        },
                        user: command.user,
                        model: command.model
                    }, ( err, data ) => {
                        if( err ) {
                            Y.log( `could not get cached query: ${JSON.stringify( err )}`, 'warn', NAME );
                            return DCDB.runDb( Y, command, handleResult );
                        }
                        if( 'undefined' !== typeof data ) {
                            useCache = false;
                            handleResult( null, data );
                        } else {
                            DCDB.runDb( Y, command, handleResult );
                        }
                    } );
                } else {
                    DCDB.runDb( Y, command, handleResult );
                }

            } );

        };

        function checkDocumentIdSubscription( config ) {
            let
                document = config.document,
                command = config.command,
                handler;
            if( 'object' === typeof document ) {
                let
                    _document = document.toObject ? document.toObject() : Object.assign( {}, document );
                handler = Y.doccirrus.mongoWatcher.getHandlersFor( {
                    collection: command.model,
                    id: _document._id && _document._id.toString()
                } );
                if( 'function' === typeof handler ) {
                    handler( _document, Object.assign( {}, command ) );
                }
            } else if( 'string' === typeof document ) {
                handler = Y.doccirrus.mongoWatcher.getHandlersFor( {
                    collection: command.model,
                    id: document
                } );
                if( 'function' === typeof handler ) {
                    handler( document, Object.assign( {}, command ) );
                }
            }
        }

        /**
         * Calls db event handlers
         * @param {Object} command db command
         * @param {Array|Object} result result of db operation
         */
        function watchForDBChanges( command, result ) {
            let handler;
            /**
             * 1. Calls specific callback(s) for document id
             * 2. Calls default callback(s) for collection
             */
            // specific handlers
            if( result ) {
                if( Array.isArray( result ) && result.length ) {
                    result.forEach( document => {
                        checkDocumentIdSubscription( {
                            document: document,
                            command: command
                        } );
                    } );
                } else if( !Array.isArray( result ) && 'object' === typeof result ) {
                    checkDocumentIdSubscription( {
                        document: result,
                        command: command
                    } );
                }
            }
            // default handlers
            handler = Y.doccirrus.mongoWatcher.getHandlersFor( {
                collection: command.model
            } );
            if( 'function' === typeof handler ) {
                handler( result, Object.assign( command ) );
            }

        }


        function runDbActionToCRUD( action ){
            switch( action ){
                case 'post':
                    return 'created';
                case 'put':
                    return 'updated';
                case 'delete':
                    return 'removed';
                default:
                    return 'unknown';
            }
        }
        /**
         *
         * emits:
         * 1. current action
         * 2. for all actions (*)
         * 3. if put/delete - for _id
         *
         * @param {Object} params
         * @param {Object|Array} params.result
         * @param {Object} [params.action="get"]
         * @param {Object} params.hook
         * @private
         */
        function _emitWebHooks( params ) {
            const
                { result, action = 'get', hook, user } = params,
                query = {},
                sessionId = user.su ? 'system' : user.sessionId,
                insuiteUserId = user && user.specifiedBy,
                resultIds = result.map( item => item._id ),
                webHookAction = runDbActionToCRUD( action );
            /**
             * event for all actions (*)
             */
            Y.doccirrus.communication.emitWebHookEvent( {
                payload: resultIds,
                roomData: {
                    hook,
                    action: '*',
                    query
                },
                action: webHookAction,
                sessionId,
                insuiteUserId
            } );
            /**
             * event for action
             */
            Y.doccirrus.communication.emitWebHookEvent( {
                payload: resultIds,
                roomData: {
                    hook,
                    action: webHookAction,
                    query
                },
                action: webHookAction,
                sessionId
            } );
            /**
             * event for specific _id subscription
             */
            if( ('put' === action || 'delete' === action) ) {
                resultIds.forEach( entryId => {
                    Y.doccirrus.communication.emitWebHookEvent( {
                        payload: [ entryId ],
                        roomData: {
                            hook,
                            action: webHookAction,
                            query: {
                                _id: entryId
                            }
                        },
                        action: webHookAction,
                        sessionId
                    } );
                } );
            }
        }

        /**
         * Calls db event handlers
         * @param {Object} command db command
         */
        function emitWebHooks( command ) {
            const
                result = command.context && command.context.opResults || [];
            _emitWebHooks( { result, action: command.action, hook: command.model, user: command.user } );
            if( 'activity' === command.model ) {
                const
                    activitiesMap = {};
                if( Array.isArray( result ) ) {
                    result.forEach( item => {
                        activitiesMap[ item.actType ] = activitiesMap[ item.actType ] || [];
                        activitiesMap[ item.actType ].push( item );
                    } );
                } else {
                    activitiesMap[ result.actType ] = [ result ];
                }
                Object.keys( activitiesMap ).forEach( actType => {
                    _emitWebHooks( {
                        result: activitiesMap[ actType ],
                        action: command.action,
                        hook: actType,
                        user: command.user
                    } );
                } );
            }
        }

        function checkReplSetHealth() {
            if( DCDB.isReplOn() ) {
                Y.doccirrus.mongodb.getReplstats( ( err, res ) => {
                    var msgTitle = "REPLICA SET PROBLEM";
                    var msgDetails = "einer der Replica Set Mitglieder reagiert nicht.",
                        moment = require( 'moment' );

                    function considerPanic( user ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: "task",
                            action: "get",
                            query: {
                                title: msgTitle
                            },
                            options:{sort:{_id:-1}}
                        }, ( err, res ) => {
                            if( err ) {
                                Y.log( `checkReplSetHealth. can not get task. Error: ${JSON.stringify( err )}`, 'error', NAME );
                            }
                            if( res ) {
                                let
                                    shouldCreateTask = !res.length;
                                if( !shouldCreateTask ) {
                                    shouldCreateTask = !moment().isSame( moment( res[ 0 ].callTime ), 'd' );
                                }
                                if( shouldCreateTask ) {
                                    getEmployeeName( user, function( err, res ) {
                                        if( !err ) {
                                            let admin = res[ 0 ],
                                                adminName = `${admin.lastname }, ${ admin.firstname}`;
                                            doPanic( user, admin.specifiedBy, adminName );
                                        } else {
                                            Y.log( "unable to find any admin", 'warn', NAME );
                                        }
                                    } );
                                }
                            }
                        } );
                    }

                    function getEmployeeName( user, callback ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'identity',
                            action: 'get',
                            query: {
                                "memberOf.group": "ADMIN"
                            },
                            options: {
                                sort: { _id: -1 },
                                limit: 1
                            }
                        }, callback );
                    }

                    function doPanic( user, employeeId, employeeName ) {
                        Y.doccirrus.mongodb.runDb( {
                                model: "task",
                                user: user,
                                action: 'post',
                                data: {
                                    employeeId: employeeId,
                                    employeeName: employeeName,
                                    alertTime: new Date(),
                                    title: msgTitle,
                                    details: msgDetails,
                                    urgency: 3,
                                    allDay: true,
                                    roles: [ Y.doccirrus.schemas.role.DEFAULT_ROLE.EMPFANG ],
                                    skipcheck_: true
                                }
                            }, function( err ) {
                                if( err ) {
                                    Y.log( "error posting task:", 'warn', NAME );
                                    Y.log( err, 'warn', NAME );
                                }
                            }
                        );
                    }

                    if( err ) {
                        Y.log( "unable to getReplstats(), yet replication is on", 'warn', NAME );
                    }
                    if( res ) {
                        for( let i = 0; i < res.members.length; i++ ) {

                            if( "red" === res.members[ i ].healthColor ) {
                                considerPanic( Y.doccirrus.auth.getSUForTenant( "1111111111" ) );
                                break;
                            }
                        }
                    }
                } );
            }
        }

        DCDbLayer.prototype.existsDbForTenant = function( tenant, callback ) {
            DCDB.existsDb( tenant, callback );
        };

        DCDbLayer.prototype.isMultitenant = function() {
            return DCDB.isMultitenant();
        };

        DCDbLayer.prototype.dropDb = function( tenant, callback ) {
            return DCDB.dropDb( tenant, callback );
        };

        DCDbLayer.prototype.getReplData = DCDB.getReplData;
        DCDbLayer.prototype.getReplstats = function( callback ) {
            DCDB.getReplData( function( err, res ) {
                if( err || !res ) {
                    return callback( err || Error( "no error and no data" ) );
                }

                var mostRecent = 0;
                res.members.forEach( e => {
                    if( e.optimeDate > mostRecent ) {
                        mostRecent = e.optimeDate;
                    }
                } );
                res.members.forEach( e => {
                    e.lag = mostRecent - e.optimeDate;
                } );

                res.members.forEach( e => {
                    var healthColor = "green";
                    var healthReason = "OK";

                    if( e.health === 0 ) {
                        healthColor = "red";
                        healthReason = "Offline";
                    } else if( e.state === 0 ) {
                        healthColor = "yellow";
                        healthReason = "Startup";
                    } else if( e.state === 5 || e.state === 5 ) {
                        healthColor = "yellow";
                        healthReason = "Sync / Recovery";
                    } else if( e.state === 7 ) {
                        healthColor = "blue";
                        healthReason = "Arbiter";
                    } else if( e.state === 8 || e.state === 9 || e.state === 10 ) {
                        healthColor = "red";
                        healthReason = "Unavailable";
                    } else if( e.lag > 30000 ) { //30s difference
                        healthColor = "yellow";
                        healthReason = "Not up-to-date";
                    } else if( e.pingMs > 150 ) {
                        healthColor = "yellow";
                        healthReason = "Low Ping";
                    }

                    e.healthColor = healthColor;
                    e.healthReason = healthReason;
                } );

                callback( null, res );

            } );
        };

        DCDbLayer.prototype.isReplMaster = function() {
            return DCDB.isReplMaster();
        };

        DCDbLayer.prototype.isReplOn = function() {
            return DCDB.isReplOn();
        };

        /**
         * Get a streaming connection to the GridFS streaming API of the current user's tenant database
         * (see MediaMojit's gridfs.server.js
         *
         * @param   user            {Object}    REST user or equivalent
         * @param   migrate         {Boolean}   True if in migration
         * @param   callback        {Function}  Of the form fn( err, fileName )
         */

        DCDbLayer.prototype.gridfsConnectStream = function( user, migrate, callback ) {
            DCDB.gridfsConnectStream( user, migrate, callback );
        };

        /**
         * should be called by master!
         * @returns {boolean}
         */
        DCDbLayer.prototype.isSystemVersionChanged = function() {
            return systemVersionChanged;
        };

        myLayer = new DCDbLayer();
        init();

        Y.namespace( 'doccirrus' ).mongodb = myLayer;

        run();

        // cronjob check if all replica set members are still alive and well
        Y.doccirrus.kronnd.on( 'checkReplSetHealth', checkReplSetHealth );

    },
    '0.0.1', {
        requires: [
            // utilities
            'dcmigrate',
            'dcserver',
            'partnerreg-api',
            'patient-api',
            'telecommunication-api',
            'communication-api',
            'settings-api',
            'practice-api',
            'billing-api',
            'admin-api',
            'insight2-api',
            'formfolder-api',
            'formtemplate-api',
            'cli-api',
            'reporting-api',
            'calendar-api',
            'dclicmgr',
            'i18n-factory',

            // schemata
            'formtemplate-schema',
            'formtemplateversion-schema',
            'formprinter-schema',
            'formfolder-schema',
            'insight2-schema',
            'insight2containers-schema',
            'person-schema',
            'simpleperson-schema',
            'activity-schema',
            'severity-schema',
            'inphone-schema',
            'kbvlog-schema',
            'invoicelog-schema',
            'partner-schema',
            'invoiceconfiguration-schema',
            'gkv_deliverysettings-schema',
            'kvg_deliverysettings-schema',
            'settings-schema',
            'marker-schema',
            'patient-schema',
            'auth-schema',
            'customer-schema',
            'company-schema',
            'contact-schema',
            'patientalert-schema',
            'dcschemaloader',
            'dcvalidations',
            'intime-schema',
            'sysnum-schema',
            'employee-schema',
            'employee-api',
            'identity-schema',
            'calendar-schema',
            'schedule-schema',
            'repetition-schema',
            'practice-schema',
            'location-schema',
            'scheduletype-schema',
            'patientreg-schema',
            'media-schema',
            'metaprac-schema',
            'document-schema',
            'admin-schema',
            'audit-schema',
            'activity-api',
            'documentationtree-schema',
            'activitysettings-schema',
            'activitysequence-schema',
            'socketioevent-schema',
            'partnerreg-schema',
            'kotableconfiguration-schema',
            'deviceconfiguration-schema',
            'patientreg-schema',
            'task-schema',
            'flow-schema',
            'file-schema',
            'mediport-schema',
            'database-schema',
            'serialdevice-schema',
            'v_event-schema',
            'v_supportcontact-schema',
            'v_tenant-schema',
            'v_cardreader-schema',
            'dispatchrequest-schema',
            'prcdispatch-schema',
            'v_dispatch-schema',
            'v_prcsynchro-schema',
            'v_user-schema',
            'v_physician-schema',
            'v_configuration-schema',
            'v_rulenode-schema',
            'v_formportal-schema',
            'apptoken-schema',
            'mirroractivity-schema',
            'reporting-schema',
            'syncreporting-schema',
            'mirrorpatient-schema',
            'mirrorcasefolder-schema',
            'inpacsworklist-schema',
            'partneridcatalog-schema',
            'symptom-schema',
            'alimentation-schema',
            'allergy-schema',
            'catalog-api',
            'medicationscatalogsimport-api',
            'appreg-api',
            'labtest-schema',
            'lab-utils',
            'casefolder-schema',
            'rlv-schema',
            'rulelog-schema',
            'DCMongoWatcher',
            'dcipc',
            'basecontact-schema',
            'dispatch-api',
            'mirroremployee-schema',
            'mirrorlocation-schema',
            'SyncReportingManager',
            'dcmedia-fonts',
            'edmpdelivery-schema',
            'inpacsconfiguration-api',
            'cache-utils',
            'dckronnd',
            'reporting-api',
            'KVConnectManager',
            'timanager',
            'ipc-monitor',
            'invoiceconfiguration-api',
            'activitytransfer-api',
            'RESTController_2',
            'partner-api',
            'print-api',
            'rule-api',
            'mmi-api',
            'performance-api',
            'inphone-api',
            'diagnosis-api',
            'kbvcon-api',
            'marker-api',
            'kbvutilityprice-api',
            'kbvutility2-api',
            'dcscheduling',
            'HCICatalogUpdater'

            // @see https://confluence.intra.doc-cirrus.com/display/SD/YUI+Dependencies
            // 'dcauth',
            // 'dccommonerrors',
            // 'dcforms-importutils',
            // 'dcipc',
            // 'dckronnd',
            // 'syncreporting-utils',
            //
            // //API
            // 'apptoken-api',
            // 'role-schema',
            // 'ruleimportexport-api',
        ]
    }
);
