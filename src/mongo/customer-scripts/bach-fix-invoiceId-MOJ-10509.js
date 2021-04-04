/**
 * Run over all TREATMENT activities in the database and check invoices exist if referenced in invoiceId field
 *
 * User: strix
 * Date: 01/10/2018
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global db, ObjectId*/

function checkInvoiceId( treatmentObj ) {
    //  set this true when ready to make changes, by default print out a list of problems found
    const DO_REAL_UPDATE = false;

    let
        treatmentId = treatmentObj._id.valueOf(),
        brokenLink = false,
        cancelledLink = false;

    //print( `Checking ${treatmentObj.actType} ${treatmentId}` );

    //  if treatment is not billed to an INVOICE activity then we can skip this one
    if ( !treatmentObj.invoiceId ) { return; }

    //  get the linked invoice to check it
    let invoiceObj  = db.activities.findOne( { _id: ObjectId( treatmentObj.invoiceId ) } );

    //print( `Found invoiceObj: ${invoiceObj._id}` );

    //  if the invoice is missing / link is broken then the broken link should be removed from the treatment
    if ( !invoiceObj ) {
        print( `TREATMENT ${treatmentId} is billed to missing INVOICE activity: ${treatmentObj.invoiceId}` );
        brokenLink = true;
    }

    //  if the invoice exists but is cancelled then the treatment should be unlinked so that it can be billed
    if ( invoiceObj && 'CANCELLED' === invoiceObj.status ) {
        print( `TREATMENT ${treatmentId} is billed to cancelled INVOICE activity: ${treatmentObj.invoiceId}` );
        cancelledLink = true;
    }

    //  if the treatment links to an invoice, check that the invoice contains that treatment (advisory only)
    if (invoiceObj && !isInArray( treatmentId, invoiceObj.activities ) ) {
        print( `TREATMENT ${treatmentId} is billed to INVOICE activity ${treatmentObj.invoiceId} which does not contain it: ${JSON.stringify(invoiceObj.activities)}` );
        brokenLink = true;
    }

    //  looks OK, leave it as it is
    if ( !brokenLink && !cancelledLink ) { return; }

    if ( !DO_REAL_UPDATE ) {
        print( `Diagnostic only, not fixing.` );
        return;
    }

    //  correct treatment.invoiceId
    print( `Unsetting invoiceId on TREATMENT ${treatmentId}` );
    db.activities.update( { _id: treatmentObj._id }, { $unset: { invoiceId: '' } } );

    // also correct referencedBy if necessary, we can keep references to CANCELLED invoices
    if ( !cancelledLink && treatmentObj.referencedBy && isInArray( treatmentObj.invoiceId, treatmentObj.referencedBy ) ) {
        treatmentObj.referencedBy = removeFromSet( treatmentObj.invoiceId, treatmentObj.referencedBy );
        print( `Removing invoiceId ${treatmentObj.invoiceId} from referencedBy on TREATMENT ${treatmentObj}: ${JSON.stringify(treatmentObj.referencedBy)}` );
        db.activities.update( { _id: treatmentObj._id }, { $set: { referencedBy: treatmentObj.referencedBy } } );
    }

    //  if the invoice actually exists and not cancelled, we should set it to 'CREATED', to force remap of form
    if ( invoiceObj && 'CREATED' !== invoiceObj.status && 'CANCELLED' !== invoiceObj.status ) {
        print( `Invoice likely inconsistent, setting to CREATED state: ${invoiceObj._id.valueOf()}` );
        db.activities.update( { _id: invoiceObj._id }, { $set: { status: 'CREATED' } } );
    }

    function removeFromSet( item, ary ) {
        let newAry = [], i;

        for ( i = 0; i < ary.length; i++ ) {
            if ( item !== ary[i] ) {
                newAry.push( ary[i] );
            }
        }
        return newAry;
    }

    function isInArray( item, ary ) {
        let i;
        for ( i = 0; i < ary.length; i++ ) {
            if ( ary[i] === item ) { return true; }
        }
        return false;
    }

}

db.activities.find( { actType: 'TREATMENT' } ).forEach( checkInvoiceId );