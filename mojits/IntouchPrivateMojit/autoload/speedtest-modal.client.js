/**
 * User: pi
 * Date: 10/06/15  9:30
 * (c) 2015, Doc Cirrus GmbH, Berlin
 *
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'DCSpeedTestModal', function( Y, NAME ) {

        var i18n = Y.doccirrus.i18n,
            SPEED_TEST = i18n( 'top_menu.SPEED_TEST' ),
            BTN_REPEAT = i18n( 'IntouchPrivateMojit.speedtestJS.button.REPEAT' ),
            GOOD_SPEED = 900,
            NORMAL_SPEED = 400,
            RETEST_INTERVAL = 1000,
            AJAX_DIFF = 400,
            MAX_ITERATION = 15,
            ANIMATION_MAX = 4;

        function SpeedTestModel( easyrtc, modal ) {
            var self = this;
            Y.doccirrus.uam.ViewModel.mixDisposable( self );
            self.serverTestI18n = i18n('IntouchPrivateMojit.speedtest.title.SERVER_TEST');
            self.socketTestI18n = i18n('IntouchPrivateMojit.speedtest.title.SOCKET_TEST');
            self.participantsI18n = i18n('IntouchPrivateMojit.speedtest.title.PARTICIPANTS');
            self.intervals = [];
            self.isSocketTest = ko.observable();
            self.serverTest = ko.observable();
            self.easyrtc = easyrtc;
            self.animate = ko.observable();
            self.running = ko.observable();

            self._addDisposable( self.running.subscribe( function( running ) {
                var repeatBtn = modal.getButton( 'REPEAT' ).button;
                if( running ) {
                    repeatBtn.disable();
                } else {
                    repeatBtn.enable();
                }
            } ) );
            if( easyrtc ) {
                self.initSocketSpeedTest( easyrtc );
            } else {
                self.initAjaxSpeedTest();
            }
            self.startIntervals();

        }

        SpeedTestModel.prototype = {
            intervals: null,
            serverSpeedStatistics: null,
            const: {
                GOOD_CONNECTION: 1,
                NORMAL_CONNECTION: 0,
                BAD_CONNECTION: -1,
                BECOMING_CONNECTED: 1
            },
            getAvaregeSpeed: function( stats ) {
                var average = 0;
                stats.forEach( function( speed ) {
                    average += speed;
                } );
                average = average / MAX_ITERATION;
                return average;

            },
            mapSpeed: function( speed, isAjax ) {
                var self = this,
                    good = GOOD_SPEED,
                    normal = NORMAL_SPEED;
                if( isAjax ) {
                    good = good - AJAX_DIFF;
                    normal = normal - (AJAX_DIFF / 2);
                }
                if( good <= speed ) {
                    return self.const.GOOD_CONNECTION;
                } else if( normal <= speed ) {
                    return self.const.NORMAL_CONNECTION;
                } else {
                    return self.const.BAD_CONNECTION;
                }
            },
            updateStatus: function( config, callback ) {
                var self = this,
                    result = self.const.BAD_CONNECTION,
                    easyrtc = config.easyrtc,
                    easyrtcId = config.easyrtcId,
                    status = easyrtc.getConnectStatus( easyrtcId );
                switch( status ) {
                    case easyrtc.NOT_CONNECTED:
                        callback( self.const.BAD_CONNECTION );
                        break;
                    case easyrtc.BECOMING_CONNECTED:
                        callback( self.const.BECOMING_CONNECTED );
                        break;
                    case easyrtc.IS_CONNECTED:
                        easyrtc.getPeerStatistics( easyrtcId, function( id, stats ) {
                            if( stats ) {
                                if( easyrtc.isFireFox() ) {
                                    if( stats['outboundrtp_video.isRemote'] && 0 !== stats['outboundrtp_video.packetsSent'] ) {
                                        result = self.const.GOOD_CONNECTION;
                                    }
                                } else {
                                    if( stats.bweforvideo && stats.bweforvideo.googTransmitBitrate ) {
                                        result = self.const.GOOD_CONNECTION;
                                    }
                                }
                            }
                            callback( result );
                        } );

                }

            },

            initSocketSpeedTest: function( easyrtc ) {
                var self = this,
                    connectedUsers = easyrtc.getConnectedUsers();

                self.socketStatistics = {
                    server: []
                };
                self.isSocketTest( true );
                self.connected = connectedUsers.map( function( easyrtcId ) {
                    return {
                        name: easyrtc.idToName( easyrtcId ),
                        status: ko.observable(),
                        refresh: function() {
                            var _self = this;
                            self.updateStatus( {
                                easyrtc: easyrtc,
                                easyrtcId: easyrtcId
                            }, function( status ) {
                                _self.status( status );
                            } );

                        }
                    };
                } );
                self.updateConnectedUsers();
                self.socketStatus = ko.observable();
                self.addInterval( {
                    intervalFunc: self.socketSpeedTestFunc,
                    stats: self.socketStatistics
                } );

            },

            updateConnectedUsers: function() {
                var self = this;
                self.connected.forEach( function( user ) {
                    user.refresh();
                } );
            },
            socketSpeedTestFunc: function( isLast ) {
                var self = this;
                //test participants
                self.updateConnectedUsers();
                //test socket
                Y.doccirrus.communication.testSpeed( {
                    socket: self.easyrtc.webSocket,
                    callback: function( err, speed ) {
                        self.socketStatus( 'timeout' !== err );
                        self.serverTest( self.mapSpeed( speed ) );
                        self.socketStatistics.server.push( speed );
                        if( isLast ) {
                            self.serverTest( self.mapSpeed( self.getAvaregeSpeed( self.socketStatistics.server ) ) );
                        } else {
                            self.serverTest( self.mapSpeed( speed ) );
                        }

                    }
                } );
            },

            initAjaxSpeedTest: function() {
                var self = this;
                self.isSocketTest( false );
                self.ajaxStatistics = {
                    server: []
                };
                self.addInterval( {
                    intervalFunc: self.ajaxSpeedTestFunc,
                    stats: self.ajaxStatistics
                } );
            },
            ajaxSpeedTestFunc: function( isLast ) {
                var self = this;
                Y.doccirrus.comctl.testSpeed( function( err, speed ) {
                    if ( err ) {
                        Y.log( 'Error during speed test: ' + JSON.stringify( err ), 'warn', NAME );
                        //  continue anyway, best effort
                    }
                    self.ajaxStatistics.server.push( speed );
                    if( isLast ) {
                        self.serverTest( self.mapSpeed( self.getAvaregeSpeed( self.ajaxStatistics.server ), true ) );
                    } else {
                        self.serverTest( self.mapSpeed( speed, true ) );
                    }
                } );
            },

            addInterval: function( config ) {
                var self = this,
                    intervalId = config.intervalId,
                    intervalFunc = config.intervalFunc,
                    stats = config.stats || {};

                self.intervals.push( {
                    id: intervalId,
                    func: intervalFunc,
                    stats: stats
                } );
            },
            clearIntervals: function() {
                this.intervals.forEach( function( interval ) {
                    clearInterval( interval.id );
                } );
            },
            startIntervals: function() {
                var self = this;
                self.animate( true );
                self.running( true );
                self.intervals.forEach( function( interval ) {
                    var iterationNumber = 0;
                    Y.Object.each( interval.stats, function( stat ) {
                        stat.length = 0;
                    } );
                    interval.id = setInterval( function() {
                        iterationNumber++;
                        if( ANIMATION_MAX === iterationNumber ) {
                            self.animate( false );
                        }
                        if( 'function' === typeof interval.func ) {
                            interval.func.call( self, MAX_ITERATION === iterationNumber );
                        }
                        if( MAX_ITERATION <= iterationNumber ) {
                            clearInterval( interval.id );
                            iterationNumber = 0;
                            self.running( false );
                        }
                    }, RETEST_INTERVAL );
                } );
            },
            restartIntervals: function() {
                var self = this;
                self.clearIntervals();
                self.startIntervals();
            }
        };

        function SpeedTestModal() {

        }

        SpeedTestModal.prototype.showDialog = function( easyrtc ) {
            function show() {
                var modal,
                    node = Y.Node.create( '<div></div>' ),
                    speedTestModel;

                YUI.dcJadeRepository.loadNodeFromTemplate(
                    'speedtest_modal',
                    'IntouchPrivateMojit',
                    {},
                    node,
                    function() {
                        modal = new Y.doccirrus.DCWindow( {
                            className: 'DCWindow-Appointment',
                            bodyContent: node,
                            title: SPEED_TEST,
                            icon: Y.doccirrus.DCWindow.ICON_INFO,
                            width: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                            centered: true,
                            modal: true,
                            render: document.body,
                            buttons: {
                                header: ['close'],
                                footer: [
                                    {
                                        name: 'REPEAT',
                                        label: BTN_REPEAT,
                                        action: function() {
                                            speedTestModel.restartIntervals();
                                        }
                                    },
                                    Y.doccirrus.DCWindow.getButton( 'OK', {
                                        isDefault: true
                                    } )
                                ]
                            },
                            after: {
                                destroy: function() {

                                    if( speedTestModel ) {
                                        speedTestModel.clearIntervals();
                                        if( speedTestModel._dispose ) {
                                            speedTestModel._dispose();
                                        }
                                    }
                                }
                            }
                        } );
                        speedTestModel = new SpeedTestModel( easyrtc, modal );
                        ko.applyBindings( speedTestModel, node.getDOMNode().querySelector( '#speedTestModel' ) );
                    }
                );
            }

            show();
        };

        Y.namespace( 'doccirrus.modals' ).speedTestModal = new SpeedTestModal();

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'dccommunication-client',
            'dc-comctl',
            'dcviewmodel'
        ]
    }
);