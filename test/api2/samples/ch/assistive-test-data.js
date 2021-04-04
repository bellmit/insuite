'use strict';
var
    assistive = {
        "_id": "5677b13c11a9d5111d2ef9d0",
        "employeeName": "Dr.1 admin2, prac2",
        "actType": "ASSISTIVE",
        "timestamp": "2016-03-28T07:57:42.215Z",
        "patientId": "54be764fc404c1d77a286d4d",
        "employeeId": "56f5382c37644678aa923d92",
        "locationId": "54eb41b878382da863181d3b",
        "caseFolderId": "56fa30e6b641255602e1b576",
        "status": "VALID",
        "code": "00823575",
        "assDescription": "unit test Assistive",
        "assDose": "5g",
        "assPrescPeriod": "2016.01.15 - 2016.02.13",
        "apkState": "IN_PROGRESS",
        "catalog": null,
        "catalogShort": null,
        "editor": [],
        "explanations": null,
        "forInsuranceType": null,
        "partnerInfo": null,
        "userContent": null,
        "comment": "API2TestingActivity"

    },
    putParams = {
        data: assistive
    };

module.exports = {
    getData: function() {
        return assistive;
    },
    putParams: putParams
};

