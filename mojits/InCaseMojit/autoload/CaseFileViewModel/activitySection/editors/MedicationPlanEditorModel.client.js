/**
 * User: pi
 * Date: 05/09/16  16:10
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true */
/*global YUI, ko, moment */

'use strict';

YUI.add( 'MedicationPlanEditorModel', function( Y ) {
        /**
         * @module MedicationPlanEditorModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            KoUI = Y.doccirrus.KoUI,
            ignoreDependencies = ko.ignoreDependencies,
            KoComponentManager = KoUI.KoComponentManager,
            controlCharsRegExp = Y.doccirrus.regexp.controlChars,
            replaceControlChars = Y.doccirrus.commonutils.replaceControlChars,
            SimpleActivityEditorModel = KoViewModel.getConstructor( 'SimpleActivityEditorModel' ),
            KoEditableTable = KoComponentManager.registeredComponent( 'KoEditableTable' ),
            peek = ko.utils.peekObservable,
            unwrap = ko.unwrap,
            i18n = Y.doccirrus.i18n,
            TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' );

        /**
         * @class MedicationTableModel
         * @constructor
         * @extends KoViewModel
         */
        function MedicationTableModel( config ) {
            MedicationTableModel.superclass.constructor.call( this, config );
        }

        MedicationTableModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( MedicationTableModel, KoViewModel.getBase(), {

                initializer: function MedicationTableModel_initializer() {
                    var
                        self = this;
                    self.initMedicationTableModel();
                },
                destructor: function MedicationTableModel_destructor() {
                },
                initMedicationTableModel: function MedicationTableModel_initMedicationTableModel() {
                    var self = this;

                    self.set( 'data.catalogShort', 'MMI' );
                    self.setNotModified();

                    self.displayDosis = ko.computed( {
                        read: function() {
                            return Y.doccirrus.schemas.activity.getMedicationDosis( {
                                phDosisType: unwrap( self.phDosisType ),
                                dosis: unwrap( self.dosis ),
                                phDosisMorning: unwrap( self.phDosisMorning ),
                                phDosisAfternoon: unwrap( self.phDosisAfternoon ),
                                phDosisEvening: unwrap( self.phDosisEvening ),
                                phDosisNight: unwrap( self.phDosisNight )
                            } );
                        },
                        write: function( value ) {
                            var
                                _value = value.trim(),
                                regExp = /^(\d*)-(\d*)-(\d*)-(\d*)$/;
                            ignoreDependencies( function() {
                                var
                                    phDosisType = peek( self.phDosisType ),
                                    matches = regExp.exec( _value );
                                if( Y.doccirrus.schemas.activity.phDosisTypes.SCHEDULE === phDosisType && matches ) {
                                    self.phDosisMorning( matches[ 1 ] );
                                    self.phDosisAfternoon( matches[ 2 ] );
                                    self.phDosisEvening( matches[ 3 ] );
                                    self.phDosisNight( matches[ 4 ] );
                                } else {
                                    self.phDosisType( Y.doccirrus.schemas.activity.phDosisTypes.TEXT );
                                    self.dosis( _value );
                                }
                            } );
                        }
                    } );
                    self.displayDosis.hasWarn = ko.observable( false );
                    self.displayDosis.readOnly = self.dosis.readOnly;

                    self.addDisposable( ko.computed( function() {
                        var
                            displayDosis = self.displayDosis();
                        if( controlCharsRegExp.test( displayDosis )  ) {
                            displayDosis = replaceControlChars( displayDosis );
                            self.dosis( displayDosis );
                        }

                        self.displayDosis.hasWarn( displayDosis && 45 < displayDosis.length );
                    } ) );
                    self.phNote.hasWarn = ko.observable( false );
                    self.addDisposable( ko.computed( function() {
                        var
                            phNote = unwrap( self.phNote );

                        if( controlCharsRegExp.test( phNote )  ) {
                            phNote = replaceControlChars( phNote );
                            self.phNote( phNote );
                        }

                        self.phNote.hasWarn( phNote && 45 < phNote.length );
                    } ) );
                    self.phReason.hasWarn = ko.observable( false );
                    self.addDisposable( ko.computed( function() {
                        var
                            phReason = unwrap( self.phReason );

                        if( controlCharsRegExp.test( phReason )  ) {
                            phReason = replaceControlChars( phReason );
                            self.phReason( phReason );
                        }

                        self.phReason.hasWarn( phReason && 45 < phReason.length );
                    } ) );
                    self.phUnit.hasWarn = ko.observable( false );
                    self.addDisposable( ko.computed( function() {
                        var
                            phUnit = unwrap( self.phUnit );

                        if( controlCharsRegExp.test( phUnit )  ) {
                            phUnit = replaceControlChars( phUnit );
                            self.phUnit( phUnit );
                        }

                        self.phUnit.hasWarn( phUnit && 45 < phUnit.length );
                    } ) );
                    self.initComputeStatus();
                    self.updateReadOnly();

                    self.displayStrength = ko.computed( {
                        read: function() {
                            var
                                phIngr = unwrap( self.phIngr ) || [],
                                strength = unwrap( phIngr[ 0 ] && phIngr[ 0 ].strength );
                            return strength;
                        },
                        write: function( value ) {
                            var
                                phIngr = peek( self.phIngr );
                            if( phIngr[ 0 ] ) {
                                phIngr[ 0 ].strength( value );
                            } else {
                                self.phIngr.push( { strength: value } );
                            }
                        }
                    } );
                },
                updateReadOnly: function() {
                    var
                        self = this,
                        data, paths;
                    data = self.toJSON();
                    paths = Y.doccirrus.schemas.activity.getReadOnlyFields( data );
                    self.getModuleViewModelReadOnly()._makeReadOnly( {
                        paths: paths
                    } );
                },
                initComputeStatus: function() {
                    var
                        self = this;
                    self.addDisposable( ko.computed( function() {
                        var
                            isModified = self.isModified(),
                            status = unwrap( self.status );
                        /**
                         * When model is considered modified, status is set to 'CREATED'.
                         * If not modified initial status is reapplied.
                         */
                        if( isModified ) {
                            if( !('CREATED' === status || 'INVALID' === status) ) {
                                self.status( 'CREATED' );
                            }
                        }
                        else {
                            self.status( self.get( 'data.status' ) );
                        }
                    } ).extend( { rateLimit: 0 } ) );
                }
            },
            {
                schemaName: 'v_medicationItem',
                NAME: 'MedicationTableModel',
                ATTRS: {
                    validatable: {
                        value: true,
                        lazyAdd: false
                    },
                    ignoreModificationsOn: {
                        value: [
                            'status'
                        ],
                        cloneDefaultValue: true,
                        lazyAdd: false
                    }
                }
            }
        );

        /**
         * @class MedicationPlanEditorModel
         * @constructor
         * @extends SimpleActivityEditorModel
         */
        function MedicationPlanEditorModel( config ) {
            MedicationPlanEditorModel.superclass.constructor.call( this, config );
        }

        MedicationPlanEditorModel.ATTRS = {
            whiteList: {
                value: SimpleActivityEditorModel.ATTRS.whiteList.value.concat( [] ),
                lazyAdd: false
            },
            subModelsDesc: {
                value: [],
                lazyAdd: false
            }
        };

        Y.extend( MedicationPlanEditorModel, SimpleActivityEditorModel, {
                initializer: function MedicationPlanEditorModel_initializer() {
                    var
                        self = this;
                    self.initMedicationPlanEditorModel();
                },
                destructor: function MedicationPlanEditorModel_destructor() {
                },
                initMedicationPlanEditorModel: function MedicationPlanEditorModel_initMedicationPlanEditorModel() {
                    var
                        self = this,
                        binder = self.get( 'binder' ),
                        incaseconfiguration = binder.getInitialData( 'incaseconfiguration' ),
                        currentActivity = peek( self.get( 'currentActivity' ) );

                    self.allowCustomValuesForNoteAndReason = Y.doccirrus.auth.isAdmin() ||
                                                             !incaseconfiguration.allowCustomValueFor ||
                                                             -1 !== incaseconfiguration.allowCustomValueFor.indexOf( 'PRESCRIPTION' );

                    Y.doccirrus.inCaseUtils.injectPopulatedObjs.call( self, {
                        dataModel: currentActivity,
                        fields: [ 'activitiesObj' ]
                    } );

                    self.initMedicationTable();

                },
                recalculatePositionIndex: function(){
                    var self = this;
                    unwrap( self.medicationTable.rows ).forEach( function( model, index ) {
                        model.positionIndex( index );
                    } );
                },
                initMedicationTable: function() {
                    var
                        self = this,
                        currentActivity = peek( self.get( 'currentActivity' ) ),
                        activities = peek( currentActivity.activities );
                    self.medicationTable = KoComponentManager.createComponent( {
                        componentType: 'KoEditableTable',
                        componentConfig: {
                            stateId: 'MedicationPlanEditorModel-medicationTable',
                            ViewModel: MedicationTableModel,
                            data: unwrap( self.activitiesObj ).sort( function( itemA, itemB ) {
                                return activities.indexOf( itemA._id ) > activities.indexOf( itemB._id ) ? 1 : -1;
                            } ).map( function( data, index ) {
                                data.positionIndex = index;
                                return {
                                    data: data
                                };
                            } ),
                            columns: [
                                {
                                    componentType: 'KoEditableTableColumnDrag'
                                },
                                {
                                    forPropertyName: 'timestamp',
                                    label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DATE' ),
                                    title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DATE' ),
                                    width: '100px',
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
                                    label: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.CODE_PZN' ),
                                    text: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.CODE_PZN' ),
                                    forPropertyName: 'code',
                                    width: '90px'
                                },
                                {

                                    label: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.ACTIVE_INGREDIENTS' ),
                                    text: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.ACTIVE_INGREDIENTS' ),
                                    forPropertyName: 'phIngr',
                                    width: '14%',
                                    renderer: function( meta ) {
                                        var
                                            value = unwrap( meta.value );
                                        return (value || []).map( function( phIngrModel ) {
                                            return peek( phIngrModel.name );
                                        } ).join( ', ' );
                                    },
                                    inputField: {
                                        componentType: 'KoFieldSelect2',
                                        componentConfig: {
                                            useSelect2Data: true,
                                            // placeholder: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.ACTIVE_INGREDIENTS' ),
                                            select2Read: function( value ) {
                                                return (value || []).map( function( phIngrModel ) {
                                                    return {
                                                        id: peek( phIngrModel.code ),
                                                        text: peek( phIngrModel.name )
                                                    };
                                                } );
                                            },
                                            select2Write: function( $event, observable ) {
                                                if( $event.added ) {
                                                    observable.push( {
                                                        code: $event.added.id,
                                                        name: $event.added.text
                                                    } );
                                                } else if( $event.removed ) {
                                                    observable.remove( function( entry ) {
                                                        return $event.removed.id === peek( entry.code );
                                                    } );
                                                }
                                            },
                                            select2Config: {
                                                multiple: true,
                                                // allowClear: true,
                                                minimumInputLength: 1,
                                                containerCssClass: 'ko-select2-container ko-select2-no-right-border',
                                                query: Y.doccirrus.utils.debounceSelect2Query( function( query ) {
                                                    var maxresult = 10;
                                                    Y.doccirrus.jsonrpc.api.mmi.getMolecules( {
                                                        query: {
                                                            name: query.term,
                                                            maxresult: maxresult
                                                        }
                                                    } ).done( function( response ) {
                                                            var results = response.data && response.data.MOLECULE || [];

                                                            if( 10 < results.length ) {
                                                                results.length = 10;
                                                            }
                                                            results = results.map( function( item ) {
                                                                return {
                                                                    id: item.ID,
                                                                    text: item.NAME
                                                                };
                                                            } );
                                                            query.callback( {
                                                                results: results
                                                            } );
                                                        }
                                                    )
                                                        .fail( function() {
                                                            query.callback( {
                                                                results: []
                                                            } );
                                                        } );
                                                }, 750 )
                                            }
                                        }
                                    }
                                },
                                {

                                    label: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.NLABEL' ),
                                    text: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.NLABEL' ),
                                    width: '20%',
                                    forPropertyName: 'phNLabel'
                                },
                                {

                                    label: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.STRENGTH' ),
                                    text: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.STRENGTH' ),
                                    width: '10%',
                                    forPropertyName: 'displayStrength'
                                },
                                {
                                    forPropertyName: 'phForm',
                                    label: i18n( 'InCaseMojit.casefile_detail.label.FORM_OF_ADMINISTRATION' ),
                                    title: i18n( 'InCaseMojit.casefile_detail.title.FORM_OF_ADMINISTRATION' ),
                                    inputField: {
                                        componentType: 'KoFieldSelect2',
                                        componentConfig: {
                                            select2Config: {
                                                minimumInputLength: 1,
                                                multiple: false,
                                                initSelection: function( element, callback ) {
                                                    var data = { id: element.val(), text: element.val() };
                                                    callback( data );
                                                },
                                                query: function( query ) {
                                                    var results = [],
                                                        defaultMappings = currentActivity.get( 'defaultMappings' );
                                                    if( defaultMappings && defaultMappings.PHARMFORM && defaultMappings.PHARMFORM.CATALOGENTRY ) {
                                                        defaultMappings.PHARMFORM.CATALOGENTRY.forEach( function( formatEntry ) {

                                                            if( -1 !== formatEntry.NAME.indexOf( query.term ) ) {
                                                                results.push( {
                                                                    id: formatEntry.NAME,
                                                                    text: formatEntry.NAME
                                                                } );
                                                            }
                                                        } );
                                                        query.callback( { results: results } );
                                                    } else {
                                                        query.callback( {
                                                            results: [
                                                                {
                                                                    id: query.term,
                                                                    text: query.term
                                                                }
                                                            ]
                                                        } );
                                                    }
                                                }
                                            }
                                        }
                                    }
                                },
                                {
                                    forPropertyName: 'displayDosis',
                                    label: i18n( 'InCaseMojit.casefile_detail.label.DOSIS' ),
                                    title: i18n( 'InCaseMojit.casefile_detail.label.DOSIS' ),
                                    inputField: {
                                        componentType: 'KoFieldSelect2',
                                        componentConfig: {
                                            select2Config: {
                                                placeholder: i18n( 'InCaseMojit.casefile_detail.placeholder.DOSIS' ),
                                                allowClear: true,
                                                quietMillis: 700,
                                                multiple: false,
                                                initSelection: function( element, callback ) {
                                                    var data = { id: element.val(), text: element.val() };
                                                    callback( data );
                                                },
                                                query: function( query ) {
                                                    Y.doccirrus.jsonrpc.api.tag.read( {
                                                        query: {
                                                            type: Y.doccirrus.schemas.tag.tagTypes.DOSE,
                                                            title: {
                                                                $regex: query.term,
                                                                $options: 'i'
                                                            }
                                                        },
                                                        options: {
                                                            itemsPerPage: 15,
                                                            sort: { title: 1 }
                                                        },
                                                        fields: { title: 1 }
                                                    } ).done( function( response ) {
                                                        query.callback( {
                                                            results: (response && response.data && response.data.map( function( item ) {
                                                                return { id: item.title, text: item.title };
                                                            } )) || []
                                                        } );
                                                    } ).fail( function() {
                                                        query.callback( {
                                                            results: []
                                                        } );
                                                    } );
                                                },
                                                createSearchChoice: self.allowCustomValuesForNoteAndReason ? function( term ) {
                                                    return {
                                                        id: term,
                                                        text: term
                                                    };
                                                } : null
                                            }
                                        }
                                    }
                                },
                                {
                                    forPropertyName: 'phUnit',
                                    label: i18n( 'activity-schema.Medication_T.phUnit.i18n' ),
                                    title: i18n( 'activity-schema.Medication_T.phUnit.i18n' ),
                                    inputField: {
                                        componentType: 'KoEditableTableTextareaCell',
                                        componentConfig: {
                                            css: {
                                                vresize: true
                                            }
                                        }

                                    }
                                },
                                {
                                    forPropertyName: 'phNote',
                                    label: i18n( 'activity-schema.Medication_T.phNote.i18n' ),
                                    title: i18n( 'activity-schema.Medication_T.phNote.i18n' ),
                                    inputField: {
                                        componentType: 'KoFieldSelect2',
                                        componentConfig: {
                                            select2Config: {
                                                placeholder: i18n( 'activity-schema.Medication_T.phNote.i18n' ),
                                                allowClear: true,
                                                quietMillis: 700,
                                                multiple: false,
                                                initSelection: function( element, callback ) {
                                                    var data = { id: element.val(), text: element.val() };
                                                    callback( data );
                                                },
                                                query: function( query ) {
                                                    Y.doccirrus.jsonrpc.api.tag.read( {
                                                        query: {
                                                            type: Y.doccirrus.schemas.tag.tagTypes.PHNOTE,
                                                            title: {
                                                                $regex: query.term,
                                                                $options: 'i'
                                                            }
                                                        },
                                                        options: {
                                                            itemsPerPage: 15,
                                                            sort: { title: 1 }
                                                        },
                                                        fields: { title: 1 }
                                                    } ).done( function( response ) {
                                                        query.callback( {
                                                            results: (response && response.data && response.data.map( function( item ) {
                                                                return { id: item.title, text: item.title };
                                                            } )) || []
                                                        } );
                                                    } ).fail( function() {
                                                        query.callback( {
                                                            results: []
                                                        } );
                                                    } );
                                                },
                                                createSearchChoice: self.allowCustomValuesForNoteAndReason ? function( term ) {
                                                    return {
                                                        id: term,
                                                        text: term
                                                    };
                                                } : null
                                            }
                                        }
                                    }
                                },
                                {
                                    forPropertyName: 'phReason',
                                    label: i18n( 'activity-schema.Medication_T.phReason.i18n' ),
                                    title: i18n( 'activity-schema.Medication_T.phReason.i18n' ),
                                    inputField: {
                                        componentType: 'KoFieldSelect2',
                                        componentConfig: {
                                            select2Config: {
                                                placeholder: i18n( 'activity-schema.Medication_T.phReason.i18n' ),
                                                allowClear: true,
                                                quietMillis: 700,
                                                multiple: false,
                                                initSelection: function( element, callback ) {
                                                    var data = { id: element.val(), text: element.val() };
                                                    callback( data );
                                                },
                                                query: function( query ) {
                                                    Y.doccirrus.jsonrpc.api.tag.read( {
                                                        query: {
                                                            type: Y.doccirrus.schemas.tag.tagTypes.PHREASON,
                                                            title: {
                                                                $regex: query.term,
                                                                $options: 'i'
                                                            }
                                                        },
                                                        options: {
                                                            itemsPerPage: 15,
                                                            sort: { title: 1 }
                                                        },
                                                        fields: { title: 1 }
                                                    } ).done( function( response ) {
                                                        query.callback( {
                                                            results: (response && response.data && response.data.map( function( item ) {
                                                                return { id: item.title, text: item.title };
                                                            } )) || []
                                                        } );
                                                    } ).fail( function() {
                                                        query.callback( {
                                                            results: []
                                                        } );
                                                    } );
                                                },
                                                createSearchChoice: self.allowCustomValuesForNoteAndReason ? function( term ) {
                                                    return {
                                                        id: term,
                                                        text: term
                                                    };
                                                } : null
                                            }
                                        }
                                    }
                                },
                                {
                                    forPropertyName: 'deleteButton',
                                    utilityColumn: true,
                                    width: '60px',
                                    css: {
                                        'text-center': 1
                                    },
                                    inputField: {
                                        componentType: 'KoButton',
                                        componentConfig: {
                                            name: 'delete',
                                            title: i18n( 'general.button.DELETE' ),
                                            icon: 'TRASH_O',
                                            disabled: ko.computed( function() {
                                                return unwrap( currentActivity._isModelReadOnly );
                                            } ),
                                            click: function( button, $event, $context ) {
                                                var
                                                    rowModel = $context.$parent.row,
                                                    activityId = peek( rowModel._id );
                                                if( activityId ) {
                                                    currentActivity._unlinkActivity( activityId );
                                                } else {
                                                    self.medicationTable.removeRow( rowModel );
                                                }
                                                self.recalculatePositionIndex();
                                            }
                                        }
                                    }
                                }
                            ],
                            groupByField: 'phHeader',
                            showGroups: true,
                            draggableRows: true,
                            isRowDraggable: function( $context ) {
                                var
                                    status = peek( $context.$data.status );
                                return 'VALID' === status || 'CREATED' === status;
                            },
                            onRowDragged: function() {
                                self.recalculatePositionIndex();
                            },
                            onAddButtonClick: function() {
                                var
                                    currentActivity = peek( self.get( 'currentActivity' ) ),
                                    currentPatient = peek( self.get( 'currentPatient' ) );

                                Y.doccirrus.modals.addMedicationModal.show( {
                                    currentActivity: currentActivity,
                                    currentPatient: currentPatient,
                                    defaultMappings: currentActivity.get( 'defaultMappings' )
                                } )
                                    .then( function( data ) {
                                        if( !data ) {
                                            return null;
                                        }
                                        return Promise.each( data, function( item ) {
                                            return self.addMedication( item );
                                        } );
                                    } );
                                return false;
                            },
                            isAddRowButtonDisabled: function() {
                                return unwrap( currentActivity._isModelReadOnly );
                            },
                            isAddGroupButtonDisabled: function() {
                                return unwrap( currentActivity._isModelReadOnly );
                            }
                        }
                    } );

                    self.addDisposable( self.activitiesObj.subscribe( function( changes ) {
                        changes.forEach( function( item ) {
                            if( 'added' === item.status ) {
                                self.medicationTable.addRow( { data: item.value } );
                            } else {
                                self.medicationTable.removeRowByCriteria( { _id: item.value._id } );
                            }
                        } );
                    }, null, 'arrayChange' ) );

                    self.addDisposable( ko.computed( function() {
                        var
                            rows = unwrap( self.medicationTable.rows );
                        currentActivity.areMedicationsValid( rows.every( function( rowModel ) {
                            return rowModel._isValid();
                        } ) );
                    } ) );
                    self.addDisposable( ko.computed( function() {
                        var
                            rows = unwrap( self.medicationTable.rows );
                        currentActivity.medicationsChanged( rows.some( function( rowModel ) {
                            return rowModel.isModified() || rowModel.isNew();
                        } ) );
                    } ) );

                    self.medicationTable.rendered.subscribe( function( val ) {
                        if( true === val ) {
                            KoEditableTable.tableNavigation( document.querySelector( '#medicationTable' ) );
                        }
                    } );
                },
                addMedication: function( data ) {
                    var
                        self = this,
                        binder = self.get( 'binder' ),
                        currentActivity = peek( self.get( 'currentActivity' ) ),
                        currentPatient = peek( self.get( 'currentPatient' ) ),
                        caseFolderActive = currentPatient.caseFolderCollection.getActiveTab(),
                        patientData = currentPatient.toJSON();

                    delete data._id;

                    return Y.doccirrus.api.activity
                        .createActivity( {
                            patient: patientData,
                            currentUser: binder.getInitialData( 'currentUser' ),
                            caseFolder: caseFolderActive,
                            activity: data
                        } )
                        .then( function( activity ) {
                            if( activity ) {
                                activity.timestamp = moment().toISOString();
                                activity.code = activity.code || activity.phPZN;
                                activity.locationId = peek( currentActivity.locationId );
                                activity.employeeId = peek( currentActivity.employeeId );
                                self.medicationTable.addRow( {
                                    data: activity,
                                    caseFolder: caseFolderActive
                                } );
                                self.recalculatePositionIndex();
                            }
                        } );
                }
            }, {
                NAME: 'MedicationPlanEditorModel'
            }
        );
        KoViewModel.registerConstructor( MedicationPlanEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'SimpleActivityEditorModel',
            'MedicationEditorModel',
            'activity-schema',
            'dcregexp',
            'dccommonutils',
            'KoEditableTable',
            'AddMedicationModal',
            'v_medicationItem-schema'
        ]
    }
)
;
