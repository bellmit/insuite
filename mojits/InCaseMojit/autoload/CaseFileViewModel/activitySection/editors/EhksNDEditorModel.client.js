/**
 * User: do
 * Date: 02/11/17  13:55
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


/*jslint anon:true, nomen:true*/
/*global YUI, ko */

YUI.add( 'EhksNDEditorModel', function( Y ) {
        'use strict';
        /**
         * @module EhksNDEditorModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            ActivityEditorModel = KoViewModel.getConstructor( 'ActivityEditorModel' ),
            i18n = Y.doccirrus.i18n;

        /**
         * @class EhksNDEditorModel
         * @constructor
         * @extends ActivityEditorModel
         */
        function EhksNDEditorModel( config ) {
            EhksNDEditorModel.superclass.constructor.call( this, config );
        }

        EhksNDEditorModel.ATTRS = {
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

                    'hksSuspectedDiagnosisND',
                    'hksMalignesMelanom',
                    'hksBasalzellkarzinom',
                    'hksSpinozelluläresKarzinom',
                    'hksOtherSkinCancer',
                    'hksOtherDermatologicalClarificationFindings',
                    'hksScreeningParticipantIsReferredToDermatologistTransferred',
                    'hksHealthExaminationAtSameTime'
                ],
                lazyAdd: false
            }
        };

        Y.extend( EhksNDEditorModel, ActivityEditorModel, {
                initializer: function DmpDmEditor_initializer() {
                    var
                        self = this;
                    self.initEhksNDEditorModel();
                },
                destructor: function DmpDmEditor_destructor() {
                },
                initEhksNDEditorModel: function EhksNDEditorModel_initEhksNDEditorModel() {
                    var
                        self = this;

                    self.labelLanrI18n = i18n( 'InCaseMojit.casefile_detail.label.LANR' );
                    self.labelBSNRI18n = i18n( 'InCaseMojit.casefile_detail.label.BSNR' );
                    self.kbvDobI18n = i18n( 'person-schema.Person_T.kbvDob' );
                    self.genderI18n = i18n( 'patient-schema.Gender_E.i18n' );
                    self.insuranceNameI18n = i18n( 'person-schema.InsuranceStatus_T.insuranceName' );
                    self.insuranceIdI18n = i18n( 'person-schema.InsuranceStatus_T.insuranceId' );
                    self.sectionNDI18n = i18n('InCaseMojit.Ehjks.section.ND');
                    self.helpTextNDI18n = i18n('InCaseMojit.Ehjks.helpText.ND');
                    self.hksSuspectedDiagnosisNDI18n = i18n( 'activity-schema.Activity_T.hksSuspectedDiagnosisND.i18n' );
                    self.hksMalignesMelanomI18n = i18n( 'activity-schema.Activity_T.hksMalignesMelanom.i18n' );
                    self.hksBasalzellkarzinomI18n = i18n( 'activity-schema.Activity_T.hksBasalzellkarzinom.i18n' );
                    self.hksSpinozellularesKarzinomI18n = i18n( 'activity-schema.Activity_T.hksSpinozelluläresKarzinom.i18n' );
                    self.hksHealthExaminationAtSameTimeI18n = i18n( 'activity-schema.Activity_T.hksHealthExaminationAtSameTime.i18n' );
                    self.hksOtherSkinCancerI18n = i18n( 'activity-schema.Activity_T.hksOtherSkinCancer.i18n' );
                    self.hksOtherDermatologicalClarificationFindingsI18n = i18n( 'activity-schema.Activity_T.hksOtherDermatologicalClarificationFindings.i18n' );
                    self.hksScreeningParticipantIsReferredToDermatologistTransferredI18n = i18n( 'activity-schema.Activity_T.hksScreeningParticipantIsReferredToDermatologistTransferred.i18n' );

                    self.mixinData = {};
                    self.mixinData.diagnosisSuspectedLabelI18n = i18n( 'InCaseMojit.EhjksND.section.DIAGNOSIS_SUSPECTED' );
                    self.mixinData.healthExaminationLabelI18n = i18n( 'InCaseMojit.EhjksND.section.HEALTH_EXAMINATION' );

                    self.version_2_3_2 = ko.computed( function() {
                        var timestamp = self.timestamp();
                        return Y.doccirrus.edmpcommonutils.isAfterTimestampQ( timestamp, Y.doccirrus.edmpcommonutils.EHKS_V2_3_2_LAST_QUARTER );
                    } );
                }
            }, {
                NAME: 'EhksNDEditorModel'
            }
        );

        KoViewModel.registerConstructor( EhksNDEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'ActivityEditorModel',
            'edmp-commonutils'
        ]
    }
);
