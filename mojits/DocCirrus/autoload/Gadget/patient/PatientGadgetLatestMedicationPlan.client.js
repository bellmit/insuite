/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, moment, _ */
YUI.add( 'PatientGadgetLatestMedicationPlan', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module PatientGadgetLatestMedicationPlan
     */
    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,

        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,
        PatientGadgetConfigurableTableBase = KoViewModel.getConstructor( 'PatientGadgetConfigurableTableBase' ),

        GADGET = Y.doccirrus.gadget,
        GADGET_LAYOUT_PATIENT = GADGET.layouts.patient,
        GADGET_UTILS = GADGET.utils,

        CONFIG_FIELDS = GADGET_LAYOUT_PATIENT.configFields.configurableTable.PatientGadgetLatestMedicationPlan;

    /**
     * @constructor
     * @class PatientGadgetLatestMedicationPlan
     * @extends PatientGadgetConfigurableTableBase
     */
    function PatientGadgetLatestMedicationPlan() {
        PatientGadgetLatestMedicationPlan.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientGadgetLatestMedicationPlan, PatientGadgetConfigurableTableBase, {
        /** @private */
        initializer: function() {
            var
                self = this;

            self.loadTableDataDeBounced = GADGET_UTILS.deBounceMethodCall( self.reloadTableData, 1200 );
            self.initPatientGadgetLatestMedicationPlan();
        },
        /** @private */
        destructor: function() {
            var
                self = this;

            self._destroyCommunication();
        },
        medicationPlans: null,
        initPatientGadgetLatestMedicationPlan: function() {
            var
                self = this;

            self.titleUrl = ko.observable('#');
            self.latestMedicationPlanI18n = i18n( 'PatientGadget.PatientGadgetLatestMedicationPlan.i18n' );

            self.medicationPlans = ko.observableArray();

            self.addDisposable( ko.computed( function() {

                self.table.setItems( unwrap( self.medicationPlans ) );
            } ) );

            self.reloadTableData();

            self._initCommunication();

        },
        _communicationActivitySubscription: null,
        _initCommunication: function() {
            var
                self = this;

            self._communicationActivitySubscription = Y.doccirrus.communication.subscribeCollection( {
                collection: 'activity',
                callback: function( data/*, meta */ ) {
                    var
                        binder = self.get( 'binder' ),
                        currentPatient = binder && peek( binder.currentPatient ),
                        patientId = currentPatient && peek( currentPatient._id );

                    if( data.some( function ( item ){
                        return [ 'MEDICATIONPLAN', 'KBVMEDICATIONPLAN' ].includes( item.actType ) && item.patientId === patientId;
                    } ) ) {
                        self.loadTableDataDeBounced();
                    }
                }
            } );
        },
        _destroyCommunication: function() {
            var
                self = this;

            if( self._communicationActivitySubscription ) {
                self._communicationActivitySubscription.removeEventListener();
                self._communicationActivitySubscription = null;
            }
        },
        reloadTableData: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = binder && peek( binder.currentPatient );

            if( !currentPatient || self.get( 'destroyed' ) ) {
                return;
            }
            Y.doccirrus.communication.apiCall( {
                method: 'activity.getLatestMedicationPlan',
                query: {
                    patientId: peek( currentPatient._id )
                },
                options: {
                    sort: {timestamp: -1},
                    itemsPerPage: self.loadLimit
                }
            }, function( err, response ) {
                if( err ) {
                    return _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                }
                if( !self.get( 'destroyed' ) && self.medicationPlans ) {
                    self.titleUrl( '#' );
                    (response.data || []).forEach( function( medication ){
                        if( medication.referencedBy && medication.referencedBy.length ){
                            self.titleUrl( 'incase#/activity/' + medication.referencedBy[0] );
                            return;
                        }
                    } );
                    self.medicationPlans( response.data );
                }
            } );
        }
    }, {
        NAME: 'PatientGadgetLatestMedicationPlan',
        ATTRS: {
            availableConfigurableTableColumns: {
                value: [
                    {
                        val: CONFIG_FIELDS.TIMESTAMP,
                        i18n: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DATE' ),
                        converter: function( value ) {
                            return moment( value ).format( i18n( 'general.TIMESTAMP_FORMAT' ) );
                        }
                    },
                    {
                        val: CONFIG_FIELDS.CODE_PZN,
                        i18n: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.CODE_PZN' ),
                        converter: function( value, data ) {
                            return value || data.phPZN || '';
                        }
                    },
                    {
                        val: CONFIG_FIELDS.ACTIVE_INGREDIENTS,
                        i18n: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.ACTIVE_INGREDIENTS' ),
                        converter: function( value ) {
                            return value && value[0] && value.join( '</br>' );
                        }
                    },
                    {
                        val: CONFIG_FIELDS.STRENGTH,
                        i18n: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.STRENGTH' ),
                        converter: function( value ) {
                            return value && value[0] && value.join( '</br>' );
                        }
                    },
                    {
                        val: CONFIG_FIELDS.NLABEL,
                        i18n: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.NLABEL' ),
                        converter: function( value ) {
                            return value;
                        }
                    },
                    {
                        val: CONFIG_FIELDS.FORM_OF_ADMINISTRATION,
                        i18n: i18n( 'InCaseMojit.casefile_detail.label.FORM_OF_ADMINISTRATION' ),
                        converter: function( value ) {
                            return value;
                        }
                    },
                    {
                        val: CONFIG_FIELDS.DOSIS,
                        i18n: i18n( 'InCaseMojit.casefile_detail.label.DOSIS' ),
                        converter: function( value ) {
                            return value;
                        }
                    },
                    {
                        val: CONFIG_FIELDS.PH_UNIT,
                        i18n: i18n( 'activity-schema.Medication_T.phUnit.i18n' ),
                        converter: function( value ) {
                            return value;
                        }
                    },
                    {
                        val: CONFIG_FIELDS.PH_NOTE,
                        i18n: i18n( 'activity-schema.Medication_T.phNote.i18n' ),
                        converter: function( value ) {
                            return value;
                        }
                    },
                    {
                        val: CONFIG_FIELDS.PH_REASON,
                        i18n: i18n( 'activity-schema.Medication_T.phReason.i18n' ),
                        converter: function( value ) {
                            return value;
                        }
                    }

                ]
            },
            defaultConfigurableTableColumns: {
                value: [
                    CONFIG_FIELDS.TIMESTAMP,
                    CONFIG_FIELDS.CODE_PZN,
                    CONFIG_FIELDS.NLABEL,
                    CONFIG_FIELDS.DOSIS
                ]
            }
        }
    } );

    KoViewModel.registerConstructor( PatientGadgetLatestMedicationPlan );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'PatientGadgetConfigurableTableBase',
        'GadgetLayouts',
        'GadgetUtils',
        'JsonRpcReflection-doccirrus',
        'JsonRpc',
        'dccommunication-client'
    ]
} );
