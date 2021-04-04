/* check for non-unique patient numbers, CCDEV-12, SUP-40032 */
function checkPatientUnique( pat ) {
    if ( !pat.patientNo ) {
        print(`[!] missing patientNo: ${pat._id.valueOf()}`);
        return;
    }
    print(`[i] checking patient ${pat.patientNo}`);
    let count = db.patients.count({'patientNo': pat.patientNo});
    if ( 1 !== count ) {
        print(`[!] patient number is not unique: ${count} ${pat.patientNo}`);
    }
}

db.patients.find({}).forEach( checkPatientUnique );
