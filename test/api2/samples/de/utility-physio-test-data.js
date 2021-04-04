'use strict';
var
    utility = {
        "employeeName": "Dr.1 admin1, prac1",
        "employeeInitials": "NN",
        "actType": "KBVUTILITY",
        "restTicketNumber": "",
        "timestamp": new Date(),
        "patientId": "54be764fc404c1d77a286d4d",
        "employeeId": "56f5382c37644678aa923d92",
        "locationId": "54eb41b878382da863181d3b",
        "caseFolderId": "55474807d3effab3711763b9",
        "patientName": "Herr qa11 patient11",
        "utIndicationCode" : "EX3c",
        "utIcdCode" : "M72.41",
        "utLatestStartOfTreatment" : "2017-03-15T23:00:00Z",
        "utPrescriptionType" : "FIRST",
        "utRemedy1Seasons" : 6,
        "utRemedy2Seasons" : null,
        "utRemedy1PerWeek" : "2",
        "utRemedy2PerWeek" : null,
        "utHomeVisit" : true,
        "utIcdText" : "Pseudosarkomatöse Fibromatose: Schulterregion [Klavikula, Skapula, Akromioklavikular-, Schulter-, Sternoklavikulargelenk]",
        "utSecondIcdCode" : null,
        "utSecondIcdText" : null,
        "utAgreement" : "NONE",
        "utRemedy2List" : [ ],
        "utRemedy1List" : [
            {
                "name" : "KMT",
                "type" : "vorrangiges_heilmittel_liste",
                "groupTherapyAble" : false,
                "seasons" : 6
            }
        ],
        "utAgreementApprovedForInsurance" : [ ],
        "utTherapyGoalsList" : [ ],
        "forInsuranceType" : "",
        "catalogShort" : "HMV",
        "catalog" : true,
        "subType" : "PHYSIO",
        "apkState": "IN_PROGRESS",
        "editor": [{"name": "prac1 admin1", "employeeNo": "1", "_id": "5677b16d523552401dd65078"}],
        "status": "VALID",
        "explanations": "",
        "partnerInfo": "",
        "userContent": "Lymphabflussstörungen mit prognostisch kurzzeitigem Behandlungsbedarf",
        "comment": "API2TestingActivity"
    },
    putParams = {
        data: utility
    };

module.exports = {
    getData: function() {
        return utility;
    },
    putParams: putParams
};

