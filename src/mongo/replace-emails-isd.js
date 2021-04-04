/**
 * User: bhagyashributada
 * Date: 5/3/18  5:25 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global db:true, print*/

"use strict";

db = db.getSiblingDB( '0' );

//const userName = 'firstname.lastname';

let res = db.getCollection( 'employees' ).update( {'communications.type': {$in: ['EMAILJOB', 'EMAILPRIV']}}, {$set: {'communications.$.value': userName + '@doc-cirrus.com'}}, {multi: true} ); //eslint-disable-line
print( `employees: ${res}` );