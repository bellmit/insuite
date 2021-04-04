'use strict';
var
    physician = {
        "_id": "535e0c283da3b7eb3fac9de7",
        "addresses": [
            {
                "kind": "OFFICIAL",
                "_id": "535e0c283da3b7eb3fac9de8",
                "countryCode": "D",
                "country": "Deutschland",
                "city": "Berlin",
                "zip": "12351",
                "houseno": "20-22",
                "street": "Lipschitzallee"
            }
        ],
        "bsnrs": [ "99999999" ],
        "communications": [
            {
                "type": "PHONEJOB",
                "value": "0306021081",
                "_id": "535e0c283da3b7eb3fac9de9"
            }
        ],
        "expertise": "INTERNAL",
        "firstname": "Andreas",
        "lastname": "Genrich",
        "talk": "MR",
        "title": "Dr. med."
    },
    putParams = {
        data: physician
    };

module.exports = {
    getData: function() {
        return JSON.parse( JSON.stringify( physician ) );
    },
    putParams: putParams
};