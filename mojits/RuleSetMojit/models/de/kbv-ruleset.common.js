/*
 * Author: rw
 * Date: 20.02.14  09:34
 * (c) 2014, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

/**
 * Ruleset for KBV.
 *
 * fields entries may have the following values:
 *
 * "schema": e.g. "patient", the schema name that we are referring to (mixed, i.e. with all possible children included)
 * "st": e.g. "Patient_T", the type name (not sure if this will make it into the final version of the definition)
 * "path": e.g. "dob", the field name as in the UML data model
 *              For nested paths (e.g. addresses.houseno ),  you can either use the short-hand  'houseno'  , or
 *              a fully qualified path (where array index is ignored), i.e.  'addresses.houseno'  (NOT including index.
 *              Do NOT do this: 'addresses[x].houseno'  will NOT work)
 * "type": e.g. "Date",  the content type (not sure if this will make it into the final version of the definition)
 * "validate":  a validate function that must succeed in order to write data (hard validation)
 * "recommend": a validate function that need not succeed in order to write data (soft validation)
 * "fieldCode": e.g. "4103", the KBV code for this field
 * "ruleId": e.g. [573,872,678] the KBV rules
 *
 */

YUI.add( 'kbv-ruleset', function( Y, NAME ) {

        var
            rules = {
                "_version": 1.0,
                "_name": "KBV",
                "_meta": "Some more machine readable metadata.",
                "_country": "D",
                "fields": {
                    //======================PRACTICE========================
                    location: [
                        {"fieldCode": "0201", "path": "commercialNo", "st": "Location_T", "schema": "location", "schemaPath":"location.commercialNo", "ruleIds": []},
                        {"fieldCode": "0205", "path": "street", "st": "Address_T", "schema": "location", "schemaPath":"location.street", "ruleIds": []},
                        {"fieldCode": "0205", "path": "houseno", "st": "Address_T", "schema": "location", "schemaPath":"location.houseno", "ruleIds": []},
                        {"fieldCode": "0215", "path": "zip", "st": "Address_T", "schema": "location", "schemaPath":"location.zip", "ruleIds": []},
                        {"fieldCode": "9102", "path": "destination", "st": "Address_T", "schema": "location", "schemaPath":"kbvlog.destination", "ruleIds": []},
                        {"fieldCode": "0216", "path": "city", "st": "Address_T", "schema": "location", "schemaPath":"location.city", "ruleIds": []},
                        {"fieldCode": "", "path": "postbox", "st": "Address_T", "schema": "location", "schemaPath":"location.postbox", "ruleIds": []},
                        {"fieldCode": "", "path": "kind", "st": "Address_T", "schema": "location", "schemaPath":"location.kind", "ruleIds": []},
                        {"fieldCode": "", "path": "country", "st": "Address_T", "schema": "location", "schemaPath":"location.country", "ruleIds": []},
                        {"fieldCode": "0203", "path": "locname", "st": "Location_T", "schema": "location", "schemaPath":"location.locname", "ruleIds": []},
                        {"fieldCode": "", "path": "type", "st": "Communication_T", "schema": "location", "schemaPath":"location.type", "ruleIds": []},
                        {"fieldCode": "", "path": "preferred", "st": "Communication_T", "schema": "location", "schemaPath":"location.preferred", "ruleIds": []},
                        {"fieldCode": "0208", "path": "phone", "st": "Communication_T", "schema": "location", "schemaPath":"location.phone", "ruleIds": []},
                        {"fieldCode": "0209", "path": "fax", "st": "Communication_T", "schema": "location", "schemaPath":"location.fax", "ruleIds": []},
                        {"fieldCode": "0218", "path": "email", "st": "Communication_T", "schema": "location", "schemaPath":"location.email", "ruleIds": []},
                        {"fieldCode": "", "path": "_id", "st": "Location_T", "schema": "location", "schemaPath":"location._id", "ruleIds": []}
                    ],
                    //======================ACTIVITY========================
                    activity: [
                        {"fieldCode": "", "path": "__additional", "st": "", "schema": "", "schemaPath":"", "ruleIds": []},
                        {"fieldCode": "", "path": "patient.insuranceStatus", "st": "Patient_T", "schema": "patient", "schemaPath":"patient.insuranceStatus", "ruleIds": []},
                        {"fieldCode": "4104", "path": "patient.insuranceStatus.insuranceGrpId", "st": "InsuranceStatus_T", "schema": "patient.insuranceStatus", "schemaPath":"patient.insuranceStatus.insuranceGrpId", "ruleIds": []},
                        {"fieldCode": "3004", "path": "patient.insuranceStatus.cardTypeGeneration", "st": "InsuranceStatus_T", "schema": "patient.insuranceStatus", "schemaPath":"patient.insuranceStatus.cardTypeGeneration", "ruleIds": []},
                        {"fieldCode": "9999", "path": "patient.insuranceStatus.cardType", "st": "InsuranceStatus_T", "schema": "patient.insuranceStatus", "schemaPath":"patient.insuranceStatus.cardType", "ruleIds": []},
                        {"fieldCode": "4108", "path": "patient.insuranceStatus.fk4108", "st": "InsuranceStatus_T", "schema": "patient.insuranceStatus", "schemaPath":"patient.insuranceStatus.fk4108", "ruleIds": []},
                        {"fieldCode": "3006", "path": "patient.insuranceStatus.cdmVersion", "st": "InsuranceStatus_T", "schema": "patient.insuranceStatus", "schemaPath":"patient.insuranceStatus.cdmVersion", "ruleIds": []},
                        {"fieldCode": "4108", "path": "patient.insuranceStatus.mobileEgkId", "st": "InsuranceStatus_T", "schema": "patient.insuranceStatus", "schemaPath":"patient.insuranceStatus.mobileEgkId", "ruleIds": []},
                        {"fieldCode": "4133", "path": "patient.insuranceStatus.fk4133", "st": "InsuranceStatus_T", "schema": "patient.insuranceStatus", "schemaPath":"patient.insuranceStatus.fk4133", "ruleIds": []},
                        {"fieldCode": "4110", "path": "patient.insuranceStatus.fk4110", "st": "InsuranceStatus_T", "schema": "patient.insuranceStatus", "schemaPath":"patient.insuranceStatus.fk4110", "ruleIds": []},
                        {"fieldCode": "4111", "path": "patient.insuranceStatus.insuranceId", "st": "InsuranceStatus_T", "schema": "patient.insuranceStatus", "schemaPath":"patient.insuranceStatus.insuranceId", "ruleIds": []},
                        {"fieldCode": "3119", "path": "patient.insuranceStatus.insuranceNo", "st": "InsuranceStatus_T", "schema": "patient.insuranceStatus", "schemaPath":"patient.insuranceStatus.insuranceNo", "ruleIds": []},
                        {"fieldCode": "3105", "path": "patient.insuranceStatus.kvkHistoricalNo", "st": "InsuranceStatus_T", "schema": "patient.insuranceStatus", "schemaPath":"patient.insuranceStatus.kvkHistoricalNo", "ruleIds": []},
                        {"fieldCode": "4109", "path": "patient.insuranceStatus.cardSwipe", "st": "InsuranceStatus_T", "schema": "patient.insuranceStatus", "schemaPath":"patient.insuranceStatus.cardSwipe", "ruleIds": []},
                        {"fieldCode": "xxxx", "path": "patient.insuranceStatus.policyHolder", "st": "InsuranceStatus_T", "schema": "patient.insuranceStatus", "schemaPath":"patient.insuranceStatus.policyHolder", "ruleIds": []},
                        {"fieldCode": "4121", "path": "patient.insuranceStatus.feeSchedule", "st": "InsuranceStatus_T", "schema": "patient.insuranceStatus", "schemaPath":"patient.insuranceStatus.feeSchedule", "ruleIds": []},
                        {"fieldCode": "3116", "path": "patient.insuranceStatus.kv", "st": "InsuranceStatus_T", "schema": "patient.insuranceStatus", "schemaPath":"patient.insuranceStatus.kv", "ruleIds": []},
                        {"fieldCode": "3116", "path": "patient.insuranceStatus.locationFeatures", "st": "InsuranceStatus_T", "schema": "patient.insuranceStatus", "schemaPath":"patient.insuranceStatus.locationFeatures", "ruleIds": []},
                        {"fieldCode": "3108", "path": "patient.insuranceStatus.insuranceKind", "st": "InsuranceStatus_T", "schema": "patient.insuranceStatus", "schemaPath":"patient.insuranceStatus.insuranceKind", "ruleIds": []},
                        {"fieldCode": "4131", "path": "patient.insuranceStatus.persGroup", "st": "InsuranceStatus_T", "schema": "patient.insuranceStatus", "schemaPath":"patient.insuranceStatus.persGroup", "ruleIds": []},
                        {"fieldCode": "4132", "path": "patient.insuranceStatus.dmp", "st": "InsuranceStatus_T", "schema": "patient.insuranceStatus", "schemaPath":"patient.insuranceStatus.dmp", "ruleIds": []},
                        {"fieldCode": "4134", "path": "patient.insuranceStatus.insuranceName", "st": "InsuranceStatus_T", "schema": "patient.insuranceStatus", "schemaPath":"patient.insuranceStatus.insuranceName", "ruleIds": []},
                        {"fieldCode": "", "path": "patient.affiliates", "st": "Patient_T", "schema": "patient", "schemaPath":"patient.affiliates", "ruleIds": []},
                        {"fieldCode": "", "path": "patient.images", "st": "Patient_T", "schema": "patient", "schemaPath":"patient.images", "ruleIds": []},
                        {"fieldCode": "", "path": "patient.primaryDoc", "st": "Patient_T", "schema": "patient", "schemaPath":"patient.primaryDoc", "ruleIds": []},
                        {"fieldCode": "", "path": "patient.physicians", "st": "Patient_T", "schema": "patient", "schemaPath":"patient.physicians", "ruleIds": []},
                        {"fieldCode": "", "path": "patient.markers", "st": "Patient_T", "schema": "patient", "schemaPath":"patient.markers", "ruleIds": []},
                        {"fieldCode": "", "path": "patient.pin", "st": "Patient_T", "schema": "patient", "schemaPath":"patient.pin", "ruleIds": []},
                        {"fieldCode": "", "path": "patient.pin2", "st": "Patient_T", "schema": "patient", "schemaPath":"patient.pin2", "ruleIds": []},
                        {"fieldCode": "", "path": "patient.alternativeId", "st": "Patient_T", "schema": "patient", "schemaPath":"patient.alternativeId", "ruleIds": []},
                        {"fieldCode": "", "path": "patient.socialInsuranceNumber", "st": "Patient_T", "schema": "patient", "schemaPath":"patient.socialInsuranceNumber", "ruleIds": []},
                        {"fieldCode": "", "path": "patient.insuranceNotes", "st": "Patient_T", "schema": "patient", "schemaPath":"patient.insuranceNotes", "ruleIds": []},
                        {"fieldCode": "", "path": "patient.talk", "st": "Person_T", "schema": "patient", "schemaPath":"patient.talk", "ruleIds": []},
                        {"fieldCode": "3100", "path": "patient.nameaffix", "st": "Person_T", "schema": "patient", "schemaPath":"patient.nameaffix", "ruleIds": []},
                        {"fieldCode": "3120", "path": "patient.fk3120", "st": "Person_T", "schema": "patient", "schemaPath":"patient.fk3120", "ruleIds": []},
                        {"fieldCode": "3101", "path": "patient.firstname", "st": "Person_T", "schema": "patient", "schemaPath":"patient.firstname", "ruleIds": []},
                        {"fieldCode": "3102", "path": "patient.middlename", "st": "Person_T", "schema": "patient", "schemaPath":"patient.middlename", "ruleIds": []},
                        {"fieldCode": "3104", "path": "patient.title", "st": "Person_T", "schema": "patient", "schemaPath":"patient.title", "ruleIds": []},
                        {"fieldCode": "", "path": "patient.lastname", "st": "Person_T", "schema": "patient", "schemaPath":"patient.lastname", "ruleIds": []},
                        {"fieldCode": "", "path": "patient.civilStatus", "st": "Person_T", "schema": "patient", "schemaPath":"patient.civilStatus", "ruleIds": []},
                        {"fieldCode": "", "path": "patient.comment", "st": "Person_T", "schema": "patient", "schemaPath":"patient.comment", "ruleIds": []},
                        {"fieldCode": "3110", "path": "patient.gender", "st": "Person_T", "schema": "patient", "schemaPath":"patient.gender", "ruleIds": []},
                        {"fieldCode": "", "path": "patient.lang", "st": "Person_T", "schema": "patient", "schemaPath":"patient.lang", "ruleIds": []},
                        {"fieldCode": "3103", "path": "patient.kbvDob", "st": "Person_T", "schema": "patient", "schemaPath":"patient.kbvDob", "ruleIds": []},
                        {"fieldCode": "", "path": "patient.jobTitle", "st": "Person_T", "schema": "patient", "schemaPath":"patient.jobTitle", "ruleIds": []},
                        {"fieldCode": "", "path": "patient.workingAt", "st": "Person_T", "schema": "patient", "schemaPath":"patient.workingAt", "ruleIds": []},
                        {"fieldCode": "", "path": "patient.workingAtRef", "st": "Person_T", "schema": "patient", "schemaPath":"patient.workingAtRef", "ruleIds": []},
                        {"fieldCode": "", "path": "patient.accounts", "st": "Person_T", "schema": "patient", "schemaPath":"patient.accounts", "ruleIds": []},
                        {"fieldCode": "", "path": "patient.base", "st": "Person_T", "schema": "patient", "schemaPath":"patient.base", "ruleIds": []},
                        {"fieldCode": "xxx", "path": "patient.sendPatientReceipt", "st": "Person_T", "schema": "patient", "schemaPath":"patient.sendPatientReceipt", "ruleIds": []},
                        {"fieldCode": "3112", "path": "zip", "st": "Address_T", "schema": "patient.addresses", "schemaPath":"patient.addresses.zip", "ruleIds": []},
                        {"fieldCode": "", "path": "addresses", "st": "Address_T", "schema": "patient.addresses", "schemaPath":"patient.addresses", "ruleIds": []},
                        {"fieldCode": "3107", "path": "street", "st": "Address_T", "schema": "patient.addresses", "schemaPath":"patient.addresses.street", "ruleIds": []},
                        {"fieldCode": "3115", "path": "addon", "st": "Address_T", "schema": "patient.addresses", "schemaPath":"patient.addresses.addon", "ruleIds": []},
                        {"fieldCode": "3109", "path": "houseno", "st": "Address_T", "schema": "patient.addresses", "schemaPath":"patient.addresses.houseno", "ruleIds": []},
                        {"fieldCode": "3113", "path": "city", "st": "Address_T", "schema": "patient.addresses", "schemaPath":"patient.addresses.city", "ruleIds": []},
                        {"fieldCode": "3114", "path": "kind", "st": "Address_T", "schema": "patient.addresses", "schemaPath":"patient.addresses.kind", "ruleIds": []},
                        {"fieldCode": "3114", "path": "countryCode", "st": "Address_T", "schema": "patient.addresses", "schemaPath":"patient.addresses.countryCode", "ruleIds": []},
                        {"fieldCode": "3123", "path": "postbox", "st": "Address_T", "schema": "patient.addresses", "schemaPath":"patient.addresses.postbox", "ruleIds": []},
                        {"fieldCode": "", "path": "base", "st": "root", "schemaPath":"", "ruleIds": []},
                        {"fieldCode": "", "path": "docId", "st": "Attachment_T", "schema": "activity", "schemaPath":"activity.docId", "ruleIds": []},
                        {"fieldCode": "", "path": "icds", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.icds", "ruleIds": []},
                        {"fieldCode": "", "path": "attachments", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.attachments", "ruleIds": []},
                        {"fieldCode": "", "path": "actType", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.actType", "ruleIds": []},
                        {"fieldCode": "", "path": "diagnosisType", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.diagnosisType", "ruleIds": []},
                        {"fieldCode": "5000", "path": "timestamp", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.timestamp", "ruleIds": []},
                        {"fieldCode": "", "path": "caseNo", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.caseNo", "ruleIds": []},
                        {"fieldCode": "", "path": "patient", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.patientId", "ruleIds": []},
                        {"fieldCode": "", "path": "employeeId", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.employeeId", "ruleIds": []},
                        {"fieldCode": "5099", "path": "employeeId.officialNo", "st": "Employee_T", "schema": "employee", "schemaPath":"employee.officialNo", "ruleIds": []},
                        {"fieldCode": "", "path": "employeeId.firstname", "st": "Activity_T", "schema": "employee", "schemaPath":"employee.firstname", "ruleIds": []},
                        {"fieldCode": "", "path": "employeeId.lastname", "st": "Activity_T", "schema": "employee", "schemaPath":"employee.lastname", "ruleIds": []},
                        {"fieldCode": "", "path": "employeeId.specialities", "st": "Activity_T", "schema": "employee", "schemaPath":"employee.specialities", "ruleIds": []},
                        {"fieldCode": "", "path": "start", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.start", "ruleIds": []},
                        {"fieldCode": "", "path": "end", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.end", "ruleIds": []},
                        //{"fieldCode": "4106", "path": "kbvCostType", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.kbvCostType", "ruleIds": []},
                        {"fieldCode": "4106", "path": "patient.insuranceStatus.costCarrierBillingSection", "st": "InsuranceStatus_T", "schema": "patient.insuranceStatus", "schemaPath":"patient.insuranceStatus.costCarrierBillingSection", "ruleIds": []},
                        {"fieldCode": "4122", "path": "scheinBillingArea", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.scheinBillingArea", "ruleIds": []},
                        {"fieldCode": "", "path": "where", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.where", "ruleIds": []},
                        {"fieldCode": "", "path": "locationId", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.locationId", "ruleIds": []},
                        {"fieldCode": "5098", "path": "commercialNo", "st": "Location_T", "schema": "location", "schemaPath":"kbvlog.commercialNo", "ruleIds": [], validate: "bsnr"}, // BSNR
                        {"fieldCode": "", "path": "long", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.long", "ruleIds": []},
                        {"fieldCode": "", "path": "schedule", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.schedule", "ruleIds": []},
                        {"fieldCode": "", "path": "external", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.external", "ruleIds": []},
                        {"fieldCode": "", "path": "externalRef", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.externalRef", "ruleIds": []},
                        {"fieldCode": "", "path": "catalog", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.catalog", "ruleIds": []},
                        {"fieldCode": "", "path": "catalogRef", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.catalogRef", "ruleIds": []},
                        {"fieldCode": "", "path": "price", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.price", "ruleIds": []},
                        {"fieldCode": "", "path": "unit", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.unit", "ruleIds": []},
                        {"fieldCode": "", "path": "content", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.content", "ruleIds": []},
                        {"fieldCode": "", "path": "comment", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.comment", "ruleIds": []},
                        {"fieldCode": "", "path": "status", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.status", "ruleIds": []},
                        {"fieldCode": "6006", "path": "explanations", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.explanations", "ruleIds": []},
                        {"fieldCode": "5001", "path": "code", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.code", "ruleIds": []},
                        {"fieldCode": "5006", "path": "daySeparation", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.daySeparation", "ruleIds": []},
                        {"fieldCode": "6001", "path": "code", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.code", "ruleIds": []},
                        {"fieldCode": "", "path": "editor", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.editor", "ruleIds": []},
                        {"fieldCode": "", "path": "editor.name", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.editor.name", "ruleIds": []},
                        {"fieldCode": "", "path": "activities", "st": "Activity_T", "schema": "activity", "type": ["String"], "schemaPath":"activity.activities", "ruleIds": []},
                        {"fieldCode": "", "path": "formId", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.formId", "ruleIds": []},
                        {"fieldCode": "", "path": "formVersion", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.formVersion", "ruleIds": []},
                        {"fieldCode": "6003", "path": "diagnosisCert", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.diagnosisCert", "ruleIds": []},
                        //{"fieldCode": "6003", "path": "icds.diagnosisCert", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.icds.diagnosisCert", "ruleIds": []},
                        {"fieldCode": "8000", "path": "scheinType", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.scheinType", "ruleIds": []},
                        {"fieldCode": "4205", "path": "scheinOrder", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.scheinOrder", "ruleIds": []},
                        {"fieldCode": "4207", "path": "scheinDiagnosis", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.scheinDiagnosis", "ruleIds": []},
                        {"fieldCode": "4208", "path": "scheinFinding", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.scheinFinding", "ruleIds": []},
                        {"fieldCode": "4239", "path": "scheinSubgroup", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.scheinSubgroup", "ruleIds": []},
                        {"fieldCode": "4218", "path": "scheinEstablishment", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.scheinEstablishment", "ruleIds": []},
                        {"fieldCode": "4242", "path": "scheinRemittor", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.scheinRemittor", "ruleIds": []},
                        {"fieldCode": "4220", "path": "scheinSpecialisation", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.scheinSpecialisation", "ruleIds": []},
                        {"fieldCode": "4243", "path": "scheinNextTherapist", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.scheinNextTherapist", "ruleIds": []},
                        {"fieldCode": "4233", "path": "scheinClinicalTreatmentFrom", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.scheinClinicalTreatmentFrom", "ruleIds": []},
                        {"fieldCode": "4233", "path": "scheinClinicalTreatmentTo", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.scheinClinicalTreatmentTo", "ruleIds": []},
                        {"fieldCode": "4221", "path": "scheinSlipMedicalTreatment", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.scheinSlipMedicalTreatment", "ruleIds": []},
                        {"fieldCode": "3003", "path": "_id", "st": "Activity_T", "schema": "activity", "schemaPath":"activity._id", "ruleIds": []},
                        {"fieldCode": "4102", "path": "timestamp", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.timestamp", "ruleIds": []},
                        {"fieldCode": "4123", "path": "fk4123", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk4123", "ruleIds": []},
                        {"fieldCode": "4124", "path": "fk4124", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk4124", "ruleIds": []},
                        {"fieldCode": "4125", "path": "fk4125from", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk4125from", "ruleIds": []},
                        {"fieldCode": "4125", "path": "fk4125to", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk4125to", "ruleIds": []},
                        {"fieldCode": "4126", "path": "fk4126", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk4126", "ruleIds": []},
                        {"fieldCode": "4206", "path": "fk4206", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk4206", "ruleIds": []},
                        {"fieldCode": "4234", "path": "fk4234", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk4234", "ruleIds": []},
                        {"fieldCode": "4235", "path": "fk4235", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk4235Set.fk4235", "ruleIds": []},
                        {"fieldCode": "4236", "path": "fk4236", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk4236", "ruleIds": []},
                        {"fieldCode": "4204", "path": "fk4204", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk4204", "ruleIds": []},
                        {"fieldCode": "4202", "path": "fk4202", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk4202", "ruleIds": []},
                        {"fieldCode": "4219", "path": "fk4219", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk4219", "ruleIds": []},
                        {"fieldCode": "4217", "path": "fk4217", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk4217", "ruleIds": []},
                        {"fieldCode": "4241", "path": "fk4241", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk4241", "ruleIds": []},
                        {"fieldCode": "4244", "path": "fk4244", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk4235Set.fk4244Set.fk4244", "ruleIds": []},
                        {"fieldCode": "4245", "path": "fk4245", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk4235Set.fk4244Set.fk4245", "ruleIds": []},
                        {"fieldCode": "4246", "path": "fk4246", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk4235Set.fk4244Set.fk4246", "ruleIds": []},
                        {"fieldCode": "4247", "path": "fk4247", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk4235Set.fk4247", "ruleIds": []},
                        {"fieldCode": "4235Set", "path": "fk4235Set", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk4235Set", "ruleIds": []},
                        {"fieldCode": "4244Set", "path": "fk4244Set", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk4235Set.fk4244Set", "ruleIds": []},
                        {"fieldCode": "5002", "path": "fk5002", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk5002", "ruleIds": []},
                        {"fieldCode": "5005", "path": "fk5005", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk5005", "ruleIds": []},
                        {"fieldCode": "5008", "path": "fk5008", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk5008", "ruleIds": []},
                        {"fieldCode": "5012Set", "path": "fk5012Set", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk5012Set", "ruleIds": []},
                        {"fieldCode": "5011Set", "path": "fk5011Set", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk5012Set.fk5011Set", "ruleIds": []},
                        {"fieldCode": "5012", "path": "fk5012", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk5012Set.fk5012", "ruleIds": []},
                        {"fieldCode": "5011", "path": "fk5011", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk5012Set.fk5011Set.fk5011", "ruleIds": []},
                        {"fieldCode": "5013", "path": "fk5013", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk5013", "ruleIds": []},
                        {"fieldCode": "5015", "path": "fk5015", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk5015", "ruleIds": []},
                        {"fieldCode": "5016", "path": "fk5016", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk5016", "ruleIds": []},
                        {"fieldCode": "5017", "path": "fk5017", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk5017", "ruleIds": []},
                        {"fieldCode": "5018", "path": "fk5018", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk5018", "ruleIds": []},
                        {"fieldCode": "5019", "path": "fk5019", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk5019", "ruleIds": []},
                        {"fieldCode": "5020Set", "path": "fk5020Set", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk5020Set", "ruleIds": []},
                        {"fieldCode": "5020", "path": "fk5020", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk5020Set.fk5020", "ruleIds": []},
                        {"fieldCode": "5021", "path": "fk5021", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk5020Set.fk5021", "ruleIds": []},
                        {"fieldCode": "5023", "path": "fk5023", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk5023", "ruleIds": []},
                        {"fieldCode": "5024", "path": "fk5024", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk5024", "ruleIds": []},
                        {"fieldCode": "5025", "path": "fk5025", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk5025", "ruleIds": []},
                        {"fieldCode": "5026", "path": "fk5026", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk5026", "ruleIds": []},
                        {"fieldCode": "5034", "path": "fk5034", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk5034", "ruleIds": []},
                        {"fieldCode": "5035Set", "path": "fk5035Set", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk5035Set", "ruleIds": []},
                        {"fieldCode": "5035", "path": "fk5035", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk5035Set.fk5035", "ruleIds": []},
                        {"fieldCode": "5036Set", "path": "fk5036Set", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk5036Set", "ruleIds": []},
                        {"fieldCode": "5036", "path": "fk5036", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk5036Set.fk5036", "ruleIds": []},
                        {"fieldCode": "5041", "path": "fk5041", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk5035Set.fk5041", "ruleIds": []},
                        {"fieldCode": "5037", "path": "fk5037", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk5037", "ruleIds": []},
                        {"fieldCode": "5038", "path": "fk5038", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk5038", "ruleIds": []},
                        {"fieldCode": "5040", "path": "fk5040", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk5040", "ruleIds": []},
                        {"fieldCode": "5042Set", "path": "fk5042Set", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk5042Set", "ruleIds": []},
                        {"fieldCode": "5042", "path": "fk5042", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk5042Set.fk5042", "ruleIds": []},
                        {"fieldCode": "5043", "path": "fk5043", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk5042Set.fk5043", "ruleIds": []},
                        {"fieldCode": "5044", "path": "fk5044", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk5044", "ruleIds": []},
                        {"fieldCode": "5070", "path": "fk5070", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk5070", "ruleIds": []},
                        {"fieldCode": "5071", "path": "fk5071", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk5071", "ruleIds": []},
                        {"fieldCode": "5072", "path": "fk5072", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk5072", "ruleIds": []},
                        {"fieldCode": "5073", "path": "fk5073", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.fk5073", "ruleIds": []},
                        {"fieldCode": "3116", "path": "locationFeatures", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.locationFeatures", "ruleIds": []},
                        {"fieldCode": "6004", "path": "diagnosisSite", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.diagnosisSite", "ruleIds": []},
                        {"fieldCode": "6008", "path": "diagnosisDerogation", "st": "Activity_T", "schema": "activity", "schemaPath":"activity.diagnosisDerogation", "ruleIds": []}
                    ],
                    //======================EMPLOYEE========================
                    employee: [
                        {"fieldCode": "", "path": "type", "st": "Employee_T", "schema": "employee", "schemaPath":"employee.type", "ruleIds": []},
                        {"fieldCode": "", "path": "from", "st": "Employee_T", "schema": "employee", "schemaPath":"employee.from", "ruleIds": []},
                        {"fieldCode": "", "path": "to", "st": "Employee_T", "schema": "employee", "schemaPath":"employee.to", "ruleIds": []},
                        {"fieldCode": "0212", "path": "officialNo", "st": "Employee_T", "schema": "employee", "schemaPath":"employee.officialNo", "ruleIds": []},
                        {"fieldCode": "", "path": "department", "st": "Employee_T", "schema": "employee", "schemaPath":"employee.department", "ruleIds": []},
                        {"fieldCode": "", "path": "employeeNo", "st": "Employee_T", "schema": "employee", "schemaPath":"employee.employeeNo", "ruleIds": []},
                        {"fieldCode": "", "path": "talk", "st": "Person_T", "schema": "employee", "schemaPath":"employee.talk", "ruleIds": []},
                        {"fieldCode": "0219", "path": "title", "st": "Person_T", "schema": "employee", "schemaPath":"employee.title", "ruleIds": []},
                        {"fieldCode": "0220", "path": "firstname", "st": "Person_T", "schema": "employee", "schemaPath":"employee.firstname", "ruleIds": []},
                        {"fieldCode": "", "path": "middlename", "st": "Person_T", "schema": "employee", "schemaPath":"employee.middlename", "ruleIds": []},
                        {"fieldCode": "0221", "path": "nameaffix", "st": "Person_T", "schema": "employee", "schemaPath":"employee.nameaffix", "ruleIds": []},
                        {"fieldCode": "0211", "path": "lastname", "st": "Person_T", "schema": "employee", "schemaPath":"employee.lastname", "ruleIds": []},
                        {"fieldCode": "", "path": "civilStatus", "st": "Person_T", "schema": "employee", "schemaPath":"employee.civilStatus", "ruleIds": []},
                        {"fieldCode": "xx", "path": "specialities", "st": "Person_T", "schema": "employee", "schemaPath":"employee.specialities", "ruleIds": []},
                        {"fieldCode": "", "path": "comment", "st": "Person_T", "schema": "employee", "schemaPath":"employee.comment", "ruleIds": []},
                        {"fieldCode": "", "path": "gender", "st": "Person_T", "schema": "employee", "schemaPath":"employee.gender", "ruleIds": []},
                        {"fieldCode": "", "path": "lang", "st": "Person_T", "schema": "employee", "schemaPath":"employee.lang", "ruleIds": []},
                        {"fieldCode": "", "path": "dob", "st": "Person_T", "schema": "employee", "schemaPath":"employee.dob", "ruleIds": []},
                        {"fieldCode": "", "path": "jobTitle", "st": "Person_T", "schema": "employee", "schemaPath":"employee.jobTitle", "ruleIds": []},
                        {"fieldCode": "", "path": "workingAt", "st": "Person_T", "schema": "employee", "schemaPath":"employee.workingAt", "ruleIds": []},
                        {"fieldCode": "", "path": "workingAtRef", "st": "Person_T", "schema": "employee", "schemaPath":"employee.workingAtRef", "ruleIds": []},
                        {"fieldCode": "", "path": "accounts", "st": "Person_T", "schema": "employee", "schemaPath":"employee.accounts", "ruleIds": []},
                        {"fieldCode": "", "path": "base", "st": "Person_T", "schema": "employee", "schemaPath":"employee.base", "ruleIds": []},
                        {"fieldCode": "xxxx", "path": "_id", "st": "Person_T", "schema": "employee", "schemaPath":"employee._id", "ruleIds": []}
                    ]
                }
            };
        NAME = 'kbv';//Y.doccirrus.schemaloader.deriveRuleSetName( NAME );

        /**
         *      
         * logic that inspects the data and
         * any other information (also async)
         * then returns an answer, whether this
         * is the right model for this data or
         * not.
         * @param data
         * @param callback
         * @returns {string}
         */
        function appliesTo( data, callback ) {
            var
                result = false;
            if( data && 'object' === typeof data ) {
                // rules decide what kind of data we are dealing with
                // make the decision, one could also explicitly ask the type...
                // MOJ-1291: bad country code...
                if(data.coname && data.addresses[0] && "Deutschland" === data.addresses[0].country ) {
                    result = true;
                } else if( data.insuranceStatus && data.insuranceStatus[0] && "PUBLIC" === data.insuranceStatus[0].insuranceType ) {
                    result = true;
                }
            }
            if( callback ) {
                callback( null, result );
            }
            return result;
        }

        function getFieldsByCode( fieldCode ) {
            var fields = [],
                tmp;
            Y.Object.each(rules.fields, function( fieldType ) {
                tmp = Y.Array.filter(fieldType, function( field ) {
                    return field.fieldCode === fieldCode;
                });
                fields = fields.concat(tmp);
            });
            return fields;
        }

        /**
         * return schemas linked to fieldCode
         * @uses {schemaloader}
         * @param {String} fieldCode
         * @return {array}
         */
        function getSchemaByCode( fieldCode ) {
            return Y.Array.map( getFieldsByCode( fieldCode ), function( rule ) {
                return Y.doccirrus.schemaloader.getSchemaByName( rule.schemaPath );
            } );
        }

        Y.namespace( 'doccirrus.ruleset' )[NAME] = {

            definition: rules,

            appliesTo: appliesTo,

            getFieldsByCode: getFieldsByCode,

            getSchemaByCode: getSchemaByCode,

            testRules: function testRules() {

                var fail = {},
                    failLength = 0,
                    success = {},
                    successLength = 0,
                    duped = [];

                console.warn( 'testRules', Y.doccirrus );

                Y.each( rules.fields, function( fieldType ) {
                    Y.each( fieldType, function( rule ) {
                        console.count( 'testRule' );
                        try {
                            var result = Y.doccirrus.schemaloader.getSchemaByName( rule.schemaPath ),
                                type = Y.Lang.type( result ),
                                obj = ('object' === type ? success : fail );

                            if( rule.schemaPath in success || rule.schemaPath in fail ) {
                                duped.push( rule.schemaPath );
                            }

                            obj[rule.schemaPath] = {
                                type: type,
                                result: result,
                                schemaPath: rule.schemaPath,
                                rule: rule
                            };
                        }
                        catch( exc ) {
                            console.trace();
                            console.warn( 'EXCEPTION', exc );
                            console.error( exc );
                        }
                    } );
                } );

                failLength = Y.Object.keys( fail ).length;
                successLength = Y.Object.keys( success ).length;

                console.warn( 'testRules:done', {
                    succes: [successLength, success],
                    fail: [failLength, fail],
                    duped: [duped.length, duped],
                    total: successLength + failLength + duped.length
                } );
            },

            name: NAME
        };

    },
    '0.0.1', {requires: [
        'oop'
        //'dcschemaloader'
    ]}
);
