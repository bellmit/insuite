/* script to correct the treatments price for H1 treatments from 01.10.20 till 31.12.20 (current quarter)           */
/* which have price == 0 and are grouped by patient and caseFolder for each day of given range                      */
/* in case if total sum of one-group treatment' prices will be less then threshold from GOÄ 3541H catalog then      */
/* reset that treatments prices to value from catalog and remove 3541H treatment of that day and caseFolder         */

/* IMPORTANT, always make a backup of activities collection before running this                                     */
/*                                                                                                                  */
/*  dc-mongodump --db 0 --collection activities                                                                     */
/* */

/*global db, print, ISODate
/* */


var endDate = new Date( "2020-12-31T22:59:59.999Z" );      // end of quarter
var currentDate = new Date( "2020-09-30T22:00:00.000Z" );  // start of quarter
var entryToProcess;
var substituteTreatment;

function getBillingFactor( u_extra, type ) {
    return u_extra && u_extra.rechnungsfaktor && u_extra.rechnungsfaktor[type];
}

function toPrice( price, factor, factor2 ) {

    var
        factorNumber = Number( factor );
    if( !price ) {
        return 0;
    }
    price = (0 === factorNumber || factorNumber) ? Number( price ) * factorNumber : Number( price );
    if( 0 === factor2 || factor2 ) {
        price = price * factor2;
    }
    return !isNaN( price ) ? Number( price.toFixed( 2 ) ) : 0;
}

// SET DB TO EXECUTE SCRIPT ON
//use 0

var catalog = db.catalogs.find( {seq: '3541H', catalog: {$regex: /-GOÄ-/}} ).toArray()[0];

// FOR TESTING ON MULTITENANT DB
//use 2222222222

// iterate through current quarter
while( currentDate < endDate ) {

    // single day' treatments with price == 0 with code which ends with 'H1'
    // grouped by patient and caseFolder and with recalculated price

    var treatmentsToProcess = db.activities.aggregate( [
        {
            $match: {
                actType: 'TREATMENT',
                timestamp: {
                    $lte: new Date( new Date( currentDate ).setHours( 23, 59, 59, 999 ) ),
                    $gte: new Date( new Date( currentDate ).setHours( 0, 0, 0, 0 ) )
                },
                catalogShort: 'GOÄ',
                price: 0,
                code: {$regex: /H1$/}
            }
        },
        {
            $project: {
                euroRate: {$arrayElemAt: ['$u_extra.bewertung_liste', 1]},
                catalogBillingFactorValue: '$u_extra.rechnungsfaktor.privatversicherte',
                entry: '$$ROOT'
            }
        },
        {
            $project: {
                patient: '$entry.patientId',
                caseFolder: '$entry.caseFolderId',
                price: '$entry.price',
                code: '$entry.code',
                billingFactorValue: '$entry.billingFactorValue',
                billingFactorType: '$entry.billingFactorType',
                calculatedPrice: {$multiply: [{$toDouble: '$euroRate.value'}, {$toDouble: '$catalogBillingFactorValue'}]}
            }
        },
        {
            $group: {
                _id: {
                    patient: '$patient',
                    caseFolder: '$caseFolder'
                },
                treatments: {$push: '$$ROOT'}
            }
        },
        {
            $group: {
                _id: '$_id.patient',
                treatmentsGroupedByCaseFolder: {
                    $push: {
                        caseFolder: '$_id.caseFolder',
                        activities: '$treatments',
                        totalPrice: {$sum: '$treatments.calculatedPrice'}
                    }
                }
            }
        }
    ] );

    // iterate through founded treatments
    while( treatmentsToProcess.hasNext() ) {

        entryToProcess = treatmentsToProcess.next();

        for( var treatmentsInCaseFolder of entryToProcess.treatmentsGroupedByCaseFolder ) {
            // pseudo 3541H treatment
            substituteTreatment = {
                u_extra: catalog.u_extra,
                billingFactorType: treatmentsInCaseFolder.activities[0].billingFactorType || 'privatversicherte',
            };

            substituteTreatment.billingFactorValue = getBillingFactor( substituteTreatment.u_extra, substituteTreatment.billingFactorType ) || '2.3';
            substituteTreatment.actualUnit = substituteTreatment.u_extra.bewertung_liste[0].unit;
            substituteTreatment.actualPrice = substituteTreatment.u_extra.bewertung_liste[0].value || 0;
            substituteTreatment.price = toPrice( substituteTreatment.actualPrice, substituteTreatment.billingFactorValue, ('Punkte' === substituteTreatment.actualUnit ? 0.0582873 : undefined) );

            print( '--- GROUP ---', currentDate.toISOString() )
            print( 'actualPrice --------------', substituteTreatment.actualPrice )
            print( 'actualUnit ---------------', substituteTreatment.actualUnit )
            print( 'billingFactorValue -------', substituteTreatment.billingFactorValue )
            print( 'threshold price ----------', substituteTreatment.price )
            print( 'totalPriceOfTreatments ---', treatmentsInCaseFolder.totalPrice )

            // if total price of all H1 treatments is less then threshold (price from 3541H catalog),
            // then update those treatments with correct prices and delete 3541H treatment of that day and caseFolder
            if( treatmentsInCaseFolder.totalPrice < substituteTreatment.price ) {

                print( '\n!!! treatments price in this group will be resetted and H1 treatment will be deleted !!!' )

                //print( 'activities to reset', treatmentsInCaseFolder.activities.map(function(item){return item._id;}))

                db.activities.remove( {
                    caseFolderId: treatmentsInCaseFolder.caseFolder, code: '3541H', actType: 'TREATMENT', timestamp: {
                        $lte: new Date( new Date( currentDate ).setHours( 23, 59, 59, 999 ) ),
                        $gte: new Date( new Date( currentDate ).setHours( 0, 0, 0, 0 ) )
                    }
                } );

                // update each treatment separately since we should set price for each of them respectively
                for( var activityToReset of treatmentsInCaseFolder.activities ) {
                    print( `[x] ${activityToReset._id} activity will be updated` );
                    db.activities.update( {_id: activityToReset._id}, {$set: {price: Number( activityToReset.calculatedPrice.toFixed( 2 ) )}} );
                }
            }
            print( '---END OF GROUP---\n\n' )
        }
    }

    // go to the next day
    currentDate.setDate( currentDate.getDate() + 1 );
}