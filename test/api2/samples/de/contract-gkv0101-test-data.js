'use strict';
var
    contract = {
        "actType": "SCHEIN",
        "timestamp": new Date(),
        "patientId": "54be764fc404c1d77a286d4d",
        "employeeId": "100000000000000000000003",
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
        contract.scheinYear = (new Date()).getYear()+1900;
        contract.scheinQuarter = (Math.floor((new Date()).getMonth()/3))+1;
        return JSON.parse( JSON.stringify( contract ) );
    },
    putParams: putParams
};