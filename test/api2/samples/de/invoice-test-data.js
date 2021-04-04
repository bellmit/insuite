'use strict';
var
    invoice = {
        "_id": "5746b212f086a301b63d769d",
        "employeeName": "Dr.1 admin2, prac2",
        "actType": "INVOICE",
        "timestamp": new Date(),
        "patientId": "54be764fc404c1d77a286d4d",
        "employeeId": "56f5382c37644678aa923d92",
        "locationId": "54eb41b878382da863181d3b",
        "status": "VALID",
        "apkState": "IN_PROGRESS",
        "editor": [],
        "explanations": null,
        "partnerInfo": null,
        "userContent": "",
        "price": null,
        "vat": null,
        "invoiceDate":"2019-03-28T11:05:28.442Z",
        "invoiceBilledDate":"2019-03-28T11:05:28.442Z",
        "reminderDate":"2019-03-29T11:05:28.442Z",
        "warning1Date":"2019-03-30T11:05:28.442Z",
        "warning2Date":"2019-03-31T10:05:28.442Z",
        "comment": "API2TestingActivity"
    },
    putParams = {
        data: invoice
    };

module.exports = {
    getData: function() {
        return invoice;
    },
    putParams: putParams
};

