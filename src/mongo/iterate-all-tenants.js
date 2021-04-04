/**
 * User: rrrw
 * Date: 16/06/15  10:53
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
//
// -- iterate through tenants and do something on a VPRC --
//
/*global db:true, printjson*/
"use strict";
var dbs;db = db.getSiblingDB( "admin" );dbs = db.runCommand( {"listDatabases": 1} ).databases;
// Iterate through each database and get its collections.
dbs.forEach( function( database ) {
    var
        rs;
    if(/^([\da-f]){8,15}$|^0$/.exec(database.name)) {
        print( database.name + ' entering.');
        db = db.getSiblingDB( database.name );
        // e.g. iterate through all tenants' settings and switch a setting
        db.settings.update( {"autoLogout": true}, {$set: {"autoLogout": false}} );
        rs = db.settings.find();
        if(rs.hasNext) {
            printjson( rs.next() );
        }
    } else {
        print( database.name + ' not processing.');
    }
} );
dbs.forEach( function( database ) {
    if(/^([\da-f]){8,15}$|^0$/.exec(database.name)) {
        db = db.getSiblingDB( database.name );
        if(30>=db.stats().collections) {
            print( database.name );
        }
    }
} );

