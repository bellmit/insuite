/**
 * User: do
 * Date: 16.03.21  08:38
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/**
 * @see KAP-243
 * Combine material costs of source treatments and add to target treatment on same day.
 * Skip this if more than one or none target treatment exists.
 */

sourceCodes = [
    'cy4',
    'cy2',
    'kos',
    'gripp',
    'braun',
    '3wh',
    'infb',
    'ins',
    'transo',
    'transb',
    'pers',
    'perl',
    'jam',
    'heidel',
    'vak250',
    'vak500'
];

targetCodes = [
    '01510',
    '01511',
    '01512',
    '02100',
    '02101',
    '02110',
    '13505',
    '02341'
];

startDate = ISODate( "2021-01-01T00:00:00.805Z" );
endDate = ISODate( "2021-03-18T00:00:00.805Z" );

baseQuery = {
    actType: 'TREATMENT',
    timestamp: {$gt: startDate, $lt: endDate},
    status: {$in: ['VALID', 'APPROVED']},
    catalogShort: 'EBM'
};

queryAll = Object.assign( {}, baseQuery, {code: {$in: sourceCodes.concat( targetCodes )}} );
querySource = Object.assign( {}, baseQuery, {code: {$in: sourceCodes}} );

skipped = 0;
canFix = 0;

// some pre checks

db.activities.count( Object.assign( {}, querySource, {fk5012Set: null} ) );
db.activities.count( Object.assign( {}, querySource, {fk5012Set: {$exists: false}} ) );
db.activities.count( Object.assign( {}, querySource, {fk5012Set: []} ) );
db.activities.count( Object.assign( {}, querySource, {fk5012Set: {$nin: [null, []]}} ) );
db.activities.count( Object.assign( {}, querySource, {price: {$ne: 0}} ) );
db.activities.count( queryAll );

db.activities.aggregate( [
    {
        $match: queryAll
    },
    {
        $group: {
            _id: {
                patientId: '$patientId',
                locationId: "$locationId",
                caseFolderId: "$caseFolderId",
                year: {"$year": "$timestamp"},
                month: {"$month": "$timestamp"},
                day: {"$dayOfMonth": "$timestamp"},
            },
            cnt: {
                $sum: 1
            },
            codes: {$push: "$code"},
            treatments: {$push: "$$ROOT"}
        }
    }
], {allowDiskUse: true} ).forEach( function( result ) {
    print( '\n' );
    const targetTreatments = result.treatments.filter( t => targetCodes.includes( t.code ) );
    const sourceTreatments = result.treatments.filter( t => sourceCodes.includes( t.code ) );
    const patient = db.patients.findOne( {_id: ObjectId( result._id.patientId )} );
    print( `CONTEXT: patientId: ${result._id.patientId}` );
    print( `CONTEXT: patientNo: ${patient && patient.patientNo}` );
    print( `CONTEXT: locationId: ${result._id.locationId}` );
    print( `CONTEXT: caseFolderId: ${result._id.caseFolderId}` );
    print( `CONTEXT: day: ${result._id.day}.${result._id.month}.${result._id.year}` );
    if( targetTreatments.length !== 1 ) {
        skipped++;
        print( `\tSKIP: more than one or none target treatment found: ${targetTreatments.length} ` );
        return;
    }
    if( !sourceTreatments.length ) {
        skipped++;
        print( `\tSKIP: no source treatments found ` );
        return;
    }

    if( targetTreatments[0].fk5012Set.length ) {
        skipped++;
        print( `\tSKIP: target treatment already has material costs: ${targetTreatments[0].fk5012Set.length}` );
        return;
    }

    const fk5012Set = sourceTreatments.reduce( ( results, sourceTreatment ) => {
        results.push.apply( results, (sourceTreatment.fk5012Set || []) );
        return results;
    }, [] );

    print( `\tFIX: new material costs: ${JSON.stringify( fk5012Set )}` );
    print( `\tFIX: target treatment: ${targetTreatments.map( t => t._id.str )}` );
    print( `\tFIX: source treatment: ${sourceTreatments.map( t => t._id.str )}` );

    print( `\tFIX: backup:` );
    printjsononeline( db.KAP_243_bk.insertMany( result.treatments ) );

    print( `\tFIX: update:` );
    printjsononeline( db.activities.update( {_id: targetTreatments[0]._id}, {$set: {fk5012Set: fk5012Set}} ) );
    print( `\tFIX: remove:` );
    printjsononeline( db.activities.remove( {_id: {$in: sourceTreatments.map( t => t._id )}} ) );

    canFix++;
} );

print( `skipped: ${skipped}; canFix: ${canFix}` );

