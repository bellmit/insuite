/**
 * User: do
 * Date: 11.09.18  18:19
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/* global db, ObjectId */
/**
 * Copies patient PATIENT_TEMPLATE_ID NUM_PATIENTS times.
 * Includes coping of all casefolders and activties.
 * Useful to create huge amounts of invoice data for testing really fast.
 * Removes old patients before adding new ones.
 */
const PATIENT_TEMPLATE_ID = '5b97863c40e37514ffd1abde';
const NUM_PATIENTS = 10;

const startTime = Date.now();

// Remove previously generated data
print( `Removed ${db.patients.remove( {AUTO_CREATION: 1} ).nRemoved} patients.` );
print( `Removed ${db.casefolders.remove( {AUTO_CREATION: 1} ).nRemoved} casefolders.` );
print( `Removed ${db.activities.remove( {AUTO_CREATION: 1} ).nRemoved} activities.` );

const patient = db.patients.findOne( {_id: ObjectId( PATIENT_TEMPLATE_ID )} );
const cfCount = db.casefolders.count( {patientId: PATIENT_TEMPLATE_ID} );
print( `Coping ${patient.lastname}, ${patient.lastname} with ${cfCount} casefolders ${NUM_PATIENTS} times` );

function getNewName( str, idx ) {
    return str + `_${(idx + 2)}`;
}

let curr;

for( let i = 0; i < NUM_PATIENTS; i++ ) {
    curr = i + 1;
    print( `creating patient ${curr}: ${Math.round( curr / NUM_PATIENTS * 100 ) + '%'}` );

    const newPatientNumber = patient.patientNumber + i;
    const patientUpdate = {
        AUTO_CREATION: 1,
        _id: ObjectId(),
        firstname: getNewName( patient.firstname, i ),
        lastname: getNewName( patient.lastname, i ),
        patientNumber: newPatientNumber,
        patientNo: newPatientNumber
    };
    const newPatient = Object.assign( {}, patient, patientUpdate );
    db.patients.insert( newPatient );
    db.casefolders.find( {patientId: PATIENT_TEMPLATE_ID} ).forEach( cf => {

        const cfUpdate = {
            AUTO_CREATION: 1,
            _id: ObjectId(),
            patientId: newPatient._id.str
        };

        db.casefolders.insert( Object.assign( {}, cf, cfUpdate ) );

        db.activities.find( {caseFolderId: cf._id.str} ).forEach( act => {
            const actUpdate = {
                AUTO_CREATION: 1,
                _id: ObjectId(),
                patientId: newPatient._id.str,
                caseFolderId: cfUpdate._id.str,
                patientLastName: newPatient.lastname,
                patientFirstName: newPatient.firstname
            };
            db.activities.insert( Object.assign( {}, act, actUpdate ) );
        } );

    } );
}
print( '' );
print( `created ${db.patients.count( {AUTO_CREATION: 1} )} patients` );
print( `created ${db.casefolders.count( {AUTO_CREATION: 1} )} casefolders` );
print( `created ${db.activities.count( {AUTO_CREATION: 1} )} activities` );
const endTime = Date.now();
const diff = endTime - startTime;
print( `in ${diff}ms` );