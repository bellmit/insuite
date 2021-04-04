/**
 * Utility script for undoing the 'BILL' step of PVS approval, to allow recreation of broken PVS logs
 *
 * User: strix
 * Date: 26/01/2017
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/* global db:true, ObjectId */
"use strict";
db = db.getSiblingDB( "1111111111" );
//db = db.getSiblingDB( "0" );

//  NOTE: this needs to ne set manually before execution
//  This the fromLog _id can be found in PADX zip links like:
//  http://YOURPRC/download/5821d24f170d83fb2adc10c5?fromLog=5821d2294f6f99012b842bdf

var
    pvsLogId = '5821d2294f6f99012b842bdf',
    pvsLog = loadPvsLog( db, pvsLogId ),
    activityIds = listActivities( db, pvsLogId );

setActivitiesValid( db, activityIds );

/**
 *  Get the PVSLOG
 *  @param db
 *  @param logId
 *  @return {*}
 */

function loadPvsLog( db, logId ) {
    var csr = db.pvslogs.find({ _id: ObjectId( logId ) });
    if ( !csr.hasNext() ) { return null; }
    return csr.next();
}

/**
 *  Find all activities referred to in this log
 *  @param db
 *  @param logId
 *  @return {Array}
 */

function listActivities( db, logId ) {
    var
        allIds = [],
        entryCsr = db.invoiceentries.find( { 'invoiceLogId': logId } ),
        logEntryObj,
        entryData,
        cds,
        diagnoses,
        treatments,
        i;

    while ( entryCsr.hasNext() ) {
        logEntryObj = entryCsr.next();

        entryData = logEntryObj.data;
        cds = entryData.continuousDiagnoses || [];
        diagnoses = entryData.diagnoses || [];
        treatments = entryData.treatments || [];

        //printjson(  entryData );
        //print( '(****) entryData cds: ', cds );
        //print( '(****) entryData diagnoses: ', diagnoses );
        //print( '(****) entryData treatments: ', treatments );

        print( '(i) pvslog ' + logId + ' has entry ' + logEntryObj._id + ' ' + cds.length + '/' + diagnoses.length + '/' + treatments.length );

        for ( i = 0; i < cds.length; i++ ) {
            print( '(i) logentry has continuousDiagnosis: ' + cds[i]._id );
            allIds.push( cds[i]._id );
        }

        for ( i = 0; i < diagnoses.length; i++ ) {
            print( '(i) logentry has diagnosis: ' + diagnoses[i]._id );
            allIds.push( diagnoses[i]._id );
        }

        for ( i = 0; i < treatments.length; i++ ) {
            print( '(i) logentry has treatment: ' + treatments[i]._id );
            allIds.push( treatments[i]._id );
        }

    }

    return allIds;
}

/**
 *  activity.catalog === true
 *  @param db
 *  @param activityIds
 */

function setActivitiesValid( db, activityIds ) {

    print( '\n=== Marking ' + activityIds.length + ' activities valid ===\n' );

    var
        forReal = false,        // set to false for test run
        invalidCatalog = [],
        actCsr,
        act,
        status,
        i;

    if( forReal ) {
        print( '==== UNDOING APPROVAL OF PVSLOG ENTRIES FOR ====' );
        print( '\n*** NB: YOU MUST SILL MANUALLY CHANGE THE PVSLOG STATUS ***\n');
    } else {
        print( '==== TEST RUN!!! ====' );
    }
    print( '(****) pvslog: ', pvsLog );
    print( '(****) activities: ', activityIds );

    for ( i = 0; i < activityIds.length; i++ ) {
        print('(>) Loading activity ' + activityIds[i] );
        actCsr = db.activities.find( { _id: ObjectId( activityIds[i] ) } );
        if ( actCsr.hasNext() ) {
            act = actCsr.next();

            if ( !act.catalog ) {
                print( '(!) warn: activity does not have a valid catalog entry: ' + activityIds[i] );
                invalidCatalog.push( activityIds[i] );
            }

            status = act.status;
            if ( 'VALID' !== status && 'CANCELLED' !== status ) {
                print( '(i) to update: activity ' + act.actType + ' ' + act._id + ': ' + status + ' -> VALID' );

                if ( forReal ) {
                    db.activities.update( { '_id': act._id }, { $set: { 'status': 'VALID' } } );
                    print( '(>) updated activity ' + act.actType + ' ' + act._id + ': ' + status + ' -> VALID' );
                }

            } else {
                if ( 'CANCELLED' === status ) {
                    print( '(i) Activity is CANCELLED, not changing: ' + act._id + ' ' + act.actType );
                }
                if ( 'VALID' === status ) {
                    print( '(i) Activity is already VALID, not changing: ' + act._id + ' ' + act.actType );
                }
            }

        } else {
            print('(!) warning: Missing activity: ' + activityIds[i] );
        }
    }

    if ( invalidCatalog.length > 0 ) {
        print( '(i) activities with invalid catalog entries: ', invalidCatalog );
    }

}