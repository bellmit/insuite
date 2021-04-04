/* global db:true */
print( '==== KAT-349: recalculate PZN ====' );
db = db.getSiblingDB( "0" );
let count = 0;
const medicationTotal = db.activities.find( { actType: 'MEDICATION' } ).count();
db.activities.find( { actType: 'MEDICATION' } ).forEach( medication => {
    if( medication.phGTIN ) {
        const catalogItem = db.medicationscatalogs.findOne( { phGTIN: medication.phGTIN } );
        if( catalogItem && ( medication.phPZN !== catalogItem.phPZN || medication.code !== catalogItem.phPZN ) ) {
            const backupExists = db.KAT_349_PNZBackup.findOne({ _id: medication._id });
            if (!backupExists) {
                db.KAT_349_PNZBackup.insertOne(medication);
            }
            const phPZN = catalogItem.phPZN;
            const result = db.activities.update( { _id: medication._id }, {
                $set: {
                    phPZN: phPZN,
                    code: phPZN
                }
            } );
            count += result.nModified;
            print('activity ID = ' + medication._id + ' had code - ' + medication.code + ', PZN - ' + medication.phPZN +' changed to ' + phPZN );
        }
    }
} );

print( '==== KAT-349: Extended ' + count + ' medication items (from ' + medicationTotal + ' medication total) with phPZN value ====' );
