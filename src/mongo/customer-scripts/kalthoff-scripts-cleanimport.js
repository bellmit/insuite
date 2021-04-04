/**
 * User: rrrw
 * Date: 08/02/2017  12:59 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global db, ObjectId, ISODate */
"use strict";

//KALTHOFF  PVS

// script 1 ) find treatments in imported folder
var rs = db.activities.aggregate([{$match:{timestamp:{$gt:ISODate("2016-09-01T00:00:00.000Z")},actType:"TREATMENT",locImportId:{$exists:false}}},
    {$group:{_id:"$caseFolderId",cnt:{$sum:1}, patientId:{$first:"$patientId"}}}]);

rs.forEach( function( item ) {
    if( !item._id ) {
        return;
    }
    var rs2 = db.casefolders.find( {_id: ObjectId( item._id )} );
    var i = rs.hasNext() && rs2.next();
    if( i && i.title && /^Import/.exec( i.title ) ) {
        print( item.patientId + ' _has_ ' + item.cnt + ' _treatments in imported folder_' );
    }
} );

// script 2)
// create PKVSCHEIN if none exists in a casefolder.

db.activities.distinct('caseFolderId',{timestamp:{$gte:ISODate("2016-12-31T23:00:00.000Z")},actType:'PKVSCHEIN',locImportId:{$exists:false}});

// .. script unfinished...