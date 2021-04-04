'use strict';

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
        "comment": "API2TestingActivity",
        "activities": []
    },
    putParams = {
        data: contract
    },
    postResult = {
        "_id": "5a3a6e2c0b12a7140c6a2058",
        "employeeName": "",
        "timestamp": "2017-12-19T23:00:00.001Z",
        "patientId": "54be764fc404c1d77a286d4d",
        "employeeId": "56f5382c37644678aa923d92",
        "locationId": "000000000000000000000001",
        "treatmentType": "AMBULANT",
        "comment": "API2TestingActivity",
        "caseFolderId": "5a3a6e2c0b12a7140c6a2057",
        "fk4219": "",
        "scheinNotes": "",
        "scheinFinding": "",
        "scheinDiagnosis": "",
        "scheinOrder": "",
        "scheinSpecialisation": "",
        "scheinEstablishment": "",
        "scheinRemittor": "",
        "apkState": "IN_PROGRESS",
        "editor": [
            {
                "name": "Doc-Cirrus Kundendienst",
                "employeeNo": "",
                "_id": "5a3a6e2c0b12a7140c6a2059"
            }
        ],
        "status": "VALID",
        "explanations": "",
        "partnerInfo": "",
        "userContent": "",
        "subType": "",
        "actType": "PKVSCHEIN"
    },
    putResult = {
        "_id": "5a3a6eed0b12a7140c6a2070",
        "employeeName": "",
        "timestamp": "2017-12-20T14:08:44.003Z",
        "patientId": "54be764fc404c1d77a286d4d",
        "employeeId": "56f5382c37644678aa923d92",
        "locationId": "000000000000000000000001",
        "treatmentType": "AMBULANT",
        "comment": "API2TestingActivity",
        "caseFolderId": "5a3a6eed0b12a7140c6a206f",
        "fk4219": "",
        "scheinNotes": "",
        "scheinFinding": "",
        "scheinDiagnosis": "",
        "scheinOrder": "",
        "scheinSpecialisation": "",
        "scheinEstablishment": "",
        "scheinRemittor": "",
        "apkState": "IN_PROGRESS",
        "editor": [
            {
                "name": "Doc-Cirrus Kundendienst",
                "employeeNo": "",
                "_id": "5a3a6eed0b12a7140c6a2071"
            }
        ],
        "status": "VALID",
        "explanations": "",
        "partnerInfo": "",
        "userContent": "",
        "subType": "",
        "actType": "PKVSCHEIN"
    },
    deleteResult = {
        "_id": "5a3a6f690b12a7140c6a2088",
        "employeeName": "",
        "timestamp": "2017-12-20T14:10:48.449Z",
        "patientId": "54be764fc404c1d77a286d4d",
        "employeeId": "56f5382c37644678aa923d92",
        "locationId": "000000000000000000000001",
        "treatmentType": "AMBULANT",
        "comment": "API2TestingActivity",
        "caseFolderId": "5a3a6f690b12a7140c6a2087",
        "fk4219": "",
        "scheinNotes": "",
        "scheinFinding": "",
        "scheinDiagnosis": "",
        "scheinOrder": "",
        "scheinSpecialisation": "",
        "scheinEstablishment": "",
        "scheinRemittor": "",
        "apkState": "IN_PROGRESS",
        "editor": [
            {
                "name": "Doc-Cirrus Kundendienst",
                "employeeNo": "",
                "_id": "5a3a6f6a0b12a7140c6a2089"
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
    deleteUpsertResult = {
        "_id": "5a3a709c7f6555c3deff31bb",
        "employeeName": "",
        "timestamp": "2017-12-20T14:15:53.331Z",
        "patientId": "54be764fc404c1d77a286d4d",
        "employeeId": "56f5382c37644678aa923d92",
        "locationId": "000000000000000000000001",
        "treatmentType": "AMBULANT",
        "comment": "API2TestingActivity",
        "fk4219": "",
        "scheinNotes": "",
        "scheinFinding": "",
        "scheinDiagnosis": "",
        "scheinOrder": "",
        "scheinSpecialisation": "",
        "scheinEstablishment": "",
        "scheinRemittor": "",
        "apkState": "IN_PROGRESS",
        "editor": [
            {
                "_id": "5a3a709c0b12a7140c6a20ab",
                "employeeNo": "",
                "name": "Doc-Cirrus Kundendienst"
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
    };

module.exports = {
    getData: function() {
        return JSON.parse( JSON.stringify( contract ) );
    },
    putParams: putParams,
    getPostResult() {
        return JSON.parse( JSON.stringify( postResult ) );
    },
    getPutResult() {
        return JSON.parse( JSON.stringify( putResult ) );
    },
    getDeleteResult() {
        return JSON.parse( JSON.stringify( deleteResult ) );
    },
    getDeleteUpsertResult() {
        return JSON.parse( JSON.stringify( deleteUpsertResult ) );
    }
};
