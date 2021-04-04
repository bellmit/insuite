/*global db:true, print, ObjectId*/

/**
 * Iterates all documents with activityId.
 * Checks if activity is in the system.
 * If activity is missing, it will remove the document and media retrieved by document.mediaId if present.
 * Furthermore it will delete GridFS files linked to deleted media.
 *
 */

let documentsCounter = 0;
let mediaCounter = 0;
let filesCounter = 0;
let filesChunksCounter = 0;

db.documents.find( {activityId: {$ne: null}} ).forEach( d => {
    let actOID;
    print( `CHECKING ACTIVITY: ${  d.activityId}` );
    try {
        actOID = ObjectId( d.activityId );
    } catch( err ) {
        print( `ERROR: creating oid from id: ${  err}` );
        print( 'skip...' );
        print( '' );
        return;
    }
    if( db.activities.count( {_id: actOID} ) === 0 ) {
        let nRemovedDocument = db.documents.remove( {_id: d._id} ).nRemoved;
        let resultStrDocument = `\tDELETE DOCUMENT: ${  d._id.str}`;

        if( nRemovedDocument ) {
            documentsCounter += 1;
            resultStrDocument += '\tOK';
        } else {
            resultStrDocument += '\tFAILD';
        }

        print( resultStrDocument );

        if( d.mediaId ) {
            let mediaOID = ObjectId( d.mediaId );
            let nRemovedMedia = db.media.remove( {_id: mediaOID} ).nRemoved;
            let resultStrMedia = `\t\tDELETE MEDIA: ${  d.mediaId}`;

            if( nRemovedMedia ) {
                mediaCounter += 1;
                resultStrMedia += '\tOK';
            } else {
                resultStrMedia += '\tFAILD';
            }

            print( resultStrMedia );

            let file = db.fs.files.findOne( {filename: d.mediaId} );
            if( file ) {
                let nRemovedFile = db.fs.files.remove( {_id: file._id} ).nRemoved;
                let resultStrFile = `\t\t\tDELETE FILE: ${  file._id.str}`;

                if( nRemovedFile ) {
                    filesCounter += 1;
                    resultStrFile += '\tOK';
                } else {
                    resultStrFile += '\tFAILD';
                }

                print( resultStrFile );

                let nRemovedFileChunks = db.fs.chunks.remove( {files_id: file._id} ).nRemoved;
                let resultStrFileChunks = `\t\t\t\tDELETE FILE CHUNKS FOR: ${  file._id.str}`;

                if( nRemovedFileChunks ) {
                    filesChunksCounter += nRemovedFileChunks;
                    resultStrFileChunks += `\tOK (${  nRemovedFileChunks  })`;
                } else {
                    resultStrFileChunks += '\tFAILD';
                }

                print( resultStrFileChunks );
            }
        }
    } else {
        print( '\tOK' );
    }
    print( '' );
} );

print( `DELETED: ${ documentsCounter } DOCUMENTS` );
print( `DELETED: ${ mediaCounter } MEDIA` );
print( `DELETED: ${ filesCounter } FILES` );
print( `DELETED: ${ filesChunksCounter } FILE CHUNKS` );