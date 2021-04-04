/**
 * User: rrrw
 * Date: 04/05/2017  14:24
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


/*global db */
"use strict";


////////////////////////
//  Iterate through all collections in DB to find bad ID.
// unfinished...

var SEARCH_VALUE = '58f616568c6ed123bcdefa4b';
var result = "";
db.getCollectionNames().forEach( function( i ) {
    if( "catalogs" === i ) {
        return;
    }
    if( db[i].count() > 1000 ) {
        print( 'GT 1000  // ' + i);
    }

    var z = db[i].find().map(function(j) {
        var x =  JSON.stringify(j);
        if( x.indexOf(SEARCH_VALUE) > 0) {
            print(x);
            return 'db.' + i + '.update({_id:' + j._id.toString() + ',{$set:{ }})';
        }
        return null;
    }).filter(function(h) {return Boolean(h);});

    result += z.join("\n");
} );
print(result);




