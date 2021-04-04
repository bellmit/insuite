/*: Check for common problems with the basecontacts collection */
/*  Please add checks and fixes as problems are discovered */
/*  dc-mongo 0 < check-contacts.js | grep '^db' > fixes.js */

/* global db, ObjectId */

function checkContact( cnt ) {
    const
        idStr = `${cnt._id.valueOf()} ${nn(cnt.baseContactType)}`,
        query = `{_id: ${cnt._id}}`;
    let
        content,
        tmp;
    /* */
    switch ( cnt.baseContactType ) {
        /* person types */
        case 'PHYSICIAN':
        case 'THERAPIST':
        case 'PERSON':
            /*: - person contacts should have first and last name */
            if ( !cnt.firstname.trim() ) {
                print( `[!] ${idStr} should have a first name` );
            }
            if ( !cnt.lastname.trim() ) {
                print( `[!] ${idStr} should have a last name` );
            }
            /*: - person contacts should not have an insitition name */
            if ( cnt.insitutionName ) {
                print( `[!] ${idStr} should not have an institution name: ${nn(cnt.institutionName)}` );
                /* autofix disabled by default becuse we may need to read the first and last name out of the institutionName */
                /* print( `db.basecontacts.update(${query},{$unset:{ insitituionName: 1}});` ); */
            }
            content = `${cnt.firstname} ${cnt.lastname}`;
            break;
        /* institution types */
        case 'PRACTICE':
        case "CARE":
        case "PHARMACY":
        case "VENDOR":
        case "TRANSPORT":
        case 'OTHER':
        case 'VENDOR':
        case 'CLINIC':
        case 'INSTITUTION':
            /*: - institution contacts should have an institution name */
            content = cnt.institutionName;
            if ( !cnt.institutionName ) {
                print( `[!] ${idStr} should have an institution name` );
                /* some imported contacts have first and/or last name where institution name should be */
                if ( cnt.firstname.trim() || cnt.lastname.trim() ) {
                    tmp = `${cnt.firstname} ${cnt.lastname}`;
                    tmp = tmp.trim();
                    print( `[!] ${idStr} institution name from other fields: ${nn(tmp)}` );
                    print( `db.basecontacts.update(${query},{$set:{institutionName: "${nn(tmp)}"}});` );
                    content = nn( tmp );
                }
            }
            /*: - institution contacts should not have a firstname */
            if ( cnt.firstname ) {
                print( `[!] ${idStr} ${cnt.institutionName} should not have a firstname: ${nn(cnt.firstname)}` );
                print( `db.basecontacts.update(${query},{$set:{firstname: ""}});` );
            }
            /*: - institution contacts should not have a last name */
            if ( cnt.lastname ) {
                print( `[!] ${idStr} ${nn(cnt.institutionName)} should not have a lastname: ${nn(cnt.lastname)}` );
                print( `db.basecontacts.update(${query},{$set:{lastname: ""}});` );
            }
            /*: - institution contacts should not have a salutation */
            if ( cnt.talk ) {
                print( `[!] ${idStr} ${nn(cnt.institutionName)} should not have a talk field: ${nn(cnt.talk)}` );
                print( `db.basecontacts.update(${query},{$set:{talk: ""}});` );
            }
            break;
        case "SUPPORT":
            /* TODO */
            break;
        default:
            print( `[!] ${idStr} unrecognized basecontact type ${cnt.baseContactType}, checks may need to be updated.` );
    }
    /*: - content should match name or institutionName */
    content = content.trim();
    if ( cnt.content !== content ) {
        print( `[!] ${idStr} content mismatch, current: ${nn(cnt.content)} expected: ${nn(content)}` );
        print( `db.basecontacts.update(${query},{$set:{content: "${content}"}});` );
    }
    /*: - links to other contacts should be valid */
    /* TODO */
    /*: - form should exist if specified */
    /* TODO */
}


/* utility to replace newlines */
function nn( str ) {
    str = str || '';
    return str.replace( new RegExp('\n', 'g'), '\\n' ); /* eslint-disable-line no-control-regex */
}

/* run against all basecontacts */

let countBaseContacts = db.basecontacts.count();
print( `[i] checking ${countBaseContacts} basecontacts` );
let baseContactsStartTime = new Date().getTime();
db.basecontacts.find({}).forEach( checkContact );
let baseContactsEndTime = new Date().getTime();
print( `[i] finished checking ${countBaseContacts} basecontacts, ${(baseContactsStartTime - baseContactsEndTime)/1000} seconds\n\n` );

/* mongoscript to check references from activities to other objects, checks for common kinds of bad data */
/* global db, ObjectId */
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
            intro = `${activity.timestamp.getFullYear()}-${activity.timestamp.getMonth()}-${activity.timestamp.getDay()} ${intro}`;
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
    /* TODO: invoice log refs */
}
db.activities.find().sort({timestamp:-1}).forEach( checkActivity );
