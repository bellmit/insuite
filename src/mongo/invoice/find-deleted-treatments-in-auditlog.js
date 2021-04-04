/**
 * User: do
 * Date: 18.12.20  09:22
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

function reconstructFromAuditLog( objId ) {
    if( !objId ) {
        throw Error( 'no obj id' );
    }
    const doc = {};
    db.audits.find( {objId} ).sort( {_id: 1} ).forEach( entry => {
        if( !entry.diff ) {
            return;
        }
        Object.keys( entry.diff ).forEach( key => {
            doc[key] = entry.diff[key].newValue;
        } );
    } );
    return doc;
}

const PATIENT_ID = 'YOUR_PATIENT_ID';
const obj = {};
print( `ActivityID,Timestamp,Code,DateOfDeletion` );
db.audits.aggregate( [
    {$match: {'diff.actType.newValue': 'TREATMENT', 'diff.patientId.newValue': PATIENT_ID}},
    {$project: {code: '$diff.code.newValue', objId: '$objId', timestamp: '$timestamp'}}
] ).forEach( function( r ) {
    if( obj[r.objId] ) {
        return;
    }
    obj[r.objId] = true;
    const removed = db.audits.find( {objId: r.objId, action: 'delete'} ).toArray()[0];
    if( !removed ) {
        return;
    }

    const doc = reconstructFromAuditLog( r.objId );
    print( `${r.objId},${doc.timestamp},${doc.code},${r.timestamp}` );
} );
