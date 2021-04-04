/* global db */

function checkHasForm( invoice ) {
    //  editable, don't need to be fixed this way
    if ( 'VALID' === invoice.status || 'CREATED' === invoice.status ) { return; }

    //  has enough attachments, not affected by this bug
    if ( invoice.attachments.length >= 2 ) { return; }

    //print( `[>] invoice ${invoice._id.valueOf()} ${invoice.status} No. ${invoice.invoiceNo} PDF: ${invoice.formPdf} Att: ${JSON.stringify(invoice.attachments)} ${invoice.timestamp}` );
    print( `"${invoice._id.valueOf()}",` );
}

db.activities.find( { actType: 'INVOICE' } ).sort( { timestamp: 1 } ).forEach( checkHasForm );

