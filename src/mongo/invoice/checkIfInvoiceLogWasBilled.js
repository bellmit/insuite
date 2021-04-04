/**
 * User: do
 * Date: 10.04.19  16:58
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/* global db, ObjectId */

const invoiceLogId = '5ca77e6073008ea58c791afd';
const scheinQuery = {type: 'schein', invoiceLogId: invoiceLogId};
const nScheins = db.invoiceentries.count( scheinQuery );

db.invoiceentries.find( scheinQuery ).forEach( ie => {
    const ids = [ie.data._id];
    const pushId = t => ids.push( t._id );
    ie.data.treatments.forEach( pushId );
    const nFound = db.activities.count( {_id: {$in: ids.map( id => ObjectId( id ) )}, status: 'BILLED'} );
    if( nFound !== ids.length ) {
        print( `INVALID SCHEIN=${ie.data._id} IDS/BILLED=${ids.length}/${nFound}` );
    } else {
        print( `GOOD SCHEIN=${ie.data._id} IDS/BILLED=${ids.length}/${nFound}` );
    }
} );
print( `${nScheins} scheins` );