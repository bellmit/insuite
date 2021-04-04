/**
 *  Diagnostic script for counting valid labdata activities on a patient MOJ-7435
 *
 * User: strix
 * Date: 31/01/2017
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/* global db:true */
/*jshint strict:false */

db = db.getSiblingDB( "1111111111" );
//db = db.getSiblingDB( "0" );

//  NOTE: this needs to ne set manually before execution
//  This the fromLog _id can be found in PADX zip links like:
//  http://YOURPRC/download/5821d24f170d83fb2adc10c5?fromLog=5821d2294f6f99012b842bdf

var patientId = '57235a4cee1711b49ca9bc2e'; //'586b9f41568cd41bea493202';

countLabdataActivities( db, patientId );

/**
 *
 *  @param db
 *  @param patientId
 */

function countLabdataActivities( db, patientId ) {
    var
        actCursor = db.activities.find( { 'patientId': patientId, 'actType': 'LABDATA' } ),
        numActivities = db.activities.count( { 'patientId': patientId, 'actType': 'LABDATA' } ),
        currentAct,
        currentValid,
        reportingCount,
        tests,
        totalCount = 0,
        validCount = 0,
        invalidCount = 0,
        validEntries = 0,
        invalidEntries = 0,
        i;

    print( '==== Checking ' + numActivities + ' LABDATA activities and reportings for patient '  + patientId + ' ===' );

    while ( actCursor.hasNext() ) {
        currentAct = actCursor.next();
        currentValid = true;

        totalCount = totalCount + 1;
        tests = [];

        if ( !currentAct.l_extra || !currentAct.l_extra.testId || !currentAct.l_extra.testId.length ) {
            print( '(i) LABDATA activity '  + currentAct._id + ' does not have test data' );
            currentValid = false;
        } else {
            tests = currentAct.l_extra.testId;
        }

        if ( currentValid && tests.length === 0 ) {
            print( '(i) LABDATA activity ' + currentAct._id + ' has 0 entries recorded' );
            currentValid = false;
        } else {
            print( '(i) LABDATA activity ' + currentAct._id + ' has ' + tests.length + ' entries recorded in recognized fields' );

            for ( i = 0; i < tests.length; i++ ) {
                if ( tests[i].head && '' !== tests[i].head ) {
                    print( '(i) LABDATA entry has head: ' + tests[i].head );
                    validEntries = validEntries + 1;
                } else {
                    print( '(i) LABDATA entry is missing head: ' + JSON.stringify( tests[i] ) );
                    invalidEntries = invalidEntries + 1;
                }
            }

        }

        reportingCount = db.reportings.count( { 'activityId': currentAct._id + '', 'actType': 'LABDATA' } );
        print( '(i) LABDATA activity ' + currentAct._id + ' has ' + reportingCount + ' reportings on ' + tests.length + ' entries.' );

        if ( reportingCount === tests.length ) {
            print( '(i) LABDATA activity ' + currentAct._id + ' has ' + reportingCount + ' reportings on ' + tests.length + ' entries.' );
        } else {
            print( '(!) MISMATCH: LABDATA activity ' + currentAct._id + ' has ' + reportingCount + ' reportings on ' + tests.length + ' entries.' );
        }

        if ( currentValid ) {
            validCount = validCount + 1;
        } else {
            invalidCount = invalidCount + 1;
        }

    }

    print( '==== Labdata entries, total: ' + totalCount + ' valid: ' + validCount + ' invalid: ' + invalidCount + ' entries: ' + validEntries + ' ====' );

}