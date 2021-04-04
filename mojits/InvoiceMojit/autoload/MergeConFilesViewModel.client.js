'use strict';
/*global YUI, ko, _ */

YUI.add( 'MergeConFilesViewModel', function( Y/*, NAME */ ) {

        var i18n = Y.doccirrus.i18n,
            KoViewModel = Y.doccirrus.KoViewModel,
            FineViewModel = KoViewModel.getConstructor( 'FineViewModel' );

        self.fineViewModel = null;

        function MergeConFilesViewModel() {
            MergeConFilesViewModel.superclass.constructor.apply( this, arguments );
        }

        Y.extend( MergeConFilesViewModel, KoViewModel.getDisposable(), {
            /** @protected */
            descriptionText: null,
            uploadedFiles: null,

            initializer: function( state ) {
                var
                    self = this,
                    descriptionTextA = i18n( 'InvoiceMojit.gkv_browserJS.mergeConFiles.DESCRIPTION_TEXT_A' ),
                    descriptionTextB = i18n( 'InvoiceMojit.gkv_browserJS.mergeConFiles.DESCRIPTION_TEXT_B' );

                self.descriptionText = descriptionTextA + state.conFileName + descriptionTextB;
                self.bsnrText = i18n( 'InvoiceMojit.gkv_browserJS.mergeConFiles.CHECKBOX_BSNR' );
                self.flatfeeText = i18n( 'InvoiceMojit.gkv_browserJS.mergeConFiles.CHECKBOX_FLATFEE' );
                self.keepBsnr = false;
                self.flatfee = false;
                self.fineViewModel = new FineViewModel();
                self.initFineViewModel();
                self._id = state._id;
                self.state = state;
                self.uploadedFiles = ko.observableArray( [
                    {
                        filename: self.state.conFileName,
                        mediaId: self.state.conFileName,
                        conFileId: self.state.conFileId,
                        isMainMergeFile: true,
                        deleteable: false
                    }] );
                self.deleteAttachmentClick = function( doc ) {
                    self.deleteAttachment( doc );
                };
            },
            isDisabledMergeButton: function( aDcWindow ) {
                var self = this;
                self.modal = aDcWindow;
                ko.computed( function() {
                    var
                        uF = ko.unwrap( self.uploadedFiles ),
                        mergeBtn = self.modal.getButton( 'merge' ).button;
                    if( uF.length > 1 ) {
                        mergeBtn.enable();
                    } else {
                        mergeBtn.disable();
                    }
                } );
            },
            onCloseModal: function( aDcWindow ) {
                var
                    self = this,
                    uF = ko.unwrap( self.uploadedFiles ),
                    hasFile = uF.length > 1;

                if( hasFile ) {
                    // DELETE FILES ONLY IF THEY ARE NOT IN PROCESS OF A MERGE
                    Y.doccirrus.jsonrpc.api.kbvConFiles.delete( uF );
                }
                aDcWindow.close();
                self.destroy();
            },
            deleteAttachment: function( doc ) {
                var
                    self = this,
                    uF = ko.unwrap( self.uploadedFiles ),
                    result = [];
                // delete file from modal list
                result = uF.filter( function( fileToBeUploaded ) {
                    return fileToBeUploaded.mediaId !== doc.mediaId;
                } );
                self.uploadedFiles( result );

                // delete file from server
                Y.doccirrus.jsonrpc.api.kbvConFiles.delete( [doc] );
            },
            onMediaUpload: function( facade, mediaObj ) {
                var
                    self = this;
                self.uploadedFiles.push( {
                    filename: mediaObj.name,
                    mediaId: mediaObj._id,
                    deleteable: true
                } );
            },
            initFineViewModel: function() {
                var
                    self = this,
                    linkUploadEvent = function( facade, mediaObj ) {
                        self.onMediaUpload( facade, mediaObj );
                    };

                self.fineViewModel.allowScan = false;
                self.fineViewModel.allowWebcam = false;
                self.fineViewModel.allowImport = false;
                self.fineViewModel.allowImage = false;

                self.fineViewModel.dropAreaI18n = 'CON-Datei(en) hochladen - bitte hier ablegen';
                self.fineViewModel.saveTo = 'temp';

                self.fineViewModel.label( 'user' );
                self.fineViewModel.ownerCollection( 'activity' );

                //  subscribe to media upload event
                self.fineViewModel.events.on( 'fineMediaUpload', linkUploadEvent );

                self.fineViewModel.events.on( 'ophthalmologistTmpFileImported', function( content ) {
                    self.onOphthalmologistTmpFileImported( content );
                } );

                self.readOnly = ko.computed( function() {
                    return true;
                } );
            },

            mergeConFiles: function( aDCWindow ) {

                var
                    self = this,
                    uF = ko.unwrap( self.uploadedFiles() ),
                    reqObj = {
                        files: uF,
                        KbvLogId: self._id,
                        keepBsnr: self.keepBsnr,
                        flatfee: self.flatfee
                    };
                if( uF.length > 1 ) {
                    Y.doccirrus.jsonrpc.api.kbvConFiles.merge( reqObj ).then(
                        function() {
                        }
                    ).fail(
                        function( err ) {
                            _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                        }
                    );
                    aDCWindow.close();
                }
            }
        }, {
            NAME: 'MergeConFilesViewModel',
            ATTRS: {}
        } );
        KoViewModel.registerConstructor( MergeConFilesViewModel );
    },
    '0.0.1',
    {
        requires: [
            'KoViewModel',
            'FineViewModel'
        ]
    }
);
