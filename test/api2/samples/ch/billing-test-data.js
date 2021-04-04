
var
    billing = {
        "_id": "564c7c858acafa3899339014",
        "debtCollection": "",
        "orderAccounting": "",
        "agencyCost": null,
        "scheinNotes": "",
        "tenantId": "1111111111",
        "totalCost": 0,
        "billingCodes": "",
        "content": "Privat Schein",
        "insuranceName": "SuvaZeLuzern",
        "insuranceType": "PRIVATE_CH",
        "timestamp": "2015-11-17T23:00:00.001Z",
        "orderNo": "",
        "invoiceNo": null,
        "patientId": "54be764fc404c1d77a286d4d",
        "practiceName": "TestPraxis1"
    },
    putParams = {
        data: billing
    };

module.exports = {
    getData: function() {
        return JSON.parse( JSON.stringify( billing ) );
    },
    putParams: putParams
};