/**
 * User: bhagyashributada
 * Date: 5/3/18  10:40 AM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global db:true, print*/

"use strict";

db = db.getSiblingDB( '0' );

//const userName = 'firstname.lastname@doc-cirrus.com';
let res, collectionArr = ['employees', 'locations', 'patients', 'basecontacts', 'schedules', 'tasks'];

collectionArr.forEach( collection => {
    switch( collection ) {
        case 'employees':
        case 'patients':
        case 'basecontacts':
            res = db.getCollection( collection ).update( {'communications.type': {$in: ['EMAILJOB', 'EMAILPRIV']}}, {$set: {'communications.$.value': userName + '@doc-cirrus.com'}}, {multi: true} ); //eslint-disable-line
            print( `${collection}: ${res}` );
            break;
        case 'locations':
            res = db.getCollection( 'locations' ).update( {'email': {"$nin": ["", null]}}, {$set: {'email': userName + '@doc-cirrus.com'}}, {multi: true} ); //eslint-disable-line
            print( `${collection}: ${res}` );
            break;
        case 'schedules':
        case 'tasks':
            res = db.getCollection( collection ).update( {'patientAlertExt.email': {$exists: true}}, {$set: {'patientAlertExt.email': userName + '@doc-cirrus.com'}}, {multi: true} ); //eslint-disable-line
            print( `${collection}: ${res}` );
            break;
    }
} );
