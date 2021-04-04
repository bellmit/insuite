'use strict';
var
    diagnosis = {
        "actType": "DIAGNOSIS",
        "timestamp": new Date(),
        "patientId": "54be764fc404c1d77a286d4d",
        "employeeId": "100000000000000000000003",
        "locationId": "54eb41b878382da863181d3b",
        "caseFolderId": "564dea5b83c2f69d0c30d6f1",
        "code": "M50.7",
        "diagnosisSite": "BOTH",
        "diagnosisTreatmentRelevance": "TREATMENT_RELEVANT",
        "diagnosisCert": "CONFIRM",
        "catalogShort": "ICD-10",
        "catalog": true,
        "status": "VALID"
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