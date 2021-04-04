/**
 * User: pi
 * Date: 23/07/15  15:30
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*global fun:true, ko, async, moment*/
/*exported fun */
fun = function _fn( Y, NAME ) {
    'use strict';

    var deviceDataModel,
        i18n = Y.doccirrus.i18n,
        TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),
        SUCCESS_MESSAGE = i18n( 'PatPortalMojit.devicesJS.message.SUCCESS_MESSAGE' ),
        FAIL_MESSAGE = Y.Lang.sub( i18n( 'PatPortalMojit.devicesJS.message.FAIL_MESSAGE' ), {linebreak: '<br>'} ),
        ACTION_NOTHING_TEXT = i18n( 'PatPortalMojit.devicesJS.title.ACTION_NOTHING' ),
        ACTION_SEND_DAY_TEXT = i18n( 'PatPortalMojit.devicesJS.title.ACTION_SEND_DAY' ),
        ACTION_SEND_ALL_TEXT = i18n( 'PatPortalMojit.devicesJS.title.ACTION_SEND_ALL' ),
        MANUAL_UPDATE = i18n( 'PatPortalMojit.devicesJS.title.MANUAL_UPDATE' ),
        PREVIEW_TITLE = i18n( 'PatPortalMojit.devicesJS.title.PREVIEW' ),
        PREVIEW_TEXT = i18n( 'PatPortalMojit.devicesJS.text.PREVIEW' );

    function showError( error ) {
        Y.log( 'Can not proccess action. error' + JSON.stringify( error ), 'error', NAME );
        Y.doccirrus.DCWindow.notice( {
            type: 'info',
            //message: error && error.message,
            message: FAIL_MESSAGE,
            window: {
                width: Y.doccirrus.DCWindow.SIZE_SMALL
            }
        } );
    }

    function DeviceDataModel( config ) {
        var self = this,
            urlRegUP = 'https://jawbone.com/auth/oauth2/auth?',
            asyncProcesses = [],
            practices = [],
            ACTION_NOTHING = Object.freeze( {
                id: 'NOTHING',
                text: ACTION_NOTHING_TEXT
            } ),
            ACTION_SEND_DAY = Object.freeze( {
                id: 'SEND_DAY',
                text: ACTION_SEND_DAY_TEXT
            } ),
            ACTION_SEND_ALL = Object.freeze( {
                id: 'SEND_ALL',
                text: ACTION_SEND_ALL_TEXT
            } ),
            actions = Y.doccirrus.schemas.deviceconfiguration.types.Update_E.list.filter( function( data ) {
                return Y.doccirrus.schemas.deviceconfiguration.updateStatus.NEVER !== data.val;
            } ).map( function( data ) {
                return {
                    id: data.val,
                    text: data.i18n
                };
            } );

        function handleError( error ) {
            if( error && 401 === error.code ) {
                self.hasJawboneToken( false );
            } else {
                showError( error );
            }
        }

        function handleSuccess() {
            Y.doccirrus.DCWindow.notice( {
                type: 'info',
                message: SUCCESS_MESSAGE
            } );
        }

        function addAsync( process ) {
            asyncProcesses.push( process );
        }

        function updateActionList( deviceConfigData ) {
            if( deviceConfigData && deviceConfigData.lastUpdate && -1 === actions.indexOf( ACTION_SEND_ALL ) ) {
                actions.splice( 1, 0, ACTION_SEND_ALL );
            }
            if( !(deviceConfigData && deviceConfigData.lastUpdate) && -1 !== actions.indexOf( ACTION_SEND_ALL ) ) {
                actions.splice( actions.indexOf( ACTION_SEND_ALL ), 1 );
            }
        }

        function getDeviceConfigData( customerIdPrac ) {
            if( !customerIdPrac ) {
                return;
            }
            Y.doccirrus.jsonrpc.api.patientportal.getDeviceConfigData( {
                query: {
                    customerIdPrac: customerIdPrac
                }
            } )
                .done( function( response ) {
                    var data = response.data && response.data[0];
                    updateActionList( data );
                    if( data ) {
                        updatePracticeInfo( {
                            customerIdPrac: customerIdPrac,
                            update: data.update,
                            lastUpdate: data.lastUpdate
                        } );
                        if( Y.doccirrus.schemas.deviceconfiguration.updateStatus.NEVER !== data.update ) {
                            self.action( data.update );
                        } else {
                            self.action( ACTION_NOTHING.id );
                        }
                        self.update( data.update );
                        self.lastUpdate( data.lastUpdate );
                    } else {
                        self.action( ACTION_NOTHING.id );

                    }
                } );
        }

        function lockView( lock ) {
            var
                elem = '#jawbonePanel';
            self.executeBtn.disabled( lock );
            self.preview.busy( lock );
            if( lock ) {
                Y.doccirrus.utils.showLoadingMask( elem );
            } else {
                Y.doccirrus.utils.hideLoadingMask( elem );
            }
        }

        function sendJawboneDataPRC( startTime ) {
            var practiceData = ko.utils.peekObservable( self.practice ),
                update = ko.utils.peekObservable( self.update );
            lockView( true );
            Y.doccirrus.jsonrpc.api.patientportal.sendJawboneDataPRC( {
                data: {
                    customerIdPrac: practiceData && practiceData.customerIdPrac,
                    update: update,
                    startTime: startTime
                }
            } )
                .done( handleSuccess )
                .fail( function( error ) {
                    handleError( error );
                } )
                .always( function() {
                    lockView( false );
                    getDeviceConfigData( practiceData && practiceData.customerIdPrac );
                } );

        }

        function upsertDeviceConfiguration() {
            var practiceData = ko.utils.peekObservable( self.practice ),
                update = ko.utils.peekObservable( self.update );

            lockView( true );
            Y.doccirrus.jsonrpc.api.deviceconfiguration.upsert( {
                query: {
                    deviceType: 'JAWBONE',
                    customerIdPrac: practiceData && practiceData.customerIdPrac
                },
                data: {
                    type: 'JAWBONE',
                    update: update
                }
            } )
                .done( handleSuccess )
                .fail( function( error ) {
                    handleError( error );
                } )
                .always( function() {
                    lockView( false );
                    getDeviceConfigData( practiceData && practiceData.customerIdPrac );
                } );
        }

        function createPracticeInfo( practice ) {
            var result = {
                name: practice.coname,
                customerIdPrac: practice.dcCustomerNo,
                update: ko.observable(),
                lastUpdate: ko.observable(),
                show: ko.observable()
            };
            return result;
        }

        function translateUpdate( update ) {
            var
                translated = MANUAL_UPDATE;
            actions.some( function( action ) {
                if( action.id === update ) {
                    if( action.id === ACTION_NOTHING.id ) {
                        return true;
                    }
                    translated = action.text;
                    return true;
                }
                return false;
            } );
            return translated;
        }

        function loadPracticeInfo() {
            var practicesInfo = ko.utils.peekObservable( self.practiesInfo );
            practicesInfo.forEach( function( infoObject ) {
                Y.doccirrus.jsonrpc.api.patientportal.getDeviceConfigData( {
                    query: {
                        customerIdPrac: infoObject.customerIdPrac
                    }
                } )
                    .done( function( response ) {
                        var data = (response.data && response.data[0]) || {};
                        infoObject.show( Boolean( data._id ) );
                        infoObject.update( translateUpdate( data.update ) );
                        infoObject.lastUpdate( moment( data.lastUpdate ).format( TIMESTAMP_FORMAT ) );
                    } );
            } );
        }

        function updatePracticeInfo( config ) {
            var
                customerIdPrac = config.customerIdPrac,
                update = config.update,
                lastUpdate = config.lastUpdate,
                practicesInfo = ko.utils.peekObservable( self.practiesInfo );
            practicesInfo.some( function( infoObject ) {
                if( infoObject.customerIdPrac === customerIdPrac ) {
                    infoObject.show( true );
                    infoObject.update( translateUpdate( update ) );
                    infoObject.lastUpdate( moment( lastUpdate ).format( TIMESTAMP_FORMAT ) );
                    return true;
                }
                return false;
            } );
        }

        Y.doccirrus.uam.ViewModel.mixDisposable( self );

        self.titleRegisterI18n = i18n('PatPortalMojit.devices.title.REGISTER');
        self.registrationTextIntroI18n = i18n('PatPortalMojit.devices.text.REGISTRATION_TEXT_INTRO');
        self.registrationTextEndI18n = i18n('PatPortalMojit.devices.text.REGISTRATION_TEXT_END');
        self.titleLogoutI18n = i18n('PatPortalMojit.devices.title.LOGOUT');
        self.recipientsI18n = i18n('PatPortalMojit.devices.title.RECIPIENTS');
        self.recipientsTextI18n = i18n('PatPortalMojit.devices.text.RECIPIENTS_TEXT');
        self.practiceI18n = i18n('PatPortalMojit.devices.title.PRACTICE');
        self.lastI18n = i18n('PatPortalMojit.devices.title.LAST');
        self.modeI18n = i18n('PatPortalMojit.devices.title.MODE');
        self.titleTransferI18n = i18n('PatPortalMojit.devices.title.TRANSFER');
        self.transferTextI18n = i18n('PatPortalMojit.devices.text.TRANSFER_TEXT');
        self.selectPracticeI18n = i18n('PatPortalMojit.devices.title.SELECT_PRACTICE');
        self.selectModeI18n = i18n('PatPortalMojit.devices.title.SELECT_MODE');
        self.titleExecuteI18n = i18n('PatPortalMojit.devices.title.EXECUTE');
        self.titlePreviewI18n = i18n('PatPortalMojit.devicesJS.title.PREVIEW');

        self.ready = ko.observable( false );

        self.mainNode = config.node;

        self.hasJawboneToken = ko.observable( false );

        self.lastUpdate = ko.observable();
        self.update = ko.observable( Y.doccirrus.schemas.deviceconfiguration.updateStatus.NEVER );
        self.action = ko.observable( ACTION_NOTHING.id );

        actions.unshift( ACTION_NOTHING, ACTION_SEND_DAY, ACTION_SEND_ALL );
        self.practice = ko.observable();

        self.practiesInfo = ko.observableArray();

        addAsync( function( callback ) {
            Y.doccirrus.jsonrpc.api.jawbone.checkAccessToken()
                .done( function() {
                    self.hasJawboneToken( true );
                } )
                .fail( function() {
                    self.hasJawboneToken( false );
                } )
                .always( function() {
                    callback();
                } );
        } );
        addAsync( function( callback ) {
            Y.doccirrus.jsonrpc.api.patientportal.getPatientPractice()
                .done( function( response ) {
                    var data = response.data || [];
                    data.forEach( function( practice ) {
                        if( practice ) {
                            practices.push( {
                                id: practice._id,
                                customerIdPrac: practice.dcCustomerNo,
                                text: practice.coname
                            } );
                            self.practiesInfo.push( createPracticeInfo( practice ) );
                        }
                    } );
                    if( practices.length ) {
                        self.practice( practices[0] );
                        getDeviceConfigData( practices[0].customerIdPrac );
                        loadPracticeInfo();
                    }
                } )
                .always( function() {
                    self.executeBtn.disabled( !practices.length );
                    callback();
                } );
        } );

        self.select2Practice = {
            data: self._addDisposable( ko.computed( {
                read: function() {
                    var practice = ko.unwrap( self.practice );
                    return practice;
                },
                write: function( $event ) {
                    self.practice( $event.added );
                    getDeviceConfigData( $event.added && $event.added.customerIdPrac );
                }
            } ) ),
            select2: {
                data: practices
            }
        };

        self.select2Action = {
            val: self._addDisposable( ko.computed( {
                read: function() {
                    var action = ko.unwrap( self.action );
                    return action;
                },
                write: function( $event ) {
                    switch( $event.val ) {
                        case ACTION_NOTHING.id:
                            self.preview.visible( false );
                            self.update( Y.doccirrus.schemas.deviceconfiguration.updateStatus.NEVER );
                            break;
                        case ACTION_SEND_DAY.id:
                        case ACTION_SEND_ALL.id:
                            self.preview.visible( true );
                            self.update( Y.doccirrus.schemas.deviceconfiguration.updateStatus.NEVER );
                            break;
                        default:
                            self.preview.visible( false );
                            self.update( $event.val );

                    }
                    self.action( $event.val );
                }
            } ) ),
            select2: {
                data: actions,
                formatSelection: function( query ) {
                    var result = query.text;
                    actions.some( function( data ) {
                        if( query.id === data.id ) {
                            result = data.text;
                            return true;
                        }
                        return false;
                    } );
                    return result;
                }
            }
        };

        self.removeJawboneToken = function() {
            Y.doccirrus.jsonrpc.api.jawbone.removeJawboneCredential()
                .done( function() {
                    self.hasJawboneToken( false );
                } );
        };

        self.register = function() {
            Y.doccirrus.jsonrpc.api.jawbone.getAppConfig()
                .done( function( response ) {
                    var data = response && response.data && response.data[0],
                        client_id = data.client_id,
                        redirect_uri = data.redirect_uri,
                        scope = data.scope,
                        urlParams;
                    Y.doccirrus.modals.jawboneDataModal.showDialog( scope, function( selectedScope ) {
                        urlParams = 'response_type=code&client_id=' + client_id + '&redirect_uri=' + encodeURIComponent( redirect_uri ) + '&scope=' + encodeURIComponent( selectedScope.join( ' ' ) );
                        window.open( urlRegUP + urlParams, '_blank' );
                    } );

                } )
                .fail( handleError );

        };

        self.preview = function() {
            lockView( true );
            var startTime,
                action = ko.utils.peekObservable( self.action );

            if( ACTION_SEND_ALL.id === action ) {
                startTime = ko.utils.peekObservable( self.lastUpdate );
//                startTime = moment( '2015-08-01T10:22:44.141Z' ).startOf( 'day' ); //for test
            }
            Y.doccirrus.jsonrpc.api.jawbone.getPatientJawboneData( {
                query: {
                    startTime: startTime
                }
            } )
                .done( function( response ) {
                    var data = response.data;
                    Y.doccirrus.DCWindow.notice( {
                        type: 'info',
                        title: PREVIEW_TITLE,
                        message: '<p>' + PREVIEW_TEXT + '</p><pre>' + JSON.stringify( data, null, 4 ) + '<pre/>',
                        window: {
                            width: Y.doccirrus.DCWindow.SIZE_SMALL,
                            resizeable: true
                        }
                    } );
                } )
                .fail( handleError )
                .always( function() {
                    lockView( false );
                } );
        };
        self.preview.busy = ko.observable( false );
        self.preview.visible = ko.observable( false );

        self.executeBtn = function() {
            var action = ko.utils.peekObservable( self.action ),
                lastUpdate = ko.utils.peekObservable( self.lastUpdate );
            switch( action ) {
                case ACTION_NOTHING.id:
                    upsertDeviceConfiguration();
                    break;
                case ACTION_SEND_DAY.id:
                    sendJawboneDataPRC();
                    break;
                case ACTION_SEND_ALL.id:
                    sendJawboneDataPRC( lastUpdate );
//                    sendJawboneDataPRC( moment( '2015-08-01T10:22:44.141Z' ).startOf( 'day' ) ); //for test
                    break;
                default:
                    upsertDeviceConfiguration();
            }
        };
        self.executeBtn.disabled = ko.observable( false );

        Y.doccirrus.utils.showLoadingMask( self.mainNode );
        async.each( asyncProcesses, function( process, done ) {
            process( done );
        }, function() {
            self.ready( true );
            Y.doccirrus.utils.hideLoadingMask( self.mainNode );
        } );

    }

    return {
        /**
         * Default function to setup -- automatically used by Jade Loader
         *
         */
        registerNode: function( node ) {
            deviceDataModel = new DeviceDataModel( { node: node } );
            ko.applyBindings( deviceDataModel, document.querySelector( '#patientdataTabContainer' ) );
        },
        deregisterNode: function() {
            if( deviceDataModel && deviceDataModel._dispose ) {
                deviceDataModel._dispose();
            }
        }
    };
};