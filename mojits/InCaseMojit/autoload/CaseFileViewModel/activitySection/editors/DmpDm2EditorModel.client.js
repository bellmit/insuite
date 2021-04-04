/**
 * User: do
 * Date: 21/04/16  16:16
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'DmpDm2EditorModel', function( Y ) {
        'use strict';
        /**
         * @module DmpDm2EditorModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            eDmpHelpers = Y.doccirrus.edmpcommonutils,
            i18n = Y.doccirrus.i18n,
            peek = ko.utils.peekObservable,
            DmpDmEditorModel = KoViewModel.getConstructor( 'DmpDmEditorModel' );

        /**
         * @class DmpDm2EditorModel
         * @constructor
         * @extends DmpDmEditorModel
         */
        function DmpDm2EditorModel( config ) {
            DmpDm2EditorModel.superclass.constructor.call( this, config );
        }

        DmpDm2EditorModel.ATTRS = {
            whiteList: {
                value: DmpDmEditorModel.ATTRS.whiteList.value.concat( [
                    'dmpInsulin',
                    'dmpGlibenclamide',
                    'dmpMetformin',
                    'dmpOtherOralAntiDiabetic'
                ] ),
                lazyAdd: false
            }
        };

        Y.extend( DmpDm2EditorModel, DmpDmEditorModel, {
                initializer: function DmpDmEditor_initializer() {
                    var
                        self = this;
                    self.initDmpDm2EditorModel();
                },
                destructor: function DmpDmEditor_destructor() {
                },
                /**
                 * Initializes DMP DM editor model
                 * @method initDmpDm2EditorModel
                 */
                initDmpDm2EditorModel: function DmpDm2EditorModel_initDmpDm2EditorModel() {
                    var
                        self = this;

                    self.mixinData = {};
                    self.mixinData.anamnesisAndFindingLabelI18n = i18n( 'InCaseMojit.DmpEditorModel.section.anamnesisAndFinding.label' );
                    self.mixinData.relevantEventsLabelI18n = i18n( 'InCaseMojit.DmpEditorModel.section.relevantEvents.label' );
                    self.mixinData.medicationLabelI18n = i18n( 'InCaseMojit.DmpEditorModel.section.medication.label' );
                    self.mixinData.trainingLabelI18n = i18n( 'InCaseMojit.DmpEditorModel.section.training.label' );
                    self.mixinData.treatmentPlanningLabelI18n = i18n( 'InCaseMojit.DmpEditorModel.section.treatmentPlanning.label' );

                    self.initDmpOptional();
                },
                initDmpOptional: function() {

                    var self = this,
                        actType = peek( self.actType ),
                        patient = peek( self.get( 'currentPatient' ) ).toJSON(),
                        isFootStatusOptional = !eDmpHelpers.isOlderThan( patient, peek( self.dmpHeadDate ), 18 ),
                        hintLevel = isFootStatusOptional ? 'OPTIONAL' : null;

                    self.dmpFootStatusText.hintLevel = hintLevel;
                    self.dmpPulsStatus.hintLevel = hintLevel;
                    self.dmpSensitivityTesting.hintLevel = hintLevel;

                    self.dmpFurtherRiskUlcus.hintLevel = hintLevel;
                    self.dmpUlkus.hintLevel = hintLevel;
                    self.dmpWoundInfection.hintLevel = hintLevel;
                    self.dmpIntervalFutureFootInspections.hintLevel = hintLevel;

                    self.dmpInjectionSites.hintLevel = ko.computed( function() {
                        var insulinVal = self.dmpInsulin && self.dmpInsulin();
                        var isInsulin = insulinVal === 'YES' ? true : false;
                        return eDmpHelpers.isDmpInjectionSitesOptional(actType, isInsulin) ? 'OPTIONAL' : null;
                    } );

                }
            }, {
                NAME: 'DmpDm2EditorModel'
            }
        );

        KoViewModel.registerConstructor( DmpDm2EditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'DmpDmEditorModel',
            'edmp-commonutils'
        ]
    }
);
