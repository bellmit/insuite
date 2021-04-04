/**
 * User: rrrw
 * Date: 24/04/15  14:36
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */

YUI.add( 'dcserver', function( Y, NAME ) {

        // each member of the cluster has a different copy of this variable
        // because they do not chare memory.
        const
            cluster = require( 'cluster' ),
            dccors = require( `${__dirname  }/../node_modules/dc-core` ).cors,

            //  if more than this many workers, the reporting worker will not listen for web requests, MOJ-11062
            SPECIAL_REPORTING_WORKER_AFTER = 4;

        let
            expressIsReady = false,
            dcdbIsReady = false,
            serverOptions,
            app,
            nWorkers;

        /**
         * Init does:
         * Set up clustering parameters, no. of workers,
         * Set which host to bind,
         * Set ports for master and for workers,
         * Set up HTTP parameters.
         *
         * @param opts
         */
        function init( opts ) {

            var
                numCPUs,
                myHost;
            serverOptions = opts;
            app = opts.app;

            // decide which host to bind
            if( (Y.doccirrus.auth.isPRC() || Y.doccirrus.auth.isISD()) && !opts.bindall ) {
                myHost = '127.0.0.1';
            }

            serverOptions.myHost = myHost;

            if( cluster.isMaster ) {
                //
                // set up clustering according to the number of CPUs
                // but let at least 2 workers run (if clustering), otherwise PRCs have serious problems.
                // 0-3 => 2 workers
                // 4 => 3 workers
                // 5 => 4 workers
                numCPUs = require( 'os' ).cpus().length;
                nWorkers = (numCPUs - 7 > 0) ? numCPUs - 1 : 5;

                // make a check for massive numbers of CPUs,
                // our clustering architecture does not scale in a linear fashion,
                // so we need to update architure, and/or use workerThreads for specific issues.
                // .. => 5 workers
                // 8-10 => 5 workers
                // 11,12 => 6 workers
                // 13,14 => 7 workers
                // 15,16 => 8 workers
                // 17,18 => 9 workers
                // 18,19 => 10 workers
                if( nWorkers > 5 ) {
                    nWorkers = Math.min(
                        Math.floor( (numCPUs + 3) / 2 ),
                        10
                    );
                }

                Y.log( `Middleware setup done:    ###  Booting Server Master  ###\nBinding: ${  myHost  } (bindall: ${  opts.bindall  })` );

                // fix for socket IO polling numbers in master
                require( "http" ).globalAgent.maxSockets = 500;

                // DCPRC is a PRC but only has one thread.
                if( !Y.doccirrus.auth.isDCPRC() ) {
                    app.set( 'port', (+opts.port + 1) ); // master listens on port+1
                } else {
                    app.set( 'port', opts.port );
                }

                // Y.doccirrus.auth.isVPRC() || Y.doccirrus.auth.isPRC() || Y.doccirrus.auth.isISD() these 3 get workers
                if( !opts.nofork && nWorkers > 0 && (Y.doccirrus.auth.isVPRC() || Y.doccirrus.auth.isPRC() || Y.doccirrus.auth.isISD()) ) {
                    // use clustering if we have workers, and if we haven't suppressed the cluster mode.
                    // choose the next port
                    Y.log( `Detected ${  numCPUs  } CPUs. Will start ${  nWorkers  } workers.`, 'info', NAME );

                    Y.log( '\n\n\n******  STARTING IN MASTER/WORKER MODE *******\n\n', 'info', NAME );

                    Y.log( `\n\n\n******  STARTING MASTER SERVER (SOCKET.IO+DEVICES) on PORT : ${  +opts.port + 1  } *******\n\n`, 'info', NAME );
                } else if( opts.nofork && (Y.doccirrus.auth.isVPRC() || Y.doccirrus.auth.isPRC() || Y.doccirrus.auth.isISD()) ) {
                    if( opts.mocha ) {
                        Y.log( 'mocha, nofork. Will start 0 workers.', 'info', NAME );
                        nWorkers = 0;
                    } else {
                        Y.log( 'PRC/VPRC, nofork. Will start 1 workers.', 'info', NAME ); // these server types cannot function with no worker.
                        nWorkers = 1;
                    }

                } else {
                    Y.log( 'Not PRC/VPRC. Will start 0 workers.', 'info', NAME );

                    nWorkers = 0;
                }
            } else {
                // set the worker port
                app.set( 'port', opts.port );
            }
        }

        /**
         * Express will signal it's ready here.
         * If DCDB has inited, then this will actually start the server.
         */
        function signalReady() {
            Y.log( 'Received signal from server.js that express is ready.' );
            expressIsReady = true;
            boot();
        }

        /**
         * Boot the master listener.
         * Should only be done when express is completely ready.
         */
        function boot( callback ) {
            const {server, myHost} = serverOptions;

            Y.log( 'Boot of master listener. Will be done for master only.' );

            if( expressIsReady && dcdbIsReady ) {
                doBoot();
            } else {
                dcdbIsReady = true;
            }

            function doBoot() {
                server.listen( app.get( 'port' ), myHost, function() {
                    Y.log( `\n\n\nServer and all services listening on port ${  app.get( 'port' )  } ` +
                           `in ${  app.get( 'env' )  } mode\n\n`, 'info', NAME );
                    bootIoRunner( callback );
                } );
            }
        }

        /**
         * Takes server.listen for workers out of boot()
         * but bear in mind that the master server.listen must be run before the workers
         *
         * @param {Function} callback
         */
        function bootHttp( callback ) {
            if( cluster.isMaster ) {
                return callback();
            }

            const {server, myHost, bindall} = serverOptions;
            let port;

            Y.log( `Middleware setup done:    ###  Booting Server Worker  ###\nBinding: ${  myHost  } (bindall: ${  bindall  })` );

            // incr. the number of sockets for workers too
            // to handle REST-bursts better.
            require( "http" ).globalAgent.maxSockets = 500;

            // Workers can share any TCP connection
            // In this case its a HTTP-express server for REST and HTML
            // so the master also serves pages normally.  Actually we
            // don't want this!  But for now inescapable.

            if( process.env.REPORTING_WORKER && process.env.NUM_DC_WORKER_PROCESSES && process.env.NUM_DC_WORKER_PROCESSES > SPECIAL_REPORTING_WORKER_AFTER ) {
                Y.log( `Not listening on reporting worker, the worker gets jobs by IPC: ${  cluster.worker.id  } num workers: ${  process.env.NUM_DC_WORKER_PROCESSES}`, 'info', NAME );
            } else {
                Y.log( `Listening on worker ${  cluster.worker.id  } of ${  process.env.NUM_DC_WORKER_PROCESSES}`, 'info', NAME );
                port = app.get( 'port' );
                server.listen( port, myHost, function() {
                    Y.log( `\n\n\nWorker Server (${  cluster.worker.id  }) listening on port ${  port  } ` +
                           `in ${  app.get( 'env' )  } mode\n\n`, 'info', NAME );
                } );
            }
            return callback();
        }

        /**
         * Boots the IO communications with a delay.
         * @param {function|undefined} callback
         * @param {boolean} forceDelayedStartup (default: false) forces a delayed startup
         */
        function bootIoRunner( callback, forceDelayedStartup ) {
            let
                startupDelay = 10000,
                startup = function() {
                    Y.log( `Booting Socket IO: on ${Y.doccirrus.ipc.whoAmI()}`, `info`, NAME );
                    bootIo( serverOptions.server );
                    Y.log( `Booting Socket IO: endpoints started on ${Y.doccirrus.ipc.whoAmI()}`, `info`, NAME );
                    if( typeof callback === "function" ) {
                        return callback();
                    }
                };
            // if no server is configured, we delay the startup
            if( !serverOptions.server ) {
                Y.log( `Booting Socket IO: No server, forcing delayed startup!`, `warning`, NAME );
                forceDelayedStartup = true;
            }

            // direct or delayed startup
            if( forceDelayedStartup ) {
                /*
                 * if we do not get any tickets about this message from Dirk, then this function can be simplified.
                 * through setting the correct start order everything can start synchronously
                 */
                Y.log( `This should not happen any more:  Booting Socket IO: delaying startup by ${startupDelay}`, `error`, NAME );
                setTimeout( startup, startupDelay );
            } else {
                startup();
            }
        }

        /*jshint latedef: false*/
        /**
         * Boots master bound socket IO based services.
         *
         * These singleton services are tightly bound to socketIO comms and only available
         * as silent stubs in the worker processes.
         * @param {Object} server server object
         */
        function bootIo( server ) {
            // websocket code goes here  io.on()....
            let
                dcUtil = require( `${process.cwd()  }/middleware/dc-util.js` ),
                dcServerMiddleware = dcUtil.getServerMiddleware(),
                io = require( 'socket.io' )( server, {
                    perMessageDeflate: false,
                    pingTimeout: 600000
                } ),
                namespaceList = ['default', 'cardreader', 'serial-to-ethernet', 'x-terminal'],
                /**
                 * web hooks list which defines allowed hooks and actions
                 * @type {Object}
                 */
                webHooks = Object.assign( {
                    activity: {
                        actions: ['created', 'updated', 'removed']
                    },
                    casefolder: {
                        actions: ['created', 'updated', 'removed']
                    },
                    document: {
                        actions: ['created', 'updated', 'removed']
                    },
                    patient: {
                        actions: ['created', 'updated', 'removed']
                    },
                    basecontact: {
                        actions: ['created', 'updated', 'removed']
                    },
                    schedule: {
                        actions: ['created', 'updated', 'removed']
                    },
                    task: {
                        actions: ['created', 'updated', 'removed']
                    },
                    employee: {
                        actions: ['created', 'updated', 'removed']
                    },
                    dataImport: {
                        actions: [ 'dumpimportdata', 'seeddata', 'copydata', 'export', 'trialcombine', 'finalcombine', 'import', 'delete', 'cleargridfs', 'briefeimport']
                    },
                    vivy: {
                        actions: ['updated']
                    }
                }, Y.doccirrus.schemas.activity.types.Activity_E.list.reduce( ( obj, item ) => { //all actTypes
                    obj[item.val.toLowerCase()] = {
                        actions: ['created', 'updated', 'removed']
                    };
                    return obj;
                }, {} ) );
            // reuse some of middle-wares used by express in order to authenticate socket requests
            io.use( function( socket, next ) {
                const
                    cookieParser = require( 'cookie-parser' )();
                socket.request.isSocketio = true;
                cookieParser( socket.request, {}, next );
            } );

            io.use( function( socket, next ) {
                var
                    sessionHandler = require( `${process.cwd()  }/middleware/expresssession-init` )( Y );
                sessionHandler( socket.request, {}, next );
            } );

            io.use( function( socket, next ) {
                var
                    dcSession = dcServerMiddleware.dcsession( Y );
                dcSession( socket.request, {}, next );
            } );

            io.use( function( socket, next ) {
                if( !(socket && socket.request && socket.request.user) ) {

                    console.log( `SocketIO_middleware: The session middleware failed to add a user object to the request for socket ${socket && socket.id}. Trying to fetch the user from the auths collection using session ID from cookie...` ); // eslint-disable-line
                    const sessionId = (socket && socket.request && socket.request.sessionID) || (socket && socket.request && socket.request.session && socket.request.session.id);

                    if( sessionId ) {
                        console.log( `SocketIO_middleware: Found session ID on request object: ${sessionId}. Querying auths collection...` ); // eslint-disable-line
                        Y.doccirrus.mongodb.runDb( {
                            user: Y.doccirrus.auth.getSUForTenant(),
                            action: 'get',
                            model: 'auth',
                            query: {sessionId}
                        }, ( err, res ) => {
                            if( err ) {
                                console.log( `SocketIO_middleware: Error in fetching user from auths collection. Socket ${socket && socket.id} will be missing a user object...\n ${err.stack || err}` ); // eslint-disable-line
                            } else {
                                if( Array.isArray( res ) && res.length ) {
                                    console.log( `SocketIO_middleware: Found ${res.length} user object(s) associated to session ${sessionId} for socket ${socket && socket.id}: \n`, res ); // eslint-disable-line
                                    console.log( `SocketIO_middleware: Adding first found user object (_id: ${res[0]._id}) to request.` ); // eslint-disable-line
                                    socket.request.user = res[0];
                                } else {
                                    console.log( `SocketIO_middleware: No auths entry was found corresponding to the session ${sessionId}. Socket ${socket && socket.id} will be missing a user object...` ); // eslint-disable-line
                                }
                            }
                            return next();
                        } );
                    } else {
                        console.log( `SocketIO_middleware: No session ID was found. Cannot query auths collection. Socket ${socket && socket.id} will be missing a user object... ` ); // eslint-disable-line
                        return next();
                    }

                } else {

                    console.log( `SocketIO_middleware: The session middleware successfully added the user object to the request for socket ${socket && socket.id}. The user was not fetched from the auths collection. User:\n`, socket.request.user ); // eslint-disable-line
                    return next();

                }
            } );

            io.use( function( socket, next ) {
                let
                    link;
                const
                    handshake = socket.handshake,
                    dcFriendSocketIo = dcServerMiddleware.dcfriendsocketio( Y );

                socket.request.query = handshake.query;
                //todo add validation/authentication
                /**
                 * we need this block to verify socket connection(dcplainframe one) in conference page
                 */
                if( !socket.request.user ) {
                    if( socket.request && socket.request.headers && socket.request.headers.referer ) {
                        link = require( 'url' ).parse( socket.request.headers.referer, true );
                        /**
                         * add faked user object to socket
                         */
                        if( link.query && link.query.identityId ) {
                            socket.request.user = {
                                fake: true
                            };
                            socket.request.user.identityId = link.query.identityId;
                            socket.request.user.tenantId = Y.doccirrus.auth.getLocalTenantId();
                            console.log( "SocketIO_middleware: user object was attached to HTTP request using referer header and local tenant ID:\n", socket.request.user ); // eslint-disable-line
                        }
                    }
                    return dcFriendSocketIo( socket, next );
                } else {
                    if( socket.request._query ) {
                        socket.request.user.supportsWebRTC = ('true' === socket.request._query.supportsWebRTC);
                    }
                }
                next();
            } );

            // restrict cross-domain access to socketIO according to cors.json
            // successful requests may get Access-Control-Allow-Origin: *

            io.use( (socket, next) => {
                let
                    headers = socket.handshake.headers,
                    origin = socket.handshake.headers.origin || socket.handshake.headers.referer || '*',
                    host = origin.replace( 'http://', '' ).replace( 'https://', '' ).split( '/' )[ 0 ];

                if ( !headers.hasOwnProperty( 'origin' ) && !headers.hasOwnProperty( 'referer' ) ) {
                    //  Not cross domain
                    return next();
                }

                if ( !dccors.isValidCorsOrigin( host ) ) {
                    Y.log( `Unauthorized socketio connection from origin: ${origin}`, 'warn', NAME );
                    socket.disconnect();
                    return next( new Y.doccirrus.errors.rest( 403, 'Unauthorized CORS origin', true )  );
                }

                return next();
            });

            io.use( function( socket, next ) {
                /**
                 * Set user for "friend" app.
                 */
                if( socket.request && (socket.request.authenticatedApp || socket.request.friend) ) {
                    socket.request.user = Y.doccirrus.auth.getUserByReq( socket.request );
                    socket.request.user.U = socket.request.authenticatedApp || socket.request.friend;
                    console.log( "SocketIO_middleware: user object was attached to HTTP request through getUserByReq():" + socket.request.user, 'info', NAME ); // eslint-disable-line
                }
                next();
            } );

            // boot the WebRTC service
            if( !Y.doccirrus.auth.isMocha() && (Y.doccirrus.auth.isPUC() || Y.doccirrus.auth.isPRC() || Y.doccirrus.auth.isVPRC()) ) {
                bootRtcService( io );
            }

            //  NB:
            //  These services are running only in the master process
            Y.doccirrus.communication.initWebSocket( {
                ioServer: io,
                namespaceList,
                webHooks,
                /**
                 * This method is called for every connected web socket connection
                 *  even if it is not authorized
                 * @param {Object} params
                 */
                onSocketConnected( params ) {
                    const {socket, nsp} = params;

                    if( nsp === 'serial-to-ethernet' ) {
                        socket.on( 'hello', ( data ) => {
                            Y.doccirrus.api.sdManager.hello( socket, data );
                        } );
                    } else if( nsp === 'x-terminal' ) {
                        Y.doccirrus.api.xterminal.socketConnected( socket );
                    }

                },
                /**
                 * method which authorized web socket connection
                 * @param {Object} params
                 * @param {String} [params.token]  A JWT token. If present then it means JWT token verification should be used
                 * @param {String} [param.oauthToken]  A Oauth token. If present means the Oauth 2 verification should be used
                 * @param {String} [param.version]  If 'param.token' is present then version must be set and should
                 *                                  have value as either "1.0" or "2.0"
                 * @paramm {String} [param.date]  ISO string date. Will be only present if 'param.token' is present
                 * @param {Object} param.socket  The websocket object
                 * @param {String} param.name  Name of the server who initiated websocket connection
                 * @returns {Promise}
                 */
                onAuth( params ) {
                    const
                        {token, version, name, date, socket, oauthToken} = params;

                    if( !oauthToken ) {
                        return Y.doccirrus.auth.verifyWebSocketJWT( {token, version, date, name, socket} );
                    } else {
                        return Y.doccirrus.auth.verifyWebSocketOauth( {oauthToken, name, socket} );
                    }
                }
            } );

            if( Y.doccirrus.api.crManager && !Y.doccirrus.auth.isMocha() ) {
                Y.doccirrus.api.crManager.init( app.get( 'port' ) );

            }
            if( Y.doccirrus.api.sdManager && !Y.doccirrus.auth.isMocha() ) {
                Y.doccirrus.api.sdManager.init();
            }
            if( Y.doccirrus.api.dscrmanager ) {
                Y.doccirrus.api.dscrmanager.init();
            }

            Y.doccirrus.socketUtils.initListeners();

        }

        function bootRtcService( io ) {
            var
                dcUtil = require( `${process.cwd()  }/middleware/dc-util.js` ),
                serverCommunications = dcUtil.getServerCommunications(),
                rtcSetup = serverCommunications.easyrtcSetup;
            if( rtcSetup ) {
                let easyrtc = require( 'dc-easyrtc' );
                easyrtc.listen( app, io, {}, function( err, rtc ) {
                    if( err ) {
                        Y.log( 'Can not start easyrtc: ', err, 'error', NAME );
                    } else {
                        rtcSetup.startRtc( Y, rtc );
                    }
                } );
                rtcSetup.setupEasyRTC( Y );
            }
        }

        /**
         * @method bootWorkers
         *
         * When the migration is done, then the workers can be started.
         * Before that there will be noone listening on the port and the haproxy
         * will show the error page (PRC down for maintenance).
         *
         */
        function bootWorkers( callback ) {
            function forkWorker() {
                // MOJ-11332: nWorkers might not be initialized due to race condition in start up (medneo mts)
                if( typeof nWorkers !== 'number' ) {
                    console.log( 'waiting 1s for nWorkers to be initialized' ); //eslint-disable-line
                    setTimeout( forkWorker, 1000 );
                    return;
                }
                console.log( `boot ${nWorkers} workers` ); //eslint-disable-line
                for( let i = 0; i < nWorkers; i++ ) {
                    if( 0 === i ) {
                        let reportingWorker = cluster.fork( {
                            REPORTING_WORKER: true,
                            NUM_DC_WORKER_PROCESSES: nWorkers
                        } );
                        process.env.REPORTING_WORKER_PID = reportingWorker.process.pid;
                    } else {
                        cluster.fork( {NUM_DC_WORKER_PROCESSES: nWorkers} );
                    }
                }

                Y.doccirrus.eventloopmonitor.saveWorkersInformation();
                cluster.on( 'disconnect', function( worker ) {
                    console.log( 'worker ' + worker.process.pid + ' disconnect, force restarting...' ); //eslint-disable-line
                    worker.kill();
                } );

                cluster.on( 'exit', function( worker, code, signal ) {
                    Y.doccirrus.eventloopmonitor.monitorDeadWorker( worker, !!process.env.REPORTING_WORKER_PID );
                    // eslint-disable-next-line no-console
                    console.log(`bootWorkers: worker.id=${worker.id} having worker.process.pid=${worker.process.pid} died. code=${code}, signal = ${signal}. restarting...`);
                    if( `${process.env.REPORTING_WORKER_PID  }` === `${worker.process.pid  }` ) {
                        let reportingWorker = cluster.fork( {REPORTING_WORKER: true} );
                        process.env.REPORTING_WORKER_PID = reportingWorker.process.pid;
                    } else {
                        cluster.fork();
                    }

                } );

                cluster.on( 'message', ( worker, msg ) => {
                    // we want to run mocha tests only on master
                    if( msg.execute === 'runAllMochaSuites' ) {
                        Y.doccirrus.test.mochaRunner.runAllMochaSuites();
                    }
                    if( msg.isConnected ) {
                        Y.doccirrus.eventloopmonitor.redisConnection( worker, msg.isConnected );
                    }
                } );
                callback();
            }

            // Fork workers, if master
            if( cluster.isMaster ) {
                forkWorker();
            } else {
                callback();
            }
        }

        // stop the http server
        function closeServer() {
            Y.log( `closeServer: ${  Y.doccirrus.ipc.whoAmI()}`, 'debug', NAME );
            Y.doccirrus.api.sdManager.close( () => {
                Y.log( `sdManager.close: ${  Y.doccirrus.ipc.whoAmI()}`, 'debug', NAME );
            } );
            serverOptions.server.close();
        }

        function openServer() {
            Y.log( `openServer: ${  Y.doccirrus.ipc.whoAmI()}`, 'debug', NAME );
            boot( serverOptions );
            Y.doccirrus.api.sdManager.init();
        }

        Y.namespace( 'doccirrus' ).server = {
            boot: boot,
            bootIoRunner,
            bootHttp,
            bootWorkers,
            init,
            signalReady,
            //stopWorkers: stopWorkers,
            closeServer,
            openServer
        };

    },
    '0.0.1', {
        requires: [
            'dcauth',
            'activity-schema',
            'dccommunication',
            'SocketUtils',
            'dcsdmanager',
            'xterminal-api'
        ]
    }
);
