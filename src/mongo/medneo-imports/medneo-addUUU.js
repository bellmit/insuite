/**
 * User: rrrw
 * Date: 22/09/15  17:17
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/**
 * script to add 'UUU' type diagnoses to all the SCHEINs in medneo.
 */

/*global db:true */

"use strict";
var dbs, rs, rs2, rec, newrec, newDateObj;

db = db.getSiblingDB( "admin" );
dbs = db.runCommand( {"listDatabases": 1} ).databases;
// Iterate through each database and get its collections.
dbs.forEach( function( database ) {
    if( /^([\da-f]){8,15}$|^0$/.exec( database.name ) ) {
        print( database.name + ' entering.' );
        db = db.getSiblingDB( database.name );
        // update identities...
        rs = db.activities.find({actType:"SCHEIN"});

        print( 'updating ' + rs.count());
        while( rs.hasNext() ) {
            rec = rs.next();
            rs2 = db.activities.find({actType:"DIAGNOSIS", caseFolderId: rec.caseFolderId});

            if(!rs2.hasNext()) {

                newDateObj = new Date( rec.timestamp.getTime() + 60000 );
                // setup the rec
                newrec = {};
                newrec.actType = 'DIAGNOSIS';
                newrec.code = "UUU";
                newrec.patientId = rec.patientId;
                newrec.employeeId = rec.employeeId;
                newrec.timestamp = newDateObj;
                newrec.locationId = rec.locationId;
                newrec.caseFolderId = rec.caseFolderId;
                newrec.diagnosisTreatmentRelevance = 'TREATMENT_RELEVANT';
                newrec.status = 'VALID';
                newrec.userContent = "Angabe einer ICD-10-GM-Schlüsselnummer nicht erforderlich";
                newrec.catalogShort = 'ICD-10';
                //newrec.catalogRef = 'DC-ICD-10-D,A-1426845269416.json';
                newrec.catalog = true;
                newrec.editor = rec.editor;
                newrec.u_extra = {
                    "infektionsschutzgesetz_abrechnungsbesonderheit": "n",
                    "infektionsschutzgesetz_meldepflicht": "n",
                    "schlüsselnummer_mit_inhalt_belegt": "j",
                    "krankheit_in_mitteleuropa_sehr_selten": "n",
                    "abrechenbar": "j"
                };
                print( "casefolder has no diagnosis  " + rec.caseFolderId + " patientID: " + rec.patientId );


                db.activities.insert( newrec );
            }
        }

    } else {
        print( database.name + ' not processing.' );
    }
} );


//var rs = db.activities.find({code:'UUU'});
//while( rs.hasNext() ) {
//    rec = rs.next();
//    // setup the rec
//    print( rec._id.str );
//    db.activities.update( {_id: rec._id }, {$set:{diagnosisTreatmentRelevance: 'TREATMENT_RELEVANT'}} );
//}

// remove physicians
db = db.getSiblingDB( "admin" );
dbs = db.runCommand( {"listDatabases": 1} ).databases;
dbs.forEach( function( database ) {
    if( '3652b7434d2f' === database.name ||
        '6376776a444' === database.name ||
        '4abbc55786ec' === database.name
    ) {
        db = db.getSiblingDB( database.name );
        rs = db.physicians.drop( {} );
        print( 'removed physicians in  DB: ' + database.name );

    }
} );


//
db = db.getSiblingDB( "admin" );
dbs = db.runCommand( {"listDatabases": 1} ).databases;
dbs.forEach( function( database ) {
        db = db.getSiblingDB( database.name );
        rs = db.activities.find( {} );
        print( 'primary docs ' + rs.count() +' in  DB: ' + database.name );

} );


//
db = db.getSiblingDB( "admin" );
dbs = db.runCommand( {"listDatabases": 1} ).databases;
dbs.forEach( function( database ) {
        db = db.getSiblingDB( database.name );
        rs = db.physicians.find( {} );
        print( 'phys ' + rs.count() +' in  DB: ' + database.name );

} );

db.patients.aggregate([
    {$match:{primaryDoc:{$exists:true}}}
]);