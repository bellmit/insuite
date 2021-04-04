/**
 * User: bhagyashributada
 * Date: 2019-08-06  15:53
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
'use strict';
let
    emailOptions =
        {
            "emailTo": "email@example.com",
            "emailFrom": "testemail@example.com",
            "subject": "TEST Email",
            "text": "This is test email."
        },
    putParams = {
        data: emailOptions
    };

module.exports = {
    getData: function() {
        let
            data = JSON.parse( JSON.stringify( emailOptions ) );

        return data;
    },
    putParams: putParams
};