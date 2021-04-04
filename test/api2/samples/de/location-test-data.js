'use strict';
var
    locationData = {
        "_id": "54eb41b878382da863181d3b",
        "commercialNo": "370103000",
        "locname": "Klinikum Eins",
        "phone": "030/1283719887",
        "fax": "030/1283719889",
        "email": "a@eins.partner.de",
        "openTimes": [
            {
                "_id": "555da00e61bffe0000212e8c",
                "end": [
                    17,
                    0
                ],
                "start": [
                    9,
                    0
                ],
                "days": [
                    1,
                    2,
                    3,
                    4,
                    5
                ]
            }
        ],
        "addon": "",
        "countryMode": ["D"],
        "countryCode": "D",
        "country": "Deutschland",
        "city": "Berlin",
        "zip": "10115",
        "houseno": "5",
        "street": "Einsstr.",
        "isAdditionalLocation": true,
        "mainLocationId": "000000000000000000000001",
        "budgets" : [
            {
                "specialities" : [],
                "_id" : "5bb5fb7c3af2f62b25f2944d",
                "type" : "MEDICATION",
                "startBudget" : 40,
                "startDate" : "2018-05-31T21:00:00.000Z",
                "patientAgeRange1" : 41,
                "patientAgeRange2" : 42,
                "patientAgeRange3" : 43,
                "patientAgeRange4" : 44
            },
            {
                "specialities" : [
                    "050",
                    "030"
                ],
                "_id" : "5bb76a9c00e26b310f2086e5",
                "type" : "MEDICATION",
                "startBudget" : 40,
                "startDate" : "2018-06-01T13:43:17.372Z",
                "patientAgeRange1" : 41,
                "patientAgeRange2" : 42,
                "patientAgeRange3" : 43,
                "patientAgeRange4" : 44
            },
            {
                "specialities" : [],
                "_id" : "5bb5fb7c3af2f62b25f2944c",
                "type" : "KBVUTILITY",
                "startBudget" : 62,
                "startDate" : "2018-08-31T21:00:00.000Z",
                "patientAgeRange1" : 63,
                "patientAgeRange2" : 64,
                "patientAgeRange3" : 65,
                "patientAgeRange4" : 66
            }
        ]
    },
    putParams = {
        data: locationData
    },
    postResult = {
        "_id": "54eb41b878382da863181d3b",
        "street": "Einsstr.",
        "houseno": "5",
        "zip": "10115",
        "city": "Berlin",
        "country": "Deutschland",
        "countryCode": "D",
        "addon": "",
        "isAdditionalLocation": true,
        "enabledPrinters": [],
        "commercialNo": "370103000",
        "locname": "Klinikum Eins",
        "phone": "030/1283719887",
        "fax": "030/1283719889",
        "email": "a@eins.partner.de",
        "openTimes": [
            {
                "days": [
                    1,
                    2,
                    3,
                    4,
                    5
                ],
                "colorOfConsults": " ",
                "start": [
                    9,
                    0
                ],
                "end": [
                    17,
                    0
                ],
                "_id": "555da00e61bffe0000212e8c"
            }
        ],
        "mainLocationId": "000000000000000000000001",
        "budgets": [
            {
                "specialities": [],
                "_id": "5bb5fb7c3af2f62b25f2944d",
                "type": "MEDICATION",
                "startBudget": 40,
                "startDate": "2018-05-31T21:00:00.000Z",
                "patientAgeRange1": 41,
                "patientAgeRange2": 42,
                "patientAgeRange3": 43,
                "patientAgeRange4": 44
            },
            {
                "specialities": [
                    "050",
                    "030"
                ],
                "_id": "5bb76a9c00e26b310f2086e5",
                "type": "MEDICATION",
                "startBudget": 40,
                "startDate": "2018-06-01T13:43:17.372Z",
                "patientAgeRange1": 41,
                "patientAgeRange2": 42,
                "patientAgeRange3": 43,
                "patientAgeRange4": 44
            },
            {
                "specialities": [],
                "_id": "5bb5fb7c3af2f62b25f2944c",
                "type": "KBVUTILITY",
                "startBudget": 62,
                "startDate": "2018-08-31T21:00:00.000Z",
                "patientAgeRange1": 63,
                "patientAgeRange2": 64,
                "patientAgeRange3": 65,
                "patientAgeRange4": 66
            }
        ],
        "defaultPrinter": ""
    },
    deleteResult = {
        "street": "Einsstr.",
        "houseno": "5",
        "zip": "10115",
        "city": "Berlin",
        "country": "Deutschland",
        "countryCode": "D",
        "addon": "",
        "isAdditionalLocation": true,
        "enabledPrinters": [],
        "_id": "54eb41b878382da863181d3b",
        "commercialNo": "370103000",
        "locname": "Klinikum Eins",
        "phone": "030/1283719887",
        "fax": "030/1283719889",
        "email": "a@eins.partner.de",
        "openTimes": [
            {
                "days": [
                    1,
                    2,
                    3,
                    4,
                    5
                ],
                "colorOfConsults": " ",
                "start": [
                    9,
                    0
                ],
                "end": [
                    17,
                    0
                ],
                "_id": "555da00e61bffe0000212e8c"
            }
        ],
        "mainLocationId": "000000000000000000000001",
        "budgets": [
            {
                "specialities": [],
                "_id": "5bb5fb7c3af2f62b25f2944d",
                "type": "MEDICATION",
                "startBudget": 40,
                "startDate": "2018-05-31T21:00:00.000Z",
                "patientAgeRange1": 41,
                "patientAgeRange2": 42,
                "patientAgeRange3": 43,
                "patientAgeRange4": 44
            },
            {
                "specialities": [
                    "050",
                    "030"
                ],
                "_id": "5bb76a9c00e26b310f2086e5",
                "type": "MEDICATION",
                "startBudget": 40,
                "startDate": "2018-06-01T13:43:17.372Z",
                "patientAgeRange1": 41,
                "patientAgeRange2": 42,
                "patientAgeRange3": 43,
                "patientAgeRange4": 44
            },
            {
                "specialities": [],
                "_id": "5bb5fb7c3af2f62b25f2944c",
                "type": "KBVUTILITY",
                "startBudget": 62,
                "startDate": "2018-08-31T21:00:00.000Z",
                "patientAgeRange1": 63,
                "patientAgeRange2": 64,
                "patientAgeRange3": 65,
                "patientAgeRange4": 66
            }
        ],
        "defaultPrinter": ""
    };

module.exports = {
    getData: function() {
        var
            data = JSON.parse( JSON.stringify( locationData ) );

        return data;
    },
    putParams: putParams,
    getPostResult() {
        return JSON.parse( JSON.stringify( postResult ) );
    },
    getPutResult() {
        return JSON.parse( JSON.stringify( postResult ) );
    },
    getDeleteResult() {
        return JSON.parse( JSON.stringify( deleteResult ) );
    },
    getDeleteUpsertResult() {
        return JSON.parse( JSON.stringify( deleteResult ) );
    }
};

