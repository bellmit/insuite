'use strict';
var
    tag = {
        "title": "ERYTESTO",
        "type": "LABDATA",
        "sampleNormalValueText": [
            "4.63 - 6.08"
        ],
        "testLabel": "ERYTHROZYTEN",
        "unit": "T/l"
    },
    putParams = {
        data: tag
    };

module.exports = {
    getData: function() {
        return JSON.parse( JSON.stringify( tag ) );
    },
    putParams: putParams
};

