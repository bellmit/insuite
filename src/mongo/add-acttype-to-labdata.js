/**
 * Utility script for MOJ-7406, to add missing actType entry to some reportings which are missing them on customer systems
 *
 * User: strix
 * Date: 25/01/2017
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*global db:true, ObjectId */
"use strict";

print( '==== REPORTING DATA CORRECTION FOR MOJ-7406 ====' );

//db = db.getSiblingDB( "1111111111" );
db = db.getSiblingDB( "0" );
addActTypeToReportings( db );

// For each customer database
//db.runCommand( { "listDatabases": 1 } ).databases.forEach( addActTypeToReportings );

function addActTypeToReportings( db ) {

    /*
    if( !(/^([\da-f]){8,15}$|^0$/.exec( db.name ) ) ) {
        print( 'Skipping database: ' + db.name );
        return;
    }
    */

    var
        toFix,
        withActivity,
        nextReporting,
        nextActivity,
        brokenCount = 0,
        fixCount = 0;

    print( '\n\n==== STARTING: Checking database: ' + db.name + ' for broken reportings ====' );

    print( '(i) Total reportings in collection: ' + db.reportings.count() );

    toFix = db.reportings.find( { 'actType': '', 'activityId': { $exists: true } }, { '_id': 1, 'activityId': 1 } );

    while ( toFix.hasNext() ) {
        nextReporting = toFix.next();

        withActivity = db.activities.find( { '_id': ObjectId( nextReporting.activityId + '' ) }, { '_id': 1, 'actType': 1 } );
        nextActivity = withActivity.hasNext() ? withActivity.next() : null;

        brokenCount = brokenCount + 1;

        if ( nextActivity ) {
            print( '(>) Setting actType ' + nextActivity.actType + ' from activity ' + nextActivity._id + ' on reporting ' + nextReporting._id );
            db.reportings.update( { '_id': nextReporting._id }, { $set: { 'actType': nextActivity.actType } } );
            fixCount = fixCount + 1;
        } else {
            print( '(!) Could not find activity for reporting: ' + nextReporting._id );
        }
    }

    print( '\n\n==== COMPLETED: Checking database: ' + db.name + ' for broken reportings, corrected ' + fixCount + ' of '  + brokenCount + ' ====' );
}


