'use strict';
var
    patient = {
        "_id": "54be764fc404c1d77a286d4d",
        "patientNo": null,
        "patientNumber": "211",
        countryMode: ["D"],
        "kbvDob": "04.04.1970",
        "careDegree": "NO",
        "dob": "2008-04-03T22:00:00.000Z",
        "gender": "FEMALE",
        "talk": "MS",
        "dataTransmissionToPVSApproved": true,
        "markers": [],
        "physicians": [
            "54be2294c404c1d77a286c6f"
        ],
        "institution" : "56c1c77397e165f5538d8218",
        "edmpTypes" : [ ],
        "insuranceStatus": [
            {
                "insuranceNo": "M987654321",
                "insuranceId": "107277500",
                "insuranceName": "Techniker-Krankenkasse",
                "insurancePrintName": "Techniker Krankenkasse",
                "insuranceGrpId": "95605",
                "type": "PUBLIC",
                "billingFactor": "privatversicherte",
                "kv": "98",
                "locationId": "54eb41b878382da863181d3b",
                "_id": "54be764fc404c1d77a286d4e",
                "cardSwipe": null,
                "address2": "",
                "address1": "",
                "bgNumber": "",
                "unzkv": [],
                "fused": false,
                "feeSchedule": "2",
                "costCarrierBillingGroup": "11",
                "costCarrierBillingSection": "00",
                "dmp": "1",
                "persGroup": "",
                "insuranceKind": "1",
                "fk4110": null,
                "fk4133": null
            },
            {
                "insuranceId": "120390466",
                "insuranceName": "BG Energie Textil Elektro Medienerzeugnisse",
                "insurancePrintName": "BG Energie Textil Elektro Medienerzeugnisse",
                "insuranceGrpId": "",
                "type": "BG",
                "billingFactor": "privatversicherte",
                "notes": "Test test",
                "locationId": "54eb41b878382da863181d3b",
                "_id": "553f59a22b1941713a33144b",
                "address2": "38100 Braunschweig",
                "address1": "Lessingplatz 13",
                "bgNumber": "9435788349",
                "unzkv": [],
                "fused": false,
                "feeSchedule": "3",
                "costCarrierBillingGroup": "00",
                "costCarrierBillingSection": "00",
                "dmp": "",
                "persGroup": "",
                "insuranceKind": "",
                "fk4110": null,
                "fk4133": null
            },
            {
                "fk4133" : null,
                "fk4110" : null,
                "insuranceKind" : "",
                "persGroup" : "",
                "dmp" : "",
                "costCarrierBillingSection" : "00",
                "costCarrierBillingGroup" : "",
                "feeSchedule" : "3",
                "fused" : false,
                "unzkv" : [],
                "bgNumber" : "",
                "address1" : "",
                "address2" : "",
                "cardSwipe" : null,
                "locationId" : "54eb41b878382da863181d3b",
                "billingFactor" : "privatversicherte",
                "type" : "PRIVATE",
                "insurancePrintName" : "ARAG",
                "insuranceName" : "ARAG",
                "insuranceId" : "168141121"
            },
            {
                "fk4133" : null,
                "fk4110" : null,
                "insuranceKind" : "",
                "costCarrierBillingSection" : "",
                "costCarrierBillingGroup" : "",
                "feeSchedule" : "",
                "fused" : false,
                "unzkv" : [],
                "bgNumber" : "",
                "address1" : "",
                "address2" : "",
                "zipcode" : "",
                "city" : "",
                "phone" : "",
                "insuranceLink" : "",
                "email" : "",
                "insuranceGLN" : "",
                "recipientGLN" : "",
                "department" : "",
                "isTiersGarant" : false,
                "isTiersPayant" : true,
                "type" : "SELFPAYER"
            }
        ],
        "addresses": [
            {
                "kind": "OFFICIAL",
                "_id": "54be764fc404c1d77a286d4f",
                "addon": "",
                "countryCode": "D",
                "country": "Deutschland",
                "city": "Berlin",
                "zip": "12103",
                "houseno": "82",
                "street": "Bessemerstr"
            },
            {
                "receiver": "JVA Moabit",
                "kind": "BILLING",
                "addon": "",
                "countryCode": "D",
                "country": "Deutschland",
                "city": "Berlin",
                "zip": "10557",
                "houseno": "33",
                "street": "Turmstr"
            }
        ],
        "communications": [
            {
                "type": "PHONEJOB",
                "value": "030-1234567890",
                "_id": "54be764fc404c1d77a286d51"
            },
            {
                "type": "EMAILJOB",
                "value": "qa-patient1@doc-cirrus.com",
                "_id": "54be764fc404c1d77a286d50"
            }
        ],
        "partnerIds": [{
            "_id": "5703b0cbd26c0ead1cce245f",
            "patientId": "3345 (die AP-ID)",
            "partnerId": "AP"
        }],
        "lastname": "A001-v2.1.2 (Ron)",
        "fk3120": "",
        "middlename": "",
        "nameaffix": "",
        "firstname": "A001-v2.1.2",
        "title": ""
    },
    putParams = {
        data: patient,
        address: {
            "_id": "54be764fc404c12222222222",
            "kind": "OFFICIAL",
            "addon": "",
            "countryCode": "D",
            "country": "Deutschland",
            "city": "Berlin",
            "zip": "12103",
            "houseno": "944",
            "street": "Bessemerstr (1)"
        },
        communication: {
            "type": "PHONEJOB",
            "value": "015218332210",
            "_id": "54be764fc404c12222222222"
        }
    },
    postResult = {
        "_id": "54be764fc404c1d77a286d4d",
        "additionalMirrorPatientIds": [],
        "title": "",
        "firstname": "A001-v2.1.2",
        "nameaffix": "",
        "middlename": "",
        "fk3120": "",
        "lastname": "A001-v2.1.2 (Ron)",
        "physicians": [
            "54be2294c404c1d77a286c6f"
        ],
        "employees": [],
        "markers": [],
        "talk": "MS",
        "gender": "FEMALE",
        "patientNumber": 592,
        "edmpTypes": [],
        "edmpNotifiedAboutStatementOfParticipationTypes": [],
        "ehksDocType": "EHKSND",
        "confirmedViewFromOtherLocations": false,
        "additionalContacts": [],
        "patientNo": "592",
        "kbvDob": "04.04.1970",
        "careDegree": "NO",
        "dob": "2008-04-03T22:00:00.000Z",
        "institution": "56c1c77397e165f5538d8218",
        "insuranceStatus": [
            {
                "fk4133": null,
                "fk4110": null,
                "insuranceKind": "1",
                "costCarrierBillingSection": "00",
                "costCarrierBillingGroup": "11",
                "feeSchedule": "2",
                "fused": false,
                "unzkv": [],
                "bgNumber": "",
                "address1": "",
                "address2": "",
                "zipcode": "",
                "city": "",
                "phone": "",
                "insuranceLink": "",
                "email": "",
                "insuranceGLN": "",
                "recipientGLN": "",
                "department": "",
                "_id": "54be764fc404c1d77a286d4e",
                "insuranceNo": "M987654321",
                "insuranceId": "107277500",
                "insuranceName": "Techniker-Krankenkasse",
                "insurancePrintName": "Techniker Krankenkasse",
                "insuranceGrpId": "95605",
                "type": "PUBLIC",
                "billingFactor": "privatversicherte",
                "kv": "98",
                "locationId": "54eb41b878382da863181d3b",
                "dmp": "1",
                "persGroup": ""
            },
            {
                "fk4133": null,
                "fk4110": null,
                "insuranceKind": "",
                "costCarrierBillingSection": "00",
                "costCarrierBillingGroup": "00",
                "feeSchedule": "3",
                "fused": false,
                "unzkv": [],
                "bgNumber": "9435788349",
                "address1": "Lessingplatz 13",
                "address2": "38100 Braunschweig",
                "zipcode": "",
                "city": "",
                "phone": "",
                "insuranceLink": "",
                "email": "",
                "insuranceGLN": "",
                "recipientGLN": "",
                "department": "",
                "_id": "553f59a22b1941713a33144b",
                "insuranceId": "120390466",
                "insuranceName": "BG Energie Textil Elektro Medienerzeugnisse",
                "insurancePrintName": "BG Energie Textil Elektro Medienerzeugnisse",
                "insuranceGrpId": "",
                "type": "BG",
                "billingFactor": "privatversicherte",
                "notes": "Test test",
                "locationId": "54eb41b878382da863181d3b",
                "dmp": "",
                "persGroup": ""
            },
            {
                "fk4133": null,
                "fk4110": null,
                "insuranceKind": "",
                "costCarrierBillingSection": "00",
                "costCarrierBillingGroup": "",
                "feeSchedule": "3",
                "fused": false,
                "unzkv": [],
                "bgNumber": "",
                "address1": "",
                "address2": "",
                "zipcode": "",
                "city": "",
                "phone": "",
                "insuranceLink": "",
                "email": "",
                "insuranceGLN": "",
                "recipientGLN": "",
                "department": "",
                "_id": "5d41ae9364ba0018ec490b72",
                "persGroup": "",
                "dmp": "",
                "locationId": "54eb41b878382da863181d3b",
                "billingFactor": "privatversicherte",
                "type": "PRIVATE",
                "insurancePrintName": "ARAG",
                "insuranceName": "ARAG",
                "insuranceId": "168141121"
            }
        ],
        "addresses": [
            {
                "street": "Bessemerstr",
                "houseno": "82",
                "zip": "12103",
                "city": "Berlin",
                "country": "Deutschland",
                "countryCode": "D",
                "addon": "",
                "_id": "54be764fc404c1d77a286d4f",
                "kind": "OFFICIAL"
            },
            {
                "street": "Turmstr",
                "houseno": "33",
                "zip": "10557",
                "city": "Berlin",
                "country": "Deutschland",
                "countryCode": "D",
                "addon": "",
                "_id": "5d41ae9364ba0018ec490b75",
                "receiver": "JVA Moabit",
                "kind": "BILLING"
            }
        ],
        "communications": [
            {
                "signaling": true,
                "confirmed": false,
                "confirmNeeded": false,
                "_id": "54be764fc404c1d77a286d51",
                "type": "PHONEJOB",
                "value": "030-1234567890"
            },
            {
                "signaling": true,
                "confirmed": false,
                "confirmNeeded": false,
                "_id": "54be764fc404c1d77a286d50",
                "type": "EMAILJOB",
                "value": "qa-patient1@doc-cirrus.com"
            }
        ],
        "partnerIds": [
            {
                "asvTeamNumbers": [],
                "_id": "5703b0cbd26c0ead1cce245f",
                "patientId": "3345 (die AP-ID)",
                "partnerId": "AP"
            }
        ],
        "images": [],
        "latestMedData": [],
        "latestLabData": [],
        "dob_MM": "04",
        "dob_DD": "04"
    };

module.exports = {
    getData: function() {
        var
            data = JSON.parse( JSON.stringify( patient ) );

        return data;
    },
    putParams: putParams,
    getPostResult() {
        return JSON.parse( JSON.stringify(postResult) );
    },
    getPutResult() {
        return JSON.parse( JSON.stringify(postResult) );
    },
    getDeleteResult() {
        return JSON.parse( JSON.stringify( postResult ) );
    },
    getDeleteUpsertResult() {
        return JSON.parse( JSON.stringify( postResult ) );
    }
};

