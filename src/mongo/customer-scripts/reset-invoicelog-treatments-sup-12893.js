/**
 * Iterate over the "schein" entries of an invoice log and set all BILLED treatments to APPROVED if they have no invoiceLogId
 *
 * See SUP-12893, and set your own invoiceLogId in the query at the end of the file
 *
 * User: strix
 * Date: 27/12/2018
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global db, ObjectId*/

function checkInvoiceEntry( invoiceEntryObj ) {
    /*  set this true when ready to make changes, by default print out a list of problems found */
    const DO_REAL_UPDATE = false;

    let
        treatments = invoiceEntryObj.data.treatments,
        treatmentIds = [];

    treatments.forEach( ( treatment ) => {  treatmentIds.push( ObjectId( treatment._id ) ); } );

    print( `(****) invoiceEntryObj ${invoiceEntryObj._id.valueOf()} treatment ids: ${treatmentIds.length}` );

    db.activities.find( { _id: { $in: treatmentIds } } ).forEach( checkSingleTreatment );

    function checkSingleTreatment( treatmentObj ) {
        print( `(----) treatment ${treatmentObj._id.valueOf()} ${treatmentObj.status} ${treatmentObj.content}` );
        print( `(----) treatment invoiceLogId: ${treatmentObj.invoiceLogId} invoiceId: ${treatmentObj.invoiceId}` );

        if ( 'BILLED' === treatmentObj.status && !treatmentObj.invoiceLogId && !treatmentObj.invoiceId ) {

            if ( DO_REAL_UPDATE ) {
                print( `(-XX-) Treatment  ${treatmentObj._id.valueOf()} is BILLED but is not assigned to an invoice, resetting to APPROVED` );
                db.activities.update( { _id: treatmentObj._id }, { $set: { status: 'APPROVED' } } );
            } else {
                print( `(-XX-) Treatment  ${treatmentObj._id.valueOf()} is BILLED but is not assigned to an invoice, will be set to APPROVED` );
            }

        }

    }

}


/* set your own invoiceLogId here */
db.invoiceentries.find( { invoiceLogId: "5bb232a9c125813bd9d00197", type: "schein" } ).forEach( checkInvoiceEntry );


function checkScheinStatus( invoiceEntryObj ) {
    /*  set this true when ready to make changes, by default print out a list of problems found */
    const DO_REAL_UPDATE = false;

    var
        scheinId = ObjectId( invoiceEntryObj.data._id ),
        scheinObj = db.activities.findOne( { _id: scheinId } );

    print( `(****) Found schein: ${scheinObj.status} ${scheinObj.content}` );

    if ( 'BILLED' === scheinObj.status ) {

        if ( DO_REAL_UPDATE ) {
            print( `(-XX-) Setting schein ${scheinObj._id.valueOf()} state to VALID` );
            db.activities.update( { _id: scheinObj._id }, { $set: { status: 'VALID' } } );
        } else {
            print( `(-XX-) Schein ${scheinObj._id.valueOf()} state will be set to VALID` );
        }

    }
}


/* set your own invoiceLogId here */
db.invoiceentries.find( { invoiceLogId: "5bb232a9c125813bd9d00197", type: "schein" } ).forEach( checkScheinStatus );