/**
 * User: oliversieweke
 * Date: 11.10.18  16:53
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI, ko, moment*/

YUI.add( 'SocketIOMojitBinderIndex', function( Y, NAME ) {
    var KoViewModel = Y.doccirrus.KoViewModel;
    var i18n = Y.doccirrus.i18n;
    var TIMESTAMP_FORMAT_LONG = i18n( 'general.TIMESTAMP_FORMAT_LONG' );
    var redisKeys = {
        workers: 'workers',
        eventLoopBlock: "eventLoopBlock",
        deadWorkers: "deadWorkers"
    };

    function BinderViewModel() {
        BinderViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( BinderViewModel, KoViewModel.getDisposable(), {
        initializer: function BinderViewModel_initializer() {
            var self = this;

            self.warningForDevI18n = i18n( 'SocketIOMojit.warningForDev' );

            self.initObservables();
            self.initClock();
            self.initUserViewer();
            self.initHeartbeatViewer();
            self.refreshSockets();
            self.initEventTests();
            self.getPucStatus();

            self.refreshWorkers();
        },

        destructor: function BinderViewModel_destructor() {
        },

        initObservables: function() {
            var self = this;

            self.pucOnline = ko.observable();
            self.pucConnectedAt = ko.observable();
            self.pucDisconnectedAt = ko.observable();
            self.pucLastReconnectAttempt = ko.observable();

            self.socketViewerReady = ko.observable( false );

            self.sockets = ko.observableArray();
            self.workers = ko.observableArray();
            self.eventLoopIssues = ko.observableArray();
            self.eventLoopTotalIssues = ko.observableArray();
            self.deadWorkers = ko.observableArray();

            self.browserSockets = ko.computed( function() {
                return self.sockets().filter( function( socket ) {
                    return socket.sessionId && (socket.id.indexOf( "serial-to-ethernet" ) === -1);
                } );
            } );

            self.socketIds = ko.computed( function() {
                return self.sockets().map( function( socket ) {
                    return socket.id;
                } );
            } );

            self.browserSocketIds = ko.computed( function() {
                return self.browserSockets().map( function( socket ) {
                    return socket.id;
                } );
            } );

            self.socketsText = ko.computed( function() {
                return 'Sockets ('+self.sockets().length+')';
            } );

            self.workersText = ko.computed( function() {
                let plural = self.workers().length - 1 === 1;
                return 'Running '+self.workers().length+' instances. '+self.workers().length - 1+' '+plural ? 'worker' : 'workers'+' and 1 master with ID = 0';
            } );

            self.eventLoopMessage = ko.computed( function() {
                if ( self.eventLoopTotalIssues().length > 0 ) {
                    let plural = self.eventLoopTotalIssues().length === 1;
                    return 'Found '+self.eventLoopTotalIssues().length+' possible Event Loop Block '+plural ? 'issue' : 'issues'+'. Threshold - 300 miliseconds ';
                } else {
                    return 'There are no Event Loop Block issues. Threshold - 300 miliseconds';
                }
            } );

            self.deadWorkersInfo = ko.computed( function() {
                if ( self.deadWorkers().length > 0 ) {
                    let plural = self.deadWorkers().length === 1;
                    return ''+self.deadWorkers().length+' dead '+plural ? 'worker' : 'workers';
                } else {
                    return 'There are no Dead Instances now';
                }
            } );

            self.socketsSortedByUser = ko.computed( function() {
                return self.sockets().reduce( function( socketsSortedByUser, currentSocket ) {
                    var existingUser, existingSession;

                    currentSocket.text = currentSocket.id === self.activeSocketId() ? ''+currentSocket.id+' - (Active Socket)' : ''+currentSocket.id;

                    existingUser = socketsSortedByUser.find( function( userSocket ) {
                        return (userSocket.user && userSocket.user.id) === (currentSocket.user && currentSocket.user.id);
                    } );

                    if( existingUser ) {
                        existingSession = existingUser.sessions.find( function( session ) {
                            return session.session.sessionId === currentSocket.sessionId;
                        } );

                        if( existingSession ) {
                            existingSession.sockets.push( currentSocket );
                        } else {
                            existingUser.sessions.push( {
                                session: {
                                    sessionId: currentSocket.sessionId,
                                    text: (currentSocket.user && currentSocket.user.sessionId) === self.sessionId() ? ''+currentSocket.user && currentSocket.user.sessionId+' - (Current Session)' : ''+currentSocket.user && currentSocket.user.sessionId
                                },
                                sockets: [currentSocket]
                            } );
                        }
                    } else {
                        socketsSortedByUser.push( {
                            user: Object.assign( currentSocket.user || {identityId: null, sessionId: null}, {
                                text: (currentSocket.user && currentSocket.user.identityId) === self.identityId() ? ''+currentSocket.user && currentSocket.user.id+' - (Current User)' : ''+currentSocket.user && currentSocket.user.id
                            } ),
                            sessions: [
                                {

                                    session: {
                                        sessionId: currentSocket.sessionId,
                                        text: (currentSocket.user && currentSocket.user.sessionId) === self.sessionId() ? ''+currentSocket.user && currentSocket.user.sessionId+' - (Current Session)' : ''+currentSocket.user && currentSocket.user.sessionId
                                    },
                                    sockets: [currentSocket]
                                }]
                        } );
                    }
                    return socketsSortedByUser;
                }, [] );
            } );
        },

        getPucStatus: function() {
            var self = this;

            Y.doccirrus.communication.on( {
                event: 'pucConnectionStatus',
                done: function( res ) {
                    var pucConnectionStatus = res && Array.isArray( res.data ) && res.data[0];

                    if(pucConnectionStatus) {
                        if( pucConnectionStatus.isPucOnline ) {
                            self.pucOnline(true);

                            // Must always be there in this case
                            self.pucConnectedAt( moment(pucConnectionStatus.connectedAt).format("DD.MM.YYYY HH:mm:ss") );
                        } else {
                            self.pucOnline(false);

                            if( pucConnectionStatus.disconnectedAt ) {
                                self.pucDisconnectedAt( moment(pucConnectionStatus.disconnectedAt).format("DD.MM.YYYY HH:mm:ss") );
                            }

                            if( pucConnectionStatus.lastReconnectAttempt ) {
                                self.pucLastReconnectAttempt( moment(pucConnectionStatus.lastReconnectAttempt).format("DD.MM.YYYY HH:mm:ss") );
                            }
                        }
                    }
                }
            } );

            Y.doccirrus.communication.emit( 'getPucConnectionStatus');
        },

        initClock: function initClock() {
            var self = this;

            self.pageLoad = ko.observable( moment() );
            self.currentTime = ko.observable( moment( new Date() ).format( 'HH:mm:ss' ) );
            self.timeSincePageLoad = ko.computed( function() {
                return Math.max( Math.round( moment.duration( moment( self.currentTime(), 'HH:mm:ss' ).diff( self.pageLoad() ) ).asSeconds() ), 0 );
            } );
            synchronizeTime();

            function synchronizeTime() {
                setTimeout( function updateTime() {
                    self.currentTime( moment( new Date() ).format( 'HH:mm:ss' ) );
                    synchronizeTime();
                }, 1000 );
            }
        },

        initUserViewer: function initUserViewer() {
            var self = this;

            self.sessionId = ko.observable();
            self.identityId = ko.observable();
            self.activeSocketId = ko.observable();

            self.refreshUser = function() {
                Promise.resolve( Y.doccirrus.jsonrpc.api.communication.getUser() )
                    .then( function( res ) {
                        var user = res.data;
                        self.identityId( user && user.identityId );
                        self.sessionId( user && user.sessionId );
                    } )
                    .catch( function( err ) {
                        console.log( err ); // eslint-disable-line
                        Y.log( 'Error in getting user: '+err.stack || err+'.', 'error', NAME );
                    } );

                self.activeSocket = ko.observable( Y.doccirrus.communication.getSocket() );
                self.activeSocketId( self.activeSocket().id );
                console.log( self.activeSocket() ); // eslint-disable-line
            };

            Y.doccirrus.communication.on( {
                event: 'connect',
                done: function() {
                    self.activeSocket = ko.observable( Y.doccirrus.communication.getSocket() );
                    self.activeSocketId( self.activeSocket().id );
                }
            } );

            self.refreshUser();
        },

        requestServerSockets: function requestServerSockets() {
            var self = this;

            return Promise.resolve( Y.doccirrus.jsonrpc.api.communication.getAllSockets() )
                .then( function( res ) {
                    console.log( res.data ); // eslint-disable-line
                    self.sockets( res.data );
                } )
                .catch( function( err ) {
                    console.log( err ); // eslint-disable-line
                    Y.log( 'Error in getting socket list: '+err.stack || err+'.', 'error', NAME );
                } );
        },

        requestWorkersCount: function requestWorkersCount() {
            var self = this;

            return Promise.resolve( Y.doccirrus.jsonrpc.api.cacheUtils.getData( { key: redisKeys.workers } ) )
                .then( function( res ) {
                    Y.log( 'Received '+res.data+' workers', 'info', NAME );
                    var data = [];
                    res.data.forEach( function( d ) {
                        data.push( {
                            id: d.id,
                            redisConnection: self.getTextCssFromValidation( true ),
                            updateTime: moment( d.updateTime ).format( TIMESTAMP_FORMAT_LONG ),
                            blockCount: d.blockCount
                        } );
                    } );

                    self.workers( data);
                } )
                .catch( function( err ) {
                    Y.log( 'Error while tried to get workers count from redis: '+err, 'error', NAME );
                } );
        },


        requestEventLoopInformation: function requestEventLoopInformation() {
            var self = this;

            return Promise.resolve( Y.doccirrus.jsonrpc.api.cacheUtils.getData( { key: redisKeys.eventLoopBlock} ) )
                .then( function( res ) {
                    Y.log( 'Received information about blocked event loop: '+res.data, 'info', NAME );
                    var data = [];
                    res.data.forEach( function( d ) {
                        data.push( {
                            workerId: d.workerId,
                            timestamp: moment( d.timestamp ).format( TIMESTAMP_FORMAT_LONG ),
                            blockTime: d.blockTime.toFixed(3)
                        } );
                    } );
                    self.eventLoopIssues( data.slice( 0, 25 ) );
                    self.eventLoopTotalIssues( data );
                } )
                .catch( function( err ) {
                    Y.log( 'Error while tried to receive information about blocked event loop: '+err, 'error', NAME );
                } );
        },

        requestDeadWorkersInformation: function requestDeadWorkersInformation() {
            var self = this;

            return Promise.resolve( Y.doccirrus.jsonrpc.api.cacheUtils.getData( { key: redisKeys.deadWorkers} ) )
                .then( function( res ) {
                    Y.log( 'Received information about dead workers: '+res.data, 'info', NAME );
                    var data = [];
                    res.data.forEach( function( d ) {
                        data.push( {
                            worker: d.worker,
                            timestamp: moment( d.timestamp ).format( TIMESTAMP_FORMAT_LONG ),
                            isReportingWorker: d.isReportingWorker || '-',
                            pid: d.pid
                        } );
                    } );
                    self.deadWorkers( data.slice( 0, 25 ) );
                } )
                .catch( function( err ) {
                    Y.log( 'Error while tried to receive information about dead workers: '+err, 'error', NAME );
                } );
        },

        requestClientEventHandlers: function requestClientEventHandlers() {
            var self = this;

            Y.doccirrus.communication.on( {
                event: 'collectedEventHandlers',
                done: function( res ) {
                    self.sockets( self.sockets().map( function( socket ) {
                        if( socket.id === (res && res.data[0] && res.data[0].socketId) ) {
                            socket.clientEventHandlers = res.data[0].clientEventHandlers;
                        }
                        return socket;
                    } ) );
                }
            } );

            return Promise.resolve( Y.doccirrus.jsonrpc.api.communication.getClientEventHandlers() )
                .catch( function( err ) {
                    console.log( err ); // eslint-disable-line
                    Y.log( 'Error in getting client event handlers: '+err.stack || err+'.', 'error', NAME );
                } );
        },

        initSocketViewer: function getActiveSocket() {
            var self = this;

            self.exampleEventHandlersVisibile = ko.observable( false );
            self.onClickExample = function() {
                self.exampleEventHandlersVisibile( !self.exampleEventHandlersVisibile() );
            };

            self.exampleServerEventHandlersVisible = ko.observable( false );
            self.onClickServerEventHandlersExample = function() {
                self.exampleServerEventHandlersVisible( !self.exampleServerEventHandlersVisible() );
                if( self.exampleServerEventHandlersVisible() ) {
                    self.exampleClientEventHandlersVisible( false );
                    self.exampleMongoSubscriptionsVisible( false );
                }
            };
            self.exampleClientEventHandlersVisible = ko.observable( false );
            self.onClickClientEventHandlersExample = function() {
                self.exampleClientEventHandlersVisible( !self.exampleClientEventHandlersVisible() );
                if( self.exampleClientEventHandlersVisible() ) {
                    self.exampleServerEventHandlersVisible( false );
                    self.exampleMongoSubscriptionsVisible( false );
                }
            };
            self.exampleMongoSubscriptionsVisible = ko.observable( false );
            self.onClickMongoSubscriptionsExample = function() {
                self.exampleMongoSubscriptionsVisible( !self.exampleMongoSubscriptionsVisible() );
                if( self.exampleMongoSubscriptionsVisible() ) {
                    self.exampleClientEventHandlersVisible( false );
                    self.exampleServerEventHandlersVisible( false );
                }
            };

            self.sockets().forEach( function( socket ) {
                self[''+socket.id+'ClientEventHandlersVisible'] = ko.observable( false );
                self['onClickClientEventHandlers'+socket.id] = function() {
                    self[''+socket.id+'ClientEventHandlersVisible']( !self[''+socket.id+'ClientEventHandlersVisible']() );
                    if( self[''+socket.id+'ClientEventHandlersVisible']() ) {
                        self[''+socket.id+'ServerEventHandlersVisible']( false );
                        self[''+socket.id+'MongoSubscriptionsVisible']( false );
                    }
                };
                self[''+socket.id+'ServerEventHandlersVisible'] = ko.observable( false );
                self['onClickServerEventHandlers'+socket.id] = function() {
                    self[''+socket.id+'ServerEventHandlersVisible']( !self[''+socket.id+'ServerEventHandlersVisible']() );
                    if( self[''+socket.id+'ServerEventHandlersVisible']() ) {
                        self[''+socket.id+'ClientEventHandlersVisible']( false );
                        self[''+socket.id+'MongoSubscriptionsVisible']( false );
                    }
                };
                self[''+socket.id+'MongoSubscriptionsVisible'] = ko.observable( false );
                self['onClickMongoSubscriptions'+socket.id] = function() {
                    self[''+socket.id+'MongoSubscriptionsVisible']( !self[''+socket.id+'MongoSubscriptionsVisible']() );
                    if( self[''+socket.id+'MongoSubscriptionsVisible']() ) {
                        self[''+socket.id+'ClientEventHandlersVisible']( false );
                        self[''+socket.id+'ServerEventHandlersVisible']( false );
                    }
                };
            } );

            self.socketViewerReady( true );
        },

        refreshSockets: function refreshSockets() {
            var self = this;

            self.socketViewerReady( false );

            self.requestServerSockets()
                .then( self.requestClientEventHandlers.bind( self ) )
                .then( self.initSocketViewer.bind( self ) );
        },

        refreshWorkers: function refreshWorkers() {
            var self = this;

            self.requestWorkersCount();
            self.requestEventLoopInformation();
            self.requestDeadWorkersInformation();
        },

        initHeartbeatViewer: function initHeartbeatViewer() {
            var self = this;

            self.lastPing = ko.observable();
            self.previousPing = ko.observable();
            self.lastPong = ko.observable();
            self.previousPong = ko.observable();
            self.lastDCHeartbeat = ko.observable();
            self.previousDCHeartbeat = ko.observable();

            // Heartbeat Listeners -----------------------------------------------------------------------------------------
            // Socket IO
            Y.doccirrus.communication.on( {
                event: 'ping',
                done: function() {
                    if( self.lastPing() ) {
                        self.previousPing( self.lastPing() );
                    }
                    self.lastPing( moment() );
                }
            } );
            Y.doccirrus.communication.on( {
                event: 'pong',
                done: function() {
                    if( self.lastPong() ) {
                        self.previousPong( self.lastPong() );
                    }
                    self.lastPong( moment() );
                }
            } );
            // Doc Cirrus
            Y.doccirrus.communication.on( {
                event: 'HEARTBEAT_1M_EVENT',
                done: function() {
                    if( self.lastPong() ) {
                        self.previousDCHeartbeat( self.lastDCHeartbeat() );
                    }
                    self.lastDCHeartbeat( moment() );
                }
            } );

            // Computed Observables ----------------------------------------------------------------------------------------
            // Socket IO
            self.timeBeforePreviousPing = ko.computed( function() {
                return self.lastPing() && self.previousPing() && self.lastPing().diff( self.previousPing(), 'seconds' );
            } );
            self.timeBeforePreviousPong = ko.computed( function() {
                return self.lastPong() && self.previousPong() && self.lastPong().diff( self.previousPong(), 'seconds' );
            } );
            self.lastPingText = ko.computed( function() {
                return self.lastPing() && self.lastPing().format( 'HH:mm:ss.SS' ) || '-';
            } );
            self.lastPongText = ko.computed( function() {
                return self.lastPong() && self.lastPong().format( 'HH:mm:ss.SS' ) || '-';
            } );
            self.timeBeforePreviousPingText = ko.computed( function() {
                return self.timeBeforePreviousPing() || '-';
            } );
            self.timeBeforePreviousPongText = ko.computed( function() {
                return self.timeBeforePreviousPong() || '-';
            } );
            // Doc Cirrus
            self.timeBeforePreviousDCHeartbeat = ko.computed( function() {
                return self.lastDCHeartbeat() && self.previousDCHeartbeat() && self.lastDCHeartbeat().diff( self.previousDCHeartbeat(), 'seconds' );
            } );
            self.lastDCHeartbeatText = ko.computed( function() {
                return self.lastDCHeartbeat() && self.lastDCHeartbeat().format( 'HH:mm:ss.SS' ) || "-";
            } );
            self.timeBeforePreviousDCHeartbeatText = ko.computed( function() {
                return self.timeBeforePreviousDCHeartbeat() || "-";
            } );

            // Validators --------------------------------------------------------------------------------------------------
            // Socket IO
            self.ioPingValidator = ko.computed( function() {
                ko.unwrap( self.timeSincePageLoad );
                if( moment() - self.lastPing() < 27000 ) {
                    return true;
                } else if( moment() - self.pageLoad() < 27000 ) {
                    return null;
                } else {
                    return false;
                }
            } );
            self.ioPingValidationCss = ko.computed( function() {
                return self.getBackgroundCssFromValidation( self.ioPingValidator() );
            } );
            self.ioPongValidator = ko.computed( function() {
                ko.unwrap( self.timeSincePageLoad );
                if( moment() - self.lastPong() < 27000 ) {
                    return true;
                } else if( moment() - self.pageLoad() < 27000 ) {
                    return null;
                } else {
                    return false;
                }
            } );
            self.ioPongValidationCss = ko.computed( function() {
                return self.getBackgroundCssFromValidation( self.ioPongValidator() );
            } );

            // PUC connection status
            self.pucConnectionStatusTextCss = ko.computed( function() {
                return self.getTextCssFromValidation( self.pucOnline() );
            } );

            self.pucConnectionStatusBgCss = ko.computed( function() {
                return self.getBackgroundCssFromValidation( self.pucOnline() );
            } );

            // Doc Cirrus
            self.DCHeartbeatValidator = ko.computed( function() {
                ko.unwrap( self.timeSincePageLoad );
                if( moment() - self.lastDCHeartbeat() < 62000 ) {
                    return true;
                } else if( moment() - self.pageLoad() < 62000 ) {
                    return null;
                } else {
                    return false;
                }
            } );
            self.DCHeartbeatValidationCss = ko.computed( function() {
                return self.getBackgroundCssFromValidation( self.DCHeartbeatValidator() );
            } );

            // General
            self.heartbeatValidator = ko.computed( function() {
                var validations = [
                    self.ioPingValidator(),
                    self.ioPongValidator(),
                    self.DCHeartbeatValidator()
                ];

                if( validations.indexOf( false ) > -1 ) {
                    return false;
                } else if( validations.indexOf( null ) > -1 ) {
                    return null;
                } else {
                    return true;
                }
            } );
            self.heartbeatValidationCss = ko.computed( function() {
                return self.getTextCssFromValidation( self.heartbeatValidator() );
            } );
        },

        initEventTests: function initEventTests() {
            var self = this;
            var methods = ['emitEventForUser', 'emitEventForSession', 'emitEventForRoom', 'emitEventForAll', 'emitNamespaceEvent'];
            self.methods = ko.observable( methods );

            methods.forEach( function( method ) {
                self[''+method+'ResponsiveSockets'] = ko.observableArray();
                self[''+method+'ResponsiveCount'] = ko.observable();
                self[''+method+'ResponsiveCountText'] = ko.computed( function() {
                    var responsiveSocketsCount = self[''+method+'ResponsiveSockets']().length;

                    if( self.pageLoad() < 12000 ) {
                        return '-';
                    } else {
                        return ''+responsiveSocketsCount+' / '+self.browserSockets().length;
                    }
                } );

                self[''+method+'UnresponsiveSockets'] = ko.computed( function() {
                    if( self.pageLoad() < 12000 ) {
                        return [];
                    } else {
                        return self.browserSocketIds().filter( function( socketId ) {
                            return self[''+method+'ResponsiveSockets']().indexOf( socketId ) === -1;
                        } );
                    }
                } );

            } );

            Y.doccirrus.communication.on( {
                event: 'collectedReceivedTestEvents',
                done: function( res ) {
                    var method = res && res.data && res.data[0] && res.data[0].method;
                    var socketId = res && res.data && res.data[0] && res.data[0].socketId;
                    var relevantSocket = res && res.data && res.data[0] && res.data[0].activeSocketId === self.activeSocketId() || res && res.data && res.data.activeSocketId === self.activeSocketId();

                    if( method && socketId && relevantSocket ) {
                        self[''+method+'ResponsiveSockets'].push( socketId );
                    }
                }
            } );

            testEventsContinuously();

            function testEventsContinuously() {
                setTimeout( function updateTime() {

                    methods.forEach( function( method ) {
                        self[''+method+'ResponsiveSockets']( [] );
                    } );

                    Promise.resolve( Y.doccirrus.jsonrpc.api.communication.emitSocketTestEvents( {
                        activeSocketId: self.activeSocketId(),
                        sockets: self.sockets()
                    } ) )
                        .catch( function( err ) {
                            console.log( err ); // eslint-disable-line
                            Y.log( 'Error in emitting socket test events: '+err.stack || err+'.', 'error', NAME );
                        } );
                    testEventsContinuously();
                }, 10000 );
            }

            methods.forEach( function( method ) {
                self[''+method+'Last'] = ko.observable();
                self[''+method+'Previous'] = ko.observable();
                self[''+method+'Data'] = ko.observable();

                Y.doccirrus.communication.on( {
                    event: ''+method+'-Test',
                    done: function( response ) {
                        var testDataPresent = response && response.data && response.data[0] && response.data[0].test === "TEST" || response && response.data && response.data.test === "TEST";
                        var relevantSocket = response && response.data && response.data[0] && response.data[0].activeSocketId === self.activeSocketId() || response && response.data && response.data.activeSocketId === self.activeSocketId();

                        if( relevantSocket || !testDataPresent ) {
                            if( self[''+method+'Last'] ) {
                                self[''+method+'Previous']( self[''+method+'Last']() );
                            }
                            self[''+method+'Last']( moment() );
                            self[''+method+'Data']( testDataPresent );
                        }

                    }
                } );

                self[''+method+'TimeBeforePrevious'] = ko.computed( function() {
                    return self[''+method+'Last']() && self[''+method+'Previous']() && self[''+method+'Last']().diff( self[''+method+'Previous'](), 'seconds' );
                } );

                self[''+method+'LastText'] = ko.computed( function() {
                    return self[''+method+'Last']() && self[''+method+'Last']().format( 'HH:mm:ss.SS' ) || '-';
                } );

                self[''+method+'TimeBeforePreviousText'] = ko.computed( function() {
                    return self[''+method+'TimeBeforePrevious']() || '-';
                } );

                self[''+method+'Validator'] = ko.computed( function() {
                    ko.unwrap( self.timeSincePageLoad );
                    if( moment() - self[''+method+'Last']() < 12000 && self[''+method+'Data']() ) {
                        return true;
                    } else if( moment() - self.pageLoad() < 12000 ) {
                        return null;
                    } else {
                        return false;
                    }
                } );
                self[''+method+'DataText'] = ko.computed( function() {
                    if( self[''+method+'Validator']() === null ) {
                        return '-';
                    } else {
                        return self[''+method+'Data']() ? 'Yes' : 'No';
                    }
                } );
                self[''+method+'Css'] = ko.computed( function() {
                    return self.getBackgroundCssFromValidation( self[''+method+'Validator']() );
                } );
            } );

            self.eventTestsValidator = ko.computed( function() {
                var validations = [];

                methods.forEach( function( method ) {
                    validations.push( self[''+method+'Validator']() );
                } );

                if( validations.indexOf( false ) > -1 ) {
                    return false;
                } else if( validations.indexOf( null ) > -1 ) {
                    return null;
                } else {
                    return true;
                }
            } );
            self.eventTestsValidationCss = ko.computed( function() {
                return self.getTextCssFromValidation( self.eventTestsValidator() );
            } );

        },

        getBackgroundCssFromValidation: function getBackgroundCss( validation ) {
            return validation === true ? 'bg-success' :
                validation === null ? 'bg-warning' :
                    'bg-danger';
        },

        getTextCssFromValidation: function getBackgroundCss( validation ) {
            return validation === true ? 'text-success' :
                validation === null ? 'text-warning' :
                    'text-danger';
        }

    }, {
        ATTRS: {}
    } );

    Y.namespace( 'mojito.binders' )[NAME] = {
        init: function SocketIOMojitBinderIndex_init( mojitProxy ) {
            this.mojitProxy = mojitProxy;
        },
        bind: function SocketIOMojitBinderIndex_bind( node ) {
            self.binderViewModel = new BinderViewModel();

            ko.applyBindings( self.binderViewModel, node.getDOMNode() );
        },
        onRefreshView: function SocketIOMojitBinderIndex_onRefreshView() {
        }
    };

}, '0.0.1', {
    requires: [
        'oop',
        'mojito-client',
        'doccirrus',
        'JsonRpcReflection-doccirrus',
        'KoViewModel',
        'dccommunication-client'
    ]
} );
