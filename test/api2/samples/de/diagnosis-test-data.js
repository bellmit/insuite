'use strict';
var
    diagnosis = {
        "_id": "564deb55d0d587a70ce0faaa",
        "actType": "DIAGNOSIS",
        "timestamp": "2015-11-19T15:30:46.461Z",
        "patientId": "54be764fc404c1d77a286d4d",
        "employeeId": "56f5382c37644678aa923d92",
        "locationId": "54eb41b878382da863181d3b",
        "caseFolderId": "564dea5b83c2f69d0c30d6f1",
        "patientName": "Test Mustermann",
        "code": "M50.7",
        "diagnosisDerogation": "",
        "diagnosisSite": "BOTH",
        "diagnosisTreatmentRelevance": "TREATMENT_RELEVANT",
        "diagnosisType": "ACUTE",
        "diagnosisCert": "CONFIRM",
        "forInsuranceType": "",
        "catalogShort": "ICD-10",
        "catalog": true,
        "apkState": "IN_PROGRESS",
        "status": "VALID",
        "explanations": "",
        "partnerInfo": "",
        "userContent": "API Test Diagnose",
        "comment": "API2TestingActivity"
    },
    putParams = {
        data: diagnosis
    };

module.exports = {
    getData: function() {
        return diagnosis;
    },
    putParams: putParams
};