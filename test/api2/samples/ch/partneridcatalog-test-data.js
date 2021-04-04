/**
 * User: md
 * Date: 4/10/19  4:28 PM
 * (c) 2019, Doc Cirrus GmbH, Berlin
 */

'use strict';
var
    partneridcatalog =
        {
            "code" : "APPCODE",
            "name" : "test app application"
        },
    putParams = {
        data: partneridcatalog
    };

module.exports = {
    getData: function() {
        var
            data = JSON.parse( JSON.stringify( partneridcatalog ) );

        return data;
    },
    putParams: putParams
};

