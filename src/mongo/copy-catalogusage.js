/**
 * User: rrrw
 * Date: 18/09/15  12:14
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global db */
/**
 *
 * Quick script to copy all catalogusage entries from one location to another.
 *
 */
"use strict";

/**
 * set sourceLocationId,
 * tags - options,
 * targetLocationsId
 */
function copyCatalogUsage() {
    var
        sourceLocationId = '000000000000000000000001',
        tags = [],
        targetLocationsId = ['579773f5df4d95da0ca52a6d', '5823418e9209a9560f693887'],
        query = { "locationId": sourceLocationId, catalog: true };
    if( tags.length ) {
        query.tags = { $in: tags };
    }
    var cs = db.catalogusages.find( query );

    cs.forEach( function(item){
        delete item._id;
        targetLocationsId.forEach(function(locationId){
            item.locationId = locationId;
            db.catalogusages.insert(item);
        });
    });
}

function copyCatalogText() {
    var
        sourceLocationId = '000000000000000000000001',
        targetLocationsId = ['579773f5df4d95da0ca52a6d', '5823418e9209a9560f693887'];
    var cs = db.catalogtexts.find( { "locationId": sourceLocationId, catalog: true } );

    cs.forEach( function(item){
        delete item._id;
        targetLocationsId.forEach(function(locationId){
            item.locationId = locationId;
            db.catalogtexts.insert(item);
        });
    });
}

copyCatalogUsage();
copyCatalogText();

function removeDuplicatedCustomCodes() {
    var
        sourceLocationId = '000000000000000000000001',
        targetLocationsId = ['58ff5588afce1dae32c344cb', '58ff53bcafce1dae32c3447e', '58fced413581e7c0324b6687', '58ff537ee3a433ba32a56b4b'];
    var cs = db.catalogusages.find( { "locationId": sourceLocationId, catalog: false } );

    cs.forEach( function( item ) {
        targetLocationsId.forEach( function( locationId ) {
            var
                count = db.catalogusages.find( { "locationId": locationId, catalog: false, seq: item.seq, catalogShort: item.catalogShort } ).count();

            if( 0 < count ) {
                db.catalogusages.remove({"locationId": locationId, catalog: false, seq: item.seq, catalogShort: item.catalogShort });
            }
        } );
    } );
}
removeDuplicatedCustomCodes();