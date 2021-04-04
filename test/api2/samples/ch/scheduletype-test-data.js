'use strict';
var
    scheduleType =
        {
            "_id" : "51b732232e837550c90851fb",
            "calendarRefs" : [
                {
                    "_id" : "59d4041ae909ae0e4e7360be",
                    "calendarId" : "515ae9604013671c12c1c900"
                }
            ],
            "duration" : 10,
            "requiredResources": [
                {
                    "_id" : "5d8b2dd11aa6db695de72db3",
                    "resourceType" : "doctor"
                }
            ],
            "durationUnit" : "MINUTES",
            "isPublic" : false,
            "name" : "Standard",
            "capacity" : 0,
            "numberOfSuggestedAppointments" : 10,
            "isPreconfigured" : false,
            "color" : "#254061",
            "type" : "STANDARD"
        },
    putParams = {
        data: scheduleType
    };

module.exports = {
    getData: function() {
        var
            data = JSON.parse( JSON.stringify( scheduleType ) );

        return data;
    },
    putParams: putParams
};

