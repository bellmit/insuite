/**
 * User: pi
 * Date: 10/12/15  14:25
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI */

'use strict';

YUI.add( 'HealthSurveyEditorModel', function( Y ) {
        /**
         * @module HealthSurveyEditorModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            ActivityEditorModel = KoViewModel.getConstructor( 'ActivityEditorModel' ),
            mixin = Y.doccirrus.api.activity.getFormBasedActivityAPI(),
            actTypes = Y.doccirrus.schemas.activity.types;

        /**
         * @class HealthSurveyEditorModel
         * @constructor
         * @extends ActivityEditorModel
         */
        function HealthSurveyEditorModel( config ) {
            HealthSurveyEditorModel.superclass.constructor.call( this, config );
        }

        HealthSurveyEditorModel.ATTRS = {
            whiteList: {
                value: [
                    'userContent',
                    'insuranceType',
                    'ageGroup',
                    'surveySex',
                    'repeatedExam',
                    'hypertonia',
                    'coronalHeartDisease',
                    'otherArterialClosure',
                    'diabetesMellitus',
                    'hyperlipidemia',
                    'kidneyDiseases',
                    'lungDiseases',
                    'nicotineAbuse',
                    'chronicEmotionalStressFactor',
                    'sedentaryLifestyle',
                    'adipositas',
                    'alcoholAbuse'
                ],
                lazyAdd: false
            }
        };

        Y.extend( HealthSurveyEditorModel, ActivityEditorModel, {
                /**
                 * Enables "caretPosition" for "userContent"
                 * @protected
                 * @property useUserContentCaretPosition
                 * @type {Boolean}
                 * @default true
                 */
                useUserContentCaretPosition: true,
                initializer: function HealthSurveyEditorModel_initializer() {
                    var
                        self = this;
                    self.initHealthSurveyEditorModel();

                },
                destructor: function HealthSurveyEditorModel_destructor() {
                },
                initHealthSurveyEditorModel: function HealthSurveyEditorModel_initHealthSurveyEditorModel() {

                },
                insuranceTypes: actTypes.insuranceType_E.list,
                ageGroups: actTypes.AgeGroup_E.list,
                SurveyAnamneses: actTypes.SurveyAnamnesis_E.list
            }, {
                NAME: 'HealthSurveyEditorModel'
            }
        );
    
        Y.mix( HealthSurveyEditorModel, mixin, false, Object.keys( mixin ), 4 );
        KoViewModel.registerConstructor( HealthSurveyEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'ActivityEditorModel']
    }
)
;
