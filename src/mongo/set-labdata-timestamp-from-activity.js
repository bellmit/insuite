/**
 *  Update LABDATA reportings on Kalthoff to set the timestampDate to match the timestamp of the LABDATA activity
 *
 * User: strix
 * Date: 04/02/2017
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/* global db:true, ObjectId */
"use strict";
db = db.getSiblingDB( "1111111111" );
//db = db.getSiblingDB( "0" );

updateLabdataActivities( db );

/**
 *  @param db
 */

function updateLabdataActivities( db ) {
    var
        reportingCursor = db.reportings.find( { 'actType': 'LABDATA', activityId: { $exists: true } } ),
        reporting,
        activity,
        reportingCount = 0,
        fixCount = 0,
        brokenCount = 0,
        forReal = false;

    while( reportingCursor.hasNext() ) {
        reporting = reportingCursor.next();
        reportingCount = reportingCount + 1;

        activity = db.activities.findOne( { _id: ObjectId( reporting.activityId ) } );

        if ( activity ) {

            if ( activity.timestamp.toString() !== reporting.timestampDate.toString() ) {
                if ( forReal ) {
                    print( '(>) setting reporting date ' + reporting._id + ' from activity ' + activity._id + ' to ' + activity.timestamp );
                    print( '(undo) db.reportings.update( { _id: ObjectId(' + reporting._id + '), { $set: { "timestampDate": ISODate("' + reporting.timestampDate + '") } } } );'  );
                    //db.update( { _id: reporting._id }, { $set: { 'timestampDate': activity.timestamp } } );
                } else {
                    print( '(>) probe only: reporting date ' + reporting._id + ' from activity ' + activity._id + ' should be ' + activity.timestamp + ' and not: ' + reporting.timestampDate );
                }
                fixCount = fixCount + 1;
            }

        } else {
            print( '(!) Could not find activity "' + reporting.activityId + '" for reporting entry: ' + reporting._id );
            brokenCount = brokenCount + 1;
        }

    }

    print( '==== Set date on LABDATA reportings, total: ' + reportingCount + ' fixed: ' + fixCount + ' broken: ' + brokenCount + ' ====' );
}