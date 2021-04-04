/*
  * After importing the BRIEFE for the demo, we re-import them from the final conversion.
  *
  * The TEST BRIEFE must be removed from the DB.
 */
/*global db, ObjectId*/
"use strict";
let
    media = db.media.find( {"docType": "EXTERNAL"} ),
    fileList = media.map( i => i._id.str ),
    fsFiles = db.fs.files.find( {filename: {$in: fileList}} );

fsFiles.forEach( ( i ) => {
    db.fs.chunks.remove( {files_id: i._id} );
} );

db.fs.files.remove( {filename: {$in: fileList}} );

db.media.remove( {"docType": "EXTERNAL", origFilename: /BRIEFE/} );

fileList.forEach( ( a ) => {
    db.documents.remove( {caption: /^Imported from/, mediaId: a} );
} );