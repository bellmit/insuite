/*: Check for common problems with the basecontacts collection */
/*  Please add checks and fixes as problems are discovered */
/*  dc-mongo 0 < check-contacts.js | grep '^db' > fixes.js */

/* global db */

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

