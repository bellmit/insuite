'use strict';
var
    medDataWithValidForm = {
        "_id": "54eb41b878382da863810001",
        "formId": "5391fb4cf68076bd1d9831c1",
        "actType": "MEDDATA",
        "activities": [],
        "apkState": "IN_PROGRESS",
        "attachedMedia": [],
        "attachedMediaTags": [],
        "attachments": [],
        "backupEmployeeIds": [],
        "comment": "API2TestingActivity",
        "content": "",
        "employeeId": "56f5382c37644678aa923d92",
        "locationId": "54eb41b878382da863181d3b",
        "employeeName": "Last name, First name",
        "explanations": "",
        "partnerInfo": "",
        "patientId": "54be764fc404c1d77a286d4d",
        "status": "VALID",
        "subType": "",
        "timestamp": new Date(),
        "userContent": ""
    },
    medDataWithInValidForm = {
        "_id": "54eb41b878382da863810002",
        "formId": "5391fb4cf68076bd1d9831c6",
        "actType": "MEDDATA",
        "activities": [],
        "apkState": "IN_PROGRESS",
        "attachedMedia": [],
        "attachedMediaTags": [],
        "attachments": [],
        "backupEmployeeIds": [],
        "comment": "API2TestingActivity",
        "content": "",
        "employeeId": "56f5382c37644678aa923d92",
        "locationId": "54eb41b878382da863181d3b",
        "employeeName": "Last name, First name",
        "explanations": "",
        "partnerInfo": "",
        "patientId": "54be764fc404c1d77a286d4d",
        "status": "VALID",
        "subType": "",
        "timestamp": new Date(),
        "userContent": ""
    };

module.exports = {
    medDataWithValidForm: {
        getData: function() {
            return medDataWithValidForm;
        },
        putParams: { data: medDataWithValidForm }
    },
    medDataWithInValidForm: {
        getData: function() {
            return medDataWithInValidForm;
        },
        putParams: { data: medDataWithInValidForm }
    }
};