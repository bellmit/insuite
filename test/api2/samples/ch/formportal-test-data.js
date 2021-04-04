/**
 * User: nicolas.pettican
 * Date: 09.12.19  16:22
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';
const
    formdata = {
      "name": "test1"
    },
    putParams = {
        data: formdata
    };

module.exports = {
    getData: function() {
        return JSON.parse( JSON.stringify( formdata ) );
    },
    putParams: putParams
};

