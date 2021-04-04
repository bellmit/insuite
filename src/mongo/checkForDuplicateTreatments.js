/**
 *  * User: mkramp
 *   * Date: 2/20/20  11:35 AM
 *    * (c) 2012, Doc Cirrus GmbH, Berlin
 *     */

/*global db, print, printjson, ISODate */
"use strict";

var query = {
    actType: 'TREATMENT',
    timestamp: {$gte: new ISODate( "2020-02-09T23:00:00.000Z" )}
};

var activities = db.activities.find( query ).toArray();

var d1,
    d2;

var possibleDuplicateTreatments = activities.filter( activity => {
    return activities.find( act => {
        d1 = new Date( activity.timestamp );
        d2 = new Date( act.timestamp );
        return activity.patientId === act.patientId &&
               activity.caseFolderId === act.caseFolderId &&
               activity.code === act.code &&
               (d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate()) &&
               activity !== act;
    } );
} );

var activitiesInInvoices = db.activities.find( {
    actType: 'INVOICE',
    activities: {$in: possibleDuplicateTreatments.map( activity => activity._id.toString() )}
} ).toArray();

var lastSeenCode = '';

var activitiesToDelete = possibleDuplicateTreatments.filter( activity => {
    if( activity.code !== lastSeenCode ) {
        lastSeenCode = activity.code;
        return false;
    }
    return true;
} );

print( 'activities: ' );
print( activities.length );
print( 'Possible candidates for duplicate treatments: ' );
print( possibleDuplicateTreatments.length );
print( 'activitiesInInvoices: ' );
print( activitiesInInvoices.length );
print( 'activitiesToDelete: ' );
print( activitiesToDelete.length );
printjson( activitiesToDelete );

var map = activitiesToDelete.map( elem => elem._id );

/*db.activities.remove( {
    _id: {
        $in: map
    }
} );*/
