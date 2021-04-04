/**
 * User: maximilian.kramp
 * Date: 10/16/20  11:25 AM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global db, print, ISODate */

var
    queryForPatientEmails = {
        'activities.0': {$exists: false}
    },
    queryForSavedEmailsInActivities = {},
    emptyActivitiesInPatientEmails,
    idsOfEmptyActivitiesInPatientEmails,
    falselyLinkedActivities;

emptyActivitiesInPatientEmails = db.patientemails.find( queryForPatientEmails ).toArray();
print( `emptyActivitiesInPatientEmails: ${emptyActivitiesInPatientEmails.length}` );
idsOfEmptyActivitiesInPatientEmails = emptyActivitiesInPatientEmails.map( function( patientEmail ) {
    return patientEmail && patientEmail._id;
} );

if( idsOfEmptyActivitiesInPatientEmails && idsOfEmptyActivitiesInPatientEmails.length ) {
    queryForSavedEmailsInActivities['savedEmails.0'] = {$in: idsOfEmptyActivitiesInPatientEmails};
    print( `updating ${db.activities.count( queryForSavedEmailsInActivities )} activity entries` );
    falselyLinkedActivities = db.activities.update( queryForSavedEmailsInActivities, {$set: {savedEmails: []}}, {multi: true} );
} else {
    print( `no activity entries need to be updated.` );
}
