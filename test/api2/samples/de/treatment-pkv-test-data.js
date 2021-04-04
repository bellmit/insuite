'use strict';
var
    treatment = {
        "employeeName": "Dr.1 admin1, prac1",
        "actType": "TREATMENT",
        "timestamp": new Date(),
        "patientId": "54be764fc404c1d77a286d4d",
        "employeeId": "56f5382c37644678aa923d92",
        "locationId": "54eb41b878382da863181d3b",
        "caseFolderId": "564dea5b83c2f69d0c30d6f1",
        "patientName": "Frau Kant TEST VERSIONING",
        "code": "75",
        "price": 12.9,
        "unit": "Euro",
        "vat": 3,
        "fk5036Set": [],
        "fk5012Set": [],
        "forInsuranceType": "",
        "catalogShort": "GOÄ",
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