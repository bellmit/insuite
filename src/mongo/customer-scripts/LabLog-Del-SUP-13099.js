/**
 *  Script to delete a set of duplicate lablogs along with treatments and labdata activities
 *
 * User: strix
 * Date: 18/01/2019  14:40
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/* global db, ObjectId */

function cleanLabLog( llObj ) {
    const
        DO_REAL_DELETE = true,
        IGNORE_FLAGS = [ 'NOMATCH', 'META', 'DUPLICATE' ];

    print( '' );
    print( `[i] Checking lablog: ${llObj._id.valueOf()} hash: ${llObj.fileHash} timestamp: ${llObj.timestamp}` );
    llObj.flags.forEach( checkActivity );

    if ( DO_REAL_DELETE ) {
        print( `[>] Deleting lablog: ${llObj._id.valueOf()} hash: ${llObj.fileHash} timestamp: ${llObj.timestamp}` );
        db.lablogs.deleteOne( { _id: llObj._id } );
    } else {
        print( `[>] Will delete lablog: ${llObj._id.valueOf()} hash: ${llObj.fileHash} timestamp: ${llObj.timestamp}` );
    }

    /* check if a LABDATA activity exists as listed in a lablog, delete it and any treatments created from it */
    function checkActivity( labdataId ) {
        if ( -1 !== IGNORE_FLAGS.indexOf( labdataId ) ) { return false; }
        /* */
        print( `[i] Checking LABDATA activity: ${labdataId}` );
        /* */
        let labdataObj = db.activities.findOne( { _id: ObjectId( labdataId ) } );
        /* */
        if ( !labdataObj ) {
            print( `[x] Activity not found: ${labdataId}` );
            return;
        }
        /* */
        print( `[i] Activity exists ${labdataId} ${labdataObj.actType} ${labdataObj.status} ${labdataObj.labRequestId} ${labdataObj.timestamp}` );
        /* */
        if ( labdataObj.labRequestId && 'LABDATA' === labdataObj.actType ) {
            findRelatedTreatments( labdataObj );
        }

        if ( DO_REAL_DELETE ) {
            print( `[>] Deleting LABDATA: ${labdataObj._id.valueOf()} ${labdataObj.status} ref: ${labdataObj.labRequestId} ${labdataObj.timestamp}` );
            db.activities.deleteOne( { _id: labdataObj._id } );
        } else {
            print( `[>] Will delete LABDATA: ${labdataObj._id.valueOf()} ${labdataObj.status} ref: ${labdataObj.labRequestId} ${labdataObj.timestamp}` );
        }
        cleanupReporting( labdataObj._id.valueOf() );
    }

    /* find treatments created out of LDT and related to the given LABDATA activity */
    function findRelatedTreatments( actObj ) {
        print( `[i] Checking for treatments related to LABDATA activity, casefolder: ${actObj.caseFolderId} ` );

        let
            treatmentsQuery = {
                'actType': 'TREATMENT',
                'patientId': actObj.patientId,
                'caseFolderId': actObj.caseFolderId,
                'labRequestRef': actObj.labRequestId
            };

        db.activities.find( treatmentsQuery ).forEach( removeRelatedTreatment );
    }

    /* delete a treatment referring to a lablog which is also to be deleted */
    function removeRelatedTreatment( treatmentObj ) {
        let treatmentId = treatmentObj._id.valueOf();
        if ( DO_REAL_DELETE ) {
            print( `[>] Deleting TREATMENT: ${treatmentObj._id.valueOf()} ${treatmentObj.status} ${treatmentObj.code} ${treatmentObj.timestamp}` );
            db.activities.deleteOne( { _id: treatmentObj._id } );
        } else {
            print( `[>] Will delete TREATMENT: ${treatmentObj._id.valueOf()} ${treatmentObj.status} ${treatmentObj.code} ${treatmentObj.timestamp}` );
        }
        cleanupReporting( treatmentId );
    }

    /* delete reporting entries related to an activity */
    function cleanupReporting( actId ) {
        print( `[i] Checking for reportings related to activity: ${actId}` );
        db.reportings.find( { 'activityId': actId } ).forEach( deleteSingleReporting );
    }
    function deleteSingleReporting( reportingObj ) {
        if ( DO_REAL_DELETE ) {
            print( `[>] Deleting reporting: ${reportingObj._id.valueOf()} activity: ${reportingObj.activityId}` );
            db.reportings.deleteOne( { _id: reportingObj._id } );
        } else {
            print( `[>] Will delete reporting: ${reportingObj._id.valueOf()} activity: ${reportingObj.activityId}` );
        }
    }
}



db.lablogs.find( { _id: ObjectId( "5c92362fb75bff58bad92d3f" ) } ).forEach( cleanLabLog );
db.lablogs.find( { _id: ObjectId( "5c93bfb5b75bff58bad9e3de" ) } ).forEach( cleanLabLog );
db.lablogs.find( { _id: ObjectId( "5c91d802b75bff58bad86f1d" ) } ).forEach( cleanLabLog );
db.lablogs.find( { _id: ObjectId( "5c98dc8485a8613aaea7c019" ) } ).forEach( cleanLabLog );
db.lablogs.find( { _id: ObjectId( "5c9a12f085a8613aaea8705b" ) } ).forEach( cleanLabLog );
db.lablogs.find( { _id: ObjectId( "5c9a0a5e85a8613aaea86b5f" ) } ).forEach( cleanLabLog );
db.lablogs.find( { _id: ObjectId( "5c9b1567e6d9273a763890de" ) } ).forEach( cleanLabLog );
db.lablogs.find( { _id: ObjectId( "5c9cb714e6d9273a76396bfb" ) } ).forEach( cleanLabLog );
db.lablogs.find( { _id: ObjectId( "5c9cc82fe6d9273a763972d3" ) } ).forEach( cleanLabLog );
db.lablogs.find( { _id: ObjectId( "5ca1ed4f59e9fb4f8a731f8f" ) } ).forEach( cleanLabLog );





db.lablogs.find( { fileHash: "-1d87d4d9" } ).forEach( cleanLabLog );
























function findBadRequestId( llObj ) {
    const BAD_IDENTS = [ '9999999999P', '9999999999', '9999999999K' ];
    /* */
    let
        day = llObj.timestamp.getDate(),
        month = llObj.timestamp.getMonth() + 1,
        year = llObj.timestamp.getFullYear(),
        hasBad = false;
    /* */
    print( `[i] Checking lablog: ${llObj._id.valueOf()} hash: ${llObj.fileHash} timestamp: ${llObj.timestamp}` );
    /* */
    llObj.l_data.records.forEach( checkLRecord );
    /* */
    if ( hasBad ) {
        print( `[i] Bad entries exist in lablog ${llObj._id.valueOf()} hash: ${llObj.fileHash} date: ${year}-${month}-${day} ` );
        print( `[>] download: 7ce817p2uy.hub.doc-cirrus.com/download/${llObj.fileDatabaseId}` );
        print( `[>] delquery: db.lablogs.find( { _id: ObjectId( "${llObj._id.valueOf()}" ) } ).forEach( cleanLabLog );` );
    }
    /* */
    function checkLRecord( rec ) {
        if ( rec.recordRequestId ) {
            print( `[i] Have record ${rec.patientForename} ${rec.patientName} DOB ${rec.patientDob}: ${rec.recordRequestId} / ${rec.labReqNo}` );
            /* */
            if ( -1 !== BAD_IDENTS.indexOf( rec.recordRequestId ) ) {
                print( `[!] Bad entry on lablog ${llObj._id.valueOf()} patient ${rec.patientForename} ${rec.patientName} from LL on ${llObj.timestamp}` );
                hasBad = true;
            }
        }
    }
}


db.lablogs.find().forEach( findBadRequestId );












/* list lablog -> activity references from the meta field */

function listLablogAssignments( llObj ) {
    const
        BAD_REQUEST_IDS = [ '9999999999', '9999999999P', '999999999K' ],
        IGNORE_FLAGS = [ 'META', 'DUPLICATE' ],
        DO_REAL_UPDATE = false;
    /* */
    let
        countNoMatch = 0,
        llChanged = false,
        i;
    /* */
    print( '' );
    print( `[i] Checking lablog: ${llObj._id.valueOf()} hash: ${llObj.fileHash} timestamp: ${llObj.timestamp}` );
    /* */
    for ( i = 0; i < llObj.flags.length; i++ ) {
        checkActivity( llObj.flags[i], llObj.l_data.records[i], i );
    }
    /* */
    /* count NOMATCH may have changed */
    for ( i = 0; i < llObj.flags.length; i++ ) {
        if ( 'NOMATCH' === llObj.flags[i] ) { countNoMatch++; }
    }
    if ( countNoMatch !== llObj.patientEntriesNoMatch ) {
        print( `[>] NOMATCH count has changed from ${llObj.patientEntriesNoMatch} to ${countNoMatch}, will update lablog.` );
    }
    /* */
    if ( llChanged && DO_REAL_UPDATE ) {
        print( `[>] saving updated lablog: ${llObj._id.valueOf()}` );
        db.lablogs.update( { _id: llObj._id }, { $set: { flags: llObj.flags, l_data: llObj.l_data, patientEntriesNoMatch: countNoMatch } } );
    }

    /* check if a LABDATA activity exists, list patient name */
    function checkActivity( labdataId, record, idx ) {
        if ( -1 !== IGNORE_FLAGS.indexOf( labdataId ) ) {
            print( `[${idx}] [i] ${labdataId} record` );
            return false;
        }
        /* */
        /* print( `[${idx}] [i] Checking LABDATA activity: ${labdataId}` ); */
        /* */
        let
            labdataObj = null,
            recordIds = `(${record.recordRequestId} / ${record.labReqNo})`,
            recordName = record.patientName + ' ' + record.patientForename,
            recordDob = dateToStr( record.patientDob ),
            toPatient,
            patientName = '',
            patientDob = '',
            newReqId;
        /* */

        if ( 'NOMATCH' !== labdataId ) {
            labdataObj = db.activities.findOne( { _id: ObjectId( labdataId ) } );
            patientName = 'NOMATCH';
        }

        if ( !labdataObj ) {
            print( `[${idx}] ${recordIds} ${recordName} ${recordDob} ==> Activity not found: ${labdataId}` );
            //return;
        } else {
            /* */

            labdataId = labdataObj._id.valueOf();

            toPatient = db.patients.findOne( { _id: ObjectId( labdataObj.patientId ) } );
            if ( toPatient ) {
                patientName = toPatient.lastname + ' ' + toPatient.firstname;
                patientDob = dateToStr( toPatient.dob );
            } else {
                patientName = 'NOT FOUND ' + labdataObj.patientId + ' ' + ( typeof labdataObj.patientId );
            }
        }

        /* */
        print( `[${idx}] ${recordIds} ${recordName} ${recordDob} ==> ${patientName} ${patientDob} ${labdataId}` );
        /* */
        if ( -1 !== BAD_REQUEST_IDS.indexOf( record.recordRequestId ) ) {
            /*  bad request _id, will need to correct */
            newReqId = record.recordRequestId + '__' + record.labReqNo;
            /* */
            if ( DO_REAL_UPDATE ) {
                print( `[${idx}] [>] setting recordRequestId ${record.recordRequestId} ==> ${newReqId}` );
                llObj.l_data.records[idx].recordRequestId = newReqId;
                print( `[${idx}] [>] will set record flag to NOMATCH` );
                llObj.flags[idx] = 'NOMATCH';
                llChanged = true;
            } else {
                print( `[${idx}] [>] will set recordRequestId ${record.recordRequestId} ==> ${newReqId}` );
                print( `[${idx}] [>] will set record flag to NOMATCH` );
                llChanged = true;
            }
            /* */
        }
    }
    /* */
    function dateToStr( dbtime ) {
        if ( !dbtime ) { return 'UNDEF'; }
        let
            day = dbtime.getDate(),
            month = dbtime.getMonth() + 1,
            year = dbtime.getFullYear();
        /* */
        return `${year}-${month}-${day}`;
    }
    /* */
}

db.lablogs.find().forEach( listLablogAssignments );









function statchBackLablog( llObj ) {
    const DO_REAL_UPDATE = false;
    let
        i, rec,
        labdataCount, labdataQuery, labdataObj,
        countNoMatch = 0,
        isDirty = false;
    /* */
    print( `[i] Stiching new backlinks for lablog ${llObj._id.valueOf()}` );
    /* */
    for ( i = 0; i < llObj.flags.length; i++ ) {
        if ( 'NOMATCH' === llObj.flags[i] && llObj.l_data && llObj.l_data.records[i] ) {
            rec = llObj.l_data.records[i];
            /* */
            print( `[i] Checking NOMATCH for ${rec.recordRequestId}` );
            /* */
            labdataObj = null;
            labdataQuery = { 'actType': 'LABDATA', 'labRequestId': rec.recordRequestId };
            labdataCount = db.activities.count( labdataQuery );
            /* */
            print( `[*] Count of LABDATA matching this request id: ${labdataCount}` );
            /* */
            if ( 0 === labdataCount ) {
                print( `[i] no labdata found, flag remains NOMATCH` );

            }
            /* */
            if ( 1 === labdataCount ) {
                labdataObj = db.activities.findOne( labdataQuery );
                /* */
                if ( labdataObj ) {
                    print( `[>] Single match found, associating record ${llObj._id.valueOf()} flag ${i} with ${labdataObj._id.valueOf()}` );
                    /* */
                    llObj.flags[i] = labdataObj._id.valueOf();
                    isDirty = true;
                }
                /* */
            }
            /* */
            if ( labdataCount > 1 ) {
                print( `[*] WARN: labdata count is ${labdataCount} for ${rec.recordRequestId }` );
            }
            /* */
        }
    }
    /* count NOMATCH may have changed */
    for ( i = 0; i < llObj.flags.length; i++ ) {
        if ( 'NOMATCH' === llObj.flags[i] ) { countNoMatch++; }
    }
    if ( countNoMatch !== llObj.patientEntriesNoMatch ) {
        if ( DO_REAL_UPDATE ) {
            print(`[>] NOMATCH count has changed from ${llObj.patientEntriesNoMatch} to ${countNoMatch}, will update lablog.`);
            db.lablogs.update({_id: llObj._id}, {$set: {flags: llObj.flags, patientEntriesNoMatch: countNoMatch}});
        } else {
            print(`[>] NOMATCH count has changed from ${llObj.patientEntriesNoMatch} to ${countNoMatch}, will update lablog.`);
        }
    }
    /* */
    if ( isDirty ) {
        if ( DO_REAL_UPDATE ) {
            print( `[>] Updating flags on lablog ${llObj._id.valueOf()}: ${JSON.stringify( llObj.flags ) }` );
            db.lablogs.update( { _id: llObj._id }, { $set: { flags: llObj.flags } } );

        } else {
            print( `[>] Will update flags on lablog ${llObj._id.valueOf()}: ${JSON.stringify( llObj.flags ) }` );
        }
    }
}


db.lablogs.find().forEach( statchBackLablog );








function stitchPatientIds( llObj ) {
    const DO_REAL_UPDATE = false;
    const SKIP_IDS = [ 'NOMATCH', 'META', 'DUPLICATE' ];
    let
        i,
        labdataObj,
        isDirty = false;
    /* */
    print( `[i] Stitching new patientIds for lablog ${llObj._id.valueOf()}` );
    /* */
    for ( i = 0; i < llObj.flags.length; i++ ) {
        if ( -1 === SKIP_IDS.indexOf( llObj.flags[i] ) ) {

            print( `[i] Checking patientId ${i} corresponding to labdata: ${llObj.flags[i]}` );

            labdataObj = db.activities.findOne( { _id: ObjectId( llObj.flags[i] ) } );
            print( '[x] after lookup' );
            if ( labdataObj ) {
                if ( llObj.associatedPatients[i] === labdataObj.patientId ) {
                    print( `[i] PatientId ${i} in lablog matches labdata ${labdataObj.patientId}` );
                } else {
                    print( `[i] PatientId ${i} in lablog is different from LABADATA, replacing ${llObj.associatedPatients[i]} with ${labdataObj.patientId}` );
                    llObj.associatedPatients[i] = labdataObj.patientId;
                    isDirty = true;
                }
            } else {
                print( `[!] WARN: missing labdata object: ${llObj.flags[i]}` );
            }

            /* */
        }
        if ( 'NOMATCH' === llObj.flags[i] && llObj.associatedPatients[i] ) {
            print( `[i] PatientId ${i} in lablog references unassigned record, replace ${llObj.associatedPatients[i]} with NULL` );
            llObj.associatedPatients[i] = null;
            isDirty = true;
        }
    }
    /* count NOMATCH may have changed */

    /* */
    if ( isDirty ) {
        if ( DO_REAL_UPDATE ) {
            print( `[>] Updating associatedPatients on lablog ${llObj._id.valueOf()}: ${JSON.stringify( llObj.associatedPatients ) }` );
            db.lablogs.update( { _id: llObj._id }, { $set: { associatedPatients: llObj.associatedPatients } } );

        } else {
            print( `[>] Will update associatedPatients on lablog ${llObj._id.valueOf()}: ${JSON.stringify( llObj.associatedPatients ) }` );
        }
    }
}


db.lablogs.find().forEach( stitchPatientIds );