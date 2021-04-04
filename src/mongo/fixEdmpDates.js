/**
 * User: do
 * Date: 20/09/17  19:40
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global db, print, printjson, ISODate */
"use strict";

var ids = [];

var u;
var safe = false;

var paths = ['timestamp', 'dmpSignatureDate', 'dmpHeadDate'];
var query = {_id: {$in: ids}};
var result;

db.activities.find( query ).toArray().forEach( function( a ) {
    u = {};
    paths.forEach( function( p ) {
        print( ['(checking)', a._id, p, typeof a[p], a[p]].join( ', ' ) );
        if( typeof a[p] === 'string' ) {
            print( ['(fixing)', a._id, p].join( ', ' ) );
            u[p] = ISODate( u[p] );
        }
    } );
    print( 'updating: ' );
    printjson( u );

    if( false === safe && Object.keys( u ).length ) {

        result = db.activities.update( {_id: a._id}, {$set: u} );
        print( 'update results:' );
        printjson( result );

    }
} );