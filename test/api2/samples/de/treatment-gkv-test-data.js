/**
 * User: rrrw
 * Date: 17/12/15  1:39 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
'use strict';
var
    treatment = {
        "actType" : "TREATMENT",
        "status" : "VALID",
        "timestamp" : new Date(),
        "patientId" : "54be764fc404c1d77a286d4d",
        "employeeId" : "56f5382c37644678aa923d92",
        "employeeName" : "Dr.1 admin1, prac1",
        "locationId" : "54eb41b878382da863181d3b",
        "userContent" : "MRT-Untersuchung von Teilen der Wirbelsäule",
        "partnerInfo" : "",
        "explanations" : "",
        "caseFolderId" : "55474807d3effab3711763b9",
        "apkState" : "IN_PROGRESS",
        "catalog" : true,
        "catalogShort" : "EBM",
        "code" : "34411",
        "forInsuranceType" : "",
        "fk5012Set" : undefined,
        "fk5036Set" : undefined,
        "activities" : [ ],
        "anaesthesiaText" : "",
        "areTreatmentDiagnosesBillable" : "1",
        "assistanceQuantity" : 0,
        "assistanceTaxPoints" : 0,
        "attachedMedia" : [ ],
        "attachedMediaTags" : [ ],
        "attachments" : [ ],
        "backupEmployeeIds" : [ ],
        "benefitsText" : "",
        "billingFactorValue" : "0.109871",
        "billingRole" : [
            "MEDICAL",
            "TECHNICAL"
        ],
        "bstrReferenceCode" : "",
        "content" : "MRT-Untersuchung von Teilen der Wirbelsäule",
        "countryMode" : [
            "D"
        ],
        "displayPrice" : "0",
        "divisionCode" : null,
        "divisionText" : "",
        "editor" : [
            // can be empty
        ],
        "employeeInitials" : "",
        "fk5035Set" : [ ],
        "fk5037" : "",
        "formId" : "",
        "formVersion" : "",
        "medicalScalingFactor" : 1,
        "medicalTaxPoints" : 0,
        "medicalText" : "",
        "numberOfCopies" : 1,
        "preparationAndFollowUpTime" : 0,
        "price" : 115.69,
        "referencedBy" : [ ],
        "reportTime" : 0,
        "roomOccupancyTime" : 0,
        "rotationTime" : 0,
        "scheinDiagnosis" : "",
        "scheinOrder" : "",
        "sideMandatory" : false,
        "subType" : "",
        "tariffType" : "",
        "taxPoints" : 0,
        "technicalScalingFactor" : 1,
        "technicalTaxPoints" : 0,
        "technicalText" : "",
        "treatmentCategory" : "",
        "treatmentTime" : 0,
        "treatmentTypeCh" : "AMBULATORY",
    //    "u_extra": {
    //        // can be empty
    //    },
        "unit" : "Euro",
        "vat" : 0
    //    "comment": "API2TestingActivity"
    },
    putParams = {
        data: treatment
    };

module.exports = {
    getData: function() {
        return treatment;
    },
    putParams: putParams
};