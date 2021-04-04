/**
 * User: strix
 * Date: 11/12/17
 * (c) 2017, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'GravidogrammEditorModel', function( Y ) {
        /**
         * @module GravidogrammEditorModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            MedDataEditorModel = KoViewModel.getConstructor( 'MedDataEditorModel' ),
            i18n = Y.doccirrus.i18n;

        /**
         * @class GravidogrammEditorModel
         * @constructor
         * @extends ActivityEditorModel
         */
        function GravidogrammEditorModel( config ) {
            GravidogrammEditorModel.superclass.constructor.call( this, config );
        }

        GravidogrammEditorModel.ATTRS = {
            whiteList: {
                value: MedDataEditorModel.ATTRS.whiteList.value.concat( [
                    'userContent',
                    'fetuses',
                    'initialWeight',
                    'pelvicMeasurementSP25',
                    'pelvicMeasurementCR28',
                    'pelvicMeasurementTR31',
                    'pelvicMeasurementC20',
                    'rubellaTiter',
                    'antibody1',
                    'antibody2',
                    'HBsAg',
                    'syphillis',
                    'toxoplasmosis',
                    'HIV',
                    'chlamidia',
                    'glucoseTolerance'
                ] ),
                lazyAdd: false
            },
            subModelsDesc: {
                value: [
                    {
                        propName: 'medData',
                        editorName: 'GravidogrammEditorModel'
                    }],
                lazyAdd: false
            }
        };

        Y.extend( GravidogrammEditorModel, MedDataEditorModel, {
                useUserContentCaretPosition: true,
                initializer: function GravidogrammEditorModel_initializer() {
                    var
                        self = this;
                    self.initGravidogrammEditorModel();

                },
                destructor: function GravidogrammEditorModel_destructor() {
                },
                /**
                 * Initializes assistive editor model
                 * @method initGravidogrammEditorModel
                 */
                initGravidogrammEditorModel: function GravidogrammEditorModel_initGravidogrammEditorModel() {
                    var
                        self = this,
                        binder = self.get( 'binder' ),
                        currentActivity = ko.unwrap( binder.currentActivity );

                    //  subscribe to number of fetuses, KO dropdown may return a string, ensure it is an integer
                    self.subscribeToFetuses = self.fetuses.subscribe( function( newVal ) {
                        if ( 'string' === typeof newVal ) {
                            self.fetuses( parseInt( newVal, 10 ) );
                        }
                    } );

                    self.fetusesI18n = i18n( 'activity-schema.Gravidogramm_T.fetuses.i18n' );
                    self.pelvicMeasurementSP25I18n = i18n( 'activity-schema.Gravidogramm_T.pelvicMeasurementSP25.i18n' );
                    self.pelvicMeasurementCR28I18n = i18n( 'activity-schema.Gravidogramm_T.pelvicMeasurementCR28.i18n' );
                    self.pelvicMeasurementTR31I18n = i18n( 'activity-schema.Gravidogramm_T.pelvicMeasurementTR31.i18n' );
                    self.pelvicMeasurementC20I18n = i18n( 'activity-schema.Gravidogramm_T.pelvicMeasurementC20.i18n' );

                    self.isNew = ko.computed( function() {
                        return currentActivity.isNew();
                    } );

                    self.listenForuserContent = self.userContent.subscribe( function( newValue ) {
                        var
                            currentView = ko.unwrap( binder.currentView ),
                            activityDetailsVM = ko.unwrap( currentView.activityDetailsViewModel ),
                            template = activityDetailsVM.template;

                        if ( template && template.isMapped ) {
                            template.map( { 'userContent': newValue }, false, Y.dcforms.nullCallback );
                        }
                    } );

                }
            }, {
                NAME: 'GravidogrammEditorModel'
            }
        );

        KoViewModel.registerConstructor( GravidogrammEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'ActivityEditorModel',
            'dckbvutils',
            'inCaseUtils'
        ]
    }
);
