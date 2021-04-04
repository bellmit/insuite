/*
 @author: pi
 @date: 21/01/2015
 */

/*jslint anon:true, nomen:true*/
/*global YUI, $*/

'use strict';

YUI.add( 'dccallermodal', function( Y, NAME ) {
        var
            CALL_PICKED = 'CALL_PICKED',
            CALL_REJECTED = 'CALL_REJECTED',
            onPicked, onRejected,
            rejected, started, called, // helper flags
            _conferenceUrl,
            i18n = Y.doccirrus.i18n,
            START = i18n( 'general.button.START' ),
            PREPARE = i18n( 'general.button.PREPARE' ),
            NO_USER_NOTIFICATION = i18n( 'IntouchPrivateMojit.caller_modalJS.message.NO_USER_NOTIFICATION' ),
            PRIVATE_CONFERENCE = i18n( 'IntouchPrivateMojit.caller_modalJS.label.PRIVATE_CONFERENCE' ),
            PUBLIC_CONFERENCE = i18n( 'IntouchPrivateMojit.caller_modalJS.label.PUBLIC_CONFERENCE' ),
            PRIVATE_CONFERENCE_INFO = i18n( 'IntouchPrivateMojit.caller_modalJS.message.PRIVATE_CONFERENCE_INFO' ),
            PUBLIC_CONFERENCE_INFO = i18n( 'IntouchPrivateMojit.caller_modalJS.message.PUBLIC_CONFERENCE_INFO' );

        function DCCallerModal() {
        }

        function AnimationCall() {
            var self = this;
            self.audio = new Audio( '/static/DocCirrus/assets/audio/phone_call.wav' );
            self.audio.loop = true;
            self.animationDOM = $( '#phoneCall' );
        }

        function startAnimationCall( animationCall ) {
            animationCall.audio.play();
            animationCall.animationDOM.show();

        }

        function stopAnimationCall( animationCall ) {
            animationCall.audio.pause();
            animationCall.animationDOM.hide();
        }

        // initiate calling
        function sendCallRequest( params, config ) {
            var
                reasonDOM = $( '#reason' ),
                reason = reasonDOM.val(),
                rejectCount = 0;
            config = config || {};
            reasonDOM.prop( 'disabled', true );

            function handlePickup( callData, conferenceUrl ) {
                onPicked = Y.doccirrus.communication.once( {
                    event: CALL_PICKED,
                    done: function( msessage ) {
                        var
                            pickedCall = msessage.data && msessage.data[0];

                        if( pickedCall.callId !== callData.callId ) {
                            console.warn( 'not my call picked: ', pickedCall.callId );// eslint-disable-line no-console
                            handlePickup( callData ); // keep listening
                            return;
                        }
                        console.warn( 'CALL_PICKED', callData );// eslint-disable-line no-console
                        config.pickRejectCb( true );
                        _conferenceUrl = conferenceUrl;
                    }
                } );
            }

            function handleRejection( callData ) {

                onRejected = Y.doccirrus.communication.once( {
                    event: CALL_REJECTED,
                    done: function( message ) {
                        var
                            rejectedCall = message.data && message.data[0];

                        if( rejectedCall.callId !== callData.callId ) {
                            console.warn( 'not my call rejected: ', rejectedCall.callId );// eslint-disable-line no-console
                            handleRejection( callData ); // keep listening
                            return;
                        }

                        rejectCount++;
                        console.warn( rejectCount + ' CALL_REJECTED: ', callData );// eslint-disable-line no-console
                        if( params.receivers.length === rejectCount ) {
                            rejected = true;
                            config.pickRejectCb( false );
                        } else {
                            handleRejection( callData ); // wait for the next rejection
                        }
                    }
                } );
            }

            Y.doccirrus.jsonrpc.api.telecommunication.initiateCall( {
                query: Y.mix( params, {
                    reason: reason
                } )
            } ).done( function( response ) {
                var
                    data = response && response.data,
                    errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );

                if( errors.length ) {
                    Y.Array.invoke( errors, 'display', 'error' );
                }

                startAnimationCall( config.animationCall );
                config.callCb( null, data );
                if( !config.withoutCallee ) {
                    handlePickup( data.callData, data.conferenceUrl );
                    handleRejection( data.callData );
                } else {
                    config.pickRejectCb( true );
                    _conferenceUrl = data.conferenceUrl;
                }

            } ).fail( function() {
                config.callCb( 'call failed' );
            } );
        }

        setTimeout( function() {
            Y.doccirrus.communication.on( {
                event: 'CALL_RECEIVED',
                done: function handleCall( response ) {
                    var
                        callData = response.data && response.data[ 0 ];

                    console.warn( 'CALL_RECEIVED: ', callData ); // eslint-disable-line no-console
                }
            } );
        }, 1000 );


        /**
         *
         * @param users
         * @param options
         * @param callCb called when call is made or cancelled
         * @param finalCb called when called is picked or rejected
         */
        function showOutboundCallModal( users, options, dataCb, callCb ) {
            var
                data = {users: users},
                node = Y.Node.create( '<div></div>' ),
                withoutCallee = 0 === users.length,
                animationCall,
                isTeleconsult = options && options.teleConsult,
                callData;

            if(withoutCallee){
                data.message = NO_USER_NOTIFICATION;
            }
            if( !dataCb ) {
                dataCb = function() {
                };
            }
            if( !callCb ) {
                callCb = function() {
                };
            }

            function callCancelled() {

                Y.doccirrus.ajax.send( {
                    type: 'POST',
                    url: Y.doccirrus.infras.getPrivateURL( '/1/telecommunication/:rejectCall' ),
                    data: {callData: callData},
                    contentType: 'application/json',
                    xhrFields: {
                        withCredentials: true
                    },
                    success: function() {
                    },
                    error: function( error ) {
                        Y.log( error, 'error', NAME );
                    }
                } );
            }

            function getTemplate( node, data, callback ) {
                YUI.dcJadeRepository.loadNodeFromTemplate(
                    'outboundcall_modal',
                    'IntouchPrivateMojit',
                    data,
                    node,
                    callback
                );
            }

            function toogleCallButtons( dcWindow, isConferenceReady ) {
                var callBtn = $( dcWindow.getButton( 'OK' ) && dcWindow.getButton( 'OK' ).getDOMNode() ),
                    privCallBtn = $( dcWindow.getButton( 'privConference' ) && dcWindow.getButton( 'privConference' ).getDOMNode() ),
                    pubCallBtn = $( dcWindow.getButton( 'pubConference' ) && dcWindow.getButton( 'pubConference' ).getDOMNode() ),
                    startBtn = $( dcWindow.getButton( 'start' ) && dcWindow.getButton( 'start' ).getDOMNode() );
                if( isConferenceReady ) {
                    startBtn.text( START );
                    startBtn.removeClass( 'dc-grey' );
                    startBtn.addClass( 'btn-success dc-fade-animation' );
                    startBtn.attr( 'disabled', false );
                } else {
                    callBtn.hide();
                    privCallBtn.hide();
                    pubCallBtn.hide();
                    startBtn.removeClass( 'hide' );
                    startBtn.attr( 'disabled', true );
                }
            }

            // user clicked on Anrufen
            function clickedCall( dcWindow, myModal, privateCall ) {
                called = true;
                toogleCallButtons( dcWindow );
                sendCallRequest(
                    Y.mix( options, { // call parameters
                        receivers: users,
                        privateCall: privateCall
                    } ),
                    {
                        withoutCallee: withoutCallee,
                        animationCall: animationCall,
                        callCb: function( err, _data ) {
                            callData = _data && _data.callData;
                            dataCb( err, _data );
                        },
                        pickRejectCb: function( picked ) {
                            callCb( null, picked );
                            if( picked ) {
                                toogleCallButtons( dcWindow, true );
                            } else {
                                myModal.close();
                            }
                        }
                    }
                );
            }

            getTemplate( node, data, function() {
                var modalButtons = [];

                if( isTeleconsult ) {
                    modalButtons = [
                        Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                            label: 'Auflegen',
                            classNames: 'btn btn-danger',
                            action: function() {
                                this.close();
                                callCb();
                            }
                        } ),
                        Y.doccirrus.DCWindow.getButton( 'OK', {
                            classNames: 'btn btn-success',
                            label: 'Anrufen',
                            action: function() {
                                clickedCall( this, myModal );
                            }
                        } ),
                        {
                            label: PREPARE,
                            name: 'start',
                            classNames: 'btn dc-grey hide',
                            action: function cancelClicked() {
                                window.open( _conferenceUrl, '_blank' );
                                started = true;
                                myModal.close();
                            }
                        }
                    ];
                } else {
                    modalButtons = [
                        Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                            label: 'Auflegen',
                            classNames: 'btn btn-danger',
                            action: function() {
                                this.close();
                                callCb();
                            }
                        } ),
                        {
                            label: PRIVATE_CONFERENCE,
                            name: 'privConference',
                            title: PRIVATE_CONFERENCE_INFO,
                            template: '<button type="button" style="opacity: 0.65;"/>',
                            classNames: 'btn btn-success',
                            action: function() {
                                clickedCall( this, myModal, true );
                            }
                        },
                        {
                            label: PUBLIC_CONFERENCE,
                            name: 'pubConference',
                            title: PUBLIC_CONFERENCE_INFO,
                            classNames: 'btn btn-success',
                            action: function() {
                                clickedCall( this, myModal );
                            }
                        },
                        {
                            label: PREPARE,
                            name: 'start',
                            classNames: 'btn dc-grey hide',
                            action: function cancelClicked() {
                                window.open( _conferenceUrl, '_blank' );
                                started = true;
                                myModal.close();
                            }
                        }
                    ];
                }

                var myModal = new Y.doccirrus.DCWindow( {
                    className: 'DCWindow-OutboundCall',
                    title: "Doc Cirrus inTouch - Verbindungsaufbau",
                    bodyContent: node,
                    icon: Y.doccirrus.DCWindow.ICON_LIST,
                    width: Y.doccirrus.DCWindow.SIZE_LARGE,
                    height: 400,
                    minHeight: 250,
                    minWidth: Y.doccirrus.DCWindow.SIZE_LARGE,
                    centered: true,
                    modal: true,
                    dragable: true,
                    maximizable: false,
                    resizeable: true,
                    render: document.body,
                    buttons: {
                        header: ['close'],
                        footer: modalButtons
                    }
                } );
                animationCall = new AnimationCall();
                myModal.on( 'visibleChange', function( event ) {
                    if( false === event.newVal ) {
                        stopAnimationCall( animationCall );
                        if( !rejected && !started && called ) {
                            callCancelled();
                        }
                        callCb();
                        if( onPicked ) {
                            onPicked.removeEventListener();
                        }
                        if( onRejected ) {
                            onRejected.removeEventListener();
                        }

                    }
                } );
                return myModal;
            } );
        }

        /**
         *
         * @param {Array} participants receivers of the call
         * @param {JSON} options patientId, teleConsult
         * @param modalCb called after a call is made or is cancelled
         * @param finalCb called when the call is picked or rejected
         */
        DCCallerModal.prototype.showModal = function( participants, options, dataCb, callCb ) {
            rejected = false;
            started = false;
            called = false;
            if( !Y.doccirrus.utils.supportsWebRTC() ) {
                window.open( '/intouch/conference_wrongbrowser', '_self' );
                return;
            }
            showOutboundCallModal( participants, options, function( err, data ) {
                    if( dataCb ) {
                        dataCb( err, data );
                    }
                },
                function( err, picked ) {
                    if( callCb ) {
                        callCb( err, picked );
                    }
                } );
        };

        Y.namespace( 'doccirrus.modals' ).callerModal = new DCCallerModal();

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'doccirrus',
            'dccommunication-client'
        ]
    }
);
