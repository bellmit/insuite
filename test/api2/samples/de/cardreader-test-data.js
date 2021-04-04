'use strict';
var
    cardreader =
        {
            "_id": "5ac75093298c076ea5140744",
            "name": "cardreader-display-name",
            "driver": "germantelematics",
            "port": 2,
            "mobile": true,
            "ds": "workstation-deviceserver-name"
        },
    putParams = {
        data: cardreader,
        address: {}
    };

module.exports = {
    getData: function() {
        var
            data = JSON.parse( JSON.stringify( cardreader ) );

        return data;
    },
    putParams: putParams
};

