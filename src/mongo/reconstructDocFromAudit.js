/**
 * User: do
 * Date: 04.07.19  11:59
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global db:true, printjson*/

const OBJ_ID = 'xxx';

function reconstructFromAuditLog( objId ) {
    if( !objId ) {
        throw Error( 'no objId passed' );
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

printjson( reconstructFromAuditLog( OBJ_ID ) );