'use strict';
var
    contract = {
        "actType": "SCHEIN",
        "timestamp": "2015-11-05T08:56:45.712Z",
        "patientId": "54be764fc404c1d77a286d4d",
        "employeeId": "111ae9604013671c12c1c111",
        "locationId": "000000000000000000000001",
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
        "scheinSubgroup": "00",
        "scheinType": "0101",
        "scheinBillingArea": "00",
        "scheinYear": "2015",
        "scheinQuarter": "3",
        "fk4219": "",
        "scheinNotes": "Blabla",
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
    };

module.exports = {
    getData: function() {
        return JSON.parse( JSON.stringify( contract ) );
    },
    putParams: putParams
};