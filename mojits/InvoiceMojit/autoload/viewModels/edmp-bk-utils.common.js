/**
 * User: oliversieweke
 * Date: 17.09.18  15:33
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI, _*/

// ================================================================================================================== \\
// ==================================================== BK UTILS ==================================================== \\
// This file describes the objects:
//      • BK_SECTION_STRUCTURE
//      • BK_FIELD_VISIBILITY_MAP

// Those objects determine the conditions under which sections and fields are visible (front-end) and should be included
// into the XML file to be built (back-end)
// Please check the wiki for a comprehensive guide on updating and making changes to eDMP Brustkrebs.

YUI.add( 'edmp-bk-utils', function( Y /*NAME*/ ) {
    var lodash = Y.doccirrus.commonutils.isClientSide() ? _ : require( 'lodash' );
    var validationLibrary = Y.doccirrus.validations.common;
    var isRelevant = Y.doccirrus.edmpcommonutils.dmpActivityIsRelevant;
    var ObjectAssign =  Y.doccirrus.commonutils.isClientSide() ? _.assign : Object.assign;

// ================================================================================================================== \\
// =============================================== SECTION STRUCTURE ================================================ \\
    var BK_SECTION_STRUCTURE = Object.create( null );

    ObjectAssign( BK_SECTION_STRUCTURE, {
        registration: {
            subFields: [
                "dmpInitialManifestationOfPrimaryTumor",
                "dmpManifestationOfContralateralBreastCancer",
                "dmpLocoregionalRecurrence",
                "dmpFirstConfirmationOfRemoteMetastases"
            ]
        },
        registrationFor: {
            subFields: [
                "dmpRegistrationFor"
            ]
        },
        anamnesisAndTreatmentStatus: {
            subFields: [
                "dmpAffectedBreast",
                "dmpCurrentTreatmentStatus",
                "dmpPerformedSurgicalTherapy",
                "dmpPerformedSurgicalTherapy_4_23"
            ]
        },
        currentFindings: {
            subFields: [
                "dmpPreoperativeNeoadjuvantTherapy",
                "dmpPT",
                "dmpPN",
                "dmpM",
                "dmpGrading",
                "dmpResection",
                "dmpImmunohistochemicalHormoneReceptor",
                "dmpHER2Neu",
                "dmpTnmClassification_4_23",
                "dmpPT_4_23",
                "dmpPN_4_23",
                "dmpM",
                "dmpImmunohistochemicalHormoneReceptor_4_23"
            ]
        },
        treatmentOfPrimaryAndContralateral: {
            dmpTypes: ["FIRST", "PNP"],
            subFields: [
                "dmpRadiotherapy",
                "dmpChemotherapy",
                "dmpEndocrineTherapy",
                "dmpAntibodyTherapy",
                "dmpCurrentAdjuvantEndocrineTherapy_4_23",
                "dmpSideEffectsOfCurrentAdjuvantEndocrineTherapy_4_23",
                "dmpContinuationOfCurrentEndocrineTherapy_4_23",
                "dmpDxaFindings_4_23"
            ]
        },
        findingsAndTherapyOfRemoteMetastases: {
            dmpTypes: ["FIRST", "PNP"],
            subFields: [
                "dmpLocalisation",
                "dmpOngoingOrCompletedTherapy_remoteMetastases",
                "dmpBisphosphonateTherapy",
                "dmpLocalisation_4_23",
                "dmpDenosumab_4_23"
            ]
        },
        treatmentStatusOfPrimaryAndContralateral: {
            dmpTypes: ["FOLLOWING"],
            subFields: [
                "dmpRadiotherapy",
                "dmpChemotherapy",
                "dmpEndocrineTherapy",
                "dmpAntibodyTherapy",
                "dmpCurrentAdjuvantEndocrineTherapy_4_23",
                "dmpSideEffectsOfCurrentAdjuvantEndocrineTherapy_4_23",
                "dmpContinuationOfCurrentEndocrineTherapy_4_23",
                "dmpDxaFindings_4_23"
            ]
        },
        eventsSinceLastDocumentation: {
            dmpTypes: ["FOLLOWING"],
            subFields: [
                "dmpManifestationOfLocoregionalRecurrence_following_date",
                "dmpManifestationOfLocoregionalRecurrence_following_text",
                "dmpManifestationOfContralateralBreastCancer_following_date",
                "dmpManifestationOfContralateralBreastCancer_following_text",
                "dmpManifestationOfRemoteMetastases_following_date",
                "dmpManifestationOfRemoteMetastases_following_text",
                "dmpManifestationOfRemoteMetastases_following_text_4_23",
                "dmpSymptomaticLymphedema_4_23"
            ]
        },
        otherFindings: {
            subFields: [
                "dmpLymphedemaPresent",
                "dmpPlannedDateForNextDocumentation",
                "dmpSymptomaticLymphedema_4_23",
                "dmpRegularPhysicalTrainingRecommended_4_23",
                "dmpConditionAfterParticularlyCardiotoxicTumorTherapy_4_23",
                "dmpHeight",
                "dmpWeight",
                "dmpLymphedema_following"
            ]
        },
        treatmentOfAdvancedDisease: {
            dmpTypes: ["FOLLOWING"],
            subFields: [
                "dmpCurrentTreatmentStatus",
                "dmpOngoingOrCompletedTherapy_locoregionalRecurrence",
                "dmpOngoingOrCompletedTherapy_remoteMetastases",
                "dmpBisphosphonateTherapy_following",
                "dmpBisphosphonateTherapy",
                "dmpDenosumab_4_23"
            ]
        },
        otherSection: {
            subFields: [
                "dmpPlannedDateForNextDocumentation"
            ]
        }
    });

// ================================================================================================================== \\
// ================================================ FIELD VISIBILITY ================================================ \\
    var BK_FIELD_VISIBILITY_MAP = Object.create( null );

    ObjectAssign( BK_FIELD_VISIBILITY_MAP, {
    // Registration ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
        dmpInitialManifestationOfPrimaryTumor: {
            dependencies: ["dmpType"],
            visible: BK_T_registrationDatesVisible
        },
        dmpManifestationOfContralateralBreastCancer: {
            dependencies: ["dmpType"],
            visible: BK_T_registrationDatesVisible
        },
        dmpLocoregionalRecurrence: {
            dependencies: ["dmpType"],
            visible: BK_T_registrationDatesVisible
        },
        dmpFirstConfirmationOfRemoteMetastases: {
            dependencies: ["dmpType"],
            visible: BK_T_registrationDatesVisible
        },
    // Registration For ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
        dmpRegistrationFor: {
            dependencies: ["dmpType"],
            visible: function dmpRegistrationForVisible( activity ) {
                return visibleIf( ["FOLLOWING"], ["4.21", "4.23"] )( activity );
            }
        },
    // Anamnesis And Treatment Status ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
        dmpPerformedSurgicalTherapy_4_23: {
            dependencies: ["dmpType", "dmpQuarter", "dmpYear", "dmpInitialManifestationOfPrimaryTumor", "dmpManifestationOfContralateralBreastCancer", "dmpLocoregionalRecurrence", "dmpFirstConfirmationOfRemoteMetastases"],
            visible: _BK_T_dmpPerformedSurgicalTherapy_4_23Visible
        },
    // Current Findings ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
        dmpTnmClassification_4_23: {
            dependencies: ["dmpType", "dmpQuarter", "dmpYear", "dmpPerformedSurgicalTherapy_4_23", "dmpInitialManifestationOfPrimaryTumor", "dmpManifestationOfContralateralBreastCancer", "dmpLocoregionalRecurrence", "dmpFirstConfirmationOfRemoteMetastases"],
            visible: BK_T_dmpTnmClassification_4_23Visible
        },
        dmpPT_4_23: {
            dependencies: ["dmpType", "dmpQuarter", "dmpYear", "dmpPerformedSurgicalTherapy_4_23", "dmpInitialManifestationOfPrimaryTumor", "dmpManifestationOfContralateralBreastCancer", "dmpLocoregionalRecurrence", "dmpFirstConfirmationOfRemoteMetastases"],
            visible: BK_T_dmpPTNM_4_23Visible,
            optional: BK_T_dmpPTNM_4_23Optional
        },
        dmpPN_4_23: {
            dependencies: ["dmpType", "dmpQuarter", "dmpYear", "dmpPerformedSurgicalTherapy_4_23", "dmpInitialManifestationOfPrimaryTumor", "dmpManifestationOfContralateralBreastCancer", "dmpLocoregionalRecurrence", "dmpFirstConfirmationOfRemoteMetastases"],
            visible: BK_T_dmpPTNM_4_23Visible,
            optional: BK_T_dmpPTNM_4_23Optional
        },
        dmpM_4_23: {
            dependencies: ["dmpType", "dmpQuarter", "dmpYear", "dmpPerformedSurgicalTherapy_4_23", "dmpInitialManifestationOfPrimaryTumor", "dmpManifestationOfContralateralBreastCancer", "dmpLocoregionalRecurrence", "dmpFirstConfirmationOfRemoteMetastases"],
            visible: BK_T_dmpPTNM_4_23Visible,
            optional: BK_T_dmpPTNM_4_23Optional
        },
        dmpImmunohistochemicalHormoneReceptor_4_23: {
            dependencies: ["dmpType", "dmpQuarter", "dmpYear", "dmpPerformedSurgicalTherapy_4_23", "dmpM_4_23", "dmpInitialManifestationOfPrimaryTumor", "dmpManifestationOfContralateralBreastCancer", "dmpLocoregionalRecurrence", "dmpFirstConfirmationOfRemoteMetastases"],
            visible: BK_T_dmpImmunohistochemicalHormoneReceptor_4_23Visible,
            optional: BK_T_dmpImmunohistochemicalHormoneReceptor_4_23Optional
        },
    // Treatment (Status) Of Primary And Contralateral  ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
        dmpCurrentAdjuvantEndocrineTherapy_4_23: {
            dependencies: ["dmpType", "dmpQuarter", "dmpYear", "dmpImmunohistochemicalHormoneReceptor_4_23", "dmpRegistrationFor", "dmpM_4_23", "dmpInitialManifestationOfPrimaryTumor", "dmpManifestationOfContralateralBreastCancer", "dmpLocoregionalRecurrence", "dmpFirstConfirmationOfRemoteMetastases"],
            visible: BK_T_dmpCurrentAndContinuationOfEndocrineTherapy_4_23Visible,
            optional: BK_T_dmpCurrentAndContinuationOfEndocrineTherapy_4_23Optional
        },
        dmpSideEffectsOfCurrentAdjuvantEndocrineTherapy_4_23: {
            dependencies: ["dmpType", "dmpQuarter", "dmpYear", "dmpCurrentAdjuvantEndocrineTherapy_4_23", "dmpRegistrationFor", "dmpImmunohistochemicalHormoneReceptor_4_23", "dmpM_4_23", "dmpInitialManifestationOfPrimaryTumor", "dmpManifestationOfContralateralBreastCancer", "dmpLocoregionalRecurrence", "dmpFirstConfirmationOfRemoteMetastases"],
            visible: BK_T_dmpSideEffectsOfCurrentAdjuvantEndocrineTherapy_4_23Visible,
            optional: BK_T_visibleIfPnp_4_23
        },
        dmpContinuationOfCurrentEndocrineTherapy_4_23: {
            dependencies: ["dmpType", "dmpQuarter", "dmpYear", "dmpImmunohistochemicalHormoneReceptor_4_23", "dmpRegistrationFor", "dmpM_4_23", "dmpInitialManifestationOfPrimaryTumor", "dmpManifestationOfContralateralBreastCancer", "dmpLocoregionalRecurrence", "dmpFirstConfirmationOfRemoteMetastases"],
            visible: BK_T_dmpCurrentAndContinuationOfEndocrineTherapy_4_23Visible,
            optional: BK_T_dmpCurrentAndContinuationOfEndocrineTherapy_4_23Optional
        },
        dmpDxaFindings_4_23: {
            dependencies: ["dmpType", "dmpQuarter", "dmpYear", "dmpCurrentAdjuvantEndocrineTherapy_4_23", "dmpRegistrationFor", "dmpImmunohistochemicalHormoneReceptor_4_23", "dmpM_4_23", "dmpInitialManifestationOfPrimaryTumor", "dmpManifestationOfContralateralBreastCancer", "dmpLocoregionalRecurrence", "dmpFirstConfirmationOfRemoteMetastases"],
            visible: BK_T_dmpDxaFindings_4_23Visible,
            optional: BK_T_visibleIfPnp_4_23
        },
    // Findings And Therapy of Remote Metastases | Treatment of Advanced Disease •••••••••••••••••••••••••••••••••••••••
        dmpBisphosphonateTherapy: {
            dependencies: ["dmpType", "dmpQuarter", "dmpYear", "dmpLocalisation", "dmpLocalisation_4_23", "dmpManifestationOfRemoteMetastases_following_text_4_23", "dmpInitialManifestationOfPrimaryTumor", "dmpManifestationOfContralateralBreastCancer", "dmpLocoregionalRecurrence", "dmpFirstConfirmationOfRemoteMetastases"],
            visible: BK_T_dmpBisphosphonateTherapyVisible,
            optional: BK_T_dmpBisphosphonateTherapyOptional
        },
        dmpDenosumab_4_23: {
            dependencies: ["dmpType", "dmpQuarter", "dmpYear", "dmpLocalisation_4_23", "dmpManifestationOfRemoteMetastases_following_text_4_23", "dmpInitialManifestationOfPrimaryTumor", "dmpManifestationOfContralateralBreastCancer", "dmpLocoregionalRecurrence", "dmpFirstConfirmationOfRemoteMetastases"],
            visible: BK_T_Denosumab_4_23Visible,
            optional: BK_T_Denosumab_4_23Optional
        },
    // Findings And Therapy of Remote Metastases •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
        dmpLocalisation_4_23: {
            dependencies: ["dmpType", "dmpQuarter", "dmpYear", "dmpInitialManifestationOfPrimaryTumor", "dmpManifestationOfContralateralBreastCancer", "dmpLocoregionalRecurrence", "dmpFirstConfirmationOfRemoteMetastases"],
            visible: BK_T_dmpLocalisation_4_23Visible,
            optional: BK_T_dmpLocalisation_4_23Optional
        },
    // Other Findings | Events Since Last Documentation ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
        dmpSymptomaticLymphedema_4_23: {
            dependencies: ["dmpType", "dmpQuarter", "dmpYear"],
            visible: BK_T_visibleIfFirstOrFollowing_4_23,
            optional: BK_T_visibleIfPnp_4_23
        },
    // Events Since Last Documentation •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
        dmpManifestationOfLocoregionalRecurrence_following: {
            dependencies: ["dmpType"],
            visible: BK_T_visibleIfFollowing
        },
        dmpManifestationOfContralateralBreastCancer_following: {
            dependencies: ["dmpType"],
            visible: BK_T_visibleIfFollowing
        },
        dmpManifestationOfRemoteMetastases_following_4_23: {
            dependencies: ["dmpType", "dmpQuarter", "dmpYear"],
            visible: BK_T_visibleIfFollowing_4_23
        },
        dmpBiopticConfirmationOfVisceralMetastases_4_23: {
            dependencies: ["dmpType", "dmpQuarter", "dmpYear", "dmpManifestationOfRemoteMetastases_following_text_4_23"],
            visible: BK_T_dmpBiopticConfirmationOfVisceralMetastases_4_23Visible
        },
    // Other Findings ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
        dmpRegularPhysicalTrainingRecommended_4_23: {
            dependencies: ["dmpType", "dmpQuarter", "dmpYear"],
            visible: BK_T_visibleIfFirstOrFollowing_4_23,
            optional: BK_T_visibleIfPnp_4_23
        },
        dmpConditionAfterParticularlyCardiotoxicTumorTherapy_4_23: {
            dependencies: ["dmpType", "dmpQuarter", "dmpYear"],
            visible: BK_T_visibleIfFirstOrFollowing_4_23,
            optional: BK_T_visibleIfPnp_4_23
        },
        dmpHeight: {
            dependencies: ["dmpType", "dmpQuarter", "dmpYear"],
            visible: BK_T_visibleIfFirstOrFollowing_4_23,
            optional: BK_T_visibleIfPnp_4_23
        },
        dmpWeight: {
            dependencies: ["dmpType", "dmpQuarter", "dmpYear"],
            visible: BK_T_visibleIfFirstOrFollowing_4_23,
            optional: BK_T_visibleIfPnp_4_23
        }
    } );


// VISIBILITY CONDITIONS - Helpers -------------------------------------------------------------------------------------
    function visibleIf( dmpTypes, versions, actTypes ) {
        return function _BK_T_visible_partial( activity ) {
            return isRelevant( activity, {dmpTypes: dmpTypes, versions: versions, actTypes: actTypes} );
        };
    }
    function visibleIfField( field ) {
        return function visibleIfField_partial( dmpTypes, versions, actTypes ) {
            return function visibleIfField_partial( activity ) {
                return visibleIf( dmpTypes, versions, actTypes )( activity ) && validationLibrary._mandatory( activity[field] );
            };
        };
    }
    function visibleIfNotField( field ) {
        return function visibleIfNotField_partial( dmpTypes, versions, actTypes ) {
            return function visibleIfField_partial( activity ) {
                return visibleIf( dmpTypes, versions, actTypes )( activity ) && !validationLibrary._mandatory( activity[field] );
            };
        };
    }
    function dmpBkFieldIsHidden( activity, field ) {
        if (!field) { return false; }

        var optional = BK_FIELD_VISIBILITY_MAP[field]&& BK_FIELD_VISIBILITY_MAP[field].optional;
        var visible = BK_FIELD_VISIBILITY_MAP[field] && BK_FIELD_VISIBILITY_MAP[field].visible;

        var isVisible = visible && visible( activity );
        var isOptionalAndVisible = optional && optional( activity ) && activity.dmpShowOptionalFields;

        return !isVisible && !isOptionalAndVisible;
    }

// VISIBILITY CONDITIONS - Registration ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
    function BK_T_registrationDatesVisible( activity ) {
        return visibleIf( ["FIRST"], ["4.21", "4.23"] )( activity );
    }
// VISIBILITY CONDITIONS 0 Anamnesis And Treatment Status ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
    function _BK_T_dmpPerformedSurgicalTherapy_4_23Visible( activity ) {
        var primary = activity.dmpInitialManifestationOfPrimaryTumor;
        var contralateral = activity.dmpManifestationOfContralateralBreastCancer;
        var locoregional = activity.dmpLocoregionalRecurrence;
        var remote = activity.dmpFirstConfirmationOfRemoteMetastases;

        var primaryOrContralateral = primary || contralateral;
        var locoregionalOrRemote = locoregional || remote;

        var visible_FST = visibleIf( ["FIRST"], ["4.23"] )( activity ) && primaryOrContralateral && !locoregionalOrRemote;
        var visible_PNP = visibleIf( ["PNP"], ["4.23"] )( activity );

        return visible_FST || visible_PNP;
    }
// VISIBILITY CONDITIONS - Current Findings ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
    function BK_T_dmpTnmClassification_4_23Visible( activity ) {
        var surgicalTherapyVisible = BK_FIELD_VISIBILITY_MAP.dmpPerformedSurgicalTherapy_4_23.visible( activity );
        var visible_FST = visibleIfField( "dmpPerformedSurgicalTherapy_4_23" )( ["FIRST"], ["4.23"] )( activity ) && surgicalTherapyVisible;
        var visible_PNP = visibleIf( ["PNP"], ["4.23"] )( activity );

        return visible_FST || visible_PNP;
    }
    function BK_T_dmpPTNM_4_23Visible( activity ) {
        var surgicalTherapyVisible = BK_FIELD_VISIBILITY_MAP.dmpPerformedSurgicalTherapy_4_23.visible( activity );
        var visible_FST = visibleIfField( "dmpPerformedSurgicalTherapy_4_23" )( ["FIRST"], ["4.23"] )( activity ) && surgicalTherapyVisible;
        var visible_PNP = visibleIf( ["PNP"], ["4.23"] )( activity );

        return visible_FST || visible_PNP;
    }
    function BK_T_dmpPTNM_4_23Optional( activity ) {
        return visibleIfNotField( "dmpPerformedSurgicalTherapy_4_23" )( ["FIRST"], ["4.23"] )( activity );
    }
    function BK_T_dmpImmunohistochemicalHormoneReceptor_4_23Visible( activity ) {
        var surgicalTherapyVisible = BK_FIELD_VISIBILITY_MAP.dmpPerformedSurgicalTherapy_4_23.visible( activity );
        var visible_FST = visibleIfField( "dmpPerformedSurgicalTherapy_4_23" )( ["FIRST"], ["4.23"] )( activity ) && activity.dmpM_4_23 === "ZERO" && surgicalTherapyVisible;
        var visible_PNP = visibleIf( ["PNP"], ["4.23"] )( activity ) && activity.dmpM_4_23 === "ZERO";

        return visible_FST || visible_PNP;
    }
    function BK_T_dmpImmunohistochemicalHormoneReceptor_4_23Optional( activity ) {
        var visible_FST =visibleIf( ["FIRST"], ["4.23"] )( activity ) && activity.dmpM_4_23 !== "ONE";
        var visible_PNP = visibleIf( ["PNP"], ["4.23"] )( activity ) && !activity.dmpM_4_23;

        return visible_FST || visible_PNP;
    }
// VISIBILITY CONDITIONS - Treatment (Status) Of Primary And Contralateral •••••••••••••••••••••••••••••••••••••••••••••
    function BK_T_dmpCurrentAndContinuationOfEndocrineTherapy_4_23Visible( activity ) {
        var immunohistochemicalReceptorVisible = BK_FIELD_VISIBILITY_MAP.dmpImmunohistochemicalHormoneReceptor_4_23.visible( activity );
        var visible_FST = visibleIf( ["FIRST"], ["4.23"] )( activity ) && activity.dmpImmunohistochemicalHormoneReceptor_4_23 === "POSITIVE" && immunohistochemicalReceptorVisible;
        var visible_FLW = visibleIf( ["FOLLOWING"], ["4.23"] )( activity ) && validationLibrary.includesSome( activity.dmpRegistrationFor, ["PRIMARY_TUMOR", "CONTRALATERAL_BREAST_CANCER"] );

       return visible_FST || visible_FLW;
    }
    function BK_T_dmpCurrentAndContinuationOfEndocrineTherapy_4_23Optional( activity ) {
        var visible_FST = visibleIf( ["FIRST"], ["4.23"] )( activity ) && activity.dmpImmunohistochemicalHormoneReceptor_4_23 === "UNKNOWN";
        var visible_PNP = visibleIf( ["PNP"], ["4.23"] )( activity );

        return visible_FST || visible_PNP;
    }
    function BK_T_dmpSideEffectsOfCurrentAdjuvantEndocrineTherapy_4_23Visible( activity ) {
        var currentAdjuvantEndocrineTherapyVisible = BK_FIELD_VISIBILITY_MAP.dmpCurrentAdjuvantEndocrineTherapy_4_23.visible( activity );
        return visibleIf( ["FIRST", "FOLLOWING"], ["4.23"] )( activity ) && validationLibrary.includesSome( activity.dmpCurrentAdjuvantEndocrineTherapy_4_23, ["AROMATASE_INHIBITORS", "TAMOXIFEN", "OTHER"] ) && currentAdjuvantEndocrineTherapyVisible;
    }
    function BK_T_dmpDxaFindings_4_23Visible( activity ) {
        var currentAdjuvantEndocrineTherapyVisible = BK_FIELD_VISIBILITY_MAP.dmpCurrentAdjuvantEndocrineTherapy_4_23.visible( activity );

        return visibleIf( ["FIRST", "FOLLOWING"], ["4.23"] )( activity ) && validationLibrary.includesAll( activity.dmpCurrentAdjuvantEndocrineTherapy_4_23, "AROMATASE_INHIBITORS" ) && currentAdjuvantEndocrineTherapyVisible;
    }
// VISIBILITY CONDITIONS - Findings And Therapy of Remote Metastases •••••••••••••••••••••••••••••••••••••••••••••••••••
    function BK_T_dmpLocalisation_4_23Visible( activity ) {
        return visibleIf( ["FIRST"], ["4.23"] )( activity ) && activity.dmpFirstConfirmationOfRemoteMetastases;
    }
    function BK_T_dmpLocalisation_4_23Optional( activity ) {
        var primaryContralateralOrLocoregional = activity.dmpInitialManifestationOfPrimaryTumor || activity.dmpManifestationOfContralateralBreastCancer || activity.dmpLocoregionalRecurrence;

        var visible_FST = visibleIf( ["FIRST"], ["4.23"] )( activity ) && !primaryContralateralOrLocoregional && !activity.dmpFirstConfirmationOfRemoteMetastases;
        var visible_PNP = visibleIf( ["PNP"], ["4.23"] )( activity );

        return visible_FST || visible_PNP;
    }
    function BK_T_dmpBisphosphonateTherapyVisible( activity ) {
        var localisationVisible = BK_FIELD_VISIBILITY_MAP.dmpLocalisation_4_23.visible( activity );
        var visible_FST_4_21 = visibleIf( ["FIRST"], ["4.21"] )( activity ) && activity.dmpFirstConfirmationOfRemoteMetastases && validationLibrary.includesAll( activity.dmpLocalisation, "BONE" );
        var visible_FLW_4_21 = visibleIf( ["FOLLOWING"], ["4.21"] )( activity ) && activity.dmpManifestationOfRemoteMetastases_following_date && validationLibrary.includesAll( activity.dmpManifestationOfRemoteMetastases_following_text_4_23, "BONE" );
        var visible_FST_4_23 = visibleIf( ["FIRST"], ["4.23"] )( activity ) && validationLibrary.includesAll( activity.dmpLocalisation_4_23, "BONE" ) && localisationVisible;
        var visible_FLW_4_23 = visibleIf( ["FOLLOWING"], ["4.23"] )( activity ) && validationLibrary.includesAll( activity.dmpManifestationOfRemoteMetastases_following_text_4_23, "BONE" );

        return visible_FST_4_21 || visible_FLW_4_21 || visible_FST_4_23 || visible_FLW_4_23;
    }
    function BK_T_dmpBisphosphonateTherapyOptional( activity ) {
        var visible_FST = visibleIf( ["FIRST"], ["4.21"] )( activity ) && !activity.dmpFirstConfirmationOfRemoteMetastases && validationLibrary.includesAll( activity.dmpLocalisation, "BONE" );
        var visible_PNP = visibleIf( ["PNP"], ["4,21", "4.23"] )( activity );
        var visible_FLW_4_21 = visibleIf( ["FOLLOWING"], ["4.23"] )( activity ) && !(activity.dmpManifestationOfRemoteMetastases_following_date && validationLibrary.includesAll( activity.dmpManifestationOfRemoteMetastases_following_text_4_23, "BONE" ));
        var visible_FLW_4_23 = visibleIf( ["FOLLOWING"], ["4.23"] )( activity ) && !validationLibrary.includesAll( activity.dmpManifestationOfRemoteMetastases_following_text_4_23, "BONE" );

        return visible_FST || visible_PNP || visible_FLW_4_21 || visible_FLW_4_23;
    }
    function BK_T_Denosumab_4_23Visible( activity ) {
        var localisationVisible = BK_FIELD_VISIBILITY_MAP.dmpLocalisation_4_23.visible( activity );
        var visible_FST = visibleIf( ["FIRST"], ["4.23"] )( activity ) && validationLibrary.includesAll( activity.dmpLocalisation_4_23, "BONE" ) && localisationVisible;
        var visible_FLW = visibleIf( ["FOLLOWING"], ["4.23"] )( activity ) && validationLibrary.includesAll( activity.dmpManifestationOfRemoteMetastases_following_text_4_23, "BONE" );

        return visible_FST || visible_FLW;
    }
    function BK_T_Denosumab_4_23Optional( activity ) {
        var visible_PNP = visibleIf( ["PNP"], ["4.23"] )( activity );
        var visible_FLW = visibleIf( ["FOLLOWING"], ["4.23"] )( activity ) && !validationLibrary.includesAll( activity.dmpManifestationOfRemoteMetastases_following_text_4_23, "BONE" );

        return visible_PNP || visible_FLW;
    }
// VISIBILITY CONDITIONS - Other Findings ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
    function BK_T_visibleIfFirstOrFollowing_4_23( activity ) {
        return visibleIf( ["FIRST", "FOLLOWING"], ["4.23"] )( activity );
    }
    function BK_T_visibleIfPnp_4_23( activity ) {
        return visibleIf( ["PNP"], ["4.23"] )( activity );
    }
// VISIBILITY CONDITIONS - Events Since Last Documentation •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
    function BK_T_visibleIfFollowing( activity ) {
        return visibleIf( ["FOLLOWING"] )( activity );
    }
    function BK_T_visibleIfFollowing_4_23( activity ) {
        return visibleIf( ["FOLLOWING"], ["4.23"] )( activity );
    }
    function BK_T_dmpBiopticConfirmationOfVisceralMetastases_4_23Visible( activity ) {
        var remoteLocalisation = activity.dmpManifestationOfRemoteMetastases_following_text_4_23;

        return visibleIf( ["FOLLOWING"], ["4.23"] )( activity ) && validationLibrary.includesAll( remoteLocalisation, "VISCERAL" ) && validationLibrary.excludesAll( remoteLocalisation, "NO" );
    }

// ================================================================================================================== \\
// ========================================== REQUIRED SECTIONS AND FIELDS ========================================== \\
    function getRequiredFieldsObject( activity ) {
        var requiredFields = {};

        Object.keys( BK_FIELD_VISIBILITY_MAP ).forEach( function(field){
            var visible = BK_FIELD_VISIBILITY_MAP[field].visible && BK_FIELD_VISIBILITY_MAP[field].visible( activity );
            var optional = BK_FIELD_VISIBILITY_MAP[field].optional && BK_FIELD_VISIBILITY_MAP[field].optional( activity );

            requiredFields[field] = Boolean( (visible || (optional && activity.dmpShowOptionalFields)) && fieldFilledOut( field ) );
        } );

        return requiredFields;

        function fieldFilledOut( field ) {
            if ( field === "dmpManifestationOfLocoregionalRecurrence_following") { // Special case (the KBV field that can be a date or a selection is implemented as two fields in the inSuite)
                return activity.dmpManifestationOfLocoregionalRecurrence_following_date || activity.dmpManifestationOfLocoregionalRecurrence_following_text.length;
            } else if ( field === "dmpManifestationOfContralateralBreastCancer_following" ) { // Special case (the KBV field that can be a date or a selection is implemented as two fields in the inSuite)
                return activity.dmpManifestationOfContralateralBreastCancer_following_date || activity.dmpManifestationOfContralateralBreastCancer_following_text.length;
            } else if ( field === "dmpManifestationOfRemoteMetastases_following_4_23" ) { // Special case (the KBV field that can be a date or a selection is implemented as two fields in the inSuite)
                return activity.dmpManifestationOfRemoteMetastases_following_date || activity.dmpManifestationOfRemoteMetastases_following_text_4_23.length;
            } else {
                return validationLibrary._mandatory( activity[field] );
            }
        }
    }
    function getRequiredSectionsObject( activity, requiredFields ) {
        var requiredSections = {};

        Object.keys( BK_SECTION_STRUCTURE ).forEach( function( section ) {
            var subFields = BK_SECTION_STRUCTURE[section].subFields || [];
            var dmpTypes = BK_SECTION_STRUCTURE[section].dmpTypes;
            var versions = BK_SECTION_STRUCTURE[section].versions;

            var someSubFieldRequired = lodash.some( subFields, function( subField ) {
                return requiredFields[subField];
            } );

            // NB: the isRelevant() part is needed to avoid duplicate fields in the case where different sections from FIRST, PNP, FOLLOWING include some same subFields.
            requiredSections[section] = someSubFieldRequired && isRelevant( activity, { versions: versions, dmpTypes: dmpTypes } );
        } );

        return requiredSections;
    }

// ================================================================================================================== \\
// ================================================== DEEP FREEZE =================================================== \\
    function deepFreeze( object ) {
        var props = Object.getOwnPropertyNames( object );

        props.forEach( function( prop ) {
            var value = object[prop];
            object[prop] = value && typeof value === 'object' ? deepFreeze( value ) : value;
        } );

        return Object.freeze( object );
    }

    BK_FIELD_VISIBILITY_MAP = deepFreeze( BK_FIELD_VISIBILITY_MAP );
    BK_SECTION_STRUCTURE = deepFreeze( BK_SECTION_STRUCTURE );

    Y.namespace( 'doccirrus' ).edmpbkutils = {
        BK_FIELD_VISIBILITY_MAP: BK_FIELD_VISIBILITY_MAP,
        BK_SECTION_STRUCTURE: BK_SECTION_STRUCTURE,
        getRequiredFieldsObject: getRequiredFieldsObject,
        getRequiredSectionsObject: getRequiredSectionsObject,
        dmpBkFieldIsHidden: dmpBkFieldIsHidden
    };
}, '0.0.1', {requires: ['doccirrus']} );