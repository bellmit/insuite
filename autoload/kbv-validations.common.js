/*jslint anon:true, nomen:true*/
/*global YUI */
'use strict';
YUI.add( 'kbv-validations', function( Y/*, NAME*/ ) {

        var
            isPodoIndication = Y.doccirrus.kbvutilitycatalogcommonutils.isPodoIndication,
            isETIndication = Y.doccirrus.kbvutilitycatalogcommonutils.isETIndication;

        //CONSTAINTS
        var
            VAL_CONTRAINDICATION = 'CONTRAINDICATION',
            VAL_YES = 'YES',
            VAL_NO = 'NO',
            INITIATED = 'INITIATED',
            NOT_ACCOMPLISHED = 'NOT_ACCOMPLISHED',
            ACCOMPLISHED = 'ACCOMPLISHED',
            NONE_OF_THESE_DISEASES = 'NONE_OF_THESE_DISEASES',
            REFERRAL_LINE_LENGTH = 60;

        var
            i18n = Y.doccirrus.i18n,
            validationLibrary = Y.doccirrus.validations.common,
            createValidator = Y.doccirrus.validator.factory.createValidator,
            validationLibraryKbv,
            MONGOOSE_MISSING_MANDATORY_VALUE = validationLibrary.getMongooseMandatoryMessage(),
            SCHEIN_T_SCHEINCLINICALTREATMENTDATESNEEDED_ERR = i18n( 'validations.kbv.message.SCHEIN_T_SCHEINCLINICALTREATMENTDATESNEEDED_ERR' ),
            DATE_ERR = i18n( 'validations.kbv.message.DATE_ERR' ),
            FR042_ERR = i18n( 'validations.kbv.message.FR042_ERR' ),
            FR046_ERR = i18n( 'validations.kbv.message.FR046_ERR' ),
            FR116_ERR = i18n( 'validations.kbv.message.FR116_ERR' ),
            FR320_ERR = i18n( 'validations.kbv.message.FR320_ERR' ),
            FR529_ERR = i18n( 'validations.kbv.message.FR529_ERR' ),
            FR528_ERR = i18n( 'validations.kbv.message.FR528_ERR' ),
            EGK_ERR = i18n( 'validations.kbv.message.EGK_ERR' ),
            KVK_ERR = i18n( 'validations.kbv.message.KVK_ERR' ),
            DOB_T_ERR = i18n( 'validations.kbv.message.DOB_T_ERR' ),
            IS_T_ERR = i18n( 'validations.kbv.message.IS_T_ERR' ),
            FK4217_ERR = i18n( 'validations.kbv.message.FK4217_ERR' ),
            FK4235_ERR = i18n( 'validations.kbv.message.FK4235_ERR' ),
            FK4241_ERR = i18n( 'validations.kbv.message.FK4241_ERR' ),
            FK4246_ERR = i18n( 'validations.kbv.message.FK4246_ERR' ),
            FK4247_ERR = i18n( 'validations.kbv.message.FK4247_ERR' ),
            FK5002_ERR = i18n( 'validations.kbv.message.FK5002_ERR' ),
            FK5005_ERR = i18n( 'validations.kbv.message.FK5005_ERR' ),
            FK5008_ERR = i18n( 'validations.kbv.message.FK5008_ERR' ),
            FK5011Set_ERR = i18n( 'validations.kbv.message.FK5011Set_ERR' ),
            FK5011_ERR = i18n( 'validations.kbv.message.FK5011_ERR' ),
            FK5012_ERR = i18n( 'validations.kbv.message.FK5012_ERR' ),
            FK5013_ERR = i18n( 'validations.kbv.message.FK5013_ERR' ),
            FK5017_ERR = i18n( 'validations.kbv.message.FK5017_ERR' ),
            FK5019_ERR = i18n( 'validations.kbv.message.FK5019_ERR' ),
            FK5023_ERR = i18n( 'validations.kbv.message.FK5023_ERR' ),
            FK5024_ERR = i18n( 'validations.kbv.message.FK5024_ERR' ),
            FK5025_ERR = i18n( 'validations.kbv.message.FK5025_ERR' ),
            FK5026_ERR = i18n( 'validations.kbv.message.FK5026_ERR' ),
            FK5034_ERR = i18n( 'validations.kbv.message.FK5034_ERR' ),
            FK5037_ERR = i18n( 'validations.kbv.message.FK5037_ERR' ),
            FK5040_ERR = i18n( 'validations.kbv.message.FK5040_ERR' ),
            FK5044_ERR = i18n( 'validations.kbv.message.FK5044_ERR' ),
            FK5021_ERR = i18n( 'validations.kbv.message.FK5021_ERR' ),
            FK5035_ERR = i18n( 'validations.kbv.message.FK5035_ERR' ),
            FK5036_ERR = i18n( 'validations.kbv.message.FK5036_ERR' ),
            FK5041_ERR = i18n( 'validations.kbv.message.FK5041_ERR' ),
            FK5041_NOT_MANDATORY_ERR = i18n( 'validations.kbv.message.FK5041_NOT_MANDATORY_ERR' ),
            FK5041_MANDATORY_ERR = i18n( 'validations.kbv.message.FK5041_MANDATORY_ERR' ),
            FK5042_ERR = i18n( 'validations.kbv.message.FK5042_ERR' ),
            FK5043_ERR = i18n( 'validations.kbv.message.FK5043_ERR' ),
            FK6003_ERR = i18n( 'validations.kbv.message.FK6003_ERR' ),
            LINKEDTREATMENT_POSITIVE_INTEGER_ERR = i18n( 'validations.kbv.message.LINKEDTREATMENT_POSITIVE_INTEGER_ERR' ),
            Schein_T_scheinRemittor_ERR = i18n( 'validations.kbv.message.Schein_T_scheinRemittor_ERR' ),
            Schein_T_scheinRemittorFk4242DiffFromFk5099_ERR = i18n('validations.kbv.message.Schein_T_scheinRemittorFk4242DiffFromFk5099_ERR'),
            Schein_T_scheinEstablishmentFk4218DiffFromFk5098_ERR = i18n('validations.kbv.message.Schein_T_scheinRemittorFk4218DiffFromFk5098_ERR'),
            Schein_T_scheinEstablishment_ERR = i18n( 'validations.kbv.message.Schein_T_scheinEstablishment_ERR' ),
            SCHEIN_T_FK4217_SCHEINESTABLISHMENTFK4218_SAME_VALUE_ERR = i18n( 'validations.kbv.message.FK4217_SCHEINESTABLISHMENTFK4218_SAME_VALUE_ERR' ),
            SCHEIN_T_SCHEINESTABLISHMENTFK4218_DEFAULT_VALUE_FOR_Seventy_Seven_ERR = i18n('validations.kbv.message.SCHEIN_T_SCHEINESTABLISHMENTFK4218_DEFAULT_VALUE_FOR_Seventy_Seven_ERR'),
            FK4217_NEEDS_TO_BE_EMPTY_ERR = i18n( 'validations.kbv.message.FK4217_NEEDS_TO_BE_EMPTY_ERR' ),
            SCHEIN_T_SUBGROUP_TREATMENT_SELECTION_ERR = i18n( 'validations.kbv.message.SCHEIN_T_SUBGROUP_TREATMENT_SELECTION_ERR' ),
            TREATMENT_T_FK5010_BATCHNUMBER_NEEDED_ERR = i18n('validations.kbv.message.TREATMENT_T_FK5010_BATCHNUMBER_NEEDED_ERR'),
            Treatment_T_billingFactorValue_ERR = i18n( 'validations.kbv.message.Treatment_T_billingFactor_ERR' ),
            InvoiceConfiguration_T_empiricalvalue_ERR = i18n( 'validations.kbv.message.InvoiceConf_T_empirical_ERR' ),
            INSURANCESTATUS_T_PAIDFREETO_ERR = i18n( 'validations.kbv.message.INSURANCESTATUS_T_ERR' ),
            Schein_T_scheinDate_ERR = i18n( 'validations.kbv.message.Schein_T_Date_ERR' ),
            SCHEIN_T_SCHEINT_RANSFER_ARRANGEMENTCODE_ERR = i18n( 'validations.kbv.message.SCHEIN_T_SCHEINT_RANSFER_ARRANGEMENTCODE_ERR' ),
            SCHEIN_T_FK4125_ERR = i18n( 'validations.kbv.message.SCHEIN_T_FK4125_ERR' ),
            FK5070_ERR = i18n( 'validations.kbv.message.FK5070_ERR' ),
            FK5071_ERR = i18n( 'validations.kbv.message.FK5071_ERR' ),
            FK5072_ERR = i18n( 'validations.kbv.message.FK5072_ERR' ),
            FK5073_ERR = i18n( 'validations.kbv.message.FK5073_ERR' ),
            FK5035SET_ERR = i18n( 'validations.kbv.message.FK5035SET_ERR' ),
            OMIM_G_NOT_ALLOWED_KP2612 = i18n( 'validations.kbv.message.OMIM_G_NOT_ALLOWED_KP2612' ),
            OMIM_P_REQUIRED_KP2612 = i18n( 'validations.kbv.message.OMIM_P_REQUIRED_KP2612' ),
            OMIM_G_AND_P_REQUIRED_KP2613 = i18n( 'validations.kbv.message.OMIM_G_AND_P_KP2613' ),
            OMIM_G_AND_P_REQUIRED_KP2614 = i18n( 'validations.kbv.message.OMIM_G_AND_P_KP2614' ),
            OMIM_G_AND_P_REQUIRED_KP2615 = i18n( 'validations.kbv.message.OMIM_G_AND_P_KP2615' ),
            OMIM_G_AND_P_REQUIRED_KP2616 = i18n( 'validations.kbv.message.OMIM_G_AND_P_KP2616' ),
            AU_3_DAYS_RULE = i18n( 'validations.kbv.message.AU_3_DAYS_RULE' ),
            AU_T_AUVORRAUSSICHTLICHBIS_ERR = i18n( 'validations.kbv.message.AU_T_AUVORRAUSSICHTLICHBIS_ERR' ),
            AU_T_FESTGESTELLTAM_ERR = i18n( 'validations.kbv.message.AU_T_FESTGESTELLTAM_ERR' ),
            OPHTHALMOLOGY_READ_ERR = i18n( 'validations.kbv.message.OPHTHALMOLOGY_READ_ERR' ),
            PATIENT_T_EDMP_CASE_NO_ERR = i18n( 'validations.kbv.message.PATIENT_T_EDMP_CASE_NO_ERR' ),
            PATIENT_T_EDMP_CASE_NO_CHECKINSURANCE_ERR = i18n( 'validations.kbv.message.PATIENT_T_EDMP_CHECKINSURANCE_ERR' ),
            PATIENT_T_PATIENT_T_EHKS_PATIENTNO_ERR = i18n( 'validations.kbv.message.PATIENT_T_PATIENT_T_EHKS_PATIENTNO_ERR' ),
            PATIENT_T_PATIENT_T_HGV_PATIENTNO_ERR = i18n( 'validations.kbv.message.PATIENT_T_PATIENT_T_HGV_PATIENTNO_ERR' ),
            PATIENT_T_INSUREDPERSONNO_ERR = i18n( 'validations.kbv.message.PATIENT_T_INSUREDPERSONNO_ERR' ),
            PATIENT_T_EHKS_DOC_TYPE_ERR = i18n( 'validations.kbv.message.PATIENT_T_EHKS_DOC_TYPE_ERR' ),
            PATIENT_T_EDMP_TYPE_ERR = i18n( 'validations.kbv.message.PATIENT_T_EDMP_TYPE_ERR' ),
            PATIENT_T_EDMP_TYPE_ERR_ASTHMA = i18n( 'validations.kbv.message.PATIENT_T_EDMP_TYPE_ERR_ASTHMA' ),
            PATIENT_T_EDMP_TYPE_ERR_COPD = i18n( 'validations.kbv.message.PATIENT_T_EDMP_TYPE_ERR_COPD' ),
            HKS_YES_OR_NO_ERR = i18n( 'validations.kbv.message.HKS_YES_OR_NO_ERR' ),
            HKS_IF_SUSPECT_DIAG_ND_YES_OR_NO = i18n( 'validations.kbv.message.HKS_IF_SUSPECT_DIAG_ND_YES_OR_NO' ),
            HKS_IF_SUSPECT_DIAG_D_YES_OR_NO = i18n( 'validations.kbv.message.HKS_IF_SUSPECT_DIAG_D_YES_OR_NO' ),
            EHKS_D_T_HKS_NUMBER_OF_BIOPSIES_TAKEN_ERR = i18n( 'validations.kbv.message.EHKS_D_T_HKS_NUMBER_OF_BIOPSIES_TAKEN_ERR' ),
            EHKS_D_T_HKS_OTHERWISE_INITIATED_OR_INITIATED_THERAPY_OR_DIAGNOSTICS_ERR = i18n( 'validations.kbv.message.EHKS_D_T_HKS_OTHERWISE_INITIATED_OR_INITIATED_THERAPY_OR_DIAGNOSTICS_ERR' ),
            EHKS_D_T_HKS_OTHERWISE_INITIATED_OR_INITIATED_THERAPY_OR_DIAGNOSTICS_MANDATORY_ERR = i18n( 'validations.kbv.message.EHKS_D_T_HKS_OTHERWISE_INITIATED_OR_INITIATED_THERAPY_OR_DIAGNOSTICS_MANDATORY_ERR' ),
            EHKS_D_T_HKS_CURRENTLY_NO_FURTHER_THERAPY_OR_DIAGNOSTICS = i18n( 'validations.kbv.message.EHKS_D_T_HKS_CURRENTLY_NO_FURTHER_THERAPY_OR_DIAGNOSTICS' ),
            EHKS_D_T_HKS_CURRENTLY_NO_FURTHER_THERAPY_OR_DIAGNOSTICS_MANDATORY = i18n( 'validations.kbv.message.EHKS_D_T_HKS_CURRENTLY_NO_FURTHER_THERAPY_OR_DIAGNOSTICS_MANDATORY' ),
            EHKS_D_T_HKSHASSUSPECTEDDIAG_ERR = i18n( 'validations.kbv.message.EHKS_D_T_HKSHASSUSPECTEDDIAG_ERR' ),
            EHKS_D_T_HKSHASSUSPECTEDDIAGISYES_ERR = i18n( 'validations.kbv.message.EHKS_D_T_HKSHASSUSPECTEDDIAGISYES_ERR' ),
            EHKS_D_T_HKS_SUSPECTED_DIAGNOSIS_D_IS_YES_ERR = i18n( 'validations.kbv.message.EHKS_D_T_HKS_SUSPECTED_DIAGNOSIS_D_IS_YES_ERR' ),
            HKS_HISTOPATHOLOGYFIELDS_YES_OR_NO_ERR = i18n( 'validations.kbv.message.HKS_HISTOPATHOLOGYFIELDS_YES_OR_NO_ERR' ),

            EHKS_D_T_HKSMALIGNESMELANOMCLASSIFICATION_ERR = i18n( 'validations.kbv.message.EHKS_D_T_HKSMALIGNESMELANOMCLASSIFICATION_ERR' ),
            EHKS_D_T_HKSMALIGNESMELANOMTUMORTHICKNESS_ERR = i18n( 'validations.kbv.message.EHKS_D_T_HKSMALIGNESMELANOMTUMORTHICKNESS_ERR' ),

            EHKS_D_T_HKSBASALZELLKARZINOMHORIZONTALTUMORDIAMETERCLINICAL_ERR = i18n( 'validations.kbv.message.EHKS_D_T_HKSBASALZELLKARZINOMHORIZONTALTUMORDIAMETERCLINICAL_ERR' ),
            EHKS_D_T_HKSBASALZELLKARZINOMVERTICALTUMORDIAMETERHISTOLOGICAL_ERR = i18n( 'validations.kbv.message.EHKS_D_T_HKSBASALZELLKARZINOMVERTICALTUMORDIAMETERHISTOLOGICAL_ERR' ),

            EHKS_D_T_HKSBASALZELLKARZINOMTUMORDIAMETER_RANGE_ERR = i18n( 'validations.kbv.message.EHKS_D_T_HKSBASALZELLKARZINOMTUMORDIAMETER_RANGE_ERR' ),

            EHKS_D_T_HKSSPINOZELLULÄRESKARZINOMCLASSIFICATION_ERR = i18n( 'validations.kbv.message.EHKS_D_T_HKSSPINOZELLULÄRESKARZINOMCLASSIFICATION_ERR' ),
            EHKS_D_T_HKSSPINOZELLULÄRESKARZINOMGRADING_ERR = i18n( 'validations.kbv.message.EHKS_D_T_HKSSPINOZELLULÄRESKARZINOMGRADING_ERR' ),

            ZERVIXZYTOLOGIE_T_MANDATORY_DATE_ERR = i18n( 'validations.kbv.message.ZERVIXZYTOLOGIE_T_MANDATORY_DATE_ERR' ),
            ZERVIXZYTOLOGIE_T_MANDATORY_ERR = i18n( 'validations.kbv.message.ZERVIXZYTOLOGIE_T_MANDATORY_ERR' ),

            DMP_BASE_T_MAX_ONE_SELECTION_ERR = i18n( 'validations.kbv.message.DMP_BASE_T_MAX_ONE_SELECTION_ERR' ),
            DMP_BASE_T_MANDATORY_ERR = i18n( 'validations.kbv.message.DMP_BASE_T_MANDATORY_ERR' ),
            DMP_BASE_T_IK_OR_UKV_ERR = i18n( 'validations.kbv.message.DMP_BASE_T_IK_OR_UKV_ERR' ),
            DMP_BASE_T_MANDATORY_IF_SMOKER_ERR = i18n( 'validations.kbv.message.DMP_BASE_T_MANDATORY_IF_SMOKER_ERR' ),
            DMP_BASE_T_EMAIL_ERR = i18n( 'validations.kbv.message.DMP_BASE_T_EMAIL_ERR' ),
            DMP_BASE_T_dmpConcomitantDisease_ERR = i18n( 'validations.kbv.message.DMP_BASE_T_dmpConcomitant_ERR' ),
            DMP_BASE_T_DMPWEIGHT_ERR = i18n( 'validations.kbv.message.DMP_BASE_T_DMPWEIGHT_ERR' ),
            DM_T_DMPHEIGHT_ERR = i18n( 'validations.kbv.message.DM_T_DMPHEIGHT_ERR' ),
            DM_T_DMPFURTHERRISKULCUS_ERR = i18n( 'validations.kbv.message.DM_T_DMPFURTHERRISKULCUS_ERR' ),
            DMP_BASE_T_DMPSIGNATUREDATE_ERR = i18n( 'validations.kbv.message.DMP_BASE_T_DMPSIGNATUREDATE_ERR' ),
            DMP_BASE_T_DMPSIGNATUREDATE_QUARTER_RANGE_ERR = i18n( 'validations.kbv.message.DMP_BASE_T_QUARTER_RANGE_ERR' ),
            DMP_BASE_T_DMPSCHEINREF_ERR = i18n( 'validations.kbv.message.DMP_BASE_T_DMPSCHEINREF_ERR' ),
            DMP_BASE_T_NO_EXCLUDES_OTHERS_ERR = i18n( 'validations.kbv.message.DMP_BASE_T_NO_EXCLUDES_OTHERS_ERR' ),
            DMP_BASE_T_NONE_OF_THESE_EVENTS_EXCLUDES_OTHERS_ERR = i18n( 'validations.kbv.message.DMP_BASE_T_ERR' ),
            DMP_BASE_T_NONE_EXCLUDES_OTHERS_ERR = i18n( 'validations.kbv.message.DMP_BASE_T_NONE_EXCLUDES_OTHERS_ERR' ),
            DMP_ASTHMA_COPD_T_NONE_EXCLUDES_OTHERS_ERR = i18n( 'validations.kbv.message.DMP_ASTHMA_COPD_T_ERR' ),
            ASTHMA_T_dmpAsthmaTrainingAlreadyDoneBeforeDMP_4_44_ERR = i18n( 'validations.kbv.message.ASTHMA_T_dmpAsthmaTrainingAlreadyDoneBeforeDMP_4_44_ERR' ),
            ASTHMA_T_dmpTherapyAdjustment_4_44_ERR = i18n( 'validations.kbv.message.ASTHMA_T_dmpTherapyAdjustment_4_44_ERR' ),
            DM_T_DMP_INJECTION_SITES_ERR = i18n( 'validations.kbv.message.DM_T_DMP_INJECTION_SITES_ERR' ),
            DMP_DM_THREATMENT_ERR = i18n( 'validations.kbv.message.DMP_DM_THREATMENT_ERR' ),
            DM_T_threatmentOpthRetinalExam_ERR = i18n( 'validations.kbv.message.DM_T_threatmentOpthRetinalExam_ERR' ),
            DM_T_DMP_EGFR_ERR = i18n( 'validations.kbv.message.DM_T_DMP_EGFR_ERR' ),
            KHK_T_dmpLdlCholesterol_ERR = i18n( 'validations.kbv.message.KHK_T_dmpLdlCholesterol_ERR' ),
            DM1_DM2_T_dmpHbA1c_ERR = i18n( 'validations.kbv.message.DM1_DM2_T_dmpHbA1c_ERR' ),
            DMP_RELEVANT_EVENTS_COMMON_ERR = i18n( 'validations.kbv.message.DMP_RELEVANT_EVENTS_COMMON_ERR' ),

            // ========================================================================================================== \\
            // ============================================ BK TRANSLATIONS ============================================= \\
            // General =====================================================================================================
            BK_T_MANDATORY_ERR = i18n( 'validations.kbv.message.BK_T_MANDATORY_ERR' ),
            BK_T_MANDATORY_IF_PRIMARY_OR_CONTRALATERAL_ERR = i18n( 'validations.kbv.message.BK_T_MANDATORY_IF_PRIMARY_OR_CONTRALATERAL_ERR' ),
            BK_T_NONE_EXCLUDES_OTHERS_ERR = i18n( 'validations.kbv.message.BK_T_NONE_EXCLUDES_OTHERS_ERR' ),
            BK_T_YES_EXCLUDES_OTHERS_ERR = i18n( 'validations.kbv.message.BK_T_YES_EXCLUDES_OTHERS_ERR' ),
            BK_T_BEFORE_SIGNATURE_DATE_ERR = i18n( 'validations.kbv.message.BK_T_BEFORE_SIGNATURE_DATE_ERR' ),
            // Registration ================================================================================================
            BK_T_BEFORE_CONTRALATERAL_ERR = i18n( 'validations.kbv.message.BK_T_BEFORE_CONTRALATERAL_ERR' ),
            BK_T_BEFORE_LOCOREGIONAL_ERR = i18n( 'validations.kbv.message.BK_T_BEFORE_LOCOREGIONAL_ERR' ),
            BK_T_BEFORE_REMOTE_ERR = i18n( 'validations.kbv.message.BK_T_BEFORE_REMOTE_ERR' ),
            BK_T_AFTER_PRIMARY_ERR = i18n( 'validations.kbv.message.BK_T_AFTER_PRIMARY_ERR' ),
            BK_T_AFTER_CONTRALATERAL_ERR = i18n( 'validations.kbv.message.BK_T_AFTER_CONTRALATERAL_ERR' ),
            BK_T_AFTER_LOCOREGIONAL_ERR = i18n( 'validations.kbv.message.BK_T_AFTER_LOCOREGIONAL_ERR' ),
            BK_T_AT_LEAST_ONE_OF_PRIMARY_CONTRALATERAL_LOCOREGIONAL_DATE_ERR = i18n( 'validations.kbv.message.BK_T_AT_LEAST_ONE_OF_PRIMARY_CONTRALATERAL_LOCOREGIONAL_DATE_ERR' ),
            BK_T_AT_LEAST_ONE_RECENT_DATE_IF_NO_REMOTE_ERR = i18n( 'validations.kbv.message.BK_T_AT_LEAST_ONE_RECENT_DATE_IF_NO_REMOTE_ERR' ),
            // Anamnesis and treatment status of the primary tumor / contralateral breast cancer ===========================
            BK_T_OPERATION_PLANNED_NOT_ALLOWED_ERR = i18n( 'validations.kbv.message.BK_T_OPERATION_PLANNED_NOT_ALLOWED_ERR' ),
            BK_T_NO_OPERATION_EXCLUDES_OTHERS_ERR = i18n( 'validations.kbv.message.BK_T_NO_OPERATION_EXCLUDES_OTHERS_ERR' ),
            BK_T_OPERATION_PLANNED_EXCLUDES_OTHERS_ERR = i18n( 'validations.kbv.message.BK_T_OPERATION_PLANNED_EXCLUDES_OTHERS_ERR' ),
            BK_T_OPERATION_NOT_PLANNED_EXCLUDES_OTHERS_ERR = i18n( 'validations.kbv.message.BK_T_OPERATION_NOT_PLANNED_EXCLUDES_OTHERS_ERR' ),
            // Current findings for the primary tumor / contralateral breast cancer ========================================
            BK_T_MANDATAROTY_IF_POSTOPERATIVE_ERR = i18n( 'validations.kbv.message.BK_T_MANDATAROTY_IF_POSTOPERATIVE_ERR' ),
            BK_T_TIS_0_1_2_3_4_EXCLUDE_OTHERS_ERR = i18n( 'validations.kbv.message.BK_T_TIS_0_1_2_3_4_EXCLUDE_OTHERS_ERR' ),
            BK_T_MANDATORY_IF_PERFORMED_SURGICAL_THERAPY_FILLED_OUT_ERR = i18n( 'validations.kbv.message.BK_T_MANDATORY_IF_PERFORMED_SURGICAL_THERAPY_FILLED_OUT_ERR' ),
            BK_T_ONLY_CLINICAL_ALLOWED_IF_SURGERY_PLANNED_OR_NOT_PLANNED_ERR = i18n( 'validations.kbv.message.BK_T_ONLY_CLINICAL_ALLOWED_IF_SURGERY_PLANNED_OR_NOT_PLANNED_ERR' ),
            BK_T_MANDATORY_IF_PERFORMED_SURGICAL_THERAPY_FILLED_OUT_AND_M0_ERR = i18n( 'validations.kbv.message.BK_T_MANDATORY_IF_PERFORMED_SURGICAL_THERAPY_FILLED_OUT_AND_M0_ERR' ),
            BK_T_MANDATORY_IF_M0_ERR = i18n( 'validations.kbv.message.BK_T_MANDATORY_IF_M0_ERR' ),
            BK_T_MANDATORY_IF_HORMONE_RECEPTOR_POSITIVE_ERR = i18n( 'validations.kbv.message.BK_T_MANDATORY_IF_HORMONE_RECEPTOR_POSITIVE_ERR' ),
            BK_T_OTHER_AND_ENDOCRINE_THERAPY_PLANNED_EXCLUDE_OTHERS_ERR = i18n( 'validations.kbv.message.BK_T_OTHER_AND_ENDOCRINE_THERAPY_PLANNED_EXCLUDE_OTHERS_ERR' ),
            BK_T_AROMATASE_INHIBITORS_AND_TAMOXIFEN_EXCLUDE_EACH_OTHER_ERR = i18n( 'validations.kbv.message.BK_T_AROMATASE_INHIBITORS_AND_TAMOXIFEN_EXCLUDE_EACH_OTHER_ERR' ),
            BK_T_MANDATORY_IF_ENDOCRINE_THERAPY_INCLUDES_AROMATASE_TAMOXIFEN_OR_OTHER_ERR = i18n( 'validations.kbv.message.BK_T_MANDATORY_IF_ENDOCRINE_THERAPY_INCLUDES_AROMATASE_TAMOXIFEN_OR_OTHER_ERR' ),
            BK_T_MANDATORY_IF_ENDOCRINE_THERAPY_INCLUDES_AROMATASE_ERR = i18n( 'validations.kbv.message.BK_T_MANDATORY_IF_ENDOCRINE_THERAPY_INCLUDES_AROMATASE_ERR' ),
            BK_T_R0_R1_R2_EXCLUDE_OTHERS_ERR = i18n( 'validations.kbv.message.BK_T_R0_R1_R2_EXCLUDE_OTHERS_ERR' ),
            BK_T_NO_OPERATION_CONSISTENT_ERR = i18n( 'validations.kbv.message.BK_T_NO_OPERATION_CONSISTENT_ERR' ),
            // Treatment of the primary tumor / contralateral breast cancer ================================================
            //     BK_T_MANDATAROTY_IF_OPERATION_NOT_PLANNED_ERR = i18n( 'validations.kbv.message.BK_T_MANDATAROTY_IF_OPERATION_NOT_PLANNED_ERR'),
            // Findings and therapy of a locoregional recurrence ===========================================================
            BK_T_MANDATORY_IF_LOCOREGIONAL_ERR = i18n( 'validations.kbv.message.BK_T_MANDATORY_IF_LOCOREGIONAL_ERR' ),
            BK_T_PREOPERATIVE_EXCLUDES_MASTECTOMY_EXCISION_ERR = i18n( 'validations.kbv.message.BK_T_PREOPERATIVE_EXCLUDES_MASTECTOMY_EXCISION_ERR' ),
            // Findings and therapy of remote metastases ===================================================================
            BK_T_MANDATORY_IF_REMOTE_ERR = i18n( 'validations.kbv.message.BK_T_MANDATORY_IF_REMOTE_ERR' ),
            BK_T_MANDATORY_IF_REMOTE_IN_BONE_ERR = i18n( 'validations.kbv.message.BK_T_MANDATORY_IF_REMOTE_IN_BONE_ERR' ),
            BK_T_DENOSUMAB_IMPLIES_BISPHOSPHONATE_ERR = i18n( 'validations.kbv.message.BK_T_DENOSUMAB_IMPLIES_BISPHOSPHONATE_ERR' ),
            BK_T_BISPHOSPHONATE_IMPLIES_DENOSUMAB_ERR = i18n( 'validations.kbv.message.BK_T_BISPHOSPHONATE_IMPLIES_DENOSUMAB_ERR' ),
            // Events since the last documentation =========================================================================
            BK_T_DATE_EXCLUDES_NO_ERR = i18n( 'validations.kbv.message.BK_T_DATE_EXCLUDES_NO_ERR' ),
            BK_T_MANDATORY_MANIFESTATION_ERR = i18n( 'validations.kbv.message.BK_T_MANDATORY_MANIFESTATION_ERR' ),
            BK_T_DATE_IMPLIES_TEXT_ERR = i18n( 'validations.kbv.message.BK_T_DATE_IMPLIES_TEXT_ERR' ),
            BK_T_REMOTE_DATE_IMPLIES_TEXT_4_23_ERR = i18n( 'validations.kbv.message.BK_T_REMOTE_DATE_IMPLIES_TEXT_4_23_ERR' ),
            BK_T_MANDATORY_IF_VISCERAL_REMOTE_METASTASES_ERR = i18n( 'validations.kbv.message.BK_T_MANDATORY_IF_VISCERAL_REMOTE_METASTASES_ERR' ),
            // Treatment of advanced disease (locoregional recurrence / remote metastases) =================================
            BK_T_MANDATORY_IF_LOCOREGIONAL_REGISTRATION_ERR = i18n( 'validations.kbv.message.BK_T_MANDATORY_IF_LOCOREGIONAL_REGISTRATION_ERR' ),
            BK_T_MANDATORY_IF_REMOTE_REGISTRATION_ERR = i18n( 'validations.kbv.message.BK_T_MANDATORY_IF_REMOTE_REGISTRATION_ERR' ),
            BK_T_PROGRESS_EXCLUDES_OTHERS_ERR = i18n( 'validations.kbv.message.BK_T_PROGRESS_EXCLUDES_OTHERS_ERR' ),
            BK_T_TOTAL_EXCLUDES_PARTIAL_REMISSION_ERR = i18n( 'validations.kbv.message.BK_T_TOTAL_EXCLUDES_PARTIAL_REMISSION_ERR' ),
            BK_T_PREOPERATIVE_EXCLUDES_EXCISION_AND_MASTECTOMY_ERR = i18n( 'validations.kbv.message.BK_T_PREOPERATIVE_EXCLUDES_EXCISION_AND_MASTECTOMY_ERR' ),
            BK_T_MANDATORY_IF_REMOTE_IN_BONE_FLW_ERR = i18n( 'validations.kbv.message.BK_T_MANDATORY_IF_REMOTE_IN_BONE_FLW_ERR' ),
            // Other findings ==============================================================================================
            BK_T_UNKNOWN_AND_NO_EXCLUDE_OTHERS_ERR = i18n( 'validations.kbv.message.BK_T_UNKNOWN_AND_NO_EXCLUDE_OTHERS_ERR' ),

            HGV_T_MINONE_ERR = i18n( 'validations.kbv.message.HGV_T_MINONE_ERR' ),
            HGV_T_VALID_VALUE_ERR = i18n( 'validations.kbv.message.HGV_T_VALID_VALUE_ERR' ),

            // ========================================================================================================== \\
            // ========================================================================================================== \\

            ASTHMA_T_IF_NECESSARY_CHRONICMEDICATION_NONE_CONTRAINDICATION_ERR = i18n( 'validations.kbv.message.ASTHMA_T_ERR' ),
            ASTHMA_T_dmpCurrentPeakFlow_ERR = i18n( 'validations.kbv.message.ASTHMA_T_dmpCurrentPeakFlow_ERR' ),
            ASTHMA_T_dmpCurrentFEV1Value_4_44_ERR = i18n( 'validations.kbv.message.ASTHMA_T_dmpCurrentFEV1Value_4_44_ERR' ),
            DMP_ASTHMA_T_OTHER_MEDICATION_ERR = i18n( 'validations.kbv.message.DMP_ASTHMA_T_OTHER_MEDICATION_ERR' ),
            COPD_T_dmpCurrentFev1_ERR = i18n( 'validations.kbv.message.COPD_T_dmpCurrentFev1_ERR' ),
            COPD_T_dmpClinicalAssessmentOfOsteoporosisRisk_ERR = i18n( 'validations.kbv.message.COPD_T_dmpClinicalAssessmentOfOsteoporosisRisk_ERR' ),
            COPD_T_IF_NECESSARY_CHRONICMEDICATION_NONE_CONTRAINDICATION_ERR = i18n( 'validations.kbv.message.COPD_T_ERR' ),
            PRESCRIPTION_T_SUBSTITUTEPRESCRIPTION_ERR = i18n( 'validations.kbv.message.PRESCRIPTION_T_SUBSTITUTEPRESCRIPTION_ERR' ),
            STRING_TOO_LONG_ERR = i18n( 'validations.kbv.message.STRING_TOO_LONG_ERR' ),
            KBVUTILITY_UTGROUPTHERAPY_ERR = i18n( 'validations.kbv.message.KBVUTILITY_UTGROUPTHERAPY_ERR' ),
            KBVUTILITY_UTPRESCRIPTIONTYPE_ERR = i18n( 'InCaseMojit.kbvutility-search-modalJS.KBVUTILITY_UTPRESCRIPTIONTYPE_ERR' ),
            KBVUTILITY_UTLATESTSTARTOFTREATMENT = i18n( 'validations.kbv.message.KBVUTILITY_UTSTARTOFTREATMENT' ),
            KBVUTILITY_UTMEDICALJUSTIFICATION = i18n( 'validations.kbv.message.KBVUTILITY_UTMEDICALJUSTIFICATION' ),
            KBVUTILITY_SUBTYPE = i18n( 'validations.kbv.message.KBVUTILITY_SUBTYPE' ),
            KBVUTILITY_UTCIDCODE = i18n( 'validations.kbv.message.KBVUTILITY_UTCIDCODE' ),
            KBVUTILITY_UTINDICATIONCODE = i18n( 'validations.kbv.message.KBVUTILITY_UTINDICATIONCODE' ),
            KBVUTILITY_UTREMEDYLIST = i18n( 'validations.kbv.message.KBVUTILITY_UTREMEDYLIST' ),
            KBVUTILITY_UTREMEDYSEASONS = i18n( 'validations.kbv.message.KBVUTILITY_UTREMEDYSEASONS' ),
            KBVUTILITY_UTREMEDYSEASONS_2 = i18n( 'validations.kbv.message.KBVUTILITY_UTREMEDYSEASONS_2' ),
            KBVUTILITY_UTREMEDYSEASONS_ET = i18n( 'validations.kbv.message.KBVUTILITY_UTREMEDYSEASONS_ET' ),
            KBVUTILITY_UTREMEDYSEASONS_3 = i18n( 'validations.kbv.message.KBVUTILITY_UTREMEDYSEASONS_3' ),
            KBVUTILITYPRICES_PRICE_ERR = i18n( 'validations.kbv.message.KBVUTILITYPRICES_PRICE_ERR' ),
            KBVUTILITYPRICES_PRICES_ERR = i18n( 'validations.kbv.message.KBVUTILITYPRICES_PRICES_ERR' ),
            KBVUTILITY2__T_UT2REMEDYLISTS_ERR = i18n( 'validations.kbv.message.KBVUTILITY2__T_UT2REMEDYLISTS_ERR' ),
            KBVUTILITY2_UT2THERAPYFREQUENCYMAXDECIMALS_ERR = i18n( 'validations.kbv.message.KBVUTILITY2_UT2THERAPYFREQUENCYMAXDECIMALS_ERR' ),
            TREATMENT_T_OMIMCODES_NEEDSONE_ERR = i18n( 'validations.kbv.message.TREATMENT_T_OMIMCODES_NEEDSONE_ERR' ),
            TREATMENT_T_OMIMCODES_NEEDATLEASTONE_ERR = i18n( 'validations.kbv.message.TREATMENT_T_OMIMCODES_NEEDATLEASTONE_ERR' ),
            TREATMENT_T_OMIMCODES_NEEDNONE_ERR = i18n( 'validations.kbv.message.TREATMENT_T_OMIMCODES_NEEDNONE_ERR' ),
            KBV_BFB61_MOBILITY_OTHER = i18n( 'validations.kbv.message.KBV_BFB61_MOBILITY_OTHER' ),
            TILDE_NOT_ALLOWED = i18n( 'validations.kbv.message.TILDE_NOT_ALLOWED' ),
            MAX_200_CHARS = i18n( 'validations.kbv.message.MAX_200_CHARS' ),
            MAX_50_CHARS = i18n( 'validations.kbv.message.MAX_50_CHARS' );

        /**
         * Constructor for the module class.
         *
         * In this constructor function we combine the validation logic and validation messages
         * as per mongoose compatible multi-validators. This ensures that the same results
         * and messages are obtained on the server as on the client.
         *
         * @class DCValidationsKBV
         * @private
         */
        function DCValidationsKBV() {

            this['042'] = [
                {validator: this._042, msg: FR042_ERR}
            ];
            this['046'] = [
                {validator: this._046, msg: FR046_ERR}
            ];
            this['320'] = [
                {validator: this._320, msg: FR320_ERR}
            ];

            this.kvkNo = [
                {validator: this._kvkNo, msg: KVK_ERR}
            ];
            this.egkNo = [
                {validator: this._egkNo, msg: EGK_ERR}
            ];

            this.Person_T_title = [
                createValidator( 'LENGTH', {min: 0, max: 20} )
            ];
            this.Person_T_nameaffix = [
                createValidator( 'LENGTH', {min: 0, max: 20} )
            ];
            this.Person_T_firstname = [
                createValidator( 'LENGTH', {min: 0, max: 45} )
            ];
            this.Person_T_fk3120 = [
                createValidator( 'LENGTH', {min: 0, max: 20} )
            ];
            this.Person_T_lastname = [
                createValidator( 'LENGTH', {min: 0, max: 45} )
            ];
            this.Person_T_kbvDob = [
                {validator: this._Person_T_kbvDob, msg: DOB_T_ERR}
            ];
            this.Person_T_insuranceStatus = [
                {validator: this._Person_T_insuranceStatus, msg: IS_T_ERR}
            ];
            this.Activity_T_code = [
                {validator: this._Activity_T_code, msg: MONGOOSE_MISSING_MANDATORY_VALUE}
            ];
            this.Activity_T_icds = [
                {validator: this._Activity_T_icds, msg: MONGOOSE_MISSING_MANDATORY_VALUE}
            ];

            this.DiagnosisCert_E_diagnosisCert = [
                {validator: this._DiagnosisCert_E_diagnosisCert, msg: FK6003_ERR}
            ];
            this.Treatment_T_billingFactorValue = [
                {validator: this._Treatment_T_billingFactorValue, msg: Treatment_T_billingFactorValue_ERR}
            ];
            this.Schein_T_scheinQuarter = [
                {validator: this._Schein_T_scheinQuarter, msg: MONGOOSE_MISSING_MANDATORY_VALUE}
            ];
            this.Schein_T_scheinDate = [
                {validator: this._Schein_T_scheinDate, msg: Schein_T_scheinDate_ERR},
                {validator: this._Schein_T_scheinDate_Mandatory, msg: MONGOOSE_MISSING_MANDATORY_VALUE}
            ];
            this.Schein_T_scheinYear = [
                {validator: this._Schein_T_scheinYear, msg: MONGOOSE_MISSING_MANDATORY_VALUE}
            ];
            this.Schein_T_scheinType = [
                {validator: this._Schein_T_scheinType, msg: MONGOOSE_MISSING_MANDATORY_VALUE}
            ];
            this.Schein_T_scheinSubgroup = [
                {validator: this._Schein_T_scheinSubgroup, msg: MONGOOSE_MISSING_MANDATORY_VALUE}
            ];
            this.Schein_T_scheinTransferArrangementCode = [
                {validator: this._Schein_T_scheinTransferArrangementCode, msg: SCHEIN_T_SCHEINT_RANSFER_ARRANGEMENTCODE_ERR}
            ];
            this.Schein_T_fk4125 = [
                {validator: this._Schein_T_fk4125, msg: SCHEIN_T_FK4125_ERR}
            ];
            this.Schein_T_scheinRemittor = [
                {validator: this._Schein_T_scheinRemittor, msg: Schein_T_scheinRemittor_ERR},
                {
                    validator: this._Schein_T_scheinRemittorFk4242DiffFromFk5099,
                    msg: Schein_T_scheinRemittorFk4242DiffFromFk5099_ERR
                }
            ];
            this.Schein_T_scheinEstablishment = [
                {validator: this._Schein_T_scheinEstablishment, msg: Schein_T_scheinEstablishment_ERR},
                {
                    validator: this._Schein_T_scheinEstablishmentFk4218DiffFromFk5098,
                    msg: Schein_T_scheinEstablishmentFk4218DiffFromFk5098_ERR
                },
                {
                    validator: this._Schein_T_fk4217scheinEstablishmentFk4218SameValueError,
                    msg: SCHEIN_T_FK4217_SCHEINESTABLISHMENTFK4218_SAME_VALUE_ERR
                },
                {
                    validator: this._Schein_T_scheinEstablishmentFk4218DefaultValueForSeventySeven,
                    msg: SCHEIN_T_SCHEINESTABLISHMENTFK4218_DEFAULT_VALUE_FOR_Seventy_Seven_ERR
                }
            ];
            this.Schein_T_scheinSpecialisation = [
                {validator: this._Schein_T_scheinSpecialisation, msg: MONGOOSE_MISSING_MANDATORY_VALUE}
            ];
            this.Schein_T_scheinOrder = [
                {validator: this._Schein_T_scheinOrder, msg: MONGOOSE_MISSING_MANDATORY_VALUE}
            ];
            this.Schein_T_scheinSlipMedicalTreatment = [
                {validator: this._Schein_T_scheinSlipMedicalTreatment, msg: MONGOOSE_MISSING_MANDATORY_VALUE},
                {validator: this._Schein_T_scheinSlipMedicalTreatmentSubGroupTreatmentSelection, msg: SCHEIN_T_SUBGROUP_TREATMENT_SELECTION_ERR}

            ];
            this.Schein_T_scheinClinicalTreatmentFrom = [
                {validator: this._Schein_T_scheinClinicalTreatmentFrom, msg: MONGOOSE_MISSING_MANDATORY_VALUE},
                {
                    validator: this._Schein_T_scheinClinicalTreatmentDatesNeeded,
                    msg: SCHEIN_T_SCHEINCLINICALTREATMENTDATESNEEDED_ERR
                }
            ];
            this.Schein_T_scheinClinicalTreatmentTo = [
                {validator: this._Schein_T_scheinClinicalTreatmentTo, msg: MONGOOSE_MISSING_MANDATORY_VALUE},
                {
                    validator: this._Schein_T_scheinClinicalTreatmentDatesNeeded,
                    msg: SCHEIN_T_SCHEINCLINICALTREATMENTDATESNEEDED_ERR
                }
            ];
            this.Schein_T_scheinNextTherapist = [
                {validator: this._Schein_T_scheinNextTherapist, msg: MONGOOSE_MISSING_MANDATORY_VALUE}
            ];
            this.Schein_T_scheinDiagnosis = [
                {validator: this._Schein_T_scheinDiagnosis, msg: MONGOOSE_MISSING_MANDATORY_VALUE}
            ];
            this.Schein_T_scheinFinding = [
                {validator: this._Schein_T_scheinFinding, msg: MONGOOSE_MISSING_MANDATORY_VALUE}
            ];
            this.Schein_T_fk4217 = [
                {validator: this._Schein_T_fk4217, msg: FK4217_ERR},
                {validator: this._Schein_T_fk4217NeedsToBeEmpty, msg: FK4217_NEEDS_TO_BE_EMPTY_ERR},
                {
                    validator: this._Schein_T_fk4217scheinEstablishmentFk4218SameValueError,
                    msg: SCHEIN_T_FK4217_SCHEINESTABLISHMENTFK4218_SAME_VALUE_ERR
                }
            ];
            this.Schein_T_fk4219 = [
                {validator: this._Schein_T_fk4219, msg: MONGOOSE_MISSING_MANDATORY_VALUE}
            ];
            this.Schein_T_fk4241 = [
                {validator: this._Schein_T_fk4241, msg: FK4241_ERR}
            ];
            this.Schein_T_fk4235 = [
                {validator: this._Schein_T_fk4235, msg: FK4235_ERR}
            ];
            this.Schein_T_fk4246 = [
                {validator: this._Schein_T_fk4246, msg: FK4246_ERR}
            ];
            this.Schein_T_fk4246Offset = [
                {validator: this._Schein_T_fk4246Offset, msg: FK4246_ERR}
            ];
            this.Schein_T_fk4247 = [
                {validator: this._Schein_T_fk4247, msg: FK4247_ERR}
            ];
            this.Schein_T_fk4252 = [
                {
                    validator: this._Schein_T_fk4252_fk4255_schema,
                    msg: 'Ab dem 1.4.2017 muss die Gesamtanzahl zwingend angegeben werden!'
                }
            ];
            this.Schein_T_fk4255 = [
                {
                    validator: this._Schein_T_fk4252_fk4255_schema,
                    msg: 'Ab dem 1.4.2017 muss die Gesamtanzahl zwingend angegeben werden!'
                }
            ];

            this.TREATMENT_T_fk5010 = [
                {validator: this._TREATMENT_T_fk5010, msg: TREATMENT_T_FK5010_BATCHNUMBER_NEEDED_ERR}
            ];
            this.Treatment_T_fk5002 = [
                {validator: this._Treatment_T_fk5002, msg: FK5002_ERR}
            ];
            this.Treatment_T_fk5005 = [
                {validator: this._Treatment_T_fk5005, msg: FK5005_ERR}
            ];
            this.Treatment_T_fk5008 = [
                {validator: this._Treatment_T_fk5008, msg: FK5008_ERR}
            ];
            this.Treatment_T_fk5013 = [
                {validator: this._Treatment_T_fk5013, msg: FK5013_ERR}
            ];
            this.Treatment_T_fk5017 = [
                {validator: this._Treatment_T_fk5017, msg: FK5017_ERR}
            ];
            this.Treatment_T_fk5019 = [
                {validator: this._Treatment_T_fk5019, msg: FK5019_ERR}
            ];
            this.Treatment_T_fk5023 = [
                {validator: this._Treatment_T_fk5023, msg: FK5023_ERR}
            ];
            this.Treatment_T_fk5024 = [
                {validator: this._Treatment_T_fk5024, msg: FK5024_ERR}
            ];
            this.Treatment_T_fk5025 = [
                {validator: this._Treatment_T_fk5025, msg: FK5025_ERR}
            ];
            this.Treatment_T_fk5026 = [
                {validator: this._Treatment_T_fk5026, msg: FK5026_ERR}
            ];
            this.Treatment_T_fk5034 = [
                {validator: this._Treatment_T_fk5034, msg: FK5034_ERR}
            ];
            this.Treatment_T_fk5037 = [
                {validator: this._Treatment_T_fk5037, msg: FK5037_ERR}
            ];
            this.Treatment_T_fk5040 = [
                {validator: this._Treatment_T_fk5040, msg: FK5040_ERR}
            ];
            this.Treatment_T_fk5044 = [
                {validator: this._Treatment_T_fk5044, msg: FK5044_ERR}
            ];
            this.Treatment_T_omimCodes = [
                {validator: this._Treatment_T_omimCodes_needsOne, msg: TREATMENT_T_OMIMCODES_NEEDSONE_ERR},
                {validator: this._Treatment_T_omimCodes_needsAtLeastOne, msg: TREATMENT_T_OMIMCODES_NEEDATLEASTONE_ERR},
                {validator: this._Treatment_T_omimCodes_needsNone, msg: TREATMENT_T_OMIMCODES_NEEDNONE_ERR}
            ];
            this.Treatment_T_fk5070 = [
                {validator: this._Treatment_T_fk5070, msg: FK5070_ERR},
                {validator: this._Treatment_T_fk5070_KP2612, msg: OMIM_G_NOT_ALLOWED_KP2612},
                {validator: this._Treatment_T_KP2613, msg: OMIM_G_AND_P_REQUIRED_KP2613},
                {validator: this._Treatment_T_KP2614, msg: OMIM_G_AND_P_REQUIRED_KP2614},
                {validator: this._Treatment_T_KP2615, msg: OMIM_G_AND_P_REQUIRED_KP2615},
                {validator: this._Treatment_T_KP2616, msg: OMIM_G_AND_P_REQUIRED_KP2616}
            ];
            this.Treatment_T_fk5071 = [
                {validator: this._Treatment_T_fk5071, msg: FK5071_ERR},
                {validator: this._Treatment_T_fk5071_KP2612, msg: OMIM_P_REQUIRED_KP2612},
                {validator: this._Treatment_T_KP2613, msg: OMIM_G_AND_P_REQUIRED_KP2613},
                {validator: this._Treatment_T_KP2614, msg: OMIM_G_AND_P_REQUIRED_KP2614}
            ];
            this.Treatment_T_fk5072 = [
                {validator: this._Treatment_T_fk5072, msg: FK5072_ERR},
                {validator: this._Treatment_T_fk5072_KP2612, msg: OMIM_G_NOT_ALLOWED_KP2612}
            ];
            this.Treatment_T_fk5073 = [
                {validator: this._Treatment_T_fk5073, msg: FK5073_ERR}
            ];
            this.Treatment_T_fk5035Set = [
                {validator: this._Treatment_T_fk5035Set, msg: FK5035SET_ERR}
            ];

            this.Fk5012_T_fk5012 = [
                {validator: this._Fk5012_T_fk5012, msg: FK5012_ERR}
            ];
            this.Fk5012_T_fk5011Set = [
                {validator: this._Fk5012_T_fk5011Set, msg: FK5011Set_ERR}
            ];
            this.Fk5011_T_fk5011 = [
                {validator: this._Fk5011_T_fk5011, msg: FK5011_ERR}
            ];

            this.Fk5020_T_fk5020 = [
                {validator: this._Fk5020_T_fk5020, msg: MONGOOSE_MISSING_MANDATORY_VALUE}
            ];
            this.Fk5020_T_fk5021 = [
                {validator: this._Fk5020_T_fk5021, msg: FK5021_ERR}
            ];

            this.Fk5035_T_fk5035 = [
                {validator: this._Fk5035_T_fk5035, msg: FK5035_ERR}
            ];
            this.Fk5035_T_fk5041 = [
                {validator: this._Fk5035_T_fk5041_not_mandatory, msg: FK5041_NOT_MANDATORY_ERR},
                {validator: this._Fk5035_T_fk5041_mandatory, msg: FK5041_MANDATORY_ERR},
                {validator: this._Fk5035_T_fk5041, msg: FK5041_ERR}
            ];

            this.Fk5036_T_fk5036 = [
                {validator: this._Fk5036_T_fk5036, msg: FK5036_ERR}
            ];

            this.Fk5042_T_fk5042 = [
                {validator: this._Fk5042_T_fk5042, msg: FK5042_ERR}
            ];
            this.Fk5042_T_fk5043 = [
                {validator: this._Fk5042_T_fk5043, msg: FK5043_ERR}
            ];

            this.LinkedTreatment_T_quantity = [
                {validator: this._isPositiveInteger, msg: LINKEDTREATMENT_POSITIVE_INTEGER_ERR}
            ];

            this.InsuranceStatus_T_policyHolder = [
                {validator: this._InsuranceStatus_T_policyHolder, msg: MONGOOSE_MISSING_MANDATORY_VALUE}
            ];
            this.InsuranceStatus_T_policyDob = [
                {validator: this._InsuranceStatus_T_policyDob, msg: MONGOOSE_MISSING_MANDATORY_VALUE}
            ];
            this.InsuranceStatus_T_cardSwipe = [
                {validator: this._InsuranceStatus_T_cardSwipe, msg: MONGOOSE_MISSING_MANDATORY_VALUE}
            ];
            this.InsuranceStatus_T_cardValidTo = [
                {validator: this._InsuranceStatus_T_cardValidTo, msg: MONGOOSE_MISSING_MANDATORY_VALUE}
            ];
            this.InsuranceStatus_T_fk4110 = [
                {validator: this._InsuranceStatus_T_fk4110, msg: MONGOOSE_MISSING_MANDATORY_VALUE}
            ];
            this.InsuranceStatus_T_insuranceId = [
                {validator: this._InsuranceStatus_T_insuranceId, msg: MONGOOSE_MISSING_MANDATORY_VALUE}
            ];
            this.InsuranceStatus_T_insuranceGLN = [
                { validator: this._InsuranceStatus_T_insuranceGLN, msg: MONGOOSE_MISSING_MANDATORY_VALUE }
            ];
            this.InsuranceStatus_T_recipientGLN = [
                { validator: this._InsuranceStatus_T_recipientGLN, msg: MONGOOSE_MISSING_MANDATORY_VALUE }
            ];
            this.InsuranceStatus_T_address1 = [
                { validator: this._InsuranceStatus_T_address1, msg: MONGOOSE_MISSING_MANDATORY_VALUE }
            ];
            this.InsuranceStatus_T_zipcode = [
                { validator: this._InsuranceStatus_T_zipcode, msg: MONGOOSE_MISSING_MANDATORY_VALUE }
            ];
            this.InsuranceStatus_T_city = [
                { validator: this._InsuranceStatus_T_city, msg: MONGOOSE_MISSING_MANDATORY_VALUE }
            ];
            this.InsuranceStatus_T_insuranceNo = [
                {validator: this._InsuranceStatus_T_insuranceNo, msg: MONGOOSE_MISSING_MANDATORY_VALUE}
            ];
            this.InsuranceStatus_T_insuranceGrpId = [
                {validator: this._InsuranceStatus_T_insuranceGrpId, msg: MONGOOSE_MISSING_MANDATORY_VALUE}
            ];
            this.InsuranceStatus_T_costCarrierBillingSection = [
                {validator: this._InsuranceStatus_T_costCarrierBillingSection, msg: MONGOOSE_MISSING_MANDATORY_VALUE}
            ];
            this.InsuranceStatus_T_costCarrierBillingGroup = [
                {validator: this._InsuranceStatus_T_costCarrierBillingGroup, msg: MONGOOSE_MISSING_MANDATORY_VALUE}
            ];
            this.InsuranceStatus_T_feeSchedule = [
                {validator: this._InsuranceStatus_T_feeSchedule, msg: MONGOOSE_MISSING_MANDATORY_VALUE}
            ];
            this.InsuranceStatus_T_paidFreeTo = [
                {validator: this._InsuranceStatus_T_paidFreeToMandatory, msg: DATE_ERR},
                {validator: this._InsuranceStatus_T_paidFreeTo, msg: INSURANCESTATUS_T_PAIDFREETO_ERR}
            ];
            this.InsuranceStatus_T_insuranceKind = [
                {validator: this._116, msg: FR116_ERR}
            ];
            this.InsuranceStatus_T_persGroup = [
                createValidator( 'LENGTH', {min: 0, max: 2} ),
                {validator: this._529, msg: FR529_ERR}
            ];
            this.InsuranceStatus_T_dmp = [
                createValidator( 'LENGTH', {min: 0, max: 2} ),
                {validator: this._528, msg: FR528_ERR}
            ];
            this.InvoiceConfiguration_T_empiricalvalue = [
                {validator: this._InvoiceConfiguration_T_empiricalvalue, msg: InvoiceConfiguration_T_empiricalvalue_ERR}
            ];

            this.DeliverySettings_T_credentials = [
                {validator: this._DeliverySettings_T_credentials, msg: MONGOOSE_MISSING_MANDATORY_VALUE}
            ];
            this.Medication_T_phNLabel = [
                {validator: this._Medication_T_phNLabel, msg: MONGOOSE_MISSING_MANDATORY_VALUE}
            ];
            this.Medication_T_phUnit = [
                createValidator( 'LENGTH', {min: 0, max: 20} )
            ];
            this.Medication_T_phNote = [
                createValidator( 'LENGTH', {min: 0, max: 80} ),
                {validator: this._tildeNotAllowed, msg: TILDE_NOT_ALLOWED}
            ];
            this.Medication_T_phReason = [
                createValidator( 'LENGTH', {min: 0, max: 50} ),
                {validator: this._tildeNotAllowed, msg: TILDE_NOT_ALLOWED}
            ];
            this.PhIngr_T_name = [
                {validator: this._PhIngr_T_name, msg: MONGOOSE_MISSING_MANDATORY_VALUE}
            ];
            this.Au_T_auVon = [
                {validator: this._Au_T_auVon, msg: AU_3_DAYS_RULE}
            ];
            this.AU_T_auVorraussichtlichBis = [
                {validator: this._AU_T_auVorraussichtlichBis, msg: AU_T_AUVORRAUSSICHTLICHBIS_ERR}
            ];
            this.AU_T_festgestelltAm = [
                {validator: this._AU_T_festgestelltAm, msg: AU_T_FESTGESTELLTAM_ERR}
            ];

            this.Ophthalmology_read = [
                {validator: this._Ophthalmology_read, msg: OPHTHALMOLOGY_READ_ERR}
            ];

            this.Patient_T_edmpCaseNo = [
                {validator: this._Patient_T_edmpCaseNo, msg: PATIENT_T_EDMP_CASE_NO_ERR},
                {validator: this._Patient_T_edmpCaseNo_checkInsurance, msg: PATIENT_T_EDMP_CASE_NO_CHECKINSURANCE_ERR}
            ];

            this.Patient_T_ehksPatientNo = [
                {validator: this._Patient_T_ehksPatientNo, msg: PATIENT_T_PATIENT_T_EHKS_PATIENTNO_ERR}
            ];

            this.Patient_T_HGVPatientNo = [
                {validator: this._Patient_T_HGVPatientNo, msg: PATIENT_T_PATIENT_T_HGV_PATIENTNO_ERR}
            ];

            this._Patient_T_vekaCardNo = [
                {validator: this._Patient_T_vekaCardNo, msg: PATIENT_T_INSUREDPERSONNO_ERR}
            ];

            this.Patient_T_ehksDocType = [
                {validator: this._Patient_T_ehksDocType, msg: PATIENT_T_EHKS_DOC_TYPE_ERR}
            ];

            this.Patient_T_edmpTypes = [
                {validator: this._Patient_T_edmpTypes, msg: PATIENT_T_EDMP_TYPE_ERR},
                {validator: this._Patient_T_edmpTypes_asthma, msg: PATIENT_T_EDMP_TYPE_ERR_ASTHMA},
                {validator: this._Patient_T_edmpTypes_copd, msg: PATIENT_T_EDMP_TYPE_ERR_COPD}
            ];

            // EHKS_ND_T: "Verdachtsdiagnose (Mehrfachangaben möglich)"

            this.HKS_hksSuspectedDiagnosis = [
                {validator: this._HKS_YesOrNo_If_2_3_2, msg: HKS_YES_OR_NO_ERR}
            ];

            this.HKS_hksMalignesMelanom = [
                {validator: this._HKS_YesOrNo_If_2_3_1, msg: HKS_YES_OR_NO_ERR},
                {validator: this._HKS_hksSuspectedDiagnosisND_Mandatory_2_3_2, msg: HKS_IF_SUSPECT_DIAG_ND_YES_OR_NO}
            ];

            this.HKS_hksBasalzellkarzinom = [
                {validator: this._HKS_YesOrNo_If_2_3_1, msg: HKS_YES_OR_NO_ERR},
                {validator: this._HKS_hksSuspectedDiagnosisND_Mandatory_2_3_2, msg: HKS_IF_SUSPECT_DIAG_ND_YES_OR_NO}
            ];

            this.HKS_hksSpinozelluläresKarzinom = [
                {validator: this._HKS_YesOrNo_If_2_3_1, msg: HKS_YES_OR_NO_ERR},
                {validator: this._HKS_hksSuspectedDiagnosisND_Mandatory_2_3_2, msg: HKS_IF_SUSPECT_DIAG_ND_YES_OR_NO}
            ];

            this.HKS_hksOtherSkinCancer = [
                {validator: this._HKS_hksSuspectedDiagnosisND_Mandatory_2_3_2, msg: HKS_IF_SUSPECT_DIAG_ND_YES_OR_NO}
            ];

            this.HKS_hksOtherDermatologicalClarificationFindings = [
                {validator: this._HKS_hksSuspectedDiagnosisND_Mandatory_2_3_2, msg: HKS_IF_SUSPECT_DIAG_ND_YES_OR_NO}
            ];

            this.HKS_hksScreeningParticipantIsReferredToDermatologistTransferred = [
                {validator: this._HKS_YesOrNo_If_2_3_2, msg: HKS_YES_OR_NO_ERR}
            ];

            // EHKS_ND_T: "Gesundheitsuntersuchung"

            this.HKS_hksHealthExaminationAtSameTime = [
                {validator: this._HKS_Yes_Or_No, msg: HKS_YES_OR_NO_ERR}
            ];

            // EHKS_ND_T: HELPER

            this.HKS_Yes_Or_No = [
                {validator: this._HKS_Yes_Or_No, msg: HKS_YES_OR_NO_ERR}
            ];

            this.HKS_histopathologyFields_Yes_Or_No = [
                {
                    validator: this._HKS_histopathologyFields_Yes_Or_No, msg: [
                        HKS_HISTOPATHOLOGYFIELDS_YES_OR_NO_ERR
                    ].join( ' ' )
                }
            ];

            this.HKS_histopathologyFields_Yes_Or_No_2_3_2 = [
                {
                    validator: this._HKS_histopathologyFields_Yes_Or_No_2_3_2, msg: [
                        HKS_HISTOPATHOLOGYFIELDS_YES_OR_NO_ERR
                    ].join( ' ' )
                }
            ];

            // EHKS_D_T: Überweisung im Rahmen des Hautkrebs-Screenings

            this.HKS_hksHasReferral = [
                {validator: this._HKS_Yes_Or_No, msg: HKS_YES_OR_NO_ERR}
            ];

            this.HKS_hksReferralPhysicianPerformedHKS = [
                {validator: this._HKS_YesOrNo_If_2_3_2, msg: HKS_YES_OR_NO_ERR}
            ];

            // EHKS_D_T: Angabe der Verdachtsdiagnose des überweisenden Arztes (Mehrfachangaben möglich)

            this.EHKS_D_T_hksHasSuspectedDiag = [
                {validator: this._EHKS_D_T_hksHasSuspectedDiag_2_3_1, msg: EHKS_D_T_HKSHASSUSPECTEDDIAG_ERR},
                {validator: this._HKS_YesOrNo_If_2_3_2, msg: HKS_YES_OR_NO_ERR}
            ];

            this.EHKS_D_T_hksMalignesMelanom = [
                {validator: this._EHKS_D_T_hksHasSuspectedDiagIsYes, msg: EHKS_D_T_HKSHASSUSPECTEDDIAGISYES_ERR}
            ];

            this.EHKS_D_T_hksBasalzellkarzinom = [
                {validator: this._EHKS_D_T_hksHasSuspectedDiagIsYes, msg: EHKS_D_T_HKSHASSUSPECTEDDIAGISYES_ERR}
            ];

            this.EHKS_D_T_hksSpinozelluläresKarzinom = [
                {validator: this._EHKS_D_T_hksHasSuspectedDiagIsYes, msg: EHKS_D_T_HKSHASSUSPECTEDDIAGISYES_ERR}
            ];

            this.EHKS_D_T_hksOtherSkinCancer = [
                {validator: this._EHKS_D_T_hksHasSuspectedDiagIsYes_2_3_2, msg: EHKS_D_T_HKSHASSUSPECTEDDIAGISYES_ERR}
            ];

            // EHKS_D_T: Verdachtsdiagnose des Dermatologen (Mehrfachangaben möglich)

            this.EHKS_D_T_hksSuspectedDiagnosisD = [
                {validator: this._HKS_YesOrNo_If_2_3_2, msg: HKS_YES_OR_NO_ERR}
            ];

            this.EHKS_D_T_hksMalignesMelanomDermatologists = [
                {validator: this._HKS_YesOrNo_If_2_3_1, msg: HKS_YES_OR_NO_ERR},
                {validator: this._HKS_hksSuspectedDiagnosisD_Mandatory_2_3_2, msg: HKS_IF_SUSPECT_DIAG_D_YES_OR_NO}
            ];

            this.EHKS_D_T_hksBasalzellkarzinomDermatologists = [
                {validator: this._HKS_YesOrNo_If_2_3_1, msg: HKS_YES_OR_NO_ERR},
                {validator: this._HKS_hksSuspectedDiagnosisD_Mandatory_2_3_2, msg: HKS_IF_SUSPECT_DIAG_D_YES_OR_NO}
            ];

            this.EHKS_D_T_hksSpinozelluläresKarzinomDermatologists = [
                {validator: this._HKS_YesOrNo_If_2_3_1, msg: HKS_YES_OR_NO_ERR},
                {validator: this._HKS_hksSuspectedDiagnosisD_Mandatory_2_3_2, msg: HKS_IF_SUSPECT_DIAG_D_YES_OR_NO}
            ];

            this.EHKS_D_T_hksOtherSkinCancerD = [
                {validator: this._HKS_hksSuspectedDiagnosisD_Mandatory_2_3_2, msg: HKS_IF_SUSPECT_DIAG_D_YES_OR_NO}
            ];

            this.EHKS_D_T_hksOthersWithBiopsyInNeedOfClarificationFindings = [
                {validator: this._HKS_hksSuspectedDiagnosisD_Mandatory_2_3_2, msg: HKS_IF_SUSPECT_DIAG_D_YES_OR_NO}
            ];

            // EHKS_D_T: Biopsie/Exzision

            this.EHKS_D_T_hksBiopsieOrExzision = [
                {validator: this._HKS_Yes_Or_No, msg: HKS_YES_OR_NO_ERR}
            ];

            this.EHKS_D_T_hksNumberOfBiopsiesTaken = [
                {validator: this._EHKS_D_T_hksNumberOfBiopsiesTaken, msg: EHKS_D_T_HKS_NUMBER_OF_BIOPSIES_TAKEN_ERR}
            ];

            this.EHKS_D_T_hksOtherwiseInitiatedOrInitiatedTherapyOrDiagnostics = [
                {
                    validator: this._EHKS_D_T_hksOtherwiseInitiatedOrInitiatedTherapyOrDiagnostics,
                    msg: EHKS_D_T_HKS_OTHERWISE_INITIATED_OR_INITIATED_THERAPY_OR_DIAGNOSTICS_ERR
                },
                {
                    validator: this._EHKS_D_T_hksOtherwiseInitiatedOrInitiatedTherapyOrDiagnosticsMandatory,
                    msg: EHKS_D_T_HKS_OTHERWISE_INITIATED_OR_INITIATED_THERAPY_OR_DIAGNOSTICS_MANDATORY_ERR
                }
            ];

            this.EHKS_D_T_hksCurrentlyNoFurtherTherapyOrDiagnostics = [
                {
                    validator: this._EHKS_D_T_hksCurrentlyNoFurtherTherapyOrDiagnostics,
                    msg: EHKS_D_T_HKS_CURRENTLY_NO_FURTHER_THERAPY_OR_DIAGNOSTICS
                },
                {
                    validator: this._EHKS_D_T_hksCurrentlyNoFurtherTherapyOrDiagnosticsMandatory,
                    msg: EHKS_D_T_HKS_CURRENTLY_NO_FURTHER_THERAPY_OR_DIAGNOSTICS_MANDATORY
                }
            ];

            this.EHKS_D_T_hksOtherSkinCancer = [
                {validator: this._EHKS_D_T_hksOtherSkinCancer, msg: EHKS_D_T_HKSHASSUSPECTEDDIAGISYES_ERR}
            ];

            this.EHKS_D_T_hksSuspectedDiagnosisDIsYes = [
                {validator: this._EHKS_D_T_hksSuspectedDiagnosisDIsYes, msg: EHKS_D_T_HKS_SUSPECTED_DIAGNOSIS_D_IS_YES_ERR}
            ];

            this.EHKS_D_T_hksMalignesMelanomClassification = [
                {
                    validator: this._EHKS_D_T_hksMalignesMelanomClassification,
                    msg: EHKS_D_T_HKSMALIGNESMELANOMCLASSIFICATION_ERR
                }
            ];

            this.EHKS_D_T_hksMalignesMelanomTumorThickness = [ // OPTIONAL
                {
                    validator: this._EHKS_D_T_hksMalignesMelanomTumorThickness,
                    msg: EHKS_D_T_HKSMALIGNESMELANOMTUMORTHICKNESS_ERR
                }
            ];

            this.EHKS_D_T_hksBasalzellkarzinomHorizontalTumorDiameterClinical = [
                {
                    validator: this._EHKS_D_T_hksBasalzellkarzinomHorizontalTumorDiameterClinical, msg: [
                        EHKS_D_T_HKSBASALZELLKARZINOMHORIZONTALTUMORDIAMETERCLINICAL_ERR,
                        EHKS_D_T_HKSBASALZELLKARZINOMTUMORDIAMETER_RANGE_ERR
                    ].join( ' ' )
                }
            ];

            this.EHKS_D_T_hksBasalzellkarzinomVerticalTumorDiameterHistological = [ // OPTIONAL
                {
                    validator: this._EHKS_D_T_hksBasalzellkarzinomVerticalTumorDiameterHistological, msg: [
                        EHKS_D_T_HKSBASALZELLKARZINOMVERTICALTUMORDIAMETERHISTOLOGICAL_ERR,
                        EHKS_D_T_HKSBASALZELLKARZINOMTUMORDIAMETER_RANGE_ERR
                    ].join( ' ' )
                }
            ];

            this.EHKS_D_T_hksSpinozelluläresKarzinomClassification = [
                {
                    validator: this._EHKS_D_T_hksSpinozelluläresKarzinomClassification,
                    msg: EHKS_D_T_HKSSPINOZELLULÄRESKARZINOMCLASSIFICATION_ERR
                }
            ];

            this.EHKS_D_T_hksSpinozelluläresKarzinomGrading = [ // OPTIONAL
                {
                    validator: this._EHKS_D_T_hksSpinozelluläresKarzinomGrading,
                    msg: EHKS_D_T_HKSSPINOZELLULÄRESKARZINOMGRADING_ERR
                }
            ];

            this.DMP_BASE_T_dmpCheckedInhalationTechnique = [
                {validator: this._DMP_BASE_T_dmpCheckedInhalationTechnique, msg: DMP_BASE_T_MANDATORY_ERR}
            ];
            this.DMP_BASE_T_dmpHeadDate = [
                {validator: this._DMP_BASE_T_dmpHeadDate, msg: DMP_BASE_T_MANDATORY_ERR}
            ];
            this.DMP_BASE_T_dmpSignatureDate = [
                {validator: this._DMP_BASE_T_dmpSignatureDate, msg: DMP_BASE_T_DMPSIGNATUREDATE_ERR},
                {
                    validator: this._DMP_BASE_T_dmpSignatureDate_quarterRange,
                    msg: DMP_BASE_T_DMPSIGNATUREDATE_QUARTER_RANGE_ERR
                }
            ];
            this.DMP_BASE_T_dmpScheinRef = [
                {validator: this._DMP_BASE_T_dmpScheinRef, msg: DMP_BASE_T_DMPSCHEINREF_ERR}
            ];
            this.DMP_BASE_T_dmpDocumentationInterval = [
                {validator: this._eDMP_COMMON_mandatory_excluding_BK, msg: DMP_BASE_T_MANDATORY_ERR}
            ];
            this.DMP_BASE_T_dmpConcomitantDisease = [
                {validator: this._eDMP_COMMON_mandatory_excluding_BK, msg: DMP_BASE_T_MANDATORY_ERR},
                {validator: this._DMP_BASE_T_dmpConcomitantDiseaseNo, msg: DMP_BASE_T_dmpConcomitantDisease_ERR}
            ];
            this.DMP_BASE_T_dmpAntiplatelet = [
                {validator: this._DM_KHK_T_mandatory, msg: DMP_BASE_T_MANDATORY_ERR},
                {
                    validator: this._DM_KHK_T_medicationYesNoContraindicationAlone,
                    msg: 'Geben Sie bitte an, ob eine Therapie mit Thrombozytenaggregationshemmern durchgeführt wird. Hierbei ist u. a. die Gabe von ASS oder Clopidogrel gemeint. Sofern eine orale Antikoagulations-Therapie erfolgt, geben Sie diese bitte auch an. Bitte geben Sie bei „nein“ gegebenenfalls zusätzlich an, ob eine Kontraindikation gegen die Gabe eines Thrombozytenaggregationshemmers besteht und/oder eine orale Antikoagulations-Therapie erfolgt.'
                }
            ];
            this.DMP_BASE_T_dmpBetaBlocker = [
                {validator: this._DM_KHK_T_mandatory, msg: DMP_BASE_T_MANDATORY_ERR},
                {
                    validator: this._DM_KHK_T_medicationYesNoContraindicationAlone,
                    msg: 'Geben Sie bitte an, ob eine Therapie mit Betablockern durchgeführt wird. Bitte geben Sie bei „nein“ gegebenenfalls zusätzlich an, ob eine Kontraindikation gegen die Gabe eines Betablockers besteht.'
                }
            ];
            this.DMP_BASE_T_dmpACE = [
                {validator: this._DM_KHK_T_mandatory, msg: DMP_BASE_T_MANDATORY_ERR},
                {
                    validator: this._DM_KHK_T_medicationYesNoContraindicationAlone,
                    msg: 'Geben Sie bitte an, ob eine Therapie mit ACE-Hemmern durchgeführt wird. Bitte geben Sie bei „nein“ gegebenenfalls zusätzlich an, ob eine Kontraindikation gegen die Gabe eines ACE-Hemmer besteht (z. B. ACE-Hemmer bedingter Husten) und eine Alternativ-Therapie mit AT1-Rezeptorantagonisten erfolgt.'
                }
            ];
            this.DMP_BASE_T_dmpHMG = [
                {validator: this._DM_KHK_T_mandatory, msg: DMP_BASE_T_MANDATORY_ERR},
                {
                    validator: this._DM_KHK_T_medicationYesNoContraindication,
                    msg: 'Geben Sie bitte an, ob eine Therapie mit Statinen durchgeführt wird. Bitte geben Sie bei „nein“ gegebenenfalls zusätzlich an, ob eine Kontraindikation gegen die Gabe eines Statins besteht.'
                }
            ];
            this.DMP_BASE_T_dmpPerceivedDiabetesTraining = [
                {validator: this._DM_KHK_T_mandatoryFollowing, msg: DMP_BASE_T_MANDATORY_ERR}
            ];
            this.DMP_BASE_T_dmpPerceivedHypertensionTraining = [
                {validator: this._DM_KHK_T_mandatoryFollowing, msg: DMP_BASE_T_MANDATORY_ERR}
            ];

            this.DM_T_dmpInjectionSites = [
                {validator: this._DM_T_dmpInjectionSites, msg: DM_T_DMP_INJECTION_SITES_ERR}
            ];
            this.DM_T_dmpEvents = [
                {validator: this._DM_T_mandatory, msg: DMP_BASE_T_MANDATORY_ERR},
                {validator: this._DM_T_dmpEvents, msg: DMP_BASE_T_NONE_OF_THESE_EVENTS_EXCLUDES_OTHERS_ERR}
            ];
            this.DM_T_dmpFurtherRiskUlcus = [
                {validator: this._DM_T_footstatus_mandatory, msg: DMP_BASE_T_MANDATORY_ERR},
                {validator: this._DM_T_dmpFurtherRiskUlcus, msg: DM_T_DMPFURTHERRISKULCUS_ERR}
            ];
            this.DM_T_dmpUlkus = [
                {validator: this._DM_T_footstatus_mandatory, msg: DMP_BASE_T_MANDATORY_ERR}
            ];
            this.DM_T_dmpWoundInfection = [
                {validator: this._DM_T_footstatus_mandatory, msg: DMP_BASE_T_MANDATORY_ERR}
            ];
            this.DM_T_dmpSmoker = [
                {validator: this._eDMP_COMMON_mandatory_excluding_BK, msg: DMP_BASE_T_MANDATORY_ERR}
            ];
            this.DMP_BASE_dmpGender = [
                {validator: this._DMP_BASE_dmpGender, msg: DMP_BASE_T_MANDATORY_ERR}
            ];
            this.DM_T_dmpHeight = [
                {validator: this._eDMP_COMMON_mandatory, msg: DMP_BASE_T_MANDATORY_ERR},
                {validator: this._DMP_BASE_dmpHeight, msg: DM_T_DMPHEIGHT_ERR}
            ];
            this.DMP_BASE_dmpWeight = [
                {validator: this._eDMP_COMMON_mandatory, msg: DMP_BASE_T_MANDATORY_ERR},
                {validator: this._DMP_BASE_dmpWeight, msg: DMP_BASE_T_DMPWEIGHT_ERR}
            ];
            this.DMP_BASE_dmpQuarter = [
                {validator: this._DMP_BASE_T_mandatory, msg: DMP_BASE_T_MANDATORY_ERR}
            ];
            this.DMP_BASE_dmpYear = [
                {validator: this._DMP_BASE_T_mandatory, msg: DMP_BASE_T_MANDATORY_ERR}
            ];
            this.DM_T_dmpEGFR = [
                {validator: this._DM_T_dmpEGFR, msg: DM_T_DMP_EGFR_ERR}
            ];
            this.DM_T_dmpEGFRNotDetermined = [
                {
                    validator: this._DM_T_dmpEGFRNotDetermined,
                    msg: 'Sollten Sie die eGFR nicht bestimmt haben, ist hier zur Vollständigkeit eine Angabe bei „nicht bestimmt“ zu machen.'
                }
            ];
            this.DM_T_dmpSequelae = [
                {validator: this._DM_T_mandatory, msg: DMP_BASE_T_MANDATORY_ERR}
            ];
            this.DM_T_dmpHbA1cValue = [
                {validator: this._DM_T_dmpHbA1cValueType, msg: DM1_DM2_T_dmpHbA1c_ERR}
            ];
            this.DM_T_dmpHbA1cUnit = [
                {validator: this._DM_T_mandatory, msg: DMP_BASE_T_MANDATORY_ERR}
            ];
            this.DM_T_dmpPathoUrinAlbAus = [
                {validator: this._DM_T_mandatory, msg: DMP_BASE_T_MANDATORY_ERR}
            ];
            this.DM_T_dmpHadHypoglycaemic = [
                {validator: this._DM_T_dmpHadHypoglycaemic, msg: DMP_BASE_T_MANDATORY_ERR},
                {validator: this._DMP_T_relevantEventNumCommon, msg: DMP_RELEVANT_EVENTS_COMMON_ERR}
            ];
            this.DM_T_dmpHadStationaryTreatment = [
                {validator: this._DM_T_dmpHadStationaryTreatment, msg: DMP_BASE_T_MANDATORY_ERR},
                {validator: this._DMP_T_relevantEventNumCommon, msg: DMP_RELEVANT_EVENTS_COMMON_ERR}
            ];
            this.DM_T_dmpTHIA = [
                {validator: this._DM_T_mandatory, msg: DMP_BASE_T_MANDATORY_ERR},
                {
                    validator: this._DM_KHK_T_medicationYesNoContraindication,
                    msg: 'Bitte geben Sie hier an, ob Ihr Patient Thiaziddiuretika erhält. Hier ist ebenfalls die Gabe von Chlorthalidon zu erfassen. Bitte geben Sie bei „nein“ gegebenenfalls zusätzlich an, ob eine Kontraindikation gegen die Gabe eines Diuretikums besteht.'
                }
            ];
            this.DM_T_dmpRecommendedDmTrainings = [
                {validator: this._DM_T_mandatory, msg: DMP_BASE_T_MANDATORY_ERR},
                {validator: this._DM_T_NoneExcludesOthers, msg: DMP_BASE_T_NONE_EXCLUDES_OTHERS_ERR}
            ];
            this.DM_T_dmpDmTrainingsBeforeSubscription = [
                {validator: this._DM_T_dmpDmTrainingsBeforeSubscription_mandatory, msg: DMP_BASE_T_MANDATORY_ERR},
                {validator: this._DM_T_NoneExcludesOthersAfterQ22017, msg: DMP_BASE_T_NONE_EXCLUDES_OTHERS_ERR}
            ];
            this.DM_T_dmpIntervalFutureFootInspections = [
                {validator: this._DM_T_footstatus_mandatory, msg: DMP_BASE_T_MANDATORY_ERR},
                {validator: this._DM_T_NoneExcludesOthersAfterQ22017, msg: DMP_BASE_T_NONE_EXCLUDES_OTHERS_ERR}
            ];
            this.DM_T_dmpHbA1cTargetValue = [
                {validator: this._DM_T_mandatory, msg: DMP_BASE_T_MANDATORY_ERR}
            ];
            this.DM_T_dmpTreatmentAtDiabeticFootInstitution = [
                {validator: this._DM_T_mandatory, msg: DMP_BASE_T_MANDATORY_ERR},
                {validator: this._DM_T_dmpTreatmentCommon, msg: DMP_DM_THREATMENT_ERR}
            ];
            this.DM_T_dmpDiabetesRelatedHospitalization = [
                {validator: this._DM_T_mandatory, msg: DMP_BASE_T_MANDATORY_ERR},
                {validator: this._DM_T_dmpTreatmentCommon, msg: DMP_DM_THREATMENT_ERR}
            ];
            this.DM_T_dmpOpthRetinalExam = [
                {validator: this._DM_T_mandatoryFollowing, msg: DMP_BASE_T_MANDATORY_ERR},
                {validator: this._DM_T_threatmentOpthRetinalExam, msg: DM_T_threatmentOpthRetinalExam_ERR}
            ];
            this.DM1_T_dmpHadHospitalStayHbA1c = [
                {validator: this._DM1_T_dmpHadHospitalStayHbA1c, msg: DMP_BASE_T_MANDATORY_ERR},
                {validator: this._DMP_T_relevantEventNumCommon, msg: DMP_RELEVANT_EVENTS_COMMON_ERR}
            ];
            this.DM2_T_dmpInsulin = [
                {validator: this._DM2_T_mandatory, msg: DMP_BASE_T_MANDATORY_ERR}
            ];
            this.DM2_T_dmpGlibenclamide = [
                {validator: this._DM2_T_mandatory, msg: DMP_BASE_T_MANDATORY_ERR},
                {
                    validator: this._DM_KHK_T_medicationYesNoContraindication,
                    msg: 'Geben Sie bitte an, ob eine Therapie mit Glibenclamid durchgeführt wird. Bitte geben Sie bei „nein“ gegebenenfalls zusätzlich an, ob eine Kontraindikation gegen die Gabe von Glibenclamid besteht.'
                }
            ];
            this.DM2_T_dmpMetformin = [
                {validator: this._DM2_T_mandatory, msg: DMP_BASE_T_MANDATORY_ERR},
                {
                    validator: this._DM_KHK_T_medicationYesNoContraindicationAlone,
                    msg: 'Geben Sie bitte an, ob eine Therapie mit Metformin durchgeführt wird. Bitte geben Sie bei „nein“ gegebenenfalls zusätzlich an, ob eine Kontraindikation gegen die Gabe von Metformin besteht.'
                }
            ];
            this.DM2_T_dmpOtherOralAntiDiabetic = [
                {validator: this._DM2_T_mandatory, msg: DMP_BASE_T_MANDATORY_ERR}
            ];

            // ========================================================================================================== \\
            // =========================================== BK VALIDATIORS =============================================== \\

            // NB: the organisation of the code has changed since 4.23 and is documented in the wiki. The comments below
            // are still relevant for code for 4.21

            // This section contains the validators for the 'BK' actType. Many fields/sections and corresponding validations
            // are specific to a particular dmpType ("FIRST", "FOLLOWING" OR "PNP"). To avoid unvalidated forms due to
            // invalid inputs in hidden sections, the validator functions are suffixed to specify when they should be
            // activated:
            //  • '_FST': only concerns the actTypes 'FIRST' and 'PNP'
            //  • '_PNP': only concerns the actType 'PNP'
            //  • '_FLW': only concerns the actType 'FOLLOWING'
            // Further some fields can be optional and invalid inside a given dmpType. To avoid hidden invalid inputs,
            // those fields need to be validated when they are not mandatory and optional fields are hidden. Validators
            // that are concerned with those type of situations are suffixed '_VIOH' (Valid If Optional and Hidden) and
            // usually contain one additional if-statement.

            // Naming Conventions ------------------------------------------------------------------------------------------
            // Some concepts are very frequent and variable names are following the naming conventions below:
            //      • primary: 'Initial manifestation of the primary tumor'
            //      • contralateral: 'Manifestation of a contralateral breast cancer'
            //      • locoregional: 'Locoregional recurrence (date of histological evidence)'
            //      • remote: 'First confirmation of remote metastases'

            // Registration ------------------------------------------------------------------------------------------------
            this.BK_T_dmpInitialManifestationOfPrimaryTumor = [
                {
                    validator: this._BK_T_atLeastOneOfPrimaryContralateralLocoregional( ["FIRST"], ["4.21", "4.23"], "dmpInitialManifestationOfPrimaryTumor" ),
                    msg: BK_T_AT_LEAST_ONE_OF_PRIMARY_CONTRALATERAL_LOCOREGIONAL_DATE_ERR
                },
                {
                    validator: this._BK_T_atLeastOneRecentDateIfNoRemote( ["FIRST"], ["4.21", "4.23"], "dmpInitialManifestationOfPrimaryTumor" ),
                    msg: BK_T_AT_LEAST_ONE_RECENT_DATE_IF_NO_REMOTE_ERR
                },
                {
                    validator: this._BK_T_isBefore( "dmpManifestationOfContralateralBreastCancer" )( ["FIRST"], ["4.21", "4.23"], "dmpInitialManifestationOfPrimaryTumor" ),
                    msg: BK_T_BEFORE_CONTRALATERAL_ERR
                },
                {
                    validator: this._BK_T_isBefore( "dmpLocoregionalRecurrence" )( ["FIRST"], ["4.21", "4.23"], "dmpInitialManifestationOfPrimaryTumor" ),
                    msg: BK_T_BEFORE_LOCOREGIONAL_ERR
                },
                {
                    validator: this._BK_T_isBefore( "dmpFirstConfirmationOfRemoteMetastases" )( ["FIRST"], ["4.23"], "dmpInitialManifestationOfPrimaryTumor" ),
                    msg: BK_T_BEFORE_REMOTE_ERR
                },
                {
                    validator: this._BK_T_isBefore( "dmpSignatureDate" )( ["FIRST"], ["4.21", "4.23"], "dmpInitialManifestationOfPrimaryTumor" ),
                    msg: BK_T_BEFORE_SIGNATURE_DATE_ERR
                }
            ];
            this.BK_T_dmpManifestationOfContralateralBreastCancer = [
                {
                    validator: this._BK_T_atLeastOneOfPrimaryContralateralLocoregional( ["FIRST"], ["4.21", "4.23"], "dmpManifestationOfContralateralBreastCancer" ),
                    msg: BK_T_AT_LEAST_ONE_OF_PRIMARY_CONTRALATERAL_LOCOREGIONAL_DATE_ERR
                },
                {
                    validator: this._BK_T_atLeastOneRecentDateIfNoRemote( ["FIRST"], ["4.21", "4.23"], "dmpManifestationOfContralateralBreastCancer" ),
                    msg: BK_T_AT_LEAST_ONE_RECENT_DATE_IF_NO_REMOTE_ERR
                },
                {
                    validator: this._BK_T_isAfter( "dmpInitialManifestationOfPrimaryTumor" )( ["FIRST"], ["4.21", "4.23"], "dmpManifestationOfContralateralBreastCancer" ),
                    msg: BK_T_AFTER_PRIMARY_ERR
                },
                {
                    validator: this._BK_T_isBefore( "dmpLocoregionalRecurrence" )( ["FIRST"], ["4.23"], "dmpManifestationOfContralateralBreastCancer" ),
                    msg: BK_T_BEFORE_LOCOREGIONAL_ERR
                },
                {
                    validator: this._BK_T_isBefore( "dmpFirstConfirmationOfRemoteMetastases" )( ["FIRST"], ["4.23"], "dmpManifestationOfContralateralBreastCancer" ),
                    msg: BK_T_BEFORE_REMOTE_ERR
                },
                {
                    validator: this._BK_T_isBefore( "dmpSignatureDate" )( ["FIRST"], ["4.21", "4.23"], "dmpManifestationOfContralateralBreastCancer" ),
                    msg: BK_T_BEFORE_SIGNATURE_DATE_ERR
                }
            ];
            this.BK_T_dmpLocoregionalRecurrence = [
                {
                    validator: this._BK_T_atLeastOneOfPrimaryContralateralLocoregional( ["FIRST"], ["4.21", "4.23"], "dmpLocoregionalRecurrence" ),
                    msg: BK_T_AT_LEAST_ONE_OF_PRIMARY_CONTRALATERAL_LOCOREGIONAL_DATE_ERR
                },
                {
                    validator: this._BK_T_atLeastOneRecentDateIfNoRemote( ["FIRST"], ["4.21", "4.23"], "dmpLocoregionalRecurrence" ),
                    msg: BK_T_AT_LEAST_ONE_RECENT_DATE_IF_NO_REMOTE_ERR
                },
                {
                    validator: this._BK_T_isAfter( "dmpInitialManifestationOfPrimaryTumor" )( ["FIRST"], ["4.21", "4.23"], "dmpLocoregionalRecurrence" ),
                    msg: BK_T_AFTER_PRIMARY_ERR
                },
                {
                    validator: this._BK_T_isAfter( "dmpManifestationOfContralateralBreastCancer" )( ["FIRST"], ["4.23"], "dmpLocoregionalRecurrence" ),
                    msg: BK_T_AFTER_CONTRALATERAL_ERR
                },
                {
                    validator: this._BK_T_isBefore( "dmpFirstConfirmationOfRemoteMetastases" )( ["FIRST"], ["4.23"], "dmpLocoregionalRecurrence" ),
                    msg: BK_T_BEFORE_REMOTE_ERR
                },
                {
                    validator: this._BK_T_isBefore( "dmpSignatureDate" )( ["FIRST"], ["4.21", "4.23"], "dmpLocoregionalRecurrence" ),
                    msg: BK_T_BEFORE_SIGNATURE_DATE_ERR
                }
            ];
            this.BK_T_dmpFirstConfirmationOfRemoteMetastases = [
                {
                    validator: this._BK_T_isAfter( "dmpInitialManifestationOfPrimaryTumor" )( ["FIRST"], ["4.23"], "dmpFirstConfirmationOfRemoteMetastases" ),
                    msg: BK_T_AFTER_PRIMARY_ERR
                },
                {
                    validator: this._BK_T_isAfter( "dmpManifestationOfContralateralBreastCancer" )( ["FIRST"], ["4.23"], "dmpFirstConfirmationOfRemoteMetastases" ),
                    msg: BK_T_AFTER_CONTRALATERAL_ERR
                },
                {
                    validator: this._BK_T_isAfter( "dmpLocoregionalRecurrence" )( ["FIRST"], ["4.23"], "dmpFirstConfirmationOfRemoteMetastases" ),
                    msg: BK_T_AFTER_LOCOREGIONAL_ERR
                },
                {
                    validator: this._BK_T_isBefore( "dmpSignatureDate" )( ["FIRST"], ["4.23"], "dmpFirstConfirmationOfRemoteMetastases" ),
                    msg: BK_T_BEFORE_SIGNATURE_DATE_ERR
                }
            ];
            this.BK_T_dmpRegistrationFor = [
                {
                    validator: this._BK_T_maxOneSelection( ["FOLLOWING"], ["4.21", "4.23"], "dmpRegistrationFor" ),
                    msg: DMP_BASE_T_MAX_ONE_SELECTION_ERR
                },
                {
                    validator: this._BK_T_mandatory( ["FOLLOWING"], ["4.21", "4.23"], "dmpRegistrationFor" ),
                    msg: BK_T_MANDATORY_ERR
                }
            ];
            // Anamnesis and treatment status of the primary tumor / contralateral breast cancer ===========================
            // TO BE DELETED: 4.21 - START -----------------------------------------------------------------------------
            this.BK_T_dmpAffectedBreast = [
                {
                    validator: this._BK_T_mandatoryIfPrimaryOrContralateral_FST,
                    msg: BK_T_MANDATORY_IF_PRIMARY_OR_CONTRALATERAL_ERR
                }
            ];
            this.BK_T_dmpCurrentTreatmentStatus = [
                {validator: this._Max_One_Selection, msg: DMP_BASE_T_MAX_ONE_SELECTION_ERR},
                {
                    validator: this._BK_T_mandatoryIfPrimaryOrContralateral_FST,
                    msg: BK_T_MANDATORY_IF_PRIMARY_OR_CONTRALATERAL_ERR
                },
                {validator: this._BK_T_mandatory_PNP, msg: BK_T_MANDATORY_ERR},
                {validator: this._BK_T_notOperationPlanned_PNP, msg: BK_T_OPERATION_NOT_PLANNED_EXCLUDES_OTHERS_ERR}
            ];
            this.BK_T_dmpPerformedSurgicalTherapy = [
                {
                    validator: this._BK_T_mandatoryIfPrimaryOrContralateralAndPostoperative_FST,
                    msg: BK_T_MANDATAROTY_IF_POSTOPERATIVE_ERR
                },
                {validator: this._BK_T_mandatory_PNP, msg: BK_T_MANDATORY_ERR},
                {validator: this._BK_T_noOperationExcludesOthers_FST_PNP_VIOH, msg: BK_T_NO_OPERATION_EXCLUDES_OTHERS_ERR}
            ];
            // TO BE DELETED: 4.21 - END -------------------------------------------------------------------------------

            // 4.23 ----------------------------------------------------------------------------------------------------
            this.BK_T_dmpPerformedSurgicalTherapy_4_23 = [
                {
                    validator: this._BK_T_mandatoryIfPrimaryOrContralateral( ["FIRST"], ["4.23"], "dmpPerformedSurgicalTherapy_4_23" ),
                    msg: BK_T_MANDATORY_IF_PRIMARY_OR_CONTRALATERAL_ERR
                },
                {
                    validator: this._BK_T_mandatory( ["PNP"], ["4.23"], "dmpPerformedSurgicalTherapy_4_23" ),
                    msg: BK_T_MANDATORY_ERR
                },
                {
                    validator: this._BK_T_exclusiveValues( "OPERATION_PLANNED" )( ["FIRST"], ["4.23"], "dmpPerformedSurgicalTherapy_4_23" ),
                    msg: BK_T_OPERATION_PLANNED_EXCLUDES_OTHERS_ERR
                },
                {
                    validator: this._BK_T_exclusiveValues( "OPERATION_NOT_PLANNED" )( ["FIRST", "PNP"], ["4.23"], "dmpPerformedSurgicalTherapy_4_23" ),
                    msg: BK_T_OPERATION_NOT_PLANNED_EXCLUDES_OTHERS_ERR
                },
                {
                    validator: this._BK_T_forbiddenValues( "OPERATION_PLANNED" )( ["PNP"], ["4.23"], "dmpPerformedSurgicalTherapy_4_23" ),
                    msg: BK_T_OPERATION_PLANNED_NOT_ALLOWED_ERR
                }
            ];
            // Current findings for the primary tumor / contralateral breast cancer ========================================
            // TO BE DELETED: 4.21 - START -----------------------------------------------------------------------------
            this.BK_T_dmpPreoperativeNeoadjuvantTherapy = [
                {validator: this._Max_One_Selection, msg: DMP_BASE_T_MAX_ONE_SELECTION_ERR},
                {
                    validator: this._BK_T_mandatoryIfPrimaryOrContralateralAndPostoperative_FST,
                    msg: BK_T_MANDATAROTY_IF_POSTOPERATIVE_ERR
                },
                {validator: this._BK_T_mandatoryIfPostoperative_PNP, msg: BK_T_MANDATAROTY_IF_POSTOPERATIVE_ERR}
            ];
            this.BK_T_dmpPT = [
                {validator: this._BK_T_Tis01234excludeOthers_FST_PNP_VIOH, msg: BK_T_TIS_0_1_2_3_4_EXCLUDE_OTHERS_ERR},
                {
                    validator: this._BK_T_mandatoryIfPrimaryOrContralateralAndPostoperative_FST,
                    msg: BK_T_MANDATAROTY_IF_POSTOPERATIVE_ERR
                },
                {validator: this._BK_T_mandatory_PNP, msg: BK_T_MANDATORY_ERR},
                {validator: this._BK_T_noOperationConsistent_PNP, msg: BK_T_NO_OPERATION_CONSISTENT_ERR}
            ];
            this.BK_T_dmpPN = [
                {validator: this._BK_T_Tis01234excludeOthers_FST_PNP_VIOH, msg: BK_T_TIS_0_1_2_3_4_EXCLUDE_OTHERS_ERR},
                {
                    validator: this._BK_T_mandatoryIfPrimaryOrContralateralAndPostoperative_FST,
                    msg: BK_T_MANDATAROTY_IF_POSTOPERATIVE_ERR
                },
                {validator: this._BK_T_mandatory_PNP, msg: BK_T_MANDATORY_ERR},
                {validator: this._BK_T_noOperationConsistent_PNP, msg: BK_T_NO_OPERATION_CONSISTENT_ERR}
            ];
            this.BK_T_dmpM = [
                {validator: this._Max_One_Selection, msg: DMP_BASE_T_MAX_ONE_SELECTION_ERR},
                {
                    validator: this._BK_T_mandatoryIfPrimaryOrContralateralAndPostoperative_FST,
                    msg: BK_T_MANDATAROTY_IF_POSTOPERATIVE_ERR
                },
                {validator: this._BK_T_mandatory_PNP, msg: BK_T_MANDATORY_ERR}
            ];
            this.BK_T_dmpGrading = [
                {validator: this._Max_One_Selection, msg: DMP_BASE_T_MAX_ONE_SELECTION_ERR},
                {
                    validator: this._BK_T_mandatoryIfPrimaryOrContralateralAndPostoperative_FST,
                    msg: BK_T_MANDATAROTY_IF_POSTOPERATIVE_ERR
                },
                {validator: this._BK_T_mandatory_PNP, msg: BK_T_MANDATORY_ERR}
            ];
            this.BK_T_dmpResection = [
                {validator: this._BK_T_R0R1R2excludeOthers_FST_PNP_VIOH, msg: BK_T_R0_R1_R2_EXCLUDE_OTHERS_ERR},
                {
                    validator: this._BK_T_mandatoryIfPrimaryOrContralateralAndPostoperative_FST,
                    msg: BK_T_MANDATAROTY_IF_POSTOPERATIVE_ERR
                },
                {validator: this._BK_T_mandatory_PNP, msg: BK_T_MANDATORY_ERR},
                {validator: this._BK_T_noOperationConsistent_PNP, msg: BK_T_NO_OPERATION_CONSISTENT_ERR}
            ];
            this.BK_T_dmpImmunohistochemicalHormoneReceptor = [
                {validator: this._Max_One_Selection, msg: DMP_BASE_T_MAX_ONE_SELECTION_ERR},
                {
                    validator: this._BK_T_mandatoryIfPrimaryOrContralateralAndPostoperative_FST,
                    msg: BK_T_MANDATAROTY_IF_POSTOPERATIVE_ERR
                },
                {validator: this._BK_T_mandatory_PNP, msg: BK_T_MANDATORY_ERR}
            ];
            this.BK_T_dmpHER2Neu = [
                {validator: this._Max_One_Selection, msg: DMP_BASE_T_MAX_ONE_SELECTION_ERR},
                {
                    validator: this._BK_T_mandatoryIfPrimaryOrContralateralAndPostoperative_FST,
                    msg: BK_T_MANDATAROTY_IF_POSTOPERATIVE_ERR
                },
                {validator: this._BK_T_mandatory_PNP, msg: BK_T_MANDATORY_ERR}
            ];
            // TO BE DELETED: 4.21 - END -------------------------------------------------------------------------------

            // 4.23 ----------------------------------------------------------------------------------------------------
            this.BK_T_dmpTnmClassification_4_23 = [
                {
                    validator: this._BK_T_maxOneSelection( ["FIRST", "PNP"], ["4.23"], "dmpTnmClassification_4_23" ),
                    msg: DMP_BASE_T_MAX_ONE_SELECTION_ERR
                },
                {
                    validator: this._BK_T_mandatory( ["PNP"], ["4.23"], "dmpTnmClassification_4_23" ),
                    msg: BK_T_MANDATORY_ERR
                },
                {
                    validator: this._BK_T_mandatoryIf( "dmpPerformedSurgicalTherapy_4_23" )( ["FIRST"], ["4.23"], "dmpTnmClassification_4_23" ),
                    msg: BK_T_MANDATORY_IF_PERFORMED_SURGICAL_THERAPY_FILLED_OUT_ERR
                },
                {
                    validator: this._BK_T_onlyClinicalAllowedIfSurgeryPlannedOrNotPlanned( ["FIRST", "PNP"], ["4.23"], "dmpTnmClassification_4_23" ),
                    msg: BK_T_ONLY_CLINICAL_ALLOWED_IF_SURGERY_PLANNED_OR_NOT_PLANNED_ERR
                }
            ];
            this.BK_T_dmpPT_4_23 = [
                {
                    validator: this._BK_T_maxOneSelection( ["FIRST", "PNP"], ["4.23"], "dmpPT_4_23" ),
                    msg: DMP_BASE_T_MAX_ONE_SELECTION_ERR
                },
                {
                    validator: this._BK_T_mandatoryIf( "dmpPerformedSurgicalTherapy_4_23" )( ["FIRST"], ["4.23"], "dmpPT_4_23" ),
                    msg: BK_T_MANDATORY_IF_PERFORMED_SURGICAL_THERAPY_FILLED_OUT_ERR
                },
                {validator: this._BK_T_mandatory( ["PNP"], ["4.23"], "dmpPT_4_23" ), msg: BK_T_MANDATORY_ERR}
            ];
            this.BK_T_dmpPN_4_23 = [
                {
                    validator: this._BK_T_maxOneSelection( ["FIRST", "PNP"], ["4.23"], "dmpPN_4_23" ),
                    msg: DMP_BASE_T_MAX_ONE_SELECTION_ERR
                },
                {
                    validator: this._BK_T_mandatoryIf( "dmpPerformedSurgicalTherapy_4_23" )( ["FIRST"], ["4.23"], "dmpPN_4_23" ),
                    msg: BK_T_MANDATORY_IF_PERFORMED_SURGICAL_THERAPY_FILLED_OUT_ERR
                },
                {validator: this._BK_T_mandatory( ["PNP"], ["4.23"], "dmpPN_4_23" ), msg: BK_T_MANDATORY_ERR}
            ];
            this.BK_T_dmpM_4_23 = [
                {
                    validator: this._BK_T_maxOneSelection( ["FIRST", "PNP"], ["4.23"], "dmpM_4_23" ),
                    msg: DMP_BASE_T_MAX_ONE_SELECTION_ERR
                },
                {
                    validator: this._BK_T_mandatoryIf( "dmpPerformedSurgicalTherapy_4_23" )( ["FIRST"], ["4.23"], "dmpM_4_23" ),
                    msg: BK_T_MANDATORY_IF_PERFORMED_SURGICAL_THERAPY_FILLED_OUT_ERR
                },
                {validator: this._BK_T_mandatory( ["PNP"], ["4.23"], "dmpM_4_23" ), msg: BK_T_MANDATORY_ERR}
            ];
            this.BK_T_dmpImmunohistochemicalHormoneReceptor_4_23 = [
                {
                    validator: this._BK_T_maxOneSelection( ["FIRST", "PNP"], ["4.23"], "dmpImmunohistochemicalHormoneReceptor_4_23" ),
                    msg: DMP_BASE_T_MAX_ONE_SELECTION_ERR
                },
                {
                    validator: this._BK_T_mandatoryIfPerformedSurgicalTherapyFilledOutAndM0( ["FIRST"], ["4.23"], "dmpImmunohistochemicalHormoneReceptor_4_23" ),
                    msg: BK_T_MANDATORY_IF_PERFORMED_SURGICAL_THERAPY_FILLED_OUT_AND_M0_ERR
                },
                {
                    validator: this._BK_T_mandatoryIfM0( ["PNP"], ["4.23"], "dmpImmunohistochemicalHormoneReceptor_4_23" ),
                    msg: BK_T_MANDATORY_IF_M0_ERR
                }
            ];
            // Treatment of the primary tumor / contralateral breast cancer ================================================
            // TO BE DELETED: 4.21 - START -----------------------------------------------------------------------------
            this.BK_T_dmpRadiotherapy = [
                {validator: this._Max_One_Selection, msg: DMP_BASE_T_MAX_ONE_SELECTION_ERR},
                {
                    validator: this._BK_T_mandatoryIfPrimaryOrContralateral_FST,
                    msg: BK_T_MANDATORY_IF_PRIMARY_OR_CONTRALATERAL_ERR
                },
                {
                    validator: this._BK_T_mandatoryIfPrimaryOrContralateral_FLW,
                    msg: BK_T_MANDATORY_IF_PRIMARY_OR_CONTRALATERAL_ERR
                },
                {validator: this._BK_T_mandatory_PNP, msg: BK_T_MANDATORY_ERR}
            ];
            this.BK_T_dmpChemotherapy = [
                {validator: this._Max_One_Selection, msg: DMP_BASE_T_MAX_ONE_SELECTION_ERR},
                {
                    validator: this._BK_T_mandatoryIfPrimaryOrContralateral_FST,
                    msg: BK_T_MANDATORY_IF_PRIMARY_OR_CONTRALATERAL_ERR
                },
                {
                    validator: this._BK_T_mandatoryIfPrimaryOrContralateral_FLW,
                    msg: BK_T_MANDATORY_IF_PRIMARY_OR_CONTRALATERAL_ERR
                },
                {validator: this._BK_T_mandatory_PNP, msg: BK_T_MANDATORY_ERR}
            ];
            this.BK_T_dmpEndocrineTherapy = [
                {validator: this._Max_One_Selection, msg: DMP_BASE_T_MAX_ONE_SELECTION_ERR},
                {
                    validator: this._BK_T_mandatoryIfPrimaryOrContralateral_FST,
                    msg: BK_T_MANDATORY_IF_PRIMARY_OR_CONTRALATERAL_ERR
                },
                {
                    validator: this._BK_T_mandatoryIfPrimaryOrContralateral_FLW,
                    msg: BK_T_MANDATORY_IF_PRIMARY_OR_CONTRALATERAL_ERR
                },
                {validator: this._BK_T_mandatory_PNP, msg: BK_T_MANDATORY_ERR}
            ];
            this.BK_T_dmpAntibodyTherapy = [
                {validator: this._Max_One_Selection, msg: DMP_BASE_T_MAX_ONE_SELECTION_ERR},
                {
                    validator: this._BK_T_mandatoryIfPrimaryOrContralateral_FST,
                    msg: BK_T_MANDATORY_IF_PRIMARY_OR_CONTRALATERAL_ERR
                },
                {
                    validator: this._BK_T_mandatoryIfPrimaryOrContralateral_FLW,
                    msg: BK_T_MANDATORY_IF_PRIMARY_OR_CONTRALATERAL_ERR
                },
                {validator: this._BK_T_mandatory_PNP, msg: BK_T_MANDATORY_ERR}
            ];
            // TO BE DELETED: 4.21 - END -------------------------------------------------------------------------------

            // 4.23 ----------------------------------------------------------------------------------------------------
            this.BK_T_dmpCurrentAdjuvantEndocrineTherapy_4_23 = [
                {
                    validator: this._BK_T_mandatoryIfHormoneReceptorPositive( ["FIRST"], ["4.23"], "dmpCurrentAdjuvantEndocrineTherapy_4_23" ),
                    msg: BK_T_MANDATORY_IF_HORMONE_RECEPTOR_POSITIVE_ERR
                },
                {
                    validator: this._BK_T_noneAndEndocrineTherapyPlannedExcludeOthers( ["FIRST", "FOLLOWING"], ["4.23"], "dmpCurrentAdjuvantEndocrineTherapy_4_23" ),
                    msg: BK_T_OTHER_AND_ENDOCRINE_THERAPY_PLANNED_EXCLUDE_OTHERS_ERR
                },
                {
                    validator: this._BK_T_aromataseInhibitorsAndTamoxifenExcludeEachOther( ["FIRST", "FOLLOWING"], ["4.23"], "dmpCurrentAdjuvantEndocrineTherapy_4_23" ),
                    msg: BK_T_AROMATASE_INHIBITORS_AND_TAMOXIFEN_EXCLUDE_EACH_OTHER_ERR
                },
                {
                    validator: this._BK_T_mandatoryIfRegistrationForPrimaryOrContralateral( ["FOLLOWING"], ["4.23"], "dmpCurrentAdjuvantEndocrineTherapy_4_23" ),
                    msg: BK_T_MANDATORY_IF_PRIMARY_OR_CONTRALATERAL_ERR
                }
            ];
            this.BK_T_dmpSideEffectsOfCurrentAdjuvantEndocrineTherapy_4_23 = [
                {
                    validator: this._BK_T_maxOneSelection( ["FIRST", "PNP", "FOLLOWING"], ["4.23"], "dmpSideEffectsOfCurrentAdjuvantEndocrineTherapy_4_23" ),
                    msg: DMP_BASE_T_MAX_ONE_SELECTION_ERR
                },
                {
                    validator: this._BK_T_mandatoryIfEndocrineTherapyIncludesAromataseTamoxifenOrOther( ["FIRST", "FOLLOWING"], ["4.23"], "dmpSideEffectsOfCurrentAdjuvantEndocrineTherapy_4_23" ),
                    msg: BK_T_MANDATORY_IF_ENDOCRINE_THERAPY_INCLUDES_AROMATASE_TAMOXIFEN_OR_OTHER_ERR
                }
            ];
            this.BK_T_dmpContinuationOfCurrentEndocrineTherapy_4_23 = [
                {
                    validator: this._BK_T_maxOneSelection( ["FIRST", "PNP", "FOLLOWING"], ["4.23"], "dmpContinuationOfCurrentEndocrineTherapy_4_23" ),
                    msg: DMP_BASE_T_MAX_ONE_SELECTION_ERR
                },
                {
                    validator: this._BK_T_mandatoryIfHormoneReceptorPositive( ["FIRST"], ["4.23"], "dmpContinuationOfCurrentEndocrineTherapy_4_23" ),
                    msg: BK_T_MANDATORY_IF_HORMONE_RECEPTOR_POSITIVE_ERR
                },
                {
                    validator: this._BK_T_mandatoryIfRegistrationForPrimaryOrContralateral( ["FOLLOWING"], ["4.23"], "dmpContinuationOfCurrentEndocrineTherapy_4_23" ),
                    msg: BK_T_MANDATORY_IF_PRIMARY_OR_CONTRALATERAL_ERR
                }
            ];
            this.BK_T_dmpDxaFindings_4_23 = [
                {
                    validator: this._BK_T_maxOneSelection( ["FIRST", "PNP", "FOLLOWING"], ["4.23"], "dmpDxaFindings_4_23" ),
                    msg: DMP_BASE_T_MAX_ONE_SELECTION_ERR
                },
                {
                    validator: this._BK_T_mandatoryIfEndocrineTherapyIncludesAromatase( ["FIRST", "FOLLOWING"], ["4.23"], "dmpDxaFindings_4_23" ),
                    msg: BK_T_MANDATORY_IF_ENDOCRINE_THERAPY_INCLUDES_AROMATASE_ERR
                }
            ];
            // Findings and therapy of a locoregional recurrence ===========================================================
            // TO BE DELETED: 4.21 - START ------------------------------------------------------------------------------
            this.BK_T_dmpOngoingOrCompletedTherapy_locoregionalRecurrence = [
                {validator: this._BK_T_mandatoryIfLocoregional_FST, msg: BK_T_MANDATORY_IF_LOCOREGIONAL_ERR},
                {validator: this._BK_T_noneExcludesOthers_locoregional_FST_PNP_VIOH, msg: BK_T_NONE_EXCLUDES_OTHERS_ERR},
                {
                    validator: this._BK_T_preoperativeExcludesMastectomyExcision_FST_PNP_VIOH,
                    msg: BK_T_PREOPERATIVE_EXCLUDES_MASTECTOMY_EXCISION_ERR
                }
            ];
            // TO BE DELETED: 4.21 - END -------------------------------------------------------------------------------
            // Findings and therapy of remote metastases ===================================================================
            // TO BE DELETED: 4.21 - START ------------------------------------------------------------------------------
            this.BK_T_dmpLocalisation = [
                {validator: this._BK_T_mandatoryIfRemote_FST, msg: BK_T_MANDATORY_IF_REMOTE_ERR}
            ];
            this.BK_T_dmpOngoingOrCompletedTherapy_remoteMetastases = [
                {validator: this._BK_T_mandatoryIfRemote_FST, msg: BK_T_MANDATORY_IF_REMOTE_ERR},
                {validator: this._BK_T_noneExcludesOthers_remote_FST_PNP_VIOH, msg: BK_T_NONE_EXCLUDES_OTHERS_ERR}
            ];
            // TO BE DELETED: 4.21 - END -------------------------------------------------------------------------------
            this.BK_T_dmpBisphosphonateTherapy = [
                {
                    validator: this._BK_T_mandatoryIfRemoteInBone( ["FIRST", "FOLLOWING"], ["4.23"], "dmpBisphosphonateTherapy" ),
                    msg: BK_T_MANDATORY_IF_REMOTE_IN_BONE_ERR
                },
                {
                    validator: this._BK_T_mandatoryIfRemoteInBone( ["FIRST"], ["4.21"], "dmpBisphosphonateTherapy" ),
                    msg: BK_T_MANDATORY_IF_REMOTE_IN_BONE_ERR
                },
                {
                    validator: this._BK_T_exclusiveValues( "YES" )( ["FIRST", "FOLLOWING"], ["4.23"], "dmpBisphosphonateTherapy" ),
                    msg: BK_T_YES_EXCLUDES_OTHERS_ERR
                },
                {
                    validator: this._BK_T_exclusiveValues( "YES" )( ["FIRST"], ["4.21"], "dmpBisphosphonateTherapy" ),
                    msg: BK_T_YES_EXCLUDES_OTHERS_ERR
                },
                {
                    validator: this._BK_T_mandatoryIf( "dmpDenosumab_4_23" )( ["FOLLOWING"], ["4.23"], "dmpBisphosphonateTherapy" ),
                    msg: BK_T_DENOSUMAB_IMPLIES_BISPHOSPHONATE_ERR
                }
            ];
            // 4.23 ----------------------------------------------------------------------------------------------------
            this.BK_T_dmpLocalisation_4_23 = [
                {
                    validator: this._BK_T_mandatoryIf( "dmpFirstConfirmationOfRemoteMetastases" )( ["FIRST"], ["4.23"], "dmpLocalisation_4_23" ),
                    msg: BK_T_MANDATORY_IF_REMOTE_ERR
                }
            ];
            this.BK_T_dmpDenosumab_4_23 = [
                {
                    validator: this._BK_T_mandatoryIfRemoteInBone( ["FIRST", "FOLLOWING"], ["4.23"], "dmpDenosumab_4_23" ),
                    msg: BK_T_MANDATORY_IF_REMOTE_IN_BONE_ERR
                },
                {
                    validator: this._BK_T_exclusiveValues( "YES" )( ["FIRST", "FOLLOWING"], ["4.23"], "dmpDenosumab_4_23" ),
                    msg: BK_T_YES_EXCLUDES_OTHERS_ERR
                },
                {
                    validator: this._BK_T_mandatoryIf( "dmpBisphosphonateTherapy" )( ["FOLLOWING"], ["4.23"], "dmpDenosumab_4_23" ),
                    msg: BK_T_BISPHOSPHONATE_IMPLIES_DENOSUMAB_ERR
                }
            ];
            // Other findings ==============================================================================================
            // TO BE DELETED: 4.21 - START ------------------------------------------------------------------------------
            this.BK_T_dmpLymphedemaPresent = [
                {validator: this._Max_One_Selection, msg: DMP_BASE_T_MAX_ONE_SELECTION_ERR},
                {validator: this._BK_T_mandatory_FST, msg: BK_T_MANDATORY_ERR}
            ];
            this.BK_T_dmpPlannedDateForNextDocumentation = [
                // { validator: function() { return false }, msg: "" }
            ];
            // TO BE DELETED: 4.21 - END -------------------------------------------------------------------------------

            // 4.23 ----------------------------------------------------------------------------------------------------
            this.BK_T_dmpSymptomaticLymphedema_4_23 = [
                {
                    validator: this._BK_T_maxOneSelection( ["FIRST", "PNP", "FOLLOWING"], ["4.23"], "dmpSymptomaticLymphedema_4_23" ),
                    msg: DMP_BASE_T_MAX_ONE_SELECTION_ERR
                },
                {
                    validator: this._BK_T_mandatory( ["FIRST", "FOLLOWING"], ["4.23"], "dmpSymptomaticLymphedema_4_23" ),
                    msg: BK_T_MANDATORY_ERR
                }
            ];
            this.BK_T_dmpRegularPhysicalTrainingRecommended_4_23 = [
                {
                    validator: this._BK_T_maxOneSelection( ["FIRST", "PNP", "FOLLOWING"], ["4.23"], "dmpRegularPhysicalTrainingRecommended_4_23" ),
                    msg: DMP_BASE_T_MAX_ONE_SELECTION_ERR
                },
                {
                    validator: this._BK_T_mandatory( ["FIRST", "FOLLOWING"], ["4.23"], "dmpRegularPhysicalTrainingRecommended_4_23" ),
                    msg: BK_T_MANDATORY_ERR
                }
            ];
            this.BK_T_dmpConditionAfterParticularlyCardiotoxicTumorTherapy_4_23 = [
                {
                    validator: this._BK_T_mandatory( ["FIRST", "FOLLOWING"], ["4.23"], "dmpConditionAfterParticularlyCardiotoxicTumorTherapy_4_23" ),
                    msg: BK_T_MANDATORY_ERR
                },
                {
                    validator: this._BK_T_exclusiveValues( ["UNKNOWN", "NO"] )( ["FIRST", "FOLLOWING"], ["4.23"], "dmpConditionAfterParticularlyCardiotoxicTumorTherapy_4_23" ),
                    msg: BK_T_UNKNOWN_AND_NO_EXCLUDE_OTHERS_ERR
                }
            ];
            // Events since the last documentation =========================================================================
            // TO BE DELETED: 4.21 - START ------------------------------------------------------------------------------
            this.BK_T_dmpManifestationOfRemoteMetastases_following_text = [
                {validator: this._BK_T_remoteDateExcludesNo_FLW, msg: BK_T_DATE_EXCLUDES_NO_ERR},
                {validator: this._BK_T_mandatoryRemote_FLW, msg: BK_T_MANDATORY_MANIFESTATION_ERR},
                {validator: this._BK_T_noExcludesOthers_FLW, msg: DMP_BASE_T_NO_EXCLUDES_OTHERS_ERR},
                {validator: this._BK_T_dateImpliesText_FLW, msg: BK_T_DATE_IMPLIES_TEXT_ERR}
            ];
            this.BK_T_dmpLymphedema_following = [
                {validator: this._BK_T_mandatory_FLW, msg: BK_T_MANDATORY_ERR}
            ];
            // TO BE DELETED: 4.21 - END -------------------------------------------------------------------------------

            // 4.23 ----------------------------------------------------------------------------------------------------
            this.BK_T_dmpManifestationOfLocoregionalRecurrence_following_date = [
                {
                    validator: this._BK_T_isBefore( "dmpSignatureDate" )( ["FOLLOWING"], ["4.21", "4.23"], "dmpManifestationOfLocoregionalRecurrence_following" ),
                    msg: BK_T_BEFORE_SIGNATURE_DATE_ERR
                },
                {
                    validator: this._BK_T_mandatoryIfNot( "dmpManifestationOfLocoregionalRecurrence_following_text" )( ["FOLLOWING"], ["4.21", "4.23"], "dmpManifestationOfLocoregionalRecurrence_following" ),
                    msg: BK_T_MANDATORY_MANIFESTATION_ERR
                }
            ];
            this.BK_T_dmpManifestationOfLocoregionalRecurrence_following_text = [
                {
                    validator: this._BK_T_forbiddenIf( "dmpManifestationOfLocoregionalRecurrence_following_date" )( ["FOLLOWING"], ["4.21", "4.23"], "dmpManifestationOfLocoregionalRecurrence_following" ),
                    msg: BK_T_DATE_EXCLUDES_NO_ERR
                },
                {
                    validator: this._BK_T_mandatoryIfNot( "dmpManifestationOfLocoregionalRecurrence_following_date" )( ["FOLLOWING"], ["4.21", "4.23"], "dmpManifestationOfLocoregionalRecurrence_following" ),
                    msg: BK_T_MANDATORY_MANIFESTATION_ERR
                }
            ];
            this.BK_T_dmpManifestationOfContralateralBreastCancer_following_date = [
                {
                    validator: this._BK_T_isBefore( "dmpSignatureDate" )( ["FOLLOWING"], ["4.21", "4.23"], "dmpManifestationOfContralateralBreastCancer_following" ),
                    msg: BK_T_BEFORE_SIGNATURE_DATE_ERR
                },
                {
                    validator: this._BK_T_mandatoryIfNot( "dmpManifestationOfContralateralBreastCancer_following_text" )( ["FOLLOWING"], ["4.21", "4.23"], "dmpManifestationOfContralateralBreastCancer_following" ),
                    msg: BK_T_MANDATORY_MANIFESTATION_ERR
                }
            ];
            this.BK_T_dmpManifestationOfContralateralBreastCancer_following_text = [
                {
                    validator: this._BK_T_forbiddenIf( "dmpManifestationOfContralateralBreastCancer_following_date" )( ["FOLLOWING"], ["4.21", "4.23"], "dmpManifestationOfContralateralBreastCancer_following" ),
                    msg: BK_T_DATE_EXCLUDES_NO_ERR
                },
                {
                    validator: this._BK_T_mandatoryIfNot( "dmpManifestationOfContralateralBreastCancer_following_date" )( ["FOLLOWING"], ["4.21", "4.23"], "dmpManifestationOfContralateralBreastCancer_following" ),
                    msg: BK_T_MANDATORY_MANIFESTATION_ERR
                }
            ];
            this.BK_T_dmpManifestationOfRemoteMetastases_following_date = [
                {
                    validator: this._BK_T_isBefore( "dmpSignatureDate" )( ["FOLLOWING"], ["4.21", "4.23"], "dmpManifestationOfRemoteMetastases_following_4_23" ),
                    msg: BK_T_BEFORE_SIGNATURE_DATE_ERR
                },
                {
                    validator: this._BK_T_mandatoryIfNot( "dmpManifestationOfRemoteMetastases_following_text" )( ["FOLLOWING"], ["4.21"], "dmpManifestationOfRemoteMetastases_following_4_23" ),
                    msg: BK_T_MANDATORY_MANIFESTATION_ERR
                },
                {
                    validator: this._BK_T_mandatoryIfNot( "dmpManifestationOfRemoteMetastases_following_text_4_23" )( ["FOLLOWING"], ["4.23"], "dmpManifestationOfRemoteMetastases_following_4_23" ),
                    msg: BK_T_MANDATORY_MANIFESTATION_ERR
                }
            ];
            this.BK_T_dmpManifestationOfRemoteMetastases_following_text_4_23 = [
                {
                    validator: this._BK_T_mandatoryIfNot( "dmpManifestationOfRemoteMetastases_following_date" )( ["FOLLOWING"], ["4.23"], "dmpManifestationOfRemoteMetastases_following_4_23" ),
                    msg: BK_T_MANDATORY_MANIFESTATION_ERR
                },
                {
                    validator: this._BK_T_remoteDateImpliesText( ["FOLLOWING"], ["4.23"], "dmpManifestationOfRemoteMetastases_following_4_23" ),
                    msg: BK_T_REMOTE_DATE_IMPLIES_TEXT_4_23_ERR
                },
                {
                    validator: this._BK_T_exclusiveValues( "NO" )( ["FOLLOWING"], ["4.23"], "dmpManifestationOfRemoteMetastases_following_4_23" ),
                    msg: DMP_BASE_T_NO_EXCLUDES_OTHERS_ERR
                }
            ];
            this.BK_T_dmpBiopticConfirmationOfVisceralMetastases_4_23 = [
                {
                    validator: this._BK_T_maxOneSelection( ["FOLLOWING"], ["4.23"], "dmpBiopticConfirmationOfVisceralMetastases_4_23" ),
                    msg: DMP_BASE_T_MAX_ONE_SELECTION_ERR
                },
                {
                    validator: this._BK_T_mandatoryIfVisceralRemoteMetastases( ["FOLLOWING"], ["4.23"], "dmpBiopticConfirmationOfVisceralMetastases_4_23" ),
                    msg: BK_T_MANDATORY_IF_VISCERAL_REMOTE_METASTASES_ERR
                }
            ];
            // Treatment of advanced disease (locoregional recurrence / remote metastases) =================================
            // TO BE DELETED: 4.21 - START ------------------------------------------------------------------------------
            this.BK_T_dmpCurrentTreatmentStatus_following = [
                {validator: this._BK_T_mandatoryIfLocoregional_FLW, msg: BK_T_MANDATORY_IF_LOCOREGIONAL_REGISTRATION_ERR},
                {validator: this._BK_T_mandatoryIfRemote_FLW, msg: BK_T_MANDATORY_IF_REMOTE_REGISTRATION_ERR},
                {validator: this._BK_T_progressExcludesOthers_FLW_VIOH, msg: BK_T_PROGRESS_EXCLUDES_OTHERS_ERR},
                {
                    validator: this._BK_T_totalExcludesPartialRemission_FLW_VIOH,
                    msg: BK_T_TOTAL_EXCLUDES_PARTIAL_REMISSION_ERR
                }
            ];
            this.BK_T_dmpTherapyOfLocoregionalRecurrence = [
                {validator: this._BK_T_mandatoryIfLocoregional_FLW, msg: BK_T_MANDATORY_IF_LOCOREGIONAL_REGISTRATION_ERR},
                {validator: this._BK_T_noneExcludesOthers_locoregional_FLW_VIOH, msg: BK_T_NONE_EXCLUDES_OTHERS_ERR},
                {
                    validator: this._BK_T_preoperativeExcludesExcisionAndMastectomy_FLW_VIOH,
                    msg: BK_T_PREOPERATIVE_EXCLUDES_EXCISION_AND_MASTECTOMY_ERR
                }
            ];
            this.BK_T_dmpTherapyOfRemoteMetastases = [
                {validator: this._BK_T_mandatoryIfRemote_FLW, msg: BK_T_MANDATORY_IF_REMOTE_REGISTRATION_ERR},
                {validator: this._BK_T_noneExcludesOthers_remote_FLW_VIOH, msg: BK_T_NONE_EXCLUDES_OTHERS_ERR}
            ];
            this.dmpBisphosphonateTherapy_following = [
                {validator: this._BK_T_mandatoryIfRemoteInBone_FLW, msg: BK_T_MANDATORY_IF_REMOTE_IN_BONE_FLW_ERR},
                {validator: this._BK_T_yesExcludesOthers_FLW_VIOH, msg: BK_T_YES_EXCLUDES_OTHERS_ERR}
            ];
            // TO BE DELETED: 4.21 - END -------------------------------------------------------------------------------
            // ========================================================================================================== \\
            // ========================================================================================================== \\

            this.HGV_T_dmpExaminationDate = [
                {validator: this._HGV_T_mandatory( ["FIRST"], ["CHILD", "ADULT"] ), msg: BK_T_MANDATORY_ERR}
            ];

            this.HGV_T_dmpHearingAidFirstMedication = [
                {validator: this._HGV_T_mandatory( ["FIRST"], ["CHILD", "ADULT"] ), msg: BK_T_MANDATORY_ERR}
            ];

            this.HGV_T_dmpSpeakingTestPossible = [
                {validator: this._HGV_T_mandatory( ["FIRST"], ["ADULT"] ), msg: BK_T_MANDATORY_ERR}
            ];

            this.HGV_T_dmpSpeechComprehensionDB = [
                {
                    validator: this._HGV_T_minOneSelection( ["dmpSpeechComprehensionDB", "dmpSpeechComprehensionEZ", "dmpSpeechComprehensionSVS"], "dmpSpeakingTestPossible", "YES", ["FIRST"], ["ADULT"] ),
                    msg: HGV_T_MINONE_ERR
                },
                {validator: this._HGV_T_validNumber( 0, 120, ["FIRST"], ["ADULT"] ), msg: HGV_T_VALID_VALUE_ERR}
            ];

            this.HGV_T_dmpSpeechDevelopmentDisturbance = [
                {validator: this._HGV_T_mandatory( ["FIRST"], ["CHILD"] ), msg: BK_T_MANDATORY_ERR}
            ];

            this.HGV_T_dmpSpeechComprehensionEZ = [
                {
                    validator: this._HGV_T_minOneSelection( ["dmpSpeechComprehensionDB", "dmpSpeechComprehensionEZ", "dmpSpeechComprehensionSVS"], "dmpSpeakingTestPossible", "YES", ["FIRST"], ["ADULT"] ),
                    msg: HGV_T_MINONE_ERR
                },
                {validator: this._HGV_T_validNumber( 0, 100, ["FIRST"], ["ADULT"] ), msg: HGV_T_VALID_VALUE_ERR}
            ];

            this.HGV_T_dmpSpeechComprehensionSVS = [
                {
                    validator: this._HGV_T_minOneSelection( ["dmpSpeechComprehensionDB", "dmpSpeechComprehensionEZ", "dmpSpeechComprehensionSVS"], "dmpSpeakingTestPossible", "YES", ["FIRST"], ["ADULT"] ),
                    msg: HGV_T_MINONE_ERR
                },
                {validator: this._HGV_T_validNumber( 0, 100, ["FIRST"], ["ADULT"] ), msg: HGV_T_VALID_VALUE_ERR}
            ];

            this.HGV_T_dmpSpeechComprehensionMaterial = [
                {
                    validator: this._HGV_T_mandatoryIf( "dmpSpeakingTestPossible", "YES", ["FIRST"], ["ADULT"] ),
                    msg: BK_T_MANDATORY_ERR
                }
            ];

            this.HGV_T_dmpNoiseReceptionAmblyacousia = [
                {
                    validator: this._HGV_T_minOneSelection( ["dmpNoiseReceptionAmblyacousia", "dmpNoiseFlowAmblyacousia", "dmpCombinedAmblyacousia"], null, null, ["FIRST"], ["CHILD", "ADULT"] ),
                    msg: HGV_T_MINONE_ERR
                }
            ];

            this.HGV_T_dmpNoiseFlowAmblyacousia = [
                {
                    validator: this._HGV_T_minOneSelection( ["dmpNoiseReceptionAmblyacousia", "dmpNoiseFlowAmblyacousia", "dmpCombinedAmblyacousia"], null, null, ["FIRST"], ["CHILD", "ADULT"] ),
                    msg: HGV_T_MINONE_ERR
                }
            ];

            this.HGV_T_dmpCombinedAmblyacousia = [
                {
                    validator: this._HGV_T_minOneSelection( ["dmpNoiseReceptionAmblyacousia", "dmpNoiseFlowAmblyacousia", "dmpCombinedAmblyacousia"], null, null, ["FIRST"], ["CHILD", "ADULT"] ),
                    msg: HGV_T_MINONE_ERR
                }
            ];

            this.HGV_T_dmpAmblyacousiaSeverityLeft = [
                {validator: this._HGV_T_mandatory( ["FIRST"], [] ), msg: BK_T_MANDATORY_ERR}
            ];

            this.HGV_T_dmpAmblyacousiaSeverityRight = [
                {validator: this._HGV_T_mandatory( ["FIRST"], [] ), msg: BK_T_MANDATORY_ERR}
            ];

            this.HGV_T_dmpAmblyacousiaSeverityChildLeft = [
                {validator: this._HGV_T_mandatory( ["FIRST"], ["CHILD"] ), msg: BK_T_MANDATORY_ERR}
            ];

            this.HGV_T_dmpAmblyacousiaSeverityChildRight = [
                {validator: this._HGV_T_mandatory( ["FIRST"], ["CHILD"] ), msg: BK_T_MANDATORY_ERR}
            ];

            this.HGV_T_dmpExaminationDate_following = [
                {validator: this._HGV_T_mandatory( ["FOLLOWING"], ["CHILD", "ADULT"] ), msg: BK_T_MANDATORY_ERR}
            ];

            this.HGV_T_dmpSpeakingTestPossible_following = [
                {validator: this._HGV_T_mandatory( ["FOLLOWING"], ["ADULT"] ), msg: BK_T_MANDATORY_ERR}
            ];

            this.HGV_T_dmpSpeechComprehensionFreeFieldEZ = [
                {
                    validator: this._HGV_T_minOneSelection( ["dmpSpeechComprehensionFreeFieldEZ", "dmpSpeechComprehensionFreeFieldSVS"], "dmpSpeakingTestPossible_following", "YES", ["FOLLOWING"], ["ADULT"] ),
                    msg: HGV_T_MINONE_ERR
                },
                {validator: this._HGV_T_validNumber( 0, 100, ["FOLLOWING"], ["ADULT"] ), msg: HGV_T_VALID_VALUE_ERR}
            ];

            this.HGV_T_dmpSpeechComprehensionFreeFieldSVS = [
                {
                    validator: this._HGV_T_minOneSelection( ["dmpSpeechComprehensionFreeFieldEZ", "dmpSpeechComprehensionFreeFieldSVS"], "dmpSpeakingTestPossible_following", "YES", ["FOLLOWING"], ["ADULT"] ),
                    msg: HGV_T_MINONE_ERR
                },
                {validator: this._HGV_T_validNumber( 0, 100, ["FOLLOWING"], ["ADULT"] ), msg: HGV_T_VALID_VALUE_ERR}
            ];

            this.HGV_T_dmpListeningRangeWithoutHG = [
                {validator: this._HGV_T_validNumber( 0, 10, ["FOLLOWING"], ["ADULT"] ), msg: HGV_T_VALID_VALUE_ERR}
            ];

            this.HGV_T_dmpListeningRangeWithHG = [
                {validator: this._HGV_T_validNumber( 0, 10, ["FOLLOWING"], ["ADULT"] ), msg: HGV_T_VALID_VALUE_ERR}
            ];

            this.HGV_T_dmpAdvantageWithHG = [
                {validator: this._HGV_T_validNumber( -9800, 100, ["FOLLOWING"], ["ADULT"] ), msg: HGV_T_VALID_VALUE_ERR}
            ];

            this.HGV_T_dmpHearingAidSuccessDetectable = [
                {validator: this._HGV_T_mandatory( ["FOLLOWING"], ["CHILD"] ), msg: BK_T_MANDATORY_ERR}
            ];

            this.ZervixZytologie_T_dmpExaminationDate = [
                {validator: this._ZervixZytologie_T_DateIsMandatory, msg: ZERVIXZYTOLOGIE_T_MANDATORY_DATE_ERR}
            ];

            this.ZervixZytologie_T_dmpZytologicalFindingSelection = [
                {
                    validator: this._ZervixZytologie_T_dmpZytologicalFindingSelectionIsMandatroy,
                    msg: ZERVIXZYTOLOGIE_T_MANDATORY_ERR
                }
            ];

            this.ZervixZytologie_T_dmpZytologicalFinding = [
                {validator: this._ZervixZytologie_T_dmpZytologicalFindingIsMandatroy, msg: BK_T_MANDATORY_ERR}
            ];

            this.ZervixZytologie_T_dmpHistologicalClarificationSelection = [
                {
                    validator: this._ZervixZytologie_T_dmpHistologicalClarificationSelectionIsMandatroy,
                    msg: BK_T_MANDATORY_ERR
                }
            ];

            this.KHK_T_dmpAnginaPectoris = [
                {validator: this._KHK_T_mandatory, msg: DMP_BASE_T_MANDATORY_ERR}
            ];
            this.KHK_T_dmpLdlCholesterolValue = [
                {validator: this._KHK_T_dmpLdlCholesterolValue, msg: KHK_T_dmpLdlCholesterol_ERR}
            ];
            this.KHK_T_dmpLdlCholesterolUnit = [
                {validator: this._KHK_T_dmpLdlCholesterolUnit, msg: KHK_T_dmpLdlCholesterol_ERR}
            ];
            this.KHK_T_dmpLdlCholesterolNotDetermined = [
                {validator: this._KHK_T_dmpLdlCholesterolNotDetermined, msg: KHK_T_dmpLdlCholesterol_ERR}
            ];
            this.KHK_T_dmpKhkRelevantEvents = [
                {validator: this._KHK_T_mandatory, msg: DMP_BASE_T_MANDATORY_ERR},
                {validator: this._KHK_T_dmpKhkRelevantEvents, msg: DMP_BASE_T_NO_EXCLUDES_OTHERS_ERR}
            ];
            this.KHK_T_dmpDiagnosticCoronaryTherapeuticIntervention = [
                {validator: this._KHK_T_mandatory, msg: DMP_BASE_T_MANDATORY_ERR},
                {validator: this._KHK_T_NoneExcludesOthers, msg: DMP_BASE_T_NONE_EXCLUDES_OTHERS_ERR}
            ];
            this.KHK_T_dmpHadStationaryKhkTreatment = [
                {validator: this._KHK_T_dmpHadStationaryKhkTreatment, msg: DMP_BASE_T_MANDATORY_ERR},
                {validator: this._DMP_T_relevantEventNumCommon, msg: DMP_RELEVANT_EVENTS_COMMON_ERR}
            ];
            this.KHK_T_dmpKhkOtherMedication = [
                {validator: this._KHK_T_mandatory, msg: DMP_BASE_T_MANDATORY_ERR}
            ];
            this.KHK_T_dmpKhkRelatedTransferArranged = [
                {validator: this._KHK_T_mandatory, msg: DMP_BASE_T_MANDATORY_ERR}
            ];
            this.KHK_T_dmpRecommendedKhkTrainings = [
                {validator: this._KHK_T_mandatory, msg: DMP_BASE_T_MANDATORY_ERR},
                {validator: this._KHK_T_NoneExcludesOthers, msg: DMP_BASE_T_NONE_EXCLUDES_OTHERS_ERR}
            ];
            this.KHK_T_dmpKhkRelatedConfinementArranged = [
                {validator: this._KHK_T_mandatory, msg: DMP_BASE_T_MANDATORY_ERR}
            ];

            this.ASTHMA_T_dmpFrequencyOfAsthmaSymptoms = [
                {validator: this._ASTHMA_T_mandatory_until_Q1_2019, msg: DMP_BASE_T_MANDATORY_ERR}
            ];

            this.ASTHMA_T_dmpFrequencyOfAsthmaSymptoms_4_44 = [
                {validator: this._ASTHMA_T_mandatory_from_Q2_2019, msg: DMP_BASE_T_MANDATORY_ERR}
            ];
            this.ASTHMA_T_dmpCurrentPeakFlowValue = [
                {validator: this._ASTHMA_T_dmpCurrentPeakFlowValue, msg: ASTHMA_T_dmpCurrentPeakFlow_ERR}
            ];
            this.ASTHMA_T_dmpCurrentPeakFlowValueNotDone = [
                {validator: this._ASTHMA_T_dmpCurrentPeakFlowValueNotDone, msg: ASTHMA_T_dmpCurrentPeakFlow_ERR}
            ];
            this.ASTHMA_T_dmpCurrentFEV1Value_4_44 = [
                {validator: this._ASTHMA_T_dmpCurrentFEV1Value_4_44, msg: ASTHMA_T_dmpCurrentFEV1Value_4_44_ERR}
            ];
            this.ASTHMA_T_dmpCurrentFEV1ValueNotDone_4_44 = [
                {validator: this._ASTHMA_T_dmpCurrentFEV1ValueNotDone_4_44, msg: ASTHMA_T_dmpCurrentFEV1Value_4_44_ERR}
            ];
            this.ASTHMA_T_dmpHadStationaryAsthmaTreatment = [
                {validator: this._ASTHMA_T_dmpHadStationaryAsthmaTreatment, msg: DMP_BASE_T_MANDATORY_ERR}
            ];
            this.ASTHMA_T_dmpHadUnplannedAsthmaTreatment_4_44 = [
                {validator: this._ASTHMA_T_dmpHadUnplannedAsthmaTreatment_4_44, msg: DMP_BASE_T_MANDATORY_ERR}
            ];
            this.ASTHMA_T_dmpInhaledGlucocorticosteroids = [
                {validator: this._ASTHMA_T_mandatory, msg: DMP_BASE_T_MANDATORY_ERR},
                {
                    validator: this._ASTHMA_T_IfNecessaryChronicMedicationNoneContraindication,
                    msg: ASTHMA_T_IF_NECESSARY_CHRONICMEDICATION_NONE_CONTRAINDICATION_ERR
                }
            ];
            this.ASTHMA_T_dmpInhaledLongActingBeta2AdrenergicAgonist = [
                {validator: this._ASTHMA_T_mandatory, msg: DMP_BASE_T_MANDATORY_ERR},
                {
                    validator: this._ASTHMA_T_IfNecessaryChronicMedicationNoneContraindication,
                    msg: ASTHMA_T_IF_NECESSARY_CHRONICMEDICATION_NONE_CONTRAINDICATION_ERR
                }
            ];
            this.ASTHMA_T_dmpInhaledRapidActingBeta2AdrenergicAgonist = [
                {validator: this._ASTHMA_T_mandatory, msg: DMP_BASE_T_MANDATORY_ERR},
                {
                    validator: this._ASTHMA_T_IfNecessaryChronicMedicationNoneContraindication,
                    msg: ASTHMA_T_IF_NECESSARY_CHRONICMEDICATION_NONE_CONTRAINDICATION_ERR
                }
            ];
            this.ASTHMA_T_dmpSystemicGlucocorticosteroids = [
                {validator: this._ASTHMA_T_mandatory, msg: DMP_BASE_T_MANDATORY_ERR},
                {
                    validator: this._ASTHMA_T_IfNecessaryChronicMedicationNoneContraindication,
                    msg: ASTHMA_T_IF_NECESSARY_CHRONICMEDICATION_NONE_CONTRAINDICATION_ERR
                }
            ];
            this.ASTHMA_T_dmpOtherAsthmaSpecificMedication = [
                {validator: this._ASTHMA_T_mandatory, msg: DMP_BASE_T_MANDATORY_ERR},
                {validator: this._ASTHMA_T_OtherSpecificMedication_IfNone, msg: DMP_ASTHMA_T_OTHER_MEDICATION_ERR}
            ];
            this.ASTHMA_T_dmpRecommendedAsthmaTrainings = [
                {validator: this._ASTHMA_T_mandatory, msg: DMP_BASE_T_MANDATORY_ERR},
                {validator: this._ASTHMA_T_NoneExcludesOthers, msg: DMP_ASTHMA_COPD_T_NONE_EXCLUDES_OTHERS_ERR}
            ];
            this.ASTHMA_T_dmpAsthmaTrainingAlreadyDoneBeforeDMP_4_44 = [
                {
                    validator: this._ASTHMA_T_dmpAsthmaTrainingAlreadyDoneBeforeDMP_4_44,
                    msg: ASTHMA_T_dmpAsthmaTrainingAlreadyDoneBeforeDMP_4_44_ERR
                }
            ];
            this.ASTHMA_T_dmpPerceivedAsthmaTraining = [
                {validator: this._ASTHMA_T_mandatoryFollowing, msg: DMP_BASE_T_MANDATORY_ERR}
            ];
            this.ASTHMA_T_dmpWrittenSelfManagementPlan = [
                {validator: this._ASTHMA_T_mandatory, msg: DMP_BASE_T_MANDATORY_ERR}
            ];
            this.ASTHMA_T_dmpTherapyAdjustment_4_44 = [
                {validator: this._ASTHMA_T_dmpTherapyAdjustment_4_44, msg: ASTHMA_T_dmpTherapyAdjustment_4_44_ERR}
            ];
            this.ASTHMA_T_dmpAsthmaRelatedTransferOrConfinementArranged = [
                {validator: this._ASTHMA_T_mandatory_until_Q1_2019, msg: DMP_BASE_T_MANDATORY_ERR}
            ];

            this.COPD_T_dmpCurrentFev1 = [
                {validator: this._COPD_T_dmpCurrentFev1, msg: COPD_T_dmpCurrentFev1_ERR}
            ];
            this.COPD_T_dmpCurrentFev1NotDone = [
                {validator: this._COPD_T_dmpCurrentFev1NotDone, msg: COPD_T_dmpCurrentFev1_ERR}
            ];
            this.COPD_T_dmpClinicalAssessmentOfOsteoporosisRisk = [
                {
                    validator: this._COPD_T_dmpClinicalAssessmentOfOsteoporosisRisk,
                    msg: COPD_T_dmpClinicalAssessmentOfOsteoporosisRisk_ERR
                }
            ];
            this.COPD_T_dmpFrequencyExacerbationsSinceLast = [
                {validator: this._COPD_T_dmpFrequencyExacerbationsSinceLast, msg: DMP_BASE_T_MANDATORY_ERR},
                {validator: this._DMP_T_relevantEventNumCommon, msg: DMP_RELEVANT_EVENTS_COMMON_ERR}
            ];
            this.COPD_T_dmpHadStationaryCopdTreatment = [
                {validator: this._COPD_T_dmpHadStationaryCopdTreatment, msg: DMP_BASE_T_MANDATORY_ERR},
                {validator: this._DMP_T_relevantEventNumCommon, msg: DMP_RELEVANT_EVENTS_COMMON_ERR}
            ];
            this.COPD_T_dmpShortActingBeta2AdrenergicAgonistAnticholinergics = [
                {validator: this._COPD_T_mandatory, msg: DMP_BASE_T_MANDATORY_ERR},
                {
                    validator: this._COPD_T_IfNecessaryChronicMedicationNoneContraindication,
                    msg: COPD_T_IF_NECESSARY_CHRONICMEDICATION_NONE_CONTRAINDICATION_ERR
                }
            ];
            this.COPD_T_dmpLongActingBeta2AdrenergicAgonist = [
                {validator: this._COPD_T_mandatory, msg: DMP_BASE_T_MANDATORY_ERR},
                {
                    validator: this._COPD_T_IfNecessaryChronicMedicationNoneContraindication,
                    msg: COPD_T_IF_NECESSARY_CHRONICMEDICATION_NONE_CONTRAINDICATION_ERR
                }
            ];
            this.COPD_T_dmpLongActingAnticholinergics = [
                {validator: this._COPD_T_mandatory, msg: DMP_BASE_T_MANDATORY_ERR},
                {
                    validator: this._COPD_T_IfNecessaryChronicMedicationNoneContraindication,
                    msg: COPD_T_IF_NECESSARY_CHRONICMEDICATION_NONE_CONTRAINDICATION_ERR
                }
            ];
            this.COPD_T_dmpOtherDiseaseSpecificMedication = [
                {validator: this._COPD_T_mandatory, msg: DMP_BASE_T_MANDATORY_ERR},
                {validator: this._COPD_T_NoExcludesOthers, msg: DMP_BASE_T_NO_EXCLUDES_OTHERS_ERR}
            ];
            this.COPD_T_dmpRecommendedCopdTrainings = [
                {validator: this._COPD_T_mandatory, msg: DMP_BASE_T_MANDATORY_ERR},
                {validator: this._COPD_T_NoneExcludesOthers, msg: DMP_ASTHMA_COPD_T_NONE_EXCLUDES_OTHERS_ERR}
            ];
            this.COPD_T_dmpAttendedTrainingBeforeSubscription = [
                {validator: this._COPD_T_mandatory_onFirst_4_0_0, msg: DMP_BASE_T_MANDATORY_ERR},
                {validator: this._COPD_T_NoneExcludesOthers_onFirst_4_0_0, msg: DMP_ASTHMA_COPD_T_NONE_EXCLUDES_OTHERS_ERR}
            ];
            this.COPD_T_dmpPerceivedCopdTraining = [
                {validator: this._COPD_T_mandatoryFollowing, msg: DMP_BASE_T_MANDATORY_ERR}
            ];
            this.COPD_T_dmpCopdRelatedTransferOrConfinementArranged = [
                {validator: this._COPD_T_mandatory, msg: DMP_BASE_T_MANDATORY_ERR}
            ];
            this.COPD_T_dmpRecommendedTobaccoAbstinence = [
                {validator: this._COPD_T_mandatory_4_0_0_smoker, msg: DMP_BASE_T_MANDATORY_IF_SMOKER_ERR}
            ];
            this.COPD_T_dmpRecommendedTobaccoRehabProgram = [
                {validator: this._COPD_T_mandatory_4_0_0_smoker, msg: DMP_BASE_T_MANDATORY_IF_SMOKER_ERR}
            ];
            this.COPD_T_dmpAttendedTobaccoRehabProgramSinceLastRecommendation = [
                {
                    validator: this._COPD_T_dmpAttendedTobaccoRehabProgramSinceLastRecommendation,
                    msg: DMP_BASE_T_MANDATORY_IF_SMOKER_ERR
                }
            ];
            this.COPD_T_dmpRecommendedPhysicalTraining = [
                {validator: this._COPD_T_dmpRecommendedPhysicalTraining, msg: DMP_BASE_T_MANDATORY_ERR}
            ];

            this.SDDA_mandatory = [
                {validator: this._SDDA_mandatory, msg: DMP_BASE_T_MANDATORY_ERR}
            ];
            this.SDDA_IK_OR_UKV = [
                {validator: this._SDDA_IK_OR_UKV, msg: DMP_BASE_T_IK_OR_UKV_ERR}
            ];
            this.SDDA_connect = [
                {validator: this._SDDA_connect, msg: DMP_BASE_T_MANDATORY_ERR}
            ];
            this.REFERRAL_single_line = [
                {validator: this._REFERRAL_single_line, msg: STRING_TOO_LONG_ERR}
            ];
            this.Prescription_T_substitutePrescription = [
                {validator: this._Prescription_T_substitutePrescription, msg: PRESCRIPTION_T_SUBSTITUTEPRESCRIPTION_ERR}
            ];
            this.REFERRAL_double_line = [
                {validator: this._REFERRAL_double_line, msg: STRING_TOO_LONG_ERR}
            ];
            this.REFERRAL_quadruple_line = [
                {validator: this._REFERRAL_quadruple_line, msg: STRING_TOO_LONG_ERR}
            ];
            this.KBVUTILITY_utGroupTherapy = [
                {validator: this._KBVUTILITY_utGroupTherapy, msg: KBVUTILITY_UTGROUPTHERAPY_ERR}
            ];
            this.KBVUTILITY_utPrescriptionType = [
                {validator: this._KBVUTILITY_utPrescriptionType, msg: KBVUTILITY_UTPRESCRIPTIONTYPE_ERR}
            ];
            this.KBVUTILITY_utLatestStartOfTreatment = [
                {validator: this._KBVUTILITY_utLatestStartOfTreatment, msg: KBVUTILITY_UTLATESTSTARTOFTREATMENT}
            ];
            this.KBVUTILITY_utMedicalJustification = [
                {validator: this._KBVUTILITY_utMedicalJustification, msg: KBVUTILITY_UTMEDICALJUSTIFICATION}
            ];
            this.KBVUTILITY_subType = [
                {validator: this._KBVUTILITY_subType, msg: KBVUTILITY_SUBTYPE}
            ];
            this.KBVUTILITY_utIndicationCode = [
                {validator: this._KBVUTILITY_utIndicationCode, msg: KBVUTILITY_UTINDICATIONCODE}
            ];
            this.KBVUTILITY_utIcdCode = [
                {validator: this._KBVUTILITY_utIcdCode, msg: KBVUTILITY_UTCIDCODE}
            ];
            this.KBVUTILITY_utRemedy1List = [
                {validator: this._KBVUTILITY_utRemedy1List, msg: KBVUTILITY_UTREMEDYLIST}
            ];
            this.KBVUTILITY_utRemedy2List = [
                {validator: this._KBVUTILITY_utRemedy2List, msg: KBVUTILITY_UTREMEDYLIST}
            ];
            this.KBVUTILITY_utRemedy1Seasons = [
                {validator: this._KBVUTILITY_utRemedySeasons, msg: KBVUTILITY_UTREMEDYSEASONS},
                {validator: this._KBVUTILITY_utRemedySeasons_2, msg: KBVUTILITY_UTREMEDYSEASONS_2},
                {validator: this._KBVUTILITY_utRemedySeasons_ET, msg: KBVUTILITY_UTREMEDYSEASONS_ET}
            ];
            this.KBVUTILITY_utRemedy2Seasons = [
                {validator: this._KBVUTILITY_utRemedySeasons, msg: KBVUTILITY_UTREMEDYSEASONS},
                {validator: this._KBVUTILITY_utRemedySeasons_2, msg: KBVUTILITY_UTREMEDYSEASONS_2},
                {validator: this._KBVUTILITY_utRemedySeasons_3, msg: KBVUTILITY_UTREMEDYSEASONS_3}
            ];

            this.KBVUtilityPrices_price = [
                {validator: this._KBVUtilityPrices_price, msg: KBVUTILITYPRICES_PRICE_ERR}
            ];
            this.KBVUtilityPrices_prices = [
                {validator: this._KBVUtilityPrices_prices, msg: KBVUTILITYPRICES_PRICES_ERR}
            ];

            this.KBV_BFB61_mobilityOther = [
                {validator: this._KBV_BFB61_mobilityOther, msg: KBV_BFB61_MOBILITY_OTHER}
            ];
            this.KBVUTILITY_restTicketNumber = [
                createValidator( 'LENGTH', {min: 0, max: 40} )
            ];

            this.KBVUTILITY2_ut2PatientSpecificConductionSymptomsFreeText = [
                {
                    validator: this._KBVUTILITY2_ut2PatientSpecificConductionSymptomsFreeText,
                    msg: MONGOOSE_MISSING_MANDATORY_VALUE
                }
            ];

            this.KBVUTILITY2_ut2TherapyFrequencyMin = [
                {validator: this._KBVUTILITY2_ut2TherapyFrequencyMandatory, msg: MONGOOSE_MISSING_MANDATORY_VALUE},
                {
                    validator: this._KBVUTILITY2_ut2TherapyFrequencyMaxDecimals,
                    msg: KBVUTILITY2_UT2THERAPYFREQUENCYMAXDECIMALS_ERR
                }
            ];

            this.KBVUTILITY2_ut2TherapyFrequencyMax = [
                {
                    validator: this._KBVUTILITY2_ut2TherapyFrequencyMaxDecimals,
                    msg: KBVUTILITY2_UT2THERAPYFREQUENCYMAXDECIMALS_ERR
                },
                {validator: this._KBVUTILITY2_ut2TherapyFrequencyMax, msg: MONGOOSE_MISSING_MANDATORY_VALUE}
            ];

            this.KBVUTILITY2_ut2TherapyFrequencyType = [
                {validator: this._KBVUTILITY2_ut2TherapyFrequencyMandatory, msg: MONGOOSE_MISSING_MANDATORY_VALUE}
            ];

            this.KBVUTILITY2__T_ut2RemedyLists = [
                {validator: this._KBVUTILITY2__T_ut2RemedyLists, msg: KBVUTILITY2__T_UT2REMEDYLISTS_ERR}
            ];

            this.KBVUtility2Approval_T_approvalValidTo = [
                {validator: this._KBVUtility2Approval_T_approvalValidTo, msg: MONGOOSE_MISSING_MANDATORY_VALUE}
            ];

            this.KBVMedicationPlan_T_tildeNotAllowed = [
                {validator: this._tildeNotAllowed, msg: TILDE_NOT_ALLOWED}
            ];
            this.KBVMedicationPlan_T_patientWeight = [
                createValidator( 'LENGTH', {min: 0, max: 5} )
            ];
            this.KBVMedicationPlan_T_patientHeight = [
                createValidator( 'LENGTH', {min: 0, max: 3} )
            ];
            this.KBVMedicationPlan_T_patientCreatinineValue = [
                createValidator( 'LENGTH', {min: 0, max: 5} )
            ];
            this.KBVMedicationPlan_T_patientAllergiesAndIntolerances = [
                createValidator( 'LENGTH', {min: 0, max: 50} )
            ];
            this.MedicationPlanEntries_T_freeText = [
                {
                    validator: this._MedicationPlanEntries_T_freeText,
                    msg: MONGOOSE_MISSING_MANDATORY_VALUE + '\n' + MAX_200_CHARS
                },
                {validator: this._KBVMedicationPlanEntry_tildeNotAllowed, msg: TILDE_NOT_ALLOWED}
            ];
            this.MedicationPlanEntries_T_phNLabel = [
                {validator: this._MedicationPlanEntries_T_phNLabel, msg: MONGOOSE_MISSING_MANDATORY_VALUE}
            ];
            this.MedicationPlanEntries_T_bindText = [
                {
                    validator: this._MedicationPlanEntries_T_bindText,
                    msg: MONGOOSE_MISSING_MANDATORY_VALUE + '\n' + MAX_200_CHARS
                },
                {validator: this._KBVMedicationPlanEntry_tildeNotAllowed, msg: TILDE_NOT_ALLOWED}
            ];
            this.MedicationPlanEntries_T_medicationRecipeText = [
                {
                    validator: this._MedicationPlanEntries_T_medicationRecipeText,
                    msg: MONGOOSE_MISSING_MANDATORY_VALUE + '\n' + MAX_200_CHARS
                },
                {validator: this._KBVMedicationPlanEntry_tildeNotAllowed, msg: TILDE_NOT_ALLOWED}
            ];
            this.MedicationPlanEntries_T_subHeadingText = [
                {
                    validator: this._MedicationPlanEntries_T_subHeadingText,
                    msg: MONGOOSE_MISSING_MANDATORY_VALUE + '\n' + MAX_50_CHARS
                }
            ];
            this.LabRequest_T_befEiltNr = [
                {validator: this._LabRequest_T_befEiltNr, msg: MONGOOSE_MISSING_MANDATORY_VALUE}
            ];
        }

        DCValidationsKBV.prototype = {
            _Max_One_Selection: function _Max_One_Selection( val ) {
                return !val || typeof val === 'string';
            },
            _isPositiveInteger: function _isPositiveInteger( val ) {
                return Math.sign( val ) === 1 && Number.isInteger( Number( val ) );
            },        // DMP Utilities -----------------------------------------------------------------------------------------------

            _042: function _042( val ) {
                return null !== (/^\d{5}[A-Z]?$/).exec( val );
            },
            _046: function _046( val ) {
                return null !== (/^\d-\d{2}[0-9a-z]\.?[0-9a-z]?[0-9a-z]?$/i).exec( val );
            },
            _116: function _116( val ) {
                if( Y.doccirrus.schemas.patient.isPublicInsurance( this ) ) {
                    switch( val ) {
                        case '1':
                        case '3':
                        case '5':
                            return true;
                        default:
                            return false;
                    }
                }
                return true;
            },
            _320: function _320( /*val*/ ) {
                return true;
            },
            _528: function _528( val ) {
                if( Y.doccirrus.schemas.patient.isPublicInsurance( this ) ) {
                    switch( val ) {
                        case '':
                        case '1':
                        case '2':
                        case '3':
                        case '4':
                        case '5':
                        case '6':
                        case '7':
                        case '8':
                        case '9':
                            return true;
                        default:
                            return false;
                    }
                }
                return true;
            },
            _529: function _529( val ) {
                if( Y.doccirrus.schemas.patient.isPublicInsurance( this ) ) {
                    switch( val ) {
                        case '':
                        case '4':
                        case '6':
                        case '7':
                        case '8':
                        case '9':
                            return true;
                        default:
                            return false;
                    }
                }
                return true;
            },

            _kvkNo: function _kvkNo( val ) {
                return null !== /^\d{6,12}$/.exec( val );
            },
            _egkNo: function _egkNo( val ) {
                return null !== /^[A-Z]{1}\d{9}$/i.exec( val );
            },
            _Person_T_insuranceStatus: function _Person_T_insuranceStatus( val ) {
                var
                    _k = Y.dcforms.mapper.koUtils.getKo(),
                    i, type, typeA,
                    helper = [];
                for( i = 0; i < val.length; i++ ) {
                    type = _k.unwrap( val[i].type );
                    helper.push( type );
                }
                for( i = 0; i < helper.length; i++ ) {
                    if( helper[i].match( Y.doccirrus.regexp.additionalInsuranceTypeRegex ) ) {
                        typeA = helper[i].split( '_A' )[0];
                        if( !helper.includes( typeA ) ) {
                            return false;
                        }
                    }
                }
                return true;
            },
            _Person_T_kbvDob: function _Person_T_kbvDob( val ) {
                var valid = false,
                    mom = validationLibrary.getMoment(),
                    kbvDob, kbvDobMom, tomorrowMom;

                if( !val || val.length < 10 ) {
                    return valid;
                }

                kbvDob = new Y.doccirrus.KBVDateValidator( val );
                valid = kbvDob.isValid();

                if( valid ) {
                    // future dates should be invalid
                    kbvDobMom = mom( val, "DD.MM.YYYY" );
                    if( kbvDobMom.isValid() ) {
                        tomorrowMom = mom().startOf( 'day' ).add( 24, 'hours' );
                        if( !kbvDobMom.isBefore( tomorrowMom ) ) {
                            valid = false;
                        }
                    }
                }

                return valid;
            },

            _Activity_T_code: function _Activity_T_code( val ) {

                // allow empty EBM treatments with "Sachkosten"
                if( 'TREATMENT' === this.actType && 'EBM' === this.catalogShort && this.fk5012Set && this.fk5012Set.length ) {
                    return true;
                }

                // this routine is activated in the default FSM
                //   default-fsm.server.js   (conditional mandatory fields)
                if( 'DIAGNOSIS' === this.actType ||
                    'UTILITY' === this.actType ||
                    'TREATMENT' === this.actType
                ) {
                    return validationLibrary._mandatory( val );
                }
                return true;
            },
            _Activity_T_icds: function _Activity_T_icds() {
                var isMandatory = false;
                if( 'SCHEIN' === this.actType ) {
                    if( '0103' === this.scheinType ) {
                        if( ['31'].indexOf( this.scheinSubgroup ) > -1 ) {
                            if( Y.Array.every( ['scheinDiagnosis', 'scheinOrder', 'scheinFinding'], function( field ) {
                                return !validationLibrary._mandatory( this[field] );
                            }, this ) ) {
                                isMandatory = true;
                            }
                        }
                    }
                }
                return isMandatory ? validationLibrary._mandatory( this.icds ) : true;
            },
            _Medication_T_phNLabel: function _Medication_T_phNLabel( val ) {
                if( 'MEDICATION' === this.actType ) {
                    return validationLibrary._mandatory( val );
                }
                return true;
            },
            _tildeNotAllowed: function _Medication_T_phNLabel( val ) {
                if( (val || '').indexOf( '~' ) !== -1 ) {
                    return false;
                }
                return true;
            },
            _KBVMedicationPlanEntry_tildeNotAllowed: function _Medication_T_phNLabel( val ) {
                if( ['FREETEXT', 'BINDTEXT', 'MEDICATION_RECIPE'].indexOf( this.type ) !== -1 ) {
                    return validationLibraryKbv._tildeNotAllowed( val );
                }
                return true;
            },
            _PhIngr_T_name: function _PhIngr_T_name( val ) {
                return validationLibrary._mandatory( val );
            },
            _Schein_T_scheinQuarter: function _Schein_T_scheinQuarter() {
                var isMandatory = false;
                if( 'SCHEIN' === this.actType ) {
                    isMandatory = true;
                }
                return isMandatory ? validationLibrary._mandatory( this.scheinQuarter ) : true;
            },
            _Schein_T_scheinDate: function _Schein_T_scheinDate( val ) {
                var
                    moment = validationLibrary.getMoment(),
                    result = true,
                    timestamp = this.timestamp;
                if( 'SCHEIN' === this.actType && '0102' === this.scheinType && val ) {
                    result = moment( val ).isBefore( moment() ) && (moment( val ).isSame( timestamp, 'day' ) || moment( val ).isBefore( moment( timestamp ) ));
                }
                return result;
            },
            /**
             * Checks for subGroup 27 and the scheinDate (fk4102). scheinDate is mandatory if subgroup is 27.
             * @returns {*|boolean}
             * @private
             */
            _Schein_T_scheinDate_Mandatory: function _Schein_T_scheinDate_Mandatory() {
                var isMandatory = false;

                if(this.scheinSubgroup === '27' || this.scheinSubgroup === '28' ) {
                    isMandatory = true;
                }

                return isMandatory ? validationLibrary._mandatory( this.scheinDate ) : true;
            },
            _Schein_T_scheinYear: function _Schein_T_scheinYear() {
                var isMandatory = false;
                if( 'SCHEIN' === this.actType ) {
                    isMandatory = true;
                }
                return isMandatory ? validationLibrary._mandatory( this.scheinYear ) : true;
            },
            _Schein_T_scheinType: function _Schein_T_scheinType() {
                var isMandatory = false;
                if( 'SCHEIN' === this.actType ) {
                    isMandatory = true;
                }
                return isMandatory ? validationLibrary._mandatory( this.scheinType ) : true;
            },
            _Schein_T_scheinSubgroup: function _Schein_T_scheinSubgroup() {
                var isMandatory = false;
                if( 'SCHEIN' === this.actType ) {
                    isMandatory = true;
                }
                return isMandatory ? validationLibrary._mandatory( this.scheinSubgroup ) : true;
            },
            _Schein_T_fk4125: function _Schein_T_fk4125from() {
                var valid = true;
                if( 'SCHEIN' === this.actType && (
                    (this.fk4125from && !this.fk4125to) ||
                    (!this.fk4125from && this.fk4125to)
                ) ) {
                    return false;
                }
                return valid;
            },
            _Schein_T_scheinTransferArrangementCode: function _Schein_T_fk4125from( val ) {
                if( !val ) {
                    return true;
                }
                return val.length === 12 && validationLibrary._euroalphanum( val );
            },
            _Schein_T_scheinRemittor: function _Schein_T_scheinRemittor( val ) {
                var valid = true;
                if( 'SCHEIN' === this.actType ) {
                    if( val && !validationLibrary._mandatory( val ) ) {
                        valid = false;
                    }
                    if( '0102' === this.scheinType ) {
                        if( !this.fk4219 ) {
                            if( !val ) {
                                valid = false;
                            }
                        }
                    }
                    if( '0103' === this.scheinType ) {
                        if( '31' === this.scheinSubgroup ) {
                            if( !val ) {
                                valid = false;
                            }
                        }
                    }
                }
                return valid;
            },
            /**
             * Checks if LANR Überweiser (fk4242) and LANR of current employee (fk5099) are different.
             * @param val
             * @returns {boolean}
             * @private
             */
            _Schein_T_scheinRemittorFk4242DiffFromFk5099: function _Schein_T_scheinRemittor( val ) {
                var
                    valid = true;

                if( 'string' === typeof val ) {
                    if( 'SCHEIN' === this.actType ) {
                        if( '0102' === this.scheinType ) {
                            if( ['28'].indexOf( this.scheinSubgroup ) > -1 ) {
                                if( val !== this.fk5099 ) {
                                    valid = false;
                                }
                            }
                        }
                    }
                }

                return valid;
            },
            /**
             * Checks if BSNR Überweiser (fk4218) and BSNR of current employee (fk5098) are different.
             * @param val
             * @returns {boolean}
             * @private
             */
            _Schein_T_scheinEstablishmentFk4218DiffFromFk5098: function _Schein_T_scheinRemittor( val ) {
                var
                    valid = true;

                if( 'string' === typeof val ) {
                    if( 'SCHEIN' === this.actType ) {
                        if( '0102' === this.scheinType ) {
                            if( ['28'].indexOf( this.scheinSubgroup ) > -1 ) {
                                if( val !== this.fk5098 ) {
                                    valid = false;
                                }
                            }
                        }
                    }
                }

                return valid;
            },
            _Schein_T_scheinEstablishment: function _Schein_T_scheinEstablishment( val ) {
                var valid = true;
                if( 'SCHEIN' === this.actType ) {
                    if( val && !validationLibrary._mandatory( val ) ) {
                        valid = false;
                    }
                    if( '0102' === this.scheinType ) {
                        if( !this.fk4219 ) {
                            if( ['20', '21', '23', '24', '26'].indexOf( this.scheinSubgroup ) > -1 ) {
                                if( !validationLibrary._mandatory( this.scheinRemittor ) ) {
                                    valid = false;
                                }
                            }
                        }
                    }
                    if( '0103' === this.scheinType ) {
                        if( '31' === this.scheinSubgroup ) {
                            if( !val ) {
                                valid = false;
                            }
                        }
                    }
                }
                return valid;
            },
            /**
             * Checks if the value begins with 77 and if its the default value for this input "7777777700".
             * @private
             */
            _Schein_T_scheinEstablishmentFk4218DefaultValueForSeventySeven: function _Schein_T_scheinEstablishmentFk4218DefaultValueForSeventySeven() {
                var valid = true;

                if( this.scheinEstablishment ) {
                    if( this.scheinEstablishment.substring( 0, 2 ) === '77' ) {
                        if( this.scheinEstablishment !== '777777700' ) {
                            valid = false;
                        }
                    }
                }
                return valid;
            },
            /**
             * Checks if Erstveranlasser and Überweiser have different bsnrs.
             * @returns {boolean}
             * @private
             */
            _Schein_T_fk4217scheinEstablishmentFk4218SameValueError: function _Schein_T_fk4217scheinEstablishmentFk4218SameValueError() {
                var valid = true;
                if( typeof this.scheinEstablishment !== 'undefined' && typeof this.fk4217 !== 'undefined' ) {
                    if( this.scheinEstablishment !== '' && this.fk4217 !== '' ) {
                        if( this.fk4217 === this.scheinEstablishment ) {
                            if( '0102' === this.scheinType ) {
                                if( ['27', '28'].indexOf( this.scheinSubgroup ) > -1 ) {
                                    valid = false;
                                }
                            }
                        }
                    }
                }
                return valid;
            },
            /**
             * Checks if bsnr Erstveranlasser is empty when subgroup 28 is selected.
             * @returns {boolean}
             * @private
             */
            _Schein_T_fk4217NeedsToBeEmpty: function _Schein_T_fk4217NeedsToBeEmpty( val ) {
                var valid = true;
                if( 'string' === typeof val ) {
                    if( 'SCHEIN' === this.actType ) {
                        if( '0102' === this.scheinType ) {
                            if( ['28'].indexOf( this.scheinSubgroup ) > -1 ) {
                                if( val ) {
                                    valid = false;
                                }
                            }
                        }
                    }
                }
                return valid;
            },
            /**
             * Checks if bsnr Erstveranlasser has a valid structure.
             * @returns {boolean}
             * @private
             */
            _Schein_T_fk4217: function _Schein_T_fk4217( val ) {
                var valid = true;
                if( 'string' === typeof val ) {
                    if( 'SCHEIN' === this.actType ) {
                        if( ['27', '28'].indexOf( this.scheinSubgroup ) > -1 ) {
                            if( val && !validationLibrary._bsnr( val ) ) {
                                valid = false;
                            }
                        }
                    }
                }
                return valid;
            },
            /**
             * Checks if Untergruppe is selected in Überweisung.
             * @returns {boolean}
             * @private
             */
            _Schein_T_scheinSpecialisation: function _Schein_T_scheinSpecialisation() {
                var
                    isMandatory = false;
                if( 'SCHEIN' === this.actType ) {
                    // _320
                    if( '0102' === this.scheinType ) {
                        if( ['27','28'].indexOf( this.scheinSubgroup ) === -1 ) {
                            isMandatory = true;
                        }
                    }
                }
                return isMandatory ? validationLibrary._mandatory( this.scheinSpecialisation ) : true;
            },
            /**
             * Checks if MedicalTreatment is selected if in Untergruppe 27, 28.
             * @returns {boolean}
             * @private
             */
            _Schein_T_scheinSlipMedicalTreatment: function _Schein_T_scheinSlipMedicalTreatment() {
                var
                    isMandatory = false;

                if( 'SCHEIN' === this.actType ) {
                    if( '0102' === this.scheinType ) {
                        if( ['27','28'].indexOf( this.scheinSubgroup ) > -1 ) {
                            isMandatory = true;
                        }
                    }
                } else if( 'LABREQUEST' === this.actType ) {
                    isMandatory = true;
                }
                return isMandatory ? validationLibrary._mandatory( this.scheinSlipMedicalTreatment ) : true;
            },
            /**
             * Checks if MedicalTreatment ESS is selected if in Untergruppe 28.
             * @returns {boolean}
             * @private
             */
            _Schein_T_scheinSlipMedicalTreatmentSubGroupTreatmentSelection: function _Schein_T_scheinSlipMedicalTreatmentSubGroupTreatmentSelection() {
                var
                    valid = true;

                if( 'SCHEIN' === this.actType ) {
                    if( '0102' === this.scheinType ) {
                        if( ['28'].indexOf( this.scheinSubgroup ) > -1 ) {
                            if ( '3' === this.scheinSlipMedicalTreatment ) {
                                valid = false;
                            }
                        }
                    }
                }
                return valid;
            },
            _Schein_T_scheinClinicalTreatmentFrom: function _Schein_T_scheinClinicalTreatmentFrom( val ) {
                if( 'SCHEIN' === this.actType ) {
                    if( '0103' === this.scheinType ) {
                        if( ['30'].indexOf( this.scheinSubgroup ) > -1 ) {
                            return validationLibrary._date( val );
                        }
                    }
                }
                return validationLibrary._dateNotRequired;
            },
            _Schein_T_scheinClinicalTreatmentTo: function _Schein_T_scheinClinicalTreatmentTo( val ) {
                if( 'SCHEIN' === this.actType ) {
                    if( '0103' === this.scheinType ) {
                        if( ['30'].indexOf( this.scheinSubgroup ) > -1 ) {
                            return validationLibrary._date( val );
                        }
                    }
                }
                return validationLibrary._dateNotRequired;
            },
            _Schein_T_scheinClinicalTreatmentDatesNeeded: function _Schein_T_scheinClinicalTreatmentTo( val ) {
                if( 'PKVSCHEIN' === this.actType && ('STATIONARY' === this.treatmentType || 'AMBULANT' === this.treatmentType) && this.scheinClinicID ) {
                    return validationLibrary._date( val );
                }
                return true;
            },
            _Schein_T_scheinNextTherapist: function _Schein_T_scheinNextTherapist() {
                var isMandatory = false;
                if( 'SCHEIN' === this.actType ) {
                    if( '0104' === this.scheinType ) {
                        isMandatory = true;
                    }
                }
                return isMandatory ? validationLibrary._mandatory( this.scheinNextTherapist ) : true;
            },
            _Schein_T_scheinOrder: function _Schein_T_scheinOrder( val ) {
                var isMandatory = false;
                if( 'SCHEIN' === this.actType ) {
                    switch( this.scheinType ) {
                        case '0102':
                            if( ['21', '27'].indexOf( this.scheinSubgroup ) > -1 ) {
                                isMandatory = true;
                            }
                            break;
                        case '0103':
                            if( ['31'].indexOf( this.scheinSubgroup ) > -1 ) {
                                if( Y.Array.every( ['icds', 'scheinDiagnosis', 'scheinFinding'], function( field ) {
                                    return !validationLibrary._mandatory( this[field] );
                                }, this ) ) {
                                    isMandatory = true;
                                }
                            }
                            break;
                    }
                }
                return isMandatory ? validationLibrary._mandatory( val ) : true;
            },
            _Schein_T_scheinDiagnosis: function _Schein_T_scheinDiagnosis() {
                var isMandatory = false;
                if( 'SCHEIN' === this.actType ) {
                    if( '0103' === this.scheinType ) {
                        if( ['31'].indexOf( this.scheinSubgroup ) > -1 ) {
                            if( Y.Array.every( ['icds', 'scheinOrder', 'scheinFinding'], function( field ) {
                                return !validationLibrary._mandatory( this[field] );
                            }, this ) ) {
                                isMandatory = true;
                            }
                        }
                    }
                }
                return isMandatory ? validationLibrary._mandatory( this.scheinDiagnosis ) : true;
            },
            _Schein_T_scheinFinding: function _Schein_T_scheinFinding() {
                var isMandatory = false;
                if( 'SCHEIN' === this.actType ) {
                    if( '0103' === this.scheinType ) {
                        if( ['31'].indexOf( this.scheinSubgroup ) > -1 ) {
                            if( Y.Array.every( ['icds', 'scheinDiagnosis', 'scheinOrder'], function( field ) {
                                return !validationLibrary._mandatory( this[field] );
                            }, this ) ) {
                                isMandatory = true;
                            }
                        }
                    }
                }
                return isMandatory ? validationLibrary._mandatory( this.scheinFinding ) : true;
            },
            _Schein_T_fk4219: function _Schein_T_fk4219( val ) {
                if( 'string' === typeof val ) {
                    if( 'SCHEIN' === this.actType ) {
                        if( '0102' === this.scheinType ) {
                            if( !(this.scheinRemittor || this.scheinEstablishment) ) {
                                return validationLibrary._mandatory( val );
                            }
                        }
                    }
                }
                return true;
            },
            /**
             * Checks if lanr Erstveranlasser has a valid structure.
             * @returns {boolean}
             * @private
             */
            _Schein_T_fk4241: function _Schein_T_fk4241( val ) {

                var valid = true;
                if( 'string' === typeof val ) {
                    if( 'SCHEIN' === this.actType ) {
                        if( ['27', '28'].indexOf( this.scheinSubgroup ) > -1 ) {
                            if( val && !validationLibrary._lanr( val ) ) {
                                valid = false;
                            }
                        }
                    }
                }
                return valid;
            },
            _Schein_T_fk4235: function _Schein_T_fk4235( val ) {
                return validationLibrary._date( val );
            },
            _Schein_T_fk4246: function _Schein_T_fk4246( val ) {
                if( this.fk4244 ) {
                    if( '' === val ) {
                        return false;
                    }
                    return validationLibrary._rangeInteger( val, 0, 999 );
                }
                return true;
            },
            _Schein_T_fk4246Offset: function _Schein_T_fk4246( val ) {
                if( this.fk4244 && val ) {
                    return validationLibrary._rangeInteger( val, 0, 999 );
                }
                return true;
            },
            _Schein_T_fk4247: function _Schein_T_fk4247( val ) {
                if( val ) {
                    return validationLibrary._date( val );
                }
                return true;
            },
            _Schein_T_fk4252_fk4255_schema: function _Schein_T_fk4252( val ) {
                return validationLibrary._mandatory( val );
            },

            _Treatment_T_billingFactorValue: function _Treatment_T_billingFactorValue( val ) {
                if( 'TREATMENT' === this.actType ) {
                    if( !validationLibrary._validNumber.apply( this, arguments ) ) {
                        return false;
                    }
                    if( this.catalogShort !== 'GOÄ' || (val + '') && (val + '').indexOf && -1 === (val + '').indexOf( '.' ) ) {
                        return true;

                    }
                    return null !== Y.doccirrus.regexp.goaeFloatinPointFactor.exec( val + '' );
                }
                return true;
            },
            /**
             * Uses a regex to check if the given treatment code needs to have batch number.
             * @param val: batch number
             * @returns {boolean}
             * @private
             */
            _TREATMENT_T_fk5010: function _TREATMENT_T_fk5010( val ) {
                var gopMatch;
                if( 'TREATMENT' === this.actType ) {
                    gopMatch = (this.code || '').match( Y.doccirrus.regexp.gopBatchNumberRegex );
                    if( gopMatch && !val ) {
                        return false;
                    }
                }
                return true;
            },
            _Treatment_T_fk5002: function _Treatment_T_fk5002( val ) {
                if( 'TREATMENT' === this.actType ) {
                    if( val && val.length > 60 ) {
                        return false;
                    }
                }
                return true;
            },
            _Treatment_T_fk5005: function _Treatment_T_fk5005( val ) {
                if( 'TREATMENT' === this.actType ) {
                    if( val && val.length ) {
                        // allowed values 002 - 999
                        if( !validationLibrary._num( val ) || val.length > 3 || -1 !== ['0', '00', '000', '1', '01', '001'].indexOf( val ) ) {
                            return false;
                        }
                    }
                }
                return true;
            },
            _Treatment_T_fk5008: function _Treatment_T_fk5008( val ) {
                if( 'TREATMENT' === this.actType ) {
                    if( val && val.length ) {
                        if( !validationLibrary._num( val ) || val.length > 3 ) {
                            return false;
                        }
                    }
                }
                return true;
            },
            _Treatment_T_fk5013: function _Treatment_T_fk5013( val ) {
                if( 'TREATMENT' === this.actType ) {
                    if( val && val.length ) {
                        if( !validationLibrary._num( val ) || val.length > 3 ) {
                            return false;
                        }
                    }
                }
                return true;
            },
            _Treatment_T_fk5017: function _Treatment_T_fk5017( val ) {
                if( 'TREATMENT' === this.actType ) {
                    if( val && val.length > 60 ) {
                        return false;
                    }
                }
                return true;
            },
            _Treatment_T_fk5019: function _Treatment_T_fk5019( val ) {
                if( 'TREATMENT' === this.actType ) {
                    if( val && val.length > 60 ) {
                        return false;
                    }
                }
                return true;
            },
            _Treatment_T_fk5023: function _Treatment_T_fk5023( val ) {
                if( 'TREATMENT' === this.actType || 'SURGERY' === this.actType ) {
                    if( val && val.length > 1 ) {
                        return false;
                    }
                }
                return true;
            },
            _Treatment_T_fk5024: function _Treatment_T_fk5024( val ) {
                if( 'TREATMENT' === this.actType || 'SURGERY' === this.actType ) {
                    if( val && 'N' !== val ) {
                        return false;
                    }
                }
                return true;
            },
            _Treatment_T_fk5025: function _Treatment_T_fk5025( val ) {
                if( 'TREATMENT' === this.actType || 'SURGERY' === this.actType ) {
                    return validationLibrary._dateNotRequired( val );
                }
                return true;
            },
            _Treatment_T_fk5026: function _Treatment_T_fk5026( val ) {
                if( 'TREATMENT' === this.actType || 'SURGERY' === this.actType ) {
                    return validationLibrary._dateNotRequired( val );
                }
                return true;
            },
            _Treatment_T_fk5034: function _Treatment_T_fk5034( val ) {
                if( 'TREATMENT' === this.actType || 'SURGERY' === this.actType ) {
                    return validationLibrary._dateNotRequired( val );
                }
                return true;
            },
            _Treatment_T_fk5037: function _Treatment_T_fk5037( val ) {
                if( 'TREATMENT' === this.actType || 'SURGERY' === this.actType ) {
                    if( val && val.length ) {
                        if( !validationLibrary._num( val ) || val.length > 3 ) {
                            return false;
                        }
                    }
                }
                return true;
            },
            _Treatment_T_fk5040: function _Treatment_T_fk5040( val ) {
                if( 'TREATMENT' === this.actType ) {
                    if( val && val.length > 8 ) {
                        return false;
                    }
                }
                return true;
            },
            _Treatment_T_fk5044: function _Treatment_T_fk5044( val ) {
                if( 'TREATMENT' === this.actType ) {
                    if( val && val.length ) {
                        if( !validationLibrary._num( val ) || val.length > 6 ) {
                            return false;
                        }
                    }
                }
                return true;
            },
            _Treatment_T_omimCodes_needsOne: function _Treatment_T_omimCodes() {
                var
                    actType = this.actType,
                    code = this.code,
                    omimCodes = this.omimCodes || [],
                    omimCodesLen = omimCodes.length,
                    needsOne = false;

                if( 'TREATMENT' === actType && code ) {
                    needsOne = Y.doccirrus.regexp.some( code, [
                        Y.doccirrus.regexp.KP2612,
                        Y.doccirrus.regexp.KP2613,
                        Y.doccirrus.regexp.KP2616
                    ] );

                    if( needsOne ) {
                        return 1 === omimCodesLen;
                    }
                }
                return true;
            },
            _Treatment_T_omimCodes_needsAtLeastOne: function _Treatment_T_omimCodes() {
                var
                    actType = this.actType,
                    code = this.code,
                    omimCodes = this.omimCodes || [],
                    omimCodesLen = omimCodes.length,
                    needsAtLeastOne = false;

                if( 'TREATMENT' === actType && code ) {

                    needsAtLeastOne = Y.doccirrus.regexp.some( code, [
                        Y.doccirrus.regexp.KP2614,
                        Y.doccirrus.regexp.KP2614_2
                    ] );

                    if( needsAtLeastOne ) {
                        return 1 <= omimCodesLen;
                    }
                }
                return true;
            },
            _Treatment_T_omimCodes_needsNone: function _Treatment_T_omimCodes() {
                var
                    actType = this.actType,
                    code = this.code,
                    omimCodes = this.omimCodes || [],
                    omimCodesLen = omimCodes.length,
                    needsNone = false;

                if( 'TREATMENT' === actType && code ) {
                    needsNone = Y.doccirrus.regexp.some( code, [
                        Y.doccirrus.regexp.KP2617,
                        Y.doccirrus.regexp.KP2617_2,
                        Y.doccirrus.regexp.KP2617_3
                    ] );

                    if( needsNone ) {
                        return 0 === omimCodesLen;
                    }
                }
                return true;
            },
            _Treatment_T_fk5070: function _Treatment_T_fk5070( val ) {
                if( val && val.length ) {
                    if( !validationLibrary._num( val ) || val.length !== 6 ) {
                        return false;
                    }
                }
                return true;
            },
            _Treatment_T_fk5071: function _Treatment_T_fk5071( val ) {
                if( val && val.length ) {
                    if( !validationLibrary._num( val ) || val.length !== 6 ) {
                        return false;
                    }
                }
                return true;
            },
            _Treatment_T_fk5072: function _Treatment_T_fk5072( val ) {
                if( '999999' === this.fk5070 ) {
                    return validationLibrary._mandatory( val );
                }
                return true;
            },
            _Treatment_T_fk5073: function _Treatment_T_fk5073( val ) {
                if( '999999' === this.fk5071 ) {
                    return validationLibrary._mandatory( val );
                }
                return true;
            },
            _Treatment_T_fk5035Set: function _Treatment_T_fk5073() {
                var fk5035Set = this.fk5035Set,
                    u_extra = this.u_extra,
                    begruendungen_liste = u_extra && u_extra.begruendungen_liste,
                    ops_liste = begruendungen_liste && begruendungen_liste.ops_liste;
                if( 'TREATMENT' === this.actType && ops_liste && 0 < ops_liste.length ) {
                    return fk5035Set && 0 < fk5035Set.length;

                }
                return true;
            },
            _Treatment_T_fk5070_KP2612: function _Treatment_T_fk5070_KP2612( val ) {
                if( 'TREATMENT' === this.actType ) {
                    if( val && this.code && null !== Y.doccirrus.regexp.KP2612.exec( this.code ) ) {
                        return false;
                    }
                }
                return true;
            },
            _Treatment_T_KP2613: function _Treatment_T_KP2613( val ) {
                if( 'TREATMENT' === this.actType ) {
                    if( !val && this.code && null !== Y.doccirrus.regexp.KP2613.exec( this.code ) ) {
                        return false;
                    }
                }
                return true;
            },
            _Treatment_T_KP2614: function _Treatment_T_KP2614( val ) {
                if( 'TREATMENT' === this.actType ) {
                    if( !val && this.code && Y.doccirrus.regexp.some( this.code, [Y.doccirrus.regexp.KP2614, Y.doccirrus.regexp.KP2614_2] ) ) {
                        return false;
                    }
                }
                return true;
            },
            _Treatment_T_KP2615: function _Treatment_T_KP2615( val ) {
                if( 'TREATMENT' === this.actType ) {
                    if( !val && this.code && null !== Y.doccirrus.regexp.KP2615.exec( this.code ) ) {
                        return false;
                    }
                }
                return true;
            },
            _Treatment_T_KP2616: function _Treatment_T_KP2616( val ) {
                if( 'TREATMENT' === this.actType ) {
                    if( !val && this.code && null !== Y.doccirrus.regexp.KP2616.exec( this.code ) ) {
                        return false;
                    }
                }
                return true;
            },
            _Treatment_T_fk5071_KP2612: function _Treatment_T_fk5071( val ) {
                if( 'TREATMENT' === this.actType ) {
                    if( this.code && null !== Y.doccirrus.regexp.KP2612.exec( this.code ) ) {
                        if( !validationLibrary._num( val ) || val.length !== 6 ) {
                            return false;
                        }
                    }
                }
                return true;
            },
            _Treatment_T_fk5072_KP2612: function _Treatment_T_fk5072( val ) {
                if( 'TREATMENT' === this.actType ) {
                    if( val && this.code && null !== Y.doccirrus.regexp.KP2612.exec( this.code ) ) {
                        return false;
                    }
                }
                return true;
            },

            _Fk5011_T_fk5011: function _Fk5011_T_fk5011( val ) {
                if( 'string' === typeof val ) {
                    if( !val.length ) {
                        return false;
                    }
                }
                return true;
            },
            _Fk5012_T_fk5012: function _Fk5012_T_fk5012( val ) {
                if( val && val.length || this.fk5011Set.length ) {
                    if( !validationLibrary._num( val ) || val.length > 10 ) {
                        return false;
                    }
                }
                return true;
            },
            _Fk5012_T_fk5011Set: function _Fk5012_T_fk5011Set( val ) {
                return Boolean( val.length );
            },

            _Fk5020_T_fk5020: function _Fk5020_T_fk5020() {
                return true;
            },
            _Fk5020_T_fk5021: function _Fk5020_T_fk5021( val ) {
                if( this.fk5020 ) {
                    return val && 4 === val.length && validationLibrary._num( val );
                }
                return true;
            },

            _Fk5035_T_fk5035: function _Fk5035_T_fk5035( val ) {
                if( !val ) {
                    return true;
                }
                return validationLibraryKbv._046( val );
            },
            _Fk5035_T_fk5041_not_mandatory: function _Fk5035_T_fk5041( val ) {
                var catalogEntry = this.catalogEntry;

                if( catalogEntry && ('N' === catalogEntry.kzseite && val) ) {
                    return false;
                }

                return true;
            },
            _Fk5035_T_fk5041_mandatory: function _Fk5035_T_fk5041( val ) {
                var catalogEntry = this.catalogEntry;

                if( catalogEntry && ('J' === catalogEntry.kzseite && !val) ) {
                    return false;
                }

                return true;
            },
            _Fk5035_T_fk5041: function _Fk5035_T_fk5041( val ) {
                if( !val ) {
                    return true;
                }
                if( val && val.length > 1 ) {
                    return false;
                }
                return validationLibrary._euroalpha( val );
            },

            _Fk5036_T_fk5036: function _Fk5036_T_fk5036( val ) {
                return validationLibraryKbv._042( val );
            },

            _Fk5042_T_fk5042: function _Fk5042_T_fk5042( val ) {
                if( val && val.length || this.fk5043 ) {
                    if( !validationLibrary._num( val ) || val.length > 5 ) {
                        return false;
                    }
                }
                return true;
            },
            _Fk5042_T_fk5043: function _Fk5042_T_fk5043( val ) {
                if( val && val.length || this.fk5042 ) {
                    if( !validationLibrary._num( val ) || val.length > 1 ) {
                        return false;
                    }
                }
                return true;
            },

            _InsuranceStatus_T_cardSwipe: function _InsuranceStatus_T_cardSwipe() {
                return validationLibrary._dateNotRequired( this.cardSwipe );
            },
            _InsuranceStatus_T_cardValidTo: function _InsuranceStatus_T_cardValidTo() {
                return validationLibrary._dateNotRequired( this.cardValidTo );
            },
            _InsuranceStatus_T_fk4110: function _InsuranceStatus_T_fk4110() {
                return validationLibrary._dateNotRequired( this.fk4110 );
            },
            _InsuranceStatus_T_policyHolder: function _InsuranceStatus_T_policyHolder() {
                return true;
            },
            _InsuranceStatus_T_policyDob: function _InsuranceStatus_T_policyDob() {
                if( this.policyHolder ) { // these fields are still read from a card, but no longer play a role in the system
                    return validationLibrary._dateNotRequired( this.policyDob );
                }
                return true;
            },
            _InsuranceStatus_T_insuranceId: function _InsuranceStatus_T_insuranceId() {
                var isMandatory = Y.doccirrus.schemas.patient.isPublicInsurance( this ) || 'PRIVCHOICE' === this.type
                                  || 'CH' === Y.doccirrus.schemas.activity.CASE_FOLDER_TYPE_TO_COUNTRY_MAP[this.type];
                if ( this.insuranceName && !this.insuranceId ) {
                    return true;
                }
                return isMandatory ? validationLibrary._mandatory( this.insuranceId ) : true;
            },
            _InsuranceStatus_T_insuranceGLN: function _InsuranceStatus_T_insuranceGLN() {
                var isMandatory = 'CH' === Y.doccirrus.schemas.activity.CASE_FOLDER_TYPE_TO_COUNTRY_MAP[this.type];
                return isMandatory ? validationLibrary._mandatory( this.insuranceGLN ) : true;
            },
            _InsuranceStatus_T_recipientGLN: function _InsuranceStatus_T_recipientGLN() {
                var isMandatory = 'CH' === Y.doccirrus.schemas.activity.CASE_FOLDER_TYPE_TO_COUNTRY_MAP[this.type];
                return isMandatory ? validationLibrary._mandatory( this.recipientGLN ) : true;
            },
            _InsuranceStatus_T_address1: function _InsuranceStatus_T_address1() {
                var isMandatory = 'CH' === Y.doccirrus.schemas.activity.CASE_FOLDER_TYPE_TO_COUNTRY_MAP[this.type];
                return isMandatory ? validationLibrary._mandatory( this.address1 ) : true;
            },
            _InsuranceStatus_T_zipcode: function _InsuranceStatus_T_zipcode() {
                var isMandatory = 'CH' === Y.doccirrus.schemas.activity.CASE_FOLDER_TYPE_TO_COUNTRY_MAP[this.type];
                return isMandatory ? validationLibrary._mandatory( this.zipcode ) : true;
            },
            _InsuranceStatus_T_city: function _InsuranceStatus_T_city() {
                var isMandatory = 'CH' === Y.doccirrus.schemas.activity.CASE_FOLDER_TYPE_TO_COUNTRY_MAP[this.type];
                return isMandatory ? validationLibrary._mandatory( this.city ) : true;
            },
            _InsuranceStatus_T_insuranceNo: function _InsuranceStatus_T_insuranceNo() {
                if( (this.insuranceNo || this.cardSwipe) &&
                    (Y.doccirrus.schemas.patient.isPublicInsurance( this ) || 'PRIVCHOICE' === this.type) ) {
                    if( validationLibrary._mandatory( this.insuranceNo ) ) {
                        return validationLibraryKbv._kvkNo( this.insuranceNo ) || validationLibraryKbv._egkNo( this.insuranceNo );
                    }
                    return false;
                }
                return true;
            },
            _InsuranceStatus_T_insuranceGrpId: function _InsuranceStatus_T_insuranceGrpId() {
                var isMandatory = Y.doccirrus.schemas.patient.isPublicInsurance( this );
                return isMandatory ? validationLibrary._mandatory( this.insuranceGrpId ) : true;
            },
            _InsuranceStatus_T_costCarrierBillingSection: function _InsuranceStatus_T_costCarrierBillingSection( val ) {
                if( !Y.doccirrus.schemas.patient.isPublicInsurance( this ) ) {
                    return true;
                }
                if( val ) {
                    return null !== /^\d{2}$/.exec( val );
                }
                return false;
            },
            _InsuranceStatus_T_costCarrierBillingGroup: function _InsuranceStatus_T_costCarrierBillingGroup( val ) {
                if( !Y.doccirrus.schemas.patient.isPublicInsurance( this ) ) {
                    return true;
                }
                if( val ) {
                    return null !== /^\d{2}$/.exec( val );
                }
                return false;
            },
            _InsuranceStatus_T_feeSchedule: function _InsuranceStatus_T_feeSchedule() {
                var isMandatory = Y.doccirrus.schemas.patient.isPublicInsurance( this ) ||
                                  Y.doccirrus.schemas.patient.isPrivateInsurance( this );
                return isMandatory ? validationLibrary._mandatory( this.feeSchedule ) : true;
            },
            _InsuranceStatus_T_paidFreeToMandatory: function _InsuranceStatus_T_paidFreeToMandatory() {
                var
                    isMandatory = Boolean( this.paidFree ),
                    isDatePaidFreeTo = validationLibrary._date( this.paidFreeTo );

                if( isMandatory ) {
                    return isDatePaidFreeTo;
                } else {
                    return true;
                }
            },
            _InsuranceStatus_T_paidFreeTo: function _InsuranceStatus_T_paidFreeTo() {
                var
                    isMandatory = Boolean( this.paidFree ),
                    isDatePaidFreeTo = validationLibrary._date( this.paidFreeTo ),
                    isFutureOrToday = validationLibrary._futureOrToday( this.paidFreeTo );

                if( isMandatory ) {
                    return isDatePaidFreeTo && isFutureOrToday;
                } else {
                    return true;
                }
            },
            _InvoiceConfiguration_T_empiricalvalue: function _InvoiceConfiguration_T_empiricalvalue( val ) {
                return validationLibrary._rangeNumber( val, 0, 20 );
            },

            _DeliverySettings_T_credentials: function( val ) {
                var isMandatory = false;
                if( '1CLICK' === this.deliveryType ) {
                    isMandatory = true;
                }
                return isMandatory ? validationLibrary._mandatory( val ) : true;
            },

            _Au_T_auVon: function( val ) {
                var mom = validationLibrary.getMoment();
                if( 'AU' !== this.actType ) {
                    return true;
                }
                if( true === this.folgeBesc ) {
                    return true;
                }
                if( !val ) {
                    return false;
                }
                return mom( this.timestamp ).startOf( 'day' ).subtract( 7, 'days' ).isBefore( val );
            },
            _AU_T_auVorraussichtlichBis: function( val ) {
                var mom = validationLibrary.getMoment();
                if( 'AU' !== this.actType ) {
                    return true;
                }
                if( !val ) {
                    return false;
                }
                return mom( this.auVon ).isBefore( mom( val ).add( 1, 'days' ).startOf( 'day' ) );
            },
            _AU_T_festgestelltAm: function( val ) {
                var mom = validationLibrary.getMoment();
                if( 'AU' !== this.actType ) {
                    return true;
                }
                if( !val ) {
                    return false;
                }
                return mom( val ).isBefore( mom( this.timestamp ).add( 1, 'days' ).startOf( 'day' ) );
            },

            _Ophthalmology_read: function( val ) {
                var
                    moment = validationLibrary.getMoment(),
                    date;
                if( !val ) {
                    return true;
                }
                date = moment( val );
                if( !date.isValid() ) {
                    return false;
                }
                return date.isBefore( moment().endOf( 'day' ) );
            },

            _Patient_T_edmpCaseNo: function( val ) {
                var edmpTypes = this.edmpTypes,
                    isEdmpCaseNo = Y.doccirrus.regexp.isEdmpCaseNo;
                if( !edmpTypes || !edmpTypes.length ) {
                    return true;
                }
                return val && 'string' === typeof val && null !== isEdmpCaseNo.exec( val );
            },

            _Patient_T_ehksPatientNo: function( val ) {
                var
                    ehksActivated = this.ehksActivated,
                    isEhksPatientNo = Y.doccirrus.regexp.isEhksPatientNo;
                if( true === ehksActivated ) {
                    return val && 'string' === typeof val && null !== isEhksPatientNo.exec( val );
                }
                return true;
            },

            _Patient_T_HGVPatientNo: function( val ) {
                var
                    HGVActivated = this.HGVActivated,
                    isHgvPatientNo = Y.doccirrus.regexp.isHgvPatientNo;
                if( true === HGVActivated ) {
                    return val && 'string' === typeof val && null !== isHgvPatientNo.exec( val );
                }
                return true;
            },

            _Patient_T_ehksDocType: function( val ) {
                var
                    ehksActivated = this.ehksActivated;
                if( true === ehksActivated ) {
                    return validationLibrary._mandatory( val );
                }
                return true;
            },

            _Patient_T_edmpCaseNo_checkInsurance: function() {
                var edmpTypes = this.edmpTypes;
                if( !edmpTypes || !edmpTypes.length ) {
                    return true;
                }

                return this.insuranceStatus.some( function( insurance ) {
                    return Y.doccirrus.schemas.patient.isPublicInsurance( insurance );
                } );
            },
            _Patient_T_edmpTypes: function( val ) {
                var dm1AndDm2 = -1 !== val.indexOf( 'DM1' ) && -1 !== val.indexOf( 'DM2' ),
                    asthmaAndCopd = -1 !== val.indexOf( 'ASTHMA' ) && -1 !== val.indexOf( 'COPD' ),
                    notValid = dm1AndDm2 || asthmaAndCopd;
                return !notValid;
            },

            _Patient_T_edmpTypes_asthma: function( val ) {

                var isOlderThan = Y.doccirrus.edmpcommonutils.isOlderThan,
                    now = new Date(),
                    asthma = -1 !== val.indexOf( 'ASTHMA' );

                if( asthma && !isOlderThan( this, now, 1 ) ) {
                    return false;
                }

                return true;

            },

            _Patient_T_edmpTypes_copd: function( val ) {

                var isOlderThan = Y.doccirrus.edmpcommonutils.isOlderThan,
                    now = new Date(),
                    copd = -1 !== val.indexOf( 'COPD' );

                if( copd && !isOlderThan( this, now, 18 ) ) {
                    return false;
                }

                return true;

            },

            _Patient_T_vekaCardNo: function( val ) {
                if( val && val.length !== 20 ) {
                    return false;
                }
                return true;
            },

            _HKS_YesOrNo_If_2_3_2: function( val ) {
                var isAfterQ42018 = Y.doccirrus.edmpcommonutils.isAfterTimestampQ( this.timestamp, Y.doccirrus.edmpcommonutils.EHKS_V2_3_2_LAST_QUARTER );
                if( !isAfterQ42018 || -1 === ['EHKSD', 'EHKSND'].indexOf( this.actType ) ) {
                    return true;
                }

                return validationLibraryKbv._HKS_Yes_Or_No.call( this, val );
            },

            _HKS_YesOrNo_If_2_3_1: function( val ) {
                var isAfterQ42018 = Y.doccirrus.edmpcommonutils.isAfterTimestampQ( this.timestamp, Y.doccirrus.edmpcommonutils.EHKS_V2_3_2_LAST_QUARTER );
                if( isAfterQ42018 || -1 === ['EHKSD', 'EHKSND'].indexOf( this.actType ) ) {
                    return true;
                }

                return validationLibraryKbv._HKS_Yes_Or_No.call( this, val );
            },

            _HKS_hksSuspectedDiagnosisND_Mandatory_2_3_2: function( val ) {
                var isAfterQ42018 = Y.doccirrus.edmpcommonutils.isAfterTimestampQ( this.timestamp, Y.doccirrus.edmpcommonutils.EHKS_V2_3_2_LAST_QUARTER ),
                    hksSuspectedDiagnosisND = this.hksSuspectedDiagnosisND && this.hksSuspectedDiagnosisND[0];

                if( !isAfterQ42018 || -1 === ['EHKSD', 'EHKSND'].indexOf( this.actType ) ) {
                    return true;
                }
                if( hksSuspectedDiagnosisND === 'YES' ) {
                    return validationLibraryKbv._HKS_Yes_Or_No.call( this, val );
                }

                return !val.length || validationLibraryKbv._HKS_Yes_Or_No.call( this, val );
            },

            _HKS_hksSuspectedDiagnosisD_Mandatory_2_3_2: function( val ) {
                var isAfterQ42018 = Y.doccirrus.edmpcommonutils.isAfterTimestampQ( this.timestamp, Y.doccirrus.edmpcommonutils.EHKS_V2_3_2_LAST_QUARTER ),
                    hksSuspectedDiagnosisND = this.hksSuspectedDiagnosisD && this.hksSuspectedDiagnosisD[0];

                if( !isAfterQ42018 || -1 === ['EHKSD', 'EHKSND'].indexOf( this.actType ) ) {
                    return true;
                }
                if( hksSuspectedDiagnosisND === 'YES' ) {
                    return validationLibraryKbv._HKS_Yes_Or_No.call( this, val );
                }

                return !val.length || validationLibraryKbv._HKS_Yes_Or_No.call( this, val );
            },

            _HKS_Yes_Or_No: function( val ) {
                if( -1 === ['EHKSD', 'EHKSND'].indexOf( this.actType ) ) {
                    return true;
                }
                return Array.isArray( val ) ? 1 === val.length : false;
            },

            _HKS_histopathologyFields_Yes_Or_No: function( val ) {
                if( 'EHKSD' !== this.actType ) {
                    return true;
                }
                if( 'YES' === (this.hksBiopsieOrExzision && this.hksBiopsieOrExzision[0]) ) {
                    return validationLibraryKbv._HKS_Yes_Or_No.call( this, val );
                }
                return val.length <= 1;
            },
            _HKS_histopathologyFields_Yes_Or_No_2_3_2: function( val ) {
                var isAfterQ42018 = Y.doccirrus.edmpcommonutils.isAfterTimestampQ( this.timestamp, Y.doccirrus.edmpcommonutils.EHKS_V2_3_2_LAST_QUARTER );

                if( !isAfterQ42018 ) {
                    return true;
                }

                return validationLibraryKbv._HKS_histopathologyFields_Yes_Or_No.call( this, val );
            },

            _EHKS_D_T_hksHasSuspectedDiag_2_3_1: function( val ) {
                var isAfterQ42018 = Y.doccirrus.edmpcommonutils.isAfterTimestampQ( this.timestamp, Y.doccirrus.edmpcommonutils.EHKS_V2_3_2_LAST_QUARTER ),
                    hksHasReferral = this.hksHasReferral && this.hksHasReferral[0];

                if( 'EHKSD' !== this.actType ) {
                    return true;
                }
                if( isAfterQ42018 ) {
                    return true;
                }

                if( 'YES' === hksHasReferral ) {
                    return validationLibraryKbv._HKS_Yes_Or_No.call( this, val );
                }

                return !val.length || validationLibraryKbv._HKS_Yes_Or_No.call( this, val );
            },

            _EHKS_D_T_hksHasSuspectedDiagIsYes: function( val ) {
                if( 'EHKSD' !== this.actType ) {
                    return true;
                }
                var
                    hksHasSuspectedDiag = this.hksHasSuspectedDiag && this.hksHasSuspectedDiag[0];
                if( 'YES' === hksHasSuspectedDiag || val && val.length ) {
                    return validationLibraryKbv._HKS_Yes_Or_No.call( this, val );
                }
                return true;
            },

            _EHKS_D_T_hksHasSuspectedDiagIsYes_2_3_2: function( val ) {
                if( 'EHKSD' !== this.actType ) {
                    return true;
                }

                var
                    isAfterQ42018 = Y.doccirrus.edmpcommonutils.isAfterTimestampQ( this.timestamp, Y.doccirrus.edmpcommonutils.EHKS_V2_3_2_LAST_QUARTER );
                if( !isAfterQ42018 ) {
                    return true;
                }
                return validationLibraryKbv._EHKS_D_T_hksHasSuspectedDiagIsYes.call( this, val );
            },

            _EHKS_D_T_hksSuspectedDiagnosisDIsYes: function( val ) {
                if( 'EHKSD' !== this.actType ) {
                    return true;
                }
                var
                    isAfterQ42018 = Y.doccirrus.edmpcommonutils.isAfterTimestampQ( this.timestamp, Y.doccirrus.edmpcommonutils.EHKS_V2_3_2_LAST_QUARTER ),
                    hksSuspectedDiagnosisD = this.hksSuspectedDiagnosisD && this.hksSuspectedDiagnosisD[0];

                if( !isAfterQ42018 && !val || !val.length ) {
                    return true;
                }

                if( 'YES' === hksSuspectedDiagnosisD || val && val.length ) {
                    return validationLibraryKbv._HKS_Yes_Or_No.call( this, val );
                }
                return true;
            },

            _EHKS_D_T_hksNumberOfBiopsiesTaken: function( val ) {
                var isAfterQ42018 = Y.doccirrus.edmpcommonutils.isAfterTimestampQ( this.timestamp, Y.doccirrus.edmpcommonutils.EHKS_V2_3_2_LAST_QUARTER ),
                    hksBiopsieOrExzision = this.hksBiopsieOrExzision && this.hksBiopsieOrExzision[0];

                if( !isAfterQ42018 || (!hksBiopsieOrExzision && !validationLibrary._mandatory( val )) ) {
                    return true;
                }

                if( 'NO' === hksBiopsieOrExzision ) {
                    return !validationLibrary._mandatory( val );
                }
                return validationLibrary._rangeNumber( val, 0, 99 );
            },
            _EHKS_D_T_hksOtherwiseInitiatedOrInitiatedTherapyOrDiagnostics: function( val ) {
                var isAfterQ42018 = Y.doccirrus.edmpcommonutils.isAfterTimestampQ( this.timestamp, Y.doccirrus.edmpcommonutils.EHKS_V2_3_2_LAST_QUARTER ),
                    hksCurrentlyNoFurtherTherapyOrDiagnostics = this.hksCurrentlyNoFurtherTherapyOrDiagnostics && this.hksCurrentlyNoFurtherTherapyOrDiagnostics[0];

                if( !isAfterQ42018 ) {
                    return true;
                }

                return !((val && val.length) > 1 || ('YES' === hksCurrentlyNoFurtherTherapyOrDiagnostics && 'NO' !== val[0]));
            },
            _EHKS_D_T_hksOtherwiseInitiatedOrInitiatedTherapyOrDiagnosticsMandatory: function( val ) {
                var isAfterQ2_2020 = Y.doccirrus.edmpcommonutils.isAfterTimestampQ( this.timestamp, Y.doccirrus.edmpcommonutils.Q2_2020 );
                if( !isAfterQ2_2020 ) {
                    return true;
                }
                return Boolean( val && val.length );
            },
            _EHKS_D_T_hksCurrentlyNoFurtherTherapyOrDiagnostics: function( val ) {
                var isAfterQ42018 = Y.doccirrus.edmpcommonutils.isAfterTimestampQ( this.timestamp, Y.doccirrus.edmpcommonutils.EHKS_V2_3_2_LAST_QUARTER ),
                    hksOtherwiseInitiatedOrInitiatedTherapyOrDiagnostics = this.hksOtherwiseInitiatedOrInitiatedTherapyOrDiagnostics && this.hksOtherwiseInitiatedOrInitiatedTherapyOrDiagnostics[0];

                if( !isAfterQ42018 ) {
                    return true;
                }

                return !((val && val.length) > 1 || ('YES' === hksOtherwiseInitiatedOrInitiatedTherapyOrDiagnostics && 'NO' !== val[0]));
            },
            _EHKS_D_T_hksCurrentlyNoFurtherTherapyOrDiagnosticsMandatory: function( val ) {
                var isAfterQ2_2020 = Y.doccirrus.edmpcommonutils.isAfterTimestampQ( this.timestamp, Y.doccirrus.edmpcommonutils.Q2_2020 );
                if( !isAfterQ2_2020 ) {
                    return true;
                }
                return Boolean( val && val.length );
            },

            _EHKS_D_T_hksOtherSkinCancer: function( val ) {
                var isAfterQ42018 = Y.doccirrus.edmpcommonutils.isAfterTimestampQ( this.timestamp, Y.doccirrus.edmpcommonutils.EHKS_V2_3_2_LAST_QUARTER ),
                    hksHasSuspectedDiag = this.hksHasSuspectedDiag && this.hksHasSuspectedDiag[0];

                if( 'EHKSD' !== this.actType ) {
                    return true;
                }

                if( !isAfterQ42018 ) {
                    return true;
                }

                if( 'YES' === hksHasSuspectedDiag || val && val.length ) {
                    return validationLibraryKbv._HKS_Yes_Or_No.call( this, val );
                }
                return true;
            },

            _EHKS_D_T_hksBasalzellkarzinomTumorDiameter_range: function( val ) {
                if( 'EHKSD' !== this.actType ) {
                    return true;
                }
                var
                    num = Y.doccirrus.comctl.stringToNumber( val, ',' );

                return num && validationLibrary._rangeNumber( num, 0.1, 999.9 );
            },

            _EHKS_D_T_hksMalignesMelanomClassification: function( val ) {
                if( 'EHKSD' !== this.actType ) {
                    return true;
                }
                var isAfterQ42018 = Y.doccirrus.edmpcommonutils.isAfterTimestampQ( this.timestamp, Y.doccirrus.edmpcommonutils.EHKS_V2_3_2_LAST_QUARTER ),
                    hasHksBiopsieOrExzision = 'YES' === (this.hksBiopsieOrExzision && this.hksBiopsieOrExzision[0]),
                    hksMalignesMelanomHistopathologie = 'YES' === (this.hksMalignesMelanomHistopathologie && this.hksMalignesMelanomHistopathologie[0]);

                if( !isAfterQ42018 && !hasHksBiopsieOrExzision ) {
                    return true;
                }
                if( hksMalignesMelanomHistopathologie ) {
                    return 1 === (val && val.length);
                }
                return 1 >= (val && val.length);
            },

            _EHKS_D_T_hksMalignesMelanomTumorThickness: function( val ) { // OPTIONAL
                if( 'EHKSD' !== this.actType ) {
                    return true;
                }
                var isAfterQ42018 = Y.doccirrus.edmpcommonutils.isAfterTimestampQ( this.timestamp, Y.doccirrus.edmpcommonutils.EHKS_V2_3_2_LAST_QUARTER ),
                    hasHksBiopsieOrExzision = 'YES' === (this.hksBiopsieOrExzision && this.hksBiopsieOrExzision[0]),
                    hksMalignesMelanomHistopathologie = 'YES' === (this.hksMalignesMelanomHistopathologie && this.hksMalignesMelanomHistopathologie[0]);
                if( !isAfterQ42018 && !hasHksBiopsieOrExzision ) {
                    return true;
                }
                if( !hksMalignesMelanomHistopathologie ) {
                    return 0 === (val && val.length);
                }
                return 1 >= (val && val.length);
            },

            _EHKS_D_T_hksBasalzellkarzinomHorizontalTumorDiameterClinical: function( val ) {
                if( 'EHKSD' !== this.actType ) {
                    return true;
                }
                var isAfterQ42018 = Y.doccirrus.edmpcommonutils.isAfterTimestampQ( this.timestamp, Y.doccirrus.edmpcommonutils.EHKS_V2_3_2_LAST_QUARTER ),
                    hasHksBiopsieOrExzision = 'YES' === (this.hksBiopsieOrExzision && this.hksBiopsieOrExzision[0]),
                    hasHksBasalzellkarzinomHistopathologie = 'YES' === (this.hksBasalzellkarzinomHistopathologie && this.hksBasalzellkarzinomHistopathologie[0]);
                if( !isAfterQ42018 && !hasHksBiopsieOrExzision ) {
                    return true;
                }
                if( !hasHksBasalzellkarzinomHistopathologie && !val ) {
                    return true;
                }
                return validationLibraryKbv._EHKS_D_T_hksBasalzellkarzinomTumorDiameter_range.call( this, val );
            },

            _EHKS_D_T_hksBasalzellkarzinomVerticalTumorDiameterHistological: function( val ) {
                if( 'EHKSD' !== this.actType ) {
                    return true;
                }
                var isAfterQ42018 = Y.doccirrus.edmpcommonutils.isAfterTimestampQ( this.timestamp, Y.doccirrus.edmpcommonutils.EHKS_V2_3_2_LAST_QUARTER ),
                    hasHksBiopsieOrExzision = 'YES' === (this.hksBiopsieOrExzision && this.hksBiopsieOrExzision[0]),
                    hasHksBasalzellkarzinomHistopathologie = 'YES' === (this.hksBasalzellkarzinomHistopathologie && this.hksBasalzellkarzinomHistopathologie[0]);
                if( !isAfterQ42018 && !hasHksBiopsieOrExzision ) {
                    return true;
                }
                if( !hasHksBasalzellkarzinomHistopathologie ) {
                    return !val;
                }
                return !val || validationLibraryKbv._EHKS_D_T_hksBasalzellkarzinomTumorDiameter_range.call( this, val );
            },

            _EHKS_D_T_hksSpinozelluläresKarzinomClassification: function( val ) {
                if( 'EHKSD' !== this.actType ) {
                    return true;
                }
                var isAfterQ42018 = Y.doccirrus.edmpcommonutils.isAfterTimestampQ( this.timestamp, Y.doccirrus.edmpcommonutils.EHKS_V2_3_2_LAST_QUARTER ),
                    hasHksBiopsieOrExzision = 'YES' === (this.hksBiopsieOrExzision && this.hksBiopsieOrExzision[0]),
                    hksSpinozelluläresKarzinomHistopathologie = 'YES' === (this.hksSpinozelluläresKarzinomHistopathologie && this.hksSpinozelluläresKarzinomHistopathologie[0]);
                if( !isAfterQ42018 && !hasHksBiopsieOrExzision ) {
                    return true;
                }

                if( hksSpinozelluläresKarzinomHistopathologie ) {
                    return 1 === (val && val.length);
                }
                return 1 >= (val && val.length);
            },

            _EHKS_D_T_hksSpinozelluläresKarzinomGrading: function( val ) { // OPTIONAL
                if( 'EHKSD' !== this.actType ) {
                    return true;
                }
                var isAfterQ42018 = Y.doccirrus.edmpcommonutils.isAfterTimestampQ( this.timestamp, Y.doccirrus.edmpcommonutils.EHKS_V2_3_2_LAST_QUARTER ),
                    hasHksBiopsieOrExzision = 'YES' === (this.hksBiopsieOrExzision && this.hksBiopsieOrExzision[0]),
                    hksSpinozelluläresKarzinomHistopathologie = 'YES' === (this.hksSpinozelluläresKarzinomHistopathologie && this.hksSpinozelluläresKarzinomHistopathologie[0]);
                if( !isAfterQ42018 && !hasHksBiopsieOrExzision ) {
                    return true;
                }
                if( !hksSpinozelluläresKarzinomHistopathologie ) {
                    return 0 === (val && val.length);
                }
                return 1 >= (val && val.length);
            },

            _DMP_BASE_T_dmpCheckedInhalationTechnique: function( val ) {
                var
                    actType = this.actType;

                if( -1 !== ['ASTHMA', 'COPD'].indexOf( actType ) ) {
                    return validationLibrary._mandatory( val );
                }
                return true;
            },

            _DMP_BASE_T_isUnder18: function( patientShort, headDate ) {
                var
                    mom = validationLibrary.getMoment(),
                    dob = patientShort && patientShort.dob,
                    result;

                if( !dob ) {
                    return null;
                }

                result = mom( headDate ).diff( mom( dob ), 'year', true );
                return 18 >= result;
            },

            _DMP_BASE_T_dmpHeadDate: function( val ) {
                var
                    actType = this.actType;

                if( -1 !== ['DM1', 'DM2', 'KHK', 'ASTHMA', 'COPD'].indexOf( actType ) ) {
                    return validationLibrary._mandatory( val );
                }
                return true;
            },

            _DMP_BASE_T_dmpSignatureDate: function( val ) {
                var
                    mom = validationLibrary.getMoment(),
                    actType = this.actType,
                    headDate = this.dmpHeadDate && mom( this.dmpHeadDate ).startOf( 'day' ),
                    isMandatory = validationLibrary._mandatory( val ),
                    isAfterHeadDateOrSame = mom( val ).isSame( headDate ) || mom( val ).isAfter( headDate );

                if( -1 !== Y.doccirrus.schemas.casefolder.eDmpTypes.indexOf( actType ) ) {
                    return isMandatory && isAfterHeadDateOrSame;
                }
                return true;
            },

            _DMP_BASE_T_dmpSignatureDate_quarterRange: function( val ) {
                var
                    mom = validationLibrary.getMoment(),
                    actType = this.actType,
                    dmpQuarter = this.dmpQuarter,
                    dmpYear = this.dmpYear,
                    isMandatory = validationLibrary._mandatory( val ),
                    sigDate = mom( val );

                if( -1 !== Y.doccirrus.schemas.casefolder.eDmpTypes.indexOf( actType ) ) {
                    return isMandatory && sigDate.quarter() === dmpQuarter && sigDate.year() === dmpYear;
                }
                return true;
            },

            _DMP_BASE_T_mandatory: function( val ) {
                var
                    actType = this.actType;

                if( -1 !== Y.doccirrus.schemas.casefolder.eDmpTypes.indexOf( actType ) ) {
                    return validationLibrary._mandatory( val );
                }
                return true;
            },

            _DMP_BASE_T_dmpScheinRef: function( val ) {
                var actType = this.actType;
                if( -1 !== Y.doccirrus.schemas.casefolder.eDmpTypes.indexOf( actType ) ) {
                    return validationLibrary._mandatory( val );
                }
                return true;
            },

            _DMP_BASE_dmpHeight: function( val ) {
                var actType = this.actType;

                if( !val ) {
                    return true;
                }

                if( -1 !== Y.doccirrus.schemas.casefolder.eDmpTypes.indexOf( actType ) ) {
                    return 0 <= val && 2.5 >= val;
                } else {
                    return true;
                }
            },

            _DMP_BASE_dmpWeight: function( val ) {
                var actType = this.actType;

                if( !val ) {
                    return true;
                }

                if( -1 !== Y.doccirrus.schemas.casefolder.eDmpTypes.indexOf( actType ) ) {
                    return 0 <= val && 300 >= val;
                } else {
                    return true;
                }
            },

            _DMP_BASE_dmpGender: function( val ) {
                var actType = this.actType;

                if( !val ) {
                    return true;
                }

                if( -1 !== Y.doccirrus.schemas.casefolder.eDmpTypes.indexOf( actType ) ) {
                    return val !== '' && val;
                } else {
                    return true;
                }
            },

            _DM_T_mandatory: function( val ) {
                var actType = this.actType;
                if( -1 !== ['DM1', 'DM2'].indexOf( actType ) ) {
                    return validationLibrary._mandatory( val );
                } else {
                    return true;
                }
            },

            _DM_T_mandatoryFollowing: function( val ) {
                var actType = this.actType,
                    dmpType = this.dmpType;
                if( -1 !== ['DM1', 'DM2'].indexOf( actType ) ) {
                    if( 'FOLLOWING' === dmpType ) {
                        return validationLibrary._mandatory( val );
                    }
                }
                return true;
            },
            _DM_T_NoneExcludesOthers: function( val ) {
                var actType = this.actType;
                if( -1 !== ['DM1', 'DM2'].indexOf( actType ) ) {
                    if( Array.isArray( val ) && val.length > 1 && val.indexOf( 'NONE' ) > -1 ) {
                        return false;
                    }
                }
                return true;
            },
            _DM_T_NoneExcludesOthersAfterQ22017: function( val ) {
                var actType = this.actType,
                    isAfterQ22017 = Y.doccirrus.edmpcommonutils.isAfterQ( this, '2/2017' );
                if( isAfterQ22017 && -1 !== ['DM1', 'DM2'].indexOf( actType ) ) {
                    if( Array.isArray( val ) && val.length > 1 && val.indexOf( 'NONE' ) > -1 ) {
                        return false;
                    }
                }
                return true;
            },
            _DM_T_dmpDmTrainingsBeforeSubscription_mandatory: function( val ) {
                var actType = this.actType,
                    dmpType = this.dmpType,
                    isAfterQ22017 = Y.doccirrus.edmpcommonutils.isAfterQ( this, '2/2017' );
                if( 'FIRST' === dmpType && isAfterQ22017 && -1 !== ['DM1', 'DM2'].indexOf( actType ) ) {
                    return validationLibrary._mandatory( val );

                }
                return true;
            },
            _DM_T_dmpInjectionSites: function( val ) {
                var
                    actType = this.actType,
                    dmpInsulin = this.dmpInsulin;

                if( 'DM1' === actType ) {
                    return validationLibrary._mandatory( val );
                }
                if( 'DM2' === actType ) {
                    if( 'YES' === dmpInsulin ) {
                        return validationLibrary._mandatory( val );
                    }
                }

                return true;
            },
            _DM_T_dmpEvents: function( val ) {
                var actType = this.actType;
                if( -1 !== ['DM1', 'DM2'].indexOf( actType ) ) {
                    if( Array.isArray( val ) && val.length > 1 && val.indexOf( 'NONE_OF_THESE_EVENTS' ) > -1 ) {
                        return false;
                    }
                }
                return true;
            },
            _DM_T_footstatus_mandatory: function( val ) {
                var actType = this.actType,
                    patientShort = this.patientShort,
                    isAfterQ22017 = Y.doccirrus.edmpcommonutils.isAfterQ( this, '2/2017' );

                if( isAfterQ22017 && -1 !== ['DM1', 'DM2'].indexOf( actType ) && !validationLibraryKbv._DMP_BASE_T_isUnder18( patientShort, this.dmpHeadDate ) ) {
                    return validationLibrary._mandatory( val );
                }
                return true;
            },
            _DM_T_dmpFurtherRiskUlcus: function( val ) {
                var actType = this.actType;
                if( -1 !== ['DM1', 'DM2'].indexOf( actType ) ) {
                    if( Array.isArray( val ) && val.length > 1 && (val.indexOf( 'NO' ) > -1 || val.indexOf( 'NOT_DONE' ) > -1) ) {
                        return false;
                    }
                }
                return true;
            },
            _DM_T_dmpEGFR: function( val ) {
                var actType = this.actType;
                if( -1 !== ['DM1', 'DM2'].indexOf( actType ) ) {
                    return !val || validationLibrary._validNumber( val ) && 0 <= val && 200 >= val;
                } else {
                    return true;
                }
            },
            _DM_T_dmpEGFRNotDetermined: function( val ) {
                var actType = this.actType,
                    dmpEGFR = this.dmpEGFR;
                if( -1 !== ['DM1', 'DM2'].indexOf( actType ) ) {
                    if( val && Y.Lang.isNumber( dmpEGFR ) ) {
                        return false;
                    }
                    if( !val && !Y.Lang.isNumber( dmpEGFR ) ) {
                        return false;
                    }
                }
                return true;
            },
            _DM_T_dmpHbA1cValueType: function( val ) {
                var actType = this.actType;
                var vl = validationLibrary;
                var dmpHbA1cUnit = this.dmpHbA1cUnit;

                if( -1 !== ['DM1', 'DM2'].indexOf( actType ) ) {

                    if( vl._validNumber( val ) ) {
                        if( dmpHbA1cUnit === 'PERCENT' ) {
                            return validationLibrary._rangeNumber( val, 0, 21 );
                        }

                        if( dmpHbA1cUnit === 'MMOLMOL' ) {
                            return validationLibrary._rangeNumber( val, 0, 210 );
                        }
                    }

                    return false;

                } else {
                    return true;
                }
            },
            _DM_T_dmpHadHypoglycaemic: function( val ) {
                var
                    actType = this.actType,
                    dmpType = this.dmpType;

                if( -1 !== ['DM1', 'DM2'].indexOf( actType ) ) {
                    if( 'FOLLOWING' === dmpType ) {
                        return validationLibrary._num( val );
                    }
                }
                return true;
            },
            _DM_T_dmpHadStationaryTreatment: function( val ) {
                var
                    actType = this.actType,
                    dmpType = this.dmpType;

                if( -1 !== ['DM1', 'DM2'].indexOf( actType ) ) {
                    if( 'FOLLOWING' === dmpType ) {
                        return validationLibrary._num( val );
                    }
                }
                return true;
            },
            _DM1_T_dmpHadHospitalStayHbA1c: function( val ) {
                var
                    actType = this.actType,
                    dmpType = this.dmpType;

                if( 'DM1' === actType ) {
                    if( 'FOLLOWING' === dmpType ) {
                        return validationLibrary._num( val );
                    }
                }
                return true;
            },
            _DM2_T_mandatory: function( val ) {
                var
                    actType = this.actType;

                if( 'DM2' === actType ) {
                    return validationLibrary._mandatory( val );
                }
                return true;
            },

            _DM_T_dmpTreatmentCommon: function( val ) {
                var
                    actType = this.actType,
                    // yes, initiated;
                    no;

                if( -1 === ['DM1', 'DM2'].indexOf( actType ) ) {
                    return true;
                }

                no = val.indexOf( VAL_NO ) !== -1;

                //  comment out for eslint - apparently unused at present
                //yes = val.indexOf(VAL_YES) !== -1;
                //initiated = val.indexOf(INITIATED) !== -1;

                if( no && val.length > 1 ) {
                    return false;
                }

                return true;
            },

            _DM_T_threatmentOpthRetinalExam: function( val ) {

                var actType = this.actType;
                var dmpType = this.dmpType;

                if( -1 === ['DM1', 'DM2'].indexOf( actType ) ) {
                    return true;
                }

                if( 'FOLLOWING' !== dmpType ) {
                    return true;
                }

                var yes = val.some( function( item ) {
                    return item === ACCOMPLISHED;
                } );
                var no = val.some( function( item ) {
                    return item === NOT_ACCOMPLISHED;
                } );
                var initiated = val.some( function( item ) {
                    return item === INITIATED;
                } );

                if( (yes && !initiated && !no) ||
                    (!yes && !initiated && no) ||
                    (!yes && initiated && !no) ||
                    (yes && initiated && !no) ||
                    (!yes && initiated && no) ) {
                    return true;
                }

                return false;
            },

            _DM_KHK_T_mandatory: function( val ) {
                var actType = this.actType;
                if( -1 !== ['DM1', 'DM2', 'KHK'].indexOf( actType ) ) {
                    return validationLibrary._mandatory( val );
                } else {
                    return true;
                }
            },
            _DM_KHK_T_mandatoryFollowing: function( val ) {
                var actType = this.actType,
                    dmpType = this.dmpType;
                if( -1 !== ['DM1', 'DM2', 'KHK'].indexOf( actType ) ) {
                    if( 'FOLLOWING' === dmpType ) {
                        return validationLibrary._mandatory( val );
                    }
                }
                return true;
            },
            _DM_KHK_T_medicationYesNoContraindication: function( val ) {
                var actType = this.actType,
                    yes, no, contr;

                if( -1 === ['DM1', 'DM2', 'KHK'].indexOf( actType ) ) {
                    return true;
                }

                if( !Array.isArray( val ) || !val.length ) {
                    return true;
                }

                yes = val.indexOf( VAL_YES ) !== -1;
                no = val.indexOf( VAL_NO ) !== -1;
                contr = val.indexOf( VAL_CONTRAINDICATION ) !== -1;

                if( (yes && no) || (yes && contr) || (contr && !yes && !no) ) {
                    return false;
                }

                return true;
            },

            _DM_KHK_T_medicationYesNoContraindicationAlone: function( val ) {
                var actType = this.actType,
                    yes, no, contr;

                if( -1 === ['DM1', 'DM2', 'KHK'].indexOf( actType ) ) {
                    return true;
                }

                if( !Array.isArray( val ) || !val.length ) {
                    return true;
                }

                yes = val.indexOf( VAL_YES ) !== -1;
                no = val.indexOf( VAL_NO ) !== -1;
                contr = val.indexOf( VAL_CONTRAINDICATION ) !== -1;

                if( (yes && no) || (yes && contr) ) {
                    return false;
                }

                return true;
            },

            // ========================================================================================================== \\
            // ============================================ BK FUNCTIONS ================================================ \\
            // A TRIER
            _BK_T_isBefore: function( after ) {
                return function _BK_T_isBefore_partial( dmpTypes, versions, validationField ) {
                    return function _BK_T_isBefore_partial( val ) {
                        if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {
                            dmpTypes: dmpTypes,
                            versions: versions
                        } ) || Y.doccirrus.edmpbkutils.dmpBkFieldIsHidden( this, validationField ) ) {
                            return true;
                        }

                        return !val || !this[after] || new Date( val ).setHours( 0, 0, 0, 0 ) <= new Date( this[after] ).setHours( 0, 0, 0, 0 );
                    };
                };
            },
            _BK_T_isAfter: function( before ) {
                return function _BK_T_isBefore_partial( dmpTypes, versions, validationField ) {
                    return function _BK_T_isBefore_partial( val ) {
                        if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {
                            dmpTypes: dmpTypes,
                            versions: versions
                        } ) || Y.doccirrus.edmpbkutils.dmpBkFieldIsHidden( this, validationField ) ) {
                            return true;
                        }

                        return !val || !this[before] || new Date( val ).setHours( 0, 0, 0, 0 ) >= new Date( this[before] ).setHours( 0, 0, 0, 0 );
                    };
                };
            },
            _BK_T_atLeastOneRecentDateIfNoRemote: function( dmpTypes, versions, validationField ) {
                return function _BK_T_atLeastOneRecentDateIfNoRemote_partial( val ) {
                    if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {
                        dmpTypes: dmpTypes,
                        versions: versions
                    } ) || Y.doccirrus.edmpbkutils.dmpBkFieldIsHidden( this, validationField ) ) {
                        return true;
                    }

                    var primary = this.dmpInitialManifestationOfPrimaryTumor;
                    var contralateral = this.dmpManifestationOfContralateralBreastCancer;
                    var locoregional = this.dmpLocoregionalRecurrence;
                    var remote = this.dmpFirstConfirmationOfRemoteMetastases;
                    var signature = this.dmpSignatureDate;

                    function isRecent( date ) {
                        return (Date.parse( signature ) - Date.parse( date )) / (1000 * 60 * 60 * 24 * 356) < 10;
                    }

                    return !val || remote || !signature || isRecent( primary ) || isRecent( contralateral ) || isRecent( locoregional );
                };
            },
            _BK_T_atLeastOneOfPrimaryContralateralLocoregional: function( dmpTypes, versions, validationField ) {
                return function _BK_T_atLeastOneOfPrimaryContralateralLocoregional_partial() {
                    if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {
                        dmpTypes: dmpTypes,
                        versions: versions
                    } ) || Y.doccirrus.edmpbkutils.dmpBkFieldIsHidden( this, validationField ) ) {
                        return true;
                    }

                    var primary = this.dmpInitialManifestationOfPrimaryTumor;
                    var contralateral = this.dmpManifestationOfContralateralBreastCancer;
                    var locoregional = this.dmpLocoregionalRecurrence;

                    return primary || contralateral || locoregional;
                };
            },
            _BK_T_exclusiveValues: function( exclusiveValues ) {
                return function _BK_T_exclusiveValues_partial( dmpTypes, versions, validationField ) {
                    return function _BK_T_exclusiveValues_partial( val ) {
                        if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {
                            dmpTypes: dmpTypes,
                            versions: versions
                        } ) || Y.doccirrus.edmpbkutils.dmpBkFieldIsHidden( this, validationField ) ) {
                            return true;
                        }

                        var valArray = Array.isArray( val ) && val || val && [val] || [];
                        var exclusiveValuesArray = Array.isArray( exclusiveValues ) && exclusiveValues || [exclusiveValues];

                        return valArray.length <= 1 || !valArray.filter( function( entry ) {
                            return exclusiveValuesArray.indexOf( entry ) > -1;
                        } ).length;
                    };
                };
            },
            _BK_T_forbiddenValues: function( forbiddenValues ) {
                return function _BK_T_forbiddenValues_partial( dmpTypes, versions, validationField ) {
                    return function _BK_T_forbidden_partial( val ) {
                        if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {
                            dmpTypes: dmpTypes,
                            versions: versions
                        } ) || Y.doccirrus.edmpbkutils.dmpBkFieldIsHidden( this, validationField ) ) {
                            return true;
                        }

                        var valArray = Array.isArray( val ) && val || val && [val] || [];
                        var forbiddenValuesArray = Array.isArray( forbiddenValues ) && forbiddenValues || [forbiddenValues];

                        return !valArray.filter( function( entry ) {
                            return forbiddenValuesArray.indexOf( entry ) > -1;
                        } ).length;
                    };
                };
            },
            _BK_T_mandatoryIfPrimaryOrContralateral: function( dmpTypes, versions, validationField ) {
                return function _BK_T_mandatoryIfPrimaryOrContralateral_partial( val ) {
                    if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {
                        dmpTypes: dmpTypes,
                        versions: versions
                    } ) || Y.doccirrus.edmpbkutils.dmpBkFieldIsHidden( this, validationField ) ) {
                        return true;
                    }

                    var primary = this.dmpInitialManifestationOfPrimaryTumor;
                    var contralateral = this.dmpManifestationOfContralateralBreastCancer;
                    var locoregional = this.dmpLocoregionalRecurrence;
                    var remote = this.dmpFirstConfirmationOfRemoteMetastases;

                    var primaryOrContralateral = primary || contralateral;
                    var locoregionalOrRemote = locoregional || remote;

                    return !primaryOrContralateral || locoregionalOrRemote || validationLibrary._mandatory( val );
                };
            },
            _BK_T_maxOneSelection: function( dmpTypes, versions, validationField ) {
                return function _BK_T_maxOneSelection_partial( val ) {
                    if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {
                        dmpTypes: dmpTypes,
                        versions: versions
                    } ) || Y.doccirrus.edmpbkutils.dmpBkFieldIsHidden( this, validationField ) ) {
                        return true;
                    }

                    return !val || typeof val === 'string';
                };
            },
            _BK_T_mandatoryIf: function( field ) {
                return function _BK_T_mandatoryIf_partial( dmpTypes, versions, validationField ) {
                    return function _BK_T_mandatoryIf_partial( val ) {
                        if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {
                            dmpTypes: dmpTypes,
                            versions: versions
                        } ) || Y.doccirrus.edmpbkutils.dmpBkFieldIsHidden( this, validationField ) ) {
                            return true;
                        }

                        return !validationLibrary._mandatory( this[field] ) || validationLibrary._mandatory( val );
                    };
                };
            },
            _BK_T_mandatoryIfNot: function( field ) {
                return function _BK_T_mandatoryIf_partial( dmpTypes, versions, validationField ) {
                    return function _BK_T_mandatoryIf_partial( val ) {
                        if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {
                            dmpTypes: dmpTypes,
                            versions: versions
                        } ) || Y.doccirrus.edmpbkutils.dmpBkFieldIsHidden( this, validationField ) ) {
                            return true;
                        }

                        return validationLibrary._mandatory( this[field] ) || validationLibrary._mandatory( val );
                    };
                };
            },
            _BK_T_forbiddenIf: function( field ) {
                return function _BK_T_forbiddenIf_partial( dmpTypes, versions, validationField ) {
                    return function _BK_T_forbiddenIf_partial( val ) {
                        if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {
                            dmpTypes: dmpTypes,
                            versions: versions
                        } ) || Y.doccirrus.edmpbkutils.dmpBkFieldIsHidden( this, validationField ) ) {
                            return true;
                        }

                        return !validationLibrary._mandatory( this[field] ) || !validationLibrary._mandatory( val );
                    };
                };
            },
            _BK_T_onlyClinicalAllowedIfSurgeryPlannedOrNotPlanned: function( dmpTypes, versions, validationField ) {
                return function _BK_T_onlyClinicalAllowedIfSurgeryPlannedOrNotPlanned_partial( val ) {
                    if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {
                        dmpTypes: dmpTypes,
                        versions: versions
                    } ) || Y.doccirrus.edmpbkutils.dmpBkFieldIsHidden( this, validationField ) ) {
                        return true;
                    }

                    var surgeryPlannedOrNotPlanned = validationLibrary.includesSome( this.dmpPerformedSurgicalTherapy_4_23, ["OPERATION_PLANNED", "OPERATION_NOT_PLANNED"] );
                    var onlyClinical = validationLibrary.excludesAll( val, ["PATHOLOGICAL", "PATHOLOGICAL_AFTER_NEOADJUVANT_THERAPY"] );

                    return !surgeryPlannedOrNotPlanned || onlyClinical;
                };
            },
            _BK_T_mandatoryIfPerformedSurgicalTherapyFilledOutAndM0: function( dmpTypes, versions, validationField ) {
                return function _BK_T_mandatoryIfPerformedSurgicalTherapyFilledOutAndM0_partial( val ) {
                    if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {
                        dmpTypes: dmpTypes,
                        versions: versions
                    } ) || Y.doccirrus.edmpbkutils.dmpBkFieldIsHidden( this, validationField ) ) {
                        return true;
                    }

                    return validationLibrary._mandatory( val ) || this.dmpM_4_23 !== "ZERO" || !this.dmpPerformedSurgicalTherapy_4_23.length;
                };
            },
            _BK_T_mandatoryIfM0: function( dmpTypes, versions, validationField ) {
                return function _BK_T_mandatoryIfM0_partial( val ) {
                    if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {
                        dmpTypes: dmpTypes,
                        versions: versions
                    } ) || Y.doccirrus.edmpbkutils.dmpBkFieldIsHidden( this, validationField ) ) {
                        return true;
                    }

                    return val || this.dmpM_4_23 !== "ZERO";
                };
            },
            _BK_T_mandatoryIfHormoneReceptorPositive: function( dmpTypes, versions, validationField ) {
                return function _BK_T_mandatoryIfHormoneReceptorPositive_partial( val ) {
                    if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {
                        dmpTypes: dmpTypes,
                        versions: versions
                    } ) || Y.doccirrus.edmpbkutils.dmpBkFieldIsHidden( this, validationField ) ) {
                        return true;
                    }

                    return validationLibrary._mandatory( val ) || this.dmpImmunohistochemicalHormoneReceptor_4_23 !== "POSITIVE";
                };
            },
            _BK_T_noneAndEndocrineTherapyPlannedExcludeOthers: function( dmpTypes, versions, validationField ) {
                return function _BK_T_noneAndEndocrineTherapyPlannedExcludeOthers_partial( val ) {
                    if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {
                        dmpTypes: dmpTypes,
                        versions: versions
                    } ) || Y.doccirrus.edmpbkutils.dmpBkFieldIsHidden( this, validationField ) ) {
                        return true;
                    }

                    var noneOrEndocrineTherapyPlanned = validationLibrary.includesSome( val, ["NONE", "ENDOCRINE_THERAPY_PLANNED"] );
                    var allOthersExcluded = validationLibrary.excludesAll( val, ["AROMATASE_INHIBITORS", "TAMOXIFEN", "OTHER"] );

                    return !noneOrEndocrineTherapyPlanned || allOthersExcluded;
                };
            },
            _BK_T_aromataseInhibitorsAndTamoxifenExcludeEachOther: function( dmpTypes, versions, validationField ) {
                return function _BK_T_aromataseInhibitorsAndTamoxifenExcludeEachOther_partial( val ) {
                    if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {
                        dmpTypes: dmpTypes,
                        versions: versions
                    } ) || Y.doccirrus.edmpbkutils.dmpBkFieldIsHidden( this, validationField ) ) {
                        return true;
                    }

                    return validationLibrary.excludesSome( val, ["AROMATASE_INHIBITORS", "TAMOXIFEN"] );
                };
            },
            _BK_T_mandatoryIfEndocrineTherapyIncludesAromataseTamoxifenOrOther: function( dmpTypes, versions, validationField ) {
                return function _BK_T_mandatoryIfEndocrineTherapyIncludesAromataseTamoxifenOrOther_partial( val ) {
                    if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {
                        dmpTypes: dmpTypes,
                        versions: versions
                    } ) || Y.doccirrus.edmpbkutils.dmpBkFieldIsHidden( this, validationField ) ) {
                        return true;
                    }

                    var endocrineTherapyIncludesAromataseTamoxifenOrOthers = validationLibrary.includesSome( this.dmpCurrentAdjuvantEndocrineTherapy_4_23, ["AROMATASE_INHIBITORS", "TAMOXIFEN", "OTHER"] );

                    return validationLibrary._mandatory( val ) || !endocrineTherapyIncludesAromataseTamoxifenOrOthers;
                };
            },

            _BK_T_mandatoryIfEndocrineTherapyIncludesAromatase: function( dmpTypes, versions, validationField ) {
                return function _BK_T_mandatoryIfEndocrineTherapyIncludesAromatase_partial( val ) {
                    if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {
                        dmpTypes: dmpTypes,
                        versions: versions
                    } ) || Y.doccirrus.edmpbkutils.dmpBkFieldIsHidden( this, validationField ) ) {
                        return true;
                    }

                    var endocrineTherapyIncludesAromatase = validationLibrary.includesSome( this.dmpCurrentAdjuvantEndocrineTherapy_4_23, "AROMATASE_INHIBITORS" );

                    return validationLibrary._mandatory( val ) || !endocrineTherapyIncludesAromatase;
                };
            },

            _BK_T_mandatoryIfRemoteInBone: function( dmpTypes, versions, validationField ) {
                return function _BK_T_mandatoryIfRemoteInBone_partial( val ) {
                    if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {
                        dmpTypes: dmpTypes,
                        versions: versions
                    } ) || Y.doccirrus.edmpbkutils.dmpBkFieldIsHidden( this, validationField ) ) {
                        return true;
                    }

                    var currentVersion = Y.doccirrus.edmpcommonutils.currentVersion( this );
                    var dmpType = this.dmpType;
                    var localisation_FST = currentVersion === "4.21" ? this.dmpLocalisation :
                        currentVersion === "4.23" ? this.dmpLocalisation_4_23 :
                            null;
                    var localisation_FLW = currentVersion === "4.21" ? this.dmpManifestationOfRemoteMetastases_following_text :
                        currentVersion === "4.23" ? this.dmpManifestationOfRemoteMetastases_following_text_4_23 :
                            null;

                    var localisation = dmpType === "FIRST" ? localisation_FST :
                        dmpType === "FOLLOWING" ? localisation_FLW :
                            null;

                    return validationLibrary._mandatory( val ) || localisation.indexOf( "BONE" ) === -1;
                };
            },
            _BK_T_mandatory: function( dmpTypes, versions, validationField ) {
                return function _BK_T_mandatory_partial( val ) {
                    if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {
                        dmpTypes: dmpTypes,
                        versions: versions
                    } ) || Y.doccirrus.edmpbkutils.dmpBkFieldIsHidden( this, validationField ) ) {
                        return true;
                    }

                    return validationLibrary._mandatory( val );
                };
            },
            _BK_T_mandatoryIfRegistrationForPrimaryOrContralateral: function( dmpTypes, versions, validationField ) {
                return function _BK_T_mandatoryIfRegistrationForPrimaryOrContralateral_partial( val ) {
                    if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {
                        dmpTypes: dmpTypes,
                        versions: versions
                    } ) || Y.doccirrus.edmpbkutils.dmpBkFieldIsHidden( this, validationField ) ) {
                        return true;
                    }

                    var primaryOrContralateral = validationLibrary.includesSome( this.dmpRegistrationFor, ["PRIMARY_TUMOR", "CONTRALATERAL_BREAST_CANCER"] );

                    return validationLibrary._mandatory( val ) || !primaryOrContralateral;
                };
            },
            _BK_T_remoteDateImpliesText: function( dmpTypes, versions, validationField ) {
                return function _BK_T_remoteDateImpliesText_partial( val ) {
                    if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {
                        dmpTypes: dmpTypes,
                        versions: versions
                    } ) || Y.doccirrus.edmpbkutils.dmpBkFieldIsHidden( this, validationField ) ) {
                        return true;
                    }

                    var remoteDate = this.dmpManifestationOfRemoteMetastases_following_date;

                    return !remoteDate || validationLibrary.includesSome( val, ["BONE", "VISCERAL", "CNS", "OTHER"] );
                };
            },
            _BK_T_mandatoryIfVisceralRemoteMetastases: function( dmpTypes, versions, validationField ) {
                return function _BK_T_mandatoryIfVisceralRemoteMetastases_partial( val ) {
                    if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {
                        dmpTypes: dmpTypes,
                        versions: versions
                    } ) || Y.doccirrus.edmpbkutils.dmpBkFieldIsHidden( this, validationField ) ) {
                        return true;
                    }

                    var visceralRemoteMetastases = validationLibrary.includesSome( this.dmpManifestationOfRemoteMetastases_following_text_4_23, "VISCERAL" );

                    return validationLibrary._mandatory( val ) || !visceralRemoteMetastases;
                };
            },

            // General =====================================================================================================
            // FIRST •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
            _BK_T_mandatory_FST: function( val ) {
                if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {versions: ["4.21"]} ) ) {
                    return true;
                }
                if( this.dmpType !== "FIRST" ) {
                    return true;
                }
                return validationLibrary._mandatory( val );
            },
            _BK_T_mandatoryIfPrimaryOrContralateral_FST: function( val ) {
                if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {versions: ["4.21"]} ) ) {
                    return true;
                }

                var
                    primary = this.dmpInitialManifestationOfPrimaryTumor,
                    contralateral = this.dmpManifestationOfContralateralBreastCancer,
                    locoregional = this.dmpLocoregionalRecurrence,
                    remote = this.dmpFirstConfirmationOfRemoteMetastases,
                    primaryDate = primary ? new Date( primary ).setHours( 0, 0, 0, 0 ) : null,
                    contralateralDate = contralateral ? new Date( contralateral ).setHours( 0, 0, 0, 0 ) : null,
                    locoregionalDate = locoregional ? new Date( locoregional ).setHours( 0, 0, 0, 0 ) : null;

                if( this.dmpType !== "FIRST" ) {
                    return true;
                }
                return !(!validationLibrary._mandatory( val ) && (primary || contralateral) && !remote &&
                         (!locoregional || (primaryDate >= locoregionalDate || contralateralDate > locoregionalDate)));
            },
            _BK_T_mandatoryIfPrimaryOrContralateralAndPostoperative_FST: function( val ) {
                if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {versions: ["4.21"]} ) ) {
                    return true;
                }
                var
                    status = this.dmpCurrentTreatmentStatus;

                if( this.dmpType !== "FIRST" ) {
                    return true;
                }
                return DCValidationsKBV.prototype._BK_T_mandatoryIfPrimaryOrContralateral_FST.call( this, val ) || status !== "POSTOPERATIVE";
            },
            // PNP •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
            _BK_T_mandatory_PNP: function( val ) {
                if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {versions: ["4.21"]} ) ) {
                    return true;
                }
                if( this.dmpType !== "PNP" ) {
                    return true;
                }
                return validationLibrary._mandatory( val );
            },
            // FOLLOWING •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
            _BK_T_mandatory_FLW: function( val ) {
                if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {versions: ["4.21"]} ) ) {
                    return true;
                }
                if( this.dmpType !== "FOLLOWING" ) {
                    return true;
                }
                return validationLibrary._mandatory( val );
            },
            // Registration ================================================================================================
            // FIRST •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
            // Anamnesis and treatment status of the primary tumor / contralateral breast cancer" ===========================
            // FIRST and PNP •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
            _BK_T_noOperationExcludesOthers_FST_PNP_VIOH: function( val ) {
                if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {versions: ["4.21"]} ) ) {
                    return true;
                }
                if( this.dmpType !== "FIRST" && this.dmpType !== "PNP" ) {
                    return true;
                }
                if( !this.dmpShowOptionalFields && DCValidationsKBV.prototype._BK_T_mandatoryIfPrimaryOrContralateralAndPostoperative_FST.call( this, null ) ) {
                    return true;
                }
                return !(val.indexOf( 'NO_OPERATION' ) > -1 && val.length > 1);
            },

            // PNP •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
            _BK_T_notOperationPlanned_PNP: function( val ) {
                if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {versions: ["4.21"]} ) ) {
                    return true;
                }
                if( this.dmpType !== "PNP" ) {
                    return true;
                }
                return val !== "OPERATION_PLANNED";
            },

            // Current findings for the primary tumor / contralateral breast cancer ========================================
            // FIRST and PNP •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
            _BK_T_Tis01234excludeOthers_FST_PNP_VIOH: function( val ) {
                if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {versions: ["4.21"]} ) ) {
                    return true;
                }
                if( this.dmpType !== "FIRST" && this.dmpType !== "PNP" ) {
                    return true;
                }
                if( !this.dmpShowOptionalFields && DCValidationsKBV.prototype._BK_T_mandatoryIfPrimaryOrContralateralAndPostoperative_FST.call( this, null ) ) {
                    return true;
                }
                return !((val.indexOf( "TIS" ) > -1 ||
                          val.indexOf( "ZERO" ) > -1 ||
                          val.indexOf( "ONE" ) > -1 ||
                          val.indexOf( "TWO" ) > -1 ||
                          val.indexOf( "THREE" ) > -1 ||
                          val.indexOf( "FOUR" ) > -1) &&
                         val.length > 1);
            },
            _BK_T_R0R1R2excludeOthers_FST_PNP_VIOH: function( val ) {
                if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {versions: ["4.21"]} ) ) {
                    return true;
                }
                if( this.dmpType !== "FIRST" && this.dmpType !== "PNP" ) {
                    return true;
                }
                if( !this.dmpShowOptionalFields && DCValidationsKBV.prototype._BK_T_mandatoryIfPrimaryOrContralateralAndPostoperative_FST.call( this, null ) ) {
                    return true;
                }
                return !((val.indexOf( "R0" ) > -1 ||
                          val.indexOf( "R1" ) > -1 ||
                          val.indexOf( "R2" ) > -1 ||
                          val.indexOf( "FOUR" ) > -1) &&
                         val.length > 1);
            },
            // PNP •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
            _BK_T_mandatoryIfPostoperative_PNP: function( val ) {
                if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {versions: ["4.21"]} ) ) {
                    return true;
                }
                if( this.dmpType !== "PNP" ) {
                    return true;
                }
                return this.dmpCurrentTreatmentStatus === "POSTOPERATIVE" ? validationLibrary._mandatory( val ) : true;
            },
            _BK_T_noOperationConsistent_PNP: function( val ) {
                if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {versions: ["4.21"]} ) ) {
                    return true;
                }
                if( this.dmpType !== "PNP" ) {
                    return true;
                }
                return !(this.dmpPerformedSurgicalTherapy.indexOf( "NO_OPERATION" ) > -1 && val.indexOf( "NO_OPERATION" ) === -1);
            },
            // Treatment of the primary tumor / contralateral breast cancer ================================================
            // FIRST •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
            // _BK_T_mandatoryIfPostoperative_FST: function( val ) {
            //     var
            //         status = this.dmpCurrentTreatmentStatus;
            //
            //     if (this.dmpType !== "FIRST") { return true; }
            //     return val || status !== "POSTOPERATIVE";
            // },
            // _BK_T_mandatoryIfOperationNotPlanned_FST: function( val ) {
            //     var
            //         status = this.dmpCurrentTreatmentStatus;
            //
            //     if (this.dmpType !== "FIRST") { return true; }
            //     return val || status !== "OPERATION_NOT_PLANNED";
            // },
            // FOLLOWING •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
            _BK_T_mandatoryIfPrimaryOrContralateral_FLW: function( val ) {
                if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {versions: ["4.21"]} ) ) {
                    return true;
                }
                var
                    registration = this.dmpRegistrationFor;

                if( this.dmpType !== "FOLLOWING" ) {
                    return true;
                }
                return val || (registration !== "PRIMARY_TUMOR" && registration !== "CONTRALATERAL_BREAST_CANCER");
            },
            // Findings and Therapy of a Locoregional Recurrence ===========================================================
            // FIRST •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
            _BK_T_mandatoryIfLocoregional_FST: function( val ) {
                if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {versions: ["4.21"]} ) ) {
                    return true;
                }
                var
                    primary = this.dmpInitialManifestationOfPrimaryTumor,
                    contralateral = this.dmpManifestationOfContralateralBreastCancer,
                    locoregional = this.dmpLocoregionalRecurrence,
                    remote = this.dmpFirstConfirmationOfRemoteMetastases;

                if( this.dmpType !== "FIRST" ) {
                    return true;
                }
                return validationLibrary._mandatory( val ) || !locoregional || remote ||
                       (primary && new Date( primary ).setHours( 0, 0, 0, 0 ) >= new Date( locoregional ).setHours( 0, 0, 0, 0 )) ||
                       (contralateral && new Date( contralateral ).setHours( 0, 0, 0, 0 ) > new Date( locoregional ).setHours( 0, 0, 0, 0 ));
            },
            // FIRST & PNP •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
            _BK_T_noneExcludesOthers_locoregional_FST_PNP_VIOH: function( val ) {
                if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {versions: ["4.21"]} ) ) {
                    return true;
                }
                if( this.dmpType !== "FIRST" && this.dmpType !== "PNP" ) {
                    return true;
                }
                if( !this.dmpShowOptionalFields && DCValidationsKBV.prototype._BK_T_mandatoryIfLocoregional_FST.call( this, null ) ) {
                    return true;
                }
                return val.indexOf( 'NONE' ) === -1 || val.length === 1;
            },
            _BK_T_preoperativeExcludesMastectomyExcision_FST_PNP_VIOH: function( val ) {
                if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {versions: ["4.21"]} ) ) {
                    return true;
                }
                if( this.dmpType !== "FIRST" && this.dmpType !== "PNP" ) {
                    return true;
                }
                if( !this.dmpShowOptionalFields && DCValidationsKBV.prototype._BK_T_mandatoryIfLocoregional_FST.call( this, null ) ) {
                    return true;
                }
                return (val.indexOf( 'PREOPERATIVE' ) === -1 ||
                        (val.indexOf( 'EXCISION' ) === -1 && val.indexOf( 'MASTECTOMY' ) === -1));
            },
            // Findings and Therapy of a Remote Metastases =================================================================
            // FIRST •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
            _BK_T_mandatoryIfRemote_FST: function( val ) {
                if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {versions: ["4.21"]} ) ) {
                    return true;
                }
                var
                    remote = this.dmpFirstConfirmationOfRemoteMetastases;

                if( this.dmpType !== "FIRST" ) {
                    return true;
                }
                return validationLibrary._mandatory( val ) || !remote;
            },

            // FIRST & PNP •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
            _BK_T_noneExcludesOthers_remote_FST_PNP_VIOH: function( val ) {
                if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {versions: ["4.21"]} ) ) {
                    return true;
                }
                if( this.dmpType !== "FIRST" && this.dmpType !== "PNP" ) {
                    return true;
                }
                if( !this.dmpShowOptionalFields && DCValidationsKBV.prototype._BK_T_mandatoryIfRemote_FST.call( this, null ) ) {
                    return true;
                }
                return val.indexOf( 'NONE' ) === -1 || val.length === 1;
            },
            _BK_T_yesExcludesOthers_FST_PNP_VIOH: function( val ) {
                if( this.dmpType !== "FIRST" && this.dmpType !== "PNP" ) {
                    return true;
                }
                if( !this.dmpShowOptionalFields && DCValidationsKBV.prototype._BK_T_mandatoryIfRemoteAndBone_FST.call( this, null ) ) {
                    return true;
                }
                return val.indexOf( 'YES' ) === -1 || val.length === 1;
            },
            // Events since the last documentation =========================================================================
            // FOLLOWING •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
            _BK_T_beforeSignatureDate_FLW: function( val ) {
                var
                    signature = this.dmpSignatureDate;

                if( this.dmpType !== "FOLLOWING" ) {
                    return true;
                }
                return !val || !signature || (new Date( val ).setHours( 0, 0, 0, 0 ) <= new Date( signature ).setHours( 0, 0, 0, 0 ));
            },
            _BK_T_locoregionalDateExcludesNo_FLW: function( val ) {
                var
                    locoregional = this.dmpManifestationOfLocoregionalRecurrence_following_date;

                if( this.dmpType !== "FOLLOWING" ) {
                    return true;
                }
                return val.length === 0 || !locoregional;
            },
            _BK_T_contralateralDateExcludesNo_FLW: function( val ) {
                var
                    contralateral = this.dmpManifestationOfContralateralBreastCancer_following_date;

                if( this.dmpType !== "FOLLOWING" ) {
                    return true;
                }
                return val.length === 0 || !contralateral;
            },
            _BK_T_remoteDateExcludesNo_FLW: function( val ) {
                if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {versions: ["4.21"]} ) ) {
                    return true;
                }
                var
                    remote = this.dmpManifestationOfRemoteMetastases_following_date;

                if( this.dmpType !== "FOLLOWING" ) {
                    return true;
                }
                return val.indexOf( "NO" ) === -1 || !remote;
            },
            _BK_T_mandatoryLocoregional_FLW: function() {
                var
                    locoregionalDate = this.dmpManifestationOfLocoregionalRecurrence_following_date,
                    locoregionalText = this.dmpManifestationOfLocoregionalRecurrence_following_text;

                if( this.dmpType !== "FOLLOWING" ) {
                    return true;
                }
                return locoregionalDate || locoregionalText.length === 1;
            },
            _BK_T_mandatoryContralateral_FLW: function() {
                var
                    contralateralDate = this.dmpManifestationOfContralateralBreastCancer_following_date,
                    contralateralText = this.dmpManifestationOfContralateralBreastCancer_following_text;

                if( this.dmpType !== "FOLLOWING" ) {
                    return true;
                }
                return contralateralDate || contralateralText.length === 1;
            },
            _BK_T_mandatoryRemote_FLW: function() {
                if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {versions: ["4.21"]} ) ) {
                    return true;
                }
                var
                    remoteDate = this.dmpManifestationOfRemoteMetastases_following_date,
                    remoteText = this.dmpManifestationOfRemoteMetastases_following_text;

                if( this.dmpType !== "FOLLOWING" ) {
                    return true;
                }
                return remoteDate || remoteText.length > 0;
            },
            _BK_T_noExcludesOthers_FLW: function( val ) {
                if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {versions: ["4.21"]} ) ) {
                    return true;
                }
                if( this.dmpType !== "FOLLOWING" ) {
                    return true;
                }
                return val.indexOf( 'NO' ) === -1 || val.length === 1;
            },
            _BK_T_textImpliesDate_FLW: function( val ) {
                var
                    remoteText = this.dmpManifestationOfRemoteMetastases_following_text;

                if( this.dmpType !== "FOLLOWING" ) {
                    return true;
                }
                return val || (remoteText.indexOf( "LIVER" ) === -1 &&
                               remoteText.indexOf( "LUNG" ) === -1 &&
                               remoteText.indexOf( "BONE" ) === -1 &&
                               remoteText.indexOf( "OTHER" ) === -1);
            },
            _BK_T_dateImpliesText_FLW: function( val ) {
                if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {versions: ["4.21"]} ) ) {
                    return true;
                }
                var
                    remoteDate = this.dmpManifestationOfRemoteMetastases_following_date;

                if( this.dmpType !== "FOLLOWING" ) {
                    return true;
                }
                return !remoteDate || val.indexOf( "LIVER" ) > -1 ||
                       val.indexOf( "LUNG" ) > -1 ||
                       val.indexOf( "BONE" ) > -1 ||
                       val.indexOf( "OTHER" ) > -1;
            },
            // Treatment of advanced disease (locoregional recurrence / remote metastases) =================================
            // FOLLOWING •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
            _BK_T_mandatoryIfLocoregional_FLW: function( val ) {
                if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {versions: ["4.21"]} ) ) {
                    return true;
                }
                var
                    registration = this.dmpRegistrationFor,
                    locoregionalDate = this.dmpManifestationOfLocoregionalRecurrence_following_date;

                if( this.dmpType !== "FOLLOWING" ) {
                    return true;
                }
                return validationLibrary._mandatory( val ) || (registration !== "LOCOREGIONAL_RECURRENCE" && !locoregionalDate);
            },
            _BK_T_mandatoryIfRemote_FLW: function( val ) {
                if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {versions: ["4.21"]} ) ) {
                    return true;
                }
                var
                    registration = this.dmpRegistrationFor,
                    remoteDate = this.dmpManifestationOfRemoteMetastases_following_date;

                if( this.dmpType !== "FOLLOWING" ) {
                    return true;
                }
                return validationLibrary._mandatory( val ) || (registration !== "REMOTE_METASTASES" && !remoteDate);
            },
            _BK_T_noneExcludesOthers_locoregional_FLW_VIOH: function( val ) {
                if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {versions: ["4.21"]} ) ) {
                    return true;
                }
                if( this.dmpType !== "FOLLOWING" ) {
                    return true;
                }
                if( !this.dmpShowOptionalFields && DCValidationsKBV.prototype._BK_T_mandatoryIfLocoregional_FLW.call( this, null ) ) {
                    return true;
                }
                return val.indexOf( 'NONE' ) === -1 || val.length === 1;
            },
            _BK_T_noneExcludesOthers_remote_FLW_VIOH: function( val ) {
                if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {versions: ["4.21"]} ) ) {
                    return true;
                }
                if( this.dmpType !== "FOLLOWING" ) {
                    return true;
                }
                if( !this.dmpShowOptionalFields && DCValidationsKBV.prototype._BK_T_mandatoryIfRemote_FLW.call( this, null ) ) {
                    return true;
                }
                return val.indexOf( 'NONE' ) === -1 || val.length === 1;
            },
            _BK_T_progressExcludesOthers_FLW_VIOH: function( val ) {
                if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {versions: ["4.21"]} ) ) {
                    return true;
                }
                if( this.dmpType !== "FOLLOWING" ) {
                    return true;
                }
                if( !this.dmpShowOptionalFields &&
                    DCValidationsKBV.prototype._BK_T_mandatoryIfLocoregional_FLW.call( this, null ) &&
                    DCValidationsKBV.prototype._BK_T_mandatoryIfRemote_FLW.call( this, null ) ) {
                    return true;
                }
                return val.indexOf( 'PROGRESS' ) === -1 || val.length === 1;
            },
            _BK_T_totalExcludesPartialRemission_FLW_VIOH: function( val ) {
                if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {versions: ["4.21"]} ) ) {
                    return true;
                }
                if( this.dmpType !== "FOLLOWING" ) {
                    return true;
                }
                if( !this.dmpShowOptionalFields &&
                    DCValidationsKBV.prototype._BK_T_mandatoryIfLocoregional_FLW.call( this, null ) &&
                    DCValidationsKBV.prototype._BK_T_mandatoryIfRemote_FLW.call( this, null ) ) {
                    return true;
                }
                return val.indexOf( "TOTAL_REMISSION" ) === -1 || val.indexOf( "PARTIAL_REMISSION" ) === -1;
            },
            _BK_T_preoperativeExcludesExcisionAndMastectomy_FLW_VIOH: function( val ) {
                if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {versions: ["4.21"]} ) ) {
                    return true;
                }
                if( this.dmpType !== "FOLLOWING" ) {
                    return true;
                }
                if( !this.dmpShowOptionalFields && DCValidationsKBV.prototype._BK_T_mandatoryIfLocoregional_FLW.call( this, null ) ) {
                    return true;
                }
                return val.indexOf( "PREOPERATIVE" ) === -1 || !(val.indexOf( "EXCISION" ) > -1 || val.indexOf( "MASTECTOMY" ) > -1);
            },
            _BK_T_mandatoryIfRemoteInBone_FLW: function( val ) {
                if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {versions: ["4.21"]} ) ) {
                    return true;
                }
                var
                    remoteText = this.dmpManifestationOfRemoteMetastases_following_text;

                if( this.dmpType !== "FOLLOWING" ) {
                    return true;
                }
                return validationLibrary._mandatory( val ) || remoteText.indexOf( "BONE" ) === -1;
            },
            _BK_T_yesExcludesOthers_FLW_VIOH: function( val ) {
                if( !Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant( this, {versions: ["4.21"]} ) ) {
                    return true;
                }
                if( this.dmpType !== "FOLLOWING" ) {
                    return true;
                }
                if( !this.dmpShowOptionalFields && DCValidationsKBV.prototype._BK_T_mandatoryIfRemoteInBone_FLW.call( this, null ) ) {
                    return true;
                }
                return val.indexOf( 'YES' ) === -1 || val.length === 1;
            },
            // ========================================================================================================== \\
            // ========================================================================================================== \\

            _HGV_T_mandatory: function( dmpTypes, dmpAges ) {
                return function _HGV_T_mandatory_partial( val ) {
                    if( !Y.doccirrus.edmpcommonutils.hgvActivityIsRelevant( this, {
                        dmpTypes: dmpTypes,
                        dmpAges: dmpAges
                    } ) ) {
                        return true;
                    }
                    return validationLibrary._mandatory( val );
                };
            },
            _HGV_T_minOneSelection: function( validationFields, baseCondition, baseVal, dmpTypes, dmpAges ) {
                return function _HGV_T_minOneSelection_partial() {
                    if( !Y.doccirrus.edmpcommonutils.hgvActivityIsRelevant( this, {
                        dmpTypes: dmpTypes,
                        dmpAges: dmpAges
                    } ) ) {
                        return true;
                    }
                    if( baseCondition ) {
                        if( this[baseCondition] !== baseVal ) {
                            return true;
                        }
                    }
                    var retVal = false,
                        self = this;
                    validationFields.forEach( function( field ) {
                        if( typeof self[field] !== 'undefined' ) {
                            if( typeof self[field] === 'number' ) {
                                retVal = true;
                            }
                            if( typeof self[field] === 'string' ) {
                                if( self[field].length > 0 ) {
                                    retVal = true;
                                }
                            }
                            if( typeof self[field] === 'object' ) {
                                if( self[field] ) {
                                    if( self[field].length > 0 ) {
                                        retVal = true;
                                    }
                                }
                            }
                        }
                    } );
                    return retVal;
                };
            },
            _HGV_T_validNumber: function( from, to, dmpTypes, dmpAges ) {
                return function _HGV_T_validNumber_partial( val ) {
                    if( !Y.doccirrus.edmpcommonutils.hgvActivityIsRelevant( this, {
                        dmpTypes: dmpTypes,
                        dmpAges: dmpAges
                    } ) ) {
                        return true;
                    }
                    if( val ) {
                        return validationLibrary._rangeNumber( val, from, to ) && Number.isInteger( Number( val ) );
                    } else {
                        return true;
                    }
                };
            },
            _HGV_T_mandatoryIf: function( baseCondition, baseVal, dmpTypes, dmpAges ) {
                return function _HGV_T_mandatoryIf_partial( val ) {
                    if( !Y.doccirrus.edmpcommonutils.hgvActivityIsRelevant( this, {
                        dmpTypes: dmpTypes,
                        dmpAges: dmpAges
                    } ) ) {
                        return true;
                    }
                    if( this[baseCondition] === baseVal ) {
                        return validationLibrary._mandatory( val );
                    }
                    return true;
                };
            },
        // ========================================================================================================== \\
        // ========================================================================================================== \\
            _ZervixZytologie_T_DateIsMandatory: function( val ) {
                var
                    actType = this.actType;

                if( 'ZERVIX_ZYTOLOGIE' === actType ) {
                    return validationLibrary._mandatory( val );
                }
                return true;
            },
            _ZervixZytologie_T_dmpZytologicalFindingIsMandatroy: function( val ) {
                var
                    valid = true;

                if( 'ZERVIX_ZYTOLOGIE' === this.actType ) {
                    valid = validationLibrary._mandatory( val );
                }
                return valid;
            },
            _ZervixZytologie_T_dmpZytologicalFindingSelectionIsMandatroy: function( val ) {
                var
                    valid = true;

                if( 'ZERVIX_ZYTOLOGIE' === this.actType ) {
                    if( 'finding' === this.dmpZytologicalFinding ) {
                        valid = validationLibrary._mandatory( val );
                    }
                }
                return valid;
            },
            _ZervixZytologie_T_dmpHistologicalClarificationSelectionIsMandatroy: function( val ) {
                var
                    valid = true;

                if( 'ZERVIX_ZYTOLOGIE' === this.actType ) {
                    if( this.dmpHistologicalClarification ) {
                        valid = validationLibrary._mandatory( val );
                    }
                }
                return valid;
            },

            // ========================================================================================================== \\
            // ========================================================================================================== \\

            _KHK_T_mandatory: function( val ) {
                var
                    actType = this.actType;

                if( 'KHK' === actType ) {
                    return validationLibrary._mandatory( val );
                }
                return true;
            },
            _KHK_T_NoneExcludesOthers: function( val ) {
                var
                    actType = this.actType;

                if( 'KHK' === actType ) {
                    if( Array.isArray( val ) && val.length > 1 && val.indexOf( 'NONE' ) > -1 ) {
                        return false;
                    }
                }
                return true;
            },
            _KHK_T_dmpLdlCholesterolValue: function( val ) {
                var
                    actType = this.actType,
                    dmpLdlCholesterolUnit = this.dmpLdlCholesterolUnit,
                    dmpLdlCholesterolNotDetermined = this.dmpLdlCholesterolNotDetermined;

                if( 'KHK' === actType ) {
                    if( dmpLdlCholesterolNotDetermined ) {
                        if( dmpLdlCholesterolUnit ) {
                            return false;
                        }
                    } else {

                        if( dmpLdlCholesterolUnit === 'MGDL' ) {
                            return validationLibrary._rangeNumber( val, 0, 999 );
                        }

                        if( dmpLdlCholesterolUnit === 'MMOLL' ) {
                            return validationLibrary._rangeNumber( val, 0, 25.9 );
                        }

                        return false;

                    }
                }
                return true;
            },
            _KHK_T_dmpLdlCholesterolUnit: function( val ) {
                var
                    actType = this.actType,
                    dmpLdlCholesterolValue = this.dmpLdlCholesterolValue;

                if( 'KHK' === actType ) {
                    if( Y.Lang.isNumber( dmpLdlCholesterolValue ) ) {
                        return validationLibrary._mandatory( val );
                    }
                }
                return true;
            },
            _KHK_T_dmpLdlCholesterolNotDetermined: function( val ) {
                var
                    actType = this.actType,
                    dmpLdlCholesterolValue = this.dmpLdlCholesterolValue;

                if( 'KHK' === actType ) {
                    if( !val && !Y.Lang.isNumber( dmpLdlCholesterolValue ) ) {
                        return false;
                    }
                }
                return true;
            },
            _KHK_T_dmpKhkRelevantEvents: function( val ) {
                var
                    actType = this.actType;

                if( 'KHK' === actType ) {
                    if( Array.isArray( val ) && val.length > 1 && val.indexOf( 'NO' ) > -1 ) {
                        return false;
                    }
                }
                return true;
            },
            _KHK_T_dmpHadStationaryKhkTreatment: function( val ) {
                var
                    actType = this.actType,
                    dmpType = this.dmpType;

                if( 'KHK' === actType ) {
                    if( 'FOLLOWING' === dmpType ) {
                        return validationLibrary._num( val );
                    }
                }
                return true;
            },
            _DMP_T_relevantEventNumCommon: function( val ) {

                if( 'FOLLOWING' === this.dmpType ) {
                    return validationLibrary._rangeNumber( val, 0, 99 );
                }

                return true;
            },

            _ASTHMA_T_mandatory: function( val ) {
                var
                    actType = this.actType;

                if( 'ASTHMA' === actType ) {
                    return validationLibrary._mandatory( val );
                }
                return true;
            },

            _ASTHMA_T_mandatory_until_Q1_2019: function( val ) {
                var
                    actType = this.actType;

                if( Y.doccirrus.edmpcommonutils.isAfterQ( this, Y.doccirrus.edmpcommonutils.Q1_2019 ) ) {
                    return true;
                }

                if( 'ASTHMA' === actType ) {
                    return validationLibrary._mandatory( val );
                }
                return true;
            },

            _ASTHMA_T_mandatory_from_Q2_2019: function( val ) {
                var
                    actType = this.actType;

                if( !Y.doccirrus.edmpcommonutils.isAfterQ( this, Y.doccirrus.edmpcommonutils.Q1_2019 ) ) {
                    return true;
                }

                if( 'ASTHMA' === actType ) {
                    return validationLibrary._mandatory( val );
                }
                return true;
            },
            _ASTHMA_T_mandatoryFollowing: function( val ) {
                var
                    actType = this.actType,
                    dmpType = this.dmpType;

                if( 'ASTHMA' === actType ) {
                    if( 'FOLLOWING' === dmpType ) {
                        return validationLibrary._mandatory( val );
                    }
                }
                return true;
            },
            _ASTHMA_T_OtherSpecificMedication_IfNone: function( val ) {

                if( 'ASTHMA' !== this.actType ) {
                    return true;
                }

                var no = val.some( function( item ) {
                    return item === VAL_NO;
                } );

                if( no && val.length > 1 ) {
                    return false;
                }

                return true;

            },
            _ASTHMA_T_NoneExcludesOthers: function( val ) {
                var
                    actType = this.actType;

                if( 'ASTHMA' === actType ) {
                    if( Array.isArray( val ) && val.length > 1 && val.indexOf( 'NONE' ) > -1 ) {
                        return false;
                    }
                }
                return true;
            },
            _ASTHMA_T_dmpAsthmaTrainingAlreadyDoneBeforeDMP_4_44: function( val ) {
                var
                    actType = this.actType;

                if( this.dmpType !== 'FIRST' || !Y.doccirrus.edmpcommonutils.isAfterQ( this, Y.doccirrus.edmpcommonutils.Q1_2019 ) ) {
                    return true;
                }

                if( 'ASTHMA' === actType ) {
                    if( Array.isArray( val ) && (val.length > 1 || val.length === 0) ) {
                        return false;
                    }
                }
                return true;
            },
            _ASTHMA_T_dmpTherapyAdjustment_4_44: function( val ) {
                var
                    actType = this.actType;

                if( 'ASTHMA' !== actType ) {
                    return true;
                }
                if( !Y.doccirrus.edmpcommonutils.isAfterQ( this, Y.doccirrus.edmpcommonutils.Q1_2019 ) ) {
                    return true;
                }
                if( Array.isArray( val ) && !val.length ) {
                    return false;
                } else if( Array.isArray( val ) && val.length > 1 && val.indexOf( 'NONE' ) !== -1 ) {
                    return false;
                } else if( Array.isArray( val ) && val.indexOf( 'INCREASE_IN_MEDICATION' ) !== -1 && val.indexOf( 'REDUCTION_OF_MEDICATION' ) !== -1 ) {
                    return false;
                }

                return true;
            },
            _ASTHMA_T_IfNecessaryChronicMedicationNoneContraindication: function( val ) {
                var
                    actType = this.actType;

                if( 'ASTHMA' === actType ) {
                    if( Array.isArray( val ) && val.length ) {
                        if( val.indexOf( 'NONE' ) > -1 || val.indexOf( 'CONTRAINDICATION' ) > -1 ) {
                            if( val.indexOf( 'IF_NECESSARY' ) > -1 || val.indexOf( 'CHRONIC_MEDICATION' ) > -1 ) {
                                return false;
                            }
                        }
                    }
                }
                return true;
            },
            _ASTHMA_T_dmpCurrentPeakFlowValue: function( val ) {
                var
                    actType = this.actType,
                    dmpCurrentPeakFlowValueNotDone = this.dmpCurrentPeakFlowValueNotDone;

                if( Y.doccirrus.edmpcommonutils.isAfterQ( this, Y.doccirrus.edmpcommonutils.Q1_2019 ) ) {
                    return true;
                }

                if( 'ASTHMA' === actType ) {
                    if( !dmpCurrentPeakFlowValueNotDone ) {
                        return validationLibrary._mandatory( val ) && validationLibrary._rangeNumber( val, 40, 999 );
                    }
                }
                return true;
            },
            _ASTHMA_T_dmpCurrentPeakFlowValueNotDone: function( val ) {
                var
                    actType = this.actType,
                    dmpCurrentPeakFlowValue = this.dmpCurrentPeakFlowValue;

                if( Y.doccirrus.edmpcommonutils.isAfterQ( this, Y.doccirrus.edmpcommonutils.Q1_2019 ) ) {
                    return true;
                }

                if( 'ASTHMA' === actType ) {
                    if( !dmpCurrentPeakFlowValue && !val ) {
                        return false;
                    }
                }
                return true;
            },
            _ASTHMA_T_dmpCurrentFEV1Value_4_44: function( val ) {
                var
                    actType = this.actType,
                    dmpCurrentFEV1ValueNotDone_4_44 = this.dmpCurrentFEV1ValueNotDone_4_44;

                if( !Y.doccirrus.edmpcommonutils.isAfterQ( this, Y.doccirrus.edmpcommonutils.Q1_2019 ) ) {
                    return true;
                }

                if( 'ASTHMA' === actType ) {
                    if( !dmpCurrentFEV1ValueNotDone_4_44 ) {
                        return validationLibrary._mandatory( val ) && validationLibrary._rangeNumber( val, 10, 299.9 );
                    }
                }
                return true;
            },
            _ASTHMA_T_dmpCurrentFEV1ValueNotDone_4_44: function( val ) {
                var
                    actType = this.actType,
                    dmpCurrentFEV1Value_4_44 = this.dmpCurrentFEV1Value_4_44;

                if( !Y.doccirrus.edmpcommonutils.isAfterQ( this, Y.doccirrus.edmpcommonutils.Q1_2019 ) ) {
                    return true;
                }

                if( 'ASTHMA' === actType ) {
                    if( !dmpCurrentFEV1Value_4_44 && !val ) {
                        return false;
                    }
                }
                return true;
            },
            _ASTHMA_T_dmpHadStationaryAsthmaTreatment: function( val ) {
                var
                    actType = this.actType,
                    dmpType = this.dmpType;

                if( Y.doccirrus.edmpcommonutils.isAfterQ( this, Y.doccirrus.edmpcommonutils.Q1_2019 ) ) {
                    return true;
                }

                if( 'ASTHMA' === actType ) {
                    if( 'FOLLOWING' === dmpType ) {
                        return validationLibrary._num( val ) && validationLibrary._rangeNumber( val, 0, 99 );
                    }
                }
                return true;
            },
            _ASTHMA_T_dmpHadUnplannedAsthmaTreatment_4_44: function( val ) {
                var
                    actType = this.actType,
                    dmpType = this.dmpType;

                if( !Y.doccirrus.edmpcommonutils.isAfterQ( this, Y.doccirrus.edmpcommonutils.Q1_2019 ) ) {
                    return true;
                }

                if( 'ASTHMA' === actType ) {
                    if( 'FOLLOWING' === dmpType ) {
                        return validationLibrary._num( val ) && validationLibrary._rangeNumber( val, 0, 99 );
                    }
                }
                return true;
            },

            _eDMP_COMMON_mandatory: function( val ) {
                if( this.actType === "BK" && (!Y.doccirrus.edmpcommonutils.isAfterQ( this, 'Q3/2018' ) || this.dmpType === "PNP") ) {
                    return true;
                } // Special handling for BK wight and height. Will need a better fix if more common fields come up in updates.

                if( -1 === Y.doccirrus.schemas.casefolder.eDmpTypes.indexOf( this.actType ) ) {
                    return true;
                }

                return validationLibrary._mandatory( val );
            },

            _eDMP_COMMON_mandatory_excluding_BK: function( val ) {

                if( this.actType === "BK" ) {
                    return true;
                }

                if( -1 === Y.doccirrus.schemas.casefolder.eDmpTypes.indexOf( this.actType ) ) {
                    return true;
                }

                return validationLibrary._mandatory( val );

            },

            _DMP_BASE_T_dmpConcomitantDiseaseNo: function( val ) {

                if( -1 === Y.doccirrus.schemas.casefolder.eDmpTypes.indexOf( this.actType ) ) {
                    return true;
                }

                if( -1 !== val.indexOf( NONE_OF_THESE_DISEASES ) && val.length > 1 ) {
                    return false;
                }

                return true;

            },

            _COPD_T_mandatory: function( val ) {
                var
                    actType = this.actType;

                if( 'COPD' === actType ) {
                    return validationLibrary._mandatory( val );
                }
                return true;
            },

            _COPD_T_mandatory_onFirst_4_0_0: function( val ) {
                var
                    isAfterQ42017 = Y.doccirrus.edmpcommonutils.isAfterQ( this, Y.doccirrus.edmpcommonutils.COPD_4_0_0_LAST_QUARTER ),
                    dmpType = this.dmpType,
                    actType = this.actType;

                if( isAfterQ42017 && 'COPD' === actType && 'FIRST' === dmpType ) {
                    return validationLibrary._mandatory( val );
                }
                return true;
            },

            _COPD_T_mandatory_4_0_0_smoker: function( val ) {
                var
                    isAfterQ42017 = Y.doccirrus.edmpcommonutils.isAfterQ( this, Y.doccirrus.edmpcommonutils.COPD_4_0_0_LAST_QUARTER ),
                    dmpSmoker = this.dmpSmoker,
                    actType = this.actType;

                if( isAfterQ42017 && 'COPD' === actType && 'YES' === dmpSmoker ) {
                    return validationLibrary._mandatory( val );
                }
                return true;
            },

            _COPD_T_dmpAttendedTobaccoRehabProgramSinceLastRecommendation: function( val ) {
                var
                    isAfterQ42017 = Y.doccirrus.edmpcommonutils.isAfterQ( this, Y.doccirrus.edmpcommonutils.COPD_4_0_0_LAST_QUARTER ),
                    dmpSmoker = this.dmpSmoker,
                    dmpType = this.dmpType,
                    actType = this.actType;

                if( isAfterQ42017 && 'COPD' === actType && 'YES' === dmpSmoker && 'FOLLOWING' === dmpType ) {
                    return validationLibrary._mandatory( val );
                }
                return true;
            },

            _COPD_T_dmpRecommendedPhysicalTraining: function( val ) {
                var
                    isAfterQ42017 = Y.doccirrus.edmpcommonutils.isAfterQ( this, Y.doccirrus.edmpcommonutils.COPD_4_0_0_LAST_QUARTER ),
                    actType = this.actType;

                if( isAfterQ42017 && 'COPD' === actType ) {
                    return validationLibrary._mandatory( val );
                }
                return true;
            },
            _COPD_T_mandatoryFollowing: function( val ) {
                var
                    actType = this.actType,
                    dmpType = this.dmpType;

                if( 'COPD' === actType ) {
                    if( 'FOLLOWING' === dmpType ) {
                        return validationLibrary._mandatory( val );
                    }
                }
                return true;
            },
            _COPD_T_NoExcludesOthers: function( val ) {
                var
                    actType = this.actType;

                if( 'COPD' === actType ) {
                    if( Array.isArray( val ) && val.length > 1 && val.indexOf( 'NO' ) > -1 ) {
                        return false;
                    }
                }
                return true;
            },
            _COPD_T_NoneExcludesOthers: function( val ) {
                var
                    actType = this.actType;

                if( 'COPD' === actType ) {
                    if( Array.isArray( val ) && val.length > 1 && val.indexOf( 'NONE' ) > -1 ) {
                        return false;
                    }
                }
                return true;
            },
            _COPD_T_NoneExcludesOthers_onFirst_4_0_0: function( val ) {
                var
                    isAfterQ42017 = Y.doccirrus.edmpcommonutils.isAfterQ( this, Y.doccirrus.edmpcommonutils.COPD_4_0_0_LAST_QUARTER ),
                    dmpType = this.dmpType,
                    actType = this.actType;

                if( isAfterQ42017 && 'COPD' === actType && 'FIRST' === dmpType ) {
                    if( Array.isArray( val ) && val.length > 1 && val.indexOf( 'NONE' ) > -1 ) {
                        return false;
                    }
                }
                return true;
            },
            _COPD_T_IfNecessaryChronicMedicationNoneContraindication: function( val ) {
                var
                    actType = this.actType;

                if( 'COPD' === actType ) {
                    if( Array.isArray( val ) && val.length ) {
                        if( val.indexOf( 'NONE' ) > -1 || val.indexOf( 'CONTRAINDICATION' ) > -1 ) {
                            if( val.indexOf( 'IF_NECESSARY' ) > -1 || val.indexOf( 'CHRONIC_MEDICATION' ) > -1 ) {
                                return false;
                            }
                        }
                    }
                }
                return true;
            },
            _COPD_T_dmpCurrentFev1: function( val ) {
                var
                    isAfterQ42017 = Y.doccirrus.edmpcommonutils.isAfterQ( this, Y.doccirrus.edmpcommonutils.COPD_4_0_0_LAST_QUARTER ),
                    actType = this.actType,
                    dmpCurrentFev1NotDone = this.dmpCurrentFev1NotDone;

                if( 'COPD' === actType ) {
                    if( !dmpCurrentFev1NotDone ) {
                        return validationLibrary._mandatory( val ) && (isAfterQ42017 ? validationLibrary._rangeNumber( val, 1.0, 299.9 ) : validationLibrary._rangeNumber( val, 0, 9.99 ));
                    }
                }
                return true;
            },
            _COPD_T_dmpCurrentFev1NotDone: function( val ) {
                var
                    actType = this.actType,
                    dmpCurrentFev1 = this.dmpCurrentFev1;

                if( 'COPD' === actType ) {
                    if( !dmpCurrentFev1 && !val ) {
                        return false;
                    }
                }
                return true;
            },
            _COPD_T_dmpClinicalAssessmentOfOsteoporosisRisk: function( val ) {
                var
                    isAfterQ42017 = Y.doccirrus.edmpcommonutils.isAfterQ( this, Y.doccirrus.edmpcommonutils.COPD_4_0_0_LAST_QUARTER ),
                    actType = this.actType;

                if( isAfterQ42017 && 'COPD' === actType ) {
                    return 1 === val.length;
                }
                return true;
            },
            _COPD_T_dmpFrequencyExacerbationsSinceLast: function( val ) {
                var
                    actType = this.actType,
                    dmpType = this.dmpType;

                if( 'COPD' === actType ) {
                    if( 'FOLLOWING' === dmpType ) {
                        return validationLibrary._num( val );
                    }
                }
                return true;
            },
            _COPD_T_dmpHadStationaryCopdTreatment: function( val ) {
                var
                    actType = this.actType,
                    dmpType = this.dmpType;

                if( 'COPD' === actType ) {
                    if( 'FOLLOWING' === dmpType ) {
                        return validationLibrary._num( val );
                    }
                }
                return true;
            },

            _SDDA_mandatory: function( val ) {
                return validationLibrary._mandatory( val ) ? true : DMP_BASE_T_MANDATORY_ERR;
            },

            _SDDA_IK_OR_UKV: function() {
                // MOJ-10620: Y.doccirrus.ruleutils.validate calls validators with KoViewModel as context
                function unwrap( val ) {
                    if( typeof val === 'function' ) {
                        val = val();
                    }
                    return val;
                }

                var orgianizationId = unwrap( this.orgianizationId ),
                    ukv = unwrap( this.ukv );

                if( (orgianizationId && orgianizationId.length === 9) || (ukv && ukv.length === 2) ) {
                    return true;
                }
                return DMP_BASE_T_IK_OR_UKV_ERR;
            },
            _SDDA_connect: function( val ) {
                if( val && !validationLibrary._email( val ) ) {
                    return DMP_BASE_T_EMAIL_ERR;
                }

                return true;
            },

            /**
             *  Check length of medications / findings string to be mapped into BFB form
             *  @private
             */
            _REFERRAL_single_line: function( txtLine ) {
                if( txtLine.length > REFERRAL_LINE_LENGTH ) {
                    return false;
                }
                return true;
            },

            /**
             *  Allow only one medication on kbv substitute prescription.
             *  @private
             */

            _Prescription_T_substitutePrescription: function( val ) {
                var kbvPrescriptions = ['PUBPRESCR', 'PRESCRBTM', 'PRESCRT'],
                    actType = this.actType,
                    activities = this.activities;

                if( val && kbvPrescriptions.indexOf( actType ) !== -1 && activities.length > 1 ) {
                    return false;
                }
                return true;
            },

            /**
             *  Check length of diagnosis string to be mapped into BFB form
             *  @private
             */

            _REFERRAL_double_line: function( txtLine ) {
                if( txtLine.length > (REFERRAL_LINE_LENGTH * 2) ) {
                    return false;
                }
                return true;
            },

            /**
             *  Check length of auftrag string to be mapped into BFB form
             *  @private
             */

            _REFERRAL_quadruple_line: function( txtLine ) {
                if( txtLine.length > (REFERRAL_LINE_LENGTH * 4) ) {
                    return false;
                }
                return true;
            },

            /**
             *  Check if utility is selected which is not allowed for group therapies
             *  @private
             */

            _KBVUTILITY_utGroupTherapy: function( val ) {
                var
                    actType = this.actType,
                    utPrescriptionType = this.utPrescriptionType,
                    utRemedy1List = this.utRemedy1List,
                    utRemedy2List = this.utRemedy2List,
                    isNotAllowed = false,
                    notAllowed = [
                        'D1-standardisierte Heilmittelkombination',
                        'Elektrotherapie',
                        'Elektrostimulation',
                        'Wärmetherapie mittels Ultraschall'
                    ],
                    utTypes = [
                        'vorrangiges_heilmittel_liste',
                        'optionales_heilmittel_liste'
                    ],
                    allUtilities;

                if( 'KBVUTILITY' !== actType || !val || 'NO_NORMAL_CASE' === utPrescriptionType ) {
                    return true;
                }
                allUtilities = utRemedy1List.concat( utRemedy2List );
                // first check group therapy is allowed for all selected "Heilmittel"
                isNotAllowed = allUtilities.some( function( utEntry ) {
                    return -1 !== notAllowed.indexOf( utEntry.name );
                } );
                if( isNotAllowed ) {
                    return false;
                }
                if( !allUtilities.length ) {
                    return true;
                }
                // second check "vorranige" and "optionale" "Heilmittel" groupTherapy flag
                return allUtilities.filter( function( utEntry ) {
                    return -1 !== utTypes.indexOf( utEntry.type );
                } ).some( function( utEntry ) {
                    return utEntry.groupTherapyAble === true;
                } );
            },

            /**
             *  If prescription type is not normal then chapter PODO is not allowed
             *  @private
             */

            _KBVUTILITY_utPrescriptionType: function( val ) {
                var
                    actType = this.actType,
                    u_extra = this.u_extra,
                    isPODOChapter, isETChapter;

                if( 'KBVUTILITY' !== actType || !u_extra ) {
                    return true;
                }

                isPODOChapter = isPodoIndication( u_extra );
                isETChapter = isETIndication( u_extra );

                if( (isPODOChapter || isETChapter) && 'NO_NORMAL_CASE' === val ) {
                    return false;
                }

                return true;
            },

            /**
             *  Checks that utLatestStartOfTreatment is before timestamp
             *  @private
             */

            _KBVUTILITY_utLatestStartOfTreatment: function( val ) {
                var
                    mom = validationLibrary.getMoment(),
                    timestamp = this.timestamp,
                    actType = this.actType;

                if( 'KBVUTILITY' !== actType || !timestamp || !val ) {
                    return true;
                }

                return mom( timestamp ).isBefore( val );
            },

            /**
             *  Checks that utLatestStartOfTreatment is before timestamp
             *  @private
             */

            _KBVUTILITY_utMedicalJustification: function( val ) {
                var
                    utPrescriptionType = this.utPrescriptionType,
                    actType = this.actType;

                if( 'KBVUTILITY' !== actType || 'NO_NORMAL_CASE' !== utPrescriptionType ) {
                    return true;
                }
                return validationLibrary._mandatory( val );
            },

            /**
             *  Checks that utLatestStartOfTreatment is before timestamp
             *  @private
             */

            _KBVUTILITY_subType: function( val ) {
                var
                    actType = this.actType;

                if( 'KBVUTILITY' !== actType ) {
                    return true;
                }
                return validationLibrary._mandatory( val );
            },

            /**
             *  utIndicationCode mandatory check
             *  @private
             */

            _KBVUTILITY_utIndicationCode: function( val ) {
                var
                    actType = this.actType;

                if( 'KBVUTILITY' !== actType ) {
                    return true;
                }
                return validationLibrary._mandatory( val );
            },

            /**
             *  utIcdCode mandatory check
             *  @private
             */

            _KBVUTILITY_utIcdCode: function( val ) {
                var
                    actType = this.actType;

                if( 'KBVUTILITY' !== actType ) {
                    return true;
                }
                return validationLibrary._mandatory( val );
            },
            _KBVUTILITY_utRemedy1List: function() {
                var
                    actType = this.actType,
                    utRemedy1List = this.utRemedy1List,
                    utRemedy1Seasons = this.utRemedy1Seasons,
                    sumSeasons = 0;

                if( 'KBVUTILITY' !== actType || !utRemedy1Seasons ) {
                    return true;
                }

                utRemedy1List.forEach( function( utility ) {
                    if( utility.seasons ) {
                        sumSeasons += +utility.seasons;
                    }
                } );
                return utRemedy1Seasons >= sumSeasons;
            },
            _KBVUTILITY_utRemedy2List: function() {
                var
                    actType = this.actType,
                    utRemedy2List = this.utRemedy2List,
                    utRemedy2Seasons = this.utRemedy2Seasons,
                    sumSeasons = 0;

                if( 'KBVUTILITY' !== actType || !utRemedy2Seasons ) {
                    return true;
                }

                utRemedy2List.forEach( function( utility ) {
                    if( utility.seasons ) {
                        sumSeasons += +utility.seasons;
                    }
                } );
                return utRemedy2Seasons >= sumSeasons;
            },
            _KBVUTILITY_utRemedySeasons: function( val ) {
                var
                    actType = this.actType,
                    utPrescriptionType = this.utPrescriptionType,
                    u_extra = this.u_extra,
                    verordnungsmenge = u_extra && u_extra.entry && u_extra.entry.heilmittelverordnung && u_extra.entry.heilmittelverordnung.verordnungsmenge;

                if( 'KBVUTILITY' !== actType ) {
                    return true;
                }

                if( val && 'FIRST' === utPrescriptionType && verordnungsmenge.erstverordnungsmenge ) {
                    return +verordnungsmenge.erstverordnungsmenge >= +val;
                } else if( val && 'FOLLOWING' === utPrescriptionType && verordnungsmenge.folgeverordnungsmenge ) {
                    return +verordnungsmenge.folgeverordnungsmenge >= +val;
                }

                return true;
            },
            // P3-11 for SAS and CF "verordnungsmenge" is mandatory
            _KBVUTILITY_utRemedySeasons_ET: function( val ) {
                var
                    actType = this.actType,
                    subType = this.subType;

                if( 'KBVUTILITY' !== actType || 'ET' !== subType ) {
                    return true;
                }
                return validationLibrary._mandatory( val );
            },
            // Seasons of "vorraninges" or "optionales" kbvutility >= Seasons of "ergänzendes"
            _KBVUTILITY_utRemedySeasons_2: function() {
                var
                    actType = this.actType,
                    utRemedy1List = this.utRemedy1List,
                    utRemedy2List = this.utRemedy2List,
                    utRemedy1Seasons = this.utRemedy1Seasons,
                    utRemedy2Seasons = this.utRemedy2Seasons,
                    list1Type, list2Type;

                if( 'KBVUTILITY' !== actType || !utRemedy1List || !utRemedy1List.length || !utRemedy2List || !utRemedy2List.length || !utRemedy1Seasons || !utRemedy2Seasons ) {
                    return true;
                }

                list1Type = utRemedy1List[0].type;
                list2Type = utRemedy2List[0].type;

                if( -1 !== ['vorrangiges_heilmittel_liste', 'optionales_heilmittel_liste'].indexOf( list1Type ) && 'ergaenzendes_heilmittel_liste' === list2Type ) {
                    return +utRemedy1Seasons >= +utRemedy2Seasons;
                }
                return true;
            },
            // P3-31
            _KBVUTILITY_utRemedySeasons_3: function() {
                var
                    actType = this.actType,
                    utIndicationCode = this.utIndicationCode,
                    utRemedy1List = this.utRemedy1List,
                    utRemedy2List = this.utRemedy2List,
                    utRemedy1Seasons = this.utRemedy1Seasons,
                    utRemedy2Seasons = this.utRemedy2Seasons,
                    additionalUts = ['Sensomotorisch-perz. Beh.', 'Sensomotorisch-perz. Beh. + ergoth. Schiene/n', 'Motorisch-funkt. Beh.', 'Motorisch-funkt. Beh. + ergoth. Schiene/n', 'Sensomotorisch-perzeptive Behandlung', 'Sensomotorisch-perzeptive Behandlung  + ergotherapeutische Schiene/n', 'Motorisch-funktionelle Behandlung + ergotherapeutische Schiene/n', 'Motorisch-funktionelle Behandlung'], // TODOOO duplicate: make some helpers
                    list1SumOfAdditionalUts = 0;

                if( 'KBVUTILITY' !== actType || !utRemedy1List || !utRemedy1List.length || !utRemedy2List || !utRemedy2List.length ||
                    !utRemedy1Seasons || !utRemedy2Seasons || -1 === ['EN1', 'EN2'].indexOf( utIndicationCode ) ||
                    !utRemedy2List[0] || 'Thermische Anwendungen' !== utRemedy2List[0].name ) {
                    return true;
                }

                utRemedy1List.forEach( function( ut ) {
                    if( -1 !== additionalUts.indexOf( ut.name ) && (0 === ut.seasons || ut.seasons) ) {
                        list1SumOfAdditionalUts += +ut.seasons;
                    }
                } );

                return list1SumOfAdditionalUts >= +utRemedy2Seasons;
            },

            _KBVUtilityPrices_price: function() {
                var insuranceType = this.insuranceType;
                if( Y.doccirrus.schemas.patient.isPublicInsurance( {type: insuranceType} ) ) {
                    return true;
                }
                return validationLibrary._validNumber.apply( this, arguments );
            },

            _KBVUtilityPrices_prices: function() {
                var insuranceType = this.insuranceType;
                if( !Y.doccirrus.schemas.patient.isPublicInsurance( {type: insuranceType} ) ) {
                    return true;
                }
                return validationLibrary._notEmptyArray.apply( this, arguments );
            },

            /**
             *  KBV Fehlerbrief, section 5.2, BFB61 checkboxes for mobility MOJ-7769
             *
             *  @param val
             *  @return {boolean}
             *  @private
             */

            _KBV_BFB61_mobilityOther: function() {
                if(
                    (this.mobilityOtherCheck && '' !== this.mobilityOtherCheck) &&
                    (!this.mobilityOtherString || '' === this.mobilityOtherString)
                ) {
                    return false;
                }

                return true;
            },

            _KBVUTILITY2_ut2PatientSpecificConductionSymptomsFreeText: function( val ) {
                if( this.ut2PatientSpecificConductionSymptoms ) {
                    return validationLibrary._mandatory( val );
                }
                return true;
            },

            _KBVUTILITY2_ut2TherapyFrequencyMandatory: function( val ) {
                if( this.ut2BlankRegulation && !this.ut2BlankRegulationIgnored ) {
                    return true;
                }
                if( this.ut2Chapter !== 'ET' ) {
                    return validationLibrary._mandatory( val );
                }
                return true;
            },

            _KBVUTILITY2_ut2TherapyFrequencyMaxDecimals: function( val ) {
                if( this.ut2BlankRegulation && !this.ut2BlankRegulationIgnored ) {
                    return true;
                }
                if( val ) {
                    return Y.doccirrus.commonutils.countDecimals( val ) <= 1;
                }
                return true;
            },

            _KBVUTILITY2_ut2TherapyFrequencyMax: function( val ) {
                if( this.ut2BlankRegulation && !this.ut2BlankRegulationIgnored ) {
                    return true;
                }
                if( val ) {
                    return validationLibrary._mandatory( this.ut2TherapyFrequencyMin );
                }
                return true;
            },

            _KBVUTILITY2__T_ut2RemedyLists: function() {
                if( this.ut2BlankRegulation && !this.ut2BlankRegulationIgnored ) {
                    return true;
                }
                if( !this.ut2Remedy1List || !this.ut2Remedy2List ) {
                    return true;
                }
                return Y.doccirrus.schemas.v_kbvutility2.validateRemedyLists( this );
            },

            _KBVUtility2Approval_T_approvalValidTo: function() {
                return this.approvalValidTo || this.unlimitedApproval;
            },

            _MedicationPlanEntries_T_freeText: function( val ) {
                if( this.type === 'FREETEXT' ) {
                    return validationLibrary._mandatory( val ) && (!val || val && val.length <= 200);
                }
                return true;
            },

            _MedicationPlanEntries_T_phNLabel: function _Medication_T_phNLabel( val ) {
                if( 'MEDICATION' === this.type ) {
                    return validationLibrary._mandatory( val ) || this.phIngr.length;
                }
                return true;
            },

            _MedicationPlanEntries_T_bindText: function( val ) {
                if( this.type === 'BINDTEXT' ) {
                    return validationLibrary._mandatory( val ) && (!val || val && val.length <= 200);
                }
                return true;
            },

            _MedicationPlanEntries_T_medicationRecipeText: function( val ) {
                if( this.type === 'MEDICATION_RECIPE' ) {
                    return validationLibrary._mandatory( val ) && (!val || val && val.length <= 200);
                }
                return true;
            },

            _MedicationPlanEntries_T_subHeadingText: function( val ) {
                if( this.type === 'SUB_HEADING' ) {
                    return validationLibrary._mandatory( val ) && (!val || val && val.length <= 50);
                }
                return true;
            },

            _LabRequest_T_befEiltNr: function( val ) {
                if( this.befEiltTelBool || this.befEiltFaxBool ) {
                    return validationLibrary._mandatory( val );
                }
                return true;
            }
        };

        DCValidationsKBV.prototype.constructor = DCValidationsKBV;

        // organizing the namespace by detail (validations) SHOULD be a temporary solution
        // in the long term the domain (KBV) SHOULD always at the top. But as long as we don't
        // have a registry for schema related concepts we abuse the namespace for this like we
        // do for schemas itself
        Y.namespace( 'doccirrus.validations' ).kbv = validationLibraryKbv = new DCValidationsKBV();

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'dcvalidations',
            'dckbvdate',
            'dcregexp',
            'kbvutilitycatalogcommonutils',
            'dckbvutils',
            'validator-factory',
            'dcregexp'
        ]
    }
);

