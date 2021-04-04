/**
 * User: pi
 * Date: 13/03/15  13:20
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, easyrtc */
'use strict';
YUI.add( 'IntouchConferenceOneBinderIndex', function( Y, NAME ) {
    var hasConnection = false,
        videoBoxIdIndex = 'dcConferenceBox',
        conferenceRoom = 'conference',
        oneToOneRoom = 'onetoone';


    function setUpStreamAcceptor( conferenceModel ) {

        easyrtc.setStreamAcceptor( function( callerEasyrtcid, stream ) {
            var videoBox,
                video;
            hasConnection = true;
            videoBox = conferenceModel.getVideoBox();
            video = document.getElementById( videoBox.id );
            conferenceModel.setNewVideo( {
                easyrtcid: callerEasyrtcid,
                visible: true,
                userName: easyrtc.idToName( callerEasyrtcid )
            } );
            easyrtc.setVideoObjectSrc( video, stream );
        } );
    }

    function setUpOnStreamClosed( conferenceModel ) {
        easyrtc.setOnStreamClosed( function() {
            var videoBox = conferenceModel.getVideoBox(),
                video = document.getElementById( videoBox.id );
            conferenceModel.setNewVideo();
            easyrtc.setVideoObjectSrc( video, "" );
            hasConnection = false;
        } );
    }

    function setUpAcceptChecker() {
        easyrtc.setAcceptChecker( function( easyrtcid, acceptor ) {
            // do not accept calls if already have one
            acceptor( !hasConnection );
        } );
    }

    function disconnectListener(){
        easyrtc.hangupAll();
        window.close();
    }

    function connect( conferenceModel, appName, userName, targetCall, identityId ) {
        setUpStreamAcceptor( conferenceModel );
        setUpOnStreamClosed( conferenceModel );
        setUpAcceptChecker();

        easyrtc.setDisconnectListener( disconnectListener );
        easyrtc.setUsername( userName );

        easyrtc.setRoomEntryListener( function( entry, roomName ) {
            if( 'default' === roomName && entry && !hasConnection){
                easyrtc.joinRoom(oneToOneRoom, {identityId: identityId}, function() {
                    easyrtc.call(targetCall, null, null);
                }, function() {
                });
            }
        } );
        var connectSuccess = function( myId ) {
            Y.log( 'EASYRTC. Connect to app with easyrtcid: ' + myId, 'info', NAME );
        };
        var connectFailure = function( errmesg ) {
            Y.log( 'EASYRTC. Can not connect to app, error: ' + errmesg, 'error', NAME );
        };
        easyrtc.initMediaSource(
            function() {      // success callback
                var dcSocket;

                if( !Y.doccirrus.auth.isAppDeliveredFromPUC() ) {
                    dcSocket = Y.doccirrus.communication.getSocket() || Y.doccirrus.communication.openConnection();
                    dcSocket.socket = dcSocket;
                    easyrtc.useThisSocketConnection( dcSocket );
                }

                easyrtc.connect( appName, connectSuccess, connectFailure );
            },
            connectFailure
        );

    }

    function ConferenceModel( isHost ) {
        var self = this;

        self.getVideoBox = function() {
            return self.videoBox;
        };
        self.isHost = isHost;
        self.hangUp = function( data ) {
            if( self.isHost ) {
                if( data && data.easyrtcid ) {
                    easyrtc.sendServerMessage( 'hangUpUser', {
                        easyrtcid: data.easyrtcid,
                        roomName: conferenceRoom
                    }, function() {
                        easyrtc.hangup(data.easyrtcid);
                        window.close();
                    }, function() {
                    } );

                }
            }
        };
        self.setNewVideo = function( config ) {
            config = config || {};
            self.videoBox.easyrtcid = config.easyrtcid || '';
            self.videoBox.visible( config.visible || false );
            self.videoBox.userName( config.userName || '' );
        };

        self.videoBox = {
            id: videoBoxIdIndex,
            easyrtcid: '',
            visible: ko.observable(false),
            userName: ko.observable('')
        };
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
                firstName = this.mojitProxy.pageData.get( 'firstName' ),
                lastName = this.mojitProxy.pageData.get( 'lastName' ),
                isHost = this.mojitProxy.pageData.get( 'host' ),
                targetCall = this.mojitProxy.pageData.get( 'targetCall' ),
                identityId = this.mojitProxy.pageData.get( 'identityId' ),
                conferenceModel = new ConferenceModel( isHost );
            ko.applyBindings( conferenceModel, document.querySelector( '#conferenceOne' ) );
            connect( conferenceModel, appName, firstName + ' ' + lastName, targetCall, identityId );
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