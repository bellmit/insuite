/**
 * User: dcdev
 * Date: 12/9/20  5:03 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/* global db:true */
print( '==== START fix for cancelled tarmedlog with rejected invoiceRefs ====' );
db = db.getSiblingDB( "0" );
let invoiceCount = 0, linkedCount = 0;
const invoiceentries = db.invoiceentries.find( {
    type: 'schein',
    invoiceLogId: "5fc8f7ee09bd2f433beca0b4"
} );

while( invoiceentries.hasNext() ) {
    const invoiceentry = invoiceentries.next();
    const invoiceData = invoiceentry.data || {},
        invoiceRefId = invoiceData.invoiceRefId,
        invoiceStatus = invoiceData.invoiceStatus,
        activityIds = invoiceData.activities || [],
        diagnosisIds = (invoiceData.icds || []).concat( invoiceData.continuousIcds || [] ),
        linkedActivitiesIds = activityIds.concat( diagnosisIds ).map( id => ObjectId( id ) );

    let result;

    result = db.activities.update( {
        _id: ObjectId( invoiceRefId )
    }, {
        $set: {
            status: invoiceStatus,
            medidataRejected: true
        },
        $unset: {
            invoiceLogId: 1,
            invoiceLogType: 1
        }
    } );

    if( result && result.nModified > 0 ) {
        print( 'Updated invoiceRef ' + invoiceRefId + ' to status ' + invoiceStatus );
        invoiceCount += result.nModified;
    } else {
        print( 'Failed to update invoiceRef ' + invoiceRefId + ' to status ' + invoiceStatus );
    }

    result = db.activities.update( {
        _id: {
            $in: linkedActivitiesIds
        }
    }, {
        $set: {
            status: "VALID"
        }
    }, {
        multi: true
    } );

    if( result && result.nModified > 0 ) {
        print( 'Updated ' + result.nModified + ' linked activities from invoiceRef ' + invoiceRefId + ' to status VALID' );
        linkedCount += result.nModified;
    } else {
        print( 'Failed to update linked activities from invoiceRef ' + invoiceRefId + ' to status VALID' );
    }
}
print( 'Updated ' + invoiceCount + ' invoiceRefs' );
print( 'Updated ' + linkedCount + ' linked activities' );

print( '==== FINISHED fix for cancelled tarmedlog with rejected invoiceRefs ====' );