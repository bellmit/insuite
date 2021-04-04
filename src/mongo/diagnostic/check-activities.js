/* mongoscript to check references from activities to other objects, checks for common kinds of bad data */
/* global db, ObjectId, print */
function checkActivity( activity ) {
    /* 1. Check links to patient, location, casefolder, employee */
    let
        actId = activity._id.valueOf(),
        intro = `activity ${actId} ${activity.actType} ${activity.status}`,
        locationObj,
        patientObj,
        employeeObj,
        caseFolderObj;
    /* */
    /* check basic properties */
    /* */
    if ( !activity.timestamp ) {
        print( `[!] ${intro} does not have a timestamp` );
    } else {
        try {
            intro = `${activity.timestamp.getFullYear()}-${activity.timestamp.getMonth()+1}-${activity.timestamp.getDate()} ${intro}`;
        } catch ( err ) {
            print( `[!] ${intro} has invalid timestamp: ${activity.timestamp}` );
        }
    }
    /* */
    try {
        locationObj = db.locations.findOne({_id: activity.locationId });
    } catch ( err ) {
        print( `[!] ${intro} has invalid locationId: ${activity.locationId}` );
    }
    /* */
    try {
        patientObj = db.patients.findOne({ _id: ObjectId( activity.patientId ) });
    } catch ( err ) {
        print( `[!] ${intro} has invalid patientId: ${activity.patientId}` );
    }
    /*  */
    try {
        caseFolderObj = db.casefolders.findOne({ _id: ObjectId( activity.caseFolderId ) });
    } catch ( err ) {
        print( `[!] ${intro} has invalid caseFolderId: ${activity.caseFolderId}` );
    }
    /*  */
    try {
        employeeObj = db.employees.findOne({ _id: ObjectId( activity.employeeId ) });
    } catch ( err ) {
        print( `[!] ${intro} has invalid employeeId: ${activity.employeeId}` );
    }
    if ( !locationObj ) {
        print( `[!] ${intro} does not have a location: ${activity.locationId}` );
    }
    if ( !patientObj ) {
        print( `[!] ${intro} does not have a patient: ${activity.patientId}` );
    }
    if ( !caseFolderObj ) {
        print( `[!] ${intro} does not have a casefolder: ${activity.caseFolderId}` );
    }
    if ( !employeeObj ) {
        print( `[!] ${intro} does not have a casefolder: ${activity.caseFolderId}` );
    }
    /* */
    /* check reporting entries */
    /* */
    const reportingObj = db.reportings.findOne({ activityId: activity._id.valueOf(), entityName: 'ACTIVITY' } );
    if ( !reportingObj ) {
        print( `[!] ${intro} does not have a reporting entry.` );
    }
    /* */
    /* check linked activities */
    /* */
    let seenChildren = [];
    if ( !activity.activities ) { activity.activities = []; }
    activity.activities.forEach( checkChild );
    if ( activity.icds ) { activity.icds.forEach( checkChild ); }
    if ( activity.icdsExtra ) { activity.icdsExtra.forEach( checkChild ); }
    if ( activity.receipts ) { activity.receipts.forEach( checkChild ); }
    if ( activity.continuousIcds ) { activity.continuousIcds.forEach( checkChild ); }
    /* */
    function checkChild( linkId ) {
        let child;
        try {
            child = db.activities.findOne( { _id: ObjectId( linkId ) } );
        } catch ( err ) {
            print( `[!] ${intro} refers to invalid linked activity: ${linkId}` );
            return;
        }
        if ( -1 !== seenChildren.indexOf( linkId ) ) {
            print( `[!] ${intro} has a duplicated link to child activity: ${linkId}` );
        }
        if ( !linkId ) {
            print( `[!] ${intro} has invalid reference in linked activities: ${linkId}` );
            return;
        }
        if ( !child ) {
            print( `[!] ${intro} links to missing activity ${linkId}` );
            return;
        }
        if ( !child.referencedBy || -1 === child.referencedBy.indexOf( actId ) ) {
            print( `[!] ${intro} is missing backlink from child ${linkId}` );
            return;
        }
        seenChildren.push( linkId );
    }
    /* */
    /* check links to parent activities */
    /* */
    if ( activity.referencedBy ) { activity.referencedBy.forEach( checkParent ); }
    if ( activity.invoiceId ) { checkParent( activity.invoiceId ); }
    function checkParent( parentId ) {
        let parentObj;
        try {
            parentObj = db.activities.findOne( { _id: ObjectId( parentId )} );
        } catch( err ) {
            print( `[!] ${intro} refers to invalid parent: ${parentId}` );
            return;
        }
        if ( !parentObj ) {
            print( `[!] ${intro} refers to non-existent parent: ${parentId}` );
        }
    }
    /* */
    /* check attachments */
    /* */
    let seenAttachments =  [];
    if ( activity.attachments ) { activity.attachments.forEach( checkAttachment ); }
    function checkAttachment( docId ) {
        let docObj;
        try {
            docObj = db.documents.findOne( { _id: ObjectId( docId ) } );
        } catch ( err ) {
            print( `[!] ${intro} has an invalid link to an attachment: ${docId}` );
            return;
        }
        if ( -1 !== seenAttachments.indexOf( docId ) ) {
            print( `[!] ${intro} has a duplicated link to attachment: ${docId}` );
        }
        if ( !docObj ) {
            print( `[!] ${intro} refers to non-existent attachment: ${docId}` );
        }
        seenAttachments.push( docId );
    }
    /* */
    /* check form versions */
    /* */
    let formObj, formVersionObj;
    if ( activity.formId ) {
        try {
            formObj = db.formtemplates.findOne({_id: ObjectId( activity.formId )});
        } catch ( err ) {
            print( `[!] ${intro} has invalid formId: ${activity.formId}` );
        }
        if ( !formObj ) {
            print( `[!] ${intro} links to missing formId: ${activity.formId}`);
        }
    }
    if ( activity.formId ) {
        try {
            formVersionObj = db.formtemplateversions.findOne({_id: ObjectId( activity.formVersion ) });
        } catch ( err ) {
            print( `[!] ${intro} has invalid formVersion: ${activity.formVersion}` );
        }
        if ( !formVersionObj ) {
            print( `[!] ${intro} links to missing formVersion: ${activity.formVersion}` );
        }
    }
    if ( activity.formId && !activity.formVersion ) {
        print( `[!] ${intro} does not specify a formVersion: ${activity.formVersion}` );
    }
    /* */
    /* check medicationPlanEntries medicationRef of KBVMEDICATIONPLAN */
    /* */
    if ( activity.medicationPlanEntries ) { activity.medicationPlanEntries.forEach( checkMedicationPlanEntry ); }
    function checkMedicationPlanEntry( medicationPlanEntry ) {
        let medicationObj;
        if ( !medicationPlanEntry.medicationRef ) {
            print( `[!] ${intro} medicationPlanEntry ${medicationPlanEntry._id} doesn't have medicationRef` );
            return;
        }
        try {
            medicationObj = db.activities.findOne( { _id: ObjectId( medicationPlanEntry.medicationRef )} );
        } catch( err ) {
            print( `[!] ${intro} has invalid medicationRef: ${medicationPlanEntry.medicationRef} in medicationPlanEntry ${medicationPlanEntry._id} OR some other error occurs` );
            return;
        }
        if ( !medicationObj ) {
            print( `[!] ${intro} medicationPlanEntry refers to non-existent medication: ${medicationPlanEntry.medicationRef}` );
            return;
        }

        if ( 0 > activity.activities.indexOf( medicationObj._id.valueOf() ) ) {
            print( `[!] ${intro} has invalid medicationRef: ${medicationObj._id.valueOf()} in medicationPlanEntry ${medicationPlanEntry._id}` );
        }
    }
    /* TODO: invoice log refs */
}

/* db.activities.find().sort({timestamp:-1}).forEach( checkActivity ); */

db.activities.find({timestamp: { $gt: ISODate("2020-01-01T00:00:00.691Z") } }).sort({timestamp:-1}).forEach( checkActivity );