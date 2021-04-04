/**
 * User: do
 * Date: 15/12/16  16:30
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment */

'use strict';

YUI.add( 'kbvutility-diagnoses-creation-modal', function( Y, NAME ) {

        var
            i18n = Y.doccirrus.i18n,
            DATE = i18n( 'InCaseMojit.kbvutility-diagnoses-creation-modalJS.label.DATE' ),
            ICD = i18n( 'InCaseMojit.kbvutility-diagnoses-creation-modalJS.label.ICD' ),
            DIAGNOSE = i18n( 'InCaseMojit.kbvutility-diagnoses-creation-modalJS.label.DIAGNOSE' ),
            DIAGNOSIS_CERT = i18n( 'InCaseMojit.kbvutility-diagnoses-creation-modalJS.label.DIAGNOSIS_CERT' ),
            DIAGNOSIS_TYPE = i18n( 'InCaseMojit.kbvutility-diagnoses-creation-modalJS.label.DIAGNOSIS_TYPE' ),
            DIAGNOSIS_TREATMENT_RELEVANCE = i18n( 'InCaseMojit.kbvutility-diagnoses-creation-modalJS.label.DIAGNOSIS_TREATMENT_RELEVANCE' ),
            DIAGNOSIS_SITE = i18n( 'InCaseMojit.kbvutility-diagnoses-creation-modalJS.label.DIAGNOSIS_SITE' ),
            DIAGNOSIS_DEROGATION = i18n( 'InCaseMojit.kbvutility-diagnoses-creation-modalJS.label.DIAGNOSIS_DEROGATION' ),
            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager,
            // KoEditableTable = KoComponentManager.registeredComponent( 'KoEditableTable' ),
            KoViewModel = Y.doccirrus.KoViewModel,
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable,
            TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' );

        /**
         * @class MedicationTableModel
         * @constructor
         * @extends CatalogBasedActivityModel
         */
        function DiagnosesCreationTableModel( config ) {
            DiagnosesCreationTableModel.superclass.constructor.call( this, config );
        }

        DiagnosesCreationTableModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( DiagnosesCreationTableModel, KoViewModel.getBase(), {

                initializer: function DiagnosesCreationTableModel_initializer() {
                    var
                        self = this;
                    self.initDiagnosesCreationTableModel();
                },
                destructor: function DiagnosesCreationTableModel_destructor() {
                },
                initDiagnosesCreationTableModel: function DiagnosesCreationTableModel_initDiagnosesCreationTableModel() {
                    var self = this;

                    self.code.readOnly( true );

                    self.diagnosisCert.hasError = ko.computed(function() {
                        var
                            emptyDiagnosisCert = 'NONE' === unwrap( self.diagnosisCert ),
                            nonUuuCode = 'UUU' !== unwrap( self.code ), // TODO: KBV Q1 2020 - remove UUU stuff after Q4 2019 invoicing is done
                            isDiagnosisCertInvalid = ( nonUuuCode && emptyDiagnosisCert );
                        return isDiagnosisCertInvalid;
                    } );

                    self.diagnosisCert.validationMessages = ko.observableArray( [ Y.doccirrus.errorTable.getMessage( { code: 18025 } ), i18n('validations.kbv.message.FK6003_ERR' ) ] );
                }
            },
            {
                schemaName: 'v_kbvutility_diagnosis_creation',
                NAME: 'DiagnosesCreationTableModel',
                ATTRS: {
                    validatable: {
                        value: true,
                        lazyAdd: false
                    }
                }
            }
        );

        function getTemplate() {
            return Y.doccirrus.jsonrpc.api.jade
                .renderFile( {path: 'InCaseMojit/views/kbvutility_diagnoses_creation_modal'} )
                .then( function( response ) {
                    return response.data;
                } );
        }

        function getModel( config ) {
            var
                kbvutilityDiagnosesCreationTable = KoComponentManager.createComponent( {
                    componentType: 'KoEditableTable',
                    componentConfig: {
                        stateId: 'kbvutilityDiagnosesCreationTable',
                        ViewModel: DiagnosesCreationTableModel,
                        data: config.data.map( function( data ) {
                            return {data: data};
                        } ),
                        columns: [
                            {
                                forPropertyName: 'timestamp',
                                label: DATE,
                                title: DATE,
                                sorted: true,
                                inputField: {
                                    componentType: 'KoSchemaValue',
                                    componentConfig: {
                                        fieldType: 'ISODate',
                                        showLabel: false,
                                        useIsoDate: true
                                    }
                                },
                                renderer: function( meta ) {
                                    var
                                        timestamp = peek( meta.value );
                                    if( timestamp ) {
                                        return moment( timestamp ).format( TIMESTAMP_FORMAT );
                                    } else {
                                        return '';
                                    }
                                }
                            },
                            {
                                label: ICD,
                                text: ICD,
                                forPropertyName: 'code'
                            },
                            {
                                label: DIAGNOSE,
                                text: DIAGNOSE,
                                forPropertyName: 'userContent'
                            },
                            {
                                forPropertyName: 'diagnosisCert',
                                label: DIAGNOSIS_CERT,
                                text: DIAGNOSIS_CERT,
                                inputField: {
                                    componentType: 'KoFieldSelect2',
                                    componentConfig: {
                                        options: Y.doccirrus.schemas.activity.types.DiagnosisCert_E.list,
                                        optionsText: 'i18n',
                                        optionsValue: 'val',
                                        select2Config: {
                                            multiple: false
                                        }
                                    }

                                },
                                renderer: function( meta ) {
                                    var value = peek( meta.value );
                                    return Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'DiagnosisCert_E', value, 'i18n', '' );
                                }
                            },
                            {
                                forPropertyName: 'diagnosisType',
                                label: DIAGNOSIS_TYPE,
                                text: DIAGNOSIS_TYPE,
                                inputField: {
                                    componentType: 'KoFieldSelect2',
                                    componentConfig: {
                                        options: Y.doccirrus.schemas.activity.types.DiagnosisType_E.list,
                                        optionsText: 'i18n',
                                        optionsValue: 'val',
                                        select2Config: {
                                            multiple: false
                                        }
                                    }

                                },
                                renderer: function( meta ) {
                                    var value = peek( meta.value );
                                    return Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'DiagnosisType_E', value, 'i18n', '' );
                                }
                            },
                            {
                                forPropertyName: 'diagnosisTreatmentRelevance',
                                label: DIAGNOSIS_TREATMENT_RELEVANCE,
                                text: DIAGNOSIS_TREATMENT_RELEVANCE,
                                inputField: {
                                    componentType: 'KoFieldSelect2',
                                    componentConfig: {
                                        options: Y.doccirrus.schemas.activity.types.DiagnosisTreatmentRelevance_E.list,
                                        optionsText: 'i18n',
                                        optionsValue: 'val',
                                        select2Config: {
                                            multiple: false
                                        }
                                    }

                                },
                                renderer: function( meta ) {
                                    var value = peek( meta.value );
                                    return Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'DiagnosisTreatmentRelevance_E', value, 'i18n', '' );
                                }
                            },
                            {
                                forPropertyName: 'diagnosisSite',
                                label: DIAGNOSIS_SITE,
                                text: DIAGNOSIS_SITE,
                                inputField: {
                                    componentType: 'KoFieldSelect2',
                                    componentConfig: {
                                        options: Y.doccirrus.schemas.activity.types.DiagnosisSite_E.list,
                                        optionsText: 'i18n',
                                        optionsValue: 'val',
                                        select2Config: {
                                            multiple: false
                                        }
                                    }

                                },
                                renderer: function( meta ) {
                                    var value = peek( meta.value );
                                    return Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'DiagnosisSite_E', value, 'i18n', '' );
                                }
                            },
                            {
                                forPropertyName: 'diagnosisDerogation',
                                label: DIAGNOSIS_DEROGATION,
                                text: DIAGNOSIS_DEROGATION
                            }
                        ],
                        isAddRowButtonDisabled: function() {
                            return true;
                        }
                    }
                } );

            function isValid() {
                return kbvutilityDiagnosesCreationTable.rows().every( function( row ) {
                    return row.isValid() && !row.diagnosisCert.hasError();
                } );
            }


            function getData() {
                return peek( kbvutilityDiagnosesCreationTable.rows ).map( function( vm ) {
                    return vm.toJSON();
                } );
            }

            return {
                isValid: isValid,
                kbvutilityDiagnosesCreationTable: kbvutilityDiagnosesCreationTable,
                getData: getData
            };
        }

        function saveDiagnosis( diagnosis ) {
            return Promise.resolve( Y.doccirrus.jsonrpc.api.activity.saveKbvUtilityDiagnosis( {
                data: diagnosis
            } ) );
        }

        function showDialog( config, callback ) {
            return getTemplate().then( function( template ) {
                var bodyContent = Y.Node.create( template ),
                    model = getModel( config ),
                    modal = new Y.doccirrus.DCWindow( {
                        className: 'DCWindow-KBVUtilityDiagnosesCreation',
                        bodyContent: bodyContent,
                        title: 'Diagnosen erstellen',
                        icon: Y.doccirrus.DCWindow.ICON_LIST,
                        width: (window.innerWidth * 95) / 100,
                        height: (window.innerHeight * 93) / 100,
                        minHeight: 600,
                        minWidth: Y.doccirrus.DCWindow.SIZE_LARGE,
                        centered: true,
                        modal: true,
                        dragable: true,
                        maximizable: true,
                        resizeable: true,
                        render: document.body,
                        focusOn: [],
                        buttons: {
                            header: ['close', 'maximize'],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                    isDefault: true,
                                    action: function() {
                                        var result,
                                            isValid = model.isValid();

                                        if( !isValid ) {
                                            Y.doccirrus.DCWindow.notice( {
                                                type: 'error',
                                                window: {width: 'small'},
                                                message: i18n( 'general.message.ERROR_WHILE_SAVING' )
                                            } );
                                            return;
                                        }
                                        result = model.getData();
                                        saveDiagnosis( result ).then( function( response ) {
                                            modal.close();
                                            callback( response && response.data );
                                        } ).catch( function( response ) {
                                            var
                                                errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );

                                            if( errors.length ) {
                                                Y.Array.invoke( errors, 'display' );
                                            }

                                            Y.log( 'could not save diagnosis ' + response, 'error', NAME );
                                        } );
                                    }
                                } )
                            ]
                        }
                    } );

                ko.applyBindings( model, bodyContent.getDOMNode() );
            } );

        }

        Y.namespace( 'doccirrus.modals' ).kbvutilityDiagnosesCreationModal = {
            showDialog: showDialog
        };

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'DiagnosisModel',
            'KoEditableTable',
            'DCWindow',
            'v_kbvutility_diagnosis_creation-schema'
        ]
    }
);
