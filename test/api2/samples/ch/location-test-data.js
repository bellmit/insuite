var
    locationData = {
        "_id": "54eb41b878382da863181d3b",
        "commercialNo": "370103000",
        "locname": "Dr. Med. M. Schmidt",
        "phone": "012 345 67 89",
        "fax": "000",
        "email": "ein@partner.ch",
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
        "countryMode": ["CH"],
        "countryCode": "CH",
        "country": "Schweiz",
        "city": "Wohlen",
        "zip": "5000",
        "houseno": "5",
        "street": "Einsstrasse",
        "isAdditionalLocation": true,
        "mainLocationId": "000000000000000000000001",
        "defaultPrinter": "Sharp_Empfang_F1_A4",
        "cantonCode" : "1",
        "esrNumber" : "010002333",
        "glnNumber" : "01203000450678",
        "zsrNumber" : "W012345",
        "vatNumber" : "CHE-123.456.789"
    },
    putParams = {
        data: locationData
    },
    postResult = {
        "_id": "54eb41b878382da863181d3b",
        "street": "Einsstrasse",
        "houseno": "5",
        "zip": "5000",
        "city": "Wohlen",
        "country": "Schweiz",
        "countryCode": "CH",
        "addon": "",
        "isAdditionalLocation": true,
        "enabledPrinters": [],
        "commercialNo": "370103000",
        "locname": "Dr. Med. M. Schmidt",
        "phone": "012 345 67 89",
        "fax": "000",
        "email": "ein@partner.ch",
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
        "cantonCode" : "1",
        "glnNumber" : "01203000450678",
        "zsrNumber" : "W012345",
        "vatNumber" : "CHE-123.456.789",
        "defaultPrinter": "Sharp_Empfang_F1_A4"
    },

    deleteResult = {
        "street": "Einsstrasse",
        "houseno": "5",
        "zip": "5000",
        "city": "Wohlen",
        "country": "Schweiz",
        "countryCode": "CH",
        "addon": "",
        "isAdditionalLocation": true,
        "enabledPrinters": [],
        "_id": "54eb41b878382da863181d3b",
        "commercialNo": "370103000",
        "locname": "Dr. Med. M. Schmidt",
        "phone": "012 345 67 89",
        "fax": "000",
        "email": "ein@partner.ch",
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
        "cantonCode" : "1",
        "glnNumber" : "01203000450678",
        "zsrNumber" : "W012345",
        "vatNumber" : "CHE-123.456.789",
        "defaultPrinter": "Sharp_Empfang_F1_A4"
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

