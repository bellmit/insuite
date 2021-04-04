/**
 *  Modal for recording audio via WebRTC / getUserMedia
 *
 *  Audio will then be used in forms or activity attachments, and may be shared via patient portal
 *
 *  User: strix
 *  Date: 2019-03-28
 *  (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI, $, ko, async, RecordRTC, setSrcObject, invokeSaveAsDialog */
/*eslint prefer-template:0, strict:0 */
'use strict';

YUI.add( 'microphoneinputmodal', function( Y, NAME ) {

        var
            AUDIO_SAMPLE_RATE = 48000,
            i18n = Y.doccirrus.i18n;

        Y.namespace( 'doccirrus.modals' ).recordAudio = {

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

            show: function( settings ) {
                var
                    onMediaAdded = settings.onAdd || Y.dcforms.nullCallback,

                    ownerCollection = settings.ownerCollection || 'test',
                    ownerId = settings.ownerId || 'test',
                    //patientRegId = settings.patientRegId || '',
                    //label = settings.label || 'user',

                    jqCache,

                    modal,
                    containerNode = Y.Node.create( '<div id="divModalMicrophoneInput"></div>' ),

                    //  TODO: remove or replace with something more robust
                    isEdge = navigator.userAgent.indexOf('Edge') !== -1 && (!!navigator.msSaveOrOpenBlob || !!navigator.msSaveBlob),
                    isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent),

                    echoCancellation = isEdge ? true : { 'echoCancellation': false },

                    recorder,
                    microphone,

                    audioUploadOptions = {
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
                            allowedExtensions: [ 'mp3', 'ogg', 'webm' ]
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
                    },

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
                        height: 250,
                        render: document.body,
                        buttons: {
                            header: ['close', 'maximize'],
                            footer: [ ]
                        },
                        after: {
                            destroy: onModalDestroyed
                        }
                    };

                async.series( [ loadJadeTemplate, createModal, initUploader ], onModalReady );

                function loadJadeTemplate( itcb ) {
                    YUI.dcJadeRepository.loadNodeFromTemplate(
                        'record_audio',
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

                    jqCache = {
                        //  containers
                        'divRRTCMessage': $( '#divRRTCMessage' ),
                        'divRRTCDescription': $( '#divRRTCDescription' ),
                        'divRRTCPlayback': $( '#divRRTCPlayback' ),
                        //  buttons
                        'btnRRTCStartRecording': $( '#btnRRTCStartRecording' ),
                        'btnRRTCStopRecording': $( '#btnRRTCStopRecording' ),
                        //'btnRRTCReleaseMicrophone': $( '#btnRRTCReleaseMicrophone' ),
                        'btnRRTCDownload': $( '#btnRRTCDownload' ),
                        'btnRRTCAttach': $( '#btnRRTCAttach' ),
                        //  audio element
                        'audioRRTCPlayRecording': $( '#audioRRTCPlayRecording' ),
                        //  upload control
                        'divFineUploadAudio': $( '#divFineUploadAudio' ),
                        'btnFineUploadAudio': $( '#btnFineUploadAudio' )
                    };

                    jqCache.btnRRTCStartRecording.off( 'click.recordrtc' ).on( 'click.recordrtc', onBtnStartRecordingClick );
                    jqCache.btnRRTCStopRecording.off( 'click.recordrtc' ).on( 'click.recordrtc', onBtnStopRecordingClick );
                    //jqCache.btnRRTCReleaseMicrophone.off( 'click.recordrtc' ).on( 'click.recordrtc', onBtnReleaseMicrophoneClick );
                    jqCache.btnRRTCDownload.off( 'click.recordrtc' ).on( 'click.recordrtc', onBtnDownloadRecordingClick );
                    jqCache.btnRRTCAttach.off( 'click.recordrtc' ).on( 'click.recordrtc', onBtnAttachClick );

                    itcb( null );
                }

                function initUploader( itcb ) {

                    //  request / get access to microphone
                    if ( !microphone ) {
                        captureMicrophone( onMicCapture );
                    }

                    function onMicCapture( err, mic ) {
                        if ( err ) {
                            Y.log( 'Problem capturing microphone: ' + JSON.stringify( err ), 'warn', NAME );
                            return;
                        }
                        microphone = mic;
                    }

                    //  set up the upload control

                    function linkUploadError( event, id, name, reason ) {
                        onChunkedUploadError( event, id, name, reason );
                    }

                    function linkUploadComplete( event, id, name, responseJson ) {
                        onChunkedUploadComplete( event, id, name, responseJson );
                    }

                    jqCache.divFineUploadAudio.fineUploader( audioUploadOptions )
                        .on( 'error', linkUploadError )
                        .on( 'complete', linkUploadComplete );

                    itcb( null );
                }

                function onModalReady( err ) {
                    if ( err ) {
                        Y.log( 'Problem initializing microphone input: ' + JSON.stringify( err ), 'warn', NAME );
                        return;
                    }
                    function RecordAudioVM() {
                        var
                            self = this;

                        self.btnStartRecordingI18n = i18n('MediaMojit.microphonemodal.BTN_START_RECORDING');
                        self.btnStopRecordingI18n = i18n('MediaMojit.microphonemodal.BTN_STOP_RECORDING');
                        self.btnDownloadI18n = i18n('MediaMojit.microphonemodal.BTN_DOWNLOAD');
                        self.btnAttachI18n = i18n('MediaMojit.microphonemodal.BTN_ATTACH');
                    }

                    ko.applyBindings( new RecordAudioVM(), document.querySelector( '#divMicrophoneControls' ) );


                    Y.log( 'Initialized audio recorder for: ' + ownerCollection + '::' + ownerId, 'info', NAME );
                }

                //  Adapted from RecordRTC demo code
                //  https://www.webrtc-experiment.com/RecordRTC/simple-demos/audio-recording.html

                /**
                 *  Request access to the microphone
                 *
                 *  @param  {Function}  callback    Of the forn fn( err, microphone )
                 */

                function captureMicrophone( callback ) {
                    //jqCache.btnRRTCReleaseMicrophone.disabled = false;

                    //  if we already have access to the mic then do not request
                    if( microphone ) { return callback( null, microphone ); }

                    var
                        //  TODO: improve on isEdge browser detection
                        requestOptions = {
                            audio: echoCancellation
                        };

                    //  check that browser supports getUserMedia and has supported media devices
                    if( typeof navigator.mediaDevices === 'undefined' || !navigator.mediaDevices.getUserMedia ) {
                        //TODO: translateme
                        Y.log( 'This browser does not support WebRTC getUserMedia API.', 'warn', NAME );
                        jqCache.divRRTCDescription.html( i18n( 'MediaMojit.upload_audio.LBL_AUDIO_NOT_SUPPORTED' ) );
                    }

                    if( !!navigator.getUserMedia ) {
                        //  TODO: translateme
                        Y.log( 'This browser seems supporting deprecated getUserMedia API.', 'warn', NAME );
                        jqCache.divRRTCDescription.html( i18n( 'MediaMojit.upload_audio.LBL_AUDIO_NOT_SUPPORTED' ) );
                    }

                    //  request access to mic
                    navigator.mediaDevices
                        .getUserMedia( requestOptions )
                        .then( onMicAccessGranted )
                        .catch( onMicAccessFailed );

                    function onMicAccessGranted( mic ) {
                        Y.log( 'User has granted permission to access microphone.', 'debug', NAME );
                        enableButton( jqCache.btnRRTCStartRecording );
                        callback( null, mic );
                    }

                    function onMicAccessFailed( err ) {
                        Y.log( 'Unable to capture microphone: ' + JSON.stringify( err ), 'warn', NAME );
                        jqCache.divRRTCMessage.html( i18n( 'MediaMojit.microphonemodal.LBL_NO_MIC_PERMISSION' ) );
                        disableButton( jqCache.btnRRTCStartRecording );
                        //callback( err );
                    }

                }

                function replaceAudio( src, srcObj ) {
                    var newAudio;

                    //  unlink previous audio element
                    jqCache.divRRTCPlayback.html( '' );
                    jqCache.audioRRTCPlayRecording = null;

                    //  create new audio element with the same id and new src
                    newAudio = document.createElement('audio');
                    newAudio.controls = true;
                    newAudio.id = 'audioRRTCPlayRecording';

                    //  deprecated on Firefox, see:
                    //  https://www.fxsitecompat.com/en-CA/docs/2017/url-createobjecturl-stream-has-been-deprecated/
                    if ( src ) { newAudio.src = src; }

                    //  new method of playing back from a blob or file
                    if ( srcObj ) { newAudio.srcObject = srcObj; }

                    jqCache.divRRTCPlayback.append( newAudio );
                    jqCache.audioRRTCPlayRecording = $( '#audioRRTCPlayRecording' );
                    jqCache.audioRRTCPlayRecording.css( 'width', '100%' );
                }

                function stopRecordingCallback() {

                    //  default way to convert streams in RecordRTC is now deprecated on Firefox
                    replaceAudio( URL.createObjectURL( recorder.getBlob() ) );

                    //  with new srcObject API, not yet working for audio elements in all browsers
                    //replaceAudio( null, URL.createObjectURL( recorder.getBlob() ) );

                    //  TODO: proper classes
                    enableButton( jqCache.btnRRTCStartRecording );

                    var myAudio = jqCache.audioRRTCPlayRecording[0];

                    setTimeout(function() {
                        if(!myAudio.paused) { return; }

                        setTimeout(function() {
                            if(!myAudio.paused) { return; }
                            myAudio.play();
                        }, 1000);

                        myAudio.play();
                    }, 300);

                    myAudio.play();

                    enableButton( jqCache.btnRRTCDownload );

                    //  TODO: documentme
                    if( isSafari ) {
                        onBtnReleaseMicrophoneClick();
                    }
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

                function saveToDisk(fileURL, fileName) {
                    var event, save, _window;

                    // for non-IE
                    if (!window.ActiveXObject) {
                        save = document.createElement('a');
                        save.href = fileURL;
                        save.download = fileName || 'unknown';
                        save.style = 'display:none;opacity:0;color:transparent;';
                        (document.body || document.documentElement).appendChild(save);

                        if (typeof save.click === 'function') {
                            save.click();
                        } else {
                            save.target = '_blank';
                            event = document.createEvent('Event');
                            event.initEvent('click', true, true);
                            save.dispatchEvent(event);
                        }

                        ( window.URL || window.webkitURL ).revokeObjectURL( save.href );
                    }

                    // for IE
                    else if (!!window.ActiveXObject && document.execCommand) {
                        _window = window.open(fileURL, '_blank');
                        _window.document.close();
                        _window.document.execCommand('SaveAs', true, fileName || fileURL );
                        _window.close();
                    }
                }

                function enableButton( jqRef ) {
                    jqRef.removeClass( 'disabled' );
                }

                function disableButton( jqRef ) {
                    jqRef.addClass( 'disabled' );
                }

                //  EVENT HANDLERS

                function onBtnStartRecordingClick() {
                    var
                        myAudio = jqCache.audioRRTCPlayRecording[0],
                        audioOptions = {
                            type: 'audio',
                            numberOfAudioChannels: isEdge ? 1 : 2,
                            checkForInactiveTracks: true,
                            bufferSize: 16384
                        };

                    //async.series( [] )

                    disableButton( jqCache.btnRRTCStartRecording );

                    //  request access to microphone if we don't you have it
                    if ( !microphone ) { return captureMicrophone( onMicrophoneRequest ); }

                    function onMicrophoneRequest ( err, mic ) {

                        if ( err || !mic ) {
                            Y.log( 'Mic access not granted, or an error occured: ' + JSON.stringify( err ), 'warn', NAME );
                            enableButton( jqCache.btnRRTCStartRecording );
                            return;
                        }

                        microphone = mic;

                        if( isSafari ) {
                            replaceAudio();

                            myAudio.muted = true;
                            setSrcObject( microphone, myAudio );
                            myAudio.play();

                            //  TODO: fixme, replace with flashing red record icon
                            jqCache.btnRRTCStartRecording[0].disabled = false;
                            jqCache.btnRRTCStartRecording[0].style.border = '1px solid red';
                            jqCache.btnRRTCStartRecording[0].style.fontSize = '150%';

                            //  TODO: replaceme
                            //alert('Please click startRecording button again. First time we tried to access your microphone. Now we will record it.');
                            return;
                        }

                        onBtnStartRecordingClick();
                    }



                    //  microphone is captured at this point
                    replaceAudio();
                    jqCache.divRRTCPlayback.show();

                    //  replace audio breaks the reference
                    myAudio = jqCache.audioRRTCPlayRecording[0];

                    //  start audio playback from microphone to element
                    myAudio.muted = true;
                    setSrcObject( microphone, myAudio );
                    myAudio.play();

                    //  drop the sample rate on windows  //TODO: documentme
                    if( navigator.platform && navigator.platform.toString().toLowerCase().indexOf('win') === -1 ) {
                        audioOptions.sampleRate = AUDIO_SAMPLE_RATE;
                    }

                    //  destroy any existing recorder
                    if( recorder ) {
                        recorder.destroy();
                        recorder = null;
                    }

                    recorder = RecordRTC( microphone, audioOptions );
                    recorder.startRecording();

                    //  TODO: set recording icon to blinking red dot
                    enableButton( jqCache.btnRRTCStopRecording );
                    enableButton( jqCache.btnRRTCDownload );
                    enableButton( jqCache.btnRRTCAttach );
                }

                function onBtnStopRecordingClick() {
                    disableButton( jqCache.btnRRTCStopRecording );
                    recorder.stopRecording( stopRecordingCallback );
                }

                //  MOJ-9443 was previously linked to button, browsers have since added their own UI for this
                function onBtnReleaseMicrophoneClick() {
                    enableButton( jqCache.btnRRTCStartRecording );

                    if ( microphone ) {
                        microphone.stop();
                        microphone = null;
                    }

                    if ( recorder ) {
                        onBtnStopRecordingClick();
                    }
                }

                function onBtnDownloadRecordingClick() {
                    //  TODO: fixme
                    jqCache.btnRRTCDownload[0].disabled = true;

                    if( !recorder || !recorder.getBlob() ) {
                        Y.log( 'Recorder does not support saving as blob.', 'warn', NAME );
                        return;
                    }

                    if(isSafari) {
                        recorder.getDataURL(function(dataURL) {
                            saveToDisk(dataURL, getFileName('mp3'));
                        });
                        return;
                    }

                    var
                        blob = recorder.getBlob(),
                        fileName = getFileName( 'mp3' ),
                        file = new File([ blob ], fileName, { type: 'audio/mp3' } );

                    invokeSaveAsDialog( file );
                }

                function onModalDestroyed() {
                    if ( containerNode ) { containerNode.destroy(); }
                    Y.log( 'Closed audio record modal.', 'debug', NAME );
                }

                function onBtnAttachClick() {
                    if( !recorder || !recorder.getBlob() ) {
                        Y.log( 'Recorder does not support saving as blob.', 'warn', NAME );
                        return;
                    }

                    if ( settings.patientRegId && '' !== settings.patientRegId ) {
                        //  Audio captured on patient portal, must be passed through blind proxy
                        uploadFromPatientPortal();
                        return;
                    }

                    disableButton( jqCache.btnRRTCDownload );
                    disableButton( jqCache.btnRRTCAttach );

                    /**
                     * TODO: test whether Safari needs special case for this
                    if(isSafari) {
                        recorder.getDataURL(function(dataURL) {
                            saveToDisk(dataURL, getFileName('mp3'));
                        });
                        return;
                    }
                    */

                    var
                        blob = recorder.getBlob(),
                        mimeType = ( blob && blob.type ) ? blob.type : recorder.mimeType,
                        ext = Y.doccirrus.media.getExt( mimeType ),
                        fileName = getFileName( ext ),
                        newAudioFile = new File( [ blob ], fileName, { type: mimeType } );

                    //  uncomment when diagnosing audio mime type issues
                    //console.log( '(****) recorder: ', recorder );
                    //console.log( '(****) blob: ', blob );

                    //  start upload of new file
                    jqCache.divFineUploadAudio.fineUploader( 'addFiles', newAudioFile );

                    //  hide audio element, show Fine uploader in its place
                    jqCache.divRRTCPlayback.hide();
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

                function uploadFromPatientPortal() {
                    var
                        dataURI,
                        mediaObj;

                    async.series( [ blockUIForUpload, readAudioToDataURI, postFileToPRC ], onUploadComplete );

                    function blockUIForUpload( itcb ) {
                        disableButton( jqCache.btnRRTCDownload );
                        disableButton( jqCache.btnRRTCAttach );

                        //  hide audio element, and fine uploader
                        jqCache.divRRTCPlayback.hide();

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

            }

        };

    },
    '0.0.1',
    {
        requires: [
            'DCWindow'
        ]
    }
);