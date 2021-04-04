/*jslint anon:true, sloppy:true, nomen:true*/
/*global fun:true, ko, $, _ */
/*exported fun */

fun = function _fn( Y/*, NAME*/ ) {
    'use strict';

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        incaseconfiguration = KoViewModel.createViewModel( {
            schemaName: 'incaseconfiguration',
            config: {validatable: true}
        } ),
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
        i18n = Y.doccirrus.i18n,
        NOT_PRE_ASSIGNMENT = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.label.NOT_PRE_ASSIGNMENT' ),
        bindings = {},
        allowAdHoc = false,
        subscriptions = [];

    bindings.incaseconfiguration = incaseconfiguration;

    bindings.locationList = ko.observableArray();

    bindings.hasEdocs = Y.doccirrus.auth.hasSpecialModule( Y.doccirrus.schemas.settings.specialModuleKinds.EDMP ) ||
                        Y.doccirrus.auth.hasSpecialModule( Y.doccirrus.schemas.settings.specialModuleKinds.EHKS );
    bindings.isLoading = ko.observable( true );
    bindings.masterTabConfigs = ko.observableArray();
    bindings.masterTabConfigTitle = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.MASTER_TAB_CONFIG_TITLE' );
    bindings.masterTabConfigText = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.MASTER_TAB_CONFIG_TEXT' );
    bindings.showMasterTabConfigDesc = function() {
        Y.doccirrus.DCWindow.notice( {
            message: i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.MASTER_TAB_CONFIG_DESC' ),
            window: {
                className: 'not-notice',
                width: Y.doccirrus.DCWindow.SIZE_LARGE
            }
        } );
    };
    bindings.showkimIncludeRevocationInfo = function() {
        Y.doccirrus.DCWindow.notice( {
            message: i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.KIM_TREATMENT_INCLUDE_REVOCATION_INFO' ),
            window: {
                className: 'not-notice',
                width: Y.doccirrus.DCWindow.SIZE_LARGE
            }
        } );
    };

    bindings.showKimTreatmentAutoCreationInfo = function() {
        Y.doccirrus.DCWindow.notice( {
            message: i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.KIM_TREATMENT_AUTO_CREATION_INFO' ),
            window: {
                className: 'not-notice',
                width: Y.doccirrus.DCWindow.SIZE_LARGE
            }
        } );
    };
    bindings.getSystemTitle = function( index ) {
        return i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.MASTER_TAB_CONFIG_SYSTEM' ) + ' ' + (index + 1);
    };
    bindings.buttonSaveEnabled = ko.observable( false );
    bindings.actionSaveEnabled = ko.computed( function() {
        var
            masterTabConfigs = unwrap( bindings.masterTabConfigs );
        if( bindings.isLoading() || !bindings.buttonSaveEnabled() || !incaseconfiguration.isValid() ) {
            return false;
        } else {
            return incaseconfiguration.isModified() || masterTabConfigs.some( function( model ) {
                return model.isModified();
            } );
        }
    } );

    bindings.countryModeIncludesGermany = ko.computed( function() {
        return Y.doccirrus.commonutils.doesCountryModeIncludeGermany();
    } );
    bindings.countryModeIncludesSwitzerland = ko.computed( function() {
        return Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland();
    } );
    bindings.hasTiLicense = Y.doccirrus.auth.hasAdditionalService( 'inTi' );

    bindings.select2Role = {
        data: ko.computed( {
            read: function() {
                var
                    roles = ko.unwrap( incaseconfiguration.roles ) || [];
                roles = roles.map( function( roleValue ) {
                    return {id: roleValue, text: roleValue};
                } );
                return roles;
            },
            write: function( $event ) {
                if( Y.Object.owns( $event, 'added' ) ) {
                    incaseconfiguration.roles.push( $event.added.text );
                }
                if( Y.Object.owns( $event, 'removed' ) ) {
                    incaseconfiguration.roles.remove( $event.removed.text );
                }
            }
        } ),
        select2: {
            multiple: true,
            width: '100%',
            placeholder: i18n( 'role-schema.Role_T.value.i18n' ),
            query: function( query ) {
                Y.doccirrus.jsonrpc.api.role.get( {
                    query: {
                        value: {$regex: query.term, $options: 'i'}
                    }
                } ).done( function( response ) {
                        var
                            data = response.data;
                        query.callback( {
                            results: data.map( function( role ) {
                                if( !role ) {
                                    return role;
                                }
                                return {
                                    id: role.value,
                                    text: role.value
                                };
                            } )
                        } );
                    }
                ).fail( function() {
                    query.callback( {
                        results: []
                    } );
                } );
            },
            formatResult: function( obj ) {
                return obj.text;
            }

        }
    };

    bindings.select2kimTreatmentAutoCreationOnEDocLetterReceivedForLocations = {
        data: ko.computed( {
            read: function() {
                var
                    kimTreatmentAutoCreationOnEDocLetterReceivedForLocations = ko.unwrap( incaseconfiguration.kimTreatmentAutoCreationOnEDocLetterReceivedForLocations ) || [];
                var result = bindings.locationList().filter( function( location ) {
                    return kimTreatmentAutoCreationOnEDocLetterReceivedForLocations.indexOf( location._id ) !== -1;
                } ).map( function( location ) {
                    return {id: location._id, text: location.locname};
                } );
                return result;
            },
            write: function( $event ) {
                if( Y.Object.owns( $event, 'added' ) ) {
                    incaseconfiguration.kimTreatmentAutoCreationOnEDocLetterReceivedForLocations.push( $event.added.id );
                }
                if( Y.Object.owns( $event, 'removed' ) ) {
                    incaseconfiguration.kimTreatmentAutoCreationOnEDocLetterReceivedForLocations.remove( $event.removed.id );
                }
            }
        } ),
        select2: {
            multiple: true,
            width: '100%',
            placeholder: '',
            data: ko.computed( function() {
                var locationList = bindings.locationList();
                return {
                    results: locationList.map( function( location ) {
                        return {id: location._id, text: location.locname};
                    } )
                };
            } )
        }
    };

    bindings.select2kimTreatmentAutoCreationOnEDocLetterSentLocations = {
        data: ko.computed( {
            read: function() {
                var
                    kimTreatmentAutoCreationOnEDocLetterSentLocations = ko.unwrap( incaseconfiguration.kimTreatmentAutoCreationOnEDocLetterSentLocations ) || [];
                var result = bindings.locationList().filter( function( location ) {
                    return kimTreatmentAutoCreationOnEDocLetterSentLocations.indexOf( location._id ) !== -1;
                } ).map( function( location ) {
                    return {id: location._id, text: location.locname};
                } );
                return result;
            },
            write: function( $event ) {
                if( Y.Object.owns( $event, 'added' ) ) {
                    incaseconfiguration.kimTreatmentAutoCreationOnEDocLetterSentLocations.push( $event.added.id );
                }
                if( Y.Object.owns( $event, 'removed' ) ) {
                    incaseconfiguration.kimTreatmentAutoCreationOnEDocLetterSentLocations.remove( $event.removed.id );
                }
            }
        } ),
        select2: {
            multiple: true,
            width: '100%',
            placeholder: '',
            data: ko.computed( function() {
                var locationList = bindings.locationList();
                return {
                    results: locationList.map( function( location ) {
                        return {id: location._id, text: location.locname};
                    } )
                };
            } )
        }
    };

    //translations
    bindings.buttonSaveI18n = i18n( 'general.button.SAVE' );
    bindings.generalSettingsGroupGenSetI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.group.GEN_SET' );
    bindings.generalSettingsAutoEventsOnCardReadTitleI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.AUTO_EVENTS_ON_CARDREAD' );
    bindings.autoEventsOnCardReadIsAppointmentI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.AUTO_EVENTS_ON_CARDREAD_IS_APPOINTMENT' );
    bindings.autoEventsOnCardReadNoAppointmentI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.AUTO_EVENTS_ON_CARDREAD_NO_APPOINTMENT' );
    bindings.generalSettingsShowPersGroup9InfoI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.SHOW_PERSGROUP_9_INFO' );
    bindings.generalSettingsShowPrefillButtonI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.SHOW_PREFILL_BUTTON' );
    bindings.generalSettingsCanApplyActivitySequencePartlyI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.CAN_APPLY_ACTIVITY_SEQUENCE_PARTLY' );
    bindings.generalSettingsCatalogTextHiddenI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.CATALOG_TEXT_HIDDEN' );
    bindings.generalSettingsApplyPreparedCaseFolderI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.APPLY_PREPARED_CASEFOLDER' );
    bindings.generalSettingsAllowCustomCodeForI18n = i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.allowCustomCodeFor.i18n' );
    bindings.generalSettingsAllowCustomValueForI18n = i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.allowCustomValueFor.i18n' );
    bindings.generalSettingsRestrictSaveInHouseCatalogI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.RESTRICT_SAVE_IN_HOUSE_CATALOG' );
    bindings.generalSettingsPatientDataSetI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.group.PATIENT_DATA_SET' );
    bindings.generalSettingsPatientDataAboutI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.PATIENT_DATA_ABOUT' );
    bindings.generalSettingsPatientDataLocationMandatoryI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.LOCATION_MANDATORY' );
    bindings.generalSettingsPatientDataAddressManadatoryI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.ADDRESS_MANDATORY' );
    bindings.generalSettingsPatientDataPhoneNumberMandatoryI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.PHONE_NUMBER_MANDATORY' );
    bindings.generalSettingsPatientDataEmailMandatoryI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.EMAIL_MANDATORY' );
    bindings.generalSettingsGroupQuickPrintSetI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.group.QUICKPRINT_SET' );
    bindings.generalSettingsGroupQuickPrintAboutI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.QUICKPRINT_ABOUT' );
    bindings.generalSettingsGroupQuickPrintApproveI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.QUICKPRINT_APPROVE' );
    bindings.generalSettingsGroupQuickPrintBillI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.QUICKPRINT_BILL' );
    bindings.generalSettingsGroupQuickPrintNoteI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.QUICKPRINT_NOTE' );
    bindings.generalSettingsGroupQuickPrintPrescriptionI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.group.QUICKPRINT_PRESCRIPTION' );
    bindings.generalSettingsGroupQuickPrintPrescriptionAboutI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.QUICKPRINT_PRESCRIPTION_ABOUT' );
    bindings.generalSettingsGroupQuickPrintPrescriptionProcessI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.QUICKPRINT_PRESCRIPTION_PROCESS' );
    bindings.generalSettingsGroupQuickPrintPrescriptionNoteI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.QUICKPRINT_PRESCRIPTION_NOTE' );
    bindings.generalSettingsGroupReferralSetI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.group.REFERRAL_SET' );
    bindings.generalSettingsGroupSettingsForSignaturProcessI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.group.SettingsForSignaturProcess' );
    bindings.generalSettingsGroupReferralShowReferralIdInputI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.REFERRAL_SHOW_IDINPUT' );
    bindings.generalSettingsGroupSettingsForSignaturProcessInputI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.SettingsForSignaturProcessInput' );
    bindings.generalSettingsGroupAutoShareSetI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.group.AUTOSHARE_SET' );
    bindings.generalSettingsGroupMediport = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.group.MEDIPORT' );
    bindings.generalSettingsGroupAutoShareCheckBoxI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.AUTOSHARE' );
    bindings.generalSettingsGroupAutoShareTransferI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.TRANSFER' );
    bindings.generalSettingsGroupAutoShareThreeFactorI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.THREE_FACTOR' );
    bindings.generalSettingsGroupPatNrSetI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.group.PAT_NR_SET' );
    bindings.generalSettingsGroupPatNrStartI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.label.PAT_NR_START' );
    bindings.generalSettingsGroupDataTransferI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.group.DATA_TRANSFER' );
    bindings.generalSettingsGroupMedicationPlanI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.group.MEDICATIONPLAN' );
    bindings.generalSettingsGroupKbvUtility2I18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.group.KBVUTILITY2' );
    bindings.generalSettingsGroupHomeCatalogI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.group.HOME_CATALOG' );
    bindings.generalSettingsGroupFormLanguageI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.group.FORM_LANGUAGE' );
    bindings.generalSettingsGroupEnabelFormLanguageGenderI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.ENABLE_FORM_LANGUAGE_GENDER' );
    bindings.extendedSettingsFormValidationI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.group.FORM_VALIDATION' );
    bindings.electronicServicesI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.group.ELECTRONIC_SERVICES' );
    bindings.extendedSettingsValidatePreassistiveI18n = i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.validatePREASSISTIVE' );
    bindings.extendedSettingsValidatePubPrescrI18n = i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.validatePUBPRESCR' );
    bindings.extendedSettingsValidatePrivPrescrI18n = i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.validatePRIVPRESCR' );
    bindings.extendedSettingsValidatePrescRBTMI18n = i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.validatePRESCRBTM' );
    bindings.extendedSettingsValidatePrescRGI18n = i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.validatePRESCRG' );
    bindings.extendedSettingsValidatePrescRTI18n = i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.validatePRESCRT' );
    bindings.extendedSettingsValidateDocLetterI18n = i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.validateDOCLETTER' );
    bindings.extendedSettingsValidateQuotationI18n = i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.validateQUOTATION' );
    bindings.extendedSettingsValidatePubReceiptI18n = i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.validatePUBRECEIPT' );
    bindings.extendedSettingsValidateAbRequestI18n = i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.validateLABREQUEST' );
    bindings.extendedSettingsValidateAUI18n = i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.validateAU' );
    bindings.extendedSettingsValidateReferalI18n = i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.validateREFERRAL' );
    bindings.documentNewI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.DOCUMENT_NEW' );
    bindings.documentChangedI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.DOCUMENT_CHANGED' );
    bindings.documentDeletedI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.DOCUMENT_DELETED' );
    bindings.onPatientI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.label.TO_PATIENTS' );
    bindings.onPracticeI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.label.AT_PRACTICE' );
    bindings.taskReceiverInPracticeI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.label.TASK_RECEIVER' );
    bindings.notificationI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.label.NOTIFICATION' );
    bindings.extendedSettingsCoverCardI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.group.COVERCARD' );
    bindings.coverCardPassInputType = ko.observable( 'password' );
    bindings.showCoverCardPass = function() {
        bindings.coverCardPassInputType( 'text' );
    };
    bindings.hideCoverCardPass = function() {
        bindings.coverCardPassInputType( 'password' );
    };

    bindings.kbvUtility2ChapterList = [
        {
            val: '',
            i18n: NOT_PRE_ASSIGNMENT
        }
    ].concat( Y.doccirrus.schemas.activity.types.KBVUtility2Chapter_E.list.slice( 0 ) );

    bindings.saveConfig = function saveConfig() {
        var
            masterTabConfigs = peek( bindings.masterTabConfigs );
        //bindings.isLoading( true );
        bindings.buttonSaveEnabled( false );
        Y.doccirrus.jsonrpc.api.incaseconfiguration.saveConfig( {
            data: {
                inCaseConfig: incaseconfiguration,
                masterTabConfigs: masterTabConfigs.filter( function( model ) {
                    return model.isModified();
                } ).map( function( model ) {
                    return model.toJSON();
                } ),
                allowAdHoc: allowAdHoc
            }
        } ).done( function( response ) {
            var
                warnings = Y.doccirrus.errorTable.getWarningsFromResponse( response );

            if( warnings.length ) {
                Y.Array.invoke( warnings, 'display' );
            } else {
                bindings.buttonSaveEnabled( true );
            }

            //  reload the config here - we can't use response.data because changes to nextPatientNo will interfere
            //  with dirty state of model
            allowAdHoc = false;
            loadConfig();

        } ).fail( function( response ) {
            var
                errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );

            if( errors.length ) {
                Y.Array.invoke( errors, 'display' );
            }

            bindings.buttonSaveEnabled( true );
            bindings.isLoading( false );
        } );
    };

    bindings.incaseconfiguration.addDisposable( ko.computed( function() {
        incaseconfiguration.onPracticeDocumentNew();
        incaseconfiguration.onPracticeDocumentChanged();
        incaseconfiguration.onPracticeDocumentDeleted();
        incaseconfiguration.roles.validate();
    } ) );

    bindings.onTipLinkClick = function() {
        Y.doccirrus.DCWindow.notice( {
            type: 'info',
            window: {
                title: i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.validationModal.TITLE' ),
                width: Y.doccirrus.DCWindow.SIZE_LARGE,
                buttons: {
                    header: ['close'],
                    footer: [
                        Y.doccirrus.DCWindow.getButton( 'OK' )
                    ]
                }
            },
            icon: Y.doccirrus.DCWindow.ICON_LIST,
            message: i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.validationModal.BODY' ).replace( new RegExp( '\n', 'g' ), '<br/>' ) //eslint-disable-line no-control-regex
        } );
    };

    /**
     * default error notifier
     */
    function fail( response ) {
        var
            errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );

        if( errors.length ) {
            _.invoke( errors, 'display' );
        }
    }

    function loadConfig() {
        Promise.all( [
            Y.doccirrus.jsonrpc.api.incaseconfiguration.getConfigs(),
            Y.doccirrus.jsonrpc.api.practice.read()
        ] ).then( function( response ) {
            var
                inCaseConfig = response && response.length && response[0].data && response[0].data.inCaseConfig,
                masterTabConfigs = response && response.length && response[0].data && response[0].data.masterTabConfigs || [],
                practiceConfig = response && response[1] && response[1].data && response[1].data[0];

            if( !inCaseConfig.hasOwnProperty( 'autoshareCheck' ) ) {
                //  default to false, see MOJ-3359
                inCaseConfig.autoshareCheck = false;
            }

            incaseconfiguration.set( 'dataUnModified', inCaseConfig );
            incaseconfiguration.set( 'data', inCaseConfig );
            bindings.masterTabConfigs.removeAll();
            bindings.masterTabConfigs.push( KoViewModel.createViewModel( {
                NAME: 'MasterTabConfigModel', config: {
                    data: masterTabConfigs[0]
                }
            } ) );
            bindings.masterTabConfigs.push( KoViewModel.createViewModel( {
                NAME: 'MasterTabConfigModel', config: {
                    data: masterTabConfigs[1]
                }
            } ) );

            bindings.isLoading( false );
            bindings.buttonSaveEnabled( true );

            $( 'input[name="autoEventsOnCardReadNoAppointment"]' ).off( 'change' ).on( 'change', function() {
                if( this.checked ) {
                    if( !( practiceConfig && practiceConfig.allowPRCAdhoc ) ) {
                        Y.doccirrus.DCWindow.notice( {
                            type: 'info',
                            forceDefaultAction: true,
                            window: {
                                buttons: {
                                    footer: [
                                        Y.doccirrus.DCWindow.getButton( 'NO', {
                                            isDefault: false,
                                            action: function() {
                                                incaseconfiguration.autoEventsOnCardReadNoAppointment( false );
                                                this.close();
                                            }
                                        } ),
                                        Y.doccirrus.DCWindow.getButton( 'YES', {
                                            isDefault: true,
                                            action: function() {
                                                allowAdHoc = true;
                                                this.close();
                                            }
                                        } )
                                    ]
                                }
                            },
                            message: i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.label.ACTIVATE_ADHOC' )
                        } );
                    }
                } else {
                    allowAdHoc = false;
                }
            } );
        } ).catch( fail );
    }

    loadConfig();

    return {
        registerNode: function( node, _, options ) {
            bindings.locationList( options.locationList || [] );
            ko.applyBindings( bindings, node.getDOMNode() );
        },
        deregisterNode: function( node ) {
            ko.cleanNode( node.getDOMNode() );

            //  dispose all manual subscriptions
            subscriptions.forEach( function( sub ) {
                sub.dispose();
            } );
        }
    };
};
