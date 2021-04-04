/**
 * User: bhagyashributada
 * Date: 2019-04-09  16:27
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';
let
    audit =
        {
            "_id": "5ca2481936dfd9225a802ed1",
            "user": "vivy",
            "userId": "000",
            "timestamp": "2019-04-01T17:19:21.675Z",
            "action": "transfer",
            "model": "media",
            "descr": "Vivy Versand des Dokuments patient: TestFN TestLN",
            "objId": "5c87c840ea5dc58517d34313",
            "relatedActivities": []
        },
    putParams = {
        data: audit
    };

module.exports = {
    getData: function() {
        var
            data = JSON.parse( JSON.stringify( audit ) );

        return data;
    },
    putParams: putParams
};
