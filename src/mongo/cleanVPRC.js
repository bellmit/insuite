/**
 * User: rrrw
 * Date: 23/03/2017  12:11
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global db:true, print, printjson, ObjectId*/

"use strict";

var t;
var a;

db = db.getSiblingDB( '0' );
t = [];
db.companies.find().forEach( function( i ) {
    if( db.contacts.find( {_id: ObjectId( i.centralContact )} ).hasNext() && !i.deleted ) { /*nop*/
        t.push( i.tenantId );
    }
} );

print('not dropping:');
printjson(t);

db = db.getSiblingDB( 'admin' );
a = db.runCommand( {listDatabases: 1} );
a.databases.forEach( function( i ) {
    if( /^([\da-f]){8,15}$/.exec( i.name ) && t.indexOf( i.name ) === -1 ) {
        print( "dropping  " + i.name );
        db = db.getSiblingDB( i.name );
        db.dropDatabase();
    }
} );

