/**
 * User: bhagyashributada
 * Date: 5/9/18  9:05 AM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';
var
    statsObj = {
        "meta": {"model": "statuscheck", "tenant": "0", "timestamp": 1537969979757},
        "data": [{
            "status": "ok",
            "state": "running",
            "mem": "{\"rss\":552861696,\"heapTotal\":358567936,\"heapUsed\":313682160,\"external\":29074539}",
            "load": "[0.5,1.05029296875,0.85400390625]"
        }]
    },
    putParams = {
        data: statsObj
    };

module.exports = {
    getData: function () {
        return statsObj;
    },
    putParams: putParams
};