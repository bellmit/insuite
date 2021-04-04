/*
//  MOJ-10314
//
//  --  back up suspect patient entries
//  --  make a list of patients which have __placeholder__ markers
//  --  remove __placeholder__ markers and strip _ids in JSON strings
//  --  check consistency of data
*/

/*
Example of data this is meant to clean:

{ "_id" : ObjectId("5ac3412683a4b4227fd94c6e"), "markers" : [ "5b0bcbaee341ef1fd98a0344" ] }
{ "_id" : ObjectId("5ac33ecf83a4b4227fb3f944"), "markers" : [ "00000000000000000000001c" ] }
{ "_id" : ObjectId("5ac3461483a4b4227f304031"), "markers" : [ "5b050d74da06acbdd7a17510" ] }
{ "_id" : ObjectId("5ac3410683a4b4227fd71360"), "markers" : [ "5b62c458d435c49b1351d5d3" ] }
{ "_id" : ObjectId("5ac346c783a4b4227f3bf06f"), "markers" : [ "__placeholder__" ] }
{ "_id" : ObjectId("5ac345c183a4b4227f2ac87f"), "markers" : [ "5b193b7313f787431882e5ff" ] }
{ "_id" : ObjectId("5ac3423983a4b4227fec8493"), "markers" : [ "5ac5d2fc4ccc4287a77fc8f0" ] }
{ "_id" : ObjectId("5ac3433383a4b4227ffe0352"), "markers" : [ "000000000000000000000019", "5ac5d2fc4ccc4287a77fc8f0" ] }
{ "_id" : ObjectId("5ac3464e83a4b4227f341233"), "markers" : [ "{ _id: 5ad7357747c86a620ee88356,\n  icon: 'fa fa-user-times',\n  description: 'Kein Rezept ohne Arztkontakt!',\n  severity: 'CRITICAL' }" ] }
{ "_id" : ObjectId("5ac345be83a4b4227f2a91ac"), "markers" : [ "5ac5d2fc4ccc4287a77fc8f0" ] }
{ "_id" : ObjectId("5ac344ed83a4b4227f1c493e"), "markers" : [ "__placeholder__" ] }
{ "_id" : ObjectId("5ac3460e83a4b4227f2fe550"), "markers" : [ "{ _id: 5ac5d2fc4ccc4287a77fc8f0,\n  icon: 'fa fa-google-plus',\n  description: 'Gramatté privat',\n  severity: 'CRITICAL' }", "5ac5d2fc4ccc4287a77fc8f0" ] }
{ "_id" : ObjectId("5ac3408e83a4b4227fcf2937"), "markers" : [ "00000000000000000000001d" ] }
{ "_id" : ObjectId("5ac3464b83a4b4227f33d297"), "markers" : [ "5ace00c1d06ff6635676bca5" ] }
{ "_id" : ObjectId("5ac3453583a4b4227f214dac"), "markers" : [ "5b0bcbaee341ef1fd98a0344" ] }
{ "_id" : ObjectId("5ac342f383a4b4227ff98d27"), "markers" : [ "5ac5d2fc4ccc4287a77fc8f0" ] }
{ "_id" : ObjectId("5ac3423683a4b4227fec59a0"), "markers" : [ "5ac5d74b8051a687b986a47d" ] }
{ "_id" : ObjectId("5ac3447f83a4b4227f1488ad"), "markers" : [ "__placeholder__" ] }
{ "_id" : ObjectId("5ac341db83a4b4227fe5f417"), "markers" : [ "5ac5d2fc4ccc4287a77fc8f0", "5b0bcbaee341ef1fd98a0344" ] }
{ "_id" : ObjectId("5ac342d783a4b4227ff79b10"), "markers" : [ "5ac5d2fc4ccc4287a77fc8f0" ] }

 */

/*global db, ObjectId*/

/*  STEP 1 - find and backup patients with broken markers in a special table */

function backupBrokenPatients( patient ) {
    if ( !patient.markers || !Array.isArray( patient.markers ) || 0 === patient.markers.length ) { return; }
    /* */
    let
        idLength = 24,
        isBroken = false,
        i;
    /* */
    for ( i = 0; i < patient.markers.length; i++ ) {
        if ( patient.markers[i].length !== idLength ) {
            print( `Backup patient ${patient._id.toString()}: ${JSON.stringify(patient.markers)}` );
            isBroken = true;
        }
    }
    /* */
    if ( isBroken ) {
        db.MOJ10314patients.insert( patient );
    }
}

db.patients.find().forEach( function( doc ) { backupBrokenPatients( doc ); } );

/*  STEP 2 - make a list of patients with __placeholder__ marker, save in case needed in future */

function findPlaceholderMarkersInPatients( patient ) {
    let
        placeholder = '__placeholder__',
        i;
    if ( !patient.markers || !Array.isArray( patient.markers ) || 0 === patient.markers.length ) { return; }
    for ( i = 0; i < patient.markers.length; i++ ) {
        if ( patient.markers[i] === placeholder ) {
            print( `Found placeholder marker in patient ${patient._id.toString()}: ${JSON.stringify(patient.markers)}` );
        }
    }
}

db.patients.find().forEach( function( doc ) { findPlaceholderMarkersInPatients( doc ); } );

/*  STEP 3 - remove __placeholder__ markers and clean up JSON strings */

function cleanupMarkersInPatients( patient ) {
    let
        placeholder = '__placeholder__',
        idLength = 24,
        copyMarkers = [],
        isBroken = false,
        tempStr,
        tempObj,
        i;
    /* */
    if ( !patient.markers || !Array.isArray( patient.markers ) || 0 === patient.markers.length ) { return; }
    /* */
    for ( i = 0; i < patient.markers.length; i++ ) {
        if ( patient.markers[i].length === idLength ) {
            /* keep it */
            copyMarkers.push( patient.markers[i] );
        } else {
            /*  not an _id */
            isBroken = true;
            if ( patient.markers[i] === placeholder ) {
                print( `Removing placeholder marker in patient ${patient._id.toString()}: ${JSON.stringify(patient.markers)}` );
            } else {
                print( `Parsing JSON, hacky: ${patient.markers[i]}` );
                tempStr = patient.markers[i];
                tempObj = tempStr.split( '_id:' );
                tempStr = tempObj[1] ? tempObj[1] : '';
                tempObj = tempStr.split( ',' );
                tempStr = tempObj[0].trim();
                if ( idLength === tempStr.length ) {
                    print( `Found likely marker _id: ${tempStr}`);
                    copyMarkers.push( tempStr );
                }
            }
        }
    }
    if ( isBroken ) {
        print( `Saving new marker set for patient ${patient._id.toString()}: ${JSON.stringify(patient.markers)} => ${JSON.stringify( copyMarkers )}` );
        /*  UNCOMMENT THIS TO RUN: */
        /*db.patients.update( { _id: patient._id }, { $set: { markers: copyMarkers } } ); */
    }
}

db.patients.find().forEach( function( doc ) { cleanupMarkersInPatients( doc ); } );


/*  STEP 4 - check consistency, look up all markers by _id, make sure they exist */

function lookupMarkersInPatients( patient ) {
    if ( !patient.markers || !Array.isArray( patient.markers ) || 0 === patient.markers.length ) { return; }

    /* print( `Patient: ${patient._id}: ${JSON.stringify( patient.markers )}` ); */
    let i, markersCount = 0;

    for ( i = 0; i < patient.markers.length; i++ ) {
        try {
            markersCount = db.markers.count( { _id: ObjectId( patient.markers[i] ) } );
        } catch ( idErr ) {
            print( `Could not look up marker ${patient.markers[i]} referenced by patient: ${patient._id}, err: ${idErr}` );
        }
        if ( 1 !== markersCount ) {
            print( `Could not find marker ${patient.markers[i]} referenced by patient: ${patient._id}` );
        }
    }

}

db.patients.find().forEach( function( doc ) { lookupMarkersInPatients( doc ); } );

/* STEP 5 - Deduplicate markers */

function deduplicateMarkers( patient ) {
    if ( !patient.markers || !Array.isArray( patient.markers ) || 0 === patient.markers.length ) { return; }
    /* */
    const DO_REAL_UPDATE = false;
    let newMarkers = [], i;
    for ( i = 0; i < patient.markers.length; i++ ) {
        if ( -1 === newMarkers.indexOf( patient.markers[i] ) ) {
            newMarkers.push( patient.markers[i] );
        }
    }
    /* */
    if ( patient.markers.length !== newMarkers.length ) {
        print( `[i] Correcting duplicate markers on patient: ${patient._id.valueOf()}: ${JSON.stringify( patient.markers)} ==> ${JSON.stringify(newMarkers)}` );

        if ( DO_REAL_UPDATE ) {
            db.patients.update( { _id: patient._id }, { $set: { markers: newMarkers } } );
        }
    }
}

db.patients.find().forEach( function( doc ) { deduplicateMarkers( doc ); } );

