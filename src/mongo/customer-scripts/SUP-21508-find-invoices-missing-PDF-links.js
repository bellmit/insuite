/* global db */
function checkPdfMedia( act ) {
    if ( 'VALID' === act.status ) { return; }
    /* */
    var found = false, i;
    /* */
    if ( !act.formPdf ) {
        print( `[!] Invoice does not have a form PDF: ${act._id.valueOf()} ${act.timestamp}` );
    }
    /* */
    for ( i = 0; i < act.attachedMedia.length; i++ ) {
        if ( act.attachedMedia[i].mediaId === act.formPdf ) {
            found = true;
        }
    }
    if (!found) {
        print( `[!] ${act.status} invoice is missing PDF link: ${act._id.valueOf()} ${act.timestamp}` );
        print( 'https://367dfv2.hub.doc-cirrus.com/incase#/activity/' + act._id.valueOf() );
    }
}

db.activities.find( { actType: 'INVOICE' } ).forEach( checkPdfMedia );

