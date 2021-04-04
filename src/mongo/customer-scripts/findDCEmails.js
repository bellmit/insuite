/**
 * User: rrrw
 * Date: 16/05/2017  20:59
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global db:true */
'use strict';

db = db.getSiblingDB( '0' );
db.employees.find( {"communications.value": /@doc-cirrus.com/}, {
    lastname: 1,
    communications: 1,
    username: 1,
    status: 1
} ).forEach( function( i ) {
    print( 'employee: ' +
           i.lastname + '  ' +
           i.communications.map( function( j ) {
               return j.value;
           } ).join( ',' ) + '  ' +
           i.status + (i.username === 'Support' ? '    SUPPORT' : '' ) );
} );

db.locations.find( {"email": /@doc-cirrus.com/}, {
    locname: 1,
    email: 1,
    status: 1
} ).forEach( function( i ) {
    print( 'location: ' +
           i.locname + '  ' +
           i.email  );
} );

db.patients.find( {"communications.value": /@doc-cirrus.com/}, {
    lastname: 1,
    communications: 1
} ).forEach( function( i ) {
    print( 'patient: ' +
           i.lastname + '  ' +
           i.communications.map( function( j ) {
               return j.value;
           } ).join( ',' )
    );
} );
