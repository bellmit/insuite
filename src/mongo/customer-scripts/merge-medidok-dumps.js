/**
 * User: rrrw
 * Date: 19/01/2018  12:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global db*/
"use strict";

// get 2 medidok dumps (eg. from Medidok 1.8 and Medidok 2.0
// install dumps as a18 and a20 in DB
// run the following scripts to install data
// copy medidok20 files to BRIEFE

db.a20.distinct("patientId").forEach( a => {
    var rs = db.patients.find( {patientNumber: parseInt(a)} );
    if( rs.hasNext() ) {
        let pat = rs.next();
        if(rs.hasNext()) {print(`ALARM duplicate patientNum: ${a}`);}
        if( pat &&  pat._id ) {
            db.a20.update({patientId: a},{$set:{patientId:pat._id.str}},{multi:true});
        } else {
            print(`ALARM Patient Number NOT FOUND: ${a}`);
        }
    }
    let cfrs = db.casefolders.find( {patientId: a, imported: true} );
    if( cfrs.hasNext() ) {
        let cf = cfrs.next();
        if( cfrs.hasNext() ) {
            print( `ALARM duplicate Casefolder ID: ${a}` );
        }
        if( cf && cf._id ) {
            db.a20.update({patientId: a},{$set:{caseFolderId:cf._id.str}},{multi:true});
        }
    } else {
        print( `ALARM Casefolder ID NOT FOUND: ${a}` );
    }

} );

db.a18.distinct("patientId").forEach( a => {
    var rs = db.patients.find( {patientNumber: parseInt(a)} );
    if( rs.hasNext() ) {
        let pat = rs.next();
        if(rs.hasNext()) {print(`ALARM duplicate patientNum: ${a}`);}
        if( pat &&  pat._id ) {
            db.a18.update({patientId: a},{$set:{patientId:pat._id.str}},{multi:true});
        } else {
            print(`ALARM Patient Number NOT FOUND: ${a}`);
        }
    }
    let cfrs = db.casefolders.find( {patientId: a, imported: true} );
    if( cfrs.hasNext() ) {
        let cf = cfrs.next();
        if( cfrs.hasNext() ) {
            print( `ALARM duplicate Casefolder ID: ${a}` );
        }
        if( cf && cf._id ) {
            db.a18.update({patientId: a},{$set:{caseFolderId:cf._id.str}},{multi:true});
        }
    } else {
        print( `ALARM Casefolder ID NOT FOUND: ${a}` );
    }
} );

/* install */
db.a18.find({patientId:/\S{24}/}).forEach(a => {db.activities.insert(a);});
db.a20.find({patientId:/\S{24}/}).forEach(a => {db.activities.insert(a);});

/* clear script - reverses the install actions*/
/*
db.a18.find().forEach(a=>{db.activities.remove(a);})
db.a20.find().forEach(a=>{db.activities.remove(a);})
*/