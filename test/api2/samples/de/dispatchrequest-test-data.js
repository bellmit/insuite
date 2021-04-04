'use strict';
var
    dispatchrequest =
    {
        "bsnr": "101010101",
        "lanr": "004178504",
        "patientId": "GHD_INTERNAL_ID",
        "dispatchActivities": [
            {
                "actType": "PRESASSISTIVE",
                "prescriptionDate":"2016-01-05T00:00:00.000Z",
                "activities": [
                    {
                        "codePZN": "112233",
                        "codeHMV": "20.29.99",
                        "note": "test Assistive",
                        "dose": "12g",
                        "prescPeriod": "2016.01.15 - 2017.02.13"
                    }
                ]
            }
        ]
    },
    putParams = {
        data: dispatchrequest
    };

module.exports = {
    getData: function() {
        var
            data = JSON.parse( JSON.stringify( dispatchrequest ) );

        return data;
    },
    putParams: putParams
};

