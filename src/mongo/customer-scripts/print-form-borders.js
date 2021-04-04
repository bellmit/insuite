/**
 * Utility script for MOJ-6148, to find customer forms with borders
 *
 * Recent fixes to HPDF.js for inSight2 allow borders to be rendered in PDFs again.  Some elements have borders which
 * now show up in PDFs where they did not before.
 *
 * User: strix
 * Date: 06/06/2016
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global db:true */

"use strict";

print( '==== DIAGNOSTIC SCRIPT FOR MOJ-6148 ====' );

db = db.getSiblingDB( "0" );
//db = db.getSiblingDB( "ff87079633" );

var database = db;

print( '\n\n==== Checking database: ' + database + ' for form element borders ====' );

var result;

//  Load all canonical form templates
result = db.formtemplates.find( {} );

if ( 0 === result.length ) {
    print( 'No form templates found in ' + database );
}

//  check forward and backward references to duplicated attachment
result.forEach( checkFormTemplate );

function checkFormTemplate( template ) {
    if (!template || !template.jsonTemplate || !template.jsonTemplate.name || !template.jsonTemplate.name.de ) {
        print( '  (!) Invalid form template: ' + template._id );
        return;
    }

    var
        pages = template.jsonTemplate.pages || [],
        page,
        element,
        withBorder = [],
        i,
        j;

    for ( i = 0; i < pages.length; i++ ) {
        page = pages[i];

        if ( !page.elements ) { page.elements = []; }

        for (j = 0; j < page.elements.length; j++ ) {
            element = page.elements[j];

            if ( hasBorder( element ) ) {
                withBorder.push( element );
            }

        }
    }

    if ( withBorder.length > 0 ) {
        print( '  (--) formtemplate: ' + template._id + ' (' + template.jsonTemplate.name.de + ') has ' + withBorder.length + ' elements with borders' );

        for ( i = 0; i < withBorder.length; i++ ) {
            element = withBorder[i];
            print( '  (ii) element ' + element.id + ' (' + element.type + '): ' + element.borderColor );
        }

    } //else {
    //    print( '  (--) formtemplate: ' + template._id + ' (' + template.jsonTemplate.name.de + ') has no elements with borders' );
    //}

}

/**
 *  Check whether the given form element has a visible border
 *
 *  @param  element {Object}    Form element definition
 *  @return         {Boolean}   True if this element has a border set which will be displayed in PDF
 */

function hasBorder( element ) {
    var
        bc = element.borderColor || '',
        parts;

    //  no color set
    if ( '' === bc || 'rgba(0, 0, 0, 0)' === bc ) {
        return false;
    }

    //  color has been set as rgba
    if ( 'rgba' === bc.substr( 0, 4 ) ) {
        bc =  bc.replace( 'rgba(', '' ).replace( ')', '' );
        parts = bc.split( ',' );

        //  will not be displayed in PDF is less than 50% opaque
        if ( parts[3] && parseFloat( parts[3] ) <= 0.5 ) {
            return false;
        }
    }

    return true;
}