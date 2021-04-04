'use strict';
var
    task = {
        "_id" : "5addcc7aa4e19c5ce4d9a52e",
        "dateCreated" : "2018-04-23T12:07:22.898Z",
        "employeeName" : "",
        "alertTime" : "2018-04-23T12:07:22.879Z",
        "title" : "Neuer Patient via GP",
        "group" : false,
        "creatorId" : "5addcc8ad8a71f5cf203ffff",
        "patientId" : "5addcc7ad8a71f5cf203f824",
        "patientName" : "W, R",
        "sessionWide" : false,
        "type" : "",
        "location" : [ ],
        "candidates" : [ ],
        "roles" : [
            "Empfang"
        ],
        "details" : "",
        "status" : "NEW",
        "urgency" : 2,
        "templateAlertTimeInterval" : "Seconds",
        "allDay" : false,
        "activities" : [ ],
        "callTime" : "2018-04-23T12:07:22.941Z"
    },
    putParams = {
        data: task
    };

module.exports = {
    getData: function() {
        var
            data = JSON.parse( JSON.stringify( task ) );

        return data;
    },
    putParams: putParams
};

