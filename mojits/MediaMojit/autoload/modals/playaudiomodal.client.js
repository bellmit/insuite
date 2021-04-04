/**
 *  Modal to contain audio player controls (where current UI does not contain any)
 *
 *  Likely to be phased out as audio controls added inline to UI which could use it.
 *
 *  User: strix
 *  Date: 2019-03-28
 *  (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI, async */

'use strict';

YUI.add( 'playaudiomodal', function( Y, NAME ) {

        var i18n = Y.doccirrus.i18n;

        Y.namespace( 'doccirrus.modals' ).playAudio = {

            /**
             *  Show the modal and load media into player
             *
             *  @param  {Object}    settings
             *
             *  Options for media upload / ownership
             *
             *  @param  {String}    settings.mediaId        Database _id of an audio/mp3 media object
             *  @param  {String}    settings.patientRegId   Used to conntect to PRC from patient portal
             */

            show: function( settings ) {
                var
                    mediaId = settings.mediaId || '',
                    isPatientPortal = ( settings.patientRegId && settings.patientRegId !== '' ),
                    mediaObj = null,
                    proxyDataURI = null,

                    yuiCache,
                    modal,          //  eslint-disable-line no-unused-vars

                    containerNode = Y.Node.create( '<div id="divModalAudioPlayback"></div>' ),

                    windowDefinition = {
                        className: 'DCWindow-Resize',
                        bodyContent: containerNode,
                        title: i18n( 'MediaMojit.playaudiomodal.TITLE' ),
                        icon: Y.doccirrus.DCWindow.ICON_PLAY,
                        centered: true,
                        modal: false,
                        dragable: true,
                        maximizable: true,
                        resizeable: false,
                        width: 560,
                        height: 180,
                        render: document.body,
                        buttons: {
                            header: ['close', 'maximize'],
                            footer: [ ]
                        },
                        after: {
                            destroy: onModalDestroyed
                        }
                    };

                async.series( [ loadJadeTemplate, createModal, loadMedia, downloadAudio, initPlayer, connectGamepad ], onModalReady );

                function loadJadeTemplate( itcb ) {
                    YUI.dcJadeRepository.loadNodeFromTemplate(
                        'play_audio',
                        'MediaMojit',
                        {},
                        containerNode,
                        onJadeTemplateLoaded
                    );

                    function onJadeTemplateLoaded(err /*, status, nodeObj */ ) {
                        if ( err ) { return itcb( err ); }
                        itcb( null );
                    }
                }

                function createModal( itcb ) {
                    modal = new Y.doccirrus.DCWindow( windowDefinition );

                    //  use YUI rather then jQuery since simpler to handle multiple windows
                    yuiCache = {
                        'divAudioPlayerContainer': containerNode.one( '#divAudioPlayerContainer' ),
                        'divAudioPlayerDescription': containerNode.one( '#divAudioPlayerDescription' )
                    };

                    itcb( null );
                }

                function loadMedia( itcb ) {
                    if ( isPatientPortal ) {
                        //  if we are on the patient portal then we cannot load media directly, use blind proxy
                        Y.doccirrus.blindproxy.getSingle( settings.patientRegId, '/1/media/' + mediaId, {}, onProxyLoad );
                        return;
                    }

                    Y.doccirrus.jsonrpc.api.media
                        .read( { 'query': { '_id': mediaId } } )
                        .then( onMediaLoaded )
                        .fail( itcb );

                    function onProxyLoad( err, result ) {
                        if ( err ) { return itcb( err ); }
                        onMediaLoaded( result );
                    }

                    function onMediaLoaded( result ) {
                        result = result.data ? result.data : result;
                        mediaObj = result[0] ? result[0] : null;

                        if ( !mediaObj ) { return itcb( 'Media not found, metadata could not be loaded.' ); }
                        itcb( null );
                    }
                }

                function downloadAudio( itcb ) {
                    //  if not on the patient portal, we can skip this step and access the media directly
                    if ( !isPatientPortal ) { return itcb( null ); }

                    var
                        requestArgs = {
                            'mediaId': mediaObj._id,
                            'transform': 'original',
                            'mimeType': mediaObj.mimeType
                        };

                    Y.doccirrus.blindproxy.getSingle( settings.patientRegId, '/1/media/:loadDataURI', requestArgs, onLoadDataURI );

                    function onLoadDataURI( err, result ) {
                        if ( err ) { return itcb( err ); }

                        result = result.data ? result.data : result;
                        proxyDataURI = result.dataURI ? result.dataURI : result;
                        itcb( null );
                    }

                }

                function initPlayer( itcb ) {
                    var
                        ext = Y.doccirrus.media.getExt( mediaObj.mime ),
                        relMP3Url = '/media/' + mediaId + '_original.' + mediaObj.mime + '.' + ext,
                        absMP3Url = Y.doccirrus.infras.getPrivateURL( relMP3Url ),
                        useSrc = proxyDataURI ? proxyDataURI : absMP3Url,
                        playerId = 'a' + Y.doccirrus.comctl.getRandId(),
                        playerHtml = '' +
                            '<audio id="' + playerId + '" controls style="width: 100%">' +
                                '<source src="' + useSrc + '" />' +
                            '</audio>',

                        playerDesc = '<b>Dateiname: </b> ' + mediaObj.name + '<br/>';

                    yuiCache.divAudioPlayerContainer.setHTML( playerHtml );
                    yuiCache.divAudioPlayerDescription.setHTML( playerDesc );
                    yuiCache.audioElem = containerNode.one( '#' + playerId );

                    itcb( null );
                }

                function connectGamepad( itcb ) {
                    Y.on( 'gamepadButtonPress', onGamepadButtonPress );
                    itcb( null );
                }

                function onModalReady( err ) {
                    if ( err ) {
                        Y.log( 'Problem loading audio for playback: ' + JSON.stringify( err ), 'warn', NAME );
                        return;
                    }

                    Y.log('Audio playback window created: ' + mediaId, 'debug', NAME);
                }

                //  audio events

                function onGamepadButtonPress( evt ) {
                    var audioNode = yuiCache.audioElem._node;

                    var SKIP_BY = 1;

                    if ( !audioNode ) { return; }

                    if ( Y.doccirrus.gamepadUtils.MIDDLE_PEDAL === evt.buttonIdx ) {
                        if ( audioNode.paused ) {
                            audioNode.play();
                        } else {
                            audioNode.pause();
                        }
                    }

                    if ( Y.doccirrus.gamepadUtils.LEFT_PEDAL === evt.buttonIdx && 1 === evt.value ) {
                        //console.log( '(LEFT) current time: ', audioNode.currentTime, SKIP_BY );
                        if ( audioNode.currentTime > SKIP_BY ) {
                            audioNode.currentTime = audioNode.currentTime - SKIP_BY;
                            //console.log( '(LEFT) set to: ', audioNode.currentTime );
                        } else {
                            audioNode.currentTime = 0;
                            //console.log( '(LEFT) set to: start' );
                        }

                    }

                    if ( Y.doccirrus.gamepadUtils.RIGHT_PEDAL === evt.buttonIdx && 1 === evt.value ) {
                        if ( audioNode.currentTime + SKIP_BY > audioNode.duration ) { return; }
                        audioNode.currentTime = audioNode.currentTime + SKIP_BY;
                    }
                }

                //  window events

                function onModalDestroyed() {
                    if ( containerNode ) { containerNode.destroy(); }
                    Y.log( 'Closed audio playback modal: ' + mediaId, 'debug', NAME );
                    Y.off( 'gamepadButtonPress' );
                }
            }

        };

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'gamepad-utils'
        ]
    }
);