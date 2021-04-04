/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, _, moment */

'use strict';

YUI.add( 'PatientGadgetLatestLabData', function( Y/*, NAME*/ ) {

    /**
     * @module PatientGadgetLatestLabData
     */
    var
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable,

            i18n = Y.doccirrus.i18n,
            KoViewModel = Y.doccirrus.KoViewModel,
            PatientGadgetConfigurableTableBase = KoViewModel.getConstructor( 'PatientGadgetConfigurableTableBase' ),

            GADGET = Y.doccirrus.gadget,
            GADGET_LAYOUT_PATIENT = GADGET.layouts.patient,

            CONFIG_FIELDS = GADGET_LAYOUT_PATIENT.configFields.configurableTable.PatientGadgetLatestLabData;

    /**
     * @constructor
     * @class PatientGadgetLatestLabData
     * @extends PatientGadgetConfigurableTableBase
     */
    function PatientGadgetLatestLabData() {
        PatientGadgetLatestLabData.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientGadgetLatestLabData, PatientGadgetConfigurableTableBase, {
        /** @private */
        initializer: function() {
            var
                    self = this;
            self.initPatientGadgetLatestLabData();
        },
        /** @private */
        destructor: function() {
            var self = this;

            if( self.latestLabDataChangedListener ) {
                self.latestLabDataChangedListener.removeEventListener();
                self.latestLabDataChangedListener = null;
            }
        },
        initPatientGadgetLatestLabData: function() {
            var
                    self = this,
                    binder = self.get( 'binder' ),
                    currentPatient = peek( binder && peek( binder.currentPatient ) );

            self.labDataI18n = i18n( 'PatientGadget.PatientGadgetLatestLabData.i18n' );

            self.titleUrl = ko.observable('#');

            Y.doccirrus.jsonrpc.api.activity.read({
                noBlocking: true,
                query: {
                    actType: 'LABDATA',
                    patientId: peek( currentPatient._id() ),
                    status: { $ne: 'PREPARED' }
                },
                options: {
                    sort: { timestamp: -1 },
                    limit: 1
                }
            }).then(function (response) {
                var activityId = response && response.data && response.data.length > 0 && response.data[0]._id;

                if (activityId) {
                    self.titleUrl('/incase#/activity/' + activityId + '/section/tableform');
                }
            });

            self.latestLabDataChangedListener = Y.doccirrus.communication.on( {
                event: 'activity.latestLabDataRefresh',
                done: function handleAction( response ) {
                    if( !response || !response.data || !response.data[0] || ( currentPatient._id() !== response.data[0] ) ) {
                        return;
                    }

                    Y.doccirrus.jsonrpc.api.labdata.getLatestLabDataForPatient( { noBlocking: true, patientId: response.data[0] } )
                            .then( function( result ) {
                                if( result && result.data ) {
                                    currentPatient.latestLabData( result.data );
                                }
                            } )
                            .fail( function( error ) {
                                _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                            } );
                }
            } );

            self.addDisposable( ko.computed( function() {
                var
                    latestLabData = unwrap(currentPatient.latestLabData),
                    latestLabDataToShow;

                if (self.filterResult.length === 0) {
                    latestLabDataToShow = latestLabData;
                } else {
                    latestLabDataToShow = latestLabData.filter(function (labata) {
                        return self.filterResult.indexOf( unwrap(labata.labHead) ) !== -1;
                    });
                }

                latestLabDataToShow = latestLabDataToShow.filter(function (labata) {
                    var
                        showPathologicalOnly = unwrap(self.showPathologicalOnly);

                    if (showPathologicalOnly) {
                        return unwrap(labata.isPathological);
                    }

                    return true;

                });

                self.table.setItems(  latestLabDataToShow );
            } ) );
        }
    }, {
        NAME: 'PatientGadgetLatestLabData',
        ATTRS: {
            availableConfigurableTableColumns: {
                value: [
                    {
                        val: CONFIG_FIELDS.DATE,
                        i18n: i18n( 'activity-schema.Activity_T.timestamp.i18n' ),
                        converter: function( value ) {
                            return moment( peek( value ) ).format( i18n( 'general.TIMESTAMP_FORMAT' ) );
                        }
                    },
                    {
                        val: CONFIG_FIELDS.HEAD,
                        i18n: i18n( 'labtest-schema.LabTest_T.head.i18n' ),
                        converter: function( value ) {
                            return peek( value );
                        }
                    },
                    {
                        val: CONFIG_FIELDS.TEST_LABEL,
                        i18n: i18n( 'InCaseMojit.tableformDataVisualisation_model_clientJs.title.LABEL' ),
                        converter: function( value ) {
                            return peek( value );
                        }
                    },
                    {
                        val: CONFIG_FIELDS.SAMPLE_NORMAL_VALUE_TEXT,
                        i18n: i18n( 'InCaseMojit.tableformDataVisualisation_model_clientJs.title.EXPECTED' ),
                        converter: function( value ) {
                            return peek( value );
                        }
                    },
                    {
                        val: CONFIG_FIELDS.LAB_MIN,
                        i18n: i18n( 'InCaseMojit.tableformDataVisualisation_model_clientJs.title.MIN' ),
                        converter: function( value ) {
                            return peek( value );
                        }
                    },
                    {
                        val: CONFIG_FIELDS.LAB_MAX,
                        i18n: i18n( 'InCaseMojit.tableformDataVisualisation_model_clientJs.title.MAX' ),
                        converter: function( value ) {
                            return peek( value );
                        }
                    },
                    {
                        val: CONFIG_FIELDS.TEST_RESULT_UNIT,
                        i18n: i18n( 'InCaseMojit.tableformDataVisualisation_model_clientJs.title.UNIT' ),
                        converter: function( value ) {
                            return peek( value );
                        }
                    },
                    {
                        val: CONFIG_FIELDS.TEST_RESULT_VAL,
                        i18n: i18n( 'labtest-schema.LabTest_T.testResultVal.i18n' ),
                        converter: function( value, model ) {
                            var
                                jsonModel = model.toJSON(),
                                tableHeader = unwrap(this.tableHeader);

                            return Y.doccirrus.labdata.utils.makeFindingValueCompactCellLdt2( jsonModel, jsonModel.isPathological, unwrap(tableHeader.showNotes), unwrap(tableHeader.showHighLow)  );
                        }
                    }
                ]
            },
            defaultConfigurableTableColumns: {
                value: [
                    CONFIG_FIELDS.DATE,
                    CONFIG_FIELDS.HEAD,
                    CONFIG_FIELDS.SAMPLE_NORMAL_VALUE_TEXT,
                    CONFIG_FIELDS.TEST_RESULT_UNIT,
                    CONFIG_FIELDS.TEST_RESULT_VAL
                ]
            }
        }
    } );

    KoViewModel.registerConstructor( PatientGadgetLatestLabData );

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
