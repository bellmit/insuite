/*global db, ObjectId, print, printjsononeline*/

var
    internalLabs = [
        'SylexVMX secureBox '
    ],
    externalLabs = [
        'SwiSyn General ',
        'SwiSyn Microbiology '
    ],
    billable,
    ids,
    treatmentsFromLabLogEntry,
    query;

var lablogEntriesWithActivities = db.lablogs.find( {
    linkedActivities: {$exists: true, $ne: []},
    source: {$in: [...internalLabs, ...externalLabs]}
}, {
    linkedActivities: 1,
    source: 1
} ).toArray();

for( var i = 0; i < lablogEntriesWithActivities.length; i++ ) {
    billable = internalLabs.includes( lablogEntriesWithActivities[i].source ) ? '1' : '0';

    ids = lablogEntriesWithActivities[i].linkedActivities.map( function( activityId ) {
        return ObjectId( activityId );
    } );

    query = {
        _id: {$in: ids},
        actType: 'TREATMENT',
        areTreatmentDiagnosesBillable: billable === '0' ? '1' : '0'
    };

    //Backup
    treatmentsFromLabLogEntry = db.activities.find( query, {
        areTreatmentDiagnosesBillable: 1
    } ).toArray();
    if( treatmentsFromLabLogEntry && treatmentsFromLabLogEntry.length ) {
        print( 'Backup' );
        printjsononeline( treatmentsFromLabLogEntry );

        print( `Setting areTreatmentDiagnosesBillable to ${billable}` );
        db.activities.update( query, {
            $set: {areTreatmentDiagnosesBillable: billable}
        }, {
            multi: true
        } );
    } else {
        print( `LabLog with id: ${lablogEntriesWithActivities[i]._id} is already correct.` );
    }
}
