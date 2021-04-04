/* script to check that treeatments belong to a schein in their quarter */
/* global db, ObjectId */
function checkAllPatients() {
    /* */
    let
        totalTreatments = 0,
        totalAnyMismatch = 0,
        totalLocationMismatch = 0,
        totalPriceAnyMismatch = 0,
        totalPriceLocationMismatch = 0;
    /* */
    db.patients.find({}).forEach( checkPatient );
    /* */
    print( `[_] total treatments ${totalTreatments}` );
    print( `[_] total treatments with mismatching schein (any): ${totalAnyMismatch} (EUR: ${totalPriceAnyMismatch})` );
    print( `[_] total treatments with mismatching schein (location): ${totalLocationMismatch} (EUR: ${totalPriceLocationMismatch})` );
    /* */
    function checkPatient( patient ) {
        /* */
        const
            caseFolderQuery = {
                patientId: patient._id.valueOf(),
                type: { $in: [ 'PUBLIC', 'PRIVATE' ] }
            },
            caseFolders = db.casefolders.find( caseFolderQuery );
        /* */
        caseFolders.forEach( checkCaseFolder );
        print( `[i] Patient ${patient._id.valueOf()} ${patient.patientNo} has ${caseFolders.length()} casefolders` );
    }
    /* */
    function checkCaseFolder( cf ) {
        const
            patient = db.patients.findOne( { _id: ObjectId( cf.patientId ) } ),
            quarters = {};
        /* */
        print( `[.] Checking casefolder ${cf._id.valueOf()} for patient ${cf.patientId} ${patient.patientNo}` );
        /* */
        /* get all treatments and scheine in this casefolder, and break them up by quarter */
        /* */
        let
            actQuery = {
                caseFolderId: cf._id.valueOf(),
                actType: { $in: [ 'TREATMENT', 'SCHEIN', 'PKVSCHEIN', 'BGSCHEIN', 'AMTSSCHEIN' ] },
                status: { $nin: ['CANCELLED', 'DELETED'] },
                importId: { $exists: false }
            },
            selectFields = { _id: 1, code: 1, employeeId: 1, locationId: 1, timestamp: 1, actType: 1, status: 1, price: 1, invoiceId: 1, invoiceLogId: 1 },
            allActivities = db.activities.find( actQuery, selectFields ).sort({ timestamp: -1 });
        /* */
        allActivities.forEach( function( act ) {
            if ( !act.timestamp || !act.timestamp.getYear ) {
                print( `[!] invalid activity, bad timestamp: ${JSON.stringify(act)}` );
                return;
            }
            const
                year = act.timestamp.getFullYear().toString(),
                quarter = Math.floor( act.timestamp.getMonth() / 3 ),
                byQuarter = `${year}Q${quarter}`;
            /* */
            if ( byQuarter !== '2020Q0' && byQuarter !== '2019Q3' ) { return; }
            if ( !quarters.hasOwnProperty(byQuarter) ) {
                quarters[ byQuarter ] = [];
                print( `[i] patient ${patient.patientNo} has entries in querter: `, byQuarter );
            }
            quarters[ byQuarter ].push( act );
        } );
        /* */
        /* for each quarter */
        /* */
        let q;
        for ( q in quarters ) {
            if ( quarters.hasOwnProperty( q ) ) {
                print( `[i] patient ${patient._id.valueOf()} ${patient.patientNo} has entries in querter ${q}: (${quarters[q].length})` );
                checkQuarter( quarters[ q ], q );
            }
        }
        /* activities should be in date order, newest first */
        function checkQuarter( activities, key ) {
            let i, j, act, check;
            for ( i = 0; i < activities.length; i++ ) {
                act = activities[i];
                print( `${act.actType} ${act.status} ${act.locationId.valueOf()} ${act.timestamp}` );
            }
            //  for each treatment, check if there is a matching schein in the current quarter, created before it was
            for ( i = 0; i < activities.length; i++ ) {
                act = activities[i];
                if ( 'TREATMENT' === act.actType ) {
                    /* */
                    totalTreatments = totalTreatments + 1;
                    /* */
                    act.hasMatchingSchein = false;
                    act.hasLocationSchein = false;
                    for ( j = i; j < activities.length; j++ ) {
                        check = activities[j];
                        if ( 'TREATMENT' !== check.actType ) {
                            //  if not a treatment is must be a schein act type
                            if ( act.locationId.valueOf() === check.locationId.valueOf() && act.status === check.status ) {
                                act.hasMatchingSchein = true;
                            }
                            if ( act.locationId.valueOf() === check.locationId.valueOf() && act.status === 'VALID' && check.status === 'APPROVED' ) {
                                act.hasMatchingSchein = true;
                            }
                            if ( act.locationId.valueOf() === check.locationId.valueOf() && act.status === 'APPROVED' && check.status === 'VALID' ) {
                                act.hasMatchingSchein = true;
                            }
                            if ( act.locationId.valueOf() === check.locationId.valueOf() ) {
                                act.hasLocationSchein = true;
                            }
                        }
                    }
                    /* */
                    if ( !act.hasMatchingSchein ) {
                        print( `[!] ${key} ${act.status} treatment ${act._id.valueOf()} ${act.code} EUR ${act.price} has no matching schein. Patient ${patient._id.valueOf()} ${patient.patientNo} Casefolder: ${cf._id.valueOf()} ${cf.type}` );
                        totalAnyMismatch = totalAnyMismatch + 1;
                        totalPriceAnyMismatch = totalPriceAnyMismatch + ( act.price || 0 );
                        print( '[i] match: xxxxxx.hub.doc-cirrus.com/incase#/activity/' + act._id.valueOf() );
                        print( `[i] match invoiceId: ${act.invoiceId} invoiceLogId: ${act.invoiceLogId}` );
                    }
                    if ( !act.hasLocationSchein ) {
                        print( `[L] ${key} ${act.status} treatment ${act._id.valueOf()} ${act.code} EUR ${act.price} schein in location in different state. Patient ${patient._id.valueOf()} ${patient.patientNo} Casefolder: ${cf._id.valueOf()} ${cf.type}` );
                        totalLocationMismatch = totalLocationMismatch + 1;
                        totalPriceLocationMismatch = totalPriceLocationMismatch + ( act.price || 0 );
                    }
                }
            }
        }
    }
}

checkAllPatients();

