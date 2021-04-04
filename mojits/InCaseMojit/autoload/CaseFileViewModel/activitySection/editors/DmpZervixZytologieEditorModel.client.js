/**
 * User: florian
 * Date: 21.10.20  16:07
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko*/
YUI.add( "DmpZervixZytologieEditorModel", function( Y ) {
        'use strict';
        /**
         * @module DmpZervixZytologieEditorModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            unwrap = ko.unwrap,
            ActivityEditorModel = KoViewModel.getConstructor( 'ActivityEditorModel' ),
            i18n = Y.doccirrus.i18n;

        function DmpZervixZytologieEditorModel( config ) {
            DmpZervixZytologieEditorModel.superclass.constructor.call( this, config );
        }

        DmpZervixZytologieEditorModel.ATTRS = {
            whiteList: {
                value: [
                    'dmpExaminationDate',
                    'dmpPrimaryFinding',
                    'dmpZytologicalFinding',
                    'dmpZytologicalFindingSelection',
                    'dmpHistologicalClarification',
                    'dmpHistologicalClarificationSelection',
                    'dmpMedicalPracticeSpecialty',
                    'dmpPhysicianCommercialNumber',
                    'dmpPhysicianName'
                ],
                lazyAdd: false
            }
        };


        Y.extend( DmpZervixZytologieEditorModel, ActivityEditorModel, {
            initializer: function DmpZervixZytologieEditorModel_initializer() {
                var
                    self = this;

                self.initDmpZervixZytologieEditorModel();
            },
            destructor: function DmpZervixZytologieEditorModel_destructor() {

            },
            /**
             * Initializes DMP Zervix Zytologie editor model
             * @method initDmpZervixZytologieEditorModel
             */
            initDmpZervixZytologieEditorModel: function initDmpZervixZytologieEditorModel() {
                var
                    self = this;

                self.isIndividualZytologicalFinding = ko.observable( false );
                self.isHistologicalClarification = ko.observable( false );
                self.summaryFinding = ko.observable( self.labelFindingDefault );

                self.labelBSNR = i18n( 'InCaseMojit.casefile_detail.label.BSNR' );
                self.labelPhysicianName = i18n( 'InCaseMojit.DmpEditorModel.label.employeeName' );
                self.labelExaminationDate = i18n( 'InCaseMojit.DmpEditorModel.section.examinationDate.label' );
                self.labelPrimaryFinding = i18n( 'InCaseMojit.DmpEditorModel.section.primaryFinding.label' );
                self.labelZytologicalFinding = i18n( 'activity-schema.ZervixZytologie_T.dmpZytologicalFinding_E.i18n' );
                self.labelMedicalPracticeSpecialty = i18n( 'activity-schema.ZervixZytologie_T.dmpMedicalPracticeSpecialty.i18n' );
                self.labelHistologicalClarification = i18n( 'activity-schema.DmpHistologicalClarification.i18n' );
                self.labelFinding = i18n( 'activity-schema.DmpZytologicalFinding_E.finding.i18n' );

                self.findingDefaultValue = i18n( 'activity-schema.DmpZytologicalFinding_E.unusable.i18n' );

                self.mixinData = {};
                self.mixinData.labelZytologicalFinding = i18n( 'InCaseMojit.DmpEditorModel.section.zytologicalFinding.label' );
                self.mixinData.labelSummary = i18n( 'InCaseMojit.DmpEditorModel.label.summary' );

                self.addDisposable( ko.computed( function() {
                    var
                        dmpZytologicalFinding = unwrap( self.dmpZytologicalFinding );

                    if( dmpZytologicalFinding === 'unusable' ) {
                        self.isIndividualZytologicalFinding( false );
                        self.summaryFinding( self.findingDefaultValue );

                    } else if( dmpZytologicalFinding === 'finding' ) {
                        self.isIndividualZytologicalFinding( true );
                        self.summaryFinding( self.dmpZytologicalFindingSelection() );
                    }
                } ) );
            }
        }, {
            NAME: 'DmpZervixZytologieEditorModel'
        } );

        KoViewModel.registerConstructor( DmpZervixZytologieEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'ActivityEditorModel',
            'merge-modal',
            'edmp-commonutils'
        ]
    }
);
