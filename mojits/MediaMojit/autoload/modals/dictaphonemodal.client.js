/**
 *  Modal for recording audio via getUserMedia and wavesurfer.js
 *
 *  Replacement of previous microphone input modal to allow dictaphone features for MOJ-10628
 *
 *  Audio will then be used in forms or activity attachments, and may be shared via patient portal
 *
 *  Still TODO:
 *
 *      (*) reload captured audio for editing when re-opening modal
 *      (*) move mp3 encoding into a web worker
 *      (*) check if we need echo cancellation
 *      (*) move wav encoder to its own file
 *
 *  User: strix
 *  Date: 2019-03-28
 *  (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI, $, ko, async, WaveSurfer, moment, Mp3LameEncoder, invokeSaveAsDialog */

/*eslint prefer-template:0, strict:0 */
'use strict';

YUI.add( 'dictaphoneinputmodal', function( Y, NAME ) {

        var
            ENCODER_BIT_RATE = 160,     //  mp3 bit rate

            //AUDIO_SAMPLE_RATE = 48000,
            PASSIVE_COLOR = '#aaaaaa',
            RECORD_COLOR = '#428bca',

            i18n = Y.doccirrus.i18n,

            LBL_ENCODING = i18n('MediaMojit.microphonemodal.LBL_ENCODING'),
            LBL_COLLECTING = i18n('MediaMojit.microphonemodal.LBL_COLLECTING'),
            LBL_DURATION = i18n('MediaMojit.microphonemodal.LBL_DURATION'),

            AUDIO_SUPPORTED_TYPES = [
                'audio/webm',
                'audio/ogg; codecs=opus',
                'audio/ogg',
                'audio/mp3'
            ],

            AUDIO_UPLOAD_OPTIONS = {
                template: 'qq-template-gallery',
                //form: 'frmFineUploadMeta',
                request: {
                    endpoint: Y.doccirrus.infras.getPrivateURL( '/1/media/:uploadchunked' )
                },
                thumbnails: {
                    placeholders: {
                        waitingPath: '/static/dcbaseapp/assets/lib/fine-uploader/placeholders/waiting-generic.png',
                        notAvailablePath: '/static/dcbaseapp/assets/lib/fine-uploader/placeholders/not_available-generic.png'
                    }
                },
                validation: {
                    allowedExtensions: [ 'mp3', 'ogg', 'webm', 'wav' ]
                },
                chunking: {
                    enabled: true,
                    partSize: ( 1024 * 1024 )
                },
                folders: true,
                cors: {
                    expected: true,
                    sendCredentials: true,
                    allowXdr: true
                }
            };

        /**
         *  ViewModel for binding dictaphone modal
         *  @param  {Object}    settings    Audio ownership and event handlers/callbacks
         *  @param  {Object}    modal       DCWindow object which contains this dictaphone
         *  @constructor
         */

        function DictaphoneModalVM( settings, modal ) {
            var
                self = this,

                //echoCancellation = isEdge ? true : { 'echoCancellation': false },

                onMediaAdded = settings.onAdd || Y.dcforms.nullCallback,

                ownerCollection = settings.ownerCollection || 'test',
                ownerId = settings.ownerId || 'test',

                recorder,
                microphone,
                audioStream,

                audioContext,
                streamSource,
                streamProcessor,

                wavesurferMic,
                wavesurferPlayer;

            function initVm() {

                //  translations
                self.btnStartRecordingI18n = i18n('MediaMojit.microphonemodal.BTN_START_RECORDING');
                self.btnStopRecordingI18n = i18n('MediaMojit.microphonemodal.BTN_STOP_RECORDING');
                self.btnDownloadI18n = i18n('MediaMojit.microphonemodal.BTN_DOWNLOAD');
                self.btnAttachI18n = i18n('MediaMojit.microphonemodal.BTN_ATTACH');

                //  observables
                self.statusMessage = ko.observable( '...' );
                self.hasMicAccess = ko.observable( false );
                self.isRecording = ko.observable( false );
                self.hasFile = ko.observable( false );

                self.frameCount = ko.observable( 0 );
                self.totalFrameDuration = ko.observable( 0 );

                self.isPlaying = ko.observable( false );
                self.currentPlayerTime = ko.observable( 0 );

                self.isEncoding = ko.observable( false );
                self.isUploading = ko.observable( false );

                self.skipStep = ko.observable( 1 );
                self.isLeftSkipDown = ko.observable( false );
                self.isRightSkipDown = ko.observable( false );

                self.regionCount = ko.observable( 0 );
                self.latestRegion = ko.observable( null );
                self.hasRegion = ko.observable( false );

                self.encodeFormat = ko.observable( 'mp3' );

                //  collected frames of raw data
                self.frames = [];
                self.joinedBuffer = null;

                //  computed to control download / attach buttons, true when we have data to use
                self.hasAudioData = ko.computed(
                    function() { return self.frameCount() > 0;
                } );

                //  mime type of file to create from audio data
                self.encodeMimeType = ko.computed( function() {
                    return ( self.encodeFormat() === 'mp3' ) ? 'audio/mp3' : 'audio/x-wav';
                } );

                self.isNotUploading = ko.computed( function() { return !self.isUploading(); } );

                //  pretty-print the duration as HH:mm:ss
                self.totalFrameDurationText = ko.computed( function() {
                    var inSeconds = parseInt( self.totalFrameDuration(), 10);
                    return '&nbsp;' + LBL_DURATION + ':&nbsp;' + moment.utc( inSeconds * 1000 ).format( 'HH:mm:ss' ) + '&nbsp;-&nbsp;';
                } );

                //  overall audio context used by this
                audioContext = new AudioContext();

                //  init wavesurfer with microphone plugin
                initWavesurferMicrophone();

                //  init wavesurfer to play back audio
                initWavesurferPlayer();

                //  init Fine uploader (send large audio files in chunks)
                initFineUploader();

                //  listen for gamepad button presses
                self.gamepadSub = Y.on( 'gamepadButtonPress', onGamepadButtonPress );
                
                //  listen for keyboard control
                $( document ).off( 'keydown.dictaphone' ).on( 'keydown.dictaphone', function( evt ) { self.documentKeydown( evt ); } );
            }


            function initFineUploader() {
                //  set up the upload control

                function linkUploadError( event, id, name, reason ) {
                    onChunkedUploadError( event, id, name, reason );
                }

                function linkUploadComplete( event, id, name, responseJson ) {
                    onChunkedUploadComplete( event, id, name, responseJson );
                }

                var jqDiv = $( '#divFineUploadAudio' );

                jqDiv.fineUploader( AUDIO_UPLOAD_OPTIONS )
                    .on( 'error', linkUploadError )
                    .on( 'complete', linkUploadComplete );
            }

            /**
             *  Init wavesurfer control with microphone plugin to get stream
             */

            function initWavesurferMicrophone() {

                //  Microphone plugin is built into WaveSurfer with grunt
                //  see: https://wavesurfer-js.org/example/microphone/index.html

                wavesurferMic = WaveSurfer.create({
                    container: '#divWaveformMic',
                    waveColor: PASSIVE_COLOR,
                    interact: false,
                    cursorWidth: 0,
                    plugins: [
                        WaveSurfer.microphone.create()
                    ]
                });

                var limit = 100;

                //  When we have a stream, hook it up to a stream processor so we can receive raw data
                //  see: https://developers.google.com/web/fundamentals/media/recording-audio/

                wavesurferMic.microphone.on('deviceReady', function( newStream ) {

                    self.statusMessage( i18n('MediaMojit.microphonemodal.LBL_MICROPHONE_CONNECTED') );
                    audioStream = newStream;

                    streamSource = audioContext.createMediaStreamSource( audioStream );

                    //  Make a new streamProcessor from audio context:
                    streamProcessor = audioContext.createScriptProcessor( 1024, 1, 1 );

                    //  Connecting streamSource to streamProcessor, will allow us to collect audio in little chunks
                    streamSource.connect( streamProcessor );
                    streamProcessor.connect( audioContext.destination );

                    streamProcessor.onaudioprocess = function( e ) {
                        // Do something with the data, i.e Convert this to WAV


                        if ( self.isRecording() ) {

                            //  copyMonoAudioBuffer is necessary because Chrome recycles inbutBuffer sometimes, leading
                            //  to stutter as the same few inputbuffers are referenced repeatedly in self.frames
                            self.frames.push( copyMonoAudioBuffer( e.inputBuffer ) );

                            self.frameCount( self.frames.length );
                            self.totalFrameDuration( self.totalFrameDuration() + e.inputBuffer.duration );

                        }

                        if ( limit > 100 ) { return; }
                        limit++;
                    };

                    self.hasMicAccess( true );
                });

                wavesurferMic.microphone.on('deviceError', function( code ) {
                    self.statusMessage( i18n('MediaMojit.microphonemodal.LBL_DEVICE_ERROR') + code );
                    Y.log( 'Device error: ' + code, 'warn', NAME );
                });

                // start the microphone
                wavesurferMic.microphone.start();
            }

            /**
             *  Add a wavesurfer element to show captured waveform, allow playback, selection, cut
             */

            function initWavesurferPlayer() {

                wavesurferPlayer = WaveSurfer.create({
                    container: '#divWaveformPlayer',
                    waveColor: PASSIVE_COLOR,
                    progressColor: RECORD_COLOR,
                    scrollParent: true,

                    //  testing
                    plugins: [
                        WaveSurfer.regions.create( {
                            regions: [],
                            dragSelection: {
                                slop: 5
                            }
                        })
                    ]
                });

                wavesurferPlayer.on('audioprocess', function() {
                    self.currentPlayerTime( wavesurferPlayer.getCurrentTime() );
                } );

                wavesurferPlayer.on('audioprocess', function() {
                    self.currentPlayerTime( wavesurferPlayer.getCurrentTime() );
                } );

                wavesurferPlayer.on('seek', function() {
                    self.currentPlayerTime( wavesurferPlayer.getCurrentTime() );
                } );

                wavesurferPlayer.on( 'pause', function() {
                    self.isPlaying( false );
                } );

                wavesurferPlayer.on( 'play', function() {
                    self.isPlaying( true );
                } );

                wavesurferPlayer.on( 'finished', function() {
                    self.isPlaying( false );
                } );

                wavesurferPlayer.on( 'ready', function() {
                    wavesurferPlayer.skip( self.currentPlayerTime()  ); // and skip forward to where we were before
                } );

                wavesurferPlayer.on( 'region-created', function( newRegion ) {
                    //console.log( '(****) on region created: ', newRegion );
                    //console.log( '(****) list of regions: ', wavesurferPlayer.regions.list );

                    var k;

                    for ( k in wavesurferPlayer.regions.list ) {
                        if ( wavesurferPlayer.regions.list.hasOwnProperty( k ) ) {
                            if ( k !== newRegion) {
                                //console.log( '(****) removing region: ', k );
                                wavesurferPlayer.regions.list[k].remove();
                            }
                        }
                    }

                    self.latestRegion( newRegion );
                    self.regionCount( 1 );
                    self.hasRegion( true );
                } );

            }

            /**
             *  To start recording, we simply begin collecting frames emitted by the stream processor
             */

            function startRecording() {
                wavesurferMic.setWaveColor( RECORD_COLOR );
                self.isRecording( true );
            }

            /**
             *  When we finish recording (ie, collecing frames from the microphone) we need to join them
             *  all together into a new audio file which can be played or saved.
             */

            function stopRecording() {
                wavesurferMic.setWaveColor( PASSIVE_COLOR );
                self.isRecording( false );
                //encodeFrames();
                showCapturedFrames();
            }

            function getAudioMimeType() {
                var audioMimeType, i;

                for ( i = 0; i < AUDIO_SUPPORTED_TYPES.length; i++ ) {
                    if ( MediaRecorder.isTypeSupported( AUDIO_SUPPORTED_TYPES[i] ) ) {
                        audioMimeType = AUDIO_SUPPORTED_TYPES[i];
                    }
                }
                return audioMimeType;
            }

            function getTotalDurationOfFrames() {
                var i, totalDuration = 0;
                for ( i = 0; i < self.frames.length; i++ ) {
                    totalDuration = totalDuration + self.frames[i].duration;
                }
                return totalDuration;
            }


            function getTotalLengthOfFrames() {
                var i, totalLength = 0;
                for ( i = 0; i < self.frames.length; i++ ) {
                    totalLength = totalLength + self.frames[i].length;
                }
                return totalLength;
            }

            function getSampleRate() {
                if ( self.frames[0] && self.frames[0].sampleRate ) { return self.frames[0].sampleRate; }
                return -1;
            }

            function copyMonoAudioBuffer( buf ) {
                var newBuffer = audioContext.createBuffer( 1, buf.length, buf.sampleRate);
                newBuffer.copyToChannel( buf.getChannelData( 0 ), 0 );
                return newBuffer;
            }

            /**
             *  Encode all captured frames into an audio file
             *
             *  TODO: better error handling here
             *
             *  @param  {Function}  callback    Of the form fn( newFile )
             */

            function encodeFileOffline( callback ) {
                var
                    //  get these before encoding, UP may change
                    ext = self.encodeFormat(),
                    mimeType = self.encodeMimeType();

                self.isEncoding( true );

                //  stop the mic waveform, encoding is a heavy job
                wavesurferMic.microphone.pause();

                if ( 'mp3' === self.encodeFormat() ) {
                    encodeMp3Offline( onBlobCreated );
                } else {
                    encodeWavOffline( onBlobCreated );
                }

                //  TODO: add error handling for encoder
                function onBlobCreated( newBlob ) {
                    var
                        fileName = getFileName( ext ),
                        newFile = new File( [ newBlob ], fileName, { type: mimeType } );

                    self.isEncoding( false );

                    //  re-enable microphone
                    wavesurferMic.microphone.play();

                    callback( newFile );
                }

            }

            /**
             *  Experiment to use LAME Emscipten to record MP3
             *
             *  TODO: move this into a web worker and improve error handling
             *
             *  @param  {Function}  callback    Of the form fn( newFile )
             */

            function encodeMp3Offline( callback ) {

                var
                    //monoBuffer = getFramesAsBuffer(),
                    sampleRate = getSampleRate(),
                    bitRate = ENCODER_BIT_RATE,                                          //  TODO: configurable
                    encoder = new Mp3LameEncoder(sampleRate, bitRate),
                    idx = 0;

                //  TODO: progressive encoding

                function encodeFrame() {
                    var frame , pcm32;

                    //  get PCM data as float32 array
                    frame = self.frames[ idx ];
                    pcm32 = frame.getChannelData( 0 );

                    encoder.encode( [ pcm32, pcm32 ] );
                    idx = idx + 1;
                }

                function encodeNext() {
                    var j;

                    for ( j = 0; j < 20; j++ ) {
                        if ( idx === self.frames.length ) { return finishEncoding(); }
                        encodeFrame();
                    }

                    var pc = Math.floor( ( idx / self.frames.length ) * 100 );
                    self.statusMessage( 'MP3 ' + LBL_ENCODING + ': ' + idx + ' - ' + pc + '%' );
                    setTimeout( function() { encodeNext(); }, 1 );
                }

                function finishEncoding() {
                    var mp3blob = encoder.finish();
                    return callback( mp3blob );
                }

                self.statusMessage( 'MP3 ' + LBL_ENCODING + '... ' );
                encodeNext();
            }

            function encodeWavOffline( callback ) {

                var
                    sampleRate = getSampleRate(),
                    channelCount = 1,                                                   //  use MONO?
                    encoder = createWavAudioEncoder( sampleRate, channelCount ),
                    idx = 0;

                function encodeFrame() {
                    //  get PCM data as float32 array
                    var
                        frame = self.frames[ idx ],
                        pcm32 = frame.getChannelData( 0 );

                    encoder.encode( [ pcm32, pcm32 ] );
                    idx = idx + 1;
                }

                function encodeNext() {
                    var j;

                    for ( j = 0; j < 20; j++ ) {
                        if ( idx === self.frames.length ) { return finishEncoding(); }
                        encodeFrame();
                    }

                    var pc = Math.floor( ( idx / self.frames.length ) * 100 );
                    self.statusMessage( 'WAV ' + LBL_ENCODING + ': ' + idx + ' - ' + pc + '%' );
                    setTimeout( function() { encodeNext(); }, 1 );
                }

                function finishEncoding() {
                    var mp3blob = encoder.finish();

                    //  re-enable microphone
                    wavesurferMic.microphone.play();

                    return callback( mp3blob );
                }

                self.statusMessage( 'WAV ' + LBL_ENCODING + '... ' );
                encodeNext();
            }

            /**
             *  Convert mono audio frames to a mono buffer for waveform
             *  @return {AudioBuffer | WebGLBuffer | *}
             */

            function getFramesAsBuffer() {
                var
                    totalDuration = getTotalDurationOfFrames(),
                    totalLength = getTotalLengthOfFrames(),
                    sampleRate = getSampleRate(),
                    mimeType = getAudioMimeType(),

                    channelCursor = 0,

                    tempBuffer,
                    channelLeft,
                    i;

                self.statusMessage( LBL_COLLECTING );
                Y.log( 'Have frames: ' + self.frameCount() + ', ' + totalDuration + ' ' + mimeType, 'debug', NAME );

                tempBuffer = audioContext.createBuffer( 1, totalLength, sampleRate );
                channelLeft = tempBuffer.getChannelData( 0 );

                for ( i = 0; i < self.frames.length; i++ ) {
                    channelLeft.set( self.frames[i].getChannelData( 0 ), channelCursor );
                    channelCursor = channelCursor + self.frames[i].length;
                }

                return tempBuffer;
            }

            /**
             *  Update wavesurfer with data captured from the microphone
             */

            function showCapturedFrames() {
                let tempBuffer = getFramesAsBuffer();

                wavesurferPlayer.empty();

                //  TODO: back up regions and restore them around this

                wavesurferPlayer.loadDecodedBuffer( tempBuffer );
            }

            //  TODO: use standard lib
            function getRandomString() {
                var token = '', a, i, l;

                if (window.crypto && window.crypto.getRandomValues && navigator.userAgent.indexOf('Safari') === -1) {
                    a = window.crypto.getRandomValues(new Uint32Array(3));
                    token = '';
                    for ( i = 0, l = a.length; i < l; i++ ) {
                        token += a[i].toString(36);
                    }
                    return token;
                } else {
                    return (Math.random() * new Date().getTime()).toString(36).replace(/\./g, '');
                }
            }

            //  TODO: use client-side media-api to generate these
            function getFileName(fileExtension) {
                var d = new Date();
                var year = d.getFullYear();
                var month = d.getMonth();
                var date = d.getDate();
                return 'audio-' + year + month + date + '-' + getRandomString() + '.' + fileExtension;
            }

            function uploadFromPatientPortal() {
                var
                    dataURI,
                    mediaObj;

                async.series( [ blockUIForUpload, readAudioToDataURI, postFileToPRC ], onUploadComplete );

                function blockUIForUpload( itcb ) {
                    /*
                    disableButton( jqCache.btnRRTCDownload );
                    disableButton( jqCache.btnRRTCAttach );

                    //  hide audio element, and fine uploader
                    jqCache.divRRTCPlayback.hide();
                    */
                    itcb( null );
                }

                function readAudioToDataURI( itcb ) {
                    var
                        blob = recorder.getBlob(),
                        //newAudioFile = new File( [ blob ], fileName, { type: mimeType } ),
                        newAudioFileReader = new FileReader();

                    //  read blob to dataURI
                    newAudioFileReader.onload = onFileReadToDataURI;
                    newAudioFileReader.readAsDataURL( blob );

                    function onFileReadToDataURI( readEvt ) {
                        dataURI = readEvt.target.result;
                        itcb( null );
                    }
                }

                function postFileToPRC( itcb ) {
                    var
                        mimeType = recorder.blob.type,
                        ext = Y.doccirrus.media.getExt( mimeType ),
                        fileName = getFileName( ext ),

                        newId = ('upload' + (new Date().getTime()) + (Math.random() * 999999)).replace( '.', '' ),

                        postArgs = {
                            'ownerCollection': ownerCollection,
                            'ownerId': ownerId,
                            'source': dataURI,
                            'id': newId,
                            'name': fileName,
                            'fileName': fileName,
                            'label': 'patient'
                        };

                    Y.doccirrus.blindproxy.postSingle( settings.patientRegId, '/1/media/:upload64', postArgs, onFilePost );

                    function onFilePost( err, result ) {
                        if ( err ) { return itcb( err ); }
                        mediaObj = result.data;
                        itcb( null );
                    }
                }

                function onUploadComplete( err ) {
                    if ( err ) {
                        Y.log( 'Problem uploading audio from Patient Portal to PRC: ' + JSON.stringify( err ), 'warn', NAME );
                        return;
                    }

                    //  return media to form and close modal
                    onMediaAdded( mediaObj );
                    modal.close();
                }

            }

            /**
             *  Raised by fine uploader when the server reports a new file has been added to GridFS
             *
             *  @param  event
             *  @param  qqId                    {Number}    Index of upload in this session
             *  @param  name                    {String}
             *  @param  responseJson            {Object}
             *  @param  responseJson.mediaObj   {Object}    Details of media in data store
             */

            function onChunkedUploadComplete( event, qqId, name, responseJson ) {
                Y.log( 'Chunked upload complete.', 'info', NAME );

                var
                    mediaObj = responseJson.mediaObj,
                    cacheUrl = '/media/' + mediaObj._id + '_original.' + mediaObj.mime + '.' + mediaObj.ext;

                mediaObj._original = cacheUrl;
                onMediaAdded( {}, mediaObj, qqId );
                modal.close();
            }

            /**
             *  Raised when server fails to accept a chunk or upload
             *
             *  @param  event
             *  @param  id
             *  @param  name    {String}
             *  @param  reason  {String}    Error message from jquery.fine-uploader.js
             */

            function onChunkedUploadError( event, id, name, reason ) {
                Y.log( 'Error uploading file "' + id + '"/"' + name + '": ' + JSON.stringify( reason ), 'warn', NAME );

                Y.doccirrus.DCWindow.notice( {
                    type: 'error',
                    message: reason,
                    window: {
                        width: Y.doccirrus.DCWindow.SIZE_MEDIUM
                    }
                } );
            }

            /**
             *  Raised by gamepad-utils.client.js in response to state changes in foot pedal buttons
             *
             *  @param  {Object}    evt
             *  @param  {Number}    evt.buttonIdx       Integer, which button
             *  @param  {Number}    evt.value           0 for up, 1 for down
             */

            function onGamepadButtonPress( evt ) {
                if ( Y.doccirrus.gamepadUtils.MIDDLE_PEDAL === evt.buttonIdx ) {

                    if ( !self.isRecording() && 1 === evt.value ) {

                        startRecording();
                    }

                    if ( self.isRecording() && 0 === evt.value ) {
                        stopRecording();
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

            //  PUBLIC METHODS

            self.dispose = function __dispose() {
                if ( wavesurferMic ) {
                    wavesurferMic.microphone.stop();
                    wavesurferMic.destroy();
                }

                if ( wavesurferPlayer ) { wavesurferPlayer.destroy(); }

                if ( streamSource ) { streamSource.disconnect(); }
                if ( streamProcessor ) { streamProcessor.disconnect(); }

                if ( self.gamepadSub ) { self.gamepadSub.detach(); }
                
                $( document ).off( 'keydown.dictaphone' );
                
            };

            //  EVENT HANDLERS

            self.onBtnAttachClick = function() {

                encodeFileOffline( onFileCreated );

                function onFileCreated( newFile ) {

                    if ( settings.patientRegId && '' !== settings.patientRegId ) {
                        //  Audio captured on patient portal, must be passed through blind proxy
                        uploadFromPatientPortal();
                        return;
                    }

                    //  start upload of new file
                    $( '#divFineUploadAudio' ).fineUploader( 'addFiles', newFile );

                    //  hide audio element, show Fine uploader in its place
                    self.isUploading( true );
                }
            };

            self.onToggleRecordingClick = function __onToggleRecordingClick() {
                if ( self.isRecording() ) {
                    stopRecording();
                } else {
                    startRecording();
                }
            };

            //  MOJ-9443 was previously linked to button, browsers have since added their own UI for this
            self.onBtnReleaseMicrophoneClick = function __onBtnReleaseMicrophoneClick() {
                //enableButton( jqCache.btnRRTCStartRecording );

                if ( microphone ) {
                    microphone.stop();
                    microphone = null;
                }

                if ( recorder ) {
                    self.onBtnStopRecordingClick();
                }
            };

            self.onBtnDownloadRecordingClick = function __onBtnDownloadRecordingClick() {

                encodeFileOffline( onFileReady );

                function onFileReady( newFile ) {
                    invokeSaveAsDialog( newFile );
                }
            };

            /**
             *  Start playback in waveformPlayer
             */

            self.onPlayClick = function __onPlayClick() {
                if ( !wavesurferPlayer ) { return; }
                wavesurferPlayer.play();
            };

            self.onPauseClick = function __onPauseClick() {
                if ( self.isRecording() ) {
                    stopRecording();
                }

                if ( self.isPlaying() ) {
                    wavesurferPlayer.pause();
                }
            };

            self.setSkipStep = function __setSkipStep( skipBy ) {
                if ( !self.isInitialized() ) { return; }
                self.skipStep( parseInt( skipBy, 10  ) );
            };

            self.skipBackward = function __skipBackward() {
                if ( 0 === self.frameCount() ) { return; }

                if ( wavesurferPlayer.getCurrentTime() > self.skipStep() ) {
                    wavesurferPlayer.skipBackward( self.skipStep() );
                } else {
                    wavesurferPlayer.seekTo( 0 );
                }
            };

            self.skipForward = function __skipForward() {
                if ( 0 === self.frameCount() ) { return; }
                if (  wavesurferPlayer.getCurrentTime() + self.skipStep() > wavesurferPlayer.getDuration() ) {
                    //  do not seek past end
                    self.seekTo( 1 );
                } else {
                    wavesurferPlayer.skipForward( self.skipStep() );
                }
            };

            self.onDeleteRegionClick = function __onDeleteRegionClick() {
                var
                    newFrames = [],
                    currentRegion = self.latestRegion(),
                    timeCursor = 0,
                    countDeleted = 0,
                    i;

                if (!currentRegion ) {
                    self.hasRegion( false );
                    return;
                }

                for ( i = 0; i < self.frames.length; i++ ) {
                    timeCursor = timeCursor + self.frames[i].duration;

                    if ( timeCursor >= currentRegion.start && timeCursor <= currentRegion.end ) {
                        //console.log( '(****) deleting frame ', i, timeCursor );
                        countDeleted = countDeleted + 1;
                    } else {
                        newFrames.push( self.frames[i] );
                    }
                }

                self.frames = newFrames;
                wavesurferPlayer.clearRegions();
                self.hasRegion( false );
                self.latestRegion( null );

                Y.log( 'pdating captured frames after deleting ' + countDeleted + '....', 'debug', NAME );
                showCapturedFrames();
            };

            /**
             *  Keyboard control of modal with ASDF
             *
             *      A   - skip back
             *      S   - start/stop recording
             *      D   - start/stop playback
             *      F   - skip forward
             *
             *  @param evt
             */

            self.documentKeydown = function( evt ) {
                var key = evt.key || evt.keyCode;

                if ( !self.hasMicAccess() ) {
                    return;
                }

                switch ( key ) {

                    case 'A':
                    case 'a':
                        self.skipBackward();
                        break;

                    case 'S':
                    case 's':
                        if ( self.isRecording() ) {
                            stopRecording();
                        } else {
                            startRecording();
                        }
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
                }


            };

            initVm();
        }

        /**
         *  Show the modal and set upload / ownership options to save recorded audio
         *
         *  @param  {Object}    settings
         *
         *  Options for media upload / ownership
         *
         *  @param  {String}    settings.ownerCollection    Type of owner (activity, document, etc)
         *  @param  {String}    settings.ownerId            Database_id of object which will own recorded audio
         *  @param  {String}    settings.patientRegId       Used when passing data to and from the patient portal
         *  @param  {String}    settings.label              Media label, set to 'user' unless automatically created
         *
         *  Callback when new audio files are created and uploaded to media collection.
         *
         *  @param  {Function}  settings.onAdd              Of the form fn( err, mediaObj )
         */

        function showDictaphoneModal( settings ) {
            var
                dictaphoneModalVM,

                ownerCollection = settings.ownerCollection || 'test',
                ownerId = settings.ownerId || 'test',
                //patientRegId = settings.patientRegId || '',
                //label = settings.label || 'user',

                modal,
                containerNode = Y.Node.create( '<div id="divDictaphoneControlsContainer"></div>' ),
                containerDiv,

                windowDefinition = {
                    className: 'DCWindow-Resize',
                    bodyContent: containerNode,
                    title: i18n( 'MediaMojit.microphonemodal.TITLE' ),
                    icon: Y.doccirrus.DCWindow.ICON_MICROPHONE,
                    centered: true,
                    modal: true,
                    dragable: true,
                    maximizable: true,
                    resizeable: false,
                    width: 650,
                    height: 450,
                    render: document.body,
                    buttons: {
                        header: ['close', 'maximize'],
                        footer: [ ]
                    },
                    after: {
                        destroy: onModalDestroyed
                    }
                };

            async.series( [ loadJadeTemplate, createModal ], onModalReady );

            function loadJadeTemplate( itcb ) {
                YUI.dcJadeRepository.loadNodeFromTemplate(
                    'modals/dictaphone_modal',
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

                containerDiv = document.querySelector( '#divDictaphoneControlsContainer' );
                dictaphoneModalVM = new DictaphoneModalVM( settings, modal );
                ko.applyBindings( dictaphoneModalVM, containerDiv );

                itcb( null );
            }

            function onModalReady( err ) {
                if ( err ) {
                    Y.log( 'Problem initializing microphone input: ' + JSON.stringify( err ), 'warn', NAME );
                    return;
                }

                Y.log( 'Initialized dictaphone modal for: ' + ownerCollection + '::' + ownerId, 'info', NAME );
            }

            function onModalDestroyed() {
                if ( containerNode ) { containerNode.destroy(); }
                dictaphoneModalVM.dispose();
                ko.cleanNode( containerDiv );
                Y.log( 'Closed audio record modal.', 'debug', NAME );
            }

        }

        //  TODO: move to its own file with MIT licence
        //  https://github.com/higuma/wav-audio-encoder-js/blob/master/LICENSE.txt

        function createWavAudioEncoder( sam, chs ) {

            var min = Math.min,
                max = Math.max;

            var setString = function(view, offset, str) {
                var i;

                var len = str.length;
                for ( i = 0; i < len; ++i) {
                    view.setUint8(offset + i, str.charCodeAt(i));
                }
            };

            var Encoder = function(sampleRate, numChannels) {
                this.sampleRate = sampleRate;
                this.numChannels = numChannels;
                this.numSamples = 0;
                this.dataViews = [];
            };

            Encoder.prototype.encode = function(buffer) {
                var
                    len = buffer[0].length,
                    nCh = this.numChannels,
                    view = new DataView(new ArrayBuffer(len * nCh * 2)),
                    offset = 0,
                    i, ch, x;

                for ( i = 0; i < len; ++i) {
                    for ( ch = 0; ch < nCh; ++ch) {
                        x = buffer[ch][i] * 0x7fff;
                        view.setInt16(offset, x < 0 ? max(x, -0x8000) : min(x, 0x7fff), true);
                        offset += 2;
                    }
                }

                this.dataViews.push(view);
                this.numSamples += len;
            };

            Encoder.prototype.finish = function( /* mimeType */ ) {
                var dataSize = this.numChannels * this.numSamples * 2,
                    view = new DataView(new ArrayBuffer(44));
                setString(view, 0, 'RIFF');
                view.setUint32(4, 36 + dataSize, true);
                setString(view, 8, 'WAVE');
                setString(view, 12, 'fmt ');
                view.setUint32(16, 16, true);
                view.setUint16(20, 1, true);
                view.setUint16(22, this.numChannels, true);
                view.setUint32(24, this.sampleRate, true);
                view.setUint32(28, this.sampleRate * 4, true);
                view.setUint16(32, this.numChannels * 2, true);
                view.setUint16(34, 16, true);
                setString(view, 36, 'data');
                view.setUint32(40, dataSize, true);
                this.dataViews.unshift(view);
                var blob = new Blob(this.dataViews, { type: 'audio/x-wav' });
                this.cleanup();
                return blob;
            };

            Encoder.prototype.cancel = Encoder.prototype.cleanup = function() {
                delete this.dataViews;
            };

            return new Encoder( sam, chs );
        }

        /*
         *  Expose API
         */

        Y.namespace( 'doccirrus.modals' ).dictaphone = {
            show: showDictaphoneModal
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