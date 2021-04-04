/**
 * Utility script for MOJ-6075, intended to determine the extent of duplicated or unlinked attachments on client
 * systems caused by this bug.
 *
 *
 * User: strix
 * Date: 25/05/2016
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*global db:true, ObjectId */
"use strict";

print( '==== DIAGNOSTIC SCRIPT FOR MOJ-6075 ====' );

// For each customer database
db = db.getSiblingDB( "0" );
//db.runCommand( {"listDatabases": 1} ).databases.forEach( function( database ) {

    /*
    if( !(/^([\da-f]){8,15}$|^0$/.exec(database.name)) ) {
        print( 'Skipping database: ' + database.name );
        return;
    }
    */

//    db = db.getSiblingDB( database.name );

    var database = db;

    print( '\n\n==== Checking database: ' + database.name + ' for duplicated attachments ====' );

    var result;

    //  Find all attached documents which appear more than once

    result = db.activities.aggregate(  [
        {
            "$project": {
                "_id": 1,
                "attachments": 1,
                "lengthAttachments": {
                    "$size": { "$ifNull": [ "$attachments", [] ] }
                }
            }
        },
        {
            "$match": {
                "lengthAttachments": { "$gt": 0 }
            }
        },
        {
            "$unwind": "$attachments"
        },
        {
            "$group": {
                "_id": {
                    "docId": "$attachments"
                },
                "numReferences": {
                    "$sum": 1
                }
            }
        },
        {
            "$match": {
                "numReferences": { "$gt": 1 }
            }
        }
    ] );


    if ( 0 === result.length ) {
        print( 'No duplicated attachments found in ' + database.name );
    }

    //  check forward and backward references to duplicated attachment

    result.forEach( function( aggregationRow ) {
        if ( '['  === aggregationRow._id.docId || ']' === aggregationRow._id.docId ) {
            print( 'Ignoring invalid activity attachment _id: ' + aggregationRow._id.docId + ' (migration artifact?)' );
        } else {
            print( 'Document ' + aggregationRow._id.docId + ' has multiple references to it: ' + aggregationRow.numReferences );
            checkDocument(  aggregationRow._id.docId );
        }
        print( "\n" );
    } );

    function checkDocument( docId ) {

        print( 'Checking activites which reference document: '  + docId );

        var
            //  load the document and activities which refer to it
            activities = db.activities.find( { 'attachments': { $elemMatch: { $eq: docId } } } ),
            doc = db.documents.find( { '_id': new ObjectId( docId ) } ),
            i;

        doc = doc[0] ? doc[0] : doc;

        if ( !doc ) {
            print( ' (!) Referenced duplicate attachment ' + docId + ' not found in documents collection.' );
        }

        if ( doc && doc.activityId ) {
            print( ' (i) Document ' + docId + ' is owned by ' + doc.activityId );
        } else {
            print( ' (!) Could not look up owner of document ' + docId );
        }

        if ( 1 === activities.length() ) {
            print( ' (*) Document ' + docId + ' is referenced multiple times by a single activity: ' + activities[0]._id );

            if ( doc && doc.activityId && doc.activityId + '' === activities[0]._id + '' ) {
                print( ' (>) Fix will be to deduplicate activity attachments array' );
            }

            return;
        }

        for ( i = 0; i < activities.length(); i++ ) {
            print( ' (-) Activity ' + i + ': ' + activities[i]._id + ' attachments: ' + JSON.stringify( activities[i].attachments ) );
        }

        if ( doc && doc.activityId ) {

            for ( i = 0; i < activities.length(); i++ ) {

                if ( activities[i]._id + '' === doc.activityId ) {
                    print( ' (i) Activity ' + activities[i]._id + ' (' + i + ') is the correct owner, will not be modified.' );
                } else {
                    print( ' (>) Document ' + docId + ' to be unlinked from activity ' + activities[i]._id  + ' (' + i + ')');

                    checkMediaOnRemoval( activities[i], doc, i );

                    activities[i].attachments = removeFromArray( docId, activities[i].attachments );
                    print( ' (i) New attachments for activity ' + activities[i]._id + ' (' + i + '): ' + JSON.stringify( activities[i].attachments ) );
                    //  look for any oprhaned documents belonging to this activity
                    findOprhans( activities[i], i );
                }

            }

        } else {
            print( ' (!) Cannot check backward reference due to missing document or _id' );
        }

    }

    function checkMediaOnRemoval( activity, doc, idx ) {
        if ( activity.formPdf && doc.mediaId && activity.formPdf + '' === doc.mediaId + '' ) {
            print( ' (>) Media ' + doc.mediaId + ' owned by document ' + doc._id + ' will be removed as latest PDF of activity ' + activity._id + ' (' + idx + ')' );
            activity.formPdf = '';
        }

        var i, amo;

        if ( activity.attachedMedia && doc.mediaId ) {
            for ( i = 0; i < activity.attachedMedia.length; i++ ) {
                amo = activity.attachedMedia[i];

                if ( amo.mediaId && doc.mediaId + '' === amo.mediaId ) {
                    print( ' (>) Fix will remove attachedMedia reference ' + JSON.stringify( amo ) );
                }
            }
        }
    }

    function findOprhans( activity, idx ) {
        print( ' (i) Checking for oprhaned documents belonging to activity ' + activity._id + ' (' + idx + ')' );

        var
            foundDocs = db.documents.find( { 'activityId': activity._id + '' } ),
            i;

        print( ' (i) Found ' + foundDocs.length() + ' documents owned by ' + activity._id + ' (' + idx + ')');

        for ( i = 0; i < foundDocs.length(); i++ ) {
            if ( -1 === activity.attachments.indexOf( foundDocs[i]._id + '' ) ) {
                print( ' (i) Document ' + foundDocs[i]._id + ' owned by activity ' + activity._id + ' (' + idx + ') is not linked from attachments' );
                print( ' (i) Document is a ' + foundDocs[i].type + ' ' + foundDocs[i].contentType );
                print( ' (>) Fix will add attachment ' + foundDocs[i]._id + ' to activity ' + activity._id + ' (' + idx + ')' );

                if ( foundDocs[i].mediaId && foundDocs[i].contentType ) {
                    print( ' (>) Fix will add attachedMedia ' + foundDocs[i].mediaId + ' ' + foundDocs[i].contentType );
                }

                if ( !activity.formPdf || '' === activity.formPdf ) {
                    if ( foundDocs[i].type && 'FORMPDF' === foundDocs[i].type && foundDocs[i].mediaId ) {
                        print( ' (>) Fix set latestPdf to media to ' + foundDocs[i].mediaId + ' for activity ' + activity._id + ' (' + idx + ')');
                    }
                }

            }
        }

    }

//} );

function removeFromArray( item, ary ) {
    var i, newAry = [];
    for ( i = 0; i < ary.length; i++ ) {
        if ( item + '' !== ary[i] + '' ) {
            newAry.push( ary[i] );
        }
    }
    return newAry;
}