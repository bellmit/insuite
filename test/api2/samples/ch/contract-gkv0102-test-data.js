'use strict';
var
    contract = {
        "actType": "SCHEIN",
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
        "fk4219": "",
        "scheinNotes": "Blabla",
        "scheinFinding": "",
        "explanations": "",
        "userContent": "",
        "scheinRemittor": "0987654321",
        "scheinEstablishment": "1234567890",
        "scheinOrder": "This is order text",
        "scheinDiagnosis": "This is suspected diagnosis",
        "scheinDate": "2019-01-10T23:00:00.001Z",
        "scheinQuarter": "1",
        "scheinYear": "2017",
        "apkState": "DOCUMENTED",
        "scheinSpecialisation": "535",
        "scheinBillingArea": "00",
        "scheinType": "0102",
        "scheinSubgroup": "21",
        "comment": "API2TestingActivity"
    },
    putParams = {
        data: contract
    };

module.exports = {
    getData: function() {
        contract.scheinYear = (new Date()).getYear()+1900;
        contract.scheinQuarter = (Math.floor((new Date()).getMonth()/3))+1;
        return JSON.parse( JSON.stringify( contract ) );
    },
    putParams: putParams
};