/**
 *  Modal to contain audio player for transcription / playback from forms.
 *
 *  This replaces the simple playback modal to add transcription options and gamepad support.
 *
 *  For the wavesurfer playback / visualization, see documentation here:
 *
 *      http://wavesurfer-js.org/docs/methods.html
 *
 *  User: strix
 *  Date: 2019-03-28
 *  (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI, WaveSurfer, ko, moment, async, $ */

'use strict';

YUI.add( 'transcribeaudiomodal', function( Y, NAME ) {

        var i18n = Y.doccirrus.i18n;

        /**
         *  Viewmodel for binding transcription controls
         *  @constructor
         */

        function TranscriptionAudioVM( settings ) {

            var
                self = this,

                wavesurfer,
                mediaObj = null,

                mediaId = settings.mediaId || '',
                isPatientPortal = ( settings.patientRegId && settings.patientRegId !== '' ),
                proxyDataURI = null;

            function initVm() {

                self.isInitialized = ko.observable( false );
                self.isLoading = ko.computed( function() { return !self.isInitialized(); } );

                self.skipStep = ko.observable( 5 );
                self.isPlaying = ko.observable( false );
                self.isRightSkipDown = ko.observable( false );
                self.isLeftSkipDown = ko.observable( false );

                self.currentTime = ko.observable( 0 );
                self.currentTimeText = ko.computed( function() {
                    var inSeconds = parseInt( self.currentTime(), 10);
                    return moment.utc( inSeconds * 1000 ).format( 'HH:mm:ss' );
                } );

                self.currentTimeText.extend({ rateLimit: { timeout: 100, method: "notifyAtFixedRate" } });


                //  listen for gampad button presses
                self.gamepadSub = Y.on( 'gamepadButtonPress', onGamepadButtonPress );

                //  listen for keyboard control
                $( document ).off( 'keydown.transcription' ).on( 'keydown.transcription', function( evt ) { self.documentKeydown( evt ); } );

                //  get the media metadata, download audio file, decode it and show waveform
                //  TODO: tidy this
                async.series( [ loadMedia, downloadAudio, initPlayer ], onVmReady );

                function onVmReady( err ) {
                    if ( err ) {
                        //  TODO: show message in UI
                        Y.log( 'Could not initialize TranscriptionAudioVM: ' + JSON.stringify( err ), 'warn', NAME );
                        return;
                    }
                    self.isInitialized( true );
                }
            }

            function loadMedia( itcb ) {
                if ( isPatientPortal ) {
                    //  if we are on the patient portal then we cannot load media directly, use blind proxy
                    Y.doccirrus.blindproxy.getSingle( settings.patientRegId, '/1/media/' + mediaId, {}, onProxyLoad );
                    return;
                }

                Y.doccirrus.jsonrpc.api.media.read( { 'query': { '_id': mediaId } } )
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
                    useSrc = proxyDataURI ? proxyDataURI : absMP3Url;

                wavesurfer = WaveSurfer.create({
                    container: '#divWaveform',
                    waveColor: '#aaaaaa',           //  TODO: better configuration for this
                    progressColor: '#428bca',
                    scrollParent: true
                });

                wavesurfer.load( useSrc );
                wavesurfer.on('ready', function () {
                    itcb( null );
                });

                wavesurfer.on('audioprocess', function() {
                    self.currentTime( wavesurfer.getCurrentTime() );
                } );

                wavesurfer.on('audioprocess', function() {
                    self.currentTime( wavesurfer.getCurrentTime() );
                } );

                wavesurfer.on('seek', function() {
                    self.currentTime( wavesurfer.getCurrentTime() );
                } );
            }

            self.dispose = function __dispose() {
                if ( wavesurfer ) { wavesurfer.destroy(); }
                if ( self.gamepadSub ) { self.gamepadSub.detach(); }
                $( document ).off( 'keydown.transcription' );
            };

            //  public methods

            self.setSkipStep = function __setSkipStep( skipBy ) {
                if ( !self.isInitialized() ) { return; }
                self.skipStep( parseInt( skipBy, 10  ) );
            };

            self.skipBackward = function __skipBackward() {
                if ( wavesurfer.getCurrentTime() > self.skipStep() ) {
                    wavesurfer.skipBackward( self.skipStep() );
                } else {
                    wavesurfer.seekTo( 0 );
                }
            };

            self.skipForward = function __skipForward() {
                if (  wavesurfer.getCurrentTime() + self.skipStep() > wavesurfer.getDuration() ) {
                    //  do not seek past end
                    self.seekTo( 1 );
                } else {
                    wavesurfer.skipForward( self.skipStep() );
                }
            };

            //  UI events

            self.onPauseClick = function __onPauseClick() {
                if ( !self.isInitialized() ) { return; }
                wavesurfer.pause();
                self.isPlaying( false );
            };

            self.onPlayClick = function __onPlayClick() {
                if ( !self.isInitialized() ) { return; }
                wavesurfer.play();
                self.isPlaying( true );
            };

            self.onToStartClick = function() {
                if ( !self.isInitialized() ) { return; }
                wavesurfer.seekTo( 0 );
            };

            self.onToEndClick = function __onToEndClick() {
                wavesurfer.pause();
                self.isPlaying( false );
                wavesurfer.seekTo( 1 );
                self.isPlaying( false );
            };

            //  audio events

            /**
             *  Raised by gamepad-utils.client.js in response to state changes in foot pedal buttons
             *
             *  @param  {Object}    evt
             *  @param  {Number}    evt.buttonIdx       Integer, which button
             *  @param  {Number}    evt.value           0 for up, 1 for down
             */

            function onGamepadButtonPress( evt ) {
                //  do not try to control audio playback while UI is still loading
                if ( !self.isInitialized ) { return; }

                if ( Y.doccirrus.gamepadUtils.MIDDLE_PEDAL === evt.buttonIdx ) {
                    if ( !wavesurfer.isPlaying() && 1 === evt.value ) {
                        wavesurfer.play();
                        self.isPlaying( true );
                    }

                    if ( wavesurfer.isPlaying() && 0 === evt.value ) {
                        wavesurfer.pause();
                        self.isPlaying( false );
                    }
                }

                if ( Y.doccirrus.gamepadUtils.LEFT_PEDAL === evt.buttonIdx ) {
                    self.isLeftSkipDown( 1 === evt.value );
                    if ( 1 === evt.value ) {
                        self.skipBackward();
                    }
                }

                if ( Y.doccirrus.gamepadUtils.RIGHT_PEDAL === evt.buttonIdx) {
                    self.isRightSkipDown( 1 === evt.value );
                    if ( 1 === evt.value ) {
                        self.skipForward();
                    }
                }
            }


            /**
             *  Keyboard control of modal with ASDF
             *
             *      A   - skip back
             *      D   - start/stop playback
             *      F   - skip forward
             *
             *      Q   - skip to start
             *      W   - skip to end
             *
             *      E   - set skip to 1s
             *      R   - set skip to 2s
             *      T   - set skip to 5s
             *      Y   - set skip to 10s
             *
             *  @param evt
             */

            self.documentKeydown = function( evt ) {
                var key = evt.key || evt.keyCode;

                if ( !self.isInitialized() ) {
                    return;
                }

                switch ( key ) {

                    case 'A':
                    case 'a':
                        self.skipBackward();
                        break;

                    case 'D':
                    case 'd':
                        if ( self.isPlaying() ) {
                            self.onPauseClick();
                        } else {
                            self.onPlayClick();
                        }
                        break;

                    case 'F':
                    case 'f':
                        self.skipForward();
                        break;

                    case 'Q':
                    case 'q':
                        self.onToStartClick();
                        break;


                    case 'W':
                    case 'w':
                        self.onToEndClick();
                        break;

                    case 'E':
                    case 'e':
                        self.setSkipStep( 1 );
                        break;

                    case 'R':
                    case 'r':
                        self.setSkipStep( 2 );
                        break;

                    case 'T':
                    case 't':
                        self.setSkipStep( 5 );
                        break;

                    case 'Y':
                    case 'y':
                        self.setSkipStep( 10 );
                        break;
                }

            };

            initVm();
        }

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

        function showTranscriptionModal( settings ) {
            var
                modal,          //  eslint-disable-line no-unused-vars

                mediaId = settings.mediaId || '',
                transcriptionAudioVM,

                containerNode = Y.Node.create( '<div id="divModalAudioPlayback"></div>' ),

                windowDefinition = {
                    className: 'DCWindow-Resize',
                    bodyContent: containerNode,
                    title: ' ' + i18n( 'MediaMojit.playaudiomodal.TITLE' ),
                    icon: Y.doccirrus.DCWindow.ICON_PLAY,
                    centered: true,
                    modal: false,
                    dragable: true,
                    maximizable: true,
                    resizeable: true,
                    width: 760,
                    height: 260,
                    render: document.body,
                    buttons: {
                        header: ['close', 'maximize'],
                        footer: [ ]
                    },
                    after: {
                        destroy: onModalDestroyed
                    }
                };

            async.series( [ loadJadeTemplate, createModal], onModalReady );

            function loadJadeTemplate( itcb ) {
                YUI.dcJadeRepository.loadNodeFromTemplate(
                    'transcribe_audio',
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

                transcriptionAudioVM = new TranscriptionAudioVM( settings );
                ko.applyBindings( transcriptionAudioVM, document.querySelector( '#divTranscriptionModalControls' ) );

                itcb( null );
            }

            function onModalReady( err ) {
                if ( err ) {
                    Y.log( 'Problem loading audio for playback: ' + JSON.stringify( err ), 'warn', NAME );
                    return;
                }

                Y.log('Audio playback window created: ' + mediaId, 'debug', NAME);
            }

            //  window events

            function onModalDestroyed() {
                if ( containerNode ) { containerNode.destroy(); }
                Y.log( 'Closed audio playback modal: ' + mediaId, 'debug', NAME );

                //  TODO: correct YUI event unsubscription
                //Y.off( 'gamepadButtonPress' );
                transcriptionAudioVM.dispose();
            }
        }

        Y.namespace( 'doccirrus.modals' ).transcribeAudio = {
            show: showTranscriptionModal
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