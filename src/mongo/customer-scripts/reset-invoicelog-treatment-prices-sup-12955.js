/**
 * Iterate over the "treatment" entries of an invoice log and compare the Euro price with the points value
 *
 * Correct also in invoice entry
 *
 * See MOJ-10729 SUP-12955 SUP-13053 SUP-13040
 *
 * Set DO_REAL_UPDATE to true to persist changes, set kbvlog _id according to customer system
 *
 * User: strix
 * Date: 09/01/2019
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global db, ObjectId*/

function checkInvoiceEntry( invoiceEntryObj ) {
    /*  set this true when ready to make changes, by default print out a list of problems found */
    const
        BILLING_FACTOR_2019 = '0.108226',
        DO_REAL_UPDATE = false;
    /* */
    let
        treatments = invoiceEntryObj.data.treatments,
        treatmentIds = [],
        haveChanges = false;

    treatments.forEach( ( treatment ) => {  treatmentIds.push( ObjectId( treatment._id ) ); } );

    print( `[i] Have invoiceEntryObj ${invoiceEntryObj._id.valueOf()} treatment ids: ${treatmentIds.length}` );

    db.activities.find( { _id: { $in: treatmentIds } } ).forEach( checkSingleTreatment );

    function checkSingleTreatment( treatmentObj ) {
        let
            treatmentId = treatmentObj._id.valueOf(),
            billingFactor = parseFloat( treatmentObj.billingFactorValue ),
            euroPrice = treatmentObj.price,
            actualPrice = parseFloat( ( treatmentObj.actualPrice * billingFactor ).toFixed( 2 ) ),
            tsYear = treatmentObj.timestamp.toString().split( ' ' )[3];

        /*print( `[i] timestamp year: ${tsYear} from ${treatmentObj.timestamp}` ); */

        if ( tsYear === '2019' && treatmentObj.billingFactorValue !== BILLING_FACTOR_2019 ) {
            print( `[!] Incorrect billing factor for 2019, setting from ${treatmentObj.billingFactorValue} to: ${BILLING_FACTOR_2019}` );
            treatmentObj.billingFactorValue = BILLING_FACTOR_2019;
            actualPrice = parseFloat( ( treatmentObj.actualPrice * BILLING_FACTOR_2019 ).toFixed( 2 ) );
            print( `[i] Adjusting actual price for new billing factor value, now: ${actualPrice}` );
            haveChanges = true;
        }

        print( `[x] treatment ${treatmentId} ${treatmentObj.code} euro: ${euroPrice} actual: ${actualPrice}` );

        if ( 'Punkte' !== treatmentObj.actualUnit ) {
            print( `[!] actualUnit is not punkte: ${treatmentObj.actualUnit}, not continuing with this threatment` );
            return;
        }

        /*  correct in treatment */
        if ( euroPrice !== actualPrice ) {
            print( '[i] euro price is not the same as actual price, correcting... ' );
            haveChanges = true;

            if ( DO_REAL_UPDATE ) {
                print( `[>] Treatment object ${treatmentId} price correction from ${euroPrice} to ${actualPrice}` );
                db.activities.update(
                    { _id: treatmentObj._id },
                    {
                        $set: {
                            price: actualPrice,
                            billingFactorValue: treatmentObj.billingFactorValue
                        }
                    }
                );
                /* update reportings with new treatment price */
                print( `[i] Scheduling reporting update for ACTIVITY ${treatmentObj._id.valueOf()}` );
                db.syncreportings.insertOne( {
                    '_id': ObjectId(),
                    'entityName': 'ACTIVITY',
                    'entryId': treatmentObj._id.valueOf(),
                    'timestamp': new Date()
                } );
            } else {
                print( `[x] Treatment object ${treatmentId} price will be corrected from ${euroPrice} to ${actualPrice}` );
            }

        } else {
            print( `[.] prices match` );
        }

        /*  correct also in invoiceEntry */
        treatments.forEach( function( ieObj ) {
            if ( ieObj._id === treatmentId && ( ieObj.price - actualPrice ) !== 0 ) {
                print( `[>] Copying corrected price into invoiceEntry: ${ieObj.price} to ${actualPrice}` );
                ieObj.price = actualPrice;
            }
        } );
    }

    /*  after check of all treatments, look at sum of this invoice entry */

    /*  save the invoiceEntry */
    if ( DO_REAL_UPDATE ) {

        if ( haveChanges ) {
            print( `[i] Saving treatments in invoiceEntry: ${treatments.length}` );
            db.invoiceentries.update( { _id: invoiceEntryObj._id }, { $set: { data: invoiceEntryObj.data } } );
        } else {
            print( `[.] No changes needed to invoiceEntry ${invoiceEntryObj._id.valueOf()}` );
        }

    } else {
        if ( haveChanges ) {
            print( `[.] Not saving changes to ${invoiceEntryObj._id.valueOf()}, not real update.` );
        } else {
            print( `[.] No changes needed to invoiceEntry ${invoiceEntryObj._id.valueOf()}` );
        }
    }
}

/* set your own invoiceLogId here */
db.invoiceentries.find( { invoiceLogId: "5bc6184f5d9fa54675cc6e7c", type: "schein" } ).forEach( checkInvoiceEntry );


function correctKbvTotal( kbvlogObj ) {
    const DO_REAL_UDPATE = false;
    /* */
    let
        kbvlogId = kbvlogObj._id.valueOf(),
        totalAllEntries = 0;
    /* */
    print( `[i] Recalculating total for kbvlog ${kbvlogId}, finding all pateints` );
    print( `[i] kbvlog excluded patients: ${kbvlogObj.excludedPatientIds.length} excluded schein: ${kbvlogObj.excludedScheinIds.length}` );
    /* */
    db.invoiceentries.find( { invoiceLogId: kbvlogId, type: 'patient' } ).forEach( checkPatientScheine );

    function checkPatientScheine( patientEntryObj ) {
        let
            totalForPatient = 0,
            originalTotal = patientEntryObj.data.priceTotal,
            patientName = patientEntryObj.data.firstname + ' ' + patientEntryObj.data.lastname,
            patientId = patientEntryObj.data._id,

            scheinQuery = {
                'invoiceLogId': kbvlogId,
                'type': 'schein',
                'data.patientId': patientEntryObj.data._id
            };
        /* */
        if ( -1 !== kbvlogObj.excludedPatientIds.indexOf( patientId ) ) {
            print( `[i] SKIPPING excluded patient: ${patientId} ${patientName}` );
            return;
        }

        print( `[i] Finding invoices for patient: ${patientName} ${patientId} ie: ${patientEntryObj._id.valueOf()}` );

        db.invoiceentries.find( scheinQuery ).forEach( addScheinTotal );
        /* */
        if ( !originalTotal ) {
            print( `[!] no original total for patient: ${patientId} ${patientName}, setting to 0` );
            originalTotal = 0;
        }

        function addScheinTotal( invoiceEntryObj ) {
            let
                scheinId = invoiceEntryObj.data._id,
                treatments = invoiceEntryObj.data.treatments,
                totalForSchein = 0,
                i;
            /* */
            if ( -1 !== kbvlogObj.excludedScheinIds.indexOf( scheinId ) ) {
                print( `[!] SKIPPING exlcuded schein ${scheinId} for patient: ${patientName}` );
            }
            /* */
            print( `[i] checking treatments on invoice entry: ${invoiceEntryObj._id.valueOf()} ${invoiceEntryObj.data.treatments.length}` );
            /* */
            for ( i = 0; i < treatments.length; i++ ) {
                /* */
                if ( treatments[i].price && 'string' === typeof treatments[i].price ) {
                    treatments[i].price = parseFloat( treatments[i].price );
                }
                /* */
                if ( treatments[i].price && 'number' === typeof treatments[i].price ) {
                    totalAllEntries = totalAllEntries + treatments[i].price;
                    totalForPatient = totalForPatient + treatments[i].price;
                    totalForSchein = totalForSchein + treatments[i].price;
                    print( `[+] Adding treatment ${treatments[i]._id} ${treatments[i].code} ${treatments[i].price}  (total: ${totalAllEntries})` );
                } else {
                    print( `[!] Treatment ${i} has no price recorded on invoiceEntry: ${ typeof treatments[i].price } ${ treatments[i].price }` );
                }
            }
            /* */
            totalForSchein = parseFloat( totalForSchein.toFixed( 2 ) );
            print( `[i] total for schein: ${totalForSchein} (${patientName})` );
        }
        /* */
        totalForPatient = parseFloat( totalForPatient.toFixed( 2 ) );
        /* */
        if ( totalForPatient !== originalTotal ) {
            if ( DO_REAL_UDPATE ) {
                print( `[>] updateing patient total from ${originalTotal} to ${totalForPatient}` );
                db.invoiceentries.update( { _id: patientEntryObj._id }, { $set: { 'data.priceTotal': totalForPatient } } );
            } else {
                print( `[>] patient total will be updated from ${originalTotal} to ${totalForPatient}` );
            }
        } else {
            print( `[i] patient total matches recalculated value: ${totalForPatient}` );
        }
    }
    /* */
    totalAllEntries = parseFloat( totalAllEntries.toFixed( 2 ) );
    /* */
    if ( kbvlogObj.priceTotal !== totalAllEntries ) {
        if ( DO_REAL_UDPATE ) {
            print( `[>] Setting total on kbvlog ${kbvlogId} from ${kbvlogObj.priceTotal} to ${totalAllEntries}` );
            db.kbvlogs.update( { _id: kbvlogObj._id }, { $set: { priceTotal: totalAllEntries } } );
        } else {
            print( `[x] Not running real update, extant: ${kbvlogObj.priceTotal} recalculated: ${totalAllEntries}` );
        }
    } else {
        print( `[i] kbvlog price matches totals: ${totalAllEntries}` );
    }
}

//  update total of entrie kbvlog from all invoice entries
db.kbvlogs.find( { _id: ObjectId( '5bc6184f5d9fa54675cc6e7c' ) } ).forEach( correctKbvTotal );


function correctTreatmentsInSequence( seqObj ) {
    const
        DO_REAL_UPDATE = false,
        BILLING_FACTOR_2019 = '0.108226';

    let
        actObj,
        checkPrice,
        needsSave = false,
        i;

    print( `[i] Checking activity sequence: ${seqObj._id.valueOf()} ${seqObj.title}` );

    for ( i = 0; i < seqObj.activities.length; i++ ) {

        actObj = seqObj.activities[i];

        if ( 'TREATMENT' === actObj.actType && 'EBM' === actObj.catalogShort ) {
            print( `[i] Checking TREATMENT ${actObj._id} ${actObj.code} ${actObj.content}` );
            if ( actObj.billingFactorValue !== BILLING_FACTOR_2019 ) {
                print( `[>] TREATMENT in sequence has incorrect billing factor value for 2019: ${actObj.billingFactorValue} set: ${BILLING_FACTOR_2019}` );
                actObj.billingFactorValue = BILLING_FACTOR_2019;
                needsSave = true;
            }

            if ( 'Punkte' === actObj.actualUnit ) {
                //  check the price
                checkPrice = ( actObj.billingFactorValue * actObj.actualPrice );
                print( `[i] Checking actual price: ${actObj.billingFactorValue} x ${actObj.actualPrice} = ${checkPrice}` );
                /* */
                if ( checkPrice === actObj.price ) {
                    print( `[.] existing price matches point value` );
                } else {
                    print( `[>] prices differ, updating: ${actObj.price} !== ${checkPrice}` );
                    actObj.price = checkPrice;
                    needsSave = true;
                }
            } else {
                print( `[i] Catalog unit is not Punkte: ${actObj.actualUnit}` );
            }
        }
    }
    /* */
    if ( needsSave ) {
        if ( DO_REAL_UPDATE ) {
            print( `[>] Saving activity sequence... ${seqObj.activities.length}` );
            db.activitysequences.update( { _id: seqObj._id }, { $set: { activities: seqObj.activities } } );
        } else {
            print( `[>] Reporting mode only, activity sequence not saved` );
        }
    } else {
        print( '[i] No change needed to activity sequence' );
    }
}

db.activitysequences.find().forEach( correctTreatmentsInSequence );