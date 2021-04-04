/*jslint anon:true, nomen:true*/
/*global YUI, ko, _ */
YUI.add( 'PrescriptionModel', function( Y ) {
        'use strict';
        /**
         * @module PrescriptionModel
         */

        var
            unwrap = ko.unwrap,
            KoViewModel = Y.doccirrus.KoViewModel,
            FormBasedActivityModel = KoViewModel.getConstructor( 'FormBasedActivityModel' );

        /**
         * @class PrescriptionModel
         * @constructor
         * @extends FormBasedActivityModel
         */
        function PrescriptionModel( config ) {
            PrescriptionModel.superclass.constructor.call( this, config );
        }

        PrescriptionModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            },
            ignoreModificationsOn: {
                value: [
                    'status',
                    'catalogRef',
                    'content'
                ],
                cloneDefaultValue: true,
                lazyAdd: false
            }
        };

        Y.extend( PrescriptionModel, FormBasedActivityModel, {

                initializer: function PrescriptionModel_initializer() {
                    var
                        self = this;
                    self.initPrescriptionModel();
                },
                destructor: function PrescriptionModel_destructor() {
                    var
                        self = this;
                    if( self.activitiesObjListener && self.activitiesObjListener.detach ) {
                        self.activitiesObjListener.detach();
                    }
                },
                initPrescriptionModel: function PrescriptionModel_initPrescriptionModel() {
                    var
                        self = this;
                    self.activitiesObjListener = self.after( 'activitiesObjChange', function( e ) {
                        var activityData = self.toJSON();
                        activityData._activitiesObj = e.newVal || [];

                        Promise.resolve( Y.doccirrus.jsonrpc.api.activity.read( {
                                query: {
                                    isPrescribed: true,
                                    actType: 'MEDICATION',
                                    patientId: activityData && activityData.patientId,
                                    status: {$nin: ['CANCELLED']}
                                },
                                sort: {timestamp: -1}
                            } )
                        ).then( function( response ) {
                            self.content( Y.doccirrus.schemas.activity.generateContent( activityData, {medicationsForPatient: response && response.data} ) );
                        } ).catch( function( err ) {
                            _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                        } );
                    } );

                    self.addDisposable( ko.computed( function() {
                        var medicationIds = unwrap( self.activities ),
                            caseFolder = self.get( 'caseFolder' ),
                            actType = self.actType.peek(),
                            binder = self.get( 'binder' ),
                            currentPatient = unwrap( binder.currentPatient );


                        if( !caseFolder || !medicationIds || !medicationIds.length ) {
                            return;
                        }
                        Y.doccirrus.jsonrpc.api.activity
                            .getPrescriptionTypes( {
                                query: {
                                    patientAge: currentPatient && currentPatient.age(),
                                    insuranceType: caseFolder.type,
                                    medications: medicationIds
                                }
                            } )
                            .done( function( response ) {
                                var data = response && response.data,
                                    mappedData,
                                    node = Y.Node.create( '<div></div>' );

                                if( 'PRESCRBTM'===actType) {
                                    // MOJ-9874
                                    if(data.recommendations && data.recommendations.length && -1 === data.recommendations.indexOf( actType ) ) {
                                        data.advice = true;
                                        if (data.results && data.results[0] && data.results[0].recommendations) {
                                            data.results[0].recommendations.push({
                                                name: 'NEGATIVEBTM',
                                                prescriptions: []
                                            });
                                        }
                                    } else {
                                        data.advice = false;
                                    }
                                }
                                if( !data || !data.recommendations || !data.advice || -1 !== data.recommendations.indexOf( actType ) ) {
                                    return;
                                }

                                mappedData = Y.doccirrus.commonutils.mapPrescRecommendations( data, actType );
                                if( self.recommendationId.peek() === mappedData.id ) {
                                    return;
                                }
                                self.recommendationId( mappedData.id );

                                YUI.dcJadeRepository.loadNodeFromTemplate(
                                    'recommendedprescription_modal',
                                    'TestingMojit',
                                    mappedData,
                                    node,
                                    function() {
                                        Y.doccirrus.DCWindow.notice( {
                                            title: 'Bitte überprüfen Sie die Formularauswahl!',
                                            type: 'info',
                                            window: {
                                                width: 'xlarge',
                                                maximizable: true,
                                                buttons: {
                                                    header: ['close', 'maximize'],
                                                    footer: [
                                                        Y.doccirrus.DCWindow.getButton( 'OK', {
                                                            isDefault: true,
                                                            label: 'Bestätigen',
                                                            action: function() {
                                                                this.close();
                                                            }
                                                        } )
                                                    ]
                                                }

                                            },
                                            message: node
                                        } );

                                    }
                                );

                            } );

                    } ).extend( {
                        rateLimit: {timeout: 200, method: "notifyWhenChangesStop"}
                    } ) );
                },
                _writeBack: function( template, element ) {
                    var self = this,
                        schemaMember = element.schemaMember,
                        value = element.unmap(),
                        writeBackPaths = [
                            'nightTime',
                            'otherInsurance',
                            'utUnfall',
                            'workAccident',
                            'isPatientBVG',
                            'assistive',
                            'vaccination',
                            'practiceAssistive',
                            'dentist',
                            'employeeSpecialities',
                            'fk4202',
                            'correctUsage',
                            'patientInformed',
                            'inLabel',
                            'offLabel',
                            'exactMed1',
                            'exactMed2',
                            'exactMed3'
                        ];

                    if( !self._isEditable() || !schemaMember ) {
                        return;
                    }

                    if( -1 !== writeBackPaths.indexOf( schemaMember ) && ko.isObservable( self[schemaMember] ) ) {
                        self[schemaMember]( value );
                    }
                }
            },
            {
                schemaName: 'v_prescription',
                NAME: 'PrescriptionModel'
            }
        );
        KoViewModel.registerConstructor( PrescriptionModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'FormBasedActivityModel',
            'v_prescription-schema',
            'activity-schema',
            'dccommonutils'
        ]
    }
);