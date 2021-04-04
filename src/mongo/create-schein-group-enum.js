/* global db:true, Mongo:true, conn:true, printjson:true */
/*jshint strict:false */

/**
 *
 * Creates enums for schein groups from catalog data
 *
 */

conn = new Mongo( 'localhost:27019' );
db = conn.getDB( '0' );

var enums = {
    "ScheinType_E": {
        "type": "String",
        i18n: "Scheingruppe",
        "-en": "Scheingruppe",
        "-de": "Scheingruppe",
        "list": null
    },
    "ScheinSubgroup_E": {
        "type": "String",
        i18n: "Scheinuntergruppe",
        "-en": "Scheinuntergruppe",
        "-de": "Scheinuntergruppe",
        "list": null
    }

};

var allScheinGroups = db.catalogs.find( {title: 'scheinart'}, {
    value: 1,
    key: 1,
    _id: 0
} ).toArray().map( function( entry ) {
    return {
        val: entry.key,
        i18n: entry.value,
        "-de": entry.value,
        "-en": entry.value
    };
} );

enums.ScheinType_E.list = allScheinGroups.filter( function( enumEntry ) {
    return 4 === enumEntry.val.length;
} );

enums.ScheinSubgroup_E.list = allScheinGroups.filter( function( enumEntry ) {
    return 2 === enumEntry.val.length;
} ).sort( function( a, b ) {
    return parseInt( a.val, 10 ) > parseInt( b.val, 10 );
} );

printjson( enums );

