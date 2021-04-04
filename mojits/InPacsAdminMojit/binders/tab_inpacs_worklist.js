'use strict';

/*exported fun*/
/*global fun:true, ko, jQuery, $ */
fun = function _fn( Y ) {

    var
        viewModel = null,
        KoViewModel = Y.doccirrus.KoViewModel,
        InPacsWorkListViewModel = KoViewModel.getConstructor( 'InPacsWorkListViewModel' ),
        i18n = Y.doccirrus.i18n;

    /**
     * Show error modal
     * @param {Object} errorObj - Error object to be displayed on the error modal
     * @param {string} errorObj.message - Error message
     */
    function showError( errorObj ) {
        var
            error,
            genericErrorI18n = i18n( 'InPacsAdminMojit.worklist.optionalDicomValues.errorHandling.generic_error' );

        if( errorObj && errorObj.message && Object.keys(errorObj).length === 1 ) {
            /**
             * Means the object passed is {message: "error message"}. In this case we can
             * directly pass the message below.
             */

            error = errorObj.message;
        } else {
            // We are keeping the original logic as it is since this case is unknown to me
            error = Y.doccirrus.errorTable.getErrorsFromResponse( errorObj ).join( '<br>' );
        }

        Y.doccirrus.DCWindow.notice( {
            type: 'error',
            window: { width: 'small' },
            message: error || genericErrorI18n
        } );
    }

    /**
     * Show success modal
     * @param {string} message - message to display on the modal
     */
    function showSuccess( message ) {
        var
            genericSuccessI18n = i18n( 'InPacsAdminMojit.worklist.optionalDicomValues.generic_success' );

        Y.doccirrus.DCWindow.notice( {
            type: 'info',
            message: message || genericSuccessI18n,
            window: {
                width: Y.doccirrus.DCWindow.SIZE_SMALL
            }
        } );
    }

    function ViewModel() {
        ViewModel.superclass.constructor.apply( this, arguments );
    }

    ViewModel.ATTRS = {
        data: {
            value: true,
            lazyAdd: false
        }
    };

    Y.extend( ViewModel, KoViewModel.getDisposable(), {

            title: null,
            modalityModel: null,
            isActiveLabel: null,
            isActive: null,
            numberOfImages: null,
            selectedCsvFile:null,
            csvUploadButtonEnabled: null,

            // ------- i18n texts for dicom tag optional values feature --
            dicomTagI18n: null,
            uploadI18n: null,
            downloadI18n: null,
            clearButtonI18n: null,
            csvFileStructureI18n: null,
            // ------------------------ END ------------------------------

            initializer: function( config ) {
                this.mainNode = config.node();
                this.initObservables();
                this.initWorkList();
                this.initDicomTagOptionalValuesI18n();
            },

            initDicomTagOptionalValuesI18n: function() {
                this.dicomTagI18n = i18n( 'InPacsAdminMojit.table.dicomTag' );
                this.uploadI18n = i18n( 'InPacsAdminMojit.worklist.optionalDicomValues.upload' );
                this.downloadI18n = i18n( 'InPacsAdminMojit.worklist.optionalDicomValues.download' );
                this.clearButtonI18n = i18n( 'InPacsAdminMojit.worklist.optionalDicomValues.clear' );
                this.csvFileStructureI18n = i18n( 'InPacsAdminMojit.worklist.optionalDicomValues.csv_file_structure' );
            },

            destructor: function() {
                if( this.workListModel ) {
                    this.workListModel.destroy();
                    this.workListModel = null;
                }
            },

            /**
             * Enable csvUploadButton on the UI
             */
            enableCsvFileUploadButton: function() {
                this.csvUploadButtonEnabled(true);
            },

            /**
             * Disable csvUploadButton on the UI
             */
            disableCsvFileUploadButton: function() {
                this.csvUploadButtonEnabled(false);
            },

            /**
             * Change event handler of file input.
             * @param {ViewModel} $data - ViewModel instance object
             * @param {jQuery.Event} $event - instance of $.Event
             */
            csvFileChange: function( $data, $event ){
                var
                    self = this,
                    csvFile = $event.target.files[0];

                if( csvFile ) {
                    if( csvFile.type !== "text/csv" && csvFile.type !== "application/vnd.ms-excel" ) {
                        showError({message: i18n( 'InPacsAdminMojit.worklist.optionalDicomValues.errorHandling.only_csv_allowed' )});
                        self.disableCsvFileUploadButton();
                        self.selectedCsvFile = null;
                        $("#csvFilePicker").val('');
                    } else if( !csvFile.size ) {
                        showError({message: i18n( 'InPacsAdminMojit.worklist.optionalDicomValues.errorHandling.empty_csv_file' )});
                        self.disableCsvFileUploadButton();
                        self.selectedCsvFile = null;
                        $("#csvFilePicker").val('');
                    } else {
                        self.selectedCsvFile = csvFile;
                        self.enableCsvFileUploadButton();
                    }
                } else {
                    self.disableCsvFileUploadButton();
                    self.selectedCsvFile = null;
                }
            },

            downloadCsvFile: function() {
                var
                    DEFAULT_URL = "/dicomUserInputCsvTemplate",
                    USER_FILE_ID = this.workListModel.getDicomTagCsvValuesFileDownloadId();

                if( USER_FILE_ID ) {
                    window.open( Y.doccirrus.infras.getPrivateURL("/download/"+USER_FILE_ID), '_blank' );
                } else {
                    window.open( Y.doccirrus.infras.getPrivateURL(DEFAULT_URL), '_blank' );
                }
            },

            /**
             * Uploads the CSV file to the server and if everything is fine then gets response as below:
             * {
             *      dicomTagValuesArr: [
             *          {
             *              id: <string, ex: 1>,
             *              value: <string, dicom value option>,
             *              comment: <string, description of dicom value>
             *          }
             *      ],
             *      gridFsFileDownloadId: <string, gridfs db _id of uploaded CSV FILE>
             * }
             */
            uploadCsvFile: function(){
                var
                    self = this,
                    formData = new FormData();

                formData.append( 'csvFile', self.selectedCsvFile, self.selectedCsvFile.name );
                Y.doccirrus.utils.showLoadingMask( self.mainNode );

                jQuery.ajax( {
                    url: Y.doccirrus.infras.getPrivateURL( '/1/inpacsconfiguration/:parseCsvFileForDicomTagValues' ),
                    type: 'POST',
                    xhrFields: {withCredentials: true},
                    data: formData,
                    cache: false,
                    contentType: false,
                    processData: false,
                    error: function( jqXHR, textStatus, errorThrown ) {
                        showError( {message: textStatus + " " + errorThrown } );
                    },
                    success: function( response ) {
                        var
                            errors = response && response.meta && response.meta.errors,
                            data = response && response.data;

                        if( errors && errors.length ) {
                            showError( errors[0] );
                        } else if( data ) {
                            self.workListModel.setDicomTagValuesEnum( null, null, data.dicomTagValuesArr, data.gridFsFileDownloadId );
                        } else {
                            // Should never happen but still keeping the check
                            showError( {message: i18n( 'InPacsAdminMojit.worklist.optionalDicomValues.errorHandling.no_server_response' )} );
                        }
                    },
                    complete: function (){
                        $("#csvFilePicker").val('');
                        Y.doccirrus.utils.hideLoadingMask( self.mainNode );
                        self.selectedCsvFile = null;
                        self.disableCsvFileUploadButton();
                    }
                } );
            },

            /**
             * Clears on the browser side below:
             * 1] Optional DICOM text boxes
             * 2] File picker for CSV
             * 3] Any cached uploaded CSV file reference
             * 4] Disables Upload CSV button
             * 5] Any existing optional DICOM tag values
             * 6] Any existing uploaded CSV file database ID reference
             */
            clearOptionalDicomTagValues: function() {
                this.workListModel.resetDicomTagValuesEnum();
                this.disableCsvFileUploadButton();
                this.selectedCsvFile = null;
                $("#csvFilePicker").val('');
            },

            initObservables: function() {
                var
                    self = this,
                    data = self.get( 'data' ),
                    modalitySelectedEnum = data.modality,
                    inPacsConfiguration = data.configuration;

                self.csvUploadButtonEnabled = ko.observable( false );
                self.title = ko.observable( i18n( 'InPacsAdminMojit.worklist.title' ).replace( '{{modalityType}}', modalitySelectedEnum.i18n ) );
                self.isActiveLabel = ko.observable( i18n( 'InPacsAdminMojit.worklist.checkbox.active' ).replace( '{{modalityType}}', modalitySelectedEnum.i18n ) );
                self.modalityModel = inPacsConfiguration.modalities.find( function( modality ) {
                    return modality.type === data.modality.val;
                } );
                self.isActive = ko.observable( self.modalityModel && self.modalityModel.isActive );

                self.numberOfImages = ko.observable();
                if( self.modalityModel ) {
                    if( typeof self.modalityModel.numberOfImages === "number") {
                        self.numberOfImages( self.modalityModel.numberOfImages );
                    } else {
                        self.numberOfImages( 1 );
                    }
                }

                self.numberOfImages.validationMessages = ko.observableArray([]);
                self.numberOfImages.hasError = ko.computed(function () {
                    var
                        noOfImages = ko.unwrap(self.numberOfImages),
                        isCorrect = /^(\d?[0-9]|[1-9]0)$/.exec(noOfImages), //Allow number between 0-99
                        msg = [];

                    self.numberOfImages.validationMessages.removeAll();

                    if(!isCorrect) {
                        msg.push( [i18n( 'InPacsAdminMojit.worklist.numberOfImagesErrorMsg' )] );
                    }

                    self.numberOfImages.validationMessages( msg );

                    return !isCorrect;
                });

                self.isValid = ko.computed( function() {
                    return !self.numberOfImages.hasError();
                } );


                if( !self.modalityModel ) {
                    self.modalityModel = {
                        type: modalitySelectedEnum.val
                    };
                    inPacsConfiguration.modalities.push( self.modalityModel );
                }
            },

            initWorkList: function() {
                var
                    self = this,
                    data = self.get( 'data' );

                self.numberOfImagesLabelI18n = i18n( 'InPacsAdminMojit.worklist.numberOfImagesLabel' );
                self.buttonSaveI18n = i18n( 'general.button.SAVE' );

                self.workListModel = new InPacsWorkListViewModel( {
                    data: {
                        modality: self.modalityModel,
                        inPacsSchema: data.inPacsSchema
                    }
                } );
            },

            save: function( model, e ) {
                e.preventDefault();

                var
                    self = this,
                    data = self.get( 'data' ),
                    modalitySelectedEnum = data.modality,
                    inPacsConfiguration = data.configuration,
                    worklistData = self.workListModel.getModelData();

                // --------------------------- validate optional dicomTagValues if present ----------------------------------
                if(worklistData.dicomTagValues && worklistData.dicomTagValues.length) {
                    if( !worklistData.dicomTagValues[0].dicomTag ) {
                        return showError( {message: i18n( 'InPacsAdminMojit.worklist.optionalDicomValues.errorHandling.dicom_tag_text_required' ) } );
                    }

                    if( !worklistData.dicomTagValues[0].dicomCommentTag ) {
                        return showError( {message: i18n( 'InPacsAdminMojit.worklist.optionalDicomValues.errorHandling.dicom_comment_tag_text_required' ) } );
                    }

                    if( worklistData.dicomTagValues[0].dicomTag === worklistData.dicomTagValues[0].dicomCommentTag ) {
                        return showError( {message: i18n( 'InPacsAdminMojit.worklist.optionalDicomValues.errorHandling.dicom_tags_cannot_be_same' ) } );
                    }

                    if( !worklistData.dicomTagValues[0].values.length ) {
                        return showError( {message: i18n( 'InPacsAdminMojit.worklist.optionalDicomValues.errorHandling.csv_upload_required' ).replace("$DICOMTAG", worklistData.dicomTagValues[0].dicomTag) } );
                    }
                }
                // ---------------------------------------- END ---------------------------------------------------

                inPacsConfiguration.modalities.forEach( function( modality ) {
                    if( modality.type === modalitySelectedEnum.val ) {
                        modality.isActive = ko.unwrap( self.isActive );
                        modality.numberOfImages = parseInt( ko.unwrap( self.numberOfImages ), 10 );
                    }
                } );

                Y.doccirrus.jsonrpc.api.inpacsconfiguration.saveWorkList( {
                        data: {
                            configuration: inPacsConfiguration,
                            workList: worklistData
                        }
                    } )
                    .done( function( response ) {
                        if( !self.modalityModel.workListId && response.data ) {
                            inPacsConfiguration.modalities.forEach( function( modality ) {
                                if( modality.type === modalitySelectedEnum.val ) {
                                    modality.isActive = ko.unwrap( self.isActive );
                                    modality.workListId = response.data;
                                }
                            } );
                        }
                        self.workListModel.fetchWorkListData();
                        showSuccess( i18n('InPacsAdminMojit.worklist.optionalDicomValues.saved_successfully') );
                    } )
                    .fail( showError );
            }
        }
    );

    return {
        registerNode: function( node, key, options ) {
            viewModel = new ViewModel( {
                node: function() {
                    return node.getDOMNode();
                },
                data: options
            } );

            ko.applyBindings( viewModel, node.getDOMNode() );
        },

        deregisterNode: function( node ) {
            ko.cleanNode( node.getDOMNode() );

            if( viewModel ) {
                viewModel.destroy();
                viewModel = null;
            }
        }
    };
};