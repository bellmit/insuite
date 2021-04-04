/**
 * User: do
 * Date: 02/05/14  13:28
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */

YUI.add( 'incaseconfiguration-schema', function( Y, NAME ) {
        'use strict';

        /**
         * The IncaseConfiguration_T entry schema,
         *
         * @module incaseconfiguration-schema, invoice configuration schema.
         */

        var types = {},
            i18n = Y.doccirrus.i18n,
            template = {
                "_id": "000000000000000000000001",
                "autoshareCheck": true,

                "patientDataLocationMandatory": false,
                "patientDataAddressMandatory": true,
                "patientDataPhoneNumberMandatory": false,
                "patientDataEmailMandatory": false,

                "quickPrintInvoice": true,          //  approve and quickPrint invoices
                "quickPrintInvoiceBill": false,     //  bill and quickPrint invoices
                "quickPrintPrescription": true,     //  approve and quickPrint prescriptions

                "restrictSaveInHouseCatalog": false,
                "allowCustomCodeFor": ['TREATMENT', 'DIAGNOSIS', 'MEDICATION'],
                "allowCustomValueFor": ['MEDDATA'],
                "documentMedicationPerLocation": false,
                "documentContinuousDiagnosis": false,
                "getImportedContinuousDiagnosisFromCurrentLocation": false,

                "validatePREASSISTIVE": true,       //  Prevent user edit of linked activity fields
                "validatePUBPRESCR": true,          //  ...
                "validatePRIVPRESCR": true,         //  ...
                "validatePRESCRBTM": true,          //  ...
                "validatePRESCRG": true,            //  ...
                "validatePRESCRT": true,            //  ...
                "validateDOCLETTER": true,          //  ...
                "validateQUOTATION": true,          //  ...
                "validatePUBRECEIPT": true,         //  ...
                "validateRECEIPT": true,            //  ...
                "validateLABREQUEST": true,         //  ...
                "validateAU": true,                 //  ...
                "validateREFERRAL": true,           //  ...
                "activatePrinterSelectionDialogAtPrintingOfForms": false,
                "allowOwnSubtypes": true,
                "kimTreatmentAutoCreationOnEDocLetterReceived": false,
                "kimTreatmentAutoCreationOnEDocLetterReceivedForLocations": [],
                "kimTreatmentAutoCreationOnEDocLetterSent": false,
                "kimTreatmentAutoCreationOnEDocLetterSentLocations": [],
                "kimMessagePollingIntervalEnabled": true,
                "kimMessagePollingIntervalHours": 2,
                "kimMessagePollingLasttime": "",
                "kimIncludeRevocationInfo": false
            };

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "IncaseConfiguration_T",
                        "lib": types
                    }
                },
                "IncaseConfiguration_T": {
                    "autoEventsOnCardRead": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.autoEventsOnCardRead.i18n' ),
                        "-en": "autoEventsOnCardRead",
                        "-de": "autoEventsOnCardRead"
                    },
                    "autoEventsOnCardReadNoAppointment": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.autoEventsOnCardReadNoAppointment.i18n' ),
                        "-en": "autoEventsOnCardReadNoAppointment",
                        "-de": "autoEventsOnCardReadNoAppointment"
                    },
                    "catalogTextHidden": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.catalogTextHidden.i18n' ),
                        "-en": "catalogTextHidden",
                        "-de": "catalogTextHidden"
                    },
                    "restrictSaveInHouseCatalog": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.restrictSaveInHouseCatalog.i18n' ),
                        "-en": "restrictSaveInHouseCatalog",
                        "-de": "restrictSaveInHouseCatalog"
                    },
                    "allowCustomCodeFor": {
                        "complex": "eq",
                        "type": "AllowCustomCodeFor_E",
                        "lib": types,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.allowCustomCodeFor.i18n' )
                    },
                    "allowCustomValueFor": {
                        "complex": "eq",
                        "type": "AllowCustomValueFor_E",
                        "lib": types,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.allowCustomValueFor.i18n' )
                    },
                    "documentMedicationPerLocation": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.documentMedicationPerLocation.i18n' ),
                        '-en': i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.documentMedicationPerLocation.i18n' ),
                        '-de': i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.documentMedicationPerLocation.i18n' )
                    },
                    "documentContinuousDiagnosisPerLocation": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.documentContinuousDiagnosisPerLocation.i18n' ),
                        '-de': i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.documentContinuousDiagnosisPerLocation.i18n' ),
                        '-en': i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.documentContinuousDiagnosisPerLocation.i18n' )
                    },
                    "getImportedContinuousDiagnosisFromCurrentLocation": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.getImportedContinuousDiagnosisFromCurrentLocation.i18n' ),
                        '-de': i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.getImportedContinuousDiagnosisFromCurrentLocation.i18n' ),
                        '-en': i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.getImportedContinuousDiagnosisFromCurrentLocation.i18n' )
                    },
                    "showAddendumButton": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.showAddendumButton.i18n' ),
                        '-de': i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.showAddendumButton.i18n' ),
                        '-en': i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.showAddendumButton.i18n' )
                    },
                    "hideMedicationPlanMedications": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.hideMedicationPlanMedications.i18n' ),
                        '-de': i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.hideMedicationPlanMedications.i18n' ),
                        '-en': i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.hideMedicationPlanMedications.i18n' )
                    },
                    "kbvutility2DefaultForChapter": {
                        "type": "String",
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.kbvutility2DefaultForChapter.i18n' ),
                        '-de': i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.kbvutility2DefaultForChapter.i18n' ),
                        '-en': i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.kbvutility2DefaultForChapter.i18n' )
                    },
                    "kbvutility2DefaultForHomeVisit": {
                        "type": "Boolean",
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.kbvutility2DefaultForHomeVisit.i18n' ),
                        '-de': i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.kbvutility2DefaultForHomeVisit.i18n' ),
                        '-en': i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.kbvutility2DefaultForHomeVisit.i18n' )
                    },
                    "kbvutility2DefaultForTherapyReport": {
                        "type": "Boolean",
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.kbvutility2DefaultForTherapyReport.i18n' ),
                        '-de': i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.kbvutility2DefaultForTherapyReport.i18n' ),
                        '-en': i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.kbvutility2DefaultForTherapyReport.i18n' )
                    },
                    "kbvutility2DeactivatePriceDisplay": {
                        "type": "Boolean",
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.kbvutility2DeactivatePriceDisplay.i18n' ),
                        '-de': i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.kbvutility2DeactivatePriceDisplay.i18n' ),
                        '-en': i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.kbvutility2DeactivatePriceDisplay.i18n' )
                    },
                    "patientDataLocationMandatory": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.patientDataLocationMandatory.i18n' ),
                        "-en": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.patientDataLocationMandatory.i18n' ),
                        "-de": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.patientDataLocationMandatory.i18n' )
                    },
                    "patientDataAddressMandatory": {
                        "type": "Boolean",
                        "default": true,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.patientDataAddressMandatory.i18n' ),
                        "-en": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.patientDataAddressMandatory.i18n' ),
                        "-de": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.patientDataAddressMandatory.i18n' )
                    },
                    "patientDataPhoneNumberMandatory": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.patientDataPhoneNumberMandatory.i18n' ),
                        "-en": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.patientDataPhoneNumberMandatory.i18n' ),
                        "-de": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.patientDataPhoneNumberMandatory.i18n' )
                    },
                    "patientDataEmailMandatory": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.patientDataEmailMandatory.i18n' ),
                        "-en": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.patientDataEmailMandatory.i18n' ),
                        "-de": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.patientDataEmailMandatory.i18n' )
                    },
                    "quickPrintInvoice": {
                        "type": "Boolean",
                        "default": true,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.quickPrint.i18n' )
                    },
                    "quickPrintInvoiceBill": {
                        "type": "Boolean",
                        "default": true,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.quickPrintBill.i18n' )
                    },
                    "quickPrintPrescription": {
                        "type": "Boolean",
                        "default": true,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.quickPrintBill.i18n' )
                    },
                    "showReferralIdInput": { // [MOJ-11912] by default doe not show the input box for the ReferralId
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.showReferralIdInput.i18n' )
                    },
                    "onSigningReleaseCorrespondingActivity": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.onSigningReleaseCorrespondingActivity.i18n' ),
                        "-en": "onSigningReleaseCorrespondingActivity",
                        "-de": "onSigningReleaseCorrespondingActivity"
                    },
                    "autoshareCheck": {
                        "type": "Boolean",
                        "default": true,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.autoshareCheck.i18n' ),
                        "-en": "autoshareCheck",
                        "-de": "autoshareCheck"
                    },
                    "allowTransfer": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.allowTransfer.i18n' ),
                        "-en": "allowTransfer",
                        "-de": "allowTransfer"
                    },
                    "threeFactorAuth": {
                        "type": "Boolean",
                        "-en": "threeFactorAuth",
                        "-de": "threeFactorAuth"
                    },
                    "nextPatientNo": {
                        "type": "number",
                        "validate": "num",
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.nextPatientNo.i18n' ),
                        "-en": "Patient Number",
                        "-de": "Patientennummer"
                    },
                    "showPersGroup9Info": {
                        "type": "Boolean",
                        "default": true,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.showPersGroup9Info.i18n' ),
                        "-en": "showPersGroup9Info",
                        "-de": "showPersGroup9Info"
                    },
                    "showPrefillButton": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.showPersGroup9Info.i18n' ),
                        "-en": "showPrefillButton",
                        "-de": "showPrefillButton"
                    },

                    "validatePREASSISTIVE": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.validatePREASSISTIVE.i18n' ),
                        "-en": "Rezept H",
                        "-de": "Rezept H"
                    },
                    "validatePUBPRESCR": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.validatePUBPRESCR.i18n' ),
                        "-en": "Kassenrezept",
                        "-de": "Kassenrezept"
                    },
                    "validatePRIVPRESCR": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.validatePRIVPRESCR.i18n' ),
                        "-en": "Privatrezept",
                        "-de": "Privatrezept"
                    },
                    "validatePRESCRBTM": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.validatePRESCRBTM.i18n' ),
                        "-en": "Rezept BTM",
                        "-de": "Rezept BTM"
                    },
                    "validatePRESCRG": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.validatePRESCRG.i18n' ),
                        "-en": "Rezept G",
                        "-de": "Rezept G"
                    },
                    "validatePRESCRT": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.validatePRESCRT.i18n' ),
                        "-en": "Rezept T",
                        "-de": "Rezept T"
                    },
                    "validateLONGPRESCR": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.validateLONGPRESCR' ),
                        "-en": "Long prescription",
                        "-de": "Dauerrezept"
                    },
                    "validateDOCLETTER": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.validateDOCLETTER.i18n' ),
                        "-en": "Arztbrief",
                        "-de": "Arztbrief"
                    },
                    "validateQUOTATION": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.validateQUOTATION.i18n' ),
                        "-en": "Kostenplan",
                        "-de": "Kostenplan"
                    },
                    "validatePUBRECEIPT": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.validatePUBRECEIPT.i18n' ),
                        "-en": "Patientenquittung",
                        "-de": "Patientenquittung"
                    },
                    "validateRECEIPT": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.validateRECEIPT.i18n' ),
                        "-en": "Receipt",
                        "-de": "Quittung"
                    },
                    "validateLABREQUEST": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.validateLABREQUEST.i18n' ),
                        "-en": "Laborschein",
                        "-de": "Laborschein"
                    },
                    "validateAU": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.validateAU.i18n' ),
                        "-en": "AU",
                        "-de": "AU",
                        "-de-ch": "AUF"
                    },
                    "validateREFERRAL": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.validateREFERRAL.i18n' ),
                        "-en": "Referral",
                        "-de": "Überweisung"
                    },
                    "canApplyActivitySequencePartly": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.validateAU.i18n' ),
                        "-en": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.validateAU.i18n' ),
                        "-de": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.validateAU.i18n' )
                    },
                    "applyPreparedCaseFolder": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.validateAU.i18n' ),
                        "-en": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.validateAU.i18n' ),
                        "-de": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.validateAU.i18n' )
                    },
                    "activatePrinterSelectionDialogAtPrintingOfForms": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.activatePrinterSelectionDialogAtPrintingOfForms.i18n' ),
                        "-en": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.activatePrinterSelectionDialogAtPrintingOfForms.i18n' ),
                        "-de": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.activatePrinterSelectionDialogAtPrintingOfForms.i18n' )
                    },
                    "medDataEdmpDataTransfer": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.medDataEdmpDataTransfer.i18n' ),
                        "-en": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.medDataEdmpDataTransfer.i18n' ),
                        "-de": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.medDataEdmpDataTransfer.i18n' )
                    },
                    "medDataMedicationPlanTransfer": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.medDataMedicationPlanTransfer.i18n' ),
                        "-en": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.medDataMedicationPlanTransfer.i18n' ),
                        "-de": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.medDataMedicationPlanTransfer.i18n' )
                    },
                    "dmpAllowHeadDateChange": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.dmpAllowHeadDateChange.i18n' ),
                        "-en": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.dmpAllowHeadDateChange.i18n' ),
                        "-de": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.dmpAllowHeadDateChange.i18n' )
                    },
                    "customCodeDataPerLocation": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.customCodeDataPerLocation.i18n' ),
                        "-en": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.customCodeDataPerLocation.i18n' ),
                        "-de": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.customCodeDataPerLocation.i18n' )
                    },
                    "useFormTranslation": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.useFormTranslation.i18n' ),
                        "-en": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.useFormTranslation.i18n' ),
                        "-de": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.useFormTranslation.i18n' )
                    },
                    "autoSubstitutionOfPsychoGroupTherapyCodes": {
                        "type": "Boolean",
                        "default": true,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.autoSubstitutionOfPsychoGroupTherapyCodes.i18n' ),
                        "-en": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.autoSubstitutionOfPsychoGroupTherapyCodes.i18n' ),
                        "-de": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.autoSubstitutionOfPsychoGroupTherapyCodes.i18n' )
                    },
                    "onPatientDocumentNew": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.onPatientDocumentNew.i18n' ),
                        "-en": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.onPatientDocumentNew.i18n' ),
                        "-de": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.onPatientDocumentNew.i18n' )
                    },
                    "onPatientDocumentChanged": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.onPatientDocumentChanged.i18n' ),
                        "-en": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.onPatientDocumentChanged.i18n' ),
                        "-de": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.onPatientDocumentChanged.i18n' )
                    },
                    "onPatientDocumentDeleted": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.onPatientDocumentDeleted.i18n' ),
                        "-en": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.onPatientDocumentDeleted.i18n' ),
                        "-de": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.onPatientDocumentDeleted.i18n' )
                    },
                    "onPracticeDocumentNew": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.onPracticeDocumentNew.i18n' ),
                        "-en": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.onPracticeDocumentNew.i18n' ),
                        "-de": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.onPracticeDocumentNew.i18n' )
                    },
                    "onPracticeDocumentChanged": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.onPracticeDocumentChanged.i18n' ),
                        "-en": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.onPracticeDocumentChanged.i18n' ),
                        "-de": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.onPracticeDocumentChanged.i18n' )
                    },
                    "onPracticeDocumentDeleted": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.onPracticeDocumentDeleted.i18n' ),
                        "-en": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.onPracticeDocumentDeleted.i18n' ),
                        "-de": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.onPracticeDocumentDeleted.i18n' )
                    },
                    "allowOwnSubtypes": {
                        "type": "Boolean",
                        "default": true,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.allowOwnSubtypes.i18n' ),
                        "-en": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.allowOwnSubtypes.i18n' ),
                        "-de": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.allowOwnSubtypes.i18n' )
                    },
                    "kimTreatmentAutoCreationOnEDocLetterReceived": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.kimTreatmentAutoCreationOnEDocLetterReceived.i18n' ),
                        "-en": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.kimTreatmentAutoCreationOnEDocLetterReceived.i18n' ),
                        "-de": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.kimTreatmentAutoCreationOnEDocLetterReceived.i18n' )
                    },
                    "kimTreatmentAutoCreationOnEDocLetterReceivedForLocations": {
                        "type": ["String"],
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.kimTreatmentAutoCreationOnEDocLetterReceivedForLocations.i18n' ),
                        "-en": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.kimTreatmentAutoCreationOnEDocLetterReceivedForLocations.i18n' ),
                        "-de": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.kimTreatmentAutoCreationOnEDocLetterReceivedForLocations.i18n' )
                    },
                    "kimTreatmentAutoCreationOnEDocLetterSent": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.kimTreatmentAutoCreationOnEDocLetterSent.i18n' ),
                        "-en": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.kimTreatmentAutoCreationOnEDocLetterSent.i18n' ),
                        "-de": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.kimTreatmentAutoCreationOnEDocLetterSent.i18n' )
                    },
                    "kimTreatmentAutoCreationOnEDocLetterSentLocations": {
                        "type": ["String"],
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.kimTreatmentAutoCreationOnEDocLetterSentLocations.i18n' ),
                        "-en": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.kimTreatmentAutoCreationOnEDocLetterSentLocations.i18n' ),
                        "-de": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.kimTreatmentAutoCreationOnEDocLetterSentLocations.i18n' )
                    },
                    "kimMessagePollingIntervalEnabled": {
                        "type": "Boolean",
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.kimMessagePollingIntervalEnabled.i18n' ),
                        "-en": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.kimMessagePollingIntervalEnabled.i18n' ),
                        "-de": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.kimMessagePollingIntervalEnabled.i18n' )
                    },
                    "kimMessagePollingIntervalHours": {
                        "type": "Number",
                        "validate": "IncaseConfiguration_T_kimMessagePollingIntervalHours",
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.kimMessagePollingIntervalHours.i18n' ),
                        "-en": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.kimMessagePollingIntervalHours.i18n' ),
                        "-de": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.kimMessagePollingIntervalHours.i18n' )
                    },
                    "kimMessagePollingLasttime": {
                        "type": "Date",
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.kimMessagePollingIntervalHours.i18n' ),
                        "-en": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.kimMessagePollingIntervalHours.i18n' ),
                        "-de": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.kimMessagePollingIntervalHours.i18n' )
                    },
                    "kimIncludeRevocationInfo": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.kimIncludeRevocationInfo.i18n' ),
                        "-en": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.kimIncludeRevocationInfo.i18n' ),
                        "-de": i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.kimIncludeRevocationInfo.i18n' )
                    },
                    "roles": {
                        type: [ 'String' ],
                        "validate": "IncaseConfiguration_T_roles",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'task-schema.Task_T.roles.i18n' ),
                        '-en': 'Roles',
                        '-de': 'Roles'
                    },
                    "IncaseConfiguration_CH_T": {
                        "complex": "ext",
                        "type": "IncaseConfiguration_CH_T",
                        "lib": types
                    }
                },
                "IncaseConfiguration_CH_T": {
                    "mediportNeedsApproval": {
                        "default": true,
                        "type": "Boolean",
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.mediportNeedsApproval.i18n' ),
                        "-en": "Patient consent to Mediport is always obtained",
                        "-de": "Hat Mediport Übertragung zugestimmt"
                    },
                    "CoverCardConfuguration": {
                        "complex": "ext",
                        "type": "CoverCardConfiguration_T",
                        "lib": types
                    }
                },

                "CoverCardConfiguration_T": {
                    "coverCardOfacId": {
                        "default": "",
                        "type": "String",
                        i18n: i18n( 'incaseconfiguration-schema.CoverCardConfiguration_T.coverCardOfacId.i18n' )
                    },
                    "coverCardZsrNo": {
                        "default": "",
                        "type": "String",
                        i18n: i18n( 'incaseconfiguration-schema.CoverCardConfiguration_T.coverCardZsrNo.i18n' )
                    },
                    "coverCardSoftwareId": {
                        "default": "",
                        "type": "String",
                        i18n: i18n( 'incaseconfiguration-schema.CoverCardConfiguration_T.coverCardSoftwareId.i18n' )
                    },
                    "coverCardSoftwareZsrNo": {
                        "default": "",
                        "type": "String",
                        i18n: i18n( 'incaseconfiguration-schema.CoverCardConfiguration_T.coverCardSoftwareZsrNo.i18n' )
                    },
                    "coverCardUser": {
                        "default": "",
                        "type": "String",
                        i18n: i18n( 'incaseconfiguration-schema.CoverCardConfiguration_T.coverCardUser.i18n' )
                    },
                    "coverCardPass": {
                        "default": "",
                        "type": "String",
                        i18n: i18n( 'incaseconfiguration-schema.CoverCardConfiguration_T.coverCardPass.i18n' )
                    },
                    "coverCardCertPass": {
                        "default": "",
                        "type": "String",
                        i18n: i18n( 'incaseconfiguration-schema.CoverCardConfiguration_T.coverCardCertPass.i18n' )
                    }
                },
                AllowCustomCodeFor_E: {
                    "type": ["String"],
                    "apiv": {v: 2, queryParam: false},
                    "list": [
                        {
                            "val": "TREATMENT",
                            "-de": "Leistung",
                            i18n: i18n( 'activity-schema.Activity_E.TREATMENT' ),
                            "-en": "Treatment"
                        },
                        {
                            "val": "DIAGNOSIS",
                            "-de": "Diagnose",
                            i18n: i18n( 'activity-schema.Activity_E.DIAGNOSIS' ),
                            "-en": "Diagnosis"
                        },
                        {
                            "val": "MEDICATION",
                            "-de": "Medikament",
                            i18n: i18n( 'activity-schema.Activity_E.MEDICATION' ),
                            "-en": "Medication"
                        }
                    ]
                },
                AllowCustomValueFor_E: {
                    "type": ["String"],
                    "apiv": {v: 2, queryParam: false},
                    "list": [
                        {
                            "val": "MEDDATA",
                            "-de": "Medizindaten",
                            i18n: i18n( 'activity-schema.Activity_E.MEDDATA' ),
                            "-en": "Medizindaten"
                        },
                        {
                            "val": "PRESCRIPTION",
                            "-de": "Verordnungen (Dosis, Hinweis, Grund)",
                            i18n: i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.checkbox.PRESCRIPTIONS' ),
                            "-en": "Prescriptions (Dose, Note, Reason)"
                        }
                    ]
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        function getReadOnlyFields() {
            return ['nextPatientNo'];
        }

        function getDefaultData() {
            return template;
        }

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,
            /* OPTIONAL default items to be written to the DB on startup */
            defaultItems: [template],
            name: NAME,

            getReadOnlyFields: getReadOnlyFields,
            getDefaultData: getDefaultData,
            cacheQuery: true
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'doccirrus'
        ]
    }
);
