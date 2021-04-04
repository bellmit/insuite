/**
 * User: rrrw
 * Date: 23/06/2019  14:51
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/* eslint-disable */

/*
1. alle patienten in G U B crlogs finden
2. nur fuer die patienten die keine cardSwipe auf Geseke haben folgendes machen:
3. KBV relevante felder aus Geseke UND Brilon CRLog mergedPatient sammeln
4. Bei allen PV und auch beim P diese Werte ueberschreiben
5. Berichten was gemacht wurde
 */

//  FIXES CRLOGS IN AN ACTIVE ACTIVE ENVIRONMENT, Can be adapted to also fix in the
// straghtforward env if some cardSwipes go missing for any reason.


/* 0. how many patients have a cardSwipe? */
db.patients.count({"insuranceStatus.cardSwipe":{$exists:true}})

/* 1. pats in Q in crlogs */
var pids = [];
db.crlogs.find(
    {initiatedAt:{$gt:ISODate("2019-03-31T22:00:00.000Z"),$lt:ISODate("2019-06-30T22:00:00.000Z")},mergedPatient:{$exists:true}}  ).sort({initiatedAt:1}).forEach( crl => {
    if( pids.includes( crl.mergedPatient._id ) ) {
        print('.');
    } else {
        pids.push( crl.mergedPatient._id );
        try {
            db.CRLOGANALYSIS.insert(crl.mergedPatient);
        } catch(e) {
            print('e');
        }
        print('-');
    }
});
pids.length

/* 1.A. Copy the CRLOGANALYSIS from B->G */
/* 1.B. Re-run the aobve CRLOGANALYSIS script to get all Quarter CR all in one place - G */
/* 1.C. Compare with the totals from 0 --  11 CR are missing. */


/* 2. Find which patients are missing cardswipe, by ID. */
var pids = db.CRLOGANALYSIS.find().map( a=>a._id );
db.patients.count({_id:{$in:pids},"insuranceStatus.cardSwipe":{$exists:true}});
db.patients.count({_id:{$in:pids},"insuranceStatus.cardSwipe":{$exists:false}});

/* 2.A. More accurate count from 2. --  91 CR are missing. */

/* 3. Create selection to fix:   */
var fpids = db.patients.find({_id:{$in:pids},"insuranceStatus.cardSwipe":{$exists:false}}).map(a=>a._id);
db.CRLOGANALYSIS.find({_id:{$in:fpids}}).forEach( p => {
    db.SUP15998_LOSTCR_TOFIX.insert(p);
});

/* Confirm its 91 patients are affected. But 7 are PRIVATE card reads...!  I.e. 84.*/

const flds = [
    'gender',
    'firstname',
    'lastname',
    'kbvDob',
    'nameaffix',
    'title',
    'fk3120'
];

function log(collection, p1, p2) {
    var firstfour = [flds[0],flds[1],flds[2],flds[3]];
    var str = [collection, ...Array.from( firstfour,x=>p1[x] ), ...Array.from( firstfour,x=>p2[x] )];
    print( str.join()  );
}

function updatePFromCr( crp ) {
    return updatePorPVFromCr( "patients", crp._id, crp );
}

function updatePVFromCr( crp ) {
    db.patientversions.find({"timestamp" : {$gt:ISODate("2019-03-31T22:00:00.000Z")},"patientId" : crp._id.str }).forEach( pv =>
    {   updatePorPVFromCr( "patientversions", pv._id, crp );  } );
}

function updatePorPVFromCr( collection, _id, crp) {
    var original;
    try {
        original = db[collection].find({_id: _id}).next();
    } catch(e) {
        log("=== MISSING ===", crp, {} );
        return;
    }
    var updateSet = {};

    var originalIS = original.insuranceStatus;
    var resultIS = [];
    if( Array.isArray( originalIS ) && originalIS.length ) {
        resultIS = originalIS.filter(ff=>ff.type!=="PUBLIC");
    }
    resultIS.unshift(crp.insuranceStatus.filter(ff=>ff.type==="PUBLIC")[0]);
    updateSet.insuranceStatus = resultIS.filter(ff=>Boolean(ff));

    var originalAdrs = original.addresses;
    var resultAdrs = [];
    if( Array.isArray( originalAdrs ) && originalAdrs.length ) {
        resultAdrs = originalAdrs.filter(ff=>ff.type!=="OFFICIAL");
    }
    resultAdrs.unshift(crp.addresses.filter(ff=>ff.type==="OFFICIAL")[0]);
    updateSet.addresses = resultAdrs.filter(ff=>Boolean(ff));

    flds.forEach( f => {
        updateSet[f] = crp[f];
    });

    /*log( collection, original, updateSet );*/
    /*printjson(updateSet);*/

    db.SUP15998_BackupFinal.insert( original );
    var res = db[collection].update({_id:_id},{$set: updateSet});
    if( res.nModified === 1 ) {
        log( collection, original, updateSet );
    } else {
        log( `NO MODIFICATION ${collection} ${JSON.stringify(res)}`, original, updateSet );
    }
}

db.SUP15998_LOSTCR_TOFIX.find().forEach( p => {updatePFromCr(p)} );
db.SUP15998_LOSTCR_TOFIX.find().forEach( p => {updatePVFromCr(p)} );


