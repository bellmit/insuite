'use strict';

var
    company = {
        "_id": "54eb41b878382da863181d3b",
        "medneoId": "X",
        "coname": "Klinikum Eins",
        "tenantId": "12837887dddd"
    },
    putParams = {
        data: company
    };

module.exports = {
    getData: function() {
        return JSON.parse( JSON.stringify( company ) );
    },
    putParams: putParams
};
