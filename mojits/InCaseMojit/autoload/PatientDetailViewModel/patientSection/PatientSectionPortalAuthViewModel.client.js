/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, moment */
YUI.add( 'PatientSectionPortalAuthViewModel', function( Y/*, NAME*/ ) {
    'use strict';

    var
    // unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
    // ignoreDependencies = ko.ignoreDependencies,

        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,
        PatientSectionViewModel = KoViewModel.getConstructor( 'PatientSectionViewModel' );

    /**
     * @constructor
     * @class PatientSectionPortalAuthViewModel
     * @extends PatientSectionViewModel
     */
    function PatientSectionPortalAuthViewModel() {
        PatientSectionPortalAuthViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientSectionPortalAuthViewModel, PatientSectionViewModel, {
        templateName: 'PatientSectionPortalAuthViewModel',
        /** @protected */
        initializer: function() {
            var
                self = this;

            self.initPatientSectionPortalAuthViewModel();
        },
        /** @protected */
        destructor: function() {
        },
        isVisiblePortal: null,
        isVisiblePortalMessages: null,
        initPatientSectionPortalAuthViewModel: function() {
            var
                self = this,
                currentPatient = peek( self.get( 'currentPatient' ) );


            self.mixWhiteListFromDataModel( currentPatient );
            self.initSubModels( currentPatient );

            self.isVisiblePortalMessages = ko.observableArray();
            self.isVisiblePortal = ko.computed( function() {
                var
                    messages = [],
                    patientExists = !currentPatient.isNew(),
                    patientEmail = currentPatient._email(),
                    patientEmailExists = patientEmail && ko.unwrap( patientEmail.value );

                if( !patientExists ) {
                    messages.push( i18n( 'InCaseMojit.patient_detailJS.message.SAVE_PATPORTAL' ) );
                }
                if( !patientEmailExists ) {
                    messages.push( i18n( 'InCaseMojit.patient_detailJS.message.EMAIL_PATPORTAL' ) );
                }

                self.isVisiblePortalMessages( messages );

                return patientExists && patientEmailExists;
            } );
            self.initRegisteredDevicesTable();
            self.initDeleteBtn();

            self.portalRightsI18n = i18n( 'InCaseMojit.patient_detail.title.PORTAL_RIGHTS' );
            self.groupAppoinmentsI18n = i18n( 'InCaseMojit.patient_detail.group.APPOINTMENTS' );
            self.groupDocumentsI18n = i18n( 'InCaseMojit.patient_detail.group.DOCUMENTS' );
            self.registeredDevicesI18n = i18n('InCaseMojit.patient_detail.title.REGISTERED_DEVICES');
        },
        /**
         * Initializes delete device key button
         */
        initDeleteBtn: function PatientSectionPortalAuthViewModel_initDeleteBtn(){
            var
                self = this,
                currentPatient = peek( self.get( 'currentPatient' ) );
            self.deleteDeviceKeys = Y.doccirrus.KoUI.KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'BTN_DELETE_DEVICE_KEYS',
                    text: i18n( 'general.button.DELETE' ),
                    disabled: ko.computed( function() {
                        var
                            componentColumnCheckbox = self.registeredDevicesTable.getComponentColumnCheckbox(),
                            checked = componentColumnCheckbox.checked();
                        return !Boolean( checked && checked.length ) || self.accessPRC.readOnly();
                    } ),
                    click: function() {
                        var
                            componentColumnCheckbox = self.registeredDevicesTable.getComponentColumnCheckbox(),
                            checked = componentColumnCheckbox.checked();
                        if( checked && checked.length ) {
                            Y.doccirrus.DCWindow.notice( {
                                type: 'info',
                                message: i18n('InCaseMojit.patient_detail.text.DELETE_DEVICE_KEY'),
                                window: {
                                    width: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                                    buttons: {
                                        header: [ 'close' ],
                                        footer: [
                                            Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                            Y.doccirrus.DCWindow.getButton( 'OK', {
                                                isDefault: true,
                                                action: function() {
                                                    var
                                                        deviceIds = checked.map( function( deviuce ) {
                                                            return peek( deviuce._id );
                                                        } );
                                                    currentPatient.deleteDeviceKeyByIds( deviceIds );
                                                    this.close();
                                                }
                                            } )
                                        ]
                                    }
                                }
                            } );
                        }
                    }
                }
            } );

        },
        initRegisteredDevicesTable: function PatientSectionPortalAuthViewModel_initRegisteredDevicesTable(){
            var
                self = this,
                currentPatient = peek( self.get( 'currentPatient' ) );

            self.registeredDevicesTable = Y.doccirrus.KoUI.KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    noPdfExport: true,
                    stateId: 'InCaseMojit-PatientSectionPortalAuthViewModel-registeredDevicesTable',
                    states: ['limit' ],
                    fillRowsToLimit: false,
                    limit: 10,
                    limitList: [10, 20, 30],
                    /**
                     * data sub model used because of KoTable tries to call toJSON.
                     * editor can have sub editor model, but sub editor model does not have all methods
                     *  which data sub model has.
                     */
                    data: currentPatient.devices,
                    columns: [
                        {
                            componentType: 'KoTableColumnCheckbox',
                            forPropertyName: 'checked',
                            label: ''
                        },
                        {
                            forPropertyName: 'browser',
                            label: i18n( 'patient-schema.Devices_T.browser.i18n' ),
                            title: i18n( 'patient-schema.Devices_T.browser.i18n' ),
                            width: '10%'
                        },
                        {
                            forPropertyName: 'key',
                            label: i18n( 'patient-schema.Devices_T.key.i18n' ),
                            title: i18n( 'patient-schema.Devices_T.key.i18n' ),
                            width: '70%'
                        },
                        {
                            forPropertyName: 'timestamp',
                            label: i18n( 'patient-schema.Devices_T.timestamp.i18n' ),
                            title: i18n( 'patient-schema.Devices_T.timestamp.i18n' ),
                            width: '20%',
                            renderer: function( meta ) {
                                var
                                    value = peek(meta.value);
                                if(!value){
                                    return '';
                                }
                                return moment( value ).format( i18n( 'general.TIMESTAMP_FORMAT_LONG' ) );
                            }
                        }
                    ],
                    responsive: false
                }
            } );
        }
    }, {
        NAME: 'PatientSectionPortalAuthViewModel',
        ATTRS: {
            whiteList: {
                value: [
                    'createPlanned',
                    'accessPRC'
                ],
                lazyAdd: false
            }
        }
    } );

    KoViewModel.registerConstructor( PatientSectionPortalAuthViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'PatientSectionViewModel',
        'KoUI-all'
    ]
} );
