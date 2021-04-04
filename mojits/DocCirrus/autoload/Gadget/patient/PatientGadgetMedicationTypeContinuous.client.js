/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, moment, _ */
YUI.add( 'PatientGadgetMedicationTypeContinuous', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module PatientGadgetMedicationTypeContinuous
     */
    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,

        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,
        PatientGadgetConfigurableTableBase = KoViewModel.getConstructor( 'PatientGadgetConfigurableTableBase' ),
        ActivityModel = KoViewModel.getConstructor( 'ActivityModel' ),

        GADGET = Y.doccirrus.gadget,
        GADGET_LAYOUT_PATIENT = GADGET.layouts.patient,
        GADGET_UTILS = GADGET.utils,

        CONFIG_FIELDS = GADGET_LAYOUT_PATIENT.configFields.configurableTable.PatientGadgetMedicationTypeContinuous;

    /**
     div(data-bind="text: diagnosisTypeContinuousText")
     div(data-bind="foreach: medicationTypeContinuous")
     div(data-bind="text: $parent.medicationTypeContinuousText( $data )")
     */

    /**
     * @constructor
     * @class PatientGadgetMedicationTypeContinuous
     * @extends PatientGadgetConfigurableTableBase
     */
    function PatientGadgetMedicationTypeContinuous() {
        PatientGadgetMedicationTypeContinuous.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientGadgetMedicationTypeContinuous, PatientGadgetConfigurableTableBase, {
        /** @private */
        initializer: function() {
            var
                self = this;

            self.loadTableDataDeBounced = GADGET_UTILS.deBounceMethodCall( self.reloadTableData, 1200 );
            self.initPatientGadgetMedicationTypeContinuous();
        },
        /** @private */
        destructor: function() {
            var
                self = this;

            self._destroyCommunication();
        },
        medicationTypeContinuous: null,
        initPatientGadgetMedicationTypeContinuous: function() {
            var
                self = this;

            self.medicationTypeContinuousI18n = i18n( 'PatientGadget.PatientGadgetMedicationTypeContinuous.i18n' );

            self.medicationTypeContinuous = ko.observableArray();

            self.addDisposable( ko.computed( function() {

                self.table.setItems( unwrap( self.medicationTypeContinuous ) );
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
                callback: function( data/*, meta */) {
                    var
                        binder = self.get( 'binder' ),
                        currentPatient = binder && peek( binder.currentPatient ),
                        patientId = currentPatient && peek( currentPatient._id );
                    if( data.some( function( item ) {
                        return 'MEDICATION' === item.actType && item.phContinuousMed && item.patientId === patientId;
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
        loadTableData: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = binder && peek( binder.currentPatient );

            if( !currentPatient || self.get( 'destroyed' ) ) {
                return;
            }

            Y.doccirrus.jsonrpc.api.activity
                .read( {
                    noBlocking: true,
                    query: {
                        actType: 'MEDICATION',
                        patientId: peek( currentPatient._id ),
                        status: {$nin: ['CANCELLED', 'PREPARED']},
                        phContinuousMed: true,
                        $or: [
                            { noLongerValid: { $exists: false } },
                            { noLongerValid: false }
                        ]
                    },
                    sort: {timestamp: -1},
                    itemsPerPage: self.loadLimit
                } )
                .done( function( response ) {
                    if( self.get( 'destroyed' ) || !self.medicationTypeContinuous ) {
                        return;
                    }
                    self.medicationTypeContinuous( Y.doccirrus.utils.getDistinct( response.data || [], 'code' ) );
                } )
                .fail( function( error ) {
                    _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                } );

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
                method: 'activity.read',
                query: {
                    actType: 'MEDICATION',
                    patientId: peek( currentPatient._id ),
                    status: {$nin: ['CANCELLED', 'PREPARED']},
                    phContinuousMed: true,
                    $or: [
                        { noLongerValid: { $exists: false } },
                        { noLongerValid: false }
                    ]
                },
                options: {
                    sort: {timestamp: -1},
                    itemsPerPage: self.loadLimit
                }
            }, function( err, response ) {
                if( err ) {
                    return _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                }
                if( !self.get( 'destroyed' ) && self.medicationTypeContinuous ) {
                    self.medicationTypeContinuous( Y.doccirrus.utils.getDistinct( response.data || [], 'code' ) );
                }
            } );
        }
    }, {
        NAME: 'PatientGadgetMedicationTypeContinuous',
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
                    }
                ]
            },
            defaultConfigurableTableColumns: {
                value: [
                    CONFIG_FIELDS.TIMESTAMP,
                    CONFIG_FIELDS.CODE,
                    CONFIG_FIELDS.CONTENT
                ]
            }
        }
    } );

    KoViewModel.registerConstructor( PatientGadgetMedicationTypeContinuous );

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
