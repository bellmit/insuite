/* global db, ObjectId */
function checkAllDocumentsExist( act ) {
    const DO_REAL_UPDATE = false;
    if ( !act.attachments ) { return; }
    /* */
    let docId, docCount, checked = [];
    for ( docId of act.attachments ) {
        docCount = db.documents.count( { _id: ObjectId( docId ) } );
        if ( 1 === docCount ) {
            checked.push( docId );
        } else {
            print( `[!] Missing document _id ${docId} linked from activity ${act._id.valueOf()}` );
        }
    }
    if ( checked.length !== act.attachments.length ) {
        if ( DO_REAL_UPDATE ) {
            print( `[i] Replacing attachments ${JSON.stringify(act.attachments)} with cleaned array: ${JSON.stringify(checked)}` );
            db.activities.update( { _id: act._id }, { $set: { attachments: checked } } );
        } else {
            print( `[i] Will replace attachments ${JSON.stringify(act.attachments)} with cleaned array: ${JSON.stringify(checked)}` );
        }
    }
}

db.activities.find().forEach( checkAllDocumentsExist );