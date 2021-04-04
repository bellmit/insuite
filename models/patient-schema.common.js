/**
 * User: rrrw
 * Date: 27/12/2012  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI, _, require */
'use strict';

// NBB:  the file name and the schema name are linked by Mojito and must match!

YUI.add( 'patient-schema', function( Y, NAME ) {
        /**
         * The DC Patient data schema definition
         *
         * @module DCPatient
         */

        var
            // ------- Schema definitions  -------
            types = {},

            ramlConfig = {
                // REST API v2. parameters
                "2": {
                    description: "The patient collection holds all data relevant to a patient, including all insurance data. <br/> The patient endpoint exposes a JSON RPC method for getting a patient from a specific cardreader instead of the DB. e.g. <pre> /2/patient/:readCard?_id=5afd4c40b83294c249999999 </pre> See also <a href='#_2_cardreader'>/2/cardreader</a> "
                }
            },
            DISPATCHER = Object.freeze( {
                INCARE: 'INCARE'
            } ),
            PartnerIdsPartnerId = Object.freeze( {
                INCARE: DISPATCHER.INCARE,
                AP: 'AP',
                CARDIO: 'CARDIO',
                DOQUVIDE: 'DOQUVIDE',
                ASV: 'ASV',
                EDMP: 'EDMP',
                CARDIORULE: 'BIOTRONIK IN-TIME SOP',
                DQS: 'DQS',
                DYNAMIC: 'DYNAMIC',
                SELECTIVE_CARE: 'SELECTIVE_CARE'
            } ),
            CardioOptions = Object.freeze( {
                CARDIACFAILURE: 'CARDIACFAILURE',
                STROKE: 'STROKE',
                CHD: 'CHD'
            } ),
            i18n = Y.doccirrus.i18n,
            moment = Y.doccirrus.commonutils.getMoment(),

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "Patient_T",
                        "apiv": { v: 2, queryParam: false },
                        "lib": types
                    }
                },
                "Patient_T": {
                    "prcCustomerNo": {
                        "type": "String",
                        i18n: i18n( 'patient-schema.Patient_T.prcCustomerNo.i18n' ),
                        "-en": "prcCustomerNo",
                        "-de": "prcCustomerNo"
                    },
                    "prcCoName": {
                        "type": "String",
                        i18n: i18n( 'patient-schema.Patient_T.prcCoName.i18n' ),
                        "-en": "prc Company Name",
                        "-de": "prc  Company Name"
                    },
                    "mirrorPatientId": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.Patient_T.mirrorPatientId' ),
                        "-en": "mirrorPatientId",
                        "-de": "mirrorPatientId"
                    },
                    "additionalMirrorPatientIds": {
                        "type": ["String"],
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.Patient_T.additionalMirrorPatientIds' ),
                        "-en": "additionalMirrorPatientIds",
                        "-de": "additionalMirrorPatientIds"
                    },
                    "person": {
                        "complex": "ext",
                        "type": "Person_T",
                        "apiv": { v: 2, queryParam: false },
                        "lib": "person"
                    },
                    "kbvDob": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        "validate": "kbv.Person_T_kbvDob",
                        i18n: i18n( 'person-schema.Person_T.kbvDob' ),
                        "-en": "Date of Birth",
                        "-de": "Geburtstag"
                    },
                    "insuranceStatus": {
                        "complex": "inc",
                        "type": "InsuranceStatus_T",
                        "apiv": { v: 2, queryParam: false },
                        "lib": "person",
                        "validate":"kbv.Person_T_insuranceStatus",
                        i18n: i18n( 'patient-schema.Patient_T.insuranceStatus' ),
                        "-en": "Insurances",
                        "-de": "Kostenträger",
                        "rule-engine": {}// TODOOO flag that indicates that this is a "container" only?
                    },
                    "dataTransmissionToPVSApproved": {
                        "type": "Boolean",
                        i18n: i18n( 'patient-schema.Patient_T.dataTransmissionToPVSApproved' ),
                        "apiv": { v: 2, queryParam: false },
                        "-en": "PVS data transmission approved",
                        "-de": "Hat PVS-Datenübermittlung zugestimmt",
                        "rule-engine": {
                            simpleType: true,
                            i18n: i18n( 'patient-schema.Patient_T.dataTransmissionToPVSApprovedRule' )
                        }
                    },
                    "GDPRFormApprovedVersion": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.Patient_T.GDPRFormApprovedVersion.i18n' )
                    },
                    "medicalConfidentialityReleaseFormApprovedVersion": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.Patient_T.medicalConfidentialityReleaseFormApprovedVersion.i18n' )
                    },
                    "dataTransmissionToMediportApproved": {
                        "type": "Boolean",
                        i18n: i18n( 'patient-schema.Patient_T.dataTransmissionToMediportApproved' ),
                        "-en": "Mediport data transmission approved",
                        "-de": "Mediport Datenübermittlung zugestimmt"
                    },
                    "affiliates": {
                        "complex": "inc",
                        "type": "Affiliate_T",
                        "lib": "person",
                        i18n: i18n( 'patient-schema.Patient_T.affiliates' ),
                        "-en": "affiliates",
                        "-de": "affiliates"
                    },
                    "images": {
                        "complex": "inc",
                        "type": "Image_T",
                        "lib": "media",
                        i18n: i18n( 'patient-schema.Patient_T.images' ),
                        "-en": "images",
                        "-de": "images"
                    },
                    "primaryDoc": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.Patient_T.primaryDoc' ),
                        "-en": "primaryDoc",
                        "-de": "primaryDoc"
                    },
                    // currently can only have a single referring physician per patient: array is future use.
                    "physicians": {
                        "type": [String],
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.Patient_T.physicians' ),
                        "-en": "Physicians",
                        "-de": "Ärzte"
                    },
                    "employees": {
                        "type": ["ObjectId"],
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.Patient_T.physicians' ),
                        "-en": "Employees",
                        "-de": "Ärzte"
                    },
                    "markers": {
                        "type": [String],
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.Patient_T.markers' ),
                        "-en": "Labels",
                        "-de": "Marker",
                        "rule-engine": {
                            "type": "String",
                            "allowedOperators": ['$eq', '$ne', '$exists']
                        }
                        /*
                         TODO: MOJ-3557 (tried this)
                         "complex": "inc",
                         "type": "Marker_T",
                         "apiv": { v:2, queryParam: false },
                         "lib": "marker",
                         */
                    },
                    "patientPortal": {
                        "complex": "ext",
                        "type": 'PatientPortal_T',
                        i18n: i18n( 'patient-schema.PatientPortal_T.i18n' ),
                        "lib": types
                    },
                    "alternativeId": {
                        "type": "String",
                        i18n: i18n( 'patient-schema.Patient_T.alternativeId' ),
                        "-en": "alternativeId",
                        "-de": "alternativeId"
                    },
                    "socialInsuranceNumber": {
                        "type": "String",
                        i18n: i18n( 'patient-schema.Patient_T.socialInsuranceNumber' ),
                        "-en": "socialInsuranceNumber",
                        "-de": "socialInsuranceNumber"
                    },
                    "partner_extra": {
                        "type": "any",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.Patient_T.partner_extra' ),
                        "-en": "Partner Extras",
                        "-de": "Partner Extras"
                    },
                    "partnerIds": {
                        "complex": "inc",
                        "type": "PartnerIds_T",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.Patient_T.partnerIds.i18n' ),
                        "lib": types
                    },
                    "insuranceNotes": {
                        "type": "String",
                        i18n: i18n( 'patient-schema.Patient_T.insuranceNotes' ),
                        "-en": "insuranceNotes",
                        "-de": "insuranceNotes"
                    },
                    "careDegree": {
                        "complex": "eq",
                        "type": "CareDegree_E",
                        "apiv": { v: 2, queryParam: false },
                        "lib": types
                    },
                    "dob": {
                        "required": true,
                        "type": "Date",
                        "apiv": { v: 2, queryParam: true },
                        "validate": "Patient_T_dob",
                        i18n: i18n( 'patient-schema.Patient_T.dob' ),
                        "-en": "Date of Birth",
                        "-de": "Geburtsdatum"
                    },
                    "dateOfDeath": {
                        "type": "Date",
                        "apiv": { v: 2, queryParam: false },
                        "validate": "Patient_T_dateOfDeath",
                        i18n: i18n( 'patient-schema.Patient_T.dateOfDeath' ),
                        "-en": "Date of Death",
                        "-de": "Todestag",
                        "rule-engine": {
                            "allowedOperators": ['$exists']
                        }
                    },
                    "dateOfInActive": {
                        "type": "Date",
                        "apiv": { v: 2, queryParam: false },
                        "validate": "Patient_T_dateOfInActive",
                        i18n: i18n( 'patient-schema.Patient_T.dateOfInActive' ),
                        "-en": "Date of Inactive",
                        "-de": "Inaktivtag",
                        "rule-engine": {
                            "allowedOperators": ['$exists']
                        }
                    },
                    "isDeceased": {
                        "type": "Boolean",
                        i18n: i18n( 'patient-schema.Patient_T.isDeceased' ),
                        "-en": "isDeceased",
                        "-de": "Verstorben"
                    },
                    "inActive": {
                        "type": "Boolean",
                        i18n: i18n( 'patient-schema.Patient_T.inActive' ),
                        "-en": "InActive Since",
                        "-de": "Inaktiv seit"
                    },
                    'reason': {
                        'type': 'string',
                        i18n: i18n( 'patient-schema.Patient_T.reason' ),
                        "-en": "Reason",
                        "-de": "Bemerkung"
                    },
                    "dob_MM":{
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.Patient_T.dob_MM' ),
                        "-en": "Month of Birth",
                        "-de": "Geburtsmonat"
                    },
                    "dob_DD":{
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.Patient_T.dob_DD' ),
                        "-en": "Day of Birth",
                        "-de": "Geburtstag"
                    },
                    "patientSince": {
                        "type": "Date",
                        "apiv": { v: 2, queryParam: false },
                        "validate": "Patient_T_patientSince",
                        i18n: i18n( 'patient-schema.Patient_T.patientSince' ),
                        "-en": "Patient since",
                        "-de": "Patient seit"
                    },
                    "talk": {
                        "complex": "eq",
                        "validate": "Patient_T_talk",
                        "type": "Talk_E",
                        "apiv": { v: 2, queryParam: false },
                        "lib": types
                    },
                    "gender": {
                        "complex": "eq",
                        "required": true,
                        "validate": "Patient_T_gender",
                        "type": "Gender_E",
                        "apiv": { v: 2, queryParam: false },
                        "lib": types
                    },
                    "sendPatientReceipt": {
                        "default": false,
                        "type": "Boolean",
                        i18n: i18n( 'patient-schema.Patient_T.sendPatientReceipt' ),
                        "-en": "Sent Patient Receipt",
                        "-de": "Versand einer Quartalsquittung",
                        "rule-engine": {
                            simpleType: true
                        }
                    },
                    "noMailing": {
                        "type": "Boolean",
                        i18n: i18n( 'patient-schema.Patient_T.allowMailing' ),
                        "-en": "Agreed to Mailing and Notifications",
                        "-de": "Hat Erinnerung und Mailings zugestimmt",
                        "rule-engine": {
                            simpleType: true
                        }
                    },
                    "patientNo": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: true },
                        i18n: i18n( 'patient-schema.Patient_T.patientNo.i18n' ),
                        "-en": "Patient Number",
                        "-de": "Patientennummer"
                    },
                    "socialSecurityNo": {
                        "type": "String",
                        "validate": "Patient_CH_T_socialSecurityNo",
                        "apiv": { v: 2, queryParam: true },
                        i18n: i18n( 'patient-schema.Patient_T.socialSecurityNo.i18n' ),
                        "-en": "Social security number",
                        "-de": "Sozial Versicherungsnummer"
                    },
                    "familyDoctorModel": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'patient-schema.Patient_T.familyDoctorModel.i18n' ),
                        "-en": "Family doctor model",
                        "-de": "Hausarztmodell",
                        "rule-engine": {
                            simpleType: true
                        }
                    },
                    "patientNumber": {
                        "type": "Number",
                        "apiv": { v: 2, queryParam: false },
                        "default": 0,
                        i18n: i18n( 'patient-schema.Patient_T.patientNumber.i18n' ),
                        "-en": "Patient Number",
                        "-de": "Patientennummer"
                    },
                    "noShowCount": {
                        "type": "Number",
                        i18n: i18n( 'patient-schema.Patient_T.noShowCount.i18n' ),
                        "-en": "noShowCount",
                        "-de": "noShowCount"
                    },
                    "nextAppointment": {
                        "type": "Date",
                        i18n: i18n( 'patient-schema.Patient_T.nextAppointment.i18n' ),
                        "-en": "nextAppointment",
                        "-de": "nextAppointment"
                    },
                    "attachedActivity": {
                        "type": "String",
                        i18n: i18n( 'patient-schema.Patient_T.attachedActivity.i18n' ),
                        "-en": "Attached activity",
                        "-de": "Attached activity"
                    },
                    "attachedContent": {
                        "type": "String",
                        i18n: i18n( 'patient-schema.Patient_T.attachedContent.i18n' ),
                        "-en": "Attached content",
                        "-de": "Attached content"
                    },
                    "attachedSeverity": {
                        "complex": "eq",
                        "type": "Severity_E",
                        "lib": "severity",
                        "default": "LOW"
                    },
                    patientTransfer: {
                        "eTAN": {
                            "type": "string",
                            i18n: i18n( 'patient-schema.Patient_T.patientTransfer.eTAN.i18n' ),
                            "-en": "ETAN",
                            "-de": "ETAN"
                        },
                        "targetCustNo": {
                            "type": "string",
                            i18n: i18n( 'patient-schema.Patient_T.patientTransfer.targetCustNo.i18n' ),
                            "-en": "targetPracId",
                            "-de": "targetPracId"
                        },
                        activityIds: {
                            "complex": "inc",
                            "type": "string",
                            i18n: i18n( 'patient-schema.Patient_T.patientTransfer.activityIds.i18n' ),
                            "-en": "activityIds",
                            "-de": "activityIds"
                        },
                        "date": {
                            "type": "Date",
                            i18n: i18n( 'patient-schema.Patient_T.patientTransfer.date.i18n' ),
                            "-en": "Request Date",
                            "-de": "Datum Anfrage"
                        }
                    },
                    "importId": { // MOJ-3544
                        "type": "String",
                        i18n: i18n( 'patient-schema.Patient_T.importId.i18n' ),
                        "-en": "importId",
                        "-de": "importId"
                    },
                    "crmTags": {
                        "type": [String],
                        i18n: i18n( 'patient-schema.Patient_T.crmTags.i18n' ),
                        "-en": "crmTags",
                        "-de": "crmTags"
                    },
                    "crmTreatments": {
                        "complex": "inc",
                        "type": "CrmTreatment_T",
                        "lib": types,
                        i18n: i18n( 'patient-schema.Patient_T.crmTreatments.i18n' ),
                        "-en": "crmTreatments",
                        "-de": "crmTreatments"
                    },
                    "crmAppointmentRangeStart": {
                        "type": "Date",
                        i18n: i18n( 'patient-schema.Patient_T.crmAppointmentRangeStart.i18n' ),
                        "-en": "crmAppointmentRangeStart",
                        "-de": "crmAppointmentRangeStart"
                    },
                    "crmAppointmentRangeEnd": {
                        "type": "Date",
                        i18n: i18n( 'patient-schema.Patient_T.crmAppointmentRangeEnd.i18n' ),
                        "-en": "crmAppointmentRangeEnd",
                        "-de": "crmAppointmentRangeEnd"
                    },
                    "crmAppointmentMonth": {
                        "type": "String",
                        i18n: i18n( 'patient-schema.Patient_T.crmAppointmentMonth.i18n' ),
                        "-en": "crmAppointmentMonth",
                        "-de": "crmAppointmentMonth"
                    },
                    "crmAppointmentQuarter": {
                        "type": "String",
                        i18n: i18n( 'patient-schema.Patient_T.crmAppointmentQuarter.i18n' ),
                        "-en": "crmAppointmentQuarter",
                        "-de": "crmAppointmentQuarter"
                    },
                    "crmAppointmentYear": {
                        "type": "String",
                        i18n: i18n( 'patient-schema.Patient_T.crmAppointmentYear.i18n' ),
                        "-en": "crmAppointmentYear",
                        "-de": "crmAppointmentYear"
                    },
                    "crmComment": {
                        "type": "String",
                        i18n: i18n( 'patient-schema.Patient_T.crmComment.i18n' ),
                        "-en": "comment",
                        "-de": "Kommentar"
                    },
                    "crmReminder": {
                        "type": "Date",
                        i18n: i18n( 'patient-schema.Patient_T.crmReminder.i18n' ),
                        "-en": "crmReminder",
                        "-de": "crmReminder"
                    },
                    "crmReminderCalRef": {
                        "type": "String",
                        i18n: i18n( 'patient-schema.Patient_T.crmReminderCalRef.i18n' ),
                        "-en": "crmReminderCalRef",
                        "-de": "crmReminderCalRef"
                    },
                    "crmCatalogShort": {
                        "type": 'String',
                        i18n: i18n( 'patient-schema.Patient_T.crmCatalogShort.i18n' ),
                        "-en": "crmCatalogShort",
                        "-de": "crmCatalogShort"
                    },
                    activeCaseFolderId: {
                        "type": 'String',
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.Patient_T.activeCaseFolderId.i18n' ),
                        "-en": "activeCaseFolderId",
                        "-de": "activeCaseFolderId"
                    },
                    institution: {
                        "type": 'String',
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.Patient_T.activeCaseFolderId.i18n' ),
                        "-en": "Institution",
                        "-de": "Einrichtung"
                    },
                    familyDoctor: {
                        "type": 'String',
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.Patient_T.familyDoctor.i18n' ),
                        "-en": i18n( 'patient-schema.Patient_T.familyDoctor.i18n' ),
                        "-de": i18n( 'patient-schema.Patient_T.familyDoctor.i18n' )
                    },
                    edmpTypes: {
                        "type": [String],
                        "hint": i18n( 'patient-schema.Patient_T.edmpTypes.hint' ),
                        "apiv": { v: 2, queryParam: false },
                        "validate": "kbv.Patient_T_edmpTypes",
                        i18n: i18n( 'patient-schema.Patient_T.edmpTypes.i18n' ),
                        "-en": "eDMP-Programmtyp",
                        "-de": "eDMP-Programmtyp"
                    },
                    edmpNotifiedAboutStatementOfParticipationTypes: {
                        "type": [String],
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.Patient_T.edmpNotifiedAboutStatementOfParticipationTypes.i18n' ),
                        "-en": "edmpNotifiedAboutStatementOfParticipationTypes",
                        "-de": "eDMP-edmpNotifiedAboutStatementOfParticipationTypes"
                    },
                    edmpCaseNo: {
                        "type": 'String',
                        "apiv": { v: 2, queryParam: false },
                        "validate": "kbv.Patient_T_edmpCaseNo",
                        i18n: i18n( 'patient-schema.Patient_T.edmpCaseNo.i18n' ),
                        "-en": "eDMP case no.",
                        "-de": "eDMP-Fallnummer",
                        "hint": i18n( 'patient-schema.Patient_T.edmpCaseNo.hint' )
                    },
                    ehksPatientNo: {
                        "type": 'String',
                        "apiv": { v: 2, queryParam: false },
                        "validate": "kbv.Patient_T_ehksPatientNo",
                        i18n: i18n( 'patient-schema.Patient_T.ehksPatientNo.i18n' ),
                        "-en": "eHKS Patient No.",
                        "-de": "eHKS Patient Nr."
                    },
                    ehksActivated: {
                        "type": 'Boolean',
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.Patient_T.ehksActivated.i18n' ),
                        "-en": "eHKS aktiviert",
                        "-de": "eHKS aktiviert"
                    },
                    ehksDocType: {
                        "complex": "eq",
                        "type": "EhksDocType_E",
                        "validate": "kbv.Patient_T_ehksDocType",
                        "apiv": { v: 2, queryParam: false },
                        "lib": types
                    },
                    HGVPatientNo: {
                        "type": 'String',
                        "apiv": { v: 2, queryParam: false },
                        "validate": "kbv.Patient_T_HGVPatientNo",
                        i18n: i18n( 'patient-schema.Patient_T.HGVPatientNo.i18n' ),
                        "-en": "HGV Patient No.",
                        "-de": "HGV Patient Nr."
                    },
                    HGVActivated: {
                        "type": 'Boolean',
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.Patient_T.HGVActivated.i18n' ),
                        "-en": "HGV aktiviert",
                        "-de": "HGV aktiviert"
                    },
                    zervixZytologieActivated: {
                        "type": 'Boolean',
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.Patient_T.zervixZytologieActivated.i18n' ),
                        "-en": "Zervix Zytologie activated",
                        "-de": "Zervix-Zytologie aktiviert"
                    },
                    /**
                     * @deprecated since Q2 2018
                     */
                    edmpParticipationChronicHeartFailure: {
                        "type": 'Boolean',
                        "apiv": { v: 2, queryParam: false },
                        //": "kbv.Patient_T_edmpCaseNo",
                        i18n: i18n( 'patient-schema.Patient_T.edmpParticipationChronicHeartFailure.i18n' ),
                        "-en": "Modul-Teilnahme Chronische Herzinsuffizienz",
                        "-de": "Modul-Teilnahme Chronische Herzinsuffizienz",
                        "hint": i18n('patient-schema.Patient_T.edmpParticipationChronicHeartFailure.hint')
                    },
                    cardioHeartFailure: {
                        "type": 'Boolean',
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.Patient_T.cardioHeartFailure.i18n' ),
                        "-en": "Heart Failure",
                        "-de": "Herzinsuffizienz"
                    },
                    cardioCryptogenicStroke: {
                        "type": 'Boolean',
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.Patient_T.cardioCryptogenicStroke.i18n' ),
                        "-en": "Cryptogenic Stroke",
                        "-de": "Kryptogener Schlaganfall"
                    },
                    cardioCHD: {
                        "type": 'Boolean',
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.Patient_T.cardioCHD.i18n' ),
                        "-en": "Coronary heart disease",
                        "-de": "Koronare Herzkrankheit"
                    },
                    amtsActivated: {
                        "type": 'Boolean',
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.Patient_T.amtsActivated.i18n' ),
                        "-en": "Medication Check",
                        "-de": "AMTS Versorgung"
                    },
                    amtsApprovalForDataEvaluation: {
                        "type": 'Boolean',
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.Patient_T.amtsApprovalForDataEvaluation.i18n' ),
                        "-en": "Approval for automated data evaluation",
                        "-de": "Einwilligung Lernsystem"
                    },
                    amtsApprovalForReleaseFromConfidentiality: {
                        "type": 'Boolean',
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.Patient_T.amtsApprovalForReleaseFromConfidentiality.i18n' ),
                        "-en": "Approval for release from confidentiality",
                        "-de": "Schweigepflichtsentbindung erteilt"
                    },
                    amtsParticipationInSelectiveContract: {
                        "type": 'Boolean',
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.Patient_T.amtsParticipationInSelectiveContract.i18n' ),
                        "-en": "Participation in selective contract",
                        "-de": "Teilnahme Selektivvertrag"
                    },
                    amtsSelectiveContractInsuranceId: {
                        "type": "String",
                        "apiv": { v: 2, queryParam: true },
                        i18n: i18n( 'patient-schema.Patient_T.amtsSelectiveContractInsuranceId.i18n' ),
                        "rule-engine": {
                            i18n: i18n( 'patient-schema.Patient_T.amtsSelectiveContractInsuranceId.rule-i18n' )
                        }
                    },
                    invoiceRecipient: {
                        "type": 'String',
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.Patient_T.invoiceRecipient.i18n' ),
                        "-en": "Invoice Recipient",
                        "-de": "Rechnungsempfänger"
                    },
                    latestMedData: {
                        "complex": "inc",
                        "type": "LatestMedData_T",
                        "apiv": { v: 2, queryParam: false },
                        "lib": "patient",
                        i18n: i18n( 'patient-schema.Patient_T.latestMedData.i18n' ),
                        "-en": "Insurances",
                        "-de": "Kostenträger",
                        "rule-engine": {}// TODOOO flag that indicates that this is a "container" only?
                    },
                    latestLabData: {
                        "complex": "inc",
                        "type": "LatestLabData_T",
                        "apiv": { v: 2, queryParam: false },
                        "lib": "patient",
                        i18n: i18n( 'patient-schema.Patient_T.latestLabData.i18n' )
                    },
                    localPracticeId: {
                        "type": 'String',
                        i18n: i18n( 'patient-schema.Patient_T.localPracticeId.i18n' ),
                        "-en": "localPracticeId",
                        "-de": "localPracticeId"
                    },
                    locationId: {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'patient-schema.Patient_T.locationId.i18n' ),
                        "-en": "Location",
                        "-de": "Betriebsstätte"
                    },
                    scheinEmployeeIds: {
                        "type": [String],
                        i18n: i18n( 'patient-schema.Patient_T.scheinEmployeeId.i18n' ),
                        "-en": "Schein employee _ids",
                        "-de": "scheinEmployeeIds"
                    },
                    confirmedViewFromOtherLocations: {
                        "default": false,
                        "type": "Boolean",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.Patient_T.confirmedViewFromOtherLocations.i18n' ),
                        "-en": "confirmed view from other locations",
                        "-de": "Hat Einsichtnahme zugestimmt"
                    },
                    confirmedViewFromLocationIds: {
                        "type": [String],
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'patient-schema.Patient_T.confirmedViewFromLocationIds.i18n' ),
                        "-en": "confirmed view from this locations",
                        "-de": "Hat Einsichtnahme von diesen Betriebsstätten zugestimmt"
                    },
                    additionalContacts: {       //  other doctors and contacts for MOJ-9483
                        "type": ["String"],
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'patient-schema.Patient_T.additionalContacts.i18n' ),
                        "-en": "Additional contacts",
                        "-de": "Weitere Kontakte"
                    },
                    patientsFamilyMembers: {
                        "type": ["object"],
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'patient-schema.Patient_T.patientsFamilyMembers.i18n' ),
                        "-en": "Patients Family Members",
                        "-de": "Patienten Familienmitglieder"
                    },
                    "additionalFamilyMembers": {
                        "type": ["object"],
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.Patient_T.familyMembers' ),
                        "-en": "family Members",
                        "-de": "Familie/Angehörige"
                    },
                    pseudonym: {
                        "type": "String",
                        i18n: i18n( 'patient-schema.Patient_T.pseudonym.i18n' ),
                        "-en": "Pseudonym",
                        "-de": "Pseudonym"
                    },
                    "countryMode": {
                        "complex": "eq",
                        "type": "CountryMode_E",
                        "lib": "countrymode"
                    },
                    "lastChanged": {
                        "type": "Date",
                        i18n: i18n( 'UserMgmtMojit.lastChanged.i18n' ),
                        "-en": "last changed",
                        "-de": "zuletzt geändert"
                    },
                    "vekaCardNo": {
                        "type": "String",
                        "validate": "kbv._Patient_T_vekaCardNo",
                        i18n: i18n( 'person-schema.InsuranceStatus_T.vekaCardNo' ),
                        "-en": "Insured person number",
                        "-de": "Kennnummer der Versichertenkarte",
                        "-de-ch": "VEKA-Nr."
                    },
                    "ofacRawData": {
                        "type": "any",
                        i18n: i18n( 'person-schema.Person_T.ofacRawData' ),
                        "-en": "OFAC raw data",
                        "-de": "OFAC Primärdaten"
                    },
                    "insuranceWOCard": {
                        "type": "Date",
                        i18n: i18n( 'person-schema.Person_T.insuranceWOCard' ),
                        "-en": "Insurance without Card",
                        "-de": "Versicherung ohne Karte"
                    },
                    "cardStatus": {
                        "complex": "eq",
                        "type": "CardStatus_E",
                        "lib": types,
                        "-en": "cardStatus",
                        "-de": "cardStatus"
                    },
                    "isStub": {
                        "type": "Boolean",
                        i18n: i18n( 'patient-schema.Patient_T.isStub.i18n' ),
                        "-en": "isStub",
                        "-de": "isStub"
                    },
                    "treatmentNeeds": {
                        "type": "Boolean",
                        i18n: i18n( 'patient-schema.Patient_T.treatmentNeeds.i18n' ),
                        "-en": "Treatment needs",
                        "-de": "Behandlungsbedarf"
                    }
                },
                "CardStatus_E": {
                    "type": "String",
                    "list": [
                        {
                            "val": "GREEN",
                            i18n: i18n( 'patient-schema.CardStatus_E.GREEN' ),
                            "-en": "Green",
                            "-de": "Grün"
                        },
                        {
                            "val": "ORANGE",
                                i18n: i18n( 'patient-schema.CardStatus_E.ORANGE' ),
                                "-en": "Orange",
                                "-de": "Orange"
                        },
                        {
                            "val": "RED",
                                i18n: i18n( 'patient-schema.CardStatus_E.RED' ),
                                "-en": "Red",
                                "-de": "Rot"
                        }
                    ]
                },
                "LatestMedData_T": {
                    "category": {
                        "type": "String",
                        "required": false,
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.LatestMedData_T.category' ),
                        "-en": "Category",
                        "-de": "Category"
                    },
                    "type": {
                        "default": "",
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.LatestMedData_T.type' ),
                        "-en": "Type",
                        "-de": "Typ"
                    },
                    "value": {
                        "default": "",
                        "type": "Number",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.LatestMedData_T.value' ),
                        "-en": "Value",
                        "-de": "Ergebnis-Wert"
                    },
                    "textValue": {
                        "default": "",
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.LatestMedData_T.textValue' ),
                        "-en": "Text",
                        "-de": "Ergebnis-Text"
                    },
                    "unit": {
                        "default": "",
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.LatestMedData_T.unit' ),
                        "-en": "Unit",
                        "-de": "Einheit"
                    },
                    "measurementDate": {
                        "default": "",
                        "type": "Date",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.LatestMedData_T.measurementDate' ),
                        "-en": "Measurement Date",
                        "-de": "Datum"
                    },
                    "activityId": {
                        "type": "String",
                        i18n: i18n( 'patient-schema.LatestMedData_T.activityId' ),
                        "-en": "activityId",
                        "-de": "activityId"
                    },
                    "additionalData": {
                        "type": "object",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'activity-schema.MedData_T.additionalData.i18n' )
                    },
                    "cchKey": {
                        "type": "Number",
                        i18n: "cchKey"
                    },
                    "dateValue": {
                        "type": "Date",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'activity-schema.MedData_T.dateValue.i18n' ),
                        "-en": i18n( 'activity-schema.MedData_T.dateValue.i18n' ),
                        "-de": i18n( 'activity-schema.MedData_T.dateValue.i18n' )
                    },
                    "boolValue": {
                        "type": "Boolean",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'activity-schema.MedData_T.boolValue.i18n' ),
                        "-en": i18n( 'activity-schema.MedData_T.boolValue.i18n' ),
                        "-de": i18n( 'activity-schema.MedData_T.boolValue.i18n' )
                    }
                },
                "LatestLabData_T": {
                    "labTestResultText": {
                        "default": "",
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.LatestLabData_T.labTestResultText' )
                    },
                    "labResultDisplay": {
                        "default": "",
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.LatestLabData_T.labResultDisplay' )
                    },
                    "labHead": {
                        "default": "",
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.LatestLabData_T.labHead' )
                    },
                    "labReqReceived": {
                        "default": "",
                        "type": "Date",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.LatestLabData_T.labReqReceived' )
                    },
                    "labTestNotes": {
                        "default": "",
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.LatestLabData_T.labTestNotes' )
                    },
                    "labTestLabel": {
                        "default": "",
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.LatestLabData_T.labTestLabel' )
                    },
                    "labFullText": {
                        "default": "",
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.LatestLabData_T.labFullText' )
                    },
                    "limitIndicator": {
                        "default": "",
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.LatestLabData_T.limitIndicator' )
                    },
                    "isPathological": {
                        "default": false,
                        "type": "Boolean",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.LatestLabData_T.isPathological' )
                    },
                    "previousVersions": {
                        "default": 0,
                        "type": "Number",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.LatestLabData_T.previousVersions' )
                    },
                    "labMin": {
                        "default": 0,
                        "type": "Number",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.LatestLabData_T.labMin' )
                    },
                    "labMax": {
                        "default": 0,
                        "type": "Number",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.LatestLabData_T.labMax' )
                    },
                    "labTestResultVal": {
                        "default": 0,
                        "type": "Number",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.LatestLabData_T.labTestResultVal' )
                    },
                    "labTestResultUnit": {
                        "default": "",
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.LatestLabData_T.labTestResultUnit' )
                    },
                    "labNormalText": {
                        "default": "",
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.LatestLabData_T.labNormalText' )
                    }
                },
                "CareLevel_E": {
                    "type": "String",
                    "apiv": { v: 2, queryParam: false },
                    "list": [
                        {
                            "val": "NO",
                            i18n: i18n( 'patient-schema.CareLevel_E.NO' ),
                            "-en": "no",
                            "-de": "keine"
                        },
                        {
                            "val": "ZERO",
                            i18n: i18n( 'patient-schema.CareLevel_E.ZERO' ),
                            "-en": "zero",
                            "-de": "Null"
                        },
                        {
                            "val": "ONE",
                            i18n: i18n( 'patient-schema.CareLevel_E.ONE' ),
                            "-en": "one",
                            "-de": "Eins"
                        },
                        {
                            "val": "TWO",
                            i18n: i18n( 'patient-schema.CareLevel_E.TWO' ),
                            "-en": "two",
                            "-de": "Zwei"
                        },
                        {
                            "val": "THREE",
                            i18n: i18n( 'patient-schema.CareLevel_E.THREE' ),
                            "-en": "three",
                            "-de": "Drei"
                        }
                    ],
                    i18n: i18n( 'patient-schema.CareLevel_E.i18n' ),
                    "-en": "Care Level",
                    "-de": "Pflegestufe"
                },
                "EhksDocType_E": {
                    "type": "String",
                    "default": "EHKSND",
                    "apiv": {v: 2, queryParam: false},
                    "version": 1,
                    "list": [
                        {
                            "val": "EHKSND",
                            "-de": i18n( 'patient-schema.EhksDocType_E.EHKSND' ),
                            i18n: i18n( 'patient-schema.EhksDocType_E.EHKSND' ),
                            "-en": i18n( 'patient-schema.EhksDocType_E.EHKSND' )
                        },
                        {
                            "val": "EHKSD",
                            "-de": i18n( 'patient-schema.EhksDocType_E.EHKSD' ),
                            i18n: i18n( 'patient-schema.EhksDocType_E.EHKSD' ),
                            "-en": i18n( 'patient-schema.EhksDocType_E.EHKSD' )
                        }
                    ],
                    i18n: i18n( 'patient-schema.EhksDocType_E.i18n' ),
                    "-en": "Dokuementationstyp",
                    "-de": "Dokuementationstyp"
                },
                "CareDegree_E": {
                    "type": "String",
                    "apiv": { v: 2, queryParam: false },
                    "list": [
                        {
                            "val": "NO",
                            i18n: i18n( 'patient-schema.CareDegree_E.NO' ),
                            "-en": "no",
                            "-de": "keiner"
                        },
                        {
                            "val": "ONE",
                            i18n: i18n( 'patient-schema.CareDegree_E.ONE' ),
                            "-en": "one",
                            "-de": "Eins"
                        },
                        {
                            "val": "TWO",
                            i18n: i18n( 'patient-schema.CareDegree_E.TWO' ),
                            "-en": "two",
                            "-de": "Zwei"
                        },
                        {
                            "val": "THREE",
                            i18n: i18n( 'patient-schema.CareDegree_E.THREE' ),
                            "-en": "three",
                            "-de": "Drei"
                        },
                        {
                            "val": "FOUR",
                            i18n: i18n( 'patient-schema.CareDegree_E.FOUR' ),
                            "-en": "four",
                            "-de": "Vier"
                        },
                        {
                            "val": "FIVE",
                            i18n: i18n( 'patient-schema.CareDegree_E.FIVE' ),
                            "-en": "five",
                            "-de": "Fünf"
                        }
                    ],
                    i18n: i18n( 'patient-schema.CareDegree_E.i18n' ),
                    "-en": "Care Degree",
                    "-de": "Pflegegrad",
                    "rule-engine": {}
                },
                "Talk_E": {
                    "default": "MR",
                    "required": true,
                    "type": "String",
                    "apiv": { v: 2, queryParam: false },
                    "version": 1,
                    "list": [
                        {
                            "val": "MR",
                            i18n: i18n( 'patient-schema.Talk_E.MR' ),
                            "-en": "Mr",
                            "-de": "Herr"
                        },
                        {
                            "val": "MS",
                            i18n: i18n( 'patient-schema.Talk_E.MS' ),
                            "-en": "Ms",
                            "-de": "Frau"
                        },
                        {
                            "val": "NONE",
                            i18n: i18n( 'patient-schema.Talk_E.NONE' ),
                            "-en": "",
                            "-de": ""
                        }
                    ],
                    i18n: i18n( 'patient-schema.Talk_E.i18n' ),
                    "-en": "Talk",
                    "-de": "Anrede"
                },
                "Gender_E": {
                    "default": "",
                    "type": "String",
                    "required": true,
                    "apiv": { v: 2, queryParam: false },
                    "hint": "Eine Angabe zum Geschlecht des teilnehmenden Patienten ist verpflichtend.",
                    "version": 1,
                    "list": [
                        {
                            "val": "",
                            i18n: i18n( 'patient-schema.Gender_E.' ),
                            "-en": "Please choose …",
                            "-de": "Bitte wählen …"
                        },
                        {
                            "val": "MALE",
                            i18n: i18n( 'patient-schema.Gender_E.MALE' ),
                            "-en": "Male",
                            "-de": "männlich"
                        },
                        {
                            "val": "FEMALE",
                            i18n: i18n( 'patient-schema.Gender_E.FEMALE' ),
                            "-en": "Female",
                            "-de": "weiblich"
                        },
                        {
                            "val": "VARIOUS",
                            i18n: i18n( 'patient-schema.Gender_E.VARIOUS' ),
                            "-en": "Various",
                            "-de": "divers"
                        },
                        {
                            "val": "UNKNOWN",
                            i18n: i18n( 'patient-schema.Gender_E.UNKNOWN' ),
                            "-en": "Unknown",
                            "-de": "unbekannt"
                        },
                        {
                            "val": "UNDEFINED",
                            i18n: i18n( 'person-schema.Gender_E.UNDEFINED' ),
                            "-en": "Undefined",
                            "-de": "unbestimmt"
                        }
                    ],
                    i18n: i18n( 'patient-schema.Gender_E.i18n' ),
                    "-en": "Sex",
                    "-de": "Geschlecht",
                    "rule-engine": {}
                },
                "CrmTreatment_T": {
                    "title": {
                        "type": "String",
                        i18n: i18n( 'patient-schema.CrmTreatment_T.title.i18n' ),
                        "-en": "title",
                        "-de": "title"
                    },
                    "price": {
                        "default": 0,
                        "type": "Number",
                        i18n: i18n( 'patient-schema.CrmTreatment_T.price.i18n' ),
                        "-en": "price",
                        "-de": "price",
                        "validate": "validNumber"
                    },
                    "probability": {
                        "type": "String",
                        i18n: i18n( 'patient-schema.CrmTreatment_T.probability.i18n' ),
                        "-en": "probability",
                        "-de": "Wahrscheinlichkeit"
                    }
                },
                "PartnerIds_T": {
                    "partnerId": {
                        "complex": "eq",
                        "type": "PartnerIdsPartnerId_E",
                        "lib": types,
                        i18n: i18n( 'patient-schema.Patient_T.partnerIds.partnerId.i18n' )
                    },
                    "patientId": {
                        "type": "String",
                        "validate": "Patient_T_patientId",
                        "apiv": { v: 2, queryParam: true },
                        i18n: i18n( 'patient-schema.Patient_T.partnerIds.patientId.i18n' )
                    },
                    "patientNotes": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: true },
                        i18n: i18n( 'patient-schema.Patient_T.partnerIds.patientNotes.i18n' )
                    },
                    "insuranceType": {
                        "type": "String",
                        "validate": "Patient_T_insuranceType",
                        "apiv": { v: 2, queryParam: true },
                        i18n: i18n( 'patient-schema.PartnerIds_T.insuranceType.i18n' ),
                        "-en": i18n( 'patient-schema.PartnerIds_T.insuranceType.i18n' ),
                        "-de": i18n( 'patient-schema.PartnerIds_T.insuranceType.i18n' )
                    },
                    "careType": {
                        "type": "String",
                        "validate": "Patient_T_careType",
                        "apiv": { v: 2, queryParam: true },
                        i18n: i18n( 'patient-schema.PartnerIds_T.careType.i18n' )
                    },
                    "selectedType": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: true },
                        "validate": "Patient_T_cardioSelectedType",
                        i18n: i18n( 'patient-schema.PartnerIds_T.selectedType.i18n' )
                    },
                    "extra": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.PartnerIds_T.extra.i18n' )
                    },
                    "isDisabled": { // Only for Telekardio
                        "type": "Boolean",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.Patient_T.partnerIds.isDisabled.i18n' )
                    },
                    asvTeamNumbers: {
                        "type": [String],
                        "validate": "Patient_T_asvTeamNumbers",
                        i18n: i18n( 'patient-schema.Patient_T.asvTeamNumbers.i18n' ),
                        "-en": "asv team numbers",
                        "-de": "asv team numbers"
                    },
                    licenseModifier: {
                        "complex": "eq",
                        "type": "licenseModifier_E",
                        "lib": types,
                        i18n: i18n( 'patient-schema.PartnerIds_T.licenseModifier.i18n' ),
                        "-en": i18n( 'patient-schema.PartnerIds_T.licenseModifier.i18n' ),
                        "-de": i18n( 'patient-schema.PartnerIds_T.licenseModifier.i18n' )
                    }
                },
                "Devices_T": {
                    "key": {
                        "type": "String",
                        i18n: i18n( 'patient-schema.Devices_T.key.i18n' )
                    },
                    "browser": {
                        "type": "String",
                        i18n: i18n( 'patient-schema.Devices_T.browser.i18n' )
                    },
                    "timestamp": {
                        "type": "Date",
                        i18n: i18n( 'patient-schema.Devices_T.timestamp.i18n' )
                    }
                },
                "licenseModifier_E": {
                    "type": "String",
                    "rule-engine": {
                       i18n: i18n( 'patient-schema.PartnerIds_T.licenseModifier.i18n_rs' )
                    },
                    "list": [
                        {
                            "val": 'DQS',
                            i18n: 'DQS',
                            "-en": 'DQS',
                            "-de": 'DQS'
                        },
                        {
                            "val": 'DQS RS',
                            i18n: 'DQS RS',
                            "-en": 'DQS RS',
                            "-de": 'DQS RS'
                        }
                    ]
                },
                "PartnerIdsPartnerId_E": {
                    "type": "String",
                    "apiv": { v: 2, queryParam: false },
                    "list": [
                        {
                            "val": DISPATCHER.INCARE,
                            i18n: i18n( 'patient-schema.PartnerIdsPartnerId_E.INCARE.i18n' ),
                            "-en": i18n( 'patient-schema.PartnerIdsPartnerId_E.INCARE.i18n' ),
                            "-de": i18n( 'patient-schema.PartnerIdsPartnerId_E.INCARE.i18n' )
                        },
                        {
                            "val": PartnerIdsPartnerId.AP,
                            i18n: i18n( 'patient-schema.PartnerIdsPartnerId_E.AP.i18n' ),
                            "-en": i18n( 'patient-schema.PartnerIdsPartnerId_E.AP.i18n' ),
                            "-de": i18n( 'patient-schema.PartnerIdsPartnerId_E.AP.i18n' )
                        },
                        {
                            "val": PartnerIdsPartnerId.CARDIO,
                            i18n: i18n( 'patient-schema.PartnerIdsPartnerId_E.CARDIO.i18n' ),
                            "-en": i18n( 'patient-schema.PartnerIdsPartnerId_E.CARDIO.i18n' ),
                            "-de": i18n( 'patient-schema.PartnerIdsPartnerId_E.CARDIO.i18n' )
                        },
                        {
                            "val": PartnerIdsPartnerId.DOQUVIDE,
                            i18n: i18n( 'patient-schema.PartnerIdsPartnerId_E.DOQUVIDE.i18n' ),
                            "-en": i18n( 'patient-schema.PartnerIdsPartnerId_E.DOQUVIDE.i18n' ),
                            "-de": i18n( 'patient-schema.PartnerIdsPartnerId_E.DOQUVIDE.i18n' )
                        },
                        {
                            "val": PartnerIdsPartnerId.ASV,
                            i18n: i18n( 'patient-schema.PartnerIdsPartnerId_E.ASV.i18n' ),
                            "-en": i18n( 'patient-schema.PartnerIdsPartnerId_E.ASV.i18n' ),
                            "-de": i18n( 'patient-schema.PartnerIdsPartnerId_E.ASV.i18n' )
                        },
                        {
                            "val": PartnerIdsPartnerId.EDMP,
                            i18n: i18n( 'patient-schema.PartnerIdsPartnerId_E.EDMP.i18n' ),
                            "-en": i18n( 'patient-schema.PartnerIdsPartnerId_E.EDMP.i18n' ),
                            "-de": i18n( 'patient-schema.PartnerIdsPartnerId_E.EDMP.i18n' )
                        },
                        {
                            "val": PartnerIdsPartnerId.CARDIORULE,
                            i18n: i18n( 'patient-schema.PartnerIdsPartnerId_E.CARDIORULE.i18n' ),
                            "-en": i18n( 'patient-schema.PartnerIdsPartnerId_E.CARDIORULE.i18n' ),
                            "-de": i18n( 'patient-schema.PartnerIdsPartnerId_E.CARDIORULE.i18n' )
                        },
                        {
                            "val": PartnerIdsPartnerId.DQS,
                            i18n: i18n( 'patient-schema.PartnerIdsPartnerId_E.DQS.i18n' ),
                            "-en": i18n( 'patient-schema.PartnerIdsPartnerId_E.DQS.i18n' ),
                            "-de": i18n( 'patient-schema.PartnerIdsPartnerId_E.DQS.i18n' )
                        },
                        {
                            "val": PartnerIdsPartnerId.DYNAMIC,
                            i18n: i18n( 'patient-schema.PartnerIdsPartnerId_E.DYNAMIC.i18n' ),
                            "-en": i18n( 'patient-schema.PartnerIdsPartnerId_E.DYNAMIC.i18n' ),
                            "-de": i18n( 'patient-schema.PartnerIdsPartnerId_E.DYNAMIC.i18n' )
                        },
                        {
                            "val": PartnerIdsPartnerId.SELECTIVE_CARE,
                            i18n: i18n( 'patient-schema.PartnerIdsPartnerId_E.SELECTIVE_CARE.i18n' ),
                            "-en": i18n( 'patient-schema.PartnerIdsPartnerId_E.SELECTIVE_CARE.i18n' ),
                            "-de": i18n( 'patient-schema.PartnerIdsPartnerId_E.SELECTIVE_CARE.i18n' )
                        }
                    ],
                    i18n: i18n( 'patient-schema.PartnerIdsPartnerId_E.i18n' ),
                    "-en": i18n( 'patient-schema.PartnerIdsPartnerId_E.i18n' ),
                    "-de": i18n( 'patient-schema.PartnerIdsPartnerId_E.i18n' ),
                    "rule-engine": {}
                },
                "PatientPortal_T": {
                    "pin": {
                        "type": "String",
                        "-en": "pin",
                        "-de": "pin"
                    },
                    "generatedAt": {
                        "type": "date",
                        "-en": "tokenTime",
                        "-de": "tokenTime",
                        i18n: i18n( 'patient-schema.PatientPortal_T.generatedAt.i18n' )
                    },
                    "devices": {
                        "complex": "inc",
                        "type": "Devices_T",
                        "-en": "devices",
                        "-de": "devices",
                        "lib": types
                    },
                    "createPlanned": {
                        "default": false,
                        "type": "Boolean",
                        i18n: i18n( 'patient-schema.PatientPortal_T.createPlanned.i18n' ),
                        "-en": i18n( 'patient-schema.PatientPortal_T.createPlanned.i18n' ),
                        "-de": i18n( 'patient-schema.PatientPortal_T.createPlanned.i18n' )
                    },
                    "accessPRC": {
                        "default": false,
                        "type": "Boolean",
                        i18n: i18n( 'patient-schema.PatientPortal_T.accessPRC.i18n' ),
                        "-en": i18n( 'patient-schema.PatientPortal_T.accessPRC.i18n' ),
                        "-de": i18n( 'patient-schema.PatientPortal_T.accessPRC.i18n' )
                    }
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * insurance card pulled
         * @param {InsuranceStatusModel} insurance
         * @return {boolean}
         */
        function isCardSwipe( insurance ) {
            // MOJ-14319: [OK]
            return ( insurance.cardSwipe && ('PUBLIC' === insurance.type || 'PRIVATE' === insurance.type) );
        }

        /**
         * Is this the address of the insurance card
         * @param {AddressModel} address
         * @return {boolean}
         */
        function isCardAddress( address ) {
            return ( ['OFFICIAL', 'POSTBOX'].indexOf( address.kind ) > -1 );
        }

        function isASVPatient( partnerIds ) {
            return partnerIds.some( function( item ) {
                return PartnerIdsPartnerId.ASV === item.partnerId;
            } );
        }

        function getFormattedDiff( date1, date2 ) {
            var a = moment( date1 ),
                b = moment( date2 ),
                i, diff,
                diffInYears = a.diff( b, 'years' ),
                diffInMonths = a.diff( b, 'months' ),
                diffInWeeks = a.diff( b, 'weeks' ),
                diffInDays = a.diff( b, 'days' ),
                intervals = [],
                out = [];

            //handle initial day of birth
            if( 0 >= diffInYears && 0 >= diffInMonths && 0 >= diffInWeeks && 0 >= diffInDays ) {
                return 0 + i18n( 'general.dates.DAYS_SHORT' );
            }

            // age greater then 6 years - show only years
            if( 6 <= diffInYears ) {
                return diffInYears;
            }

            /*
             here we define which time intervals should be displayed
             going from the least to the biggest
             */

            //age in days greater then 0 - show days
            if( 0 < diffInDays && 14 >= diffInDays ) {
                intervals = ['days'];
            } else
            //age in weeks greater then 0 - show weeks and days
            if( 0 < diffInWeeks && 12 >= diffInWeeks ) {
                intervals = ['weeks', 'days'];
            } else
            //age in months greater then 0 - show months and weeks
            if( 0 < diffInMonths && 12 >= diffInMonths ) {
                intervals = ['months', 'weeks'];
            } else
            //age in years greater then 0 and less then 6 - show years and months
            if( 0 < diffInYears && 6 > diffInYears ) {
                intervals = ['years', 'months'];
            }

            //calculate difference between two dates in each interval
            for( i = 0; i < intervals.length; i++ ) {
                diff = a.diff( b, intervals[i] );
                b.add( diff, intervals[i] );
                //if difference is bigger then 0, then add it to the result
                if( 0 < diff ) {
                    out.push( diff + i18n( 'general.dates.' + intervals[i].toUpperCase() + '_SHORT' ) );
                }
            }
            return out.join( '+' );
        }

        function ageFromDob( dob, dateOfDeath ) {
            var moment = Y.doccirrus.commonutils.getMoment(),
                firstDate, secondDate,
                startOfToday = moment().startOf( 'day' );

            firstDate = dateOfDeath ? moment( dateOfDeath ).startOf( 'day' ) : startOfToday;
            secondDate = moment( dob ).startOf( 'day' );

            return getFormattedDiff( firstDate, secondDate ) || '';
        }

        /**
         * Class Patient Schemas -- gathers all the schemas that the Patient Schema works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,

            indexes: [
                {
                    key: {
                        "patientNo": 1
                    },
                    indexType: { collation:{ locale: 'de', numericOrdering:true} }
                },
                {
                    key: {
                        "confirmedViewFromOtherLocations": 1,
                        "confirmedViewFromLocationIds": 1
                    },
                    indexType: { sparse: true }
                },
                {
                    key: {
                        "firstname": 1
                    },
                    indexType: { collation:{ locale: 'de', strength: 2, numericOrdering:true} }
                },
                {
                    key: {
                        "lastname": 1
                    },
                    indexType: { collation:{ locale: 'de', strength: 2, numericOrdering:true} }
                }
            ],

            apiMethods: [
                //                {
                //                    name: 'get',
                //                    operationType: 'read'
                //                },
                {
                    name: 'getPopulatedPatient',
                    operationType: 'read'
                },
                {
                    name: 'post',
                    operationType: 'write'
                }
            ],

            ramlConfig: ramlConfig,

            name: NAME,

            DISPATCHER: DISPATCHER,

            PartnerIdsPartnerId: PartnerIdsPartnerId,

            CardioOptions: CardioOptions,

            /**
             * @method getPaymentMethodList
             *
             * @return {Array} returns Array of Payment Methods
             */
            getPatientRelationList: function() {
                return [
                    {
                        value: '',
                        text: ''
                    },
                    {
                        value: 'FATHER',
                        text: i18n( 'InCaseMojit.patient_detail.label.FATHER' )
                    },
                    {
                        value: 'MOTHER',
                        text: i18n( 'InCaseMojit.patient_detail.label.MOTHER' )
                    },
                    {
                        value: 'BROTHER',
                        text: i18n( 'InCaseMojit.patient_detail.label.BROTHER' )
                    },
                    {
                        value: 'SISTER',
                        text: i18n( 'InCaseMojit.patient_detail.label.SISTER' )
                    },
                    {
                        value: 'AMT',
                        text: i18n( 'InCaseMojit.patient_detail.label.AMT' )
                    }
                ];
            },

            getReadOnlyFields: function( data, options ) {
                var
                    paths = [],
                    insuranceStatus = data.insuranceStatus,
                    insuranceLocationIds,
                    addresses = data.addresses,
                    _isCardSwipe = null,
                    _isEGKSwipe = null,
                    patientNo,
                    lodash = Y.doccirrus.commonutils.isClientSide() ? _ : require( 'lodash' );

                if( data._id && options && options.userLocationIds && (data._initialConfigPatientModel.insuranceStatus && data._initialConfigPatientModel.insuranceStatus.length || data._initialConfigPatientModel.locationId) ) {
                    insuranceLocationIds = data._initialConfigPatientModel.insuranceStatus.map( function( insurance ) {
                        return insurance.locationId;
                    } ).filter( Boolean );
                    if( data._initialConfigPatientModel.locationId ) {
                        insuranceLocationIds.push( data._initialConfigPatientModel.locationId );
                    }

                    if( insuranceLocationIds.length > 0 && !lodash.intersection( insuranceLocationIds, options.userLocationIds ).length ) {
                        return ['*'];
                    }
                }


                // [P2-120] Anzeigefunktion bei korrekten Versicherungsdatensätzen
                if( Y.Lang.isArray( insuranceStatus ) && insuranceStatus.length ) {

                    Y.each( insuranceStatus, function( insurance, insuranceIndex ) {

                        if( isCardSwipe( insurance ) ) {
                            _isCardSwipe = true;
                            paths.push.apply( paths, [
                                'insuranceStatus.' + insuranceIndex + '.type',
                                'insuranceStatus.' + insuranceIndex + '.cardSwipe',
                                'insuranceStatus.' + insuranceIndex + '.insuranceNo',
                                'insuranceStatus.' + insuranceIndex + '.kvkHistoricalNo',
                                'insuranceStatus.' + insuranceIndex + '.insuranceId',
                                'insuranceStatus.' + insuranceIndex + '.insuranceName',
                                'insuranceStatus.' + insuranceIndex + '.insurancePrintName',
                                'insuranceStatus.' + insuranceIndex + '.insuranceKind',
                                'insuranceStatus.' + insuranceIndex + '.locationFeatures',
                                'insuranceStatus.' + insuranceIndex + '.fk4133',
                                'insuranceStatus.' + insuranceIndex + '.fk4110',
                                'insuranceStatus.' + insuranceIndex + '.persGroup',
                                'insuranceStatus.' + insuranceIndex + '.dmp',
                                'insuranceStatus.' + insuranceIndex + '.locationFeatures',
                                'insuranceStatus.' + insuranceIndex + '.unknownInsurance'
                            ] );
                            if( 'EGK' === insurance.cardType ) {
                                _isEGKSwipe = true;
                            }
                        }

                    } );

                    if( _isCardSwipe ) {

                        if( Y.Lang.isArray( addresses ) && addresses.length ) {
                            Y.each( addresses, function( address, addressIndex ) {
                                if( isCardAddress( address ) ) {
                                    paths.push( 'addresses.' + addressIndex );
                                }
                            } );
                        }

                        paths.push.apply( paths, [
                            'title',
                            'firstname',
                            'nameaffix',
                            'fk3120',
                            'lastname',
                            'kbvDob'
                        ] );

                        if( _isEGKSwipe ) {
                            paths.push( 'gender' );
                        }
                    }

                }

                // if the original patient data already includes patientNo then make it readonly
                if( Y.doccirrus.commonutils.isClientSide() ) {
                    patientNo = data._initialConfigPatientModel.patientNo;

                }
                // server side not readonly: TODO: [MOJ-6521] isAdmin check @ pre-process ?

                if( patientNo ) {
                    paths.push( 'patientNo' );
                }

                return paths;
            },

            /**
             * Calculate week of gestation.
             * @param {object} parameters
             * @param {string} parameters.dayOfLastMenorrhoea ISO string.
             * @returns {boolean|{week: number, days: number}} false if calculation fails else number of week.
             */
            calculateWeekOfGestation: function( parameters ) {
                var
                    dayOfLastMenorrhoea = parameters.dayOfLastMenorrhoea,
                    now = ( parameters.now && moment( parameters.now ) ) || moment(),
                    days,
                    duration,
                    totalDaysDuration,
                    numberOfWeeks,
                    numberOfDays;

                if( dayOfLastMenorrhoea ) {
                    dayOfLastMenorrhoea = moment( dayOfLastMenorrhoea ).startOf( 'day' );
                    if( dayOfLastMenorrhoea.isValid() ) {
                        days = now.startOf( 'day' ).diff( dayOfLastMenorrhoea, 'days' );
                        duration = moment.duration( days, 'days' );

                        totalDaysDuration = parseInt( duration.asDays(), 10 );

                        numberOfWeeks = Math.floor( totalDaysDuration / 7 );
                        numberOfDays = totalDaysDuration - ( numberOfWeeks * 7 );

                        return {
                            week: numberOfWeeks,
                            days: numberOfDays
                        };
                    }
                }

                return false;
            },

            /**
             * Calculate due date.
             * @param {object} parameters
             * @param {string} parameters.dayOfLastMenorrhoea ISO string.
             * @param {number} [parameters.cycleLength=AVERAGE_CONTROL_CYCLE_DAYS] defaults to average value, if not given
             * @returns {boolean|string} false if calculation fails else ISO string due date.
             */
            calculateDueDate: function( parameters ) {
                var
                    AVERAGE_CONTROL_CYCLE_DAYS = 28,
                    dayOfLastMenorrhoea = parameters.dayOfLastMenorrhoea,
                    cycleLength = Number( parameters.cycleLength ) || AVERAGE_CONTROL_CYCLE_DAYS,
                    dueDate;

                if( dayOfLastMenorrhoea ) {
                    dayOfLastMenorrhoea = moment( dayOfLastMenorrhoea ).startOf( 'day' );
                    dueDate = moment( dayOfLastMenorrhoea )
                        .add( 280 + ( cycleLength - AVERAGE_CONTROL_CYCLE_DAYS ), 'days' );

                    if( dueDate.isValid() ) {
                        return dueDate.startOf( 'day' ).toISOString();
                    }
                }

                return false;
            },

            /**
             * Calculate day of last menorrhoea.
             * @param {object} parameters
             * @param {string} parameters.dueDate ISO string.
             * @returns {boolean|string} false if calculation fails else ISO string dayOfLastMenorrhoea.
             */
            calculateDayOfLastMenorrhoea: function( parameters ) {
                var
                    AVERAGE_CONTROL_CYCLE_DAYS = 28,
                    dueDate = parameters.dueDate,
                    cycleLength = Number( parameters.cycleLength ) || AVERAGE_CONTROL_CYCLE_DAYS,
                    dayOfLastMenorrhoea;

                if( dueDate ) {
                    dueDate = moment( dueDate ).startOf( 'day' );
                    dayOfLastMenorrhoea = moment( dueDate ).subtract( 280 + ( cycleLength - AVERAGE_CONTROL_CYCLE_DAYS ), 'days' );
                    if( dayOfLastMenorrhoea.isValid() ) {
                        return dayOfLastMenorrhoea.startOf( 'day' ).toISOString();
                    }
                }

                return false;
            },

            /**
             * Returns addresses object of the specified kind.
             *
             * @param {Object} addresses
             * @param {String} kind
             *
             * @returns {Object} address
             */
            getAddressByKind: function( addresses, kind ) {
                var
                    bestAddress = null,
                    i;
                if( !Array.isArray( addresses ) ) {
                    return bestAddress;
                }

                for( i = 0; i < addresses.length; i++ ) {
                    if( addresses[i].kind === kind ) {
                        bestAddress = addresses[i];
                    }
                }

                return bestAddress;
            },

            /**
             * Returns locationId and employeeId
             *
             * @param {Object} patient
             * @param {Object} schein
             * @param {String} caseFolderType
             * @param {Object} user  user for server call
             * @param {Boolean} withoutSupport filter out support employees
             *
             * @returns {Object} location id and employee id
             */
            getDefaultLocationAndEmployeeForPatient: function( patient, schein, caseFolderType, user, withoutSupport ) {
                var
                    locationAndEmployee = {},
                    filteredEmployees,
                    isClientSide = Y.doccirrus.commonutils.isClientSide(),
                    insurance = Y.doccirrus.schemas.patient.getInsurancesByType( patient, caseFolderType )[0] || {};
                return new Promise( function( resolve, reject ) {
                    if( !patient ) {
                        // patient is required
                        return reject( {} );
                    }

                    if( schein && schein.employeeId && schein.locationId ) {
                        // get data from schein
                        locationAndEmployee.employeeId = schein.employeeId;
                        locationAndEmployee.locationId = schein.locationId;
                        return resolve( locationAndEmployee );
                    }

                    if( insurance && insurance.employeeId && insurance.locationId ) {
                        // get data from insurance
                        locationAndEmployee.employeeId = insurance.employeeId;
                        locationAndEmployee.locationId = insurance.locationId;
                        return resolve( locationAndEmployee );
                    }

                    if( 0 < patient.employees.length ) {
                        // load patient employees and get data
                        if( isClientSide ) {
                            Y.doccirrus.jsonrpc.api.employee.read( {query: { _id: { $in: patient.employees } } } )
                                .done(function( response ) {
                                    var location = patient.locationId ? patient.locationId : Y.doccirrus.schemas.location.getMainLocationId();
                                    if( response && response.data && response.data ) {
                                        filterEmployee(response.data, location);
                                    }
                                    resolve( {} );
                                });
                        } else {
                            Y.doccirrus.api.employee.get( {
                                user: user,
                                query: { _id: { $in: patient.employees } },
                                options: {},
                                callback: function getLocationName( err, result ) {
                                    if( err ) {
                                        Y.log( 'Could not get employee for patient ' + patient._id, 'debug', NAME );
                                    }
                                    var location = patient.locationId ? patient.locationId : Y.doccirrus.schemas.location.getMainLocationId();
                                    if( result ) {
                                        filterEmployee(result, location);
                                    }
                                    resolve( {} );
                                }} );
                        }
                    }

                    if( isClientSide ) {
                        // load location and get emmplees from location
                        Y.doccirrus.jsonrpc.api.location.read( {query: { _id: patient.locationId ? patient.locationId : Y.doccirrus.schemas.location.getMainLocationId() } } )
                            .done(function( response ) {
                                var location = patient.locationId ? patient.locationId : Y.doccirrus.schemas.location.getMainLocationId();
                                if( response && response.data && response.data[0] ) {
                                    filterEmployee(response.data[0].employees, location);
                                }
                                resolve( {} );
                            });
                    } else {
                        Y.doccirrus.api.location.get( {
                            user: user,
                            query: { _id: patient.locationId ? patient.locationId : Y.doccirrus.schemas.location.getMainLocationId() },
                            options: {},
                            callback: function getLocationName( err, result ) {
                                if( err ) {
                                    Y.log( 'Could not get locationName for patient ' + patient._id, 'debug', NAME );
                                }
                                var location = patient.locationId ? patient.locationId : Y.doccirrus.schemas.location.getMainLocationId();
                                if( result && result[0] ) {
                                    filterEmployee(result[0].employees, location);
                                }
                                resolve( {} );
                            }} );
                    }

                    function filterEmployee( employees, locationId ) {
                        const
                            supportGroup = Y.doccirrus.schemas.identity.userGroups.SUPPORT;

                        filteredEmployees = employees.filter( function( employee ) {
                            var
                                activePhisician = "PHYSICIAN" === employee.type && 'ACTIVE' === employee.status,
                                supportAllowed = !withoutSupport || (employee.memberOf || []).every(function( member ) { return member.group !== supportGroup; } );

                            return activePhisician && supportAllowed;
                        } );
                        if( filteredEmployees.length && filteredEmployees[0] ) {
                            locationAndEmployee.employeeId = filteredEmployees[0]._id;
                            locationAndEmployee.locationId = locationId;
                            return resolve( locationAndEmployee );
                        }
                    }
                });
            },

            /**
             * Returns communications object of the specified type.
             *
             * @param {Object} patient
             * @param {String} type
             *
             * @returns {Object} address
             */
            getCommunicationByType: function( patient, type ) {
                var com = null,
                    coms = patient.communications,
                    i;
                if( !Array.isArray( coms ) ) {
                    return com;
                }

                for( i = 0; i < coms.length; i++ ) {
                    if( coms[i].type === type ) {
                        com = coms[i];
                    }
                }

                return com;
            },

            getGHDPartnerId: function( patient, systemType ) {
                var type = systemType || Y.doccirrus.schemas.patient.DISPATCHER.INCARE,
                    patientIdPartner = patient.partnerIds.filter( function( p ) {
                    return p.partnerId === type;
                } );

                patientIdPartner = (patientIdPartner && patientIdPartner.length) ? (patientIdPartner[0].patientId || '') : '';
                return patientIdPartner;
            },

            getGHDDisabledStatus: function( patient, systemType ) {
                var type = systemType || Y.doccirrus.schemas.patient.DISPATCHER.INCARE,
                    patientIdPartner = patient.partnerIds.filter( function( p ) {
                        return p.partnerId === type;
                    } );

                return (patientIdPartner && patientIdPartner.length) ? (patientIdPartner[0].isDisabled || false) : false;
            },

            /**
             * Returns array of insuranceStatus objects that have the specified type.
             *
             * @param {Object} patient
             * @param {String} type
             *
             * @returns {Array} insurances
             */
            // MOJ-14319: check if _A insurances can be handled here
            getInsurancesByType: function( patient, type ) {
                var foundInsurances = [],
                    allInsurances = patient && patient.insuranceStatus;
                if( type && Array.isArray( allInsurances ) ) {
                    allInsurances.forEach( function( insuranceStatus ) {
                        if( insuranceStatus.type === type ) {
                            foundInsurances.push( insuranceStatus );
                        }
                    } );
                }
                return foundInsurances;
            },
            // MOJ-14319:
            getInsuranceByType: function( patient, type ) {
                var insurances = Y.doccirrus.schemas.patient.getInsurancesByType( patient, type );
                return insurances && insurances[0];
            },

            hasPublicInsuranceChanged: function( insuranceA, insuranceB ) {
                if( !insuranceA || !insuranceB ) {
                    return false;
                }

                return insuranceA.insuranceKind !== insuranceB.insuranceKind ||
                       (insuranceA.insuranceGrpId !== insuranceB.insuranceGrpId ||
                       insuranceA.costCarrierBillingSection !== insuranceB.costCarrierBillingSection) ||
                       insuranceA.persGroup !== insuranceB.persGroup;
            },

            isPublicInsurance: function( insurance ) {
                return insurance && ['PUBLIC', 'PUBLIC_A'].indexOf( insurance.type ) > -1;
            },

            isPrivateInsurance: function( insurance ) {
                return insurance && ['PRIVATE', 'PRIVATE_A'].indexOf( insurance.type ) > -1;
            },

            mapGenderKBV: function mapGenderKBV( gender ) {
                switch( gender ) {
                    case 'MALE':
                        return 'm';
                    case 'FEMALE':
                        return 'w';
                    case 'UNDEFINED':
                        return 'x';
                    case 'VARIOUS':
                        return 'd';
                    default:
                        return 'u';
                }
            },

            isASVPatient: isASVPatient,
            ageFromDob: ageFromDob
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'oop',
            'dcschemaloader',
            'doccirrus',
            'dccommonutils',
            'person-schema',
            'media-schema',
            'marker-schema',
            'employee-schema',
            'casefolder-schema',
            'severity-schema',
            'countrymode-schema'
        ]
    }
);
