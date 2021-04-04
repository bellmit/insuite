/**
 * User: mkramp
 * Date: 2/6/20  12:05 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global db, print, ISODate */
"use strict";

var query1 = {
    transformers: {
        $elemMatch: {
            $or: [{billingFlag: {$exists: false}}, {billingFlag: false}]
        }
    },
    sinks: []
};
var query2 = {
    transformers: {
        $elemMatch: {
            billingFlag: true,
            $and: [
                {
                    $or: [{disallowGkvBilling: {$exists: false}}, {disallowGkvBilling: false}]
                },
                {
                    $or: [{allowGkvBilling: {$exists: false}}, {allowGkvBilling: false}]
                }
            ]
        }
    },
    sinks: []
};
var query3 = {
    transformers: {
        $elemMatch: {
            billingFlag: true,
            disallowGkvBilling: true,
            $or: [{allowGkvBilling: {$exists: false}}, {allowGkvBilling: false}]
        }
    },
    sinks: []
};
var query4 = {
    transformers: {
        $elemMatch: {
            billingFlag: true,
            $or: [{disallowGkvBilling: {$exists: false}}, {disallowGkvBilling: false}],
            allowGkvBilling: true
        }
    },
    sinks: []
};

var result1 = db.flows.count( query1 );
print( 'Leistungen übernehmen OFF: ' + result1 );

var result2 = db.flows.count( query2 );
print( 'Leistungen übernehmen (GKV,PKV) && Leistungen (GKV) NUR DOKUMENTATIV: ' + result2 );

var result3 = db.flows.count( query3 );
print( 'Leistungen übernehmen (PKV) && Leistungen (GKV) NUR DOKUMENTATIV: ' + result3 );

var result4 = db.flows.count( query4 );
print( 'Leistungen übernehmen (GKV,PKV) && Leistungen (GKV) ABRECHENBAR: ' + result4 );

print( 'Probleme?: ' + ((result2 && result4) ? 'JA' : 'NEIN') );