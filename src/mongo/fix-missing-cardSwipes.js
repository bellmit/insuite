/**
 * User: do
 * Date: 02.01.20  16:31
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global db:true, ObjectId, ISODate, print, printjsononeline */

/**
 * Try to fix missing cardSwipes of kbvlogs by:
 *  - Iterate all invoice entries of type 'schein':
 *    - If crlog in specified timeRange (quarter) exists:
 *      - get first patient version with cardSwipe and assign its id to the corresponding schein.patientVersionId
 * Note: Current script only works if at least on patient version is present like in the case of SUP-22653.
 *       If this is not the case the script must be extended to update existing patient version without CS or create
 *       new one by using margedPatient data of crlog and assign new pv to schein.
 */
const invouiceLogId = '5df13047a4cb1933c7b8a989';
const timeRange = {$gt: ISODate( "2019-09-30T22:00:00.000Z" ), $lt: ISODate( "2019-12-31T23:00:00.000Z" )};

let found = 0;
let notFound = 0;
db.invoiceentries.find( {
    invoiceLogId: invouiceLogId,
    type: 'schein',
    'data.patient.insuranceStatus.cardSwipe': null
} ).forEach( function( invoiceEntry ) {
    const crlog = db.crlogs.findOne( {
        status: 'APPLIED',
        validationStatus: 'OK',
        'parsedPatient.insuranceStatus.0.type': 'PUBLIC',
        matchedPatientId: invoiceEntry.data.patient._id,
        initiatedAt: timeRange
    } );

    if( !crlog ) {
        print( `crlog ${invoiceEntry.data.patient._id} not found` );
        return;
    }

    const patientVersions = db.patientversions.find( {
        patientId: invoiceEntry.data.patient._id,
        timestamp: timeRange
    } ).toArray();

    let foundPV;
    patientVersions.some( function( pv ) {
        return pv.insuranceStatus.some( function( is ) {
            if( is.cardSwipe ) {
                print( `   CS: ${is.cardSwipe}` );
                foundPV = pv;
                return true;
            }
        } );
    } );

    if( !foundPV ) {
        notFound++;
        print( `pv not found for ${invoiceEntry.data.patient._id} in ${patientVersions.length} version` );
    } else {
        found++;
        print( `pv FOUND for ${invoiceEntry.data.patient._id}` );
        const schein = db.activities.findOne( {_id: ObjectId( invoiceEntry.data._id ), patientVersionId: null} );
        if( !schein ) {
            print( `       SCHEIN NOT FOUND: ${invoiceEntry.data._id}` );
        } else {
            print( `updating SCHEIN FOUND: ${invoiceEntry.data._id} with PV: ${foundPV._id.str}` );
            const result = db.activities.update( {
                _id: ObjectId( invoiceEntry.data._id ),
                patientVersionId: null
            }, {$set: {patientVersionId: foundPV._id.str}} );
            printjsononeline( result );
        }
    }

} );
print( `found: ${found}` );
print( `notFound: ${notFound}` );



