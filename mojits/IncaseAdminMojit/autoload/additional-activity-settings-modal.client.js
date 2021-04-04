/**
 * User: pi
 * Date: 29.11.17  09:49
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko */

YUI.add( 'AdditionalActivitySettingsModal', function( Y ) {
        'use strict';

        var
            catchUnhandled = Y.doccirrus.promise.catchUnhandled,
            KoViewModel = Y.doccirrus.KoViewModel,
            incaseconfiguration = KoViewModel.createViewModel( {schemaName: 'incaseconfiguration'} ),
            i18n = Y.doccirrus.i18n,
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable;

        function ViewModel() {
            ViewModel.superclass.constructor.apply( this, arguments );
        }

        Y.extend( ViewModel, KoViewModel.getDisposable(), {
            /** @protected */
            initializer: function() {
                var
                    self = this;
                self.initViewModel();

            },
            /** @protected */
            destructor: function() {
            },
            initViewModel: function() {
                var
                    self = this,
                    data = self.get( 'data' );

                const isSwiss = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland();
                const isGerman = Y.doccirrus.commonutils.doesCountryModeIncludeGermany();

                this.showMedicalAmount = function() {
                    if (isGerman) {
                        return data.actType === 'PRIVPRESCR';
                    } else if (isSwiss) {
                        return (data.actType === 'PRIVPRESCR' || data.actType === 'LONGPRESCR');
                    }
                };

                const isInvoice = data.actType === 'INVOICE';
                const title = data.title && data.title.split( '/' )[1].trim();
                self.isInvoice = isInvoice;

                const defaultValues = Y.doccirrus.schemas.activitysettings.getDefaultForActType( data.actType );

                this.maxMedicationAmount = ko.observable( data.maxMedicationAmount || defaultValues.maxMedicationAmount );
                this.generalSettingsGroupQuickPrintSetI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.group.QUICKPRINT_SET' );
                this.generalSettingsGroupQuickPrintAboutI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.QUICKPRINT_ABOUT' );
                this.generalSettingsGroupQuickPrintPrescriptionI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.group.QUICKPRINT_PRESCRIPTION' );
                this.generalSettingsGroupQuickPrintPrescriptionAboutI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.QUICKPRINT_PRESCRIPTION_ABOUT' );
                this.generalSettingsGroupQuickPrintReleaseI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.QUICKPRINT_RELEASE', {data: {actionType: title}} );
                this.generalSettingsGroupQuickPrintBillI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.QUICKPRINT_BILL' );
                this.generalSettingsGroupQuickPrintNoteI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.QUICKPRINT_NOTE' );
                this.generalSettingsGroupQuickPrintPrescriptionProcessI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.QUICKPRINT_PRESCRIPTION_PROCESS' );
                this.generalSettingsGroupQuickPrintPrescriptionNoteI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.QUICKPRINT_PRESCRIPTION_NOTE' );
                this.generalSettingsGroupPrintAndCreatePDFI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.group.PRINT_AND_CREATE_PDF' );
                this.generalSettingsGroupHidePDFLinksI18n = i18n( 'activitysettings-schema.ActivitySetting_T.hideLinksOfPrintedPDF.i18n' );

                this.onTipLinkClick = function( infoboxType ) {
                    const infoboxContents = {
                        'GENERAL': {
                            title: i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.INFOBOX_TITLE' ),
                            message: i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.INFOBOX_BODY' ).replace( new RegExp( '\n', 'g' ), '<br/>' ) //eslint-disable-line no-control-regex
                        },
                        'RELEASE_AND_PRINT': {
                            invoice: {
                                title: i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.INFOBOX_TITLE' ),
                                message: i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.INFOBOX_RELEASE_AND_PRINT_INVOICE_BODY' ).replace( new RegExp( '\n', 'g' ), '<br/>' ) //eslint-disable-line no-control-regex
                            },
                            default: {
                                title: i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.INFOBOX_TITLE' ),
                                message: i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.INFOBOX_RELEASE_AND_PRINT_GENERAL_BODY' ).replace( new RegExp( '\n', 'g' ), '<br/>' ) //eslint-disable-line no-control-regex
                            }
                        }
                    };

                    function getMessage( infoboxType ) {
                        if( infoboxType === 'GENERAL' ) {
                            return infoboxContents[infoboxType].message;
                        } else {
                            return (isInvoice && infoboxType === 'RELEASE_AND_PRINT') ? infoboxContents[infoboxType].invoice.message : infoboxContents[infoboxType].default.message;
                        }
                    }

                    Y.doccirrus.DCWindow.notice( {
                        type: 'info',
                        window: {
                            width: Y.doccirrus.DCWindow.SIZE_LARGE,
                            buttons: {
                                header: ['close'],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'OK' )
                                ]
                            }
                        },
                        message: getMessage( infoboxType )
                    } );
                };
                this.incaseconfiguration = incaseconfiguration;
                this.quickPrintInvoice = ko.observable( data.quickPrintInvoice );
                this.quickPrintInvoiceBill = ko.observable( data.quickPrintInvoiceBill );
                this.quickPrintPrescription = ko.observable( data.quickPrintPrescription );
                self.hideLinksOfPrintedPDF = ko.observable( data.hideLinksOfPrintedPDF );

                this.displayMaxMedicationAmount = ko.computed( {
                    read: function() {
                        var val = unwrap( self.maxMedicationAmount );
                        val = Y.doccirrus.comctl.numberToLocalString( val, {intWithoutDec: true} );
                        return val;
                    },
                    write: function( val ) {
                        val = Math.round( Y.doccirrus.comctl.localStringToNumber( val ) );
                        self.maxMedicationAmount( val ); // otherwise it will allow to change ui value from 1 to 0
                        if( 1 > val || !val ) {
                            val = 1;
                        }
                        self.maxMedicationAmount( val );
                    }
                } );
                this.displayMaxMedicationAmount.i18n = i18n( 'IncaseAdminMojit.additionalActivitySettingsModal.text.MaxMedicationAmount.i18n' );
                this.displayMaxMedicationAmount.notice = i18n( 'IncaseAdminMojit.additionalActivitySettingsModal.text.MaxMedicationAmount.notice' );

                self.addDisposable( ko.computed( function() {
                    if( !unwrap( self.quickPrintInvoice ) ) {
                        self.hideLinksOfPrintedPDF( false );
                    }
                } ) );
            },
            toJSON: function() {
                var
                    self = this;
                return {
                    maxMedicationAmount: peek( self.maxMedicationAmount ),
                    quickPrintInvoice: peek( self.quickPrintInvoice ),
                    hideLinksOfPrintedPDF: peek( self.quickPrintInvoice ) ? peek( self.hideLinksOfPrintedPDF ) : false,
                    quickPrintInvoiceBill: peek( self.quickPrintInvoiceBill ),
                    quickPrintPrescription: peek( self.quickPrintPrescription )
                };
            }
        }, {
            ATTRS: {
                data: {
                    value: {},
                    lazyAdd: false
                }
            }
        } );

        function AdditionalActivitySettingsModal() {
        }

        AdditionalActivitySettingsModal.prototype.show = function( config ) {
            return Promise.resolve( Y.doccirrus.jsonrpc.api.jade
                .renderFile( {path: 'IncaseAdminMojit/views/additional-activity-settings-modal'} )
            )
                .then( function( response ) {
                    return response && response.data;
                } )
                .then( function( template ) {
                    return new Promise( function( resolve ) {
                        const title = i18n( 'IncaseAdminMojit.additionalActivitySettingsModal.title.modal', {data: {actType: Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', config.actType, 'i18n', '' )}} );

                        var
                            data = config.data,
                            bodyContent = Y.Node.create( template ),
                            modal,
                            viewModel = new ViewModel( {
                                data: Object.assign( {
                                    actType: config.actType,
                                    title: title
                                }, data )
                            } );

                        modal = new Y.doccirrus.DCWindow( {
                            id: 'additionalActivitySettings',
                            className: 'DCWindow-Appointment',
                            bodyContent: bodyContent,
                            title: title,
                            width: Y.doccirrus.DCWindow.SIZE_LARGE,
                            height: Y.doccirrus.DCWindow.SIZE_LARGE,
                            centered: true,
                            modal: true,
                            render: document.body,
                            buttons: {
                                header: ['close'],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                        isDefault: true,
                                        action: function() {
                                            this.close();
                                        }
                                    } ),
                                    Y.doccirrus.DCWindow.getButton( 'SAVE', {
                                        label: i18n( 'general.button.NEXT' ),
                                        isDefault: true,
                                        action: function() {
                                            modal.close();
                                            resolve( viewModel.toJSON() );
                                        }
                                    } )
                                ]
                            },
                            after: {
                                destroy: function() {
                                    ko.cleanNode( bodyContent.getDOMNode() );
                                    viewModel.destroy();
                                }
                            }
                        } );

                        modal.set( 'focusOn', [] );
                        ko.applyBindings( viewModel, bodyContent.getDOMNode() );
                    } );

                } ).catch( catchUnhandled );

        };
        Y.namespace( 'doccirrus.modals' ).additionalActivitySettingsModal = new AdditionalActivitySettingsModal();

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'DCWindow',
            'doccirrus',
            'promise',
            'KoViewModel',
            'dc-comctl'
        ]
    }
);