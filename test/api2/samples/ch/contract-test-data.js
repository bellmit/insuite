
var
    contract = {
        "actType": "PKVSCHEIN",
        "timestamp": "2015-11-05T08:56:45.712Z",
        "patientId": "54be764fc404c1d77a286d4d",
        "employeeId": "111ae9604013671c12c1c111",
        "locationId": "54eb41b878382da863181d3b",
        "treatmentType": "AMBULANT",
        "scheinSubgroup": "00",
        "scheinType": "0101",
        "scheinBillingArea": "00",
        "scheinYear": "2015",
        "scheinQuarter": "3",
        "scheinNotes": "Example",
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