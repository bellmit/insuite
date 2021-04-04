
var
    treatment = {
        "_id": "564deb55d0d587a70ce0f79f",
        "employeeName": "Dr.1 admin1, prac1",
        "actType": "TREATMENT",
        "timestamp": new Date(),
        "patientId": "54be764fc404c1d77a286d4d",
        "employeeId": "100000000000000000000003",
        "locationId": "54eb41b878382da863181d3b",
        "caseFolderId": "5e6f82c2f12af5272069451f",
        "patientName": "Frau Kant TEST VERSIONING",
        "code": "",
        "fk5036Set": [],
        "fk5012Set": [],
        "forInsuranceType": "",
        "caseFolderType": "PRIVATE_CH",
        "catalogShort": "TARMED",
        "catalog": true,
        "apkState": "IN_PROGRESS",
        "status": "VALID",
        "explanations": "",
        "partnerInfo": "",
        "userContent": "Ausführlicher schriftlicher Krankheits- und Befundbericht (einschließlich Angaben zur Anamnese, zu (n) Befund(en), zur epikritischen Bewertung und gegebenenfalls zur Therapie",
        "comment": "API2TestingActivity"
    },
    putParams = {
        data: treatment
    };

module.exports = {
    getData: function() {
        return treatment;
    },
    putParams: putParams
};