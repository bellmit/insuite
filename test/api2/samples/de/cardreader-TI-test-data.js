'use strict';
var
    cardreader = [
        {
            "_id": {
                "_id": "5de90c5575f2e10f7cc5dfe7",
                "MandantId": "Mandant2",
                "WorkplaceId": "e3anm2",
                "MandantName": "Mandant2",
                "WorkplaceName": "ABCD"
            },
            "CtIds": ["e3anm2"],
            "profiles": [],
            "CtNames": ["4"],
            "context": {
                "MandantId": "Mandant2",
                "ClientSystemId": "inSuite",
                "WorkplaceId": "e3anm2",
                "MandantName": "Mandant2",
                "WorkplaceName": "ABCD"
            },
            "SMCBCards": [],
            "connectorErrorCode": "4096",
            "invalidParam": "CtId",
            "invalidParamValue": "e3anm2"
        },
        {
            "_id": {
                "_id": "5de90c5575f2e10f7cc5dfe7",
                "MandantId": "Mandant2",
                "WorkplaceId": "e3anm1",
                "MandantName": "Mandant2",
                "WorkplaceName": "Test Wkstn3"
            },
            "CtIds": ["e3anm1"],
            "profiles": [],
            "CtNames": ["3"],
            "context": {
                "MandantId": "Mandant2",
                "ClientSystemId": "inSuite",
                "WorkplaceId": "e3anm1",
                "MandantName": "Mandant2",
                "WorkplaceName": "Test Wkstn3"
            },
            "SMCBCards": [],
            "connectorErrorCode": "4096",
            "invalidParam": "CtId",
            "invalidParamValue": "e3anm1"
        },
        {
            "_id": {
                "_id": "5de90c5575f2e10f7cc5dfe6",
                "MandantId": "Mandant1",
                "WorkplaceId": "e1anm2",
                "MandantName": "Mandant1",
                "WorkplaceName": "Test Wkstn2"
            },
            "CtIds": ["KT2"],
            "profiles": [{"profileLabel": "DfltProfl", "cardTerminals": []}],
            "CtNames": ["2"],
            "context": {
                "MandantId": "Mandant1",
                "ClientSystemId": "inSuite",
                "WorkplaceId": "e1anm2",
                "MandantName": "Mandant1",
                "WorkplaceName": "Test Wkstn2"
            },
            "SMCBCards": [
                {
                    "_id": "5de90da6ef7b870f76b9622f",
                    "iccsn": "80276883110000016161",
                    "name": "Test Praxis Valid",
                    "organisationalUnits": {
                        "_id": "5de90c5575f2e10f7cc5dfe6",
                        "humanId": "Mandant1",
                        "name": "Mandant1",
                        "locations": ["56ab2a77ee7080aa45fc3751", "000000000000000000000001", "5718848a9f554df28eb0b01b"]
                    }
                }]
        },
        {
            "_id": {
                "_id": "5de90c5575f2e10f7cc5dfe6",
                "MandantId": "Mandant1",
                "WorkplaceId": "e1anm1",
                "MandantName": "Mandant1",
                "WorkplaceName": "Test Wkstn1"
            },
            "CtIds": ["KT1"],
            "profiles": [],
            "CtNames": ["1"],
            "context": {
                "MandantId": "Mandant1",
                "ClientSystemId": "inSuite",
                "WorkplaceId": "e1anm1",
                "MandantName": "Mandant1",
                "WorkplaceName": "Test Wkstn1"
            },
            "SMCBCards": [
                {
                    "CardHandle": "85b329a4-ee74-456d-80c8-8f31f46e2a3d",
                    "CardType": "SMC-B",
                    "CardVersion": {
                        "COSVersion": {"Major": "4", "Minor": "3", "Revision": "0"},
                        "ObjectSystemVersion": {"Major": "4", "Minor": "3", "Revision": "0"},
                        "CardPTPersVersion": {"Major": "4", "Minor": "4", "Revision": "0"},
                        "LoggingVersion": {"Major": "1", "Minor": "0", "Revision": "0"},
                        "ATRVersion": {"Major": "2", "Minor": "0", "Revision": "0"},
                        "GDOVersion": {"Major": "1", "Minor": "0", "Revision": "0"}
                    },
                    "Iccsn": "80276883110000016161",
                    "CtId": "KT1",
                    "SlotId": "1",
                    "InsertTime": "2019-12-04T17:21:15.601+01:00",
                    "CardHolderName": "Test Praxis Valid",
                    "CertificateExpirationDate": "2048-12-31"
                }]
        }],
    putParams = {
        data: cardreader,
        address: {}
    };

module.exports = {
    getData: function() {
        var
            data = cardreader;

        return data;
    },
    putParams: putParams
};

/*
we need a failure case as well!

var a = {
    "meta": {
        "errors": [],
        "warnings": [],
        "query": {},
        "itemsPerPage": null,
        "page": null,
        "replyCode": 200,
        "model": "cardreader"
    }, "data": {
        "errors": [
            {"code": 112200, "actions": [], "meta": {}, "message": {"code": 112200}}
    ]}
}*/
