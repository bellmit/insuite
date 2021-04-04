/**
 * Replace one font with another in customer forms
 */
/*global db */
function changeHelveticaToArial( form ) {

    print( `[i] Checking form: ${form.jsonTemplate.name.de}` );

    let page, elem, changed = false;

    for ( page of form.jsonTemplate.pages ) {
        print( `[i] Checking page ${page.name}` );

        for ( elem of page.elements ) {
            //print( `[.] elem ${elem.id} ${elem.font}` );

            if ( elem.font && 'arial-sfd-copy' === elem.font && true === elem.isBold ) {
                print( `[.] Changing ${elem.id} font from arial-sfd-copy to: arial-sfd-bold` );

                elem.font = 'arial-sfd-bold';
                elem.isBold = false;
                changed = true;
            }

            if ( elem.font && 'arial' === elem.font.toLowerCase() ) {
                print( `[.] Changing ${elem.id} font from arial to: arial-sfd-copy` );

                elem.font = 'arial-sfd-copy';
                changed = true;
            }
        }
    }
    if ( changed ) {
        print( `[>] Saving form ${form._id.valueOf()} ${form.jsonTemplate.name.de}` );
        db.formtemplates.update( { _id: form._id }, { $set: { jsonTemplate: form.jsonTemplate } } );
    }

}

function changeArialToHelvetica( form ) {
    print( `[i] Checking form: ${form.jsonTemplate.name.de}` );
    let page, elem, changed = false;
    for ( page of form.jsonTemplate.pages ) {
        print( `[i] Checking page ${page.name}` );
        /* */
        for ( elem of page.elements ) {
            //print( `[.] elem ${elem.id} ${elem.font}` );
            if ( elem.font && 'arial-sfd-copy' === elem.font ) {
                print( `[.] Changing ${elem.id} font from arial-sfd-copy to: Helvetica` );

                elem.font = 'Helvetica';
                elem.isBold = false;
                changed = true;
            }
            /* */
            if ( elem.font && 'arial-sfd-bold' === elem.font.toLowerCase() ) {
                print( `[.] Changing ${elem.id} font from arial to: Helvetica (bold)` );

                elem.font = 'Helvetica';
                elem.isBold = true;
                changed = true;
            }
            /* */
            if ( elem.font && 'arial' === elem.font.substr(0,5).toLowerCase() ) {
                print( '[i] Font is: ', elem.font );
            }
        }
    }
    if ( changed ) {
        print( `[>] Saving form ${form._id.valueOf()} ${form.jsonTemplate.name.de}` );
        db.formtemplates.update( { _id: form._id }, { $set: { jsonTemplate: form.jsonTemplate } } );
    }
}

function changeArialToHelvetica( form ) {
    print( `[i] Checking form: ${form.jsonTemplate.name.de}` );
    let page, elem, changed = false;
    for ( page of form.jsonTemplate.pages ) {
        print( `[i] Checking page ${page.name}` );
        /* */
        for ( elem of page.elements ) {
            //print( `[.] elem ${elem.id} ${elem.font}` );
            if ( elem.font && 'arial-sfd-copy' === elem.font ) {
                print( `[.] Changing ${elem.id} font from arial-sfd-copy to: Helvetica` );

                elem.font = 'Helvetica';
                elem.isBold = false;
                changed = true;
            }
            /* */
            if ( elem.font && 'arial-sfd-bold' === elem.font.toLowerCase() ) {
                print( `[.] Changing ${elem.id} font from arial to: Helvetica (bold)` );

                elem.font = 'Helvetica';
                elem.isBold = true;
                changed = true;
            }
            /* */
            if ( elem.font && 'arial' === elem.font.substr(0,5).toLowerCase() ) {
                print( '[i] Font is: ', elem.font );
            }
        }
    }
    if ( changed ) {
        print( `[>] Saving form ${form._id.valueOf()} ${form.jsonTemplate.name.de}` );
        db.formtemplates.update( { _id: form._id }, { $set: { jsonTemplate: form.jsonTemplate } } );
    }
}


function changeIBMPlexToHelvetica( form ) {
    print( `[i] Checking form: ${form.jsonTemplate.name.de}` );
    let page, elem, changed = false;
    for ( page of form.jsonTemplate.pages ) {
        print( `[i] Checking page ${page.name}` );
        /* */
        for ( elem of page.elements ) {
            print( `[.] elem ${elem.id} ${elem.font}` );
            if ( elem.font && 'IBMPlexSansCondensed-Regular' === elem.font ) {
                print( `[.] Changing ${elem.id} font from IBMPlexSansCondensed-Regular to: Helvetica (bold)` );
                elem.font = 'Helvetica';
                elem.isBold = true;
                changed = true;
            }
            print( `[.] elem ${elem.id} ${elem.font}` );
            if ( elem.font && 'IBMPlexSansCondensed-Medium' === elem.font ) {
                print( `[.] Changing ${elem.id} font from IBMPlexSansCondensed-Medium to: Helvetica (bold)` );
                elem.font = 'Helvetica';
                elem.isBold = true;
                changed = true;
            }
            /* */
            if ( elem.font && 'IBMPlexSansCondensed-Light' === elem.font ) {
                print( `[.] Changing ${elem.id} font from IBMPlexSansCondensed-Light to: Helvetica (regular)` );
                elem.font = 'Helvetica';
                elem.isBold = false;
                changed = true;
            }
            if ( elem.font && 'IBMPlexSansCondensed-ExtraLight' === elem.font ) {
                print( `[.] Changing ${elem.id} font from IBMPlexSansCondensed-ExtraLight to: Helvetica (regular)` );
                elem.font = 'Helvetica';
                elem.isBold = false;
                changed = true;
            }
            /* */
            if ( elem.font && 'arial' === elem.font.substr(0,5).toLowerCase() ) {
                print( '[i] Font is: ', elem.font );
            }
        }
    }
    if ( changed ) {
        print( `[>] Saving form ${form._id.valueOf()} ${form.jsonTemplate.name.de}` );
        db.formtemplates.update( { _id: form._id }, { $set: { jsonTemplate: form.jsonTemplate } } );
    }
}


db.formtemplates.find({isReadOnly: false}).forEach( changeIBMPlexToHelvetica );

/* db.formtemplates.find({isReadOnly: false}).forEach( changeArialToHelvetica ); */

/* db.formtemplateversions.find({isReadOnly: false}).forEach( changeArialToHelvetica ); */
