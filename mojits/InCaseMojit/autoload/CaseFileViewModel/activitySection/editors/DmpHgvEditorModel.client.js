/**
 * User: oliversieweke
 * Date: 07.03.18  11:48
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */
YUI.add( "DmpHgvEditorModel", function( Y ) {
        'use strict';
        /**
         * @module DmpHgvEditorModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable,
            ActivityEditorModel = KoViewModel.getConstructor( 'ActivityEditorModel' ),
            i18n = Y.doccirrus.i18n,
            AIRLINE = i18n( 'activity-schema.DmpAirLine_E.i18n' ),
            AIRLINE_CHILD = i18n( 'activity-schema.DmpAirLine_E.i18nChild' );

        /**
         * @class DmpHgvEditorModel
         * @constructor
         * @extends DmpEditorModel
         */
        function DmpHgvEditorModel( config ) {
            DmpHgvEditorModel.superclass.constructor.call( this, config );
        }

        DmpHgvEditorModel.ATTRS = {
            whiteList: {
                value: [
                    'dmpType',
                    'renderPatientID',
                    'renderPatientAge',
                    'renderYearOfBirth',
                    'displayPatientGender',
                    'dmpShowOptionalFields',
                    'dmpAge',
                    'dmpExaminationDate',
                    'dmpHearingAidFirstMedication',
                    'dmpFirstMedicationDate',
                    'dmpHearingAidType',
                    'dmpHearingAidTypeOther',
                    'dmpSpeechDevelopmentDisturbance',
                    'dmpSpeechDevelopmentDisturbanceOther',
                    'dmpCentralAuditoryDefectExcluded',
                    'dmpSpeakingTestPossible',
                    'dmpSpeechComprehensionDB',
                    'dmpSpeechComprehensionEZ',
                    'dmpSpeechComprehensionSVS',
                    'dmpSpeechComprehensionMaterial',
                    'dmpSpeechComprehensionMaterialOther',
                    'dmpNoiseReceptionAmblyacousia',
                    'dmpNoiseFlowAmblyacousia',
                    'dmpCombinedAmblyacousia',
                    'dmpAmblyacousiaSeverityLeft',
                    'dmpAmblyacousiaSeverityChildLeft',
                    'dmpAmblyacousiaSeverityRight',
                    'dmpAmblyacousiaSeverityChildRight',
                    'dmpAmblyacousiaSeverityWHO',
                    'dmpFurtherDiagnosis',
                    'dmpFurtherDiagnosisOther',
                    'dmpAirLine',
                    'dmpAirLineOther',
                    'dmpBoneLine',
                    'dmpSpecialMedication',
                    'dmpSpecialMedicationOther',
                    'dmpExaminationDate_following',
                    'dmpMedicationConform',
                    'dmpAirLineAnomaly',
                    'dmpAirLineAnomalyOther',
                    'dmpBoneLineAnomaly',
                    'dmpSpecialMedicationAnomaly',
                    'dmpSpecialMedicationAnomalyOther',
                    'dmpSpeakingTestPossible_following',
                    'dmpSpeechComprehensionFreeFieldEZ',
                    'dmpSpeechComprehensionFreeFieldSVS',
                    'dmpListeningRangeWithoutHG',
                    'dmpListeningRangeWithHG',
                    'dmpAdvantageWithHG',
                    'dmpMedicationForFixedAmount',
                    'dmpHearingAidSuccessDetectable',
                    'dmpHearingAidSuccessMeasurementThrough',
                    'dmpMedicationForFree',
                    'dmpCooperation',
                    'dmpNeedsMergeAcknowledgment'
                ]
            },
            lazyAdd: false
        };


        Y.extend( DmpHgvEditorModel, ActivityEditorModel, {
            initializer: function DmpHgvEditorModel_initializer() {
                var
                    self = this;
                self.initDmpHgvEditorModel();
            },
            destructor: function DmpHgvEditorModel_destructor() {

            },
            /**
             * Initializes DMP HGV editor model
             * @method initDmpHgvEditorModel
             */
            initDmpHgvEditorModel: function DmpHgvEditorModel_initDmpHgvEditorModel() {
                var
                    self = this;

                self.firstI18n = i18n( 'activity-schema.DmpType_E.FIRST.i18n' );
                self.followingI18n = i18n( 'activity-schema.DmpType_E.FOLLOWING.i18n' );
                self.dmpTypeI18n = i18n( 'activity-schema.DmpType_E.PNP.i18n' );
                self.edmpDobI18n = i18n( 'person-schema.Person_T.kbvDob' );
                self.genderI18n = i18n( 'patient-schema.Gender_E.i18n' );
                self.edmpCaseNoI18n = i18n( 'patient-schema.Patient_T.edmpCaseNo.i18n' );
                self.patientAddressI18n = i18n( 'InCaseMojit.DmpEditorModel.label.patientAddress' );
                self.employeeNameI18n = i18n( 'InCaseMojit.DmpEditorModel.label.employeeName' );
                self.employeeAddressI18n = i18n( 'InCaseMojit.DmpEditorModel.label.employeeAddress' );
                self.officialNoI18n = i18n( 'physician-schema.Physician_T.officialNo.i18n' );
                self.insuranceNameI18n = i18n( 'person-schema.InsuranceStatus_T.insuranceName' );
                self.insuranceNoI18n = i18n( 'person-schema.InsuranceStatus_T.insuranceNo' );
                self.insuranceIdI18n = i18n( 'person-schema.InsuranceStatus_T.insuranceId' );
                self.fk4133I18n = i18n( 'person-schema.InsuranceStatus_T.fk4133' );
                self.fk4110I18n = i18n( 'person-schema.InsuranceStatus_T.fk4110' );
                self.insuranceKindI18n = i18n( 'person-schema.InsuranceStatus_T.insuranceKind' );
                self.persGroupI18n = i18n( 'person-schema.InsuranceStatus_T.persGroup' );

                self.hardnessOfHearingI18n = i18n( 'validations.kbv.message.HGV_T_HARDNESS_OF_HEARING_WARN' );
                self.speechUnderstandingI18n = i18n( 'validations.kbv.message.HGV_T_SPEECH_UNDERSTANDING_WARN' );

                self.mixinData = {};
                self.mixinData.registrationLabelI18n = i18n( 'InCaseMojit.DmpEditorModel.section.registration.label' );

                self.mixinData.hearingAidFirstMedicationLabelI18n = i18n( 'InCaseMojit.DmpEditorModel.section.hearingAidFirstMedication.label' );
                self.mixinData.hearingAidExaminationDateLabelI18n = i18n( 'InCaseMojit.DmpEditorModel.section.hearingAidExaminationDate.label' );
                self.mixinData.hearingAidDataI18n = 'Untersuchungsdaten';
                self.mixinData.hearingAidRecognitionI18n = 'Sprachverstehen';
                self.mixinData.hearingAidAmblyacousiaI18n = 'Schwerhörigkeit';
                self.mixinData.hearingAidAmblyacousiaSeverityI18n = 'Schweregrad der Hörstörung';
                self.mixinData.hearingAidAmblyacousiaSeverityWHOI18n = 'Hörstörung';
                self.mixinData.hearingAidAmblyacousiaAidsI18n = 'Vorschlag zur Gerätetechnik';
                self.mixinData.hearingAidTypeLabelI18n = i18n( 'InCaseMojit.DmpEditorModel.section.hearingAidType.label' );
                self.mixinData.speechComprehensionHeadphoneLabelI18n = i18n( 'InCaseMojit.DmpEditorModel.section.speechComprehensionHeadphone.label' );
                self.mixinData.furtherDataI18n = 'Weitere Untersuchungsdaten';


                self.dmpHearingAidTypeOtherSelected = ko.observable(false);
                self.dmpHearingAidFirstMedicationNoSelected = ko.observable(false);
                self.dmpSpeechComprehensionMaterialOtherSelected = ko.observable(false);
                self.dmpFurtherDiagnosisOtherSelected = ko.observable(false);
                self.dmpSpecialMedicationOtherSelected = ko.observable(false);
                self.dmpSpecialMedicationAnomalyOtherSelected = ko.observable(false);
                self.dmpSpeechDevelopmentDisturbanceOtherSelected = ko.observable(false);
                self.dmpSpeakingTestPossibleYesSelected = ko.observable(false);
                self.dmpMedicationConformNoSelected = ko.observable(false);
                self.dmpSpeakingTestPossible_following_YesSelected = ko.observable(false);
                self.dmpSpeakingTestPossible_following_NoSelected = ko.observable(false);
                self.dmpHearingAidSuccessDetectableYesSelected = ko.observable(false);
                self.dmpAirLineOtherSelected = ko.observable(false);
                self.dmpAirLineAnomalyOtherSelected = ko.observable(false);

                self.dmpAirLine.i18n = ko.computed( function() {
                    var dmpAge = self.dmpAge();
                    return dmpAge === 'CHILD' ? AIRLINE_CHILD : AIRLINE;
                } );

                if( peek( self.dmpNeedsMergeAcknowledgment ) ) {
                    Y.doccirrus.modals.mergeModal.showMergeDialog(self);
                }

                self.showHardnessOfHearingOptionalPlausibilityPanel = ko.computed( function() {
                    var leftCount = 0;
                    var rightCount = 0;
                    (self.dmpNoiseReceptionAmblyacousia() || []).concat(
                        (self.dmpNoiseFlowAmblyacousia() || []),
                        (self.dmpCombinedAmblyacousia() || []) ).forEach( function( val ) {

                        if( val === 'LEFT' ) {
                            leftCount++;
                        } else if( val === 'RIGHT' ) {
                            rightCount++;
                        }
                    } );
                    return leftCount > 1 || rightCount > 1;
                } );

                self.showSpeechUnderstandingOptionalPlausibilityPanel = ko.computed( function() {
                    var hasDmpSpeechComprehensionDB = Boolean( self.dmpSpeechComprehensionDB() );
                    var hasDmpSpeechComprehensionEZ = Boolean( self.dmpSpeechComprehensionEZ() );
                    var hasDmpSpeechComprehensionSVS = Boolean( self.dmpSpeechComprehensionSVS() );
                    var hasValues = hasDmpSpeechComprehensionDB || hasDmpSpeechComprehensionEZ || hasDmpSpeechComprehensionSVS;

                    if( !hasValues ) {
                        return false;
                    }
                    var validCombination = (hasDmpSpeechComprehensionDB && hasDmpSpeechComprehensionEZ && !hasDmpSpeechComprehensionSVS) ||
                                           (hasDmpSpeechComprehensionDB && !hasDmpSpeechComprehensionEZ && hasDmpSpeechComprehensionSVS) ||
                                           (!hasDmpSpeechComprehensionDB && !hasDmpSpeechComprehensionEZ && hasDmpSpeechComprehensionSVS)
                    ;
                    return !validCombination;
                } );

                this.addDisposable(ko.computed( function() {
                    var _dmpHearingAidType = unwrap(self.dmpHearingAidType);

                    if (_dmpHearingAidType.indexOf('OTHER') !== -1) {
                        self.dmpHearingAidTypeOtherSelected(true);
                    } else {
                        self.dmpHearingAidTypeOtherSelected(false);
                    }

                    var _dmpHearingAidFirstMedication = unwrap(self.dmpHearingAidFirstMedication);

                    if (_dmpHearingAidFirstMedication === 'NO') {
                        self.dmpHearingAidFirstMedicationNoSelected(true);
                    } else {
                        self.dmpHearingAidFirstMedicationNoSelected(false);
                    }

                    var _dmpSpeechComprehensionMaterial = unwrap(self.dmpSpeechComprehensionMaterial);

                    if (_dmpSpeechComprehensionMaterial.indexOf('OTHER') !== -1) {
                        self.dmpSpeechComprehensionMaterialOtherSelected(true);
                    } else {
                        self.dmpSpeechComprehensionMaterialOtherSelected(false);
                    }

                    var _dmpFurtherDiagnosis = unwrap(self.dmpFurtherDiagnosis);

                    if (_dmpFurtherDiagnosis.indexOf('OTHER') !== -1) {
                        self.dmpFurtherDiagnosisOtherSelected(true);
                    } else {
                        self.dmpFurtherDiagnosisOtherSelected(false);
                    }

                    var _dmpSpecialMedication = unwrap(self.dmpSpecialMedication);

                    if (_dmpSpecialMedication.indexOf('OTHER') !== -1) {
                        self.dmpSpecialMedicationOtherSelected(true);
                    } else {
                        self.dmpSpecialMedicationOtherSelected(false);
                    }

                    var _dmpSpecialMedicationAnomaly = unwrap(self.dmpSpecialMedicationAnomaly);

                    if (_dmpSpecialMedicationAnomaly.indexOf('OTHER') !== -1) {
                        self.dmpSpecialMedicationAnomalyOtherSelected(true);
                    } else {
                        self.dmpSpecialMedicationAnomalyOtherSelected(false);
                    }

                    var _dmpSpeechDevelopmentDisturbance = unwrap(self.dmpSpeechDevelopmentDisturbance);

                    if(typeof _dmpSpeechDevelopmentDisturbance !== 'undefined') {

                        if (_dmpSpeechDevelopmentDisturbance.indexOf('OTHER') !== -1) {
                            self.dmpSpeechDevelopmentDisturbanceOtherSelected(true);
                        } else {
                            self.dmpSpeechDevelopmentDisturbanceOtherSelected(false);
                        }

                    }

                    var _dmpSpeakingTestPossible = unwrap(self.dmpSpeakingTestPossible);

                    if (_dmpSpeakingTestPossible === 'YES') {
                        self.dmpSpeakingTestPossibleYesSelected(true);
                    } else {
                        self.dmpSpeakingTestPossibleYesSelected(false);
                    }

                    var _dmpMedicationConform = unwrap(self.dmpMedicationConform);

                    if (_dmpMedicationConform === 'NO') {
                        self.dmpMedicationConformNoSelected(true);
                    } else {
                        self.dmpMedicationConformNoSelected(false);
                    }

                    var _dmpSpeakingTestPossible_following = unwrap(self.dmpSpeakingTestPossible_following);

                    if (_dmpSpeakingTestPossible_following === 'YES') {
                        self.dmpSpeakingTestPossible_following_YesSelected(true);
                        self.dmpSpeakingTestPossible_following_NoSelected(false);
                    }
                    else if(_dmpSpeakingTestPossible_following === 'NO') {
                        self.dmpSpeakingTestPossible_following_YesSelected(false);
                        self.dmpSpeakingTestPossible_following_NoSelected(true);
                    }
                    else {
                        self.dmpSpeakingTestPossible_following_YesSelected(false);
                        self.dmpSpeakingTestPossible_following_NoSelected(false);
                    }

                    var _dmpHearingAidSuccessDetectable = unwrap(self.dmpHearingAidSuccessDetectable);

                    if (_dmpHearingAidSuccessDetectable === 'YES') {
                        self.dmpHearingAidSuccessDetectableYesSelected(true);
                    } else {
                        self.dmpHearingAidSuccessDetectableYesSelected(false);
                    }

                    var _dmpAirLine = unwrap(self.dmpAirLine);

                    if (_dmpAirLine.indexOf('OTHER') !== -1) {
                        self.dmpAirLineOtherSelected(true);
                    } else {
                        self.dmpAirLineOtherSelected(false);
                    }

                    var _dmpAirLineAnomaly = unwrap(self.dmpAirLineAnomaly);

                    if (_dmpAirLineAnomaly.indexOf('OTHER') !== -1) {
                        self.dmpAirLineAnomalyOtherSelected(true);
                    } else {
                        self.dmpAirLineAnomalyOtherSelected(false);
                    }
                }));

            }

        }, {
            NAME: 'DmpHgvEditorModel'
        } );

    KoViewModel.registerConstructor( DmpHgvEditorModel );

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