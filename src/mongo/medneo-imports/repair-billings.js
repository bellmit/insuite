// From MOJ-8891

/*global db: true, ObjectId */
"use strict";

var dbs, kbv, pvs, bg;
kbv = 0; pvs = 0; bg = 0;

function updateBillingInfo( item ) {
    var res;
    // change from date of system upgrade
    res = db.activities.update( {_id: {$gt: ObjectId( "58d72f10f45bea27ab6e80ad" )}, actType:{$in:["TREATMENT","INVOICE"]}},
        {
            $set: {
                orderAccounting: item.orderAccounting,
                debtCollection: item.debtCollection,
                scheinDiagnosis: item.scheinDiagnosis,
                scheinOrder: item.scheinOrder
            }
        } );
    if( 0 < res.nModified ) {
        if( item.actType  === 'PKVSCHEIN' ) {
            pvs+=res.nModified ;
        } else if( item.actType  === 'SCHEIN' ) {
            kbv+=res.nModified ;
        } else {
            bg+=res.nModified ;
        }
    }
}


db = db.getSiblingDB( "admin" );
dbs = db.runCommand( {"listDatabases": 1} ).databases;
dbs.forEach( function( database ) {

    if( /^([\da-f]){8,15}$|^0$/.exec( database.name ) ) {
        db = db.getSiblingDB( database.name );

        db.activities.find({actType:{$in:["PKVSCHEIN","BGSCHEIN","SCHEIN"]}}).forEach( updateBillingInfo );

    }
});




