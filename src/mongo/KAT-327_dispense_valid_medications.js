/**
 * User: dcdev
 * Date: 12/22/20  9:25 AM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/* global db:true */
print( '==== KAT-327 - Dispense VALID medications which are not in rezept or medplan ====' );
db = db.getSiblingDB( "0" );

print( '---- Step 1: Fix GTIN for medications' );
const pznsWithoutGtin = db.activities.aggregate( [
    {
        $match: {
            actType: 'MEDICATION',
            $or: [{phGTIN: ''}, {phGTIN: {$exists: false}}, {phGTIN: null}]
        }
    },
    {
        $project: {
            _id: 1,
            phPZN: 1
        }
    },
    {
        $group: {_id: '$phPZN', ids: {$addToSet: "$_id"}}
    }
] ).toArray();

let notInMedIndexCatalog = [],
    backupCount = 0,
    updateCount = 0;

pznsWithoutGtin.forEach( medications => {
    const pzn = medications._id,
        ids = medications.ids;

    if( !pzn ) {
        print( `no pzn ${JSON.stringify( medications )}` );
        notInMedIndexCatalog = notInMedIndexCatalog.concat( ids );
        return;
    }

    const medIndexItem = db.medicationscatalogs.findOne( {phPZN: pzn}, {phGTIN: 1} );

    if( medIndexItem && medIndexItem.phGTIN ) {
        const medicationsToBackup = db.activities.find( {
            _id: {$in: ids}
        } );
        medicationsToBackup.forEach( itemToBackup => {
            const backupResult = db.KAT_327_gtin_backup.insertOne( itemToBackup );
            if( backupResult.insertedId ) {
                backupCount++;
            }
        } );
        const gtinResult = db.activities.update( {_id: {$in: ids}}, {$set: {phGTIN: medIndexItem.phGTIN}}, {multi: true} );
        print( 'Updated ' + gtinResult.nModified + ' medication(s) with GTIN: ' + medIndexItem.phGTIN );
        updateCount += gtinResult.nModified;
    } else {
        print( 'phPZN ' + pzn + ' not found in MedIndex catalog. Ignoring ' + ids.length + ' medication(s)' );
        notInMedIndexCatalog = notInMedIndexCatalog.concat( ids );
    }
} );
print( '---- Step 1 Made backup into KAT_327_gtin_backup collection for ' + backupCount + ' medication(s)' );
print( '---- Step 1 FINISHED fixing GTIN for ' + updateCount + ' medication(s)' );

print( '---- Step 2: Update medications status to DISPENSED' );

backupCount = 0;
updateCount = 0;
const query = {
    actType: 'MEDICATION',
    $or: [
        {
            status: 'VALID',
            isPrescribed: false,
            referencedBy: []
        },
        {orderId: {$ne: null}}
    ],
    _id: {
        $nin: notInMedIndexCatalog
    }
};

const data = {
    $set: {
        status: 'DISPENSED',
        isDispensed: true,
        isPrescribed: false,
        referencedBy: [],
        orderId: null
    }
};

const statusBackupMeds = db.activities.find( query );
statusBackupMeds.forEach( itemToBackup => {
    const res = db.KAT_327_status_backup.insertOne( itemToBackup );
    if( res.insertedId ) {
        backupCount++;
    }
} );

const statusResult = db.activities.update( query, data, {multi: true} );
updateCount = statusResult.nModified;

print( '---- Step 2 Made backup into KAT_327_status_backup collection for ' + backupCount + ' medication(s)' );
print( '---- Step 2 FINISHED updating status for ' + updateCount + ' medication(s)' );
print( '==== FINISHED ====' );
