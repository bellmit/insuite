/**
 * User: pi
 * Date: 23/03/15  11:00
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, easyrtc */
'use strict';
YUI.add( 'IntouchConferenceScreenShareBinderIndex', function( Y, NAME ) {
    var videoBoxId = 'dcConferenceBox',
        screenShareRoom = 'dcscreenshare';

    function callSuccess( otherCaller ) {
        Y.log( 'EASYRTC. connected to ' + otherCaller, 'info', NAME );
    }

    function callFailure( errorCode, errorText, easyrtcid ) {
        Y.log( 'EASYRTC. Can not connect to ' + easyrtcid + ', error:' + errorCode + ' ' + errorText, 'error', NAME );
    }

    function makeCalls( connectedList ) {
        connectedList.forEach( function( easyrtcid ) {
            easyrtc.call( easyrtcid, callSuccess, function( errorCode, errorText ) {
                callFailure( errorCode, errorText, easyrtcid );
            } );
        } );

    }

    function roomOccupantListener( roomName, data ) {
        var list = [];
        if( screenShareRoom === roomName ) {
            Y.Object.each( data, function( easyrtcObj, easyrtcid ) {
                if( easyrtc.NOT_CONNECTED === easyrtc.getConnectStatus( easyrtcid ) ) {
                    list.push( easyrtcid );
                }
            } );
            if( list.length > 0 ) {
                makeCalls( list );
            }
        }

    }

    function roomEntryListener( entry, roomName ) {
        if( 'default' === roomName && entry ) {
            easyrtc.joinRoom( screenShareRoom, {}, function() {
            }, function() {
            } );
        }
        if( screenShareRoom === roomName && !entry ) {
            easyrtc.hangupAll();
        }
    }

    function connect( appName, userName, screenCaptureMode ) {

        easyrtc.enableVideoReceive(false);
        easyrtc.setDisconnectListener( function() {
            var video = document.getElementById( videoBoxId );
            easyrtc.setVideoObjectSrc( video, "" );
        } );
        easyrtc.setUsername( userName );

        easyrtc.setRoomEntryListener( roomEntryListener );

        easyrtc.setRoomOccupantListener( roomOccupantListener );

        var connectSuccess = function( myId ) {
            Y.log( 'EASYRTC. Connect to app with easyrtcid: ' + myId, 'info', NAME );
        };
        var connectFailure = function( errmesg ) {
            Y.log( 'EASYRTC. Can not connect to app, error: ' + errmesg, 'error', NAME );
        };
        easyrtc.setScreenCapture( true );
        easyrtc.setScreenCaptureMode( screenCaptureMode );
        easyrtc.initMediaSource(
            function() {      // success callback
                var dcSocket,
                    selfVideo = document.getElementById( videoBoxId );
                Y.log( 'EASYRTC. Media source was initialized successfully', 'info', NAME );
                easyrtc.setVideoObjectSrc( selfVideo, easyrtc.getLocalStream() );

                if( !Y.doccirrus.auth.isAppDeliveredFromPUC() ) {
                    dcSocket = Y.doccirrus.communication.getSocket() || Y.doccirrus.communication.openConnection();
                    dcSocket.socket = dcSocket;
                    easyrtc.useThisSocketConnection( dcSocket );
                }
                easyrtc.connect( appName, connectSuccess, connectFailure );
            },
            function( err ) {
                Y.log( 'EASYRTC. Can not initialize media source, error: ' + err, 'error', NAME );
            }
        );

    }

    function ConferenceModel() {
        var self = this;

        self.hangUp = function() {
            easyrtc.hangupAll();
            window.close();
        };

        self.videoId = videoBoxId;
    }

    /**
     * @module IntouchConferenceOneBinderIndex
     */
    /**
     * @class IntouchConferenceOneBinderIndex
     * @constructor
     */
    Y.namespace( 'mojito.binders' )[NAME] = {

        jaderef: 'IntouchPrivateMojit',

        init: function( mojitProxy ) {
            this.mojitProxy = mojitProxy;
        },

        bind: function() {
            var appName = this.mojitProxy.pageData.get( 'conferenceName' ),
                screenShareName = this.mojitProxy.pageData.get( 'screenShareName' ),
                screenCaptureMode = this.mojitProxy.pageData.get( 'screenCaptureMode' ),
                conferenceModel = new ConferenceModel();
            ko.applyBindings( conferenceModel, document.querySelector( '#conferenceScreenShare' ) );
            connect( appName, screenShareName, screenCaptureMode );
        }
    };
}, '0.0.1', {requires: [
    'JsonRpcReflection-doccirrus',
    'router',
    'dcviewmodel',
    'dcsubviewmodel',
    'event-mouseenter',
    'mojito-client',
    'dcutils',
    'dcauth',
    'dcutils-uam',
    'dcloadhelper',
    'json',
    'model-sync-rest',
    'intl',
    'mojito-intl-addon',
    'dc-comctl',
    'DCWindow',
    'dcinfrastructs',
    'dccommunication-client'
]
} );