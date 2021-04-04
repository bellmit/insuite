/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'PatientSidebarViewModel', function( Y, NAME ) {
    'use strict';

    var
        i18n = Y.doccirrus.i18n,
        peek = ko.utils.peekObservable,
        unwrap = ko.unwrap,
        ignoreDependencies = ko.ignoreDependencies,
        KoViewModel = Y.doccirrus.KoViewModel,

        KoComponentManager = Y.doccirrus.KoUI.KoComponentManager;

    /**
     * @constructor
     * @class PatientSidebarViewModel
     */
    function PatientSidebarViewModel() {
        PatientSidebarViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientSidebarViewModel, KoViewModel.getDisposable(), {
        /** @protected */
        initializer: function() {
            var
                self = this;

            self.initPatientSidebarViewModel();

        },
        /** @protected */
        destructor: function() {
            var
                self = this;

            self.destroyPatientSidebarViewModel();
        },
        initPatientSidebarViewModel: function() {
            var
                self = this;

            self.initObservables();
            self.initPatientNav();
            self.initProfilePicture();
        },
        destroyPatientSidebarViewModel: function() {
            var
                self = this;

            self.destroyPatientNav();
        },
        mediaSetImgFromDefaultProfilePicture: null,
        mediaAddEditorProfilePicture: null,
        initProfilePicture: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = peek( binder.currentPatient ),
                imageSettings = {
                    ownerCollection: 'patient',
                    ownerId: self.addDisposable( ko.computed( {
                        read: function() {
                            var
                                currentPatientId = unwrap( currentPatient._id ),
                                randomTempId = unwrap( currentPatient._randomId );

                            if( currentPatientId ) {
                                return currentPatientId;
                            }
                            else {
                                return randomTempId;
                            }
                        }
                    } ) ),
                    label: 'logo',
                    widthPx: 133,
                    heightPx: 170,

                    thumbWidth: 133,
                    thumbHeight: 170,
                    single: true,
                    uploadCallback: function( error, idArray ) {
                        if( error ) {
                            return;
                        }
                        var
                            currentPatientId = peek( currentPatient._id );

                        if( !currentPatientId && idArray && idArray[0] ) {
                            Y.log( 'Added patient profile picture before save, will need to be claimed after save of profile from provisional owner ' + unwrap( currentPatient._randomId ), 'info', NAME );
                        }
                    }
                };

            self.mediaSetImgFromDefaultProfilePicture = imageSettings;
            self.mediaAddEditorProfilePicture = {settings: imageSettings};
        },
        _personDisplay: null,
        initObservables: function() {
            var
                self = this;

            self._personDisplay = ko.computed( self._personDisplayComputed, self ).extend( {rateLimit: 0} );
        },
        _personDisplayComputed: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = unwrap( binder.currentPatient );

            //  race due to rate limiting when disposing/navigating away from the tab
            if ( !currentPatient ) { return ''; }

            var
                title = unwrap( currentPatient.title ),
                nameaffix = unwrap( currentPatient.nameaffix ),
                fk3120 = unwrap( currentPatient.fk3120 ),
                lastname = unwrap( currentPatient.lastname ),
                firstname = unwrap( currentPatient.firstname );

            return Y.doccirrus.schemas.person.personDisplay( {
                title: title,
                nameaffix: nameaffix,
                fk3120: fk3120,
                lastname: lastname,
                firstname: firstname
            } );
        },
        /**
         * @property patientNav
         * @type {null|KoNav}
         */
        patientNav: null,
        /**
         * A helper for nav section
         * @property activePatientNavSection
         * @type {null|ko.computed} return either section name string or null
         */
        activePatientNavSection: null,
        initPatientNav: function() {
            var
                self = this,
                patientNav,
                binder = self.get( 'binder' ),
                currentPatient = peek( binder.currentPatient ),
                EditorModel = KoViewModel.getConstructor( 'EditorModel' ),
                navUrl = self.addDisposable( ko.computed( function() {
                    var
                        currentPatientId = unwrap( currentPatient._id );

                    return '#/patient/' + (currentPatientId ? currentPatientId : 'new') + '/section/';
                } ) );

            if( !self.patientNav ) {
                patientNav = self.patientNav = KoComponentManager.createComponent( {
                    componentType: 'KoNav',
                    componentConfig: {
                        tabs: false,
                        pills: true,
                        stacked: true,
                        items: [
                            {
                                name: 'maindata',
                                text: i18n( 'InCaseMojit.patient_detailJS.subnav.MAIN_DATA' ),
                                href: ko.computed( function() {
                                    return unwrap( navUrl ) + 'maindata';
                                } ),
                                hasDanger: ko.computed( EditorModel.getEditorModelHasErrorComputed( currentPatient, 'PatientSectionMainDataViewModel' ) )
                            },
                            {
                                name: 'insurance',
                                text: i18n( 'InCaseMojit.patient_detailJS.subnav.INSURANCE' ),
                                href: ko.computed( function() {
                                    return unwrap( navUrl ) + 'insurance';
                                } ),
                                hasDanger: ko.computed( EditorModel.getEditorModelHasErrorComputed( currentPatient, 'PatientSectionInsuranceViewModel' ) )
                            },
                            {
                                name: 'accountdata',
                                text: i18n( 'InCaseMojit.patient_detailJS.subnav.ACCOUNT_DATA' ),
                                href: ko.computed( function() {
                                    return unwrap( navUrl ) + 'accountdata';
                                } ),
                                hasDanger: ko.computed( EditorModel.getEditorModelHasErrorComputed( currentPatient, 'PatientSectionAccountDataViewModel' ) )
                            },
                            {
                                name: 'adddata',
                                text: i18n( 'InCaseMojit.patient_detailJS.subnav.ADD_DATA' ),
                                href: ko.computed( function() {
                                    return unwrap( navUrl ) + 'adddata';
                                } ),
                                hasDanger: ko.computed( EditorModel.getEditorModelHasErrorComputed( currentPatient, 'PatientSectionAddDataViewModel' ) )
                            },
                            {
                                name: 'documents',
                                text: i18n( 'InCaseMojit.patient_detailJS.subnav.DOCUMENTS' ),
                                href: ko.computed( function() {
                                    return unwrap( navUrl ) + 'documents';
                                } )
                            },
                            {
                                name: 'care',
                                text: i18n( 'InCaseMojit.patient_detailJS.subnav.CARE' ),
                                href: ko.computed( function() {
                                    return unwrap( navUrl ) + 'care';
                                } ),
                                hasDanger: ko.computed( EditorModel.getEditorModelHasErrorComputed( currentPatient, 'PatientSectionCareViewModel' ) )
                            },
                            {
                                name: 'portalauth',
                                text: i18n( 'InCaseMojit.patient_detailJS.subnav.PORTAL_RIGHTS' ),
                                href: ko.computed( function() {
                                    return unwrap( navUrl ) + 'portalauth';
                                } ),
                                hasDanger: ko.computed( EditorModel.getEditorModelHasErrorComputed( currentPatient, 'PatientSectionPortalAuthViewModel' ) )
                            }
                        ]
                    }
                } );

                /**
                 * Handle tab config
                 */
                self.addDisposable( ko.computed( function() {
                    var
                        items = unwrap( patientNav.items ),
                        route = unwrap( binder.route );

                    ignoreDependencies( function() {
                        var
                            sectionTabName = route.params.sectionTab,
                            patientTabName = route.params.patientTab,
                            currentTab = peek( patientNav.activeTab ),
                            sectionTab = null;

                        // no active tab for non corresponding context
                        if( 'patient_detail' !== patientTabName ) {
                            if( currentTab ) {
                                currentTab.active( false );
                            }
                            return;
                        }

                        // activate that one defined by route
                        if( sectionTabName ) {
                            sectionTab = patientNav.getItemByName( sectionTabName );
                        }
                        if( sectionTab && !peek( sectionTab.disabled ) ) {
                            patientNav.activateTab( sectionTab );
                        }
                        // or activate the first not disabled
                        else {
                            items.some( function( item ) {
                                if( !peek( item.disabled ) ) {
                                    patientNav.activateTab( item );
                                    return true;
                                }
                            } );
                        }
                    } );

                } ) );

                self.activePatientNavSection = ko.computed( function() {
                    var
                        activeTab = unwrap( patientNav.activeTab );

                    if( activeTab ) {
                        return peek( activeTab.name );
                    }
                    else {
                        return null;
                    }
                } );

            }
        },
        destroyPatientNav: function() {
            var
                self = this;

            if( self.patientNav ) {
                self.patientNav.dispose();
                self.patientNav = null;
            }
        }
    }, {
        NAME: 'PatientSidebarViewModel',
        ATTRS: {
            binder: {
                valueFn: function() {
                    return Y.doccirrus.utils.getMojitBinderByType( 'InCaseMojit' ) || Y.doccirrus.utils.getMojitBinderByType( 'MirrorPatientMojit' );
                }
            }
        }
    } );

    KoViewModel.registerConstructor( PatientSidebarViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'KoViewModel',
        'EditorModel'
    ]
} );
