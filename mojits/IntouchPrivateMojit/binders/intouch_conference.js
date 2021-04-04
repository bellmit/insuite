/**
 * User: pi
 * Date: 02/03/15  13:20
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, _, easyrtc, easyrtc_ft, $, async, moment, MRecordRTC, navigator */
'use strict';
YUI.add( 'IntouchConferenceBinderIndex', function( Y, NAME ) {
    var SEND_DATA_NOTES = 'sendNotes',
        SUBMIT_NOTES = 'SUBMIT_NOTES',
        DISCONNECTED_FROM_ROOM = 'disconnectedFromRoom',
        maxConnectionNumber = 6,
        alreadyConnected = 0,
        videoBoxIdIndex = 'dcConferenceBox',
        videoRecordId = 'videoRecord',
        needCallOther,
        conferenceRoom = 'conference',
        cameraRoom = 'dcwebcamera',
        screenShareRoom = 'dcscreenshare',
        disconnected = false,
        i18n = Y.doccirrus.i18n,
        maxConnError = new Error( 'limit of connection was reached' ),
        cameraNumber = 0,
        screenShareNumber = 0,
        ADDITIONAL_CAMERA = i18n( 'IntouchPrivateMojit.intouch_conferenceJS.title.ADDITIONAL_CAMERA' ),
        YOU = i18n( 'IntouchPrivateMojit.intouch_conferenceJS.title.YOU' ),
        ADDITIONAL_SCREEN_SHARE = i18n( 'IntouchPrivateMojit.intouch_conferenceJS.title.SHARE_SCREEN' ),
        DOC_UPLOADED = i18n( 'IntouchPrivateMojit.intouch_conferenceJS.title.DOC_UPLOADED' ),
        SHARE_SCREEN = i18n( 'IntouchPrivateMojit.intouch_conferenceJS.title.SHARE_SCREEN' ),
        SHARE_APPLICATION = i18n( 'IntouchPrivateMojit.intouch_conferenceJS.title.SHARE_APPLICATION' ),
        SHARE_WINDOW = i18n( 'IntouchPrivateMojit.intouch_conferenceJS.title.SHARE_WINDOW' ),
        DOC_UPLOADING = i18n( 'IntouchPrivateMojit.intouch_conferenceJS.title.DOC_UPLOADING' ),
        DOC_REJECTED = i18n( 'IntouchPrivateMojit.intouch_conferenceJS.title.DOC_REJECTED' ),
        DOC_REJECTED_TYPE = i18n( 'IntouchPrivateMojit.intouch_conferenceJS.title.DOC_REJECTED_TYPE' ),
        USE_LATEST_FIREFOX = i18n( 'IntouchPrivateMojit.intouch_conferenceJS.text.USE_LATEST_FIREFOX' ),
        DOC_REJECTED_SIZE = i18n( 'IntouchPrivateMojit.intouch_conferenceJS.title.DOC_REJECTED_SIZE' ),
        SPEED_TEST = i18n( 'top_menu.SPEED_TEST' ),
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        shouldIHangup = true,
        timer,
        updateICEInterval = 420000;

    // Helpers

    function closeWindow() {
        window.close();
    }

    function debugLog() {
        var message = Array.prototype.join.call( arguments, ' ' );
        Y.log( message, 'debug', NAME );
    }

    function getColSize( connectionsAmount ) {
        switch( connectionsAmount ) {
            case 1:
                return 12;
            case 2:
            case 3:
            case 4:
                return 6;
            default:
                return 4;
        }
    }

    function isFileTypeSupported( type ) {
        switch( type ) {
            case 'video/webm':
            case 'audio/x-wav':
            case 'audio/wav':
            case '':
                return false;
            default:
                return true;
        }
    }

    function isMyCamera( easyrtcid ) {
        var nameReg = new RegExp( '\\b' + easyrtc.idToName( easyrtc.myEasyrtcid ) + '\\b' ),
            cameraReg = new RegExp( '\\b' + ADDITIONAL_CAMERA + '\\b' ),
            cameraName = easyrtc.idToName( easyrtcid );
        return (nameReg.test( cameraName ) && cameraReg.test( cameraName ));
    }

    function isMyScreenShare( easyrtcid ) {
        var nameReg = new RegExp( '\\b' + easyrtc.idToName( easyrtc.myEasyrtcid ) + '\\b' ),
            screenShareReg = new RegExp( '\\b' + ADDITIONAL_SCREEN_SHARE + '\\b' ),
            screenShareName = easyrtc.idToName( easyrtcid );
        return (nameReg.test( screenShareName ) && screenShareReg.test( screenShareName ));
    }

    function startTimer() {
        if( timer ) {
            stopTimer();
        }
        timer = setInterval( getFreshIceConfig, updateICEInterval );
    }

    function stopTimer() {
        clearInterval( timer );
    }

    // easyrtc
    function getFreshIceConfig() {
        easyrtc.sendServerMessage( 'keepAlive', {
            roomName: conferenceRoom
        }, function() {
        }, function() {
        } );
        easyrtc.getFreshIceConfig( function( success ) {
            if( success ) {
                debugLog( 'ICE config have been updated' );
            } else {
                debugLog( 'Can not update ICE config' );
            }
        } );
    }

    function streamAcceptor( callerEasyrtcid, stream, conferenceModel ) {
        var videoBox,
            video;
        alreadyConnected++;
        videoBox = conferenceModel.getFirstFreeVideoBox();
        video = document.getElementById( videoBox.id );
        conferenceModel.setNewVideo( videoBox, {
            easyrtcid: callerEasyrtcid,
            visible: true,
            userName: easyrtc.idToName( callerEasyrtcid ),
            hideControls: isMyCamera( callerEasyrtcid ) || isMyScreenShare( callerEasyrtcid ),
            mRecordRTC: new MRecordRTC( stream )
        } );
        easyrtc.setVideoObjectSrc( video, stream );
        conferenceModel.colSize( getColSize( alreadyConnected ) );
    }

    function onStreamClosed( callerEasyrtcid, conferenceModel ) {
        var videoBox = conferenceModel.getVideoBoxByEasyrtcId( callerEasyrtcid ),
            video = document.getElementById( videoBox.id );
        conferenceModel.setNewVideo( videoBox );
        easyrtc.setVideoObjectSrc( video, "" );
        alreadyConnected--;
        conferenceModel.colSize( getColSize( alreadyConnected ) );
    }

    function acceptChecker( easyrtcid, acceptor ) {
        if( maxConnectionNumber === alreadyConnected ) {
            return acceptor( false );
        }
        acceptor( true );
    }

    function onDisconnect() {
        disconnected = true;
        easyrtc.hangupAll();
        /**
         * After restart server does not have any room,
         *  but client side still has trash room data.
         * Without with lines server generate error, MSG_REJECT_BAD_ROOM
         */
        easyrtc.setRoomApiField( conferenceRoom );
        easyrtc.setRoomApiField( cameraRoom );
        easyrtc.setRoomApiField( screenShareRoom );
    }

    function roomEntryListener( entry, roomName, identityId, dcCustomerNo ) {
        debugLog( 'roomEntryListener. Entry:', entry, ', room name:', roomName );
        if( conferenceRoom === roomName ) {
            if( entry ) {
                needCallOther = true;
            } else {
                shouldIHangup = false;
                easyrtc.hangupAll();
                closeWindow();
            }
        }
        if( 'default' === roomName && entry ) {
            // This room is main one
            easyrtc.joinRoom( conferenceRoom, { identityId: identityId, dcCustomerNo: dcCustomerNo }, function() {
                debugLog( 'User joined room "', conferenceRoom, '"' );
                startTimer();
            }, function() {
                debugLog( 'User can not join room "', conferenceRoom, '"' );
            } );
            easyrtc.joinRoom( cameraRoom, {}, function() {
                debugLog( 'User joined room "', cameraRoom, '"' );
            }, function() {
                debugLog( 'User can not join room "', cameraRoom, '"' );
            } );
            easyrtc.joinRoom( screenShareRoom, {}, function() {
                debugLog( 'User joined room "', screenShareRoom, '"' );
            }, function() {
                debugLog( 'User can not join room "', screenShareRoom, '"' );
            } );

        }
    }

    function roomOccupantListener( roomName, data ) {
        debugLog( 'roomOccupantListener(somebody joined room). Room name:', roomName, ', data:', data );
        var list = [],
            connectCount = easyrtc.getConnectionCount();
        if( conferenceRoom === roomName ) {
            easyrtc.getFreshIceConfig( function( success ) {
                if( success ) {
                    if( needCallOther ) {
                        Y.Object.each( data, function( easyrtcObj, easyrtcid ) {
                            list.push( easyrtcid );
                        } );
                        debugLog( 'roomOccupantListener. List to call:', list );
                        if( list.length > 0 ) {
                            makeCalls( list, connectCount );
                        }
                        needCallOther = false;
                    }
                } else {
                    debugLog( 'Can not update ice config' );
                }
            } );

        }
    }

    function makeCalls( connectedList, connectCount, callback ) {
        var timeout = 0,
            connectedRoomList;
        if( disconnected ) {
            disconnected = false;
            connectedRoomList = easyrtc.getRoomOccupantsAsArray( conferenceRoom );
            timeout = 2000 * connectedRoomList.indexOf( easyrtc.myEasyrtcid );
        }
        /**
         * if reconnect, set delay to avoid collision
         */
        setTimeout( function() {
            async.eachSeries( connectedList, function( easyrtcid, done ) {
                debugLog( 'Calling'.easyrtcid, easyrtc.getConnectStatus( easyrtcid ), moment().format( 'hh:mm:ss:SSS' ) );
                if( easyrtc.NOT_CONNECTED !== easyrtc.getConnectStatus( easyrtcid ) ) {
                    connectCount = easyrtc.getConnectionCount();
                    return done();
                }
                easyrtc.call( easyrtcid, function( otherCaller, mediaType ) {
                    /**
                     * this callback can be called twice. (datachannel, audiovideo)
                     */
                    if( 'audiovideo' === mediaType ) {
                        debugLog( 'Connected to', easyrtcid );
                        connectCount = easyrtc.getConnectionCount();
                        if( connectCount < maxConnectionNumber ) {
                            done();
                        } else {
                            done( maxConnError );
                        }
                    }
                }, function( errorCode, errorText ) {
                    debugLog( 'Can not connect to', easyrtcid, ', error:', errorCode, errorText );
                    if( connectCount < maxConnectionNumber ) {
                        done();
                    } else {
                        done( maxConnError );
                    }
                } );

            }, function( err ) {
                if( 'function' === typeof callback ) {
                    callback( err );
                }
            } );
        }, timeout );

    }

    function connect( config ) {
        config = config || {};
        debugLog( 'Set up easyrtc and connect to a webrtc server' );
        easyrtc.enableDataChannels( true );
        //                easyrtc.enableVideo( false );
        //                easyrtc.enableAudio( false );

        easyrtc.setStreamAcceptor( function( callerEasyrtcid, stream ) {
            streamAcceptor( callerEasyrtcid, stream, config.conferenceModel );
        } );
        easyrtc.setOnStreamClosed( function( callerEasyrtcid ) {
            onStreamClosed( callerEasyrtcid, config.conferenceModel );
        } );

        easyrtc.setAcceptChecker( acceptChecker );
        easyrtc.setDisconnectListener( onDisconnect );
        easyrtc.setRoomEntryListener( function( entry, roomName ) {
            roomEntryListener( entry, roomName, config.identityId, config.dcCustomerNo, config.isHost );
        } );
        easyrtc.setRoomOccupantListener( roomOccupantListener );
        easyrtc.setDataChannelOpenListener( function( easyrtcid, usesPeer ) {
            dataChannelOpenListener( easyrtcid, usesPeer, config.conferenceModel );
        } );
        easyrtc.setDataChannelCloseListener( function( easyrtcid ) {
            dataChannelCloseListener( easyrtcid, config.conferenceModel );
        } );

        easyrtc.setUsername( config.userName );

        var connectSuccess = function( myId ) {
            debugLog( 'Connect to app with easyrtcid:', myId );
            easyrtc_ft.buildFileReceiver( fileAccepter, function( otherGuy, blob, filename ) {
                fileBlobReceiver( otherGuy, blob, filename, config.conferenceModel );
            }, fileReceiveStatus );
        };
        var connectFailure = function( errmesg ) {
            debugLog( 'Can not connect to app, error:', errmesg );
        };

        //        if( Y.doccirrus.communication.getSocket() ) {
        //            easyrtc.useThisSocketConnection( Y.doccirrus.communication.getSocket() );
        //        }

        //                easyrtc.connect( config.appName, connectSuccess, connectFailure );

        easyrtc.initMediaSource(
            function() {
                var dcSocket;
                debugLog( 'Media source has been initialized successfully' );
                var selfVideo = document.getElementById( videoBoxIdIndex );
                easyrtc.setVideoObjectSrc( selfVideo, easyrtc.getLocalStream() );
                easyrtc.enableCamera( !config.audioOnly );
                if( !Y.doccirrus.auth.isAppDeliveredFromPUC() ) {
                    dcSocket = Y.doccirrus.communication.getSocket( '/' );
                    dcSocket.socket = dcSocket;
                    easyrtc.useThisSocketConnection( dcSocket );
                }

                easyrtc.connect( config.appName, connectSuccess, connectFailure );
            },
            connectFailure
        );

    }

    // File sending

    function dataChannelOpenListener( easyrtcid, usesPeer, conferenceModel ) {
        conferenceModel.showFileUploadBtn( true );
    }

    function dataChannelCloseListener( easyrtcid, conferenceModel ) {
        conferenceModel.showFileUploadBtn( false );
    }

    function fileAccepter( otherGuy, fileNameList, wasAccepted ) {
        debugLog( 'File accepter. File name list:', fileNameList, ', from:', otherGuy );
        wasAccepted( true );
    }

    function fileBlobReceiver( otherGuy, blob, filename, conferenceModel ) {
        var file = conferenceModel.getFile( filename );
        debugLog( 'Received file:', filename, ', from:', otherGuy );
        if( file ) {
            //file.blob = blob;
            return;
        }
        $( '#fileList' ).collapse( 'show' );
        conferenceModel.addFileLink( {
            filename: filename,
            blob: blob,
            isNew: true
        } );
    }

    function fileReceiveStatus( otherGuy, state ) {
        debugLog( 'File receive status:', state.status );
        return true;
    }

    function sendFileStatus( easyrtcid, state ) {
        if( 'working' !== state.status ) {
            debugLog( 'send file status to', easyrtcid, 'status:', state.status );
        }
    }

    function shareFiles( easyrtcid, files, callback ) {
        var fileSender;
        if( !files || 0 === files.length ) {
            return;
        }
        debugLog( 'Creating file sender for', easyrtcid );
        fileSender = easyrtc_ft.buildFileSender( easyrtcid, function( state ) {
            sendFileStatus( easyrtcid, state );
            if( state && ('done' === state.status || 'cancelled' === state.status) ) {
                debugLog( 'File has been sent(rejected)', state.status );
                if( 'function' === typeof callback ) {
                    callback();
                }
            }
            return true;
        } );
        debugLog( 'Sending file' );
        fileSender( files, true );
    }

    function FileLinkModel( config ) {

        var self = this;
        self.status = {
            UPLOADED: 'UPLOADED',
            IN_PROGRESS: 'IN_PROGRESS',
            REJECTED_SIZE: 'REJECTED_SIZE',
            REJECTED_TYPE: 'REJECTED_TYPE',
            REJECTED: 'REJECTED'
        };
        self.filename = config.filename;
        self.blob = config.blob;
        self.id = config.fileIds;
        self.isNew = config.isNew;
        self.titleNewI18n = i18n('general.title.NEW');
        self.titleUpload = ko.observable( DOC_UPLOADING );
        self.fileUploadStatus = ko.observable( self.status.IN_PROGRESS );
        self.fileUploadStatus.subscribe( function( newStatus ) {
            switch( newStatus ) {
                case self.status.UPLOADED:
                    self.titleUpload( DOC_UPLOADED );
                    break;
                case self.status.IN_PROGRESS:
                    self.titleUpload( DOC_UPLOADING );
                    break;
                case self.status.REJECTED_SIZE:
                    self.titleUpload( DOC_REJECTED + ': ' + DOC_REJECTED_SIZE );
                    break;
                case self.status.REJECTED_TYPE:
                    self.titleUpload( DOC_REJECTED + ': ' + DOC_REJECTED_TYPE );
                    break;
                case self.status.REJECTED:
                    self.titleUpload( DOC_REJECTED );
                    break;
            }
        } );
    }

    function sendNotes( value ) {
        var dest = {
            targetRoom: 'conference'
        };
        debugLog( 'Sending notes' );
        easyrtc.sendDataWS( dest, SEND_DATA_NOTES, value, function( reply ) {
            debugLog( 'Sending notes reply', reply );
        } );
    }

    // model

    function ConferenceModel( config ) {
        var self = this,
            i, recievemsg,
            fileIds = 0,
            recordFile,             //  eslint-disable-line no-unused-vars
            videoRecordBox;
        config = config || {};

        function getVideoBox( config ) {
            config = config || {};
            return {
                id: config.id,
                self: config.self,
                panelBtns: config.panelBtns || [],
                videoId: config.videoId,
                visible: ko.observable( config.visible ),
                easyrtcid: config.easyrtcid || '',
                userName: ko.observable( config.userName || '' ),
                hideControls: ko.observable(),
                mRecordRTC: config.mRecordRTC,
                videoRecord: videoRecordId === config.easyrtcid,
                recording: ko.observable(),
                videoRecordURL: ko.observable(),
                recordPaused: ko.observable()
            };
        }

        function peerListener( who, msgType, content ) {
            switch( msgType ) {
                case SEND_DATA_NOTES:
                    recievemsg = true;
                    self.notes( content );
                    recievemsg = false;
                    break;
                case DISCONNECTED_FROM_ROOM:
                    debugLog( 'DISCONNECTED_FROM_ROOM', arguments );
                    break;
            }
        }

        function addParamsToLink( link, paramsObj ) {
            var i = 0;
            Y.Object.each( paramsObj, function( value, key ) {
                var separator = '?';
                i++;

                if( 1 < i ) {
                    separator = '&';
                }
                link += separator + key + '=' + value;
            } );
            return link;
        }

        function sendFilesToAll( files, callback ) {
            var roomList = easyrtc.getRoomOccupantsAsArray( conferenceRoom ) || [];
            roomList = roomList.filter( function( easyrtcid ) {
                return easyrtcid !== easyrtc.myEasyrtcid && easyrtc.doesDataChannelWork( easyrtcid );
            } );
            async.each( roomList, function( easyrtcid, done ) {
                shareFiles( easyrtcid, files, done );
            }, function( err ) {
                if( 'function' === typeof callback ) {
                    callback( err );
                }
            } );
        }

        function isCamera( easyrtcid ) {
            var name = easyrtc.idToName( easyrtcid ),
                result = name.indexOf( ADDITIONAL_CAMERA ) + 1;
            return result;
        }

        function isScreenShare( easyrtcid ) {
            var name = easyrtc.idToName( easyrtcid ),
                result = name.indexOf( ADDITIONAL_SCREEN_SHARE ) + 1;
            return result;
        }

        function inviteByEmail( data ) {
            easyrtc.sendServerMessage( 'inviteByEmail', {
                roomName: conferenceRoom,
                content: data
            }, function() {
                debugLog( 'Email invitation has been sent successfully' );
            }, function() {
            } );
        }

        // save notes on PRC
        function submitNote() {
            Y.doccirrus.communication.request( {
                socket: Y.doccirrus.communication.getSocket( '/' ),
                event: SUBMIT_NOTES,
                message: { consultNote: self.notes(), callId: config.callId },
                always: function() {
                }
            } );
        }

        function sendFileToServer( file ) {
            var readerObj = new FileReader(),
                fileLink = file.fileLink;
            if( 10 * 1024 * 1024 < file.blob.size ) {
                fileLink.fileUploadStatus( fileLink.status.REJECTED_SIZE );
                return;
            }
            if( !isFileTypeSupported( file.blob.type ) ) {
                fileLink.fileUploadStatus( fileLink.status.REJECTED_TYPE );
                return;
            }

            readerObj.onload = function() {
                Y.doccirrus.jsonrpc.api.activity.saveFile( {
                    query: {
                        targetId: config.appName,
                        file: {
                            filename: file.filename,
                            dataURL: readerObj.result
                        },
                        from: 'teleconsult'
                    }
                } )
                    .done( function() {
                        fileLink.fileUploadStatus( fileLink.status.UPLOADED );
                        debugLog( 'File: "', file.filename, '" was sent to server' );
                    } )
                    .fail( function( error ) {
                        if( !error.code ) {
                            fileLink.fileUploadStatus( fileLink.status.REJECTED_TYPE );
                        } else {
                            fileLink.fileUploadStatus( fileLink.status.REJECTED );
                        }
                        debugLog( 'Error while sending file to server: ', file.filename );
                    } );
            };
            if( file.blob ) {
                readerObj.readAsDataURL( file.blob );
            }
        }

        self.windowHeight = ko.observable( window.innerHeight + 'px' );
        self.partnerVideoHeight = ko.observable( window.innerHeight + 'px' );
        self.isHost = config.isHost;
        self.isTeleConsult = config.isTeleConsult;
        self.lightVersion = config.lightVersion;
        self.sharedNotesI18n = i18n('IntouchPrivateMojit.intouch_conference.title.SHARED_NOTES');
        self.sharedFilesI18n = i18n('IntouchPrivateMojit.intouch_conference.title.SHARED_FILES');
        self.titleResendI18n = i18n('IntouchPrivateMojit.intouch_conference.title.RESEND');
        self.titleMicroI18n = i18n('IntouchPrivateMojit.intouch_conference.title.MICRO');
        self.titleCameraI18n = i18n('IntouchPrivateMojit.intouch_conference.title.CAMERA');
        self.addCameraI18n = i18n('IntouchPrivateMojit.intouch_conference.title.ADD_CAMERA');
        self.addUserI18n = i18n('IntouchPrivateMojit.intouch_conference.title.ADD_USER');
        self.titleHanGupI18n = i18n('IntouchPrivateMojit.intouch_conference.title.HANGUP');
        self.waitingForParticipantI18n = i18n('IntouchPrivateMojit.intouch_conference.title.WAITING_FOR_PARTICIPANT');
        self.waitingForCameraI18n = i18n('IntouchPrivateMojit.intouch_conference.title.WAITING_FOR_CAMERA');
        self.notes = ko.observable( config.consultNote || '' );

        easyrtc.setPeerListener( peerListener );

        self.handleWindowResize = function () {
            var
                windowHeight = window.innerHeight - 20,
                firstVideoBoxHeight = $('.video-boxes > div:nth-child(1) .panel-body video').height(),
                windowHeightPortion = windowHeight * 0.3;

            self.windowHeight( windowHeight + 'px' );

            if ( window.innerWidth > 699 ) {
                self.partnerVideoHeight( windowHeight + 'px' );
            } else {
                self.partnerVideoHeight( ( firstVideoBoxHeight > windowHeightPortion ? firstVideoBoxHeight : windowHeightPortion ) + 'px' );
            }

            self.calcTextAreaHeight( self.notes() );
        };

        self.hangUp = function( data ) {
            var content = data.consultNote ? { consultNote: data.consultNote } : {};
            if( data && data.easyrtcid ) {
                easyrtc.sendServerMessage( 'hangUpUser', {
                    easyrtcid: data.easyrtcid,
                    roomName: (isCamera( data.easyrtcid )) ? cameraRoom : isScreenShare( data.easyrtcid ) ? screenShareRoom : conferenceRoom,
                    content: content
                }, function() {
                }, function() {
                } );
            }
        };
        /**
         * if I'm a host then it will hang everyone up
         * else, hangup only myself
         */
        self.hangUpAll = function() {
            if( self.isHost ) {
                if( config.isTeleConsult ) {
                    submitNote();
                }
                easyrtc.sendServerMessage( 'hangUpAll', {
                    roomName: conferenceRoom,
                    content: {}
                }, function() {
                }, function() {

                } );
            } else { // hangup only myself
                self.hangUp( {
                    easyrtcid: easyrtc.myEasyrtcid,
                    consultNote: self.notes()
                } );
                //easyrtc.leaveRoom( conferenceRoom );
            }
        };
        self.notes.subscribe( function( newValue ) {
            self.calcTextAreaHeight( newValue );

            if( !recievemsg ) {
                sendNotes( newValue );
            }
        } );

        self.calcTextAreaHeight = function(value) {
            var
                numberOfLineBreaks = (value.match(/\n/g) || []).length,
                newHeight = 20 + numberOfLineBreaks * 20 + 12 + 2,
                minHeight = 114,
                windowHeight = parseFloat( self.windowHeight(), 10 ),
                maxHeight = windowHeight * (  window.innerWidth >= 700 ? 0.3 : 0.2 );

            if (
                newHeight < minHeight
            ) {
                newHeight = minHeight;
            } else if (
                newHeight > maxHeight
            ) {
                newHeight = maxHeight;
            }

            $('#notes textarea').height( newHeight );
        };

        self.getVideoBoxByEasyrtcId = function( easyrtcid ) {
            var index;
            self.videoBoxes.some( function( value, key ) {
                if( easyrtcid === value.easyrtcid ) {
                    index = key;
                    return true;
                }
            } );
            if( !isNaN( index ) ) {
                return self.videoBoxes[ index ];
            } else {
                return null;
            }
        };
        self.getFirstFreeVideoBox = function() {
            return self.getVideoBoxByEasyrtcId( '' );
        };
        self.setNewVideo = function( videoBox, config ) {
            config = config || {};
            videoBox.easyrtcid = config.easyrtcid || '';
            videoBox.visible( config.visible || false );
            videoBox.userName( config.userName || '' );
            videoBox.hideControls( config.hideControls );
            videoBox.mRecordRTC = config.mRecordRTC;

            self.handleWindowResize();
        };

        self.colSize = ko.observable( 12 );
        self.videoBoxesSelf =
            getVideoBox( {
                id: videoBoxIdIndex,
                self: true,
                userName: self.lightVersion ? config.name || (config.firstName + ' ' + config.lastName) : YOU,
                visible: true,
                easyrtcid: 'self'
            } );

        self.videoBoxes = [];
        for( i = 1; i <= maxConnectionNumber; i++ ) {
            self.videoBoxes.push( getVideoBox( {
                id: videoBoxIdIndex + i,
                panelBtns: [],
                videoId: i - 1
            } ) );
        }
        self.videoBoxes.push( getVideoBox( {
            id: videoBoxIdIndex + i,
            userName: 'Aufzeichnung',
            easyrtcid: videoRecordId,
            panelBtns: [],
            videoId: i - 1
        } ) );
        self.micrState = ko.observable( true );
        self.camState = ko.observable( !config.audioOnly );
        self.privateCall = ko.observable( config.privateCall );
        self.switchMicrState = function() {
            self.micrState( !self.micrState() );
            easyrtc.enableMicrophone( self.micrState() );
        };
        self.switchCamState = function() {
            self.camState( !self.camState() );
            easyrtc.enableCamera( self.camState() );
        };

        self.openSeparateTab = function( data ) {
            window.open( addParamsToLink( '/intouch/conference_one/' + config.appName, {
                firstName: config.firstName,
                lastName: config.lastName,
                targetCall: data.easyrtcid,
                identityId: config.identityId,
                dcCustomerNo: config.dcCustomerNo,
                host: config.isHost
            } ), '_blank' );
            easyrtc.hangup( data.easyrtcid );
        };

        self.showFileUploadBtn = ko.observable( false );

        self.shareFiles = function( data, $event ) {
            debugLog( 'Sharing files', arguments );
            var inputDOM = $event.target || {},
                i;
            inputDOM.disabled = true;
            for( i = 0; i < inputDOM.files.length; i++ ) {
                self.addFileLink( {
                    filename: inputDOM.files.item( i ).name,
                    blob: inputDOM.files.item( i )
                } );
            }
            sendFilesToAll( inputDOM.files, function() {
                inputDOM.value = '';
                inputDOM.disabled = false;

            } );
        };

        self.fileLinks = ko.observableArray();
        self.addFileLink = function( config ) {
            var fileLink = new FileLinkModel( {
                filename: config.filename,
                blob: config.blob,
                fileIds: fileIds,
                isNew: config.isNew
            } );
            if( self.isHost && self.isTeleConsult ) {
                sendFileToServer( {
                    filename: config.filename,
                    blob: config.blob,
                    type: config.blob.type,
                    fileLink: fileLink
                } );
            }
            self.fileLinks.push( fileLink );
            fileIds++;
        };
        self.downloadFile = function( data ) {
            if( data && data.blob && data.filename ) {
                easyrtc_ft.saveAs( data.blob, data.filename );
            }
            debugLog( 'Downloading files', data );
        };
        self.removeFile = function( data ) {
            debugLog( 'Removing files', data );
            self.fileLinks.remove( function( file ) {
                return file.id === data.id;
            } );
        };
        self.getFile = function( filename ) {
            var result = null;
            self.fileLinks().some( function( file ) {
                if( file.filename === filename ) {
                    result = file;
                    return true;
                }
            } );
            return result;
        };
        self.resendFiles = function( data, $event ) {
            if( self.fileLinks().length ) {
                $event.target.disabled = true;
                sendFilesToAll( self.fileLinks().map( function( file ) {
                    var result = file.blob;
                    if( !result.name ) {
                        result.name = file.filename;
                    }
                    return result;
                } ), function() {
                    $event.target.disabled = false;
                } );
            }
        };

        self.openExtraCamera = function() {
            cameraNumber++;
            window.open( addParamsToLink( '/intouch/conference_camera/' + config.appName, {
                cameraName: getCameraName( config.firstName, config.lastName, cameraNumber )
            } ), '_blank' );
        };

        self.openExtraScreenShare = function() {
            var match = navigator.userAgent.match( /Firefox\/([0-9]+)\./ ),
                version = match ? Number( match[ 1 ] ) : 0;
            if( !version || 52 > version ) {
                Y.doccirrus.DCWindow.notice( {
                    message: USE_LATEST_FIREFOX
                } );
                return;
            }
            screenShareNumber++;
            window.open( addParamsToLink( '/intouch/conference_screen_share/' + config.appName, {
                screenShareName: getScreenShareName( config.firstName, config.lastName, screenShareNumber ),
                screenCaptureMode: ko.unwrap( self.screenCaptureMode )
            } ), '_blank' );
        };
        self.screenCaptureMode = ko.observable( 'application' );
        self.select2ScreenCaptureMode = {
            val: ko.computed( {
                read: function() {
                    var
                        screenCaptureMode = ko.unwrap( self.screenCaptureMode );
                    return screenCaptureMode;
                },
                write: function( $event ) {
                    self.screenCaptureMode( $event.val );
                }
            } ),
            select2: {
                width: '100%',
                data: [
                    {
                        id: 'window',
                        text: SHARE_WINDOW
                    },
                    {
                        id: 'application',
                        text: SHARE_APPLICATION
                    },
                    {
                        id: 'screen',
                        text: SHARE_SCREEN
                    }
                ]
            }
        };

        self.inviteParticipant = function() {
            Y.doccirrus.modals.inviteParticipantModal.showDialog( function( data ) {
                data.conferenceId = config.appName;
                data.audioOnly = config.audioOnly;
                inviteByEmail( data );
            } );
        };

        self.recordVideo = function( data ) {
            var mRecordRTC = data.mRecordRTC;
            mRecordRTC.startRecording();
            if( data.recording ) {
                data.recording( true );
            }
        };

        videoRecordBox = self.getVideoBoxByEasyrtcId( 'videoRecord' );
        videoRecordBox.hideControls( true );

        self.stopRecordVideo = function( data ) {
            var mRecordRTC = data.mRecordRTC;

            if( data.recording ) {
                data.recording( false );
            }

            if( data.recordPaused() ) {
                data.recordPaused( false );
                data.mRecordRTC.resumeRecording();
            }

            mRecordRTC.stopRecording( function( url, type ) {

                /**
                 * this callback is called twice(Chrome), 1 - for audio, 2 - video
                 * once in FireFox with type === 'video'
                 */
                if( 'video' === type ) {
                    mRecordRTC.getDataURL( function( DataURLS ) {
                        var fileName = 'test';
                        recordFile = { // eslint-disable-line no-unused-vars
                            audio: {
                                name: fileName + '.wav',
                                type: 'audio/wav',
                                content: DataURLS.audio
                            },
                            video: {
                                name: fileName + '.webm',
                                type: 'video/webm',
                                content: DataURLS.video
                            }
                        };
                    } );
                }

                var video = $( '#' + videoRecordBox.id )[ 0 ];
                videoRecordBox.visible( true );
                if( data.videoRecordURL ) {
                    data.videoRecordURL( url );
                }
                video.src = url;
                self.colSize( getColSize( alreadyConnected + 1 ) );
            } );
        };

        self.closeVideoRecord = function() {
            var video = $( '#' + videoRecordBox.id )[ 0 ];
            videoRecordBox.visible( false );
            video.src = null;
            self.colSize( getColSize( alreadyConnected ) );
        };
        self.playVideoRecord = function() {
            var video = $( '#' + videoRecordBox.id )[ 0 ];
            video.load();
        };
        self.saveVideoRecord = function( data ) {
            data.mRecordRTC.getBlob( function( blobs ) {
                if( blobs.audio ) {
                    easyrtc_ft.saveAs( blobs.audio, 'audio' );
                }
                if( blobs.video ) {
                    easyrtc_ft.saveAs( blobs.video, 'video.webm' );
                }
            } );
        };
        self.openPreView = function( data ) {
            var video = $( '#' + videoRecordBox.id )[ 0 ];
            videoRecordBox.visible( true );
            video.src = data.videoRecordURL();
            self.colSize( getColSize( alreadyConnected + 1 ) );
        };
        self.pauseRecordVideo = function( data ) {
            if( !data.recordPaused() ) {
                data.recordPaused( true );
                data.mRecordRTC.pauseRecording();
            } else {
                data.recordPaused( false );
                data.mRecordRTC.resumeRecording();
            }
        };

        self.testSpeed = KoComponentManager.createComponent( {
            componentType: 'KoButton',
            componentConfig: {
                name: 'testSpeed',
                text: SPEED_TEST,
                option: 'PRIMARY',
                size: 'SMALL',
                click: function() {
                    Y.doccirrus.modals.speedTestModal.showDialog( easyrtc );
                }
            }
        } );

        self.handleWindowResize();

        $( window ).on( 'resize.conference', _.debounce(self.handleWindowResize, 100) );
    }

    function getCameraName( firstName, lastName, cameraNumber ) {
        var cameraIndex = (1 < cameraNumber) ? ' ' + cameraNumber : '';
        return firstName + ' ' + lastName + ' ( ' + ADDITIONAL_CAMERA + cameraIndex + ' )';
    }

    function getScreenShareName( firstName, lastName, screenShareNumber ) {
        var cameraIndex = (1 < screenShareNumber) ? ' ' + screenShareNumber : '';
        return firstName + ' ' + lastName + ' ( ' + ADDITIONAL_SCREEN_SHARE + cameraIndex + ' )';
    }

    /**
     * @module IntouchConferenceBinderIndex
     */
    /**
     * @class IntouchConferenceBinderIndex
     * @constructor
     */
    Y.namespace( 'mojito.binders' )[ NAME ] = {

        jaderef: 'IntouchPrivateMojit',

        init: function( mojitProxy ) {
            this.mojitProxy = mojitProxy;
            if( !Y.doccirrus.utils.supportsWebRTC() ) {
                window.open( '/intouch/conference_wrongbrowser', '_self' );
                return;
            }
        },

        bind: function() {
            var appName = this.mojitProxy.pageData.get( 'conferenceName' ),
                firstName = this.mojitProxy.pageData.get( 'firstName' ) || '',
                lastName = this.mojitProxy.pageData.get( 'lastName' ) || '',
                name = this.mojitProxy.pageData.get( 'name' ) || '',
                identityId = this.mojitProxy.pageData.get( 'identityId' ),
                dcCustomerNo = this.mojitProxy.pageData.get( 'dcCustomerNo' ),
                isHost = this.mojitProxy.pageData.get( 'host' ),
                isTeleConsult = this.mojitProxy.pageData.get( 'teleConsult' ),
                audioOnly = this.mojitProxy.pageData.get( 'audioOnly' ),
                privateCall = this.mojitProxy.pageData.get( 'privateCall' ),
                lightVersion = this.mojitProxy.pageData.get( 'lightVersion' ),
                consultNote = this.mojitProxy.pageData.get( 'consultNote' ),
                conferenceModel = new ConferenceModel( {
                    appName: appName,
                    callId: appName,
                    isHost: isHost,
                    firstName: firstName,
                    lastName: lastName,
                    name: name,
                    audioOnly: audioOnly,
                    privateCall: privateCall,
                    consultNote: consultNote,
                    isTeleConsult: isTeleConsult,
                    lightVersion: lightVersion
                } );
            Y.doccirrus.communication.once( {
                event: 'CALL_CANCELLED',
                done: function( response ) {
                    var
                        data = response.data && response.data[ 0 ];
                    if( appName === data.callData.callId ) {
                        closeWindow();
                    }
                }
            } );
            ko.applyBindings( conferenceModel, document.querySelector( '#conference' ) );
            Y.doccirrus.uam.utils.initDCPanels();
            connect( {
                conferenceModel: conferenceModel,
                appName: appName,
                userName: name || ( firstName + ' ' + lastName ),
                identityId: identityId,
                dcCustomerNo: dcCustomerNo,
                isHost: isHost,
                audioOnly: audioOnly
            } );

            // hangup on closing the tab
            window.addEventListener( "unload", function() {
                if( shouldIHangup ) {
                    conferenceModel.hangUpAll();
                }
            } );
        }
    };
}, '0.0.1', {
    requires: [
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
        'dccommunication-client',
        'DCInviteParticipantModal',
        'dcutils',
        'dc-comctl',
        'DCSpeedTestModal',
        'KoUI-all'
    ]
} );