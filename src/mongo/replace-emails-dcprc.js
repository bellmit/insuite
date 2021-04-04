/**
 * User: bhagyashributada
 * Date: 5/3/18  4:35 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global db:true, print*/

"use strict";

db = db.getSiblingDB( '0' );

/*const userName = 'firstname.lastname';*/
let collectionArr = ['companies', 'contacts', 'basecontacts'];

collectionArr.forEach( collection => {
    db.getCollection( collection ).find( {'communications.type': {$in: ['EMAILJOB', 'EMAILPRIV']}} ).forEach( doc => {
        db.getCollection( collection ).update( {
            _id: doc._id,
            'communications.type': {$in: ['EMAILJOB', 'EMAILPRIV']}
        }, {$set: {'communications.$.value': `${userName}${Math.random() * 100000}@doc-cirrus.com`}}, {multi: true} ); //eslint-disable-line
    } );
} );

