/*global db: true, ObjectId */
"use strict";

function updateSchein( item ) {
    var res;
    if( !item.dcTenantID ) {
        return;
    }
    if( db.getName() !== item.dcTenantID ) {
        db = db.getSiblingDB( item.dcTenantID );
    }
    res = db.activities.update( {_id:ObjectId(item.dcContractID)}, {$set:{orderAccounting:item.orderAccounting, debtCollection:item.orderIncasso, scheinDiagnosis:item.order_diagnosis, scheinOrder:item.order_problem}} );
    if( 1 !== res.nModified ) {
        print("error: " + item.dcTenantID + "," + item.dcContractID);
    }
}


// eslint-laxcomma
var a = [
    /*
    * install: npm install --global csv2json
    * run:  csv2json --separator ";" medneo_orderAccoutning_Dec16.csv >> orderAcc2016.js  (this file)
    * edit: orderAcc2016.js, so that var a = the array that has been created.
    * test: make a version of the file with 1 line - test it in place at medneo
    * check: check the test worked as expected
    * run: mongo orderAcc2016.js > orderAcc2016-1216.log
    * done.
    */
];


a.sort( function( a, b ) {
    if( a.dcTenantID < b.dcTenantID ) {
        return -1;
    }
    if( a.dcTenantID > b.dcTenantID ) {
        return 1;
    }
    return 0;
} ).forEach( updateSchein );

