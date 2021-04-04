'use strict';
var
    casefolder =
    {
        "title": "Blabla (BG)", "patientId": "54be764fc404c1d77a286d4d", "type": "BG"
    },
    putParams = {
        data: casefolder
    };

module.exports = {
    getData: function() {
        var
            data = JSON.parse( JSON.stringify( casefolder ) );

        return data;
    },
    putParams: putParams
};

