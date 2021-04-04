/*global YUI, ko, moment, _ */

YUI.add( 'PatientGadgetTherapy', function( Y/*, NAME*/ ) {

    'use strict';

    /**
     * @module PatientGadgetTherapy
     */
    const
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,

        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,
        PatientGadgetConfigurableTableBase = KoViewModel.getConstructor( 'PatientGadgetConfigurableTableBase' ),
        ActivityModel = KoViewModel.getConstructor( 'ActivityModel' ),

        GADGET = Y.doccirrus.gadget,
        GADGET_LAYOUT_PATIENT = GADGET.layouts.patient,
        GADGET_UTILS = GADGET.utils,

        CONFIG_FIELDS = GADGET_LAYOUT_PATIENT.configFields.configurableTable.PatientGadgetTherapy;

    /**
     * @constructor
     * @class PatientGadgetTherapy
     * @extends PatientGadgetConfigurableTableBase
     */
    function PatientGadgetTherapy() {
        PatientGadgetTherapy.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientGadgetTherapy, PatientGadgetConfigurableTableBase, {
        /** @private */
        initializer: function() {
            let
                self = this;

            self.loadTableDataDeBounced = GADGET_UTILS.deBounceMethodCall( self.reloadTableData, 1200 );
            self.initPatientGadgetTherapy();
        },
        /** @private */
        destructor: function() {
            let
                self = this;

            self._destroyCommunication();
        },
        therapies: null,
        initPatientGadgetTherapy: function() {
            let
                self = this;

            self.therapies = ko.observableArray();

            self.therapieI18n = i18n( 'PatientGadget.PatientGadgetTherapy.i18n' );

            self.addDisposable( ko.computed( function() {

                self.table.setItems( unwrap( self.therapies ) );
            } ) );

            self.loadTableData();

            self._initCommunication();

        },
        _communicationActivitySubscription: null,
        _initCommunication: function() {
            let
                self = this;

            self._communicationActivitySubscription = Y.doccirrus.communication.subscribeCollection( {
                collection: 'activity',
                callback: function( data/*, meta */ ) {
                    const
                        binder = self.get( 'binder' ),
                        currentPatient = binder && peek( binder.currentPatient ),
                        patientId = currentPatient && peek( currentPatient._id );
                    if( data.some( function( item ) {
                            return 'THERAPY' === item.actType && item.patientId === patientId;
                        } ) ) {
                        self.loadTableDataDeBounced();
                    }
                }
            } );
        },
        _destroyCommunication: function() {
            let
                self = this;

            if( self._communicationActivitySubscription ) {
                self._communicationActivitySubscription.removeEventListener();
                self._communicationActivitySubscription = null;
            }
        },
        loadTableData: function() {
            const
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
                        actType: 'THERAPY',
                        patientId: peek( currentPatient._id ),
                        status: { $nin: [ 'CANCELLED', 'PREPARED' ] }
                    },
                    sort: { timestamp: -1 },
                    itemsPerPage: self.loadLimit
                } )
                .done( function( response ) {
                    if( self.get( 'destroyed' ) || !self.therapies ) {
                        return;
                    }
                    self.therapies( response.data || [] );
                } )
                .fail( function( error ) {
                    _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                } );

        },
        reloadTableData: function() {
            const
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = binder && peek( binder.currentPatient );

            if( !currentPatient || self.get( 'destroyed' ) ) {
                return;
            }
            Y.doccirrus.communication.apiCall( {
                method: 'activity.read',
                query: {
                    actType: 'THERAPY',
                    patientId: peek( currentPatient._id ),
                    status: { $nin: [ 'CANCELLED', 'PREPARED' ] }
                },
                options: {
                    sort: { timestamp: -1 },
                    itemsPerPage: self.loadLimit
                }
            }, function( err, response ) {
                if( err ) {
                    return _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                }
                if( !self.get( 'destroyed' ) && self.therapies ) {
                    self.therapies( response.data || [] );
                }
            } );
        }
    }, {
        NAME: 'PatientGadgetTherapy',
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
                        val: CONFIG_FIELDS.CONTENT,
                        i18n: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DESCRIPTION' ),
                        renderer: function( value, data ) {
                            return ActivityModel.renderContentAsHTML( data, false, false );
                        }
                    },
                    {
                        val: CONFIG_FIELDS.SUBTYPE,
                        i18n: i18n( 'InCaseMojit.casefile_browserJS.placeholder.SUBTYPE' ),
                        renderer: function( value ) {
                            return value || '';
                        }
                    }
                ]
            },
            defaultConfigurableTableColumns: {
                value: [
                    CONFIG_FIELDS.TIMESTAMP,
                    CONFIG_FIELDS.CONTENT,
                    CONFIG_FIELDS.SUBTYPE
                ]
            }
        }
    } );

    KoViewModel.registerConstructor( PatientGadgetTherapy );

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
