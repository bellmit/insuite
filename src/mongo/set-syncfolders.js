/**
 * User: rrrw
 * Date: 16/06/15  10:53
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
//
//
// -- sets syncFolders from all existing TREATMENTS and MEDICATIONS in each tenant --
//
//
/*global db:true, ObjectId */
"use strict";
var
    dbs, rs, result;

db = db.getSiblingDB( "admin" );
dbs = db.runCommand( {"listDatabases": 1} ).databases;

// Iterate through each database and get its collections.
dbs.forEach( function( database ) {
    if(/^([\da-f]){8,15}$|^0$/.exec(database.name)) {
        db = db.getSiblingDB( database.name );
        db.invoiceconfigurations.update( {}, {$set: {isMedneoCustomer: true}} );
        print( database.name + ': set as medneo customer' );

        rs = db.activities.find( {
            $or: [{actType: "TREATMENT"}, {actType: "MEDICATION"}],
            caseFolderId: {$exists: true}
        } );
        /*jshint newcap:false */
        while( rs.hasNext() ) {
            result = rs.next();
            if( result.caseFolderId ) {
                db.syncfolders.insert( {_id: ObjectId( result.caseFolderId )} );
            }
        }
        print( database.name + ' syncfolders count:' + db.syncfolders.count() );

    } else {
        print( database.name + ' not processing.');
    }
} );

/*
 rs = db.locations.find({_id:ObjectId(MAINLOCATION_ID)});
 if( rs.hasNext() ) {
 loc = rs.next();
 db.employees.update( {type: "PHYSICIAN"}, {
 $addToSet: {
 locations: {_id: MAINLOCATION_ID, locname: loc.locname}
 }
 },
 {multi: true}
 );
 print( database.name + ' ok.');

 } else {
 print( database.name + ' FAILED!!');
 }
 */
