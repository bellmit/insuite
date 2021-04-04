/**
 * User: rrrw
 * Date: 04/10/2016  2:18 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global db*/
"use strict";

var TOPTENTREATMENTCODES = ["1","2","3"];
var t1 =
    db.reportings.aggregate([
        {
            "$match": {
                "actType": {
                    "$in": [
                        "TREATMENT",
                        "DIAGNOSIS",
                        "MEDICATION"
                    ]
                },
                "code": {$in: TOPTENTREATMENTCODES}
            }
        },
        {
            "$project": {
                "treatCode": {
                    "$cond": [
                        {
                            "$eq": [
                                "$actType",
                                "TREATMENT"
                            ]
                        },
                        "$code",
                        "_EMPTY_"
                    ]
                },
                "diagCode": {
                    "$cond": [
                        {
                            "$eq": [
                                "$actType",
                                "DIAGNOSIS"
                            ]
                        },
                        "$code",
                        "_EMPTY_"
                    ]
                },
                "phPZN": 1,
                "phNLabel": 1,
                "code": 1,
                "content": 1
            }
        },
        {
            "$group": {
                "total": {
                    "$sum": 1
                },
                "_id": {
                    "caseFolderId": "$caseFolderId"
                },
                "treatCode": {
                    "$push": "$treatCode"
                },
                "diagCode": {
                    "$push": "$diagCode"
                },
                "phPZN": {
                    "$push": "$phPZN"
                }
            }
        }] ),



        b = [
        {
            "$sort": {
                "total": -1
            }
        },
        {
            "$project": {
                "_id": 1,
                "total": 1,
                "treatCode": {
                    "$filter": {
                        "input": "$treatCode",
                        "as": "item",
                        "cond": {
                            "$ne": [
                                "$$item",
                                "_EMPTY_"
                            ]
                        }
                    }
                },
                "diagCode": {
                    "$filter": {
                        "input": "$diagCode",
                        "as": "item",
                        "cond": {
                            "$ne": [
                                "$$item",
                                "_EMPTY_"
                            ]
                        }
                    }
                },
                "phPZN": 1
            }
        },
        {
            "$unwind": "$treatCode"
        },
        {
            "$group": {
                "_id": {
                    "treatCode": "$treatCode"
                },
                "total": {
                    "$sum": 1
                },
                "price": {
                    "$sum": "$price"
                },
                "name": {
                    "$first": "$treatCode"
                },
                "phPZN": {
                    "$first": "$phPZN"
                },
                "diagCode": {
                    "$first": "$diagCode"
                },
                caseFolderId: {"$first": "$_id.caseFolderId" }  // MISSING
            }
        },
        {
            $sort: {
                total: -1
            }
        },
        {
            $limit: 10
        },
        {
            "$unwind": "$diagCode"
        },
            {
                "$group": {
                    "_id": {
                        "diagCode": "$diagCode"
                    },
                    "total": {
                        "$sum": "$total"
                    },
                    "price": {
                        "$sum": "$price"
                    },
                    "name": {
                        "$first": "$diagCode"
                    },
                    "phPZN": {
                        "$first": "$phPZN"
                    },
                    casefolderId: {"$first": "$_id.caseFolderId"}, // MIISNG
                    "children": {
                        "$addToSet": {
                            "total": "$total",
                            "price": "$price",
                            "name": "$name",
                            "children": {
                                "$slice": [
                                    "$children",
                                    10
                                ]
                            }
                        }
                    }
                }
            },
        {
            $sort: {
                total: -1
            }
        },
        {
            $limit: 10
        } ];

console.log(t1, b);