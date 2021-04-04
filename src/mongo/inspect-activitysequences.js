/*global db:true */
"use strict";
const SAVING = false;
db.activitysequences.find().forEach( function( a ) {
    var isDirty = false;
    a.activities.forEach( function( b ) {
        if( "TREATMENT" === b.actType && false === b.catalog && "EBM" === b.catalogShort ) {
            print( b.code + ' ' + b.value + ' ' + b.price + ' ' + b.billingFactorValue );
            b.billingFactorValue = 1;
            isDirty = true;
        }
    } );
    if( SAVING && isDirty ) {
        db.activitysequences.save(a);
        print('x');
    } else {
        print( '.' );
    }
} );



/* example command for quickly looking inside ziffernketten */

