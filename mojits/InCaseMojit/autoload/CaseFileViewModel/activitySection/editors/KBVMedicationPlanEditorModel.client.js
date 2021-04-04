/**
 * User: do
 * Date: 22.01.20  08:09
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true */
/*global YUI, _, ko */

'use strict';

YUI.add( 'KBVMedicationPlanEditorModel', function( Y ) {
        /**
         * @module KBVMedicationPlanEditorModel
         */

        var
            unwrap = ko.unwrap,
            KoViewModel = Y.doccirrus.KoViewModel,
            SimpleActivityEditorModel = KoViewModel.getConstructor( 'SimpleActivityEditorModel' ),
            KBVMedicationPlanViewModel = KoViewModel.getConstructor( 'KBVMedicationPlanViewModel' );

        /**
         * @class KBVMedicationPlanEditorModel
         * @constructor
         * @extends SimpleActivityEditorModel
         */
        function KBVMedicationPlanEditorModel( config ) {
            KBVMedicationPlanEditorModel.superclass.constructor.call( this, config );
        }

        KBVMedicationPlanEditorModel.ATTRS = {};

        Y.extend( KBVMedicationPlanEditorModel, SimpleActivityEditorModel, {
                initializer: function KBVMedicationPlanEditorModel_initializer() {
                    var
                        self = this;
                    self.initKBVMedicationPlanEditorModel();
                },
                destructor: function KBVMedicationPlanEditorModel_destructor() {
                    /**
                     * When destroying the KBVMedicationPlanEditorModel
                     * the KBVMedicationPlanViewModel needs to be destroyed as well
                     */
                    if (this.medicationPlanViewModel && this.medicationPlanViewModel.destroy) {
                        this.medicationPlanViewModel.destroy();
                    }
                },
                initKBVMedicationPlanEditorModel: function KBVMedicationPlanEditorModel_initKBVMedicationPlanEditorModel() {
                    var
                        self = this,
                        binder = self.get( 'binder' ),
                        currentPatientObservable = ko.observable( unwrap( binder.currentPatient )),
                        currentActivityObservable = ko.observable( unwrap( binder.currentActivity )),
                        currentActivity = unwrap( binder.currentActivity ),
                        currentPatient = unwrap( self.get( 'currentPatient' ) ),
                        tenantSettings = binder.getInitialData( 'tenantSettings' ) || {},
                        locations = binder.getInitialData( 'location' ) || [],
                        employees = currentActivity._employeeList || [];

                    if( !currentActivity.isNew() && ['CREATED', 'VALID'].indexOf( currentActivity.status() ) &&
                        tenantSettings.useExternalPrescriptionSoftware ) {
                        self.locationAndEmployeeIdInitialized = false;
                        self.addDisposable( ko.computed( function() {
                            var locationId = unwrap( currentActivity.locationId );
                            var employeeId = unwrap( currentActivity.employeeId );
                            if( !self.locationAndEmployeeIdInitialized && locationId && employeeId ) {
                                self.locationAndEmployeeIdInitialized = true;
                                Y.doccirrus.incase.handlers.updateMedicationPlan( {
                                    user: binder.getInitialData( 'currentUser' ),
                                    patient: currentPatient.get( 'data' ),
                                    caseFolder: currentPatient.caseFolderCollection.getActiveTab(),
                                    medicationPlan: currentActivity,
                                    externalPrescriptionSoftwareUrl: tenantSettings.externalPrescriptionSoftwareUrl
                                } );
                            }
                        } ) );
                    }

                    self.medicationPlanViewModel = new KBVMedicationPlanViewModel( {
                        patientParameterVisible: true,
                        currentPatient: currentPatientObservable,
                        currentActivity: currentActivityObservable,
                        _locationList: locations,
                        _employeeList: employees,
                        data: unwrap( currentActivity ).toJSON()
                    } );

                    // write fields from side bar to VM
                    self.addDisposable( ko.computed( function() {
                        var employeeId = unwrap( currentActivity.employeeId ),
                            locationId = unwrap( currentActivity.locationId ),
                            timestamp = unwrap( currentActivity.timestamp );

                        self.medicationPlanViewModel.employeeId( employeeId );
                        self.medicationPlanViewModel.locationId( locationId );
                        self.medicationPlanViewModel.timestamp( timestamp );
                    } ) );

                    Y.doccirrus.inCaseUtils.injectPopulatedObjs.call( self, {
                        dataModel: currentActivity,
                        fields: ['activitiesObj']
                    } );

                    self.addDisposable( self.activitiesObj.subscribe( function( changes ) {
                        changes.forEach( function( item ) {
                            if( 'added' === item.status &&
                                item.value.actType === 'MEDICATION' &&
                                !self.medicationPlanViewModel.hasLinkedMedication( item.value._id ) ) {
                                self.medicationPlanViewModel.addMedicationEntryRow( _.assign( {
                                    type: 'MEDICATION',
                                    medicationRef: item.value._id
                                }, item.value ) );
                            } else {
                                self.medicationPlanViewModel.removeLinkedMedication( item.value._id );
                            }
                        } );
                    }, null, 'arrayChange' ) );

                    currentActivity.isValid = function() {
                        return self.medicationPlanViewModel.isValid();
                    };
                }
            }, {
                NAME: 'KBVMedicationPlanEditorModel'
            }
        );
        KoViewModel.registerConstructor( KBVMedicationPlanEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'SimpleActivityEditorModel',
            'KBVMedicationPlanModel',
            'activity-schema',
            'dccommonutils',
            'v_medicationItem-schema',
            'KBVMedicationPlanViewModel',
            'update-medicationplan-handler'
        ]
    }
);
