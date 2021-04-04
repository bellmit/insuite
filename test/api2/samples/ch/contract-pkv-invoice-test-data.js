

var
    contract = {
        "actType": "PKVSCHEIN",
        "timestamp": new Date(),
        "patientId": "54be764fc404c1d77a286d4d",
        "employeeId": "56f5382c37644678aa923d92",
        "locationId": "54eb41b878382da863181d3b",
        "treatmentType": "AMBULANT",
        "fk4217": "",
        "fk4241": "",
        "fk4236": false,
        "fk4206": null,
        "fk4123": "",
        "fk4125to": null,
        "fk4125from": null,
        "fk4126": "",
        "fk4124": "",
        "scheinSubgroup": "",
        "scheinType": "",
        "scheinBillingArea": "00",
        "scheinYear": "",
        "scheinQuarter": "",
        "fk4219": "",
        "scheinNotes": "",
        "scheinFinding": "",
        "scheinDiagnosis": "",
        "scheinOrder": "",
        "scheinSpecialisation": "",
        "scheinEstablishment": "",
        "scheinRemittor": "",
        "explanations": "",
        "userContent": "",
        "comment": "API2TestingActivity"
    },
    putParams = {
        data: contract
    },
    deleteResult = {
        "_id": "5a3b8bc2bc40f60c31b68d8b",
        "employeeInitials": "FB",
        "employeeName": "Bein_test, Frederike_test",
        "timestamp": "2017-12-20T23:00:00.001Z",
        "patientId": "54be764fc404c1d77a286d4d",
        "employeeId": "56f5382c37644678aa923d92",
        "locationId": "000000000000000000000001",
        "treatmentType": "AMBULANT",
        "comment": "API2TestingActivity",
        "caseFolderId": "5a3b8bc2bc40f60c31b68d8a",
        "fk4219": "",
        "scheinNotes": "",
        "scheinFinding": "",
        "scheinDiagnosis": "",
        "scheinOrder": "",
        "scheinSpecialisation": "",
        "scheinEstablishment": "700100200",
        "scheinRemittor": "934770004",
        "apkState": "IN_PROGRESS",
        "editor": [
            {
                "name": "Doc-Cirrus Kundendienst",
                "employeeNo": "",
                "_id": "5a3b8bc2bc40f60c31b68d8c"
            },
            {
                "name": "Doc-Cirrus Kundendienst"
            }
        ],
        "status": "DELETED",
        "explanations": "",
        "partnerInfo": "",
        "userContent": "",
        "subType": "",
        "actType": "PKVSCHEIN"
    },
    postResult = {
        "_id": "5a3a76c0728ecd14e67fe4f7",
        "employeeInitials": "FB",
        "employeeName": "Bein_test, Frederike_test",
        "timestamp": "2017-12-19T23:00:00.001Z",
        "patientId": "54be764fc404c1d77a286d4d",
        "employeeId": "56f5382c37644678aa923d92",
        "locationId": "000000000000000000000001",
        "treatmentType": "AMBULANT",
        "comment": "API2TestingActivity",
        "caseFolderId": "5a3a76c0728ecd14e67fe4f6",
        "fk4219": "",
        "scheinNotes": "",
        "scheinFinding": "",
        "scheinDiagnosis": "",
        "scheinOrder": "",
        "scheinSpecialisation": "",
        "scheinEstablishment": "700100200",
        "scheinRemittor": "934770004",
        "apkState": "IN_PROGRESS",
        "editor": [
            {
                "name": "Doc-Cirrus Kundendienst",
                "employeeNo": "",
                "_id": "5a3a76c0728ecd14e67fe4f8"
            }
        ],
        "status": "VALID",
        "explanations": "",
        "partnerInfo": "",
        "userContent": "",
        "subType": "",
        "actType": "PKVSCHEIN"
    };

module.exports = {
    getData: function() {
        return JSON.parse( JSON.stringify( contract ) );
    },
    putParams: putParams,
    getPostResult() {
        return JSON.parse( JSON.stringify( postResult ) );
    },
    getDeleteResult() {
        return JSON.parse( JSON.stringify( deleteResult ) );
    }
};
