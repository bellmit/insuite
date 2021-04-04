/**
 * User: rrrw
 * Date: 17/03/2017  17:27
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

"use strict";

/*global db, ISODate */

var checklist = [
    {
        codes:['13691','13692'],
        actTypes:['PROCEDERE','TREATMENT']
    },
    {
        codes:['13691','13692'],
        actTypes:['LABDATA','TREATMENT']
    },
    {
        codes:['01430'],
        actTypes:['PUBPRESCR','TREATMENT']
    },
    {
        codes:['01430'],
        actTypes:['UTILITY','TREATMENT']
    },
    {
        codes:['01430'],
        actTypes:['COMMUNICATION','TREATMENT']
    },
    {
        codes:['01430'],
        actTypes:['REFERRAL','TREATMENT']
    },
    {
        codes:['40144'],
        actTypes:['COMMUNICATION','TREATMENT']
    },
    {
        codes:['01435'],
        actTypes:['CONTACT','TREATMENT']
    }
];

// Formular M56 &&  01621 ??
// "Einweisungen" and 01430  ??

var casQ1 = db.activities.distinct('caseFolderId',{actType:"SCHEIN",timestamp:{$gte:ISODate("2017-01-01T00:00:00.000Z"),$lt:ISODate("2017-04-01T00:00:00.000Z")}});

var report = {};

checklist.forEach( function(i) {
    print( '------------------------------------------------');
    print( i.actTypes[0] + ' in Akte ohne Ziffern: ' + i.codes.join() );
    print( '------------------------------------------------');

    var result = db.activities.aggregate( [
        {
            $match: {
                caseFolderId: {$in: casQ1},
                $or: [{actType: i.actTypes[0]}, {actType: "TREATMENT", code: {$in: i.codes}}]
            }
        },
        {
            $group: {
                _id: "$caseFolderId", patientId: {$first: "$patientId"}, L: {
                    $sum: {
                        "$cond": {
                            "if": {"$eq": ["$actType", "TREATMENT"]},
                            "then": 1,
                            "else": 0
                        }
                    }
                },
                P: {
                    $sum: {
                        "$cond": {
                            "if": {"$eq": ["$actType", i.actTypes[0]]},
                            "then": 1,
                            "else": 0
                        }
                    }
                }
            }
        },
        {$match: {P: {$gt: 0}, L: {$eq: 0}}}
    ] );

    result.forEach( function (k) {
        var key = 'https://cz15410241.hub.doc-cirrus.com/incase#/patient/' + k.patientId + '/tab/casefile_browser/casefolder/' + k._id;
        if( report[key] ) {
            report[key] += ', ' + i.codes.join();
        } else {
            report[key] = i.codes.join();
        }
    } );
} );

Object.keys( report ).sort().forEach( function( j ) {
    print( j + '\t\t' + report[j] );
});


/*

 var casQ1 = db.activities.distinct('caseFolderId',{actType:{$in:["PROCEDERE","KOMMUNIKATION"]},timestamp:{$gte:ISODate("2017-01-01T00:00:00.000Z"),$lt:ISODate("2017-04-01T00:00:00.000Z")}});
 var casQ1 = db.activities.distinct('caseFolderId',{content:/Einweisung/,timestamp:{$gt:ISODate("2017-01-07T00:00:00.000Z")}});


 var result = db.activities.aggregate( [
 {$match:{caseFolderId:{$in:casQ1}, {actType:"TREATMENT",code:{$in:['01431']}}},
 {$group: {
 _id: "$caseFolderId", patientId: {$first: "$patientId"}, L: {
 $sum: {
 "$cond": {
 "if": {"$eq": ["$actType", "TREATMENT"]},
 "then": 1,
 "else": 0
 }
 }
 },
 P: {
 $sum: {
 "$cond": {
 "if": {"$eq": ["$actType", "FORM"]},
 "then": 1,
 "else": 0
 }
 }
 }
 }},
 {$match:{P:{$gt:0},L:{$eq:0}}}
 ]);

 result.forEach( function (k) {
 print( 'https://cz15410241.hub.doc-cirrus.com/incase#/patient/' + k.patientId + '/tab/casefile_browser/casefolder/' + k._id );
 } );

 */


casQ1 = db.activities.distinct('caseFolderId',{content:/Einweisung/,timestamp:{$gt:ISODate("2017-01-07T00:00:00.000Z")}});


var result = db.activities.aggregate( [
    {$match:{caseFolderId:{$in:casQ1}, actType:"TREATMENT",code:{$in:['01431']}}},
    {$group: {
        _id: "$caseFolderId", patientId: {$first: "$patientId"}, L: {
            $sum: {
                "$cond": {
                    "if": {"$eq": ["$actType", "TREATMENT"]},
                    "then": 1,
                    "else": 0
                }
            }
        }
    }},
    {$match:{L:{$eq:0}}}
]);

result.forEach( function (k) {
    print( 'https://cz15410241.hub.doc-cirrus.com/incase#/patient/' + k.patientId + '/tab/casefile_browser/casefolder/' + k._id );
} );

