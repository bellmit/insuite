/**
 * User: dcdev
 * Date: 11/30/20  3:56 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/* global db:true */
print( '==== Fix invoiceRef employeeIds KAT-210 ====' );
db = db.getSiblingDB( "0" );

const result = db.activities.find( {
    actType: 'INVOICEREF'
} );

let count = 0;

while( result.hasNext() ) {
    const invoiceRef = result.next(),
        scheinQuery = {
            actType: 'PKVSCHEIN',
            patientId: invoiceRef.patientId,
            caseFolderId: invoiceRef.caseFolderId,
            locationId: invoiceRef.locationId,
            timestamp: {
                $lte: invoiceRef.timestamp
            },
            status: {$ne: 'CANCELLED'}
        },
        scheins = db.activities.find( scheinQuery ).sort({timestamp: -1}).limit( 1 ).toArray(),
        newEmployeeId = (scheins && scheins[0] || {}).employeeId;

    if( newEmployeeId && invoiceRef.employeeId !== newEmployeeId ) {
        print( 'Update invoiceRef employeeId from ' + invoiceRef.employeeId + ' to ' + newEmployeeId );
        db.activities.update( {_id: invoiceRef._id}, {$set: {employeeId: newEmployeeId}} );
        count++;
    } else if ( !newEmployeeId ){
        print( 'employeeId from schein (schein id: ' + ( scheins && scheins[0] || {} )._id + ' ) does not exists' );
    }
}

print( '==== Fix invoiceRef employeeIds KAT-210 finished updating ' + count + ' invoiceRefs! ====' );