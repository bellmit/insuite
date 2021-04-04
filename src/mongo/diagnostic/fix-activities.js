/* script to automatically fix common errors in imported data                                                       */
/* IMPORTANT, always make a backup of activities and documents collections before running this                      */
/*                                                                                                                  */
/*  dc-mongodump --db 0 --collection activities                                                                     */
/*  dc-mongodump --db 0 --collection documents                                                                      */
/* */
/*global db, ObjectId, print                                                                                        */
/* */
/* */
/*  Utility to check if a string can be cast to a valid ObjectId                                                    */
/*  @param value */
/*  @return {boolean} */
/* */
function isObjIdString( value ) {
    let newValue; /* eslint-disable-line no-unused-vars */
    if ( !value || 'string' !== typeof value ) {
        return false;
    }
    try {
        newValue = ObjectId( value ); /* eslint-disable-line no-unused-vars */
        return true;
    } catch ( err ) {
        return false;
    }
}
/* */
/* If the for is linked to a missing form version, or does not have a form version, the best we can do is           */
/* specify the latest version of the form, if it exists                                                             */
/* @param activityId                                                                                                */
/* */
function setLatestFormVersion( activity, actQuery, template ) {
    if ( !activity.formId || '' === activity.formId ) { return; }
    let
        actId = activity._id.valueOf();
    if ( !template ) {
        print( `[!] cannot find form template ${activity.formId} for activity ${actId}` );
        return;
    }
    if ( !template.latestVersionId ) {
        print( `[!] form template missing latest version ${activity.formId} for activity ${actId}` );
        return;
    }
    print( `[x] setting form version ${template.latestVersionId} on activity ${actId}` );
    db.activities.update( actQuery, { $set: { formVersion: template.latestVersionId } } );
    activity.formVersion = template.latestVersionId;
}
/* */
/* Check for and PDF documents, queue them for creation if missing */
/* */
function checkFormAndPdfDoc( activity, intro ) {
    let
        actId = activity._id.valueOf(),
        noPdfInState = [ 'CREATED', 'VALID', 'CANCELLED', 'DELETED' ],
        attachmentId, attachmentIds = [], formDocs, pdfDocs;
    for ( attachmentId of activity.attachments ) {
        attachmentIds.push( ObjectId( attachmentId ) );
    }
    formDocs = db.documents.find( { _id: { $in: attachmentIds }, type: 'FORM' } );
    pdfDocs = db.documents.find( { _id: { $in: attachmentIds }, type: 'FORM' } );
    /* print( `[i] activity ${activity._id.valueOf()} ${activity.status} with form has ${formDocs.length()} FORM and ${pdfDocs.length()}` ); */
    if ( 0 === formDocs.length() ) {
        print( `[!] ${intro} should have a form but does not, will queue for creation` );
        db.migrationtasks.insertOne( { taskname: 'CREATE_FORM', objId: actId } );
    }
    if ( formDocs.length() > 1 ) {
        print( `[!] ${intro} has more than one FORM document` );
    }
    if ( 0 === pdfDocs.length() && -1 === noPdfInState.indexOf( activity.status ) ) {
        print( `[!] ${intro} should have a form PDF but does not, will queue for creation` );
        db.migrationtasks.insertOne( { taskname: 'CREATE_PDF', objId: actId } );
    }
    if ( formDocs.length() > 1 ) {
        print( `[!] ${intro} has more than one FORMPDF document` );
    }
}
/* */
/* Deduplicate an array of strings, return a new array */
/* */
function deduplicateArray( ary ) {
    let newAry = [], item;
    for ( item of ary ) {
        if ( item && '' !== item && -1 === newAry.indexOf( item ) ) {
            newAry.push( item );
        }
    }
    return newAry;
}
/* */
/* remove a reference to another activity */
/* */
function removeChildRef( activity, childId, propName ) {
    let
        ary = activity[ propName ] || [],
        newAry = [],
        found = ( 'duplicate' === childId ),
        linkId;
    for ( linkId of ary ) {
        if ( linkId && '' !== linkId && linkId !== childId ) {
            newAry.push( linkId );
        } else {
            found = true;
        }
    }
    if ( !found ) { return; }
    print( `[x] removing reference to ${childId} from activity ${activity._id.valueOf()} in property ${propName}` );
    if ( 'duplicate' !== childId ) {
        /* safety, in case we automatically want to recreate these somehow in future */
        print( `[s] replaceInvalidLink("${activity._id.valueOf()}","${propName}","${childId}");` );
    }
    activity[ propName ] = deduplicateArray( newAry );
    let newData = {};
    newData[ propName ] = newAry;
    db.activities.update( { _id: activity._id }, { $set: newData } );
}
/* */
/* */
/* Add backlink from child, parent should be in 'referencedBy' of child activity */
/* @param {String} parentId */
/* @param {String} childId */
/* */
function addBacklinkFromChild(parentId, childId) {
    let child = db.activities.findOne( { _id: ObjectId( childId ) } );
    if ( !child ) { return; }
    let referencedBy = child.referencedBy || [];
    referencedBy.push( parentId );
    referencedBy = deduplicateArray( referencedBy );
    print( `[x] Adding backlink from child activity ${childId} to parent ${parentId}` );
    db.activities.update( { _id: ObjectId( childId ) }, { $set: { referencedBy: referencedBy } } );
}

function fixMedicationRefInMedicationPlanEntry( activity, medicationRefObj, indexInMedicationPlanEntries ) {
    let correctMedication = db.activities.findOne({ _id: {$in: activity.activities.map(function(id) {return ObjectId(id);})}, $or: [{phPZN: medicationRefObj.phPZN},{phNLabel: medicationRefObj.phNLabel}]});
    if ( !correctMedication ) { return; }
    print( `[x] set correct medicationRef ${correctMedication._id.valueOf()} for ${indexInMedicationPlanEntries} medicationPlanEntry  of activity ${activity._id.valueOf()}` );
    db.activities.update( { _id: activity._id, 'medicationPlanEntries.medicationRef': medicationRefObj._id.valueOf() }, { $set: {'medicationPlanEntries.$.medicationRef': correctMedication._id.valueOf()} } );
}

/* */
/* Fix a single activity, as far as possible                                                                        */
/* @param {Object} activity                                                                                         */
/* */
function fixActivity( activity ) {
    /* 1. Check links to patient, location, casefolder, employee */
    let
        actQuery = { _id: activity._id },
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
            intro = `${activity.timestamp.getFullYear()}-${activity.timestamp.getMonth()+1}-${activity.timestamp.getDay()} ${intro}`;
        } catch ( err ) {
            print( `[!] ${intro} has invalid timestamp: ${activity.timestamp}` );
            /* cannot be automatically corrected */
        }
    }
    /* */
    if ( 'string' === typeof activity.locationId ) {
        /* sometimes we see a string instead of an ObjectId in the locationId */
        if ( isObjIdString( activity.locationId ) ) {
            print( `[x] ${actId} converted locationId from string to ObjectId` );
            activity.locationId = ObjectId( activity.locationId );
            db.activities.update( actQuery, { $set: { locationId: activity.locationId } } );
        }
    }
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
        print( `[!] ${intro} does not have an employee: ${activity.employeeId}` );
    }
    /* */
    /* check linked activities */
    /* */
    let seenChildren = [];
    if ( !activity.activities ) { activity.activities = []; }
    activity.activities.forEach( function( childId ) { checkChild( childId, 'activities' ); } );
    if ( activity.icds ) { activity.icds.forEach( function( childId ) { checkChild( childId, 'icds' ); } ); }
    if ( activity.icdsExtra ) { activity.icdsExtra.forEach(  function( childId ) { checkChild( childId, 'icdsExtra' ); } ); }
    if ( activity.receipts ) { activity.receipts.forEach(  function( childId ) { checkChild( childId, 'receipts' ); }  ); }
    if ( activity.continuousIcds ) { activity.continuousIcds.forEach(  function( childId ) { checkChild( childId, 'continuousIcds' ); } ); }
    /* */
    function checkChild( linkId, propName ) {
        let child;
        try {
            child = db.activities.findOne( { _id: ObjectId( linkId ) } );
        } catch ( err ) {
            print( `[!] ${intro} refers to invalid linked activity: ${linkId}` );
            removeChildRef( activity, linkId, propName );
            return;
        }
        if ( -1 !== seenChildren.indexOf( linkId ) ) {
            print( `[!] ${intro} has a duplicated link to child activity: ${linkId}` );
            /* TODO */
        }
        if ( !linkId ) {
            print( `[!] ${intro} has invalid reference in linked activities: ${linkId}` );
            removeChildRef( activity, linkId, propName );
            return;
        }
        if ( linkId === actId ) {
            print( `[x] ${intro} links to itself, removing from ${propName} ${linkId}` );
            removeChildRef( activity, actId, propName );
            removeChildRef( activity, actId, 'referencedBy' );
        }
        if ( !child ) {
            print( `[!] ${intro} links to missing activity ${linkId}` );
            removeChildRef( activity, linkId, propName );
            return;
        }
        if ( !child.referencedBy || -1 === child.referencedBy.indexOf( actId ) ) {
            if ( 'CANCELLED' !== activity.status && 'DELETED' !== activity.status ) {
                print( `[!] ${intro} is missing backlink from child ${linkId}` );
                addBacklinkFromChild( actId, linkId );
            }
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
            removeChildRef( activity, parentId, 'referencedBy' );
            return;
        }
        if ( !parentObj ) {
            print( `[!] ${intro} refers to non-existent parent: ${parentId}` );
            removeChildRef( activity, parentId, 'referencedBy' );
        }
    }
    /* */
    /* check attachments */
    /* */
    let seenAttachments = [];
    if ( !activity.attachments ) { activity.attachments = []; }
    if ( activity.attachments ) { activity.attachments.forEach( checkAttachment ); }
    function checkAttachment( docId ) {
        let docObj;
        try {
            docObj = db.documents.findOne( { _id: ObjectId( docId ) } );
        } catch ( err ) {
            print( `[!] ${intro} has an invalid link to an attachment: ${docId}` );
            removeChildRef( activity, docId, 'attachments' );
            return;
        }
        if ( !docObj ) {
            print( `[!] ${intro} refers to non-existent attachment: ${docId}` );
            removeChildRef( activity, docId, 'attachments' );
        }
        if ( -1 !== seenAttachments.indexOf( docId ) ) {
            print( `[!] ${intro} has a duplicated link to attachment: ${docId}` );
            removeChildRef( activity, 'duplicate', 'attachments' );
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
            setLatestFormVersion( activity, actQuery, formObj );
        }
        if ( !formVersionObj ) {
            print( `[!] ${intro} links to missing formVersion: ${activity.formVersion}` );
            setLatestFormVersion( activity, actQuery, formObj );
        }
    }
    if ( formObj && activity.formId && !activity.formVersion ) {
        print( `[!] ${intro} does not specify a formVersion: ${activity.formVersion}` );
        setLatestFormVersion( activity, actQuery, formObj );
    }
    /* check that form document exists if there should be one */
    if ( formObj && caseFolderObj && !caseFolderObj.imported && 'IMPORTED' !== activity.status ) {
        checkFormAndPdfDoc( activity, intro );
    }
    /* */
    /* check medicationPlanEntries medicationRef of KBVMEDICATIONPLAN */
    /* */
    if ( activity.medicationPlanEntries ) { activity.medicationPlanEntries.forEach( checkMedicationPlanEntry ); }
    function checkMedicationPlanEntry( medicationPlanEntry, index ) {
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
            fixMedicationRefInMedicationPlanEntry( activity, medicationObj, index );
        }
    }
    /* TODO: invoice log refs */
    /* TODO: add patient first and last name if missing */
}
/*db.activities.find({ _id: ObjectId('5e3bdea9fc21c22be0ab0615') }).sort({timestamp: -1}).forEach( fixActivity ); */
db.activities.find().sort({timestamp: -1}).forEach( fixActivity );

