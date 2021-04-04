/* Script to create inBox casefolders for activities which need one */
/*global db print ObjectId */

function checkCaseFolder( act ) {
    let cf;
    /* check for casefolder */
    if ( act.caseFolderId ) {
        cf = db.casefolders.findOne( { _id: ObjectId( act.caseFolderId ) } );
    }
    if ( cf ) { return; }
    print( `[i] activity ${act._id.valueOf()} is missing caseFolder: ${act.caseFolderId}` );
    /* check for inbox casefolder */
    let inbox = db.casefolders.findOne({patientId: act.patientId}, {additionalType: 'ERROR'});
    let pat = db.patients.findOne({_id:ObjectId(act.patientId)});
    if ( !inbox) {
        print( `[i] patient ${pat.patientNo} is missing inbox casefolder.` );
        let newCF = {
            patientId: act.patientId,
            additionalType: 'ERROR',
            start: new Date(),
            title: 'inBox'
        };
        print( `[>] creating new caseFolder: ${JSON.stringify(newCF)}` );
        db.casefolders.insertOne( newCF );
        inbox = db.casefolders.findOne({patientId: act.patientId}, {additionalType: 'ERROR'});
    } else {
        print( `[i] patient ${act.patientId} has inBox casefolder: ${JSON.stringify(inbox)}` );
    }
    if ( inbox ) {
        print( `[>] adding activity ${act._id.valueOf()} to casefolder ${inbox._id.valueOf()}` );
        db.activities.update({_id:act._id}, {$set:{caseFolderId: inbox._id.valueOf()}});
    }
}

db.activities.find({}).forEach( checkCaseFolder );
