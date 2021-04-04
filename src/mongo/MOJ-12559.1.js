/**
 * User: mkramp
 * Date: 2/6/20  11:48 AM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global db, print, ISODate */
"use strict";

var query = {
    actType: 'LABDATA',
    l_extra: {$exists: true},
    labRequestId: {$exists: true},
    timestamp: {$gte: new ISODate( "2019-12-31T23:00:00.000Z" )}
};

var result = db.activities.count( query );

print( 'Possible candidates for missing treatments: ' + result );