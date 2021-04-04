/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, Promise, moment */
YUI.add( 'PatientDetailViewModel', function( Y, NAME ) {
    'use strict';

    var
        peek = ko.utils.peekObservable,
        unwrap = ko.unwrap,
        ignoreDependencies = ko.ignoreDependencies,
        i18n = Y.doccirrus.i18n,
        DCError = Y.doccirrus.commonerrors.DCError,

        KoViewModel = Y.doccirrus.KoViewModel,

        InCaseMojitViewModel = KoViewModel.getConstructor( 'InCaseMojitViewModel' ),
        PatientSidebarViewModel = KoViewModel.getConstructor( 'PatientSidebarViewModel' ),

        PatientSectionAddDataViewModel = KoViewModel.getConstructor( 'PatientSectionAddDataViewModel' ),
        PatientSectionDocumentsViewModel = KoViewModel.getConstructor( 'PatientSectionDocumentsViewModel' ),
        PatientSectionInsuranceViewModel = KoViewModel.getConstructor( 'PatientSectionInsuranceViewModel' ),
        PatientSectionAccountDataViewModel = KoViewModel.getConstructor( 'PatientSectionAccountDataViewModel' ),
        PatientSectionMainDataViewModel = KoViewModel.getConstructor( 'PatientSectionMainDataViewModel' ),
        PatientSectionPortalAuthViewModel = KoViewModel.getConstructor( 'PatientSectionPortalAuthViewModel' ),
        PatientSectionCareViewModel = KoViewModel.getConstructor( 'PatientSectionCareViewModel' ),
        DELETE_ENTRY = i18n( 'InCaseMojit.patient_detailJS.message.DELETE_ENTRY' ),
        CONFIRMATION = i18n( 'InCaseMojit.patient_detailJS.title.CONFIRMATION' ),
        NO_DELETE_ENTRIES = i18n( 'InCaseMojit.patient_detailJS.message.NO_DELETE_ENTRIES' ),
        NO_DELETE_APPOINTMENTS = i18n( 'InCaseMojit.patient_detailJS.message.NO_DELETE_APPOINTMENTS' ),
        NO_DELETE_ENTRIES_PLUS_APPOINTMENTS = i18n( 'InCaseMojit.patient_detailJS.message.NO_DELETE_ENTRIES_PLUS_APPOINTMENTS' ),
        PATIENT_PAID_TO_EXPIRED = i18n( 'InCaseMojit.PatientDetailViewModel.message.PATIENT_PAID_TO_EXPIRED' );

    /**
     * @constructor
     * @class PatientDetailViewModel
     * @extends InCaseMojitViewModel
     */
    function PatientDetailViewModel() {
        PatientDetailViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientDetailViewModel, InCaseMojitViewModel, {
        templateName: 'PatientDetailViewModel',
        /** @protected */
        initializer: function() {
            var
                self = this;

            self.initPatientDetailViewModel();
        },
        /** @protected */
        destructor: function() {
            var
                self = this;

            self.destroyPatientDetailViewModel();
        },
        initPatientDetailViewModel: function() {
            var
                binder = this.get( 'binder' ),
                isFrameView = unwrap(binder.isFrameView),
                self = this;

            self.buttonBackI18n = i18n( 'general.button.BACK' );
            self.buttonDeleteI18n = i18n( 'general.button.DELETE' );
            self.buttonSaveI18n = i18n( 'general.button.SAVE' );
            self.amtsConfirmDialogTextI18n = i18n( 'InCaseMojit.amts.confirm_dialog.TEXT' );

            self.initIsSavePatientEnabledComputed();
            self.initPatientSidebarViewModel();
            self.initPatientSectionViewModel();
            self.initComputeBeforeUnloadView();
            self.initReadOnly();
            self.checkPaidFreeStatus();

            if ( isFrameView ) {
                self.getPresetDataFromDataSol();
            }
        },
        destroyPatientDetailViewModel: function() {
            var
                self = this;

            self.destroyBeforeUnloadView();
            self.destroyPatientSectionViewModel();
            self.destroyPatientSidebarViewModel();
        },
        getPresetDataFromDataSol: function () {
            var
                binder = this.get( 'binder' ),
                PostMessageConnection = binder.PostMessageConnection;

            PostMessageConnection.postMessageToIframe({
                action: 'GET_PRESET_PATIENT_PARAMETERS',
                isInsuitePage: true,
                targetUrl: binder.iframeUrl
            });
        },
        patientSidebarViewModel: null,
        initPatientSidebarViewModel: function() {
            var
                self = this;

            if( !self.patientSidebarViewModel ) {
                self.patientSidebarViewModel = self.patientSidebarViewModel = new PatientSidebarViewModel();
            }
        },
        destroyPatientSidebarViewModel: function() {
            var
                self = this;

            if( self.patientSidebarViewModel ) {
                self.patientSidebarViewModel.destroy();
                self.patientSidebarViewModel = null;
            }
        },
        beforeUnloadView: null,
        initBeforeUnloadView: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                router = binder.get( 'router' ),
                currentPatient = peek( self.get( 'currentPatient' ) );

            if( self.beforeUnloadView ) {
                return;
            }

            self.beforeUnloadView = router.on( 'beforeUnloadView', function( yEvent, event ) {
                var
                    currentPatientId = currentPatient && peek( currentPatient._id ),
                    modifications,
                    isSubRoute,
                    isTypeRouter,
                    isTypeAppHref;

                // no modifications, no further handling
                if( !(currentPatient && currentPatient.isModified()) ) {
                    return;
                }

                isTypeRouter = (event.type === Y.doccirrus.DCRouter.beforeUnloadView.type.router);

                isSubRoute = ( isTypeRouter &&
                               0 === event.router.route.indexOf( '/patient/' + (currentPatientId ? currentPatientId : 'new') ) &&
                               (-1 < event.router.route.indexOf( 'tab/patient_detail' ) || -1 < event.router.route.indexOf( '/section/' ))
                );

                // modifications, but allowed routes
                if( isSubRoute ) {
                    return;
                }

                isTypeAppHref = (event.type === Y.doccirrus.DCRouter.beforeUnloadView.type.appHref);

                yEvent.halt( true );

                // prevent another dialog for "popstate" - events
                if( Y.doccirrus.DCWindowManager.getById( 'confirmModificationsDialog' ) ) {
                    return;
                }

                // no further handling for other kinds
                if( !(isTypeRouter || isTypeAppHref) ) {
                    return;
                }

                // handle modifications
                modifications = Y.doccirrus.utils.confirmModificationsDialog( {
                    saveButton: peek( self.isSavePatientEnabledComputed )
                } );

                modifications.on( 'discard', function() {

                    if( (currentPatient && currentPatient.isModified()) ) {
                        currentPatient.set( 'data', currentPatient.get( 'data' ) ); // reset to last data
                        currentPatient.setNotModified();
                    }
                    // for a discard of a new patient the detail view should be destroyed and the patient been unset
                    if( currentPatient && currentPatient.isNew() ) {
                        self.destroy();
                        binder.currentPatient( null );
                    }
                    if( isTypeRouter ) {
                        event.router.goRoute();
                    }
                    if( isTypeAppHref ) {
                        event.appHref.goHref();
                    }

                } );

                modifications.on( 'save', function() {

                    self.savePatient()
                        .then( function() {
                            if( isTypeRouter ) {
                                event.router.goRoute();
                            }
                            if( isTypeAppHref ) {
                                event.appHref.goHref();
                            }
                        } );

                } );

            } );
        },
        destroyBeforeUnloadView: function() {
            var
                self = this;

            if( !self.beforeUnloadView ) {
                return;
            }

            self.beforeUnloadView.detach();
            self.beforeUnloadView = null;
        },
        initComputeBeforeUnloadView: function() {
            var
                self = this;

            self.addDisposable( ko.computed( function() {
                var
                    isCurrentView = unwrap( self.isCurrentView );

                ignoreDependencies( function() {
                    if( isCurrentView ) {
                        self.initBeforeUnloadView();
                    }
                    else {
                        self.destroyBeforeUnloadView();
                    }
                } );
            } ) );
        },
        /**
         * Holds current PatientSectionViewModel
         * @property currentPatientSectionViewModel
         * @type {null|ko.computed}
         */
        currentPatientSectionViewModel: null,
        initPatientSectionViewModel: function() {
            var
                self = this,
                lastPatientNavSection = null;

            self.currentPatientSectionViewModel = ko.computed( function() {
                var
                    activePatientNavSection = unwrap( self.patientSidebarViewModel.activePatientNavSection );

                return ignoreDependencies( function() {
                    var
                        lastPatientSectionViewModel = peek( self.currentPatientSectionViewModel );

                    if( lastPatientNavSection === activePatientNavSection ) {
                        return lastPatientSectionViewModel;
                    }

                    if( lastPatientSectionViewModel ) {
                        lastPatientSectionViewModel.destroy();
                    }

                    lastPatientNavSection = activePatientNavSection;

                    switch( activePatientNavSection ) {
                        case 'maindata':
                            return new PatientSectionMainDataViewModel( { PatientDetailViewModel: self } );
                        case 'insurance':
                            return new PatientSectionInsuranceViewModel( { PatientDetailViewModel: self } );
                        case 'accountdata':
                            return new PatientSectionAccountDataViewModel( { PatientDetailViewModel: self } );
                        case 'adddata':
                            return new PatientSectionAddDataViewModel( { PatientDetailViewModel: self } );
                        case 'documents':
                            return new PatientSectionDocumentsViewModel( { PatientDetailViewModel: self } );
                        case 'care':
                            return new PatientSectionCareViewModel( { PatientDetailViewModel: self } );
                        case 'portalauth':
                            return new PatientSectionPortalAuthViewModel( { PatientDetailViewModel: self } );
                    }

                    return null;
                } );

            } );
        },
        destroyPatientSectionViewModel: function() {
            var
                self = this,
                currentPatientSectionViewModel;

            if( self.currentPatientSectionViewModel ) {
                self.currentPatientSectionViewModel.dispose();
                currentPatientSectionViewModel = peek( self.currentPatientSectionViewModel );
                if( currentPatientSectionViewModel ) {
                    currentPatientSectionViewModel.destroy();
                }
                self.currentPatientSectionViewModel = null;
            }
        },
        isSavePatientEnabledComputed: null,
        initIsSavePatientEnabledComputed: function() {
            var
                self = this,
                currentPatient = peek( self.get( 'currentPatient' ) );

            self.isInSave = ko.observable( false );

            self.isSavePatientEnabledComputed = ko.computed( function() {
                var
                    valid = currentPatient._isValid(),
                    isInSave = self.isInSave(),
                    patientNoHasError = currentPatient.patientNo.hasError(),
                    patientCareHasError = currentPatient.partnerIds.hasError(),
                    billingAddressHasError = currentPatient.addresses().some( function( address ) {
                        return ( 'BILLING' === address.kind() && 'organization' === address.payerType() && !address.receiver() ) ||
                               ( 'BILLING' === address.kind() && 'person' === address.payerType() && ( !address.firstname() || !address.lastname() ) );

                    });

                if( patientNoHasError || patientCareHasError || billingAddressHasError || isInSave ) {
                    return false;
                }

                return valid && currentPatient.isModified();
            } );
        },
        initReadOnly: function() {
            var self = this;
            self.disableButtons = ko.computed( function() {
                var currentPatient = unwrap( self.get( 'currentPatient' ) );
                if ( !currentPatient ) { return true; }
                return unwrap( currentPatient._isModelReadOnly );
            } );
        },
        isDeletePatientVisible: function() {
            return Y.doccirrus.auth.isAdmin();
        },
        back: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                isFrameView = unwrap(binder.isFrameView),
                PostMessageConnection = binder.PostMessageConnection,
                currentPatient = peek( binder.currentPatient );

            if ( isFrameView ) {
                PostMessageConnection.postMessageToIframe({
                    action: 'CLOSE_MODAL',
                    isInsuitePage: true,
                    targetUrl: binder.iframeUrl,
                    payload: {}
                });
            } else if( currentPatient.isNew() ) {
                binder.navigateToPatientBrowser();
            }
            else {
                binder.navigateToCaseFileBrowser();
            }

        },
        deletePatient: function() {
            var self = this,
                binder = self.get( 'binder' ),
                currentPatient = binder.currentPatient(),
                isFrameView = unwrap(binder.isFrameView),
                PostMessageConnection = binder.PostMessageConnection,
                patientId = unwrap( currentPatient._id );

            if( !patientId ) {
                Y.doccirrus.DCWindow.confirm( {
                    title: 'Bestätigung',
                    message: 'Sind Sie sicher?',
                    callback: function( dialog ) {
                        if( dialog.success ) {
                            // we are editing a new patient, so just abort and unset "currentPatient"
                            self.destroy();
                            binder.currentPatient( null );
                            if ( isFrameView ) {
                                PostMessageConnection.postMessageToIframe({
                                    action: 'CLOSE_MODAL',
                                    isInsuitePage: true,
                                    targetUrl: binder.iframeUrl,
                                    payload: {}
                                });
                            } else {
                                binder.navigateToPatientBrowser();
                            }
                        }
                    }
                } );
                return;
            }

            Promise.resolve( Y.doccirrus.jsonrpc.api.patient.deleteCheck( {
                id: patientId
            } ) ).then( function( response ) {
                var
                    data = response && response.data;

                switch( data.status ) {
                    case 0: // ok
                        return new Promise( function( resolve, reject ) {
                            Y.doccirrus.utils.confirmDialog( true, DELETE_ENTRY, CONFIRMATION, function( del ) {
                                if( del ) {
                                    currentPatient.delete().then( resolve ).catch( reject );
                                } else {
                                    reject( new DCError( null, { message: NO_DELETE_ENTRIES } ) );
                                }
                            } );
                        } );
                    case 1: // activity
                        throw new DCError( null, { message: NO_DELETE_ENTRIES } );
                    case 2: // event
                        throw new DCError( null, { message: NO_DELETE_APPOINTMENTS } );
                    case 3: // both
                        throw new DCError( null, { message: NO_DELETE_ENTRIES_PLUS_APPOINTMENTS } );
                }
                return Promise.resolve();

            } ).then( function() {
                self.destroy();
                binder.currentPatient( null );
                binder.navigateToPatientBrowser();
            } ).catch( function( err ) {
                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
            } );
        },
        savePatient: function( options ) {
            var
                self = this,
                currentPatient = peek( this.get( 'currentPatient' ) ),
                patientId = unwrap( currentPatient._id ),
                imageSettingsOwnerId = unwrap( currentPatient._randomId ),
                additionalContacts = currentPatient.additionalContacts(),
                cleanAdditionalContacts = [],
                i;

            //  Disable the save button to prevent double creation of new patients on double-click
            self.isInSave( true );

            //  remove invalid additionalContacts before saving, MOJ-9483
            for ( i = 0; i < additionalContacts.length; i++ ) {
                if ( additionalContacts[i] && '' !== additionalContacts[i] ) {
                    cleanAdditionalContacts.push( additionalContacts[i] );
                }
            }

            currentPatient.additionalContacts( cleanAdditionalContacts );

            return currentPatient.save( options ).then( function() {
                var
                    currentPatientId = peek( currentPatient._id );

                function setMediaId( newId, callback ) {

                    function onChownTempMedia( err ) {
                        if( err ) {
                            Y.log( 'Could not move patient profile picture to new id: ' + newId, 'warn', NAME );
                            callback( err );
                            return;
                        }
                        callback( null );
                    }

                    Y.doccirrus.media.chownAllMR( '', 'patient', imageSettingsOwnerId, 'patient', currentPatientId, onChownTempMedia );
                }

                if( !patientId || patientId !== currentPatientId ) {
                    return Promise.promisify( setMediaId )( currentPatientId );
                } else {
                    return null;
                }

            } ).then( function() {
                Y.doccirrus.cardreader.deleteCardData();
                self.isInSave( false );
                return null;
            } ).catch( function( err ) {
                self.isInSave( false );
                if( err && -999 === err.code ) {
                    throw err;
                }
                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                return Promise.reject( err );
            } );

        },
        savePatientClickHandler: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = unwrap( self.get( 'currentPatient' ) ),
                patientSectionCareViewModel = KoViewModel.getViewModel( 'PatientSectionCareViewModel' );

            function saveClickHandler_savePatient() {
                self.savePatient( {
                    telekardioSerialEditedOption: patientSectionCareViewModel && patientSectionCareViewModel.telekardioSerialEditedOption,
                    telekardioSerialOldSerial: patientSectionCareViewModel && patientSectionCareViewModel.telekardioSerialOldSerial
                } ).then( function() {
                    var
                        isFrameView = unwrap(binder.isFrameView),
                        PostMessageConnection = binder.PostMessageConnection,
                        isChanged;

                    if (isFrameView) {
                        PostMessageConnection.postMessageToIframe({
                            action: 'DATA_TO_SAVE',
                            isInsuitePage: true,
                            targetUrl: binder.iframeUrl,
                            payload: {
                                patientId: peek( currentPatient._id )
                            }
                        });
                    } else {
                        isChanged = (patientSectionCareViewModel && patientSectionCareViewModel.isChanged) || ko.observable( false );

                        binder.navigateToCaseFileBrowser( { refreshCaseFolder: isChanged() } );
                    }
                } );
            }

            if ( self.isInSave() ) { return; }

            if( patientSectionCareViewModel && patientSectionCareViewModel.isAmtsChanged() ) {
                Y.doccirrus.DCWindow.confirm( {
                    type:  'warn',
                    title: i18n( 'DCWindow.notice.title.warn' ),
                    message: self.amtsConfirmDialogTextI18n,
                    buttonOkConfig: {
                        disabled: false
                    },
                    callback: function( dialog ) {
                        if( dialog.success ) {
                            saveClickHandler_savePatient();
                        }
                    },
                    window: {
                        width: 'medium'
                    }
                } );
            } else {
                saveClickHandler_savePatient();
            }
        },
        checkPaidFreeStatus: function() {
            var self = this;
            self.addDisposable( ko.computed( function() {
                var currentPatient = unwrap( self.get( 'currentPatient' ) ),
                    insuranceStatus = currentPatient && peek( currentPatient.insuranceStatus ),
                    publicInsurance,
                    paidFree,
                    paidFreeTo;

                (insuranceStatus || []).some( function( insurance ) {
                    if( 'PUBLIC' === peek( insurance.type ) ) {
                        publicInsurance = insurance;
                        paidFree = currentPatient && peek( insurance.paidFree );
                        paidFreeTo = currentPatient && peek( insurance.paidFreeTo );
                        return true;
                    }
                } );

                if( paidFree && paidFreeTo && moment( paidFreeTo ).isBefore( moment() ) ) {
                    Y.doccirrus.DCWindow.confirm( {
                        message: PATIENT_PAID_TO_EXPIRED,
                        callback: function( dialog ) {
                            if( dialog.success ) {
                                publicInsurance.paidFree( false );
                            }
                        }
                    } );
                }
            } ) );
        }
    }, {
        NAME: 'PatientDetailViewModel',
        ATTRS: {
            currentPatient: {
                valueFn: function() {
                    return this.get( 'binder' ).currentPatient;
                },
                lazyAdd: false
            }
        }
    } );

    KoViewModel.registerConstructor( PatientDetailViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'KoViewModel',
        'InCaseMojitViewModel',
        'PatientSidebarViewModel',

        'PatientSectionAddDataViewModel',
        'PatientSectionDocumentsViewModel',
        'PatientSectionInsuranceViewModel',
        'PatientSectionAccountDataViewModel',
        'PatientSectionMainDataViewModel',
        'PatientSectionCareViewModel',
        'PatientSectionPortalAuthViewModel',
        'dcmedia',
        'cardreader',
        'dcerrortable',
        'dccommonerrors'
    ]
} );
