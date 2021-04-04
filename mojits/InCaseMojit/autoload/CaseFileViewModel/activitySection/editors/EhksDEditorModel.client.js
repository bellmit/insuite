/**
 * User: do
 * Date: 02/11/17  13:55
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'EhksDEditorModel', function( Y ) {
        'use strict';
        /**
         * @module EhksDEditorModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            ActivityEditorModel = KoViewModel.getConstructor( 'ActivityEditorModel' ),
            i18n = Y.doccirrus.i18n;

        /**
         * @class EhksDEditorModel
         * @constructor
         * @extends ActivityEditorModel
         */
        function EhksDEditorModel( config ) {
            EhksDEditorModel.superclass.constructor.call( this, config );
        }

        EhksDEditorModel.ATTRS = {
            whiteList: {
                value: [
                    'timestamp',
                    'employeeOfficialNo',
                    'locationCommercialNo',
                    'hasAdditionalContract',
                    'patientDob',
                    'patientAge',
                    'renderPatientDob',
                    'displayPatientGender',
                    'patientInsuranceName',
                    'patientInsuranceId',
                    'dmpSignatureDate',
                    // create base editor for stuff above?

                    'hksHasReferral',
                    'hksReferralPhysicianPerformedHKS',

                    'hksHasSuspectedDiag',
                    'hksMalignesMelanom',
                    'hksBasalzellkarzinom',
                    'hksSpinozelluläresKarzinom',
                    'hksOtherSkinCancer',

                    'hksSuspectedDiagnosisD',
                    'hksMalignesMelanomDermatologists',
                    'hksBasalzellkarzinomDermatologists',
                    'hksSpinozelluläresKarzinomDermatologists',
                    'hksOtherSkinCancerD',
                    'hksOthersWithBiopsyInNeedOfClarificationFindings',
                    'hksBiopsieOrExzision',
                    'hksNumberOfBiopsiesTaken',
                    'hksOtherwiseInitiatedOrInitiatedTherapyOrDiagnostics',
                    'hksCurrentlyNoFurtherTherapyOrDiagnostics',
                    'hksMalignesMelanomHistopathologie',
                    'hksMalignesMelanomClassification',
                    'hksMalignesMelanomTumorThickness',
                    'hksBasalzellkarzinomHistopathologie',
                    'hksBasalzellkarzinomHorizontalTumorDiameterClinical',
                    'hksBasalzellkarzinomVerticalTumorDiameterHistological',
                    'hksSpinozelluläresKarzinomHistopathologie',
                    'hksSpinozelluläresKarzinomClassification',
                    'hksSpinozelluläresKarzinomGrading',

                    'hksOtherSkinCancerHistopathologie',
                    'hksAtypicalNevusCellNevus',
                    'hksJunctionalCompoundDermalAtypicalNevusCellNevus',
                    'hksActinicKeratosis',
                    'hksOtherSkinChangeNotRelevantHere'

                ],
                lazyAdd: false
            }
        };

        Y.extend( EhksDEditorModel, ActivityEditorModel, {
                initializer: function DmpDmEditor_initializer() {
                    var
                        self = this;
                    self.initEhksDEditorModel();
                },
                destructor: function DmpDmEditor_destructor() {
                },
                initEhksDEditorModel: function EhksDEditorModel_initEhksDEditorModel() {
                    var
                        self = this;

                    self.labelLanrI18n = i18n( 'InCaseMojit.casefile_detail.label.LANR' );
                    self.labelBSNRI18n = i18n( 'InCaseMojit.casefile_detail.label.BSNR' );
                    self.kbvDobI18n = i18n( 'person-schema.Person_T.kbvDob' );
                    self.genderI18n = i18n( 'patient-schema.Gender_E.i18n' );
                    self.insuranceNameI18n = i18n( 'person-schema.InsuranceStatus_T.insuranceName' );
                    self.insuranceIdI18n = i18n( 'person-schema.InsuranceStatus_T.insuranceId' );
                    self.sectionDI18n = i18n( 'InCaseMojit.Ehjks.section.D' );
                    self.helpTextDI18n = i18n( 'InCaseMojit.Ehjks.helpText.D' );
                    self.hksHasReferralI18n = i18n( 'activity-schema.Activity_T.hksHasReferral.i18n' );
                    self.hksReferralPhysicianPerformedHKSI18n = i18n( 'activity-schema.Activity_T.hksReferralPhysicianPerformedHKS.i18n' );
                    self.hksSuspectedDiagnosisDI18n = i18n( 'activity-schema.Activity_T.hksSuspectedDiagnosisD.i18n' );
                    self.hksMalignesMelanomI18n = i18n( 'activity-schema.Activity_T.hksMalignesMelanom.i18n' );
                    self.hksBasalzellkarzinomI18n = i18n( 'activity-schema.Activity_T.hksBasalzellkarzinom.i18n' );
                    self.hksSpinozellularesKarzinomI18n = i18n( 'activity-schema.Activity_T.hksSpinozelluläresKarzinom.i18n' );
                    self.hksOtherSkinCancerI18n = i18n( 'activity-schema.Activity_T.hksOtherSkinCancer.i18n' );
                    self.hksHasSuspectedDiagI18n = i18n( 'activity-schema.Activity_T.hksHasSuspectedDiag.i18n' );
                    self.hksOthersWithBiopsyInNeedOfClarificationFindingsI18n = i18n( 'activity-schema.Activity_T.hksOthersWithBiopsyInNeedOfClarificationFindings.i18n' );
                    self.hksBiopsieOrExzisionI18n = i18n( 'activity-schema.Activity_T.hksBiopsieOrExzision.i18n' );
                    self.hksNumberOfBiopsiesTakenI18n = i18n( 'activity-schema.EHKS_D_T.hksNumberOfBiopsiesTaken.i18n' );
                    self.hksOtherwiseInitiatedOrInitiatedTherapyOrDiagnosticsI18n = i18n( 'activity-schema.Activity_T.hksOtherwiseInitiatedOrInitiatedTherapyOrDiagnostics.i18n' );
                    self.hksCurrentlyNoFurtherTherapyOrDiagnosticsI18n = i18n( 'activity-schema.Activity_T.hksCurrentlyNoFurtherTherapyOrDiagnostics.i18n' );
                    self.mustBeDocumentedI18n = i18n( 'InCaseMojit.EhjksD.hint.MOST_FATAL_INDICATION_MUST_BE_DOCUMENTED' );
                    self.hksMalignesMelanomHistopathologieI18n = i18n( 'activity-schema.Activity_T.hksMalignesMelanomHistopathologie.i18n' );
                    self.hksMalignesMelanomTumorThicknessI18n = i18n( 'activity-schema.Activity_T.hksMalignesMelanomTumorThickness.i18n' );
                    self.hksMalignesMelanomClassificationI18n = i18n( 'activity-schema.Activity_T.hksMalignesMelanomClassification.i18n' );
                    self.hksBasalzellkarzinomHistopathologieI18n = i18n( 'activity-schema.Activity_T.hksBasalzellkarzinomHistopathologie.i18n' );
                    self.hksBasalzellkarzinomHorizontalTumorDiameterClinicalI18n = i18n( 'activity-schema.Activity_T.hksBasalzellkarzinomHorizontalTumorDiameterClinical.i18n' );
                    self.hksBasalzellkarzinomVerticalTumorDiameterHistologicalI18n = i18n( 'activity-schema.Activity_T.hksBasalzellkarzinomVerticalTumorDiameterHistological.i18n' );
                    self.hksSpinozellularesKarzinomHistopathologieI18n = i18n( 'activity-schema.Activity_T.hksSpinozelluläresKarzinomHistopathologie.i18n' );
                    self.hksSpinozellularesKarzinomClassificationI18n = i18n( 'activity-schema.Activity_T.hksSpinozelluläresKarzinomClassification.i18n' );
                    self.hksSpinozellularesKarzinomGradingI18n = i18n( 'activity-schema.Activity_T.hksSpinozelluläresKarzinomGrading.i18n' );

                    self.hksAtypicalNevusCellNevusI18n = i18n( 'activity-schema.Activity_T.hksAtypicalNevusCellNevus.i18n' );
                    self.hksJunctionalCompoundDermalAtypicalNevusCellNevusI18n = i18n( 'activity-schema.Activity_T.hksJunctionalCompoundDermalAtypicalNevusCellNevus.i18n' );
                    self.hksActinicKeratosisI18n = i18n( 'activity-schema.Activity_T.hksActinicKeratosis.i18n' );
                    self.hksOtherSkinChangeNotRelevantHereI18n = i18n( 'activity-schema.Activity_T.hksOtherSkinChangeNotRelevantHere.i18n' );

                    self.mixinData = {};
                    self.mixinData.patientHasHKSReferalLabelI18n = i18n( 'InCaseMojit.EhjksD.section.PATIENT_HAS_HKS_REFERRAL' );
                    self.mixinData.hasSuspectedDiagFromDermatologistLabelI18n = i18n( 'InCaseMojit.EhjksD.section.HAS_SUSPECTED_DIAG_FROM_DERMATOLOGISTS' );
                    self.mixinData.hasSuspectedDiagFromReferrerLabelI18n = i18n( 'InCaseMojit.EhjksD.section.HAS_SUSPECTED_DIAG_FROM_REFERRER' );
                    self.mixinData.biopsieExzisionLabelI18n = i18n( 'InCaseMojit.EhjksD.section.BIOPSIE_EXZISION' );
                    self.mixinData.histoPathologyLabelI18n = i18n( 'InCaseMojit.EhjksD.section.HISTOPATHOLOGY' );


                    self.addDisposable( ko.computed( function() {
                        self.hksHasReferral();
                        self.hksHasSuspectedDiag.validate();
                    } ) );
                    self.addDisposable( ko.computed( function() {
                        self.hksHasSuspectedDiag();
                        self.hksMalignesMelanom.validate();
                        self.hksBasalzellkarzinom.validate();
                        self.hksSpinozelluläresKarzinom.validate();
                    } ) );

                    self.version_2_3_2 = ko.computed( function() {
                        var timestamp = self.timestamp();
                        return Y.doccirrus.edmpcommonutils.isAfterTimestampQ( timestamp, Y.doccirrus.edmpcommonutils.EHKS_V2_3_2_LAST_QUARTER );
                    } );

                    self.histopathologyPanelDisabled = ko.computed( function() {
                        var hksBiopsieOrExzision = self.hksBiopsieOrExzision(),
                            version_2_3_2 = self.version_2_3_2();
                        hksBiopsieOrExzision = hksBiopsieOrExzision && hksBiopsieOrExzision[0];
                        return !version_2_3_2 && 'NO' === hksBiopsieOrExzision;
                    } );

                    self.addDisposable( ko.computed( function() {
                        var hksBasalzellkarzinomHorizontalTumorDiameterClinical = self.hksBasalzellkarzinomHorizontalTumorDiameterClinical(),
                            num = hksBasalzellkarzinomHorizontalTumorDiameterClinical && Y.doccirrus.comctl.stringToNumber( hksBasalzellkarzinomHorizontalTumorDiameterClinical, ',' );
                        if( !num ) {
                            return;
                        }
                        self.hksBasalzellkarzinomHorizontalTumorDiameterClinical( Y.doccirrus.comctl.numberToLocalString( num, {decimals: 1} ) );
                    } ).extend( {rateLimit: {timeout: 500, method: "notifyWhenChangesStop"}} ) );

                    self.addDisposable( ko.computed( function() {
                        var hksBasalzellkarzinomVerticalTumorDiameterHistological = self.hksBasalzellkarzinomVerticalTumorDiameterHistological(),
                            num = hksBasalzellkarzinomVerticalTumorDiameterHistological && Y.doccirrus.comctl.stringToNumber( hksBasalzellkarzinomVerticalTumorDiameterHistological, ',' );
                        if( !num ) {
                            return;
                        }
                        self.hksBasalzellkarzinomVerticalTumorDiameterHistological( Y.doccirrus.comctl.numberToLocalString( num, {decimals: 1} ) );
                    } ).extend( {rateLimit: {timeout: 500, method: "notifyWhenChangesStop"}} ) );

                    self.addDisposable( ko.computed( function() {
                        self.hksBiopsieOrExzision();
                        self.hksMalignesMelanomHistopathologie();
                        self.hksMalignesMelanomClassification.validate();
                        self.hksMalignesMelanomTumorThickness.validate();
                    } ) );

                    self.addDisposable( ko.computed( function() {
                        self.hksBiopsieOrExzision();
                        self.hksBasalzellkarzinomHistopathologie();
                        self.hksBasalzellkarzinomHistopathologie.validate();
                        self.hksBasalzellkarzinomHorizontalTumorDiameterClinical.validate();
                        self.hksBasalzellkarzinomVerticalTumorDiameterHistological.validate();
                    } ) );

                    self.addDisposable( ko.computed( function() {
                        self.hksBiopsieOrExzision();
                        self.hksSpinozelluläresKarzinomHistopathologie();
                        self.hksSpinozelluläresKarzinomHistopathologie.validate();
                        self.hksSpinozelluläresKarzinomClassification.validate();
                        self.hksSpinozelluläresKarzinomGrading.validate();
                    } ) );


                }
            }, {
                NAME: 'EhksDEditorModel'
            }
        );

        KoViewModel.registerConstructor( EhksDEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'ActivityEditorModel'
        ]
    }
);
