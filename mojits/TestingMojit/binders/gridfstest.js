/*
 *  Binder for testing chunked uploads to GridFS
 */

/*jslint anon:true, sloppy:true, nomen:true, latedef:false */
/*global YUI, $, MediaRecorder, MediaSource, alert */

"use strict";

YUI.add('TestingMojitBinderGridFsTest', function(Y, NAME) {
        /**
         * The TestingMojitBinderGridFsTest module.
         *
         * @module TestingMojitBinderGridFsTest
         */

        Y.log('YUI.add TestingMojitBinderGridFsTest with NAMEs ' + NAME, 'info');


        window.URL = window.URL || window.webkitURL;
        navigator.getUserMedia  = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

        /**
         * Constructor for the TestingMojitBinderGridFsTest class.
         *
         * @class TestingMojitBinderGridFsTest
         * @constructor
         */

        Y.namespace('mojito.binders')[NAME] = {

            ownerCollection: 'test',
            ownerId: 'test',
            jq: {},

            localMediaStream: null,

            /**
             * Binder initialization method, invoked after all binders on the page
             * have been constructed.
             */
            init: function(mojitProxy) {
                this.mojitProxy = mojitProxy;
            },

            /**
             *	The binder method, invoked to allow the mojit to attach DOM event
             *	handlers.
             *
             *	@param node {Node} The DOM node to which this mojit is attached.
             */

            bind: function( node ) {

                var
                    self = this,
                    uploadOptions;

                self.jq = {
                    divFineUploadTest: $('#divFineUploadTest'),
                    btnUpload: $('#btnUpload'),
                    txtOwnerCollection: $('#txtOwnerCollection'),
                    txtOwnerId: $('#txtOwnerId'),
                    divMediaLinks: $('#divMediaLinks'),

                    vidCaptureTest: $('#vidCaptureTest'),
                    vidPlaybackTest: $('#vidPlaybackTest'),
                    btnSetupVideo: $('#btnSetupVideo'),
                    btnStop: $('#btnStop'),
                    btnCapture: $('#btnCapture'),
                    btnDownload: $('#btnDownload')
                };

                uploadOptions = {
                    button: self.jq.btnUpload,
                    template: 'qq-template-gallery',
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
                        allowedExtensions: ['jpeg', 'jpg', 'gif', 'png', 'mp4']
                    },
                    cors: {
                        expected: true,
                        sendCredentials: true,
                        allowXdr: true
                    }
                };

                this.node = node;

                self.jq.txtOwnerCollection.val( self.ownerCollection );
                self.jq.txtOwnerId.val( self.ownerId );

                //  set up the upload control
                self.jq.divFineUploadTest.fineUploader( uploadOptions );
                self.jq.divFineUploadTest.on( 'error', onChunkedUploadError );
                self.jq.divFineUploadTest.on( 'complete', onChunkedUploadComplete );

                //  set up the video capture
                self.jq.btnSetupVideo.on( 'click', function() { self.setupVideo(); } );
                self.jq.btnCapture.on( 'click', function() { self.captureVideo(); } );
                self.jq.btnStop.on( 'click', function() { self.stopVideo(); } );
                self.jq.btnDownload.on( 'click', function() { self.downloadVideo(); } );

                function onChunkedUploadComplete( event, id, name, responseJSON ) {
                    Y.log( 'Chunked upload complete.', 'info', NAME );

                    console.log( 'onChunkedUploadComplete event: ', event );    //jshint ignore:line
                    console.log( 'onChunkedUploadComplete id: ', id );          //jshint ignore:line
                    console.log( 'onChunkedUploadComplete name: ', name );      //jshint ignore:line

                    var
                        cacheUrl = '/media/' + responseJSON.mediaId + '_original.' + responseJSON.mediaObj.mime + '.' + responseJSON.mediaObj.ext,
                        prcCacheUrl = Y.doccirrus.infras.getPrivateURL( cacheUrl ),
                        html = '<a href="' + prcCacheUrl + '">' + responseJSON.mediaId + '</a><br/>';

                    self.jq.divMediaLinks.append( html );
                }

                function onChunkedUploadError( event, id, name, reason  ) {
                    Y.log( 'Error uploading file "' + id + '"/"' + name + '": ' + JSON.stringify( reason ) + ' event: ' + JSON.stringify( event ), 'warn', NAME );
                }
            },

            setupVideo: function() {
                var self = this;

                function handleSourceOpen( /* event */) {
                    console.log('MediaSource opened');  //jshint ignore:line
                    self.sourceBuffer = self.mediaSource.addSourceBuffer('video/webm; codecs="vp8"');
                    console.log('Source buffer: ', self.sourceBuffer);  //jshint ignore:line
                }

                self.mediaSource = new MediaSource();
                self.mediaSource.addEventListener('sourceopen', handleSourceOpen, false);

                function onMediaStreamReady(localMediaStream) {


                    self.localMediaStream = localMediaStream;

                    self.jq.vidCaptureTest[0].srcObject = localMediaStream;

                    // Note: onloadedmetadata doesn't fire in Chrome when using it with getUserMedia.
                    // See crbug.com/110938.
                    self.jq.vidCaptureTest[0].onloadedmetadata = function( e ) {
                        // Ready to go. Do some stuff.
                        console.log( 'Loaded metadta: ', e );       //jshint ignore:line
                    };
                }

                function onMediaStreamError( err ) {
                    console.log( 'Error setting up media stream', err );  //jshint ignore:line
                    self.onVideoFailure();
                }

                console.log("setup click!");  //jshint ignore:line
                if (navigator.getUserMedia) {
                    // Not showing vendor prefixes.
                    navigator.getUserMedia({video: true, audio: true}, onMediaStreamReady, onMediaStreamError );
                } else {
                    alert( 'missing getusermedia' );
                    self.jq.vidCaptureTest[0].src = 'somevideo.webm'; // fallback.
                }
            },

            captureVideo: function() {
                var
                    self = this,
                    BITS_PER_SECOND = 5000000,
                    options = {mimeType: 'video/webm', bitsPerSecond: BITS_PER_SECOND };

                console.log( 'capture video click' );  //jshint ignore:line

                function handleDataAvailable(event) {
                    if (event.data && event.data.size > 0) {
                        self.recordedBlobs.push(event.data);
                    }
                }

                function handleStop(event) {
                    console.log('Recorder stopped: ', event);  //jshint ignore:line
                }

                console.log( 'init recordedBlobs' );  //jshint ignore:line
                self.recordedBlobs = [];

                try {
                    self.mediaRecorder = new MediaRecorder(self.localMediaStream , options);
                    console.log( 'createdMediaRecorded' );  //jshint ignore:line

                } catch (e0) {
                    console.log('Unable to create MediaRecorder with options Object: ', e0);  //jshint ignore:line
                    try {
                        options = {mimeType: 'video/webm,codecs=vp9', bitsPerSecond: BITS_PER_SECOND };
                        self.mediaRecorder = new MediaRecorder(self.localMediaStream , options);
                    } catch (e1) {
                        console.log('Unable to create MediaRecorder with options Object: ', e1);  //jshint ignore:line
                        try {
                            options = 'video/vp8'; // Chrome 47
                            self.mediaRecorder = new MediaRecorder(self.localMediaStream , options);
                        } catch (e2) {
                            alert('MediaRecorder is not supported by this browser.\n\n' +
                                'Try Firefox 29 or later, or Chrome 47 or later, with Enable experimental Web Platform features enabled from chrome://flags.');
                            console.error('Exception while creating MediaRecorder:', e2);  //jshint ignore:line
                            return;
                        }
                    }
                }
                console.log('Created MediaRecorder', self.mediaRecorder, 'with options', options);  //jshint ignore:line
                self.jq.btnCapture.attr('value', 'Stop recording');
                //playButton.disabled = true;
                //downloadButton.disabled = true;
                self.mediaRecorder.onstop = handleStop;
                self.mediaRecorder.ondataavailable = handleDataAvailable;
                self.mediaRecorder.start(10); // collect 10ms of data
                console.log('MediaRecorder started', self.mediaRecorder);  //jshint ignore:line
            },

            stopVideo: function() {
                var self = this;
                self.mediaRecorder.stop();
                console.log('Recorded Blobs: ', self.recordedBlobs);  //jshint ignore:line
                self.jq.vidCaptureTest[0].pause ();
                self.localMediaStream.stop();
            },

            onVideoFailure: function() {
                alert('video capture failed');
            },

            downloadVideo: function() {
                var self = this;
                var blob = new Blob(self.recordedBlobs, {type: 'video/webm'});
                var url = window.URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = 'test.webm';
                $('#divDownload').append(a);
                a.click();
                setTimeout(function() {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                }, 100);
            }

        };

    },
    '0.0.1',
    {
        requires: [
            'event-mouseenter',
            'mojito-client',
            'mojito-rest-lib',
            'dcbatchpdfzip',
            'doccirrus',
            'event-mouseenter',
            'mojito-client',
            'JsonRpcReflection-doccirrus',
            'dcregexp',
            'dcvalidations',
            'dcsubviewmodel',
            'dcutils',
            'dcauth',
            'dcutils-uam',
            'dccasefilebinderevents',
            'dcloadhelper',
            'dcformloader',
            'dccatalogmap',
            'dcviewmodel',
            'dcpatientmodel',
            'dclocationmodel',
            'dcaddressmodel',
            'dccommunicationmodel',
            'dcinsurancestatusmodel',
            'dcbankaccountmodel',
            'dcbankaffiliatemodel',
            'dcdocumentmodel',
            'dceventarraymodel',
            'dccontactmodel',
            'dcinvoicemodel',
            'DocumentationTreeModel',
            'dcactivitysettingsmodel',
            'activitysettings-api',
            'base',
            'router',
            'json',
            'model-sync-rest',
            'intl',
            'mojito-intl-addon',
            'dc-comctl',
            'dcmedia',
            'dcvat',
            'DCWindow',
            'dcmarkermodel',
            'dcmarkerarraymodel',
            'dchotkeyshandler',
            'DCSystemMessages',
            'parallel',
            'dcFkModels',
            'dcOphthalmologyModels',
            'kbv-api',
            'dccrmanager',
            'cardreader',
            'dcrecommendedprescriptionmodal',
            'dcmediapreviewnmodal',
            'DCFsmDefault',
            'DeviceReader',
            'dccommunication-client'
        ]
    }
);
