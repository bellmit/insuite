/**
 * User: abhijit.baldawa
 * Date: 17.11.17  10:43
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';
/*exported fun */
/*global fun:true, ko, jQuery */
fun = function _fn( Y ) {
    var
        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,
        viewModel;

    function TabInpacsImportViewModel( config ) {
        TabInpacsImportViewModel.superclass.constructor.call( this, config );
    }

    Y.extend( TabInpacsImportViewModel, KoViewModel.getDisposable(), {
        /**
         * Determines upload button enabled
         * @type {null|ko.observable}
         */
        uploadEnabled: null,
        /**
         * Determines whether upload process in running
         * @type {null|ko.observable}
         */
        isUploadRunning: null,
        /**
         * Determines whether to show drop files text
         * @type {null|ko.observable}
         */
        showDropFilesText: null,
        /**
         * Sets the state of the UI to original state
         * @type {function}
         * @params args {object}
         * ex. args = {
         *               uploadEnabled: <boolean: enable/disable upload button>,
         *               clearPreviousErrors: <boolean: Clear/toShow error results>,
         *               uploadStatus: <String: Status of upload>
         *            }
         */
        resetUIState: function ( args ) {
            var
                self = this;

            self.uploadEnabled( args.uploadEnabled );

            if( args.clearPreviousErrors ) {
                jQuery( '#dicomUploadResult' ).html( '' );
            }

            if( args.uploadStatus ) {
                jQuery( '#dicomUploadStatus' ).html( args.uploadStatus );
            }
        },
        /**
         * Updated the file upload result and percentage on the UI
         * @type {function}
         * @params args {object}
         * ex. args = {
         *                fileResult: {
         *                   domId: <string: which DOM to append the failure stats>,
         *                   fileName: <string: name of file whose upload has failed>,
         *                   textStatus: <string: http status of failure>,
         *                   errorMessage: <string: error message of failure>
         *                }
         *            }
         */
        updateResult: function ( args ) {
            var
                fileResult = args.fileResult;

            if(fileResult) {
                if( !jQuery( fileResult.domId ).text() ) {
                    jQuery( fileResult.domId ).append( "<b>Error(s)</b> <br/>" );
                }
                jQuery( fileResult.domId ).append( "<b style='color: red'>"+ fileResult.fileName + " ->  " + fileResult.textStatus + " : " + fileResult.errorMessage + "</b><br/>" );
            }
        },

        initializer: function TabImportViewModel_initializer( config ) {
            var
                self = this;

            jQuery( '#dicomFineUploader' ).fineUploader({
                template: 'qq-template-dicomupload-status',
                request: {
                    endpoint: Y.doccirrus.infras.getPrivateURL( '/inpacs/instances' ),
                    paramsInBody: false,
                    uuidName: undefined,
                    totalFileSizeName: undefined,
                    filenameParam: undefined
                },
                maxConnections:1,
                cors: {
                    expected: true,
                    sendCredentials: true,
                    allowXdr: true
                },
                callbacks: {
                    onSubmit: function( /*id, fileName*/ ) {
                        if( !self.isUploadRunning() ) {
                            self.resetUIState( {
                                uploadEnabled: false,
                                clearPreviousErrors: true,
                                uploadStatus: i18n( 'InpacsLogMojit.tabInpacsImport.uploadStatusText' )
                            } );
                            self.isUploadRunning( true );
                        }
                    },
                    onTotalProgress: function( totalUploadedBytes, totalBytes ) {
                        if( totalUploadedBytes >= totalBytes ) {
                            self.resetUIState( {
                                uploadEnabled: false,
                                clearPreviousErrors: false,
                                uploadStatus: i18n( 'InpacsLogMojit.tabInpacsImport.waitingStatusText' )
                            } );
                            self.isUploadRunning( true );
                        }
                    },
                    onComplete: function( id, name, responseJSON) {
                        var
                            errorMessage = i18n( 'InpacsLogMojit.tabInpacsImport.failedDicomMsg' );

                        // If there is error and file is not system file then let the user know
                        if( !responseJSON.ID && name !== '.DS_Store' ) {
                            if( responseJSON.Message && typeof responseJSON.Message === "string" ) {
                                errorMessage = responseJSON.Message;
                            }

                            self.updateResult({
                                fileResult: {
                                    domId: '#dicomUploadResult',
                                    fileName: name,
                                    textStatus: 'error',
                                    errorMessage: errorMessage
                                }
                            });
                        }
                    },
                    onAllComplete: function(  ) {
                        self.resetUIState( {
                            uploadEnabled: true,
                            clearPreviousErrors: false,
                            uploadStatus: i18n( 'InpacsLogMojit.tabInpacsImport.uploadSuccessStatusText' )
                        } );
                        self.isUploadRunning( false );
                    }
                }
            });

            self.mainNode = config.node;
            self.uploadEnabled = ko.observable( true );
            self.isUploadRunning = ko.observable( false );
            self.showDropFilesText = ko.computed( function(  ) {
                if( self.isUploadRunning() ) {
                    return "display: none";
                } else {
                    return "display: block";
                }
            } );
            self.titleI18n = i18n( 'InpacsLogMojit.tabInpacsImport.title' );
            self.buttonUploadI18n = i18n( 'general.button.UPLOAD' );
            self.dropFilesHereTextI18n = i18n( 'InpacsLogMojit.tabInpacsImport.dropFilesHereText' );
            self.uploadingTextI18n = i18n( 'InpacsLogMojit.tabInpacsImport.uploadingText' );
        }
    });

    return {
        registerNode: function( node ) {
            viewModel = new TabInpacsImportViewModel({
                node: node.getDOMNode()
            });

            ko.applyBindings( viewModel, node.getDOMNode() );
        },

        deregisterNode: function( node ) {
            ko.cleanNode( node.getDOMNode() );

            // clear the viewModel
            if( viewModel ) {
                viewModel.destroy();
                viewModel = null;
            }
        }
    };
};