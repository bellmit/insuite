/**
 * User: nicolas.pettican
 * Date: 23.06.20  11:38
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global db, printjson, ObjectId */

const
    importedPatientsStartingPatientNumber = 200000,
    actTypeToFind = 'EXTERNAL',
    allPatients = db.patients.find( {patientNumber: {$gte: importedPatientsStartingPatientNumber}}, {
        _id: 1,
        patientNo: 1
    } );

let
    index,
    patient,
    activity,
    meddata,
    note,
    noteFragment,
    meddataFragment,
    allActivitiesForPatient,
    meddataFragmentsForPatient = [],
    notesFragmentsForPatient = [],
    isBuildingNotes = false,
    isBuildingMeddata = false;

function isStartOfMeddataEntry( args ) {
    const {index, activityList} = args;
    return activityList[index] && activityList[index].subType === 'U'
           && activityList[index + 1] && activityList[index + 1].subType === 'F'
           && activityList[index + 2] && activityList[index + 2].subType === 'I'
           && activityList[index + 3] && activityList[index + 3].subType === 'F'
           && activityList[index + 4] && activityList[index + 4].subType === 'E';
}

function isEndOfMeddataEntry( args ) {
    const {index, activityList} = args;

    if( activityList[index - 1] && activityList[index - 1].subType === 'U'
        && activityList[index] && activityList[index].subType === 'F'
        && activityList[index + 1] && activityList[index + 1].subType === 'I'
        && activityList[index + 2] && activityList[index + 2].subType === 'F'
        && activityList[index + 3] && activityList[index + 3].subType === 'E' ) {
        return false;
    }

    if( activityList[index - 2] && activityList[index - 2].subType === 'U'
        && activityList[index - 1] && activityList[index - 1].subType === 'F'
        && activityList[index] && activityList[index].subType === 'I'
        && activityList[index + 1] && activityList[index + 1].subType === 'F'
        && activityList[index + 2] && activityList[index + 2].subType === 'E' ) {
        return false;
    }

    if( activityList[index - 3] && activityList[index - 3].subType === 'U'
        && activityList[index - 2] && activityList[index - 2].subType === 'F'
        && activityList[index - 1] && activityList[index - 1].subType === 'I'
        && activityList[index] && activityList[index].subType === 'F'
        && activityList[index + 1] && activityList[index + 1].subType === 'E' ) {
        return false;
    }

    return activityList[index] && activityList[index].subType === 'E'
           && (!activityList[index + 1] || activityList[index + 1].subType !== 'E');
}

function isStartOfNotesEntry( args ) {
    const {index, activityList} = args;
    return activityList[index] && activityList[index].subType === 'U'
           && activityList[index + 1] && activityList[index + 1].subType === 'A'
           && activityList[index + 2] && activityList[index + 2].subType === 'T'
           && activityList[index + 3] && activityList[index + 3].subType === 'I';
}

function isEndOfNotesEntry( args ) {
    const {index, activityList} = args;

    if( activityList[index - 1] && activityList[index - 1].subType === 'U'
        && activityList[index] && activityList[index].subType === 'A'
        && activityList[index + 1] && activityList[index + 1].subType === 'T'
        && activityList[index + 2] && activityList[index + 2].subType === 'I' ) {
        return false;
    }

    if( activityList[index - 2] && activityList[index - 2].subType === 'U'
        && activityList[index - 1] && activityList[index - 1].subType === 'A'
        && activityList[index] && activityList[index].subType === 'T'
        && activityList[index + 1] && activityList[index + 1].subType === 'I' ) {
        return false;
    }

    return activityList[index] && activityList[index].subType === 'I'
           && (!activityList[index + 1] || activityList[index + 1].subType !== 'I');
}

function createCompleteEntry( args ) {
    const {fragments, newActivity, subType} = args;

    if( !fragments.some( Boolean ) ) {
        return;
    }

    const content = fragments.join( '\n' );

    newActivity.content = `<pre>\n${content}\n</pre>`;
    newActivity.userContent = `<pre>\n${content}\n</pre>`;

    if( subType ) {
        newActivity.subType = subType;
    }

    newActivity._id = new ObjectId();

    /*db.activities.insert( newActivity );*/
    /*printjson( newActivity );*/
    print( '\n' );
    print( subType );
    print( newActivity.content );
    print( '\n' );
}

function cleanContentFragment( content ) {
    return content.replace( /^[A-Z]::(\s)?(\n)?/, '' );
}

print( `Found ${allPatients.count()} patients` );

/* iterate through all new patients */

while( allPatients.hasNext() ) {
    patient = allPatients.next();
    allActivitiesForPatient = db.activities.find( {
        patientId: patient._id.str,
        actType: actTypeToFind
    }, {_id: 0} ).toArray();

    if( !allActivitiesForPatient.length ) {
        continue;
    }

    print( `Found ${allActivitiesForPatient.length} activities for patient ${patient._id.str}` );

    /* loop through activities and build new meddata entry */
    for( [index, activity] of allActivitiesForPatient.entries() ) {

        /* start collecting fragments is subType U is reached */
        if( !isBuildingMeddata && isStartOfMeddataEntry( {index, activityList: allActivitiesForPatient} ) ) {
            isBuildingMeddata = true;
            meddataFragmentsForPatient = [];
            meddata = activity;
        }

        /* collect fragment if in the middle of collecting */
        if( isBuildingMeddata ) {
            meddataFragment = activity.content && activity.content.trim() || '';
            if( meddataFragment ) {
                meddataFragment = cleanContentFragment( meddataFragment );
                meddataFragmentsForPatient.push( meddataFragment );
            }
        }

        /* check end and stop adding in the next loop */
        /* merge fragments and save the activity */
        if( isBuildingMeddata && isEndOfMeddataEntry( {index, activityList: allActivitiesForPatient} ) ) {
            isBuildingMeddata = false;
            createCompleteEntry( {fragments: meddataFragmentsForPatient, newActivity: meddata, subType: 'LUFU'} );
        }

        if( isBuildingMeddata ) {
            /* no need to check for note building if we're building meddata */
            continue;
        }

        /* here we build the notes in the same way */

        /* start collecting fragments is subType U is reached */
        if( !isBuildingNotes && isStartOfNotesEntry( {index, activityList: allActivitiesForPatient} ) ) {
            isBuildingNotes = true;
            notesFragmentsForPatient = [];
            note = activity;
        }

        /* collect fragment if in the middle of collecting */
        if( isBuildingNotes ) {
            noteFragment = activity.content && activity.content.trim() || '';
            if( noteFragment ) {
                noteFragment = cleanContentFragment( noteFragment );
                notesFragmentsForPatient.push( noteFragment );
            }
        }

        /* check end and stop adding in the next loop */
        /* merge fragments and save the activity */
        if( isBuildingNotes && isEndOfNotesEntry( {index, activityList: allActivitiesForPatient} ) ) {
            isBuildingNotes = false;
            createCompleteEntry( {fragments: notesFragmentsForPatient, newActivity: note, subType: 'LNOTIZ'} );
        }
    }
}
