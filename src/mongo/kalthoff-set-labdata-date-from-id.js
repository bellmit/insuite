/**
 * Utility script for correcting LABDATA dates on Kalthoff dataset
 *
 * This will set the activity timestamp to be the same as the import date where lab date > 2017-01-01
 *
 * NOTE: this DOES NOT update other reporting fields such as dayOfWeek, just timestampDate
 *
 * User: strix
 * Date: 25/01/2017
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*global db:true, ISODate */
"use strict";

print( '==== UPDATING LABDATA ACTIVITY DATES FOR 2017 ====' );

//db = db.getSiblingDB( "1111111111" );
db = db.getSiblingDB( "0" );
updateLabdataDates( db );

// For each customer database
//db.runCommand( { "listDatabases": 1 } ).databases.forEach( addActTypeToReportings );

function updateLabdataDates( db ) {

    var
        ldQuery = {
            'actType': 'LABDATA',
            'timestamp': { $gte: ISODate( '2017-01-01T00:00:00.000Z' ) }
        },
        activityCount = db.activities.count( ldQuery ),
        activityCursor = db.activities.find( ldQuery ),
        activity,
        actDate,
        id8bytes,
        idTimestamp,
        idDate,
        totalCount = 0,
        fixCount = 0,
        cmpActDate, cmpIdDate,
        forReal = true;

    print( '(i) Checking ' + activityCount + ' LABDATA activities' );

    while( activityCursor.hasNext() ) {
        activity = activityCursor.next();
        totalCount = totalCount + 1;

        //ObjectId("586b9ed6568cd41bea43c17c")
        id8bytes = activity._id.toString().substr(10, 8);
        idTimestamp = parseInt( id8bytes, 16 );
        idDate = new Date( idTimestamp * 1000 );

        actDate = new Date( activity.timestamp );

        print( '(i) Activity _id ' + activity._id.toString() + ' 8b: ' + id8bytes + ' timestamp: ' + idTimestamp + ' _id date: ' + idDate.toISOString() + ' datetime: ' + activity.timestamp.toISOString() );

        cmpActDate = actDate.toISOString().substr( 0, 10 );
        cmpIdDate = idDate.toISOString().substr( 0, 10 );

        if ( cmpIdDate !== cmpActDate ) {
            print( '(i) Date mismatch between activity timestamp and _id timestamp: ' + cmpActDate + ' !== ' + cmpIdDate );

            if ( forReal ) {
                print( '(>) Updating activity timestamp to match import/creation date: ' + idDate.toISOString() );

                print( '(undo) db.activities.update( { _id: ObjectId("' + activity._id + '") }, { $set: { "timestamp": ISODate("' + actDate.toISOString() + '") } } )' );

                db.activities.update( { _id: activity._id }, { $set: { 'timestamp': ISODate( idDate.toISOString() ) } } );

                print( '(undo) db.reportings.update( { "activityId": "' + activity._id.valueOf() + '" }, { $set: { "timestampDate": ISODate("' + actDate.toISOString() + '") } } )' );
                db.reportings.update( { 'activityId': activity._id.valueOf() }, { $set: { 'timestampDate': ISODate( idDate.toISOString() ) } } );

                fixCount = fixCount + 1;
            }

        }

    }

    print( '\n\n==== COMPLETED: Checking database: ' + db.name + ' for broken reportings, corrected ' + fixCount + ' of '  + totalCount + ' ====' );
}