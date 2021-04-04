/**
 * User: rw
 * Date: 28/09/15  11:10
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
//
// iterates through activitysequences and prints id of invalid activitysequence
//
/*global db:true, ISODate, ObjectId */
"use strict";

// make sure we are in local tenant
db = db.getSiblingDB( "0" );

var ac = db.activities.find({timestamp:{$gt: new ISODate("2015-06-30T22:00:00.000Z")}});
var cfs = [];
// Iterate through each act and do...
ac.forEach( function iterateActivities( item ) {
    var cf = item.caseFolderId;

    if( -1 < cfs.indexOf(cf) ) {
        // tested already
        return;
    }
    cfs.push( cf );

    var cfRS = db.casefolders.find({_id: new ObjectId(cf)});

    if( !cfRS.hasNext() ) {
       print( 'Missing casefolder in patient: ' + item.patientId );
    }
} );

