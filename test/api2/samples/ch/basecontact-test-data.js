'use strict';
var
    basecontact =
        {
            "_id": "5d07aa8e48fff30a1b5d8d49",
            "talk": "",
            "title": "",
            "nameaffix": "",
            "firstname": "Peter",
            "lastname": "Meter",
            "institutionType": "OTHER",
            "bsnrs": [
                "278282700"
            ],
            "ownZsrNumber": false,
            "officialNo": "200000201"
        };

module.exports = {
    getData: function() {
        var
            data = JSON.parse( JSON.stringify( basecontact ) );

        return data;
    }
};

