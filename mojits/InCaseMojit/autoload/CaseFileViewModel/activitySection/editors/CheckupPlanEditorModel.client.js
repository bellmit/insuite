/**
 * User: strix
 * Date: 06/02/18
 * (c) 2018, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment */

'use strict';

YUI.add( 'CheckupPlanEditorModel', function( Y, NAME ) {
        /**
         * @module CheckupPlanEditorModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            KoComponentManager = Y.doccirrus.KoUI.KoComponentManager,
            SubEditorModel = KoViewModel.getConstructor( 'SubEditorModel' ),
            SimpleActivityEditorModel = KoViewModel.getConstructor( 'SimpleActivityEditorModel' ),
            KoEditableTable = KoComponentManager.registeredComponent( 'KoEditableTable' ),
            peek = ko.utils.peekObservable,
            unwrap = ko.unwrap,
            i18n = Y.doccirrus.i18n,

            TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' );


        //  shared utility

        function remapExamsInForm( binder ) {
            var
                currentActivity = unwrap( binder.currentActivity ),
                currentView = unwrap( binder.currentView ),
                activityDetailsVM = currentView ? unwrap( currentView.activityDetailsViewModel ) : null,
                template = activityDetailsVM && activityDetailsVM.template ? activityDetailsVM.template : null,
                element = template ? template.getBoundElement( 'checkupPlanTable' ) : null;

            //  check that we have a form and a mapper, and the form uses the checkup plan table
            if ( !template || !template.map || !element || !currentActivity._isEditable() ) { return; }
            if ( !activityDetailsVM.mapper || ! activityDetailsVM.mapper.map ) { return; }

            activityDetailsVM.mapper.map( onFormRemapped );

            function onFormRemapped() {
                Y.log( 'Updated checkup plan, storing form changes.', 'debug', NAME );
                template.raise( 'valueChanged', element );
            }
        }

        /**
         * @class CheckupPlanItemEditorModel
         * @constructor
         * @param {Object} config
         * @extends SubEditorModel
         */
        function CheckupPlanItemEditorModel( config ) {
            CheckupPlanItemEditorModel.superclass.constructor.call( this, config );
        }

        CheckupPlanItemEditorModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            },
            whiteList: {
                value: [
                    'stage',
                    'plannedFrom',
                    'plannedTo',
                    'toleranceFrom',
                    'toleranceTo',
                    'completed'
                ],
                lazyAdd: false
            }
        };

        Y.extend( CheckupPlanItemEditorModel, SubEditorModel, {

                initializer: function CheckupPlanItemEditorModel_initializer( config ) {
                    var self = this;
                    self.initCheckupPlanItemEditorModel( config );
                },
                destructor: function CheckupPlanItemEditorModel_destructor() {
                    var self = this;
                    if ( self.subscribeCompletedFormat ) { self.subscribeCompletedFormat.dispose(); }
                },
                initCheckupPlanItemEditorModel: function CheckupPlanItemEditorModel_initCheckupPlanItemEditorModel( /* config */ ) {
                    var
                        self = this;

                    self.plannedDates = ko.computed( function() {
                        var
                            plannedFrom = unwrap( self.plannedFrom ),
                            plannedTo = unwrap( self.plannedTo );

                        if ( self.stage && 'U1' === unwrap( self.stage ) ) {
                            return '' +
                                i18n( 'activity-schema.CheckupPlanItem_T.plannedFrom.i18n' ) + ': ' +
                                moment( plannedFrom ).format( TIMESTAMP_FORMAT );
                        }

                        return '' +
                            i18n( 'activity-schema.CheckupPlanItem_T.plannedFrom.i18n' ) + ': ' +
                            moment( plannedFrom ).format( TIMESTAMP_FORMAT ) + ' ' +
                            i18n( 'activity-schema.CheckupPlanItem_T.plannedTo.i18n' ) + ': ' +
                            moment( plannedTo ).format( TIMESTAMP_FORMAT );
                    } );

                    self.toleranceDates = ko.computed( function() {
                        var
                            toleranceFrom = unwrap( self.toleranceFrom ),
                            toleranceTo = unwrap( self.toleranceTo );

                        if ( self.stage && 'U1' === unwrap( self.stage ) ) {
                            return '' +
                                i18n( 'activity-schema.CheckupPlanItem_T.plannedFrom.i18n' ) + ': ' +
                                moment( toleranceFrom ).format( TIMESTAMP_FORMAT );
                        }

                        return '' +
                            i18n( 'activity-schema.CheckupPlanItem_T.toleranceFrom.i18n' ) + ': ' +
                            moment( toleranceFrom ).format( TIMESTAMP_FORMAT ) + ' ' +
                            i18n( 'activity-schema.CheckupPlanItem_T.toleranceTo.i18n' ) + ': ' +
                            moment( toleranceTo ).format( TIMESTAMP_FORMAT );
                    } );

                    self.stage.disabled = true;
                    self.plannedDates.disabled = true;
                    self.toleranceDates.disabled = true;

                    //  Add a formatted, editable version of the completed date
                    self.completedFormat = ko.observable( '' );
                    if ( self.completed && self.completed() ) {
                        self.completedFormat( moment( self.completed() ).format( TIMESTAMP_FORMAT ) );
                    }

                    self.subscribeCompletedFormat = self.completedFormat.subscribe( function( newValue ) {
                        self.completed( moment( newValue, TIMESTAMP_FORMAT ).format() );
                        remapExamsInForm( self.get( 'binder' ) );
                    } );

                }
            },
            {
                schemaName: 'v_checkupplan.examinations',
                NAME: 'CheckupPlanItemEditorModel'
            }
        );
        KoViewModel.registerConstructor( CheckupPlanItemEditorModel );

        /**
         * @class CheckupPlanEditorModel
         * @constructor
         * @param {Object} config
         * @extends ActivityEditorModel
         */
        function CheckupPlanEditorModel( config ) {
            CheckupPlanEditorModel.superclass.constructor.call( this, config );
        }

        CheckupPlanEditorModel.ATTRS = {
            whiteList: {
                value: SimpleActivityEditorModel.ATTRS.whiteList.value.concat( [ 'mdValue', 'mdUnit', 'examinations' ] ),
                lazyAdd: false
            },
            subModelsDesc: {
                value: [
                    {
                        timestamp: 'timestamp',
                        propName: 'examinations',
                        editorName: 'CheckupPlanItemEditorModel'
                    } ],
                lazyAdd: false
            }

        };

        Y.extend( CheckupPlanEditorModel, SimpleActivityEditorModel, {
                /**
                 * Enables "caretPosition" for "userContent"
                 * @protected
                 * @property useUserContentCaretPosition
                 * @type {Boolean}
                 * @default true
                 */

                useUserContentCaretPosition: true,
                dobFormatted: null,
                patientAgeFormatted: null,
                startDateFormatted: null,

                initializer: function CheckupPlanEditorModel_initializer() {
                    var
                        self = this;

                    self.initDashboard();
                    self.initCheckupPlanEditorModel();
                    self.createDefaultEntries();
                },

                destructor: function CheckupPlanEditorModel_destructor() {
                },

                customOptionsMapper: function __customOptionsMapper( item ) {
                    return {
                        id: item,
                        text: item
                    };
                },

                initDashboard: function __initDashboard() {
                    var
                        self = this,
                        binder = self.get( 'binder' ),
                        currentPatient = unwrap( binder.currentPatient ),
                        currentActivity = unwrap( binder.currentActivity );

                    self.notesI18n = i18n( 'InCaseMojit.MedDataEditorModel_clientJS.notes' );
                    self.recreateI18n = i18n('InCaseMojit.CheckupPlanEditorModel.RECREATE');
                    self.startDateI18n = i18n('InCaseMojit.CheckupPlanEditorModel.START_DATE');
                    self.bornI18n = i18n('InCaseMojit.CheckupPlanEditorModel.BORN');
                    self.ageI18n = i18n('InCaseMojit.CheckupPlanEditorModel.AGE');
                    self.ageWhenCreatedI18n = i18n('InCaseMojit.CheckupPlanEditorModel.AGE_WHEN_CREATED');

                    self.disableDashInputs = ko.observable( true );
                    self.showRegenerateButton = ko.computed( function() {
                        return currentActivity._isEditable();
                    } );

                    self.dobFormatted = ko.computed( function() {
                        var patientDob = unwrap( currentPatient.dob );
                        return moment( patientDob ).format( TIMESTAMP_FORMAT );
                    } );

                    self.startDateFormatted = ko.computed( function() {
                        var activityTimestamp = unwrap( currentActivity.timestamp );
                        return moment( activityTimestamp ).format( TIMESTAMP_FORMAT )  ;
                    } );

                    //  patient age when the process was started
                    self.patientAgeFormatted = ko.computed( function() {
                        var
                            patientDob = unwrap( currentPatient.dob ),
                            activityTimestamp = unwrap( currentActivity.timestamp );

                        return Y.doccirrus.schemas.patient.ageFromDob( patientDob, activityTimestamp );
                    } );

                    //  patient age right now
                    self.patientCurrentAgeFormatted = ko.computed( function() {
                        var
                            patientDob = unwrap( currentPatient.dob ),
                            currentDate = moment();
                        return Y.doccirrus.schemas.patient.ageFromDob( patientDob, currentDate );
                    } );
                },

                /**
                 *  Discard and recreate the schedule given new start date
                 *  ( keep any recorded dates already entered )
                 *  Called by button
                 */

                regenerateSchedule: function __regenerateSchedule() {
                    var
                        self = this,
                        binder = self.get( 'binder' ),
                        currentActivity = unwrap( binder.currentActivity ),
                        currentPatient = unwrap( binder.currentPatient );

                    if ( !currentActivity._isEditable() ) { return; }
                    currentActivity.createDefaultEntries( currentPatient.dob() );
                    remapExamsInForm( self.get( 'binder' ) );
                },

                createDefaultEntries: function __createDefaultEntries() {
                    var
                        self = this,
                        binder = self.get( 'binder' ),
                        currentActivity = unwrap( binder.currentActivity ),
                        currentPatient = unwrap( binder.currentPatient );

                    if ( !currentActivity.examinations || 0 === currentActivity.examinations().length ) {

                        if ( currentPatient && currentPatient.dob && currentPatient.dob() ) {
                            Y.log( 'Creating default infant examination schedule, dob: ' + currentPatient.dob(), 'debug', NAME );
                            currentActivity.createDefaultEntries( currentPatient.dob() );
                            remapExamsInForm( self.get( 'binder' ) );
                        } else {
                            //  should not happen
                            Y.log( 'Missing current patient DOB, cannot initialize checkup schedule', 'warn', NAME );
                        }

                    }

                },

                initCheckupPlanEditorModel: function CheckupPlanEditorModel_initCheckupPlanEditorModel() {
                    var
                        self = this,
                        binder = self.get( 'binder' ),
                        currentActivity = peek( binder.currentActivity );

                    self.examinationsEditableTable = KoComponentManager.createComponent( {
                        componentType: 'KoEditableTable',
                        stateId: 'examinationsEditorModel-EditableTable',
                        componentConfig: {
                            ViewModel: CheckupPlanItemEditorModel,
                            data: self.examinations,
                            columns: [
                                {
                                    forPropertyName: 'stage',
                                    label: i18n( 'activity-schema.CheckupPlanItem_T.stage.i18n' ),
                                    title: i18n( 'activity-schema.CheckupPlanItem_T.stage.i18n' )
                                },
                                {
                                    forPropertyName: 'plannedDates',
                                    label: i18n( 'activity-schema.CheckupPlanItem_T.plannedDates.i18n' ),
                                    title: i18n( 'activity-schema.CheckupPlanItem_T.plannedDates.i18n' )
                                },
                                {
                                    forPropertyName: 'toleranceDates',
                                    label: i18n( 'activity-schema.CheckupPlanItem_T.toleranceDates.i18n' ),
                                    title: i18n( 'activity-schema.CheckupPlanItem_T.toleranceDates.i18n' )
                                },
                                {
                                    forPropertyName: 'completedFormat',
                                    label: i18n( 'activity-schema.CheckupPlanItem_T.completed.i18n' ),
                                    title: i18n( 'activity-schema.CheckupPlanItem_T.completed.i18n' ),
                                    disabled: !currentActivity._isEditable(),
                                    getComponentForCell: function( /* meta */ ) {
                                        return {
                                            componentType: 'KoSchemaValue',
                                            valueFormat: 'DD.MM.YYYY',
                                            componentConfig: {
                                                valueFormat: 'DD.MM.YYYY',
                                                fieldType: 'Date',
                                                showLabel: false,
                                                useIsoDate: false
                                            }
                                        };
                                    }
                                }
                            ],
                            isAddRowButtonDisabled: function __isAddRowButtonDisabled() {
                                return true;
                            }
                        }
                    } );

                    self.examinationsEditableTable.rendered.subscribe( function __examinationstable_subscribe_render( val ) {
                        if( true === val ) {
                            KoEditableTable.tableNavigation( document.querySelector( '#examinationsEditableTable' ) );
                        }
                    } );

                },

                //  TODO: rename addExamination, may be able to remove this
                addCheckupPlanItem: function __addCheckupPlanItem( data ) {
                    var
                        self = this,
                        currentActivity = peek( self.get( 'currentActivity' ) );

                    currentActivity.addCheckupPlanItem( data );
                },
                //  TODO: rename removeExamination, may be able to remove this
                removeCheckupPlanItem: function __removeCheckupPlanItem( data ) {
                    var
                        self = this,
                        currentActivity = peek( self.get( 'currentActivity' ) );

                    currentActivity.removeCheckupPlanItem( data.get( 'dataModelParent' ) );
                },

                onInfoAgeClick: function() {
                    var self = this;
                    Y.doccirrus.DCWindow.notice( {
                        message: self.ageWhenCreatedI18n
                    } );
                }

            }, {
                NAME: 'CheckupPlanEditorModel'
            }
        );

        KoViewModel.registerConstructor( CheckupPlanEditorModel );


    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'SimpleActivityEditorModel',
            'SubEditorModel',
            'activity-schema'
        ]
    }
);
