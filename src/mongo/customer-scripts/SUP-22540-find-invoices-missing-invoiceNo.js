/* global db, ObjectId */

function checkHasForm( invoice ) {
    //  editable, don't need to be fixed this way
    if ( 'VALID' === invoice.status || 'CREATED' === invoice.status ) { return; }
    /* */
    const
        formField = 'invoiceNo',
        badValue =  'Rechnungsnr:  ---';
    /* */
    let
        attachmentIds = [], i;
    /* */
    for ( i = 0; i < invoice.attachments.length; i++ ) {
        attachmentIds.push( ObjectId( invoice.attachments[i] ) );
    }
    /* */
    db.documents.find( { _id: { $in: attachmentIds } } ).forEach( checkDocument );
    /* */
    function checkDocument( doc ) {
        if ( 'FORM' !== doc.type ) { return; }
        /* */
        if ( !doc.formState || !doc.formState[ formField ] || doc.formState[ formField ] === badValue ) {
            print( `[!] ${invoice.status} invoice ${invoice._id.valueOf()} ${invoice.invoiceNo} ${invoice.timestamp} does not have invoiceNo` );
            print( `"${invoice._id.valueOf()}",` );
        }
    }
}

db.activities.find( { actType: 'INVOICE' } ).sort( { timestamp: 1 } ).forEach( checkHasForm );

