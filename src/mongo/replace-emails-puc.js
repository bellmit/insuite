/**
 * User: bhagyashributada
 * Date: 5/3/18  4:57 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global db:true, print*/

"use strict";

db = db.getSiblingDB( '0' );

//const userName = 'firstname.lastname';

db.getCollection( 'identities' ).find( {'username': {"$nin": ["", null]}} ).forEach( doc => {
    db.getCollection( 'identities' ).update( {
        _id: doc._id,
        'username': {"$nin": ["", null]}
    }, {$set: {'username': `${userName}${Math.random() * 100000}@doc-cirrus.com`}}, {multi: true} ); //eslint-disable-line
} );

db.getCollection( 'patientregs' ).find( {'email': {"$nin": ["", null]}} ).forEach( doc => {
    db.getCollection( 'patientregs' ).update( {
        _id: doc._id,
        'email': {"$nin": ["", null]}
    }, {$set: {'email': `${userName}${Math.random() * 100000}@doc-cirrus.com`}}, {multi: true} ); //eslint-disable-line
} );



