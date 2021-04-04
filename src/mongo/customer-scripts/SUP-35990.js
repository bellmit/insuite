/**
 * User: do
 * Date: 25.11.20  15:41
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global db print printjson ObjectId ISODate */

/**
 * Fix missing casefolders by iterating all patients and check which caseFolderIds are assigned to its activities.
 * Now all existing casefolders are removed from the list and the none existing casefolders are recreated are recreated.
 * Note: At least one schein must exist. For prviat scheins we can not find the target caseFolderType if patient has
 * SZ and PRIVATE insurance.
 */
db.patients.find( {_id: {$ne: null}}, {_id: 1, patientNo: 1, insuranceStatus: 1} ).forEach( function( patient ) {
    const pId = patient._id.str;
    const caseFolderIdsOfAllActivities = db.activities.distinct( 'caseFolderId', {patientId: pId} );
    const existingCaseFolderId = db.casefolders.find( {patientId: pId}, {_id: 1} ).toArray().map( c => c._id.str );
    const notExisting = caseFolderIdsOfAllActivities.filter( id => !existingCaseFolderId.includes( id ) );
    const patientHasSZ = patient.insuranceStatus.some( i => i.type === 'SELFPAYER' );
    const patientHasPrivat = patient.insuranceStatus.some( i => i.type === 'PRIVATE' );
    if( notExisting.length ) {
        print( `${pId}, ${patient.patientNo}, ${notExisting.join( ';' )}` );
        notExisting.forEach( ( neId, idx ) => {
            const nameNumberPostFix = idx > 0 ? ` ${idx + 1}` : '';
            const firstSchein = db.activities.findOne( {
                caseFolderId: neId,
                actType: {$in: ['SCHEIN', 'PKVSCHEIN', 'BGSCHEIN', 'AMTSSCHEIN']}
            } );
            if( !firstSchein ) {
                print( `ERR: could not find schein for ${neId}` );
                return;
            }
            let type, name;
            switch( firstSchein.actType ) {
                case 'SCHEIN':
                case 'AMTSSCHEIN':
                    type = 'PUBLIC';
                    name = 'GKV';
                    break;
                case 'PKVSCHEIN':
                    if( patientHasSZ && patientHasPrivat ) {
                        print( `CF: ${neId} patient has SZ and PKV. can not decide!` );
                        return;
                    }
                    type = patientHasPrivat ? 'PRIVATE' : 'SELFPAYER';
                    name = patientHasPrivat ? 'PKV' : 'SZ';
                    break;
                case 'BGSCHEIN':
                    type = 'BG';
                    name = 'BG';
                    break;
            }
            const result = db.casefolders.insertOne( {
                "_id": ObjectId( neId ),
                "ruleErrors": 0,
                "ruleWarnings": 0,
                "ruleActivities": 0,
                "disabled": false,
                "merged": false,
                "type": type,
                "patientId": pId,
                "title": `${name} (wiederhergestellt${nameNumberPostFix})`,
                "lastChanged": ISODate( "2020-10-16T08:37:21.564Z" )
            } );
            printjson( result );
        } );
    }
} );

