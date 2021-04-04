/**
 * User: bhagyashributada
 * Date: 5/3/18  3:48 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global db:true, print*/



db = db.getSiblingDB( 'admin' );

//const userName = 'firstname.lastname@doc-cirrus.com';
let res,
    collectionArr = ['employees', 'locations', 'patients', 'basecontacts', 'schedules', 'tasks', 'companies'],
    dbList = db.runCommand( {listDatabases: 1} );

dbList.databases.forEach( function( i ) {

    db = db.getSiblingDB( i.name );

    collectionArr.forEach( collection => {
        switch( collection ) {
            case 'employees':
            case 'patients':
            case 'basecontacts':
                res = db.getCollection( collection ).update( {'communications.type': {$in: ['EMAILJOB', 'EMAILPRIV']}}, {$set: {'communications.$.value': `${userName}@doc-cirrus.com`}}, {multi: true} ); //eslint-disable-line
                print( `db: ${i.name}, ${collection}: ${res}` );
                break;
            case 'companies':
                if( i.name === '0' ) {
                    res = db.getCollection( collection ).update( {'communications.type': {$in: ['EMAILJOB', 'EMAILPRIV']}}, {$set: {'communications.$.value': `${userName}@doc-cirrus.com`}}, {multi: true} ); //eslint-disable-line
                    print( `db: ${i.name}, ${collection}: ${res}` );
                }
                break;
            case 'locations':
                res = db.getCollection( 'locations' ).update( {'email': {"$nin": ["", null]}}, {$set: {'email': `${userName}@doc-cirrus.com`}}, {multi: true} ); //eslint-disable-line
                print( `db: ${i.name}, ${collection}: ${res}` );
                break;
        }
    } );

} );