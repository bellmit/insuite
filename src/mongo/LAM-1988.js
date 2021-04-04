/**
 * User: maximilian.kramp
 * Date: 2/4/21  3:37 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

db = db.getSiblingDB( '0' );

var isStrictModeActive = db.settings.count( {noCrossLocationAccess: true, noCrossLocationPatientAccess: true} );
var systemName = db.practices.find( {}, {_id: 0, coname: 1} ).toArray();
if( systemName && Array.isArray( systemName ) && systemName.length ) {
    systemName = systemName[0];
}

if( isStrictModeActive ) {
    var patientData = db.patients.aggregate( [
        {
            $facet: {
                numberOfPatients: [
                    {
                        $count: 'numberOfPatients'
                    }
                ],
                numberOfPatientsWithConfirmedViewFromOtherLocations: [
                    {
                        $match: {
                            confirmedViewFromOtherLocations: true
                        }
                    },
                    {
                        $count: 'numberOfPatientsWithConfirmedViewFromOtherLocations'
                    }
                ]
            }
        },
        {
            $project: {
                numberOfPatients: {
                    $arrayElemAt: ["$numberOfPatients.numberOfPatients", 0]
                },
                numberOfPatientsWithConfirmedViewFromOtherLocations: {
                    $arrayElemAt: ["$numberOfPatientsWithConfirmedViewFromOtherLocations.numberOfPatientsWithConfirmedViewFromOtherLocations", 0]
                }
            }
        }
    ] ).toArray();
    if( patientData && Array.isArray( patientData ) && patientData.length ) {
        patientData = patientData[0];
    }
    var activeEmployees = db.employees.count( {status: 'ACTIVE'} );

    print( `<DC_SYSTEM_ID>,"${systemName && systemName.coname}",${(patientData && patientData.numberOfPatientsWithConfirmedViewFromOtherLocations) || 0},${activeEmployees || 0},${(patientData && patientData.numberOfPatients) || 0}` );
} else {
    print( `<DC_SYSTEM_ID>,"${systemName && systemName.coname}",0,0,0` );
}