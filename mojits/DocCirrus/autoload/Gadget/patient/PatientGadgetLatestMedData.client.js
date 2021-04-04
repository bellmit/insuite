/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, _, moment */

'use strict';

YUI.add( 'PatientGadgetLatestMedData', function( Y/*, NAME*/ ) {

    /**
     * @module PatientGadgetLatestMedData
     */
    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,

        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,
        PatientGadgetConfigurableTableBase = KoViewModel.getConstructor( 'PatientGadgetConfigurableTableBase' ),

        GADGET = Y.doccirrus.gadget,
        GADGET_LAYOUT_PATIENT = GADGET.layouts.patient,

        CONFIG_FIELDS = GADGET_LAYOUT_PATIENT.configFields.configurableTable.PatientGadgetLatestMedData,
        MedDataItemTemplateCollection = Y.doccirrus.schemas.tag.MedDataItemTemplateCollection;

    /**
     * @constructor
     * @class PatientGadgetLatestMedData
     * @extends PatientGadgetConfigurableTableBase
     */
    function PatientGadgetLatestMedData() {
        PatientGadgetLatestMedData.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientGadgetLatestMedData, PatientGadgetConfigurableTableBase, {
        /** @private */
        initializer: function() {
            var
                self = this;
            self.initPatientGadgetLatestMedData();
        },
        /** @private */
        destructor: function() {
            var self = this;

            if( self.latestMedDataChangedListener ) {
                self.latestMedDataChangedListener.removeEventListener();
                self.latestMedDataChangedListener = null;
            }
        },
        initPatientGadgetLatestMedData: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = peek( binder && peek( binder.currentPatient ) );

            self.medDataI18n = i18n( 'PatientGadget.PatientGadgetLatestMedData.i18n' );

            self.titleUrl = ko.observable('#');

            Y.doccirrus.jsonrpc.api.activity.read({
                noBlocking: true,
                query: {
                    actType: 'MEDDATA',
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

            self.latestMedDataChangedListener = Y.doccirrus.communication.on( {
                event: 'activity.latestMedDataRefresh',
                done: function handleAction( response ) {
                    if( !response || !response.data || !response.data[0] || ( currentPatient._id() !== response.data[0] ) ) {
                        return;
                    }

                    Y.doccirrus.jsonrpc.api.meddata.getLatestMeddataForPatient( { noBlocking: true, patientId: response.data[0] } )
                        .then( function( result ) {
                            if( result && result.data ) {
                                currentPatient.latestMedData( result.data );
                            }
                        } )
                        .fail( function( error ) {
                            _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                        } );
                }
            } );

            self.addDisposable( ko.computed( function() {
                var
                    latestMedData = unwrap( currentPatient.latestMedData ),
                    latestMedDataToShow;

                latestMedData = latestMedData.filter(function (meddata) {
                    return !moment( meddata.measurementDate ).isAfter();
                });
                if (self.filterResult.length === 0) {
                    latestMedDataToShow = latestMedData;
                } else {
                    latestMedDataToShow = latestMedData.filter(function (meddata) {
                        return !moment( meddata.measurementDate ).isAfter() && self.filterResult.indexOf( unwrap(meddata.type) ) !== -1;
                    });
                }

                latestMedDataToShow = _.sortBy(latestMedDataToShow, function (columnDate) {
                    return moment( unwrap( columnDate.measurementDate ) ).unix();
                }).reverse();

                Y.doccirrus.jsonrpc.api.meddata.getMedDataItemTemplateCollection()
                    .then( function( response ) {
                        var templateCollection = new MedDataItemTemplateCollection( response && response.data || {} );

                        latestMedDataToShow.forEach( function ( medData ) {
                            medData.medDataItemConfig = templateCollection.getMedDataItemConfigSchemaForMedDataItem({
                                medDataItem: medData.toJSON(),
                                timestamp: peek( medData.measurementDate )
                            });

                            medData.smartValue = medData.medDataItemConfig.formatMedDataItem( medData.toJSON() );
                        } );

                        self.table.setItems( latestMedDataToShow );
                    } );
            }));
        }
    }, {
        NAME: 'PatientGadgetLatestMedData',
        ATTRS: {
            availableConfigurableTableColumns: {
                value: [
                    {
                        val: CONFIG_FIELDS.TYPE,
                        i18n: i18n( 'activity-schema.MedData_T.type.i18n' ),
                        converter: function( value ) {
                            var val = peek( value );
                            return Y.doccirrus.schemaloader.getEnumListTranslation( 'v_meddata', 'medDataType_E', val, 'i18n', val );
                        }
                    },
                    {
                        val: CONFIG_FIELDS.SMART_VALUE,
                        i18n: i18n( 'activity-schema.MedData_T.value.i18n' )
                    },
                    {
                        val: CONFIG_FIELDS.UNIT,
                        i18n: i18n( 'activity-schema.MedData_T.unit.i18n' ),
                        converter: function( value ) {
                            return peek( value );
                        }
                    },
                    {
                        val: CONFIG_FIELDS.DATE,
                        i18n: i18n( 'activity-schema.MedData_T.measurementDate.i18n' ),
                        converter: function( value ) {
                            return moment( peek( value ) ).format( i18n( 'general.TIMESTAMP_FORMAT' ) );
                        }
                    }
                ]
            },
            defaultConfigurableTableColumns: {
                value: [
                    CONFIG_FIELDS.TYPE,
                    CONFIG_FIELDS.SMART_VALUE,
                    CONFIG_FIELDS.UNIT
                ]
            }
        }
    } );

    KoViewModel.registerConstructor( PatientGadgetLatestMedData );

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
        'dccommunication-client',
        'tag-schema'
    ]
} );
