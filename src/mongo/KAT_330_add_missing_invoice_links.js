/**
 * User: dcdev
 * Date: 1/22/21  3:48 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
db = db.getSiblingDB( "0" );
print( '==== KAT-330: Add missing activities links to invoice ====' );

let count = 0;
const invoiceQuery = {
    actType: 'INVOICEREF',
    status: {
        $in: ['BILLED', 'APPROVED']
    },
    patImportId: {$exists: false},
    timestamp: {
        $gte: ISODate("2020-06-01T00:00:00.539Z")
    }
};

db.activities.find( invoiceQuery ).forEach( invoice => {
    if( !invoice || !invoice.invoiceLogId ) {
        return;
    }
    const invoiceentry = db.invoiceentries.findOne( {
        type: 'schein',
        invoiceLogId: invoice.invoiceLogId,
        activityId: invoice._id.str
    } );
    if(!invoiceentry || !invoiceentry.data) {
        return;
    }

    const activities = invoiceentry.data.medications.map(m => m._id.str ? m._id.str : m._id)
            .concat(invoiceentry.data.treatments.map(t => t._id.str ? t._id.str : t._id)),
        missingActivities = activities.filter(a => !invoice.activities.includes(a));

    if( missingActivities && missingActivities.length ) {
        print('-- Invoice ' + invoice._id.toString() + ' is missing ' + missingActivities.length + ' linked activities. Ids: ' + missingActivities );
        invoice.activities = invoice.activities.concat( missingActivities );
        db.KAT_330_missing_invoice_links.insertOne( invoice );
        const result = db.activities.update( {_id: invoice._id }, {$set: {activities: invoice.activities}} );
        count+= result.nModified;
    }
});
print( '==== KAT-330: Added missing activities links to ' + count + ' invoices ====' );