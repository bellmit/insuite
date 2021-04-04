/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, moment, _ */
YUI.add( 'PatientGadgetLastDLDiagnosis', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module PatientGadgetLastDLDiagnosis
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

        CONFIG_FIELDS = GADGET_LAYOUT_PATIENT.configFields.configurableTable.PatientGadgetLastDLDiagnosis,
        DATE_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' );

    /**
     * @constructor
     * @class PatientGadgetLastDLDiagnosis
     * @extends PatientGadgetConfigurableTableBase
     */
    function PatientGadgetLastDLDiagnosis() {
        PatientGadgetLastDLDiagnosis.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientGadgetLastDLDiagnosis, PatientGadgetConfigurableTableBase, {
        /** @private */
        initializer: function() {
            var
                self = this;

            self.loadTableDataDeBounced = GADGET_UTILS.deBounceMethodCall( self.reloadTableData, 1200 );
            self.initPatientGadgetLastDLDiagnosis();
        },
        /** @private */
        destructor: function() {
            var
                self = this;

            self._destroyCommunication();
        },
        lastHistories: null,
        initPatientGadgetLastDLDiagnosis: function() {
            var
                self = this;


            self.onlyLastDLDiagnosis = peek( self.onlyLastDLDiagnosis );
            self.activityTitle = i18n( 'PatientGadget.PatientGadgetLastDLDiagnosis.i18n' );
            self.onlyLastTitle = i18n( 'PatientGadget.PatientGadgetLastDLDiagnosis.onlyLastTitle' );
            self.titleText = ko.observable( self.activityTitle );
            self.titleUrl = ko.observable('#');
            self.activityContent = ko.observable( '' );

            self.lastDLDiagnosis = ko.observableArray();

            self.addDisposable( ko.computed( function() {

                self.table.setItems( unwrap( self.lastDLDiagnosis ) );
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
                    if( data.some( function(item){return 'DOCLETTERDIAGNOSIS' === item.actType && item.patientId === patientId;} ) ) {
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
                method: 'activity.read',
                query: {
                    actType: 'DOCLETTERDIAGNOSIS',
                    patientId: peek( currentPatient._id ),
                    status: { $nin: [ 'CANCELLED', 'PREPARED' ] }
                },
                options: {
                    sort: { timestamp: -1 },
                    itemsPerPage: self.onlyLastDLDiagnosis ? 1 : self.loadLimit
                },
                fields: { _id: 1, timestamp: 1, content: 1 }
            }, function( err, response ) {
                if( err ) {
                    return _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                }
                if( !self.get( 'destroyed' ) && self.lastDLDiagnosis ) {
                    if( response.data && response.data.length ){
                        self.titleUrl( 'incase#/activity/' + response.data[0]._id.toString() );
                        self.titleText( self.onlyLastDLDiagnosis ? self.onlyLastTitle + ' (' + moment( response.data[0].timestamp ).format( DATE_FORMAT ) + ')' : self.activityTitle );
                        self.activityContent( response.data[0].content || '' );
                    } else {
                        self.titleUrl( '#' );
                        self.titleText( self.activityTitle );
                        self.activityContent( '' );
                    }
                    self.lastDLDiagnosis( response.data || [] );
                }
            } );
        }
    }, {
        NAME: 'PatientGadgetLastDLDiagnosis',
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
                            return ActivityModel.renderContentAsHTML( data );
                        }
                    }
                ]
            },
            defaultConfigurableTableColumns: {
                value: [
                    CONFIG_FIELDS.TIMESTAMP,
                    CONFIG_FIELDS.CONTENT
                ]
            }


        }
    } );

    KoViewModel.registerConstructor( PatientGadgetLastDLDiagnosis );

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
