/*jslint anon:true, sloppy:true, nomen:true*/
/*global fun:true, ko, jQuery, $ */
/*eslint no-unused-vars: "off"*/
fun = function _fn( Y, NAME ) {
    'use strict';
    var
        peek = ko.utils.peekObservable,
        i18n = Y.doccirrus.i18n,
        Disposable = Y.doccirrus.KoViewModel.getDisposable(),
        binder = Y.doccirrus.utils.getMojitBinderByType( 'LabLogMojit' ),
        binderViewModel = binder.binderViewModel,
        LDK_PM_DISABLED_WARNING = i18n( 'LabLogMojit.tab_overview.messages.LDK_PM_DISABLED_WARNING' ),
        viewModel;

    function TabImportViewModel( config ) {
        TabImportViewModel.superclass.constructor.call( this, config );
    }

    Y.extend( TabImportViewModel, Disposable, {
        /**
         * Determines file input enabled
         * @type {null|ko.observable}
         */
        fileEnabled: null,
        /**
         * Determines upload button enabled
         * @type {null|ko.observable}
         */
        uploadEnabled: null,
        /**
         * Determines upload button enabled
         * @type {null|ko.observable}
         */
        uploadHL7Enabled: null,
        /**
         * Determines upload ignoreHashExists enabled
         * @type {null|ko.observable}
         */
        ignoreHashExistsEnabled: null,
        ldtSubmitListener: null,

        initializer: function( config ) {
            var
                self = this;

            self.fileEnabled = ko.observable( true );
            self.uploadEnabled = ko.observable( false );
            self.uploadHL7Enabled = ko.observable( false );
            self.ignoreHashExistsEnabled = ko.observable( false );
            self.importHeadlineI18n = i18n( 'LabLogMojit.tab_import.headline' );
            self.importSubmitTextI18n = i18n( 'LabLogMojit.tab_import.submit.text' );
            self.importBillingFlagI18n = i18n( 'flow-schema.Transformer_T.billingFlag' );
            self.importAllowGVKBillingI18n = i18n( 'flow-schema.Transformer_T.allowGkvBilling' );
            self.useDataFromLabrequestIfPresentI18n = i18n( 'flow-schema.Transformer_T.useDataFromLabrequestIfPresent' );
            self.importcheckFileWithLDKPMI18n = i18n( 'flow-schema.Transformer_T.checkFileWithLdkPm' );
            self.recordRequestIdI18n = i18n( 'flow-schema.Transformer_T.useAddInfoForId.recordRequestId' );
            self.labReqIdI18n = i18n( 'flow-schema.Transformer_T.useAddInfoForId.labReqId' );
            self.patientIdI18n = i18n( 'flow-schema.Transformer_T.useAddInfoForId.patientId' );
            self.importHeadlineHl7I18n = i18n( 'LabLogMojit.tab_import.headlineHl7' );
            self.hl7CreateTreatmentsI18n = i18n( 'flow-schema.Transformer_T.hl7CreateTreatments' );
            self.mainNode = config.node;
            self.isSwiss = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland();

            self.overviewCheckFileWithLDKPMI18n = i18n( 'settings-schema.Settings_T.checkFilesWithLdkPm' );

            self.initLDTSubmitListener();
            self.initConfiguration();
        },

        initConfiguration: function() {
            var self = this;
            self.i18n = {
                LDK_PM_DISABLED_WARNING: LDK_PM_DISABLED_WARNING
            };

            self.useAddInfoForIdSubscription = null;
            self.useAddInfoForIdFKSubscription = null;
            self.ldtBillingFlagSubscription = null;
            self.ldtDisallowGkvBillingSubscription = null;
            self.ldtAllowGkvBillingSubscription = null;
            self.useDataFromLabrequestIfPresent = null;
            self.checkFilesWithLdkPmSubscription = null;
            self.hl7CreateTreatmentsSubscription = null;
            self.useAddInfoForId = ko.observable( false );
            self.useAddInfoForIdFK = ko.observable( '8310' );
            self.ldtBillingFlag = ko.observable( false );
            self.ldtDisallowGkvBilling = ko.observable( false );
            self.ldtAllowGkvBilling = ko.observable( false );
            self.useDataFromLabrequestIfPresent = ko.observable( false );
            self.checkFilesWithLdkPm = ko.observable( false );
            self.hl7CreateTreatments = ko.observable( true );
            self.useAddInfoForIdI18n = i18n( 'flow-schema.Transformer_T.useAddInfoForId.label' );
            self.useAddInfoForIdPopover = i18n( 'flow-schema.Transformer_T.useAddInfoForId.popover' );
            self.useAddInfoForIdPopoverTitle = i18n( 'flow-schema.Transformer_T.useAddInfoForId.popoverTitle' );
            self.ldtBillingFlagI18n = i18n( 'settings-schema.Settings_T.ldtBillingFlag' );
            self.ldtBillingFlagI18n = i18n( 'settings-schema.Settings_T.ldtBillingFlag' );
            self.checkFilesWithLdkPmI18n = i18n( 'settings-schema.Settings_T.checkFilesWithLdkPm' );
            self.tenantSettings = ko.observable( {} );
            self.ldtDisallowGkvBillingI18n = i18n( 'settings-schema.Settings_T.ldtDisallowGkvBilling' );
            self.ldtAllowGkvBillingI18n = i18n( 'settings-schema.Settings_T.ldtAllowGkvBilling' );
            Y.doccirrus.jsonrpc.api.settings.read()
                .then( function( response ) {
                    return response.data && response.data[0] || {};
                } )
                .then( function( config ) {
                    self.tenantSettings( config );
                    if( self.useAddInfoForIdSubscription ) {
                        self.useAddInfoForIdSubscription.dispose();
                    }
                    if( self.useAddInfoForIdFKSubscription ) {
                        self.useAddInfoForIdFKSubscription.dispose();
                    }
                    if( self.ldtBillingFlagSubscription ) {
                        self.ldtBillingFlagSubscription.dispose();
                    }
                    if( self.ldtDisallowGkvBillingSubscription ) {
                        self.ldtDisallowGkvBillingSubscription.dispose();
                    }
                    if( self.ldtAllowGkvBillingSubscription ) {
                        self.ldtAllowGkvBillingSubscription.dispose();
                    }
                    if( self.useDataFromLabrequestIfPresentSubscription ) {
                        self.useDataFromLabrequestIfPresentSubscription.dispose();
                    }
                    if( self.checkFilesWithLdkPmSubscription ) {
                        self.checkFilesWithLdkPmSubscription.dispose();
                    }
                    if( self.hl7CreateTreatmentsSubscription ) {
                        self.hl7CreateTreatmentsSubscription.dispose();
                    }

                    self.useAddInfoForId( Boolean( config.useAddInfoForId ) );
                    self.useAddInfoForIdFK( String( config.useAddInfoForIdFK ) );
                    self.ldtBillingFlag( Boolean( config.ldtBillingFlag ) );
                    self.ldtDisallowGkvBilling( Boolean( config.ldtDisallowGkvBilling ) );
                    self.ldtAllowGkvBilling( Boolean( config.ldtAllowGkvBilling ) );
                    self.useDataFromLabrequestIfPresent( Boolean( config.useDataFromLabrequestIfPresent ) );
                    self.checkFilesWithLdkPm( Boolean( config.checkFilesWithLdkPm ) );
                    self.hl7CreateTreatments( Boolean( config.hl7CreateTreatments ) );

                    self.useAddInfoForIdSubscription = self.useAddInfoForId.subscribe( function( val ) {
                        var tenantSettings = peek( self.tenantSettings );
                        if( !tenantSettings ) {
                            return;
                        }
                        Promise.resolve( Y.doccirrus.jsonrpc.api.settings.update( {
                            data: {
                                _id: tenantSettings._id,
                                useAddInfoForId: val
                            },
                            fields: ['useAddInfoForId']
                        } ) ).catch( function( err ) {
                            Y.log( 'could not update useAddInfoForId setting ' + err, 'error', NAME );
                        } );
                    } );

                    self.useAddInfoForIdFKSubscription = self.useAddInfoForIdFK.subscribe( function( val ) {
                        var tenantSettings = peek( self.tenantSettings );
                        if( !tenantSettings ) {
                            return;
                        }
                        Promise.resolve( Y.doccirrus.jsonrpc.api.settings.update( {
                            data: {
                                _id: tenantSettings._id,
                                useAddInfoForIdFK: val
                            },
                            fields: ['useAddInfoForIdFK']
                        } ) ).catch( function( err ) {
                            Y.log( 'could not update useAddInfoForIdFK setting ' + err, 'error', NAME );
                        } );
                    } );

                    self.ldtBillingFlagSubscription = self.ldtBillingFlag.subscribe( function( val ) {
                        var tenantSettings = peek( self.tenantSettings );
                        if( !tenantSettings ) {
                            return;
                        }
                        Promise.resolve( Y.doccirrus.jsonrpc.api.settings.update( {
                            data: {
                                _id: tenantSettings._id,
                                ldtBillingFlag: val
                            },
                            fields: ['ldtBillingFlag']
                        } ) ).catch( function( err ) {
                            Y.log( 'could not update ldtBillingFlag setting ' + err, 'error', NAME );
                        } );
                    } );

                    self.ldtDisallowGkvBillingSubscription = self.ldtDisallowGkvBilling.subscribe( function( val ) {
                        var tenantSettings = peek( self.tenantSettings );
                        if( !tenantSettings ) {
                            return;
                        }
                        Promise.resolve( Y.doccirrus.jsonrpc.api.settings.update( {
                            data: {
                                _id: tenantSettings._id,
                                ldtDisallowGkvBilling: val
                            },
                            fields: ['ldtDisallowGkvBilling']
                        } ) ).catch( function( err ) {
                            Y.log( 'could not update ldtDisallowGkvBilling setting ' + err, 'error', NAME );
                        } );
                    } );

                    self.ldtAllowGkvBillingSubscription = self.ldtAllowGkvBilling.subscribe( function( val ) {
                        var tenantSettings = peek( self.tenantSettings );
                        if( !tenantSettings ) {
                            return;
                        }
                        Promise.resolve( Y.doccirrus.jsonrpc.api.settings.update( {
                            data: {
                                _id: tenantSettings._id,
                                ldtAllowGkvBilling: val
                            },
                            fields: ['ldtAllowGkvBilling']
                        } ) ).catch( function( err ) {
                            Y.log( 'could not update ldtAllowGkvBilling setting ' + err, 'error', NAME );
                        } );
                    } );

                    self.useDataFromLabrequestIfPresentSubscription = self.useDataFromLabrequestIfPresent.subscribe( function( val ) {
                        var tenantSettings = peek( self.tenantSettings );
                        if( !tenantSettings ) {
                            return;
                        }
                        Promise.resolve( Y.doccirrus.jsonrpc.api.settings.update( {
                            data: {
                                _id: tenantSettings._id,
                                useDataFromLabrequestIfPresent: val
                            },
                            fields: ['useDataFromLabrequestIfPresent']
                        } ) ).catch( function( err ) {
                            Y.log( 'could not update useDataFromLabrequestIfPresent setting ' + err, 'error', NAME );
                        } );
                    } );

                    self.checkFilesWithLdkPmSubscription = self.checkFilesWithLdkPm.subscribe( function( val ) {
                        var tenantSettings = peek( self.tenantSettings );
                        if( !tenantSettings ) {
                            return;
                        }
                        Promise.resolve( Y.doccirrus.jsonrpc.api.settings.update( {
                            data: {
                                _id: tenantSettings._id,
                                checkFilesWithLdkPm: val
                            },
                            fields: ['checkFilesWithLdkPm']
                        } ) ).catch( function( err ) {
                            Y.log( 'could not update checkFilesWithLdkPm setting ' + err, 'error', NAME );
                        } );
                    } );

                    self.hl7CreateTreatmentsSubscription = self.hl7CreateTreatments.subscribe( function( val ) {
                        var tenantSettings = peek( self.tenantSettings );
                        if( !tenantSettings ) {
                            return;
                        }
                        Promise.resolve( Y.doccirrus.jsonrpc.api.settings.update( {
                            data: {
                                _id: tenantSettings._id,
                                checkFilesWithLdkPm: val
                            },
                            fields: ['hl7CreateTreatments']
                        } ) ).catch( function( err ) {
                            Y.log( 'could not update hl7CreateTreatments setting ' + err, 'error', NAME );
                        } );
                    } );
                } )
                .fail( function( err ) {
                    Y.log( 'could not get settings ' + err, 'error', NAME );
                } );
        },

        initLDTSubmitListener: function() {
            var
                self = this;

            self.ldtSubmitListener = Y.doccirrus.communication.on( {
                event: 'submitLDTEvent',
                done: function( response ) {
                    self.hideSpinner();

                    var
                        parseError,
                        code19000,
                        error = response && response.data && response.data[0] && response.data[0].error,
                        data = response && response.data && response.data[0] && response.data[0].result;

                    if( data && data.meta ) {
                        response.meta = data.meta;
                    }

                    if( data && data.data ) {
                        data = data.data;
                    }

                    response.meta = response.meta || {errors: []};

                    if( !response.meta.errors ) {
                        response.meta.errors = [];
                    }

                    if( error ) {
                        response.meta.errors = Array.isArray( error ) ? error : [error];
                    }

                    if( response.meta.errors.length ) {
                        code19000 = Y.Array.find( response.meta.errors, function( item ) {
                            return item.code === 19000;
                        } );
                        if( code19000 ) {
                            response.meta.errors.splice( response.meta.errors.indexOf( code19000 ), 1 );
                        }
                        parseError = Y.Array.find( response.meta.errors, function( item ) {
                            return item.line && item.reason;
                        } );
                        if( parseError ) {
                            response.meta.errors.splice( response.meta.errors.indexOf( parseError ), 1 );
                        }
                    }

                    Y.Array.invoke( Y.doccirrus.errorTable.getWarningsFromResponse( response ), 'display' );
                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( response ), 'display' );

                    jQuery( '#ldtResult' ).html( '' );

                    if( code19000 ) {
                        self.fileEnabled( true );
                        Y.doccirrus.DCWindow.confirm( {
                            message: i18n( 'LabLogMojit.tab_import.error.19000.confirm.message' ),
                            callback: function( dialog ) {
                                if( dialog.success ) {
                                    self.ignoreHashExistsEnabled( true );
                                    self.upload( self.type );
                                } else {
                                    self.processSuccessOfUpload( {data: data} );
                                }
                            }
                        } );
                        return;
                    }
                    if( parseError ) {
                        self.fileEnabled( true );
                        Y.doccirrus.DCWindow.notice( {
                            type: 'notice',
                            title: 'Hinweis',
                            message: "Parser-Fehler (Zeile " + parseError.line + "):<br><br><span style='font: 12px monospace'>" + parseError.reason + "</span>",
                            window: {id: 'ldt_upload_fail', width: 'medium'}
                        } );
                        return;
                    }
                    if( !response.meta.errors.length ) {
                        self.processSuccessOfUpload( {data: data} );
                    }
                }
            } );
        },
        destructor: function() {
            if( this.ldtSubmitListener ) {
                this.ldtSubmitListener.removeEventListener();
                this.ldtSubmitListener = null;
            }
        },
        showSpinner: function() {
            Y.doccirrus.utils.showLoadingMask( this.mainNode );
        },
        hideSpinner: function() {
            Y.doccirrus.utils.hideLoadingMask( this.mainNode );
        },
        /**
         * Change event handler of file input.
         * @param {TabImportViewModel} $data
         * @param {jQuery.Event} $event
         */
        fileChange: function( $data, $event ) {
            var
                self = this,
                fileList = $event.target.files,
                isHL7 = $event.target && $event.target.id && $event.target.id === 'hl7',
                file = fileList[0],
                fileSizeExceeds = Y.doccirrus.utils.notifyAboutFileSizeExceeds( fileList );

            if( !isHL7 ) {
                if( fileSizeExceeds ) {
                    self.uploadEnabled( false );
                } else {
                    self.uploadEnabled( Boolean( file ) );
                }
            } else {
                if( fileSizeExceeds ) {
                    self.uploadHL7Enabled( false );
                } else {
                    self.uploadHL7Enabled( Boolean( file ) );
                }
            }
        },
        uploadHL7: function() {
            var
                self = this;
            self.type = 'HL7';
            self.upload( self.type );
        },
        /**
         * Click event handler of upload button.
         * @param {String} type
         */
        upload: function( type ) {
            var
                self = this,
                // In Swiss we only provide HL7Upload option, otherwise we only provide LDT option
                formId = type === 'HL7' ? '#hl7Form' : '#ldtForm',
                url = Y.doccirrus.infras.getPrivateURL( type === 'HL7' ? '/1/hl7/:convertHL7toLDTJSON' : '/1/lab/:submitLDT' );

            if( type === 'HL7' ) {
                self.uploadHL7Enabled( false );
            } else {
                self.uploadEnabled( false );
            }

            self.showSpinner();

            jQuery.ajax( {
                url: url,
                type: 'POST',
                xhrFields: {withCredentials: true},
                xhr: function() {
                    self.fileEnabled( false );
                    var myXhr = jQuery.ajaxSettings.xhr();
                    if( myXhr.upload ) {
                        myXhr.upload.addEventListener( 'progress', function( e ) {
                            jQuery( '#ldtResult' ).html( "<i class='fa fa-spinner fa-pulse'></i> " + Y.Lang.sub( i18n( 'LabLogMojit.tab_import.progress.bytesSend' ), {
                                loaded: e.loaded,
                                total: e.total
                            } ) + (e.loaded === e.total ? " " + i18n( 'LabLogMojit.tab_import.progress.done' ) : "") );
                        }, false );
                    }
                    return myXhr;
                },
                data: new FormData( jQuery( formId )[0] ),
                cache: false,
                contentType: false,
                processData: false,
                error: function( jqXHR, textStatus, errorThrown ) {
                    self.hideSpinner();
                    jQuery( '#ldtResult' ).html( textStatus + ": " + errorThrown );
                }
            } );
        },
        /**
         * processes steps considered a successful upload
         * @param {Object} response
         */
        processSuccessOfUpload: function( response ) {
            var
                self = this,
                data = response.data,
                formId = self.type === 'HL7' ? '#hl7Form' : '#ldtForm',
                ldtForm = jQuery( formId )[0];

            if( self.ignoreHashExistsEnabled() ) {
                self.ignoreHashExistsEnabled( false );
            }

            // ldtForm.reset();
            self.fileEnabled( true );
            jQuery( ldtForm.ldtFile ).change();

            if( data && Array.isArray( data ) ) {
                Y.doccirrus.DCSystemMessages.addMessage( {
                    messageId: 'tab_import-submitLDT',
                    content: i18n( 'LabLogMojit.tab_import.success.message' )
                } );
                if( Y.doccirrus.schemas.lablog.someL_dataRecordNeedsMatching( data ) ) {
                    Y.doccirrus.DCSystemMessages.addMessage( {
                        messageId: 'tab_import-needsMatchingOnImport-' + data._id,
                        level: 'WARNING',
                        content: i18n( 'kbv.ldt.message.needsMatchingOnImport' )
                    } );
                }
                binderViewModel.visitLabLog();
            } else if( typeof data === 'string' ) {
                Y.doccirrus.DCWindow.notice( {
                    type: 'error',
                    message: data,
                    window: {
                        width: 'medium'
                    }
                } );
            }
        }
    } );

    return {

        registerNode: function( node ) {
            viewModel = new TabImportViewModel( {
                node: node.getDOMNode()
            } );
            ko.applyBindings( viewModel, node.getDOMNode() );
            $( '[data-toggle="popover"]' ).popover();
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
