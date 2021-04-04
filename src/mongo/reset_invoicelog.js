/*global ObjectId, print */
"use strict";

/*-----------*/
/*IDs of the kbvlog or pvslog to reset, multiple allowed*/
var INVOICELOG_IDs = {$in: [
    ObjectId("5a71932de2d582cc8e99a77c")
]};
var INVOICELOG_ID_STRs = { $in: INVOICELOG_IDs.$in.reduce( (res, i) => { res.push(i.str); return res;}, [] ) };
/*name of the invoicelog collection: kbvlogs or pvslogs*/
var INVOICELOG_COLLECTION = 'pvslogs';
/*new status of contained activities*/
var RESET_TO_STATUS = 'APPROVED';
/*-----------*/
var db = db.getSiblingDB( '0' );
var actIds = [];
function collectId( activity ) {
    actIds.push( new ObjectId( activity._id ) );
}
function collectIds( invoiceEntry ) {
    collectId( invoiceEntry.data );
    invoiceEntry.data.diagnoses.forEach( collectId );
    invoiceEntry.data.continuousDiagnoses.forEach( collectId );
    invoiceEntry.data.treatments.forEach( collectId );
}
var invoiceEntries = db.invoiceentries.find( {invoiceLogId: INVOICELOG_ID_STRs, type: 'schein'} );
while( invoiceEntries.hasNext() ) {
    collectIds( invoiceEntries.next() );
}
print( 'COLLECTED ACTIVITY IDS (' + actIds.length + '):' );
actIds.forEach( function( id ) {
    print( id );
} );
db.activities.distinct("status",{_id: {$in: actIds}}); /* result of this check should be only [ "APPROVED", "BILLED" ]*/
print( 'UPDATING ACTIVITIES' );
var result = db.activities.update( {_id: {$in: actIds}}, {$set: {status: RESET_TO_STATUS}}, {multi: true} );
print( 'UPDATED ACTIVITIES:' );
print( result );
print( 'UPDATING INVOICELOG' );
var result2 = db[INVOICELOG_COLLECTION].update( {_id: INVOICELOG_IDs }, {$set: {status: 'CREATED'}}, {multi:true} );
print( 'UPDATED INVOICELOG' );
print( result2 );

