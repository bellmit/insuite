/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, moment, _ */
/*jshint -W061 */
YUI.add( 'PatientGadgetMedication', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module PatientGadgetMedication
     */
    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,

        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,
        PatientGadgetConfigurableTableBase = KoViewModel.getConstructor( 'PatientGadgetConfigurableTableBase' ),
        ActivityModel = KoViewModel.getConstructor( 'ActivityModel' ),
        unfilteredMedications = ko.observableArray(),

        GADGET = Y.doccirrus.gadget,
        GADGET_LAYOUT_PATIENT = GADGET.layouts.patient,
        GADGET_UTILS = GADGET.utils,
        MEDICATIONS_KEY = 'phPZN',

        CONFIG_FIELDS = GADGET_LAYOUT_PATIENT.configFields.configurableTable.PatientGadgetMedication;

    /**
     * @constructor
     * @class PatientGadgetMedication
     * @extends PatientGadgetConfigurableTableBase
     */
    function PatientGadgetMedication() {
        PatientGadgetMedication.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientGadgetMedication, PatientGadgetConfigurableTableBase, {
        /** @private */
        initializer: function() {
            var
                self = this;

            self.loadTableDataDeBounced = GADGET_UTILS.deBounceMethodCall( self.reloadTableData, 1200 );
            self.initPatientGadgetMedication();
        },
        /** @private */
        destructor: function() {
            var
                self = this;

            self._destroyCommunication();
        },
        medications: null,
        initPatientGadgetMedication: function() {
            var
                self = this;

            self.medications = ko.observableArray();
            self.medicationsI18n = i18n( 'PatientGadget.PatientGadgetMedication.i18n' );

            self.addDisposable( ko.computed( function() {

                self.table.setItems( unwrap( self.medications ) );
            } ) );

            self.loadTableData();

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
                    if( data.some( function(item){return 'MEDICATION' === item.actType && item.patientId === patientId;} ) ) {
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
        loadTableData: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                showOnlyPrescribed = self.showOnlyPrescribed(),
                currentPatient = binder && peek( binder.currentPatient ),
                showOnlyContinuousMed = self.showOnlyContinuousMed(),
                query = {
                    actType: 'MEDICATION',
                    patientId: peek( currentPatient._id ),
                    status: {$nin: ['CANCELLED', 'PREPARED']},
                    noLongerValid: {$ne: true}
                };

            if( !currentPatient || self.get( 'destroyed' ) ) {
                return;
            }

            if( showOnlyPrescribed ) {
                query = {
                    isPrescribed: true,
                    actType: 'MEDICATION',
                    patientId: peek( currentPatient._id ),
                    status: {$nin: ['CANCELLED', 'PREPARED']},
                    noLongerValid: {$ne: true}
                };
            }

            if( showOnlyContinuousMed ){
                query.phContinuousMed = true;
            }

            Y.doccirrus.jsonrpc.api.activity
                .read( {
                    noBlocking: true,
                    query: query,
                    sort: {timestamp: -1},
                    itemsPerPage: self.loadLimit
                } )
                .done( function( response ) {
                    if( self.get( 'destroyed' ) || !self.medications ) {
                        return;
                    }
                    unfilteredMedications( response && response.data );
                    self.medications( Y.doccirrus.utils.getDistinct( (response && response.data) || [], MEDICATIONS_KEY ) );
                } )
                .fail( function( error ) {
                    _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                } );

        },
        reloadTableData: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                showOnlyPrescribed = self.showOnlyPrescribed(),
                currentPatient = binder && peek( binder.currentPatient ),
                showOnlyContinuousMed = self.showOnlyContinuousMed(),
                query = {
                    actType: 'MEDICATION',
                    patientId: peek( currentPatient._id ),
                    status: {$nin: ['CANCELLED', 'PREPARED']}
                };

            if( !currentPatient || self.get( 'destroyed' ) ) {
                return;
            }

            if( showOnlyPrescribed ) {
                query = {
                    isPrescribed: true,
                    actType: 'MEDICATION',
                    patientId: peek( currentPatient._id ),
                    status: {$nin: ['CANCELLED', 'PREPARED']}
                };
            }

            if( showOnlyContinuousMed ){
                query.phContinuousMed = true;
            }

            Y.doccirrus.communication.apiCall( {
                method: 'activity.read',
                query: query,
                options: {
                    sort: {timestamp: -1},
                    itemsPerPage: self.loadLimit
                }
            }, function( err, response ) {
                if( err ) {
                    return _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                }
                if( !self.get( 'destroyed' ) && self.medications ) {
                    unfilteredMedications( response && response.data );
                    self.medications( Y.doccirrus.utils.getDistinct( (response && response.data) || [], MEDICATIONS_KEY ) );
                }
            } );
        }
    }, {
        NAME: 'PatientGadgetMedication',
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
                        val: CONFIG_FIELDS.CODE,
                        i18n: i18n( 'InCaseMojit.casefile_browserJS.placeholder.CODE' ),
                        renderer: function( value, data ) {
                            return Y.doccirrus.schemas.activity.displayCode( data );
                        }
                    },
                    {
                        val: CONFIG_FIELDS.CONTENT,
                        i18n: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DESCRIPTION' ),
                        renderer: function( value, data ) {
                            return ActivityModel.renderContentAsHTML( data );
                        }
                    },
                    {
                        val: CONFIG_FIELDS.RANGE,
                        i18n: i18n( 'InCaseMojit.casefile_browserJS.placeholder.RANGE' ),
                        renderer: function( value, data ) {
                            if( data && data.isPrescribed ) {
                                return Y.doccirrus.schemas.activity.calculateMedicationRangeWithPrescribedMedications( {
                                    filter: data.phPZN,
                                    medications: ko.unwrap( unfilteredMedications )
                                } );
                            }
                            return '';
                        }
                    }
                ]
            },
            defaultConfigurableTableColumns: {
                value: [
                    CONFIG_FIELDS.TIMESTAMP,
                    CONFIG_FIELDS.CODE,
                    CONFIG_FIELDS.CONTENT,
                    CONFIG_FIELDS.RANGE
                ]
            }
        }
    } );

    KoViewModel.registerConstructor( PatientGadgetMedication );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'PatientGadgetConfigurableTableBase',
        'GadgetLayouts',
        'GadgetUtils',
        'ActivityModel',
        'JsonRpcReflection-doccirrus',
        'JsonRpc',
        'dccommunication-client'
    ]
} );
