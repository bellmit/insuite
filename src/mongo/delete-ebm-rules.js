/**
 * User: rrrw
 * Date: 22/06/2017  09:26
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global db */
"use strict";

function removeRuleRoot( tenantDb, root ) {
    var removed1, removed2 = 0;
    tenantDb.rules.find( {parent: root} ).forEach( function( rule ) {
        var a = tenantDb.rules.remove( {parent: rule._id.str} );
        removed2 += a.nRemoved;
    } );

    removed1 = tenantDb.rules.remove( {parent: root} ).nRemoved;

    print( tenantDb + '  Removed ' + root + ' rulefolders: ' + removed1 + '\nRemoved rules: ' + removed2 );
}

function removeEBM( tenantDb ) {
    var EBM_ID = "000000000000000000000021";
    removeRuleRoot( tenantDb, EBM_ID );
}

function removeGOAE( tenantDb ) {
    var GOAE_ID = "000000000000000000000011";
    removeRuleRoot( tenantDb, GOAE_ID );
}
function removeGOAESZ( tenantDb ) {
    var GOAE_ID = "000000000000000000000015";
    removeRuleRoot( tenantDb, GOAE_ID );
}

/*removeEBM( db.getSiblingDB( "0" ) );
removeGOAE( db.getSiblingDB( "0" ) );
removeGOAESZ( db.getSiblingDB( "0" ) );*/

db.companies.find({activeState:true}).forEach(function(tenant){
    var mydb = db.getSiblingDB( tenant.tenantId );
    removeEBM( mydb );
    removeGOAE( mydb );
    removeGOAESZ( mydb );
});
