/**
 *  KO ViewModel for file upload control
 *  strix 2016-07-07
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, $, ko */

YUI.add( 'FineViewModel', function( Y, NAME ) {
    'use strict';

    var
        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel;

    /**
     * @constructor
     * @class FineViewModel
     */
    function FineViewModel() {
        FineViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( FineViewModel, KoViewModel.getDisposable(), {

        //  CONFIGURATION

        templateName: 'FineViewModel',
        fineEndpoint: ko.observable( Y.doccirrus.infras.getPrivateURL( '/1/media/:uploadchunked' ) ),

        allowScan: true,                            //  set false to hide scan button
        allowWebcam: true,                          //  set false if getUserMedia camera support not available
        allowImport: true,                          //  set false if data should not come from scan
        allowImage: true,                           //  set false if image upload shut be hidden

        saveTo: 'db',                               //  Destination of uploaded files ('db'||'zip'||'temp')

        //  Properties of new media in datbase
        //  if self.saveTo === db
        ownerCollection: ko.observable( 'test' ),   //  type of object which owns uploaded files
        ownerId: ko.observable( 'test' ),           //  database _id of object which owns uploaded files
        label: ko.observable( 'user' ),             //  used to separate files by purpose,

        patientId: ko.observable( null ),
        activityId: ko.observable( null ),

        //  Set by scanner modal, used when attaching scanned PDFs and images
        scanDocType: '',
        scanDocTitle: '',

        triggerableFlows: ko.observableArray( [] ),
        triggerFLow: null,
        options: {
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
                allowedExtensions: Y.doccirrus.media.types.getAllExt()
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

        jq: {},

        //  LIFECYCLE

        /** @protected */
        initializer: function() {
            var self = this;
            self.initFineViewModel();
            self.initTriggerableFlows();
        },
        /** @protected */
        destructor: function() {
            var self = this;
            self.destroyFineViewModel();
        },
        initFineViewModel: function() {
            var self = this,
                hasInScanLicence = Y.doccirrus.auth.hasAdditionalService( 'inScan' );

            self.dropAreaI18n = i18n( 'MediaMojit.FineUploader.DROP_AREA' );
            self.buttonScanI18n = i18n( 'general.button.SCAN' );
            self.buttonWebcamI18n = i18n( 'general.button.WEBCAM' );
            self.flowImportI18n = i18n('flow-api.FLOW_IMPORT');
            self.sourceDeviceLogI18n =i18n( 'flow-api.SOURCE_DEVICELOG' );
            self.buttonUploadI18n = i18n( 'general.button.UPLOAD' );

            self.allowScan = self.allowScan && hasInScanLicence;
            self.allowWebcam = true;

            //  publish events
            self.events = new Y.EventTarget();

            self.events.publish( 'fineMediaUpload', {
                preventable: false
            } );

            self.readOnly = ko.observable( false );
            Y.log( 'initFineViewModel', 'debug', NAME );
        },
        destroyFineViewModel: function() {
            //var self = this;
            Y.log( 'destroytFineViewModel', 'debug', NAME );
            //TODO: check Fine documentation
        },

        initTriggerableFlows: function() {
            var self = this;

            self.triggerFLow = function(flow) {
                var activityId = self.activityId() || "NEW";

                if( self.activityId ) {
                    if( !self.activityId() || '' === self.activityId() ) {

                        Y.doccirrus.DCWindow.notice( {
                            type: 'info',
                            message: i18n( 'MediaMojit.FineUploader.PLEASE_SAVE' ),
                            window: {
                                width: 'medium'
                            }
                        } );

                        return;
                    }
                }

                Y.doccirrus.jsonrpc.api.flow.execute( {
                    query: {
                        _id: flow._id
                    },
                    data: {
                        overwrite:{
                            activityId: activityId
                        }
                    }
                } ).done( function(res) {
                    if ("NEW" === activityId) { // This should never be called
                        if(res.data && res.data.mediaObj) {
                            self.events.fire( 'fineMediaUpload', {}, res.data.mediaObj );

                            Y.doccirrus.DCSystemMessages.addMessage( {
                                messageId: 'selectFlow-done',
                                content: i18n( 'flow-api.FLOW_SUCCESS' )
                            } );
                        } else {
                            Y.doccirrus.DCSystemMessages.addMessage( {
                                messageId: 'selectFlow-done',
                                content: i18n( 'flow-api.FLOW_ERROR' )+"no media Object generated.",
                                level: 'WARNING'
                            } );
                        }
                    } else {
                        self.events.fire( 'documentImported' );
                        if( res.data.ophthalmologistTmpFileImported ) {
                            self.events.fire( 'ophthalmologistTmpFileImported', res.data.content );
                        }

                        Y.doccirrus.DCSystemMessages.addMessage( {
                            messageId: 'selectFlow-done',
                            content: i18n( 'flow-api.FLOW_SUCCESS' )
                        } );
                    }

                } ).fail( function( error ) {
                    Y.log("triggerFlow failed: "+error);
                    Y.doccirrus.DCSystemMessages.addMessage( {
                        messageId: 'selectFlow-done',
                        content: i18n( 'flow-api.FLOW_ERROR' )+(error && error.data?": "+error.data:""),
                        level: 'WARNING'
                    } );
                } );
            };

            Y.doccirrus.jsonrpc.api.flow.getActiveFlows( {
                query: {
                    'sources.resourceType':"FILE",
                    'sources.triggerManually':true
                }
            } ).done( function( response ) {
                var
                    activeFlows = response.data,
                    i;
                self.triggerableFlows([]);
                if (activeFlows.length && activeFlows.length > 0) {
                    for ( i = 0; i < activeFlows.length; i++) {
                        self.triggerableFlows.push(activeFlows[i]);
                    }
                }
            } ).fail( function( error ) {
                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
            } );
        },

        setReadOnly: function( bool ) {
            var
                self = this;
            self.readOnly( Boolean( bool ) );
        },

        //  EVENT HANDLERS

        /**
         *  Raised when the jade template is loaded and bound
         */

        onTemplateReady: function() {
            Y.log( 'FineViewModel.pug reports template is ready', 'debug', NAME );

            var self = this;

            self.jq = {
                btnUploadFine: $( '#btnUploadFine' ),
                btnScanFine: $( '#btnScanFine' ),
                btnWebcamFine: $( '#btnWebcamFine' ),
                btnWebcamFineFallback: $( '#btnWebcamFineFallback' ),
                btnImport: $( '#btnImportFromDeviceLog' ),
                btnImportGroup: $( '#btnImportGroup' ),
                divFineUploadDisplay: $( '#fineUploadDisplay' ),
                divFineUploadControl: $( '#divFineUploadControl' )
            };

            //  set up scan button
            if( self.allowScan ) {
                self.jq.btnScanFine.show();
            } else {
                self.jq.btnScanFine.hide();
            }
            self.jq.btnScanFine.off( 'click.fine' ).on( 'click.fine', function() {
                self.onScanClick();
            } );

            Y.log( 'Checking getUserMedia functionality, webcam access: ' + self.allowWebcam ? 'TRUE' : 'FALSE', 'debug', NAME );

            //  set up webcam button
            if( self.allowWebcam && navigator.mediaDevices && navigator.mediaDevices.getUserMedia ) {
                self.jq.btnWebcamFine.show();
            } else if (this.allowImage) {
                self.jq.btnWebcamFineFallback.show();
                self.jq.btnWebcamFine.hide();
            } else {
                self.jq.btnWebcamFineFallback.hide();
                self.jq.btnWebcamFine.hide();
            }
            self.jq.btnWebcamFine.off( 'click.fine' ).on( 'click.fine', function() {
                self.onWebcamClick();
            } );

            //  set up import button (from flows/devices)
            if ( self.allowImport ) {
                self.jq.btnImportGroup.show();
            } else {
                self.jq.btnImportGroup.hide();
            }

            self.jq.btnImport.off( 'click.fine' ).on( 'click.fine', function() {
                self.onImportClick();
            } );

            //  set up the upload control

            function linkUploadError( event, id, name, reason ) {
                self.onChunkedUploadError( event, id, name, reason );
            }

            function linkUploadComplete( event, id, name, responseJson ) {
                self.onChunkedUploadComplete( event, id, name, responseJson );
            }

            self.jq.divFineUploadDisplay
                .fineUploader( self.options )
                .on( 'error', linkUploadError )
                .on( 'complete', linkUploadComplete );

            self.jq.divFineUploadDisplay.fineUploader( 'addExtraDropzone', self.jq.divFineUploadControl[0] );

            self.jq.btnUploadFine.off( 'click.fine' ).on( 'click.fine', function() {
                //  MOJ-6412 the fine upload button does not get a binding on Firefox, we have to explicitly click it
                $( '#divFineOriginal' ).find( 'input' )[0].click();
            } );
        },

        /**
         * Raised in safari after making camera photo
         *
         * @function
         * @param viewModel {FineViewModel}
         * @param event
         */
        webCamFallbackOnChange: function( viewModel, event ) {

            var
                self = this,
                file = event.currentTarget.files[0];

            Y.doccirrus.media.uploadFileMR( '', ko.unwrap( self.ownerCollection ), ko.unwrap( self.ownerId ), ko.unwrap( self.label ), file, function( error, newMediaId ) {
                if( error ) {
                    Y.log( 'Could not load metadata of scanned object: ' + JSON.stringify( error ), 'error', NAME );
                    Y.doccirrus.DCWindow.notice( {
                        type: 'error',
                        message: error.message,
                        window: {
                            width: Y.doccirrus.DCWindow.SIZE_MEDIUM
                        }
                    } );
                }
                self.onWebcamMediaAdded( newMediaId );
            } );
        },

        /**
         *  Raised by fine uploader when the server reports a file has been added to GridFS
         *
         *  @param  event
         *  @param  qqId                    {Number}    Index of upload in this session
         *  @param  name                    {String}
         *  @param  responseJson            {Object}
         *  @param  responseJson.mediaObj   {Object}    Details of media in data store
         */

        onChunkedUploadComplete: function( event, qqId, name, responseJson ) {
            Y.log( 'Chunked upload complete.', 'info', NAME );

            var
                self = this,
                mediaObj = responseJson.mediaObj,
                cacheUrl = '/media/' + mediaObj._id + '_original.' + mediaObj.mime + '.' + mediaObj.ext;

            mediaObj._original = cacheUrl;
            self.onMediaAdded( mediaObj, qqId );
        },

        /**
         *  Raised when server fails to accept a chunk or upload
         *
         *  @param  event
         *  @param  id
         *  @param  name    {String}
         *  @param  reason  {String}    Error message from jquery.fine-uploader.js
         */

        onChunkedUploadError: function( event, id, name, reason ) {
            Y.log( 'Error uploading file "' + id + '"/"' + name + '": ' + JSON.stringify( reason ), 'warn', NAME );

            Y.doccirrus.DCWindow.notice( {
                type: 'error',
                message: reason,
                window: {
                    width: Y.doccirrus.DCWindow.SIZE_MEDIUM
                }
            } );
        },

        /**
         *  Raised when a file has been received by the server
         *
         *  At this point we need to make a second call to set the owner of this media
         *
         *  @param  mediaObj    {Object}    See media-schema.common.js
         *  @param  qqId        {Number}    Index of this upload in Fine session
         */

        onMediaAdded: function( mediaObj, qqId ) {
            var self = this;

            function onChownMedia( err ) {
                if( err ) {
                    Y.log( 'Could not set owner of uploaded media: ' + JSON.stringify( err ), 'warn', NAME );
                    return;
                }

                mediaObj.ownerCollection = self.ownerCollection();
                mediaObj.ownerId = self.ownerId();
                self.events.fire( 'fineMediaUpload', {}, mediaObj );

                //  hide the Fine upload controls
                $( 'li[qq-file-id="' + qqId + '"]' ).fadeOut();
            }

            Y.doccirrus.media.chownMR( '', mediaObj._id, self.ownerCollection(), self.ownerId(), onChownMedia );

        },

        /**
         *  Open scanner plugin modal
         */

        onScanClick: function() {

            var
                self = this,
                options = {
                    ownerCollection: self.ownerCollection(),
                    ownerId: self.ownerId(),
                    saveTo: self.saveTo
                },
                dialog = Y.doccirrus.utils.dynamsoft.showScanDialog( options );

            dialog.on( 'mediaadded64', function( facade, mediaObj ) {
                self.onImageScanned64( facade, mediaObj );
            } );

            dialog.on( 'doctypechange', function( facade, data ) {
                self.scanDocType = data.type;
            } );

            dialog.on( 'doctitlechange', function( facade, data ) {
                self.scanDocTitle = data.title;
            } );
        },

        onImageScanned64: function( mediaObj ) {
            var self = this;
            self.events.fire( 'fineMediaUpload', {}, mediaObj );
        },

        /**
         *  Import all UNPROCESSED DeviceLog entries and bind with current activity
         */

        onImportClick: function() {

            var
                self = this;

            if( self.activityId ) {
                if( !self.activityId() || '' === self.activityId() ) {

                    Y.doccirrus.DCWindow.notice( {
                        type: 'info',
                        message: i18n( 'MediaMojit.FineUploader.PLEASE_SAVE' ),
                        window: {
                            width: 'medium'
                        }
                    } );

                    return;
                }
            }

            Y.doccirrus.jsonrpc.api.devicelog.claimAllUnclaimedDeviceLogs( {
                data: {
                    patientId: ko.unwrap( self.patientId ),
                    activityId: ko.unwrap( self.ownerId )
                }
            } ).done( function( response ) {
                if( response &&
                    response.data &&
                    (typeof response.data.successCount === "number") &&
                    (typeof response.data.totalCount === "number") &&
                    (typeof response.data.errorCount === "number") &&
                    response.data.errorCount
                ) {
                    // If there were errors in importing one or more deviceLog entries then show the failed stats to the user
                    Y.doccirrus.DCWindow.notice( {
                        type: 'warn',
                        message: i18n( 'DeviceLogMojit.messages.claimAllUnclaimedDeviceLogsFailedStats' ).replace("$errorCount", response.data.errorCount).replace("$totalCount", response.data.totalCount),
                        window: {
                            width: Y.doccirrus.DCWindow.SIZE_SMALL
                        }
                    } );
                }

                self.events.fire( 'documentImported', {}, response );
            } ).fail( function( error ) {
                if( error && error.code === '115010' ) {
                    // Means nothing to import and so it is not error
                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display', 'info' );
                    return;
                }
                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
            } );
        },

        onWebcamClick: function() {
            var
                self = this,
                settings = {
                    'ownerCollection': self.ownerCollection(),
                    'ownerId': self.ownerId(),
                    'label': self.label(),
                    'onAdd': linkWebcamEvent
                };

            function linkWebcamEvent( mediaId ) {
                self.onWebcamMediaAdded( mediaId );
            }

            Y.doccirrus.modals.cameraInput.show( settings );
        },

        onWebcamMediaAdded: function( mediaId ) {
            var self = this;

            Y.log( 'Media uploaded from scanner, new _id is: ' + JSON.stringify( mediaId ), 'info', NAME );

            function onMetadataLoaded( response ) {
                Y.log( 'Media added from scanner, response: ' + JSON.stringify( response ), 'debug', NAME );
                response = response.data ? response.data : response;
                response = response[0] ? response[0] : response;
                self.events.fire( 'fineMediaUpload', {}, response );
            }

            function onMetadataFail( err ) {
                Y.log( 'Could not load metadata of scanned object: ' + JSON.stringify( err ), 'error', NAME );
            }

            Y.doccirrus.jsonrpc.api.media
                .read( {query: {'_id': mediaId}} )
                .done( onMetadataLoaded )
                .fail( onMetadataFail );

        }

    }, {
        NAME: 'FineViewModel',
        ATTRS: {
            binder: {
                valueFn: function() {
                    return Y.doccirrus.utils.getMojitBinderByType( 'MediaMojit' );
                }
            }
        }
    } );

    KoViewModel.registerConstructor( FineViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'dcutils',
        'dcauth',
        'dcmedia-filetypes'
    ]
} );