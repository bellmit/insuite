/**
 * User: dcdev
 * Date: 12/8/20  1:16 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/* global db:true */
print( '==== START remove invoiceLog errors for valid/sent/approved/removed tarmedlogs KAT-289 ====' );
db = db.getSiblingDB( "0" );
let count = 0;
const invoiceLogIds = db.invoiceentries.aggregate( [
    {
        $match: {
            $or: [
                {"source": "sumex"},
                {"data.source": "SUMEX"}
            ]
        }
    },
    {$project: {invoiceLogId: '$invoiceLogId'}},
    {$group: {_id: '$invoiceLogId'}}
] ).toArray().map( i => ObjectId( i._id ) );

const existingInvalidTarmedlogs = db.tarmedlogs.find( {
    _id: {$in: invoiceLogIds},
    status: {
        $nin: ['VALID', 'SENT', 'INVOICED_APPROVED']
    }
}, {_id: 1} ).toArray().map( i => i._id.str );

let removedOrValidTarmedlogIds;
if( existingInvalidTarmedlogs.length ) {
    removedOrValidTarmedlogIds = invoiceLogIds.filter( i => !existingInvalidTarmedlogs.includes( i.str ) );
} else {
    removedOrValidTarmedlogIds = invoiceLogIds;
}

const invoiceErrors = db.invoiceentries.find({
    type: 'ERROR',
    invoiceLogId: {
        $in: removedOrValidTarmedlogIds.map(id => id.str )
    }
} );

while( invoiceErrors.hasNext() ) {
    try {
        const invoiceError = invoiceErrors.next(),
            invoiceErrorId = invoiceError._id.str,
            caseFolder = db.casefolders.find( {
                sumexErrors: {$elemMatch: {$eq: invoiceErrorId}}
            }, {_id: 1, sumexErrors: 1} ).toArray()[0];

        if( caseFolder ) {
            const index = caseFolder.sumexErrors.indexOf( invoiceErrorId );

            caseFolder.sumexErrors.splice( index, 1 );
            db.casefolders.update( {
                _id: caseFolder._id
            }, {
                $set: {
                    sumexErrors: caseFolder.sumexErrors
                }
            } );
            print('removed error ' + invoiceErrorId + ' from sumexErrors array in caseFolder ' + caseFolder._id.str );
        }
        const nRemoved = db.invoiceentries.remove( {
            _id: invoiceError._id
        } ).nRemoved;
        count+= nRemoved;
    } catch( e ) {
        print('error occured' + e);
        continue;
    }
}

print( '\n==== FINISHED removing ' + count + ' invoiceLog errors for valid/sent/approved/removed tarmedlogs KAT-289 ====' );