'use strict';
var
    prcdispatch =
    {
        id: "TO BE DONE"
         },
    putParams = {
        data: prcdispatch
    };

module.exports = {
    getData: function() {
        var
            data = JSON.parse( JSON.stringify( prcdispatch ) );

        return data;
    },
    putParams: putParams
};

