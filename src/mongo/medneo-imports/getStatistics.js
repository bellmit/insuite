/**
 * User: rrrw
 * Date: 04/11/2016  8:44 AM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global db:true, print, ObjectId, ISODate */
"use strict";

var dbs/*, t=0*/; db = db.getSiblingDB( "admin" ); dbs = db.runCommand( {"listDatabases": 1} ).databases;
dbs.forEach( function( database ) {
    var
        rs;
    if( /^([\da-f]){8,15}$/.exec( database.name ) ) {
        db = db.getSiblingDB( database.name );
        rs = db.syncfolders.count();
        if( 0 < rs ) {
            print( database.name + " " + rs );
        }
    } else {
        print( database.name + ' not processing.' );
    }
} );
/*
        rs = db.activities.aggregate( [{$match: {timestamp: {$gt: ISODate( "2016-09-30T22:00:00Z" ), $lte: ISODate( "2016-10-31T23:00:00Z" )}}}, {$group: {"_id": { cf: "$caseFolderId", type: "$catalogShort"}, total: {$sum:1}}}] );
        rs = db.billings.aggregate( [{$match: {timestamp: {$gt: ISODate( "2016-09-30T22:00:00Z" ), $lte: ISODate( "2016-10-31T23:00:00Z" )}}}, {$group: {"_id": "orderAccounting", total: {$sum:1}}}] );
        rs.forEach( function( item ) {
            if( item.total > 1 ) {
                localP += 1;
            }
        });
        print( database.name + " " + localP );
        t+=localP;
    } else {
        print( database.name + ' not processing.' );
    }
} );
*/

dbs.forEach( function( database ) {
    var
        res;
    if( /^([\da-f]){8,15}$/.exec( database.name ) ) {
        db = db.getSiblingDB( database.name );
        res = db.activities.update( {treatmentType: {$exists: true, $eq: null}}, {$unset:{treatmentType:1}}, {multi:true} );
        if( 0 === res.nModified ) {
            print( "nothing: " + database.name );
        } else {
            print( "modified: " + res.nModified );
        }

    } else {
        print( database.name + ' not processing.' );
    }
} );

dbs.forEach( function( database ) {
    if( /^([\da-f]){8,15}$/.exec( database.name ) ) {
        db = db.getSiblingDB( database.name );
        db.activities.aggregate([{$match:{timestamp:{$gte:ISODate("2016-10-30T23:00:00.000Z")}}},{$group:{_id:"$caseFolderId"}}]).forEach(function(i){ db.billings.insert({_id: ObjectId(i._id)} );});
    }
} );
