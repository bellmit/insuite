'use strict';
var
    role =
        {
            "_id" : "000000000000000000000001",
            "value" : "Empfang"
        };

module.exports = {
    getData: function() {
        var
            data = JSON.parse( JSON.stringify( role ) );

        return data;
    }
};

