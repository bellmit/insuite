/**
 * Identify and correct broken chains of discontinued continuous diagnoses
 */
/*global db */
function checkContinuousDiagnose( patient ) {
    const dryRun = true;

    let diagnose = db.activities.find({
        patientId: patient._id.valueOf(),
        actType: 'DIAGNOSIS',
        diagnosisType: 'CONTINUOUS'
    }).sort( { timestamp: -1 } );

    if ( diagnose.length() === 0 ) {
        return;
    }

    print( `[i] patient ${patient.patientNo} has ${diagnose.length()} continuous diagnoses` );

    for ( let i = 0; i < diagnose.length(); i++ ) {
        if ( diagnose[i].diagnosisTreatmentRelevance !== 'INVALIDATING' ) {
            continue;
        }

        for ( let j = i + 1; j < diagnose.length(); j++ ) {
            if ( diagnose[i].code !== diagnose[j].code ) {
                continue;
            }
            if ( diagnose[j].diagnosisTreatmentRelevance === 'INVALIDATING' ) {
                break;
            }
            if ( diagnose[j].diagnosisInvalidationDate !== diagnose[i].timestamp ) {
                print( `[!] patient ${patient.patientNo} has defect continuous diagnose ${diagnose[i].code} as of ${diagnose[i].timestamp}` );

                if ( dryRun ) {
                    break;
                }

                db.activities.update( { _id: diagnose[j]._id }, { $set: { diagnosisInvalidationDate: diagnose[i].timestamp } } );

                print( `[i] fixed patient ${patient.patientNo} continuous diagnose ${diagnose[i].code} as of ${diagnose[i].timestamp}` );
            }
        }
    }
}
db.patients.find({}).forEach( checkContinuousDiagnose );