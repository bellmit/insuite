/**
 * User: dcdev
 * Date: 1/21/21  5:05 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/* global db:true */
print( '==== KAT-367 Remove duplicate linkedContents ====' );
db = db.getSiblingDB( "0" );
let count = 0;
db.activities.find( {
    actType: {
        $in: ['INVOICE', 'INVOICEREF']
    },
    $or: [
        {linkedContents: {$gt: []}},
        {linkedEmployees: {$gt: []}},
        {linkedTimestamps: {$gt: []}}
    ]
} ).forEach( invoice => {
    const newLinkedContents = invoice.linkedContents.filter( filterDuplicates ),
        newLinkedEmployees = invoice.linkedEmployees.filter( filterDuplicates ),
        newLinkedTimestamps = invoice.linkedTimestamps.filter( filterDuplicates ),
        contentsChanged = newLinkedContents.length !== invoice.linkedContents.length,
        employeesChanged = newLinkedEmployees.length !== invoice.linkedEmployees.length,
        timestampsChanged = newLinkedTimestamps.length !== invoice.linkedTimestamps.length;

    if( contentsChanged || employeesChanged || timestampsChanged ) {
        db.KAT_377_duplicate_linkedContents.insertOne( invoice );
        let data = {
            $set: {}
        };
        Object.assign(data.$set,
            contentsChanged ? {linkedContents: newLinkedContents} : {},
            employeesChanged ? {linkedEmployees: newLinkedEmployees} : {},
            timestampsChanged ? {linkedTimestamps: newLinkedTimestamps} : {} );

        const result = db.activities.update({_id: invoice._id}, data);
        count+= result.nModified;
        print('Removed duplicates from linked contents for invoice ' + invoice._id.toString());
    }
} );

print('==== KAT-367 Removed duplicates from linked contents for ' + count + ' invoices ====');


function filterDuplicates( item, index, self ) {
    const itemCompare = Object.assign( {}, item, {_id: 'do not compare'} );
    return index === self.findIndex( i => {
        const compareWith = Object.assign( {}, i, {_id: 'do not compare'} );
        return JSON.stringify( itemCompare ) === JSON.stringify( compareWith );
    } );
}