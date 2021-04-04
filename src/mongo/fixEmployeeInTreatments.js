/* global db, ISODate, ObjectId, print, printjson */

db = db.getSiblingDB( '0' );

var
    debug = false,
    doRealUpdate = false,
    employeeImportedString = / \(importiert\)/,
    activityPipeline = [
        {
            $match: {
                status: 'VALID',
                actType: 'TREATMENT'
            }
        },
        {
            $sort: {
                timestamp: -1
            }
        },
        {
            $group: {
                _id: {
                    patientId: '$patientId', caseFolderId: '$caseFolderId'
                },
                activityId: {$addToSet: '$_id'},
                caseFolderId: {$addToSet: '$caseFolderId'},
                patientId: {$addToSet: '$patientId'},
                employeeId: {$addToSet: '$employeeId'},
                locationId: {$addToSet: '$locationId'},
                timestamp: {$addToSet: '$timestamp'}
            }
        }
    ],
    activitiesToUpdate = 0,
    scheineToCreate = 0,
    activitiesUpdated = 0,
    scheineCreated = 0;

var activityCursor = db.activities.aggregate( activityPipeline );

while( activityCursor.hasNext() ) {
    var
        actType,
        createNewValidSchein = false,
        createNewValidScheinData = {},
        currentActivity = activityCursor.next(),
        employeeQuery = {
            _id: {
                $in: currentActivity.employeeId.map( elem => ObjectId( elem ) )
            },
            status: {
                $nin: ['ACTIVE']
            }
        },
        caseFolderQuery = {
            _id: {
                $in: currentActivity.caseFolderId.map( elem => ObjectId( elem ) )
            }
        };

    var employee = db.employees.find( employeeQuery ).toArray();

    if( !(employee && Array.isArray( employee ) && employee.length) ) {
        if( debug ) {
            print( `[i] employee:${currentActivity.employeeId} is active!` );
        }
        continue;
    } else {
        print( `[i] employee:${currentActivity.employeeId} is not active!` );
    }
    employee = employee[0];

    var caseFolder = db.casefolders.find( caseFolderQuery ).toArray();

    if( !(caseFolder && Array.isArray( caseFolder ) && caseFolder.length) ) {
        print( '[!] casefolder does not exist!' );
        if( debug ) {
            print( `\t id: ${ObjectId( currentActivity.caseFolderId )}` );
        }
        continue;
    }
    caseFolder = caseFolder[0];

    switch( caseFolder.type ) {
        case 'PUBLIC':
            actType = 'SCHEIN';
            break;
        case 'PRIVATE':
        case 'SELFPAYER':
            actType = 'PKVSCHEIN';
            break;
        case 'BG':
            actType = 'BGSCHEIN';
            break;
        default:
            continue;
    }
    var
        sortedDates = oldestDate = currentActivity.timestamp.sort( function( a, b ) {
            return Date.parse( a ) > Date.parse( b );
        } ),
        oldestDate = sortedDates[0],
        newestDate = sortedDates[sortedDates.length - 1],
        lastScheinQuery = {
            patientId: {
                $in: currentActivity.patientId
            },
            caseFolderId: {
                $in: currentActivity.caseFolderId
            },
            locationId: {
                $in: currentActivity.locationId
            },
            timestamp: {
                $lte: oldestDate
            },
            status: {$nin: ['CANCELLED', 'IMPORTED']},
            actType: actType
        };

    var lastSchein = db.activities.find( lastScheinQuery ).limit( 1 ).toArray();

    if( !(lastSchein && Array.isArray( lastSchein ) && lastSchein.length) ) {
        print( '[!] VALID schein does not exist!' );
        activitiesToUpdate += currentActivity.activityId.length;
        if( debug ) {
            print( `\tid: ${currentActivity.activityId}` );
            printjson( lastScheinQuery );
        }
        createNewValidSchein = true;
        scheineToCreate++;

        employeeQuery = {
            firstname: employee.firstname,
            lastname: employee.lastname.replace( employeeImportedString, '' )
        };
        employee = db.employees.find( employeeQuery ).toArray();
        if( employee && Array.isArray( employee ) && employee.length ) {
            print( '\t[+] Found non imported employee!' );
            employee = employee[0];
        } else {
            print( '\t[-] Did not find non imported employee!' );
            if( debug ) {
                printjson( employeeQuery );
            }
        }
        Object.assign( lastScheinQuery, {
            status: 'VALID',
            timestamp: {
                $gte: oldestDate
            }
        } );
        lastSchein = db.activities.find( lastScheinQuery ).sort( {timestamp: -1} ).limit( 1 ).toArray();
        // lastSchein = db.activities.find( lastScheinQuery ).toArray();
        if( lastSchein && Array.isArray( lastSchein ) && lastSchein.length ) {
            //found lastSchein
            print( '\t\t[+] Found newer schein!' );
            Object.assign( createNewValidScheinData, lastSchein[0], {
                timestamp: new Date( oldestDate ).setUTCHours( 2, 0, 0, 0 )
            } );
            print( '\t\t[.] Getting employee from that schein!' );
            employee = db.employees.find( {
                _id: ObjectId( lastSchein[0].employeeId )
            } ).toArray();
            if( employee && Array.isArray( employee ) && employee.length ) {
                employee = employee[0];
            } else {
                print( '\t[!] FATAL ERROR!' );
                continue;
            }
        } else {
            print( '\t\t[-] Found NO newer valid schein!' );
            print( '\t\t[-] Please create a schein for this patient:' );
            print( `\t\t\tpatientId:${currentActivity.patientId}` );
            print( `\t\t\tcaseFolderId:${currentActivity.caseFolderId}` );
            if( debug ) {
                printjson( lastScheinQuery );
            }
            continue;
        }
    } else {
        if( debug ) {
            print( '[+] VALID schein does exist!' );
        }
        employee = db.employees.find( {
            _id: ObjectId( lastSchein[0].employeeId )
        } ).toArray();
        if( employee && Array.isArray( employee ) && employee.length ) {
            employee = employee[0];
        } else {
            print( '\t[!] FATAL ERROR!' );
        }
    }

    var employeeName = '';
    if( employee.title ) {
        employeeName += `${employee.title} `;
    }
    if( employee.lastname ) {
        employeeName += `${employee.lastname}, `;
    }
    if( employee.firstname ) {
        employeeName += employee.firstname;
    }
    if( doRealUpdate ) {
        print( `setting employee:${employee._id} - ${employeeName}` );
        db.activities.update( {
            _id: {
                $in: currentActivity.activityId
            }
        }, {
            $set: {
                employeeId: employee._id.valueOf(),
                employeeName: employeeName
            }
        }, {multi: true} );
        activitiesUpdated += currentActivity.activityId.length;
    }
}
print( `[.] activities to update: ${activitiesToUpdate}` );
print( `[.] scheine to create: ${scheineToCreate}` );
print( `------------------------------------` );
print( `[.] activities updated: ${activitiesUpdated}` );
print( `[.] scheine created: ${scheineCreated}` );