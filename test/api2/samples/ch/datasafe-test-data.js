/**
 * User: bhagyashributada
 * Date: 5/9/18  9:05 AM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';
var
    statsObj = {
        "practice": {
            "locations": [
                {
                    "_id": "5a85a197f653140c401486a9",
                    "commercialNo": "123456789",
                    "locname": "Doc-cirrus"
                },
                {
                    "_id": "000000000000000000000001",
                    "locname": "doccirrus berlin",
                    "commercialNo": "100000001"
                }
            ],
            "employees": [
                {
                    "_id": "5a8580b7c3c2dd0a79ec3a7a",
                    "lastname": "lastname_emp1",
                    "officialNo": "999999990"
                },
                {
                    "_id": "5a8580b7c3c2dd0a79ec3a86",
                    "lastname": "lastname_emp2",
                    "officialNo": "999999999"
                }
            ]
        },
        "collections": {
            "activity": 425388,
            "basecontact": 1022,
            "calendar": 28,
            "casefolder": 4336,
            "employee": 4,
            "identity": 1,
            "location": 2,
            "patient": 4336,
            "patientversion": 21638,
            "schedule": 19723
        },
        "activities": {
            "BGSCHEIN": 19,
            "CAVE": 33,
            "PKVSCHEIN": 326,
            "INVOICE": 345,
            "UTILITY": 2456,
            "FINDING": 5417,
            "SCHEIN": 21293,
            "HISTORY": 27567,
            "OBSERVATION": 41714,
            "DIAGNOSIS": 46085,
            "MEDICATION": 69789,
            "EXTERNAL": 89672,
            "TREATMENT": 120672
        },
        "errors": {
            "26510": {
                "msg": "Bad employee reference in activities.",
                "n": 425388,
                "descr": [
                    {
                        "_id": "999999900",
                        "cnt": 6
                    },
                    {
                        "_id": "999999990",
                        "cnt": 425382
                    }
                ]
            },
            "26511": {
                "msg": "Bad location reference in activities.",
                "n": 2,
                "descr": [
                    {
                        "_id": "12345678",
                        "cnt": 1
                    },
                    {
                        "_id": "2222",
                        "cnt": 1
                    }
                ]
            },
            "26512": {
                "msg": "Bad employee reference in calendars.",
                "n": 2,
                "descr": [
                    {
                        "_id": "999999999",
                        "cnt": 1
                    },
                    {
                        "_id": null,
                        "cnt": 1
                    }
                ]
            },
            "26513": {
                "msg": "Bad location reference in calendars.",
                "n": 1,
                "descr": [
                    {
                        "_id": "1234",
                        "cnt": 1
                    }
                ]
            },
            "26514": {
                "msg": "Bad patient reference in schedules.",
                "n": 1,
                "descr": [
                    {
                        "_id": "21627828",
                        "cnt": 1
                    }
                ]
            },
            "26515": {
                "msg": "Bad scheduletype reference in schedules.",
                "n": 1,
                "descr": [
                    {
                        "_id": "ObjectId(\"5af1b0f5546f9e8e501031ce\")",
                        "cnt": 1
                    }
                ]
            },
            "26516": {
                "msg": "Bad physicians reference in patients.",
                "n": 2,
                "descr": [
                    {
                        "_id": "",
                        "cnt": 1
                    },
                    {
                        "_id": "bhaaa",
                        "cnt": 1
                    }
                ]
            }
        }
    },
    putParams = {
        data: statsObj
    };

module.exports = {
    getData: function() {
        return statsObj;
    },
    putParams: putParams
};