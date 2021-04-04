/*global db, ObjectId, load, getPrice, getEndOfQuarter, getInvoiceLogIds */

/**
 * Load common utils.
 */
load( 'utils.js' );

function getStatus( match ) {
    return db.activities.aggregate( [
        {
            $match: match
        },
        {
            $group: {
                _id: '$status',
                sum: {
                    $sum: 1
                },
                price: {
                    $sum: '$price'
                },
                ids: {
                    $addToSet: '$_id'
                }
            }
        }
    ] ).toArray();
}

function getDistinctInvoiceLogId( match ) {
    return db.activities.aggregate( [
        {
            $match: match
        },
        {
            $group: {
                _id: '$invoiceLogId'
            }
        }
    ] ).toArray();
}

const showInvoicePlausiblity = def => {
    let invoiceLogType;
    let invoiceLogId;

    if( def.kbvLogId ) {
        invoiceLogType = 'kbvlogs';
        invoiceLogId = def.kbvLogId;
    } else if( def.pvsLogId ) {
        invoiceLogType = 'pvslogs';
        invoiceLogId = def.pvsLogId;
    } else {
        throw Error( `unknown def "${JSON.stringify( def )}"` );
    }

    const invoiceLog = db[invoiceLogType].findOne( {_id: ObjectId( invoiceLogId )} );

    if( !invoiceLog ) {
        throw Error( `${invoiceLogType} with id "${invoiceLogId}" not found!` );
    }

    let insuranceTypes;
    let invoiceLogStartDate;
    let invoiceLogEndDate;

    if( invoiceLogType === 'kbvlogs' ) {
        invoiceLogEndDate = getEndOfQuarter( invoiceLog.quarter, invoiceLog.year );
        insuranceTypes = ['PUBLIC'];
    } else if( invoiceLogType === 'pvslogs' ) {
        invoiceLogStartDate = invoiceLog.startDate;
        invoiceLogEndDate = invoiceLog.endDate;
        insuranceTypes = invoiceLog.insuranceTypes;
    } else {
        throw Error( `invoice type "${invoiceLogType}" unknown` );
    }

    print( `Analyse ${invoiceLogType} (${invoiceLogId})` );
    print( `Insurance/CaseFolder Types: ${insuranceTypes}` );
    print( `FROM: ${invoiceLogStartDate}` );
    print( `TO: ${invoiceLogEndDate}` );

    const cfQuery = {type: {$in: insuranceTypes}, imported: null};
    const cfImportedQuery = {type: {$in: insuranceTypes}, imported: true};

    const cfCount = db.casefolders.count( cfQuery );
    const cfImportedCount = db.casefolders.count( cfImportedQuery );

    print( `CF COUNT ALL: ${cfCount + cfImportedCount}` );
    print( `CF COUNT NORMAL: ${cfCount}` );
    print( `CF COUNT IMPORTED: ${cfImportedCount}` );

    const cfIds = db.casefolders.find( cfQuery, {_id: 1} ).map( d => d._id.str );

    const treatmentsQuery = {
        actType: 'TREATMENT',
        status: {$in: ['VALID', 'APPROVED', 'BILLED']},
        caseFolderId: {$in: cfIds},
        areTreatmentDiagnosesBillable: '1',
        invoiceId: null
    };

    if( invoiceLogStartDate ) {
        treatmentsQuery.timestamp = {$gt: invoiceLogStartDate};
    }
    if( invoiceLogEndDate ) {
        treatmentsQuery.timestamp = {$lt: invoiceLogEndDate};
    }

    if( invoiceLog.mainLocationId ) {
        treatmentsQuery.locationId = ObjectId( invoiceLog.mainLocationId );
        print( `BS: ${invoiceLog.mainLocationId}` );
    }

    if( invoiceLog.employees && invoiceLog.employees.length ) {
        treatmentsQuery.employeeId = {$in: invoiceLog.employees.map( e => e._id )};
        print( `Arzt: ${treatmentsQuery.employeeId.$in}` );
    }

    const getPriceResult = getPrice( treatmentsQuery );
    const sumPrice = getPriceResult && getPriceResult[0] && getPriceResult[0].price || 0;
    print( `PRICES Actual: ${sumPrice} => Log: ${invoiceLog.priceTotal}` );
    print( `       DIFF: ${invoiceLog.priceTotal - sumPrice}` );

    const getStatusResult = getStatus( treatmentsQuery );
    print( 'STATUS/PRICE:' );
    getStatusResult.forEach( sR => print( `\t${sR.sum} x ${sR._id} for ${sR.price}` ) );

    const getDistinctInvoiceLogIdResult = getDistinctInvoiceLogId( treatmentsQuery );
    print( `INVOICE_LOG_IDS: ${getDistinctInvoiceLogIdResult.map( dI => {
        if( !dI._id ) {
            return 'NOTHING';
        } else {
            return dI._id + (dI._id === invoiceLogId ? ' (*)' : '');
        }
    } )}` );

    const invoiceLogLogIds = getInvoiceLogIds( invoiceLogId );

    const getStatusPriceFromTreatmentsNitInInvoiceResult = getStatus( Object.assign( {}, treatmentsQuery, {_id: {$nin: invoiceLogLogIds}} ) );
    print( 'STATUS/PRICE W/O TREATMENTS IN CURRENT INVOICELOG:' );
    getStatusPriceFromTreatmentsNitInInvoiceResult.forEach( sR => print( `\t${sR.sum} x ${sR._id} for ${sR.price}:  ${sR.ids.join( ',' )}` ) );

    print( '' );
};

/**
 * Specify invoicelog ids to compare current state with actual patient data.
 * Execute like dc-mongo 0:
 * ~> load('invoicePlausibilityUtils.js') ~>
 * ~> const INVOICE_DEF = [
 *    {
 *        kbvLogId: '...'
 *    }, {
 *        kbvLogId: '...'
 *    }, {
 *        pvsLogId: '...'
 *    }
 * ];
 * ~> checkPlausibility(INVOICE_DEF)
 */


const checkPlausibility = ( INVOICE_DEF ) => {
    print( '' );
    print( '' );
    print( 'checkPlausibility...' );
    print( '' );
    INVOICE_DEF.forEach( showInvoicePlausiblity );
};

