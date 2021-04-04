/* fix for AOK activities which refer to a casefolder but it does not exist, move them to GKV casefolder */
/* global db, ObjectId */

function checkCaseFolder( act ) {
    if ( !act.caseFolderId || '' === act.caseFolderId || !act.patientId ) { return; }
    let
        intro = `${act._id.valueOf()} ${act.actType} ${act.status}`,
        allCaseFolders,
        caseFolderObj;
    /* */
    /* check if the casefolder exists */
    /* */
    try {
        caseFolderObj = db.casefolders.findOne( { _id: ObjectId( act.caseFolderId ) } );
    } catch ( err ) {
        print( `[!] ${intro} has an invalid caseFolderId` );
    }
    /* */
    if ( caseFolderObj ) { return; }
    /* */
    /* get all casefolders for this patient */
    /* */
    print( `[!] ${intro} belongs to a missing casefolder: ${act.caseFolderId}` );
    allCaseFolders = db.casefolders.find( { patientId: act.patientId } );
    if ( 0 === allCaseFolders.length() ) {
        print( `[!] ${intro} belongs to a patient with no casefolders: ${act.patientId}` );
        return;
    }
    act.caseFolderId = allCaseFolders[0]._id.valueOf();
    print( `[_] ${intro} this patient has ${allCaseFolders.length()} casefolders` );
    let i;
    for ( i = 0; i < allCaseFolders.length(); i++ ) {
        caseFolderObj = allCaseFolders[i];
        print( `[_] checking caseFolder: ${caseFolderObj._id.valueOf()}`  );
        if ( 'PUBLIC' === caseFolderObj.type ) {
            act.caseFolderId = caseFolderObj._id.valueOf();
            print( `[i] ${intro} found PUBLIC casefolder for patient ${act.patientId}: ${act.caseFolderId}` );
        }
    }
    print( `[x] ${intro} setting casefolder for activity: ${act.caseFolderId}` );
    db.activities.update( { _id:act._id }, { $set: { caseFolderId: act.caseFolderId } } );
}

db.activities.find().forEach( checkCaseFolder );