/* check treatments against a gkvlog */
/* latest kbvlog: db.kbvlogs.find().sort({ created: -1 }).limit(1).pretty(); */

/*global ISODate, db, print, ObjectId */

function checkTreatmentsAgainstLog() {
    /* configre your invoiceLogId and date range below */
    let dateRange = { "$lte":ISODate("2020-09-30T21:59:59.999Z"),"$gte":ISODate("2020-06-30T22:00:00.000Z") };
    let invoiceLogId = '5f78385ed259cb0c78bce609';
    invoiceLogId = '5f23b2afb7a2833f8a3ea3c1';
    /* */
    let treatmentIds = [];
    let totalLogPrice = 0;
    /* */
    /* List all treatments in log by _id */
    db.invoiceentries.find({invoiceLogId, type:'schein'}).forEach( function collectTreatmentIds(schein) {
        if ( !schein.data.treatments ) { return; }
        schein.data.treatments.forEach( function( treatment ) {
            print( `[i] log contains treatment ${treatment._id} ${treatment.code} ${treatment.price} ${treatment.patientId}` );
            treatmentIds.push( treatment._id );
            totalLogPrice += ( treatment.price || 0 );
        } );
    });
    /* */
    print( `[_] Found ${treatmentIds.length} treatments in log, EUR ${totalLogPrice}.` );
    /* */
    let query = { actType: 'TREATMENT', status: { $in: ['APPROVED', 'VALID']}, timestamp: dateRange };
    let totalMissing = 0, totalPriceMissing = 0;
    db.activities.find( query ).sort({ timestamp: -1 }).forEach( function checkTreatment( act ) {
        /* check casefolder, import status, etc here if necessary */
        if ( -1 === treatmentIds.indexOf( act._id.valueOf() ) ) {
            let pat = db.patients.findOne({_id: ObjectId(act.patientId)}) || {};
            print( `[!] treatment not in log: ${act._id.valueOf()} ${act.timestamp} ${act.code} ${act.price} pat# ${pat.patientNumber} ` );
            totalMissing += 1;
            totalPriceMissing += (act.price || 0);
        }
    } );
    print( `[_] total treatments not in kbvlog: ${totalMissing} EUR ${totalPriceMissing}` );
}

checkTreatmentsAgainstLog();