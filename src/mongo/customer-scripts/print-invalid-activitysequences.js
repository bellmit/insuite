/**
 * User: pi
 * Date: 24/09/15  11:10
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
//
// iterates through activitysequences and prints id of invalid activitysequence
//
/*global db:true */
"use strict";

// make sure we are in local tenant
db = db.getSiblingDB( "0" );

var ac = db.activitysequences.find();
// Iterate through each company and do...
ac.forEach( function iterateActivitySequences( item ) {
    var
        depIds = [],
        activityIds = [],
        invalid;

    function addToDep( id ) {
        if( -1 === depIds.indexOf( id ) ) {
            depIds.push( id );
        }
    }

    if( item.activities && item.activities.length ) {
        item.activities.forEach( function( activity ) {
            activityIds.push( activity._id.valueOf() );
            activity.icds.forEach( addToDep );
            activity.icdsExtra.forEach( addToDep );
            activity.activities.forEach( addToDep );
        } );
        invalid = depIds.some( function( idToCheck ) {
            return -1 === activityIds.indexOf( idToCheck );
        } );
        if( invalid ) {
            print( "Activity sequence is invalid, id: " + item._id.valueOf() );
        }
    } else {
        print( "Activity sequence does not have activities, id: " + item._id.valueOf() );
    }
} );

