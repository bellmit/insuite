/**
 * User: maximilian.kramp
 * Date: 10/16/20  10:02 AM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global db, print, ObjectId */

var
    queryForInvoiceRefs = {
        actType: 'INVOICEREF',
        status: 'CANCELLED',
        'referencedBy.0': {$exists: true}
    },
    queryForTreatments = {
        actType: 'TREATMENT',
        status: 'BILLED'
    },
    cancelledInvoiceRefs,
    billedTreatmentsIds = [],
    billedTreatmentsLinkedToCancelledInvoiceRef;

cancelledInvoiceRefs = db.activities.find( queryForInvoiceRefs ).toArray();

cancelledInvoiceRefs.forEach( function( invoiceRef ) {
    if( invoiceRef && invoiceRef.referencedBy && Array.isArray( invoiceRef.referencedBy ) ) {
        invoiceRef.referencedBy.forEach( function( activityId ) {
            billedTreatmentsIds.push( ObjectId( activityId ) );
        } );
    }
} );

print( `found ${cancelledInvoiceRefs && cancelledInvoiceRefs.length} 'Abrechnungen' labelled as 'storniert' with referenced treatments` );
if( billedTreatmentsIds && billedTreatmentsIds.length ) {
    queryForTreatments._id = {$in: billedTreatmentsIds};
    print( `found ${db.activities.count( queryForTreatments )} 'Leistungen' which are still 'abgerechnet'` );
    print( 'updating...' );
    db.activities.update( queryForTreatments, {$set: {status: 'VALID'}}, {multi: true} );
}