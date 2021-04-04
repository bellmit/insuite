
var
    casefolder =
    {
        "title": "Blabla (PRIVATE_CH)", "patientId": "54be764fc404c1d77a286d4d", "type": "PRIVATE_CH"
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

