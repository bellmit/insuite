'use strict';
var
    calendar =
        {
            "_id" : "515ae9604013671c12c1c900",
            "locationId" : "000000000000000000000001",
            "consultTimes" : [
                {
                    "publicInsurance" : false,
                    "privateInsurance" : true,
                    "end" : [
                        17,
                        0
                    ],
                    "start" : [
                        9,
                        0
                    ],
                    "colorOfConsults" : "#ff0000",
                    "days" : [
                        1,
                        2,
                        3,
                        4,
                        5
                    ]
                }
            ],
            "employee" : "111ae9604013671c12c1c111",
            "isPublic" : true,
            "type" : "PATIENTS",
            "name" : "Arztkalender",
            "color" : "#441122",
            "calGroup" : [
                "Neuro",
                "Ortho"
            ],
            "resources": [
                {
                    "_id" : "5e0f6258fb456c171d809aa9",
                    "resourceType" : "doctor",
                    "resource" : "5e02064d333ef7659d75a982"
                }
            ]
        },
    putParams = {
        data: calendar
    };

module.exports = {
    getData: function() {
        var
            data = JSON.parse( JSON.stringify( calendar ) );

        return data;
    },
    putParams: putParams
};

