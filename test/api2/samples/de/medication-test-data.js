'use strict';
var
    medication = {
        "_id": "57456770383c1ee7b09ec19d",
        "employeeName": "Dr.1 admin2, prac2",
        "actType": "MEDICATION",
        "adherence": true,
        "timestamp": new Date(),
        "patientId": "54be764fc404c1d77a286d4d",
        "employeeId": "56f5382c37644678aa923d92",
        "locationId": "000000000000000000000001",
        "caseFolderId": "56fa30e6b641255602e1b576",
        "status": "VALID",
        "apkState": "IN_PROGRESS",
        "catalog": null,
        "catalogShort": "MMI",
        "editor": [],
        "explanations": null,
        "forInsuranceType": null,
        "partnerInfo": null,
        "userContent": null,
        "phNLabel": "unit test Medication",
        "phPZN": "09710269",
        "phContinuousMed": true,
        "phSampleMed": true,
        "phAsNeededMedication": false,
        "phCompany": "Test Company AG",
        "dosis": "4mg",
        "comment": "API2TestingActivity"
    },
    putParams = {
        data: medication
    };

module.exports = {
    getData: function() {
        return medication;
    },
    putParams: putParams
};

