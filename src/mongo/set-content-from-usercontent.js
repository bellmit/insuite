/**
 * Emergency hotfix for Kalthoff to set content field when missing but userContent is present
 *
 * To undo: grep log for '(undo)'
 *
 * User: strix
 * Date: 25/01/2017
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*global db:true */
"use strict";

print( '==== Kalthoff hotfix - fix usercontent for PadX generation ====' );

//db = db.getSiblingDB( "1111111111" );
db = db.getSiblingDB( "0" );
setContentFromUserContent( db );

// For each customer database
//db.runCommand( { "listDatabases": 1 } ).databases.forEach( addActTypeToReportings );

//  For all treatments after January 1st
//  -> load casefolder
//  -> if (PRIVATE casefolder) then
//    -> look up private schein
//    -> if 'BILLED" set to 'VALID'

function setContentFromUserContent( db ) {
    var
        actCursor,
        currentAct,
        fixCount = 0,
        totalCount = 0,
        newContent,
        forReal = false;

    actCursor = db.activities.find( { 'content': { $exists: false }, 'userContent': { $exists: true } } );

    while ( actCursor.hasNext() ) {
        currentAct = actCursor.next();
        totalCount = totalCount + 1;
        print( '(i) Missing content on ' + currentAct._id + ' ' + currentAct.actType + ' ' + currentAct.status );

        newContent = currentAct.userContent;
        if ( !newContent || '' === newContent ) {
            if ( currentAct.code ) { newContent = currentAct.code; }
        }

        if ( forReal && newContent ) {
            print( '(i) Updating, setting content to: ' + newContent );
            print( '(undo) db.activities.update( { _id: ObjectId("' + currentAct._id + '") }, { $unset: { "content": 1 } } )' );
            //db.activities.update( { '_id': currentAct._id }, { $set: { 'content': newContent } } );
            fixCount = fixCount + 1;
        } else {
            print( '(i) Not updating, test mode only, newContent is: ' + newContent );
        }

    }

    print( '\n\n==== COMPLETED: Checking database: ' + db.name + ' for activity content, corrected ' + fixCount + ' of '  + totalCount + ' ====' );
}