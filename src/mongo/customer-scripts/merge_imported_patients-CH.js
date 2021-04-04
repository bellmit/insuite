/**
 * User: rrrw
 * Date: 17/04/2018  22:24
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/**
 * Function  to merge up to TWO separate patient databases, each of which is in
 * itself has unique patients, but accross DB, the patients are duplicated.
 * Can also do 3, needs a change in the main search query.
 *
 * mergePatients() was developed for German customers first.
 *
 * This version required by Wuerenlingen.  It does not merge inStocks.  Only the patient related matters.
 *
 * Main difference is the aggregate.  Here we have a much more relaxed match and a different master selection.
 *
 * TODO-- extract the cardswipe and mergepatients into a merger helper and use in German and Swiss editions (fun ES6 task)
 *
 */

/*global printjson, db, sleep*/
'use strict';

var merged = 0, updact = 0, updcf = 0, updsch = 0, updll = 0, treble = [];

function hasCardSwipe(result, ins){
    if(ins) {  return result || Boolean( ins.vekaCardNo );  }
    return result;
}

function mergePatients(p, p1) {
    var master, slave;

    /*fix is to merge the files, and delete the slave*/
    if( p.insuranceStatus.reduce( hasCardSwipe, false ) ) {
        master = p;
        slave = p1;
        /*addtl wuerenlignen criterion*/
    } else if( p1.insuranceStatus.reduce( hasCardSwipe, false ) ) {
        master = p1;
        slave = p;
        /*addtl wuerenlignen criterion*/
    } else if( p.partnerIds && p.partnerIds[0] && p.partnerIds[0].patientId ) {
        master = p;
        slave = p1;
    } else {
        master = p1;
        slave = p;
    }
    updact += db.activities.update( {patientId: slave._id.str}, {
        $set: {
            patientId: master._id.str,
            _kl2: true
        }
    }, {multi: true} ).nModified;
    updcf += db.casefolders.update( {patientId: slave._id.str}, {
        $set: {
            patientId: master._id.str,
            _kl2: true
        }
    }, {multi: true} ).nModified;
    updsch += db.schedules.update( {patient: slave._id}, {
        $set: {
            patient: master._id,
            _kl2: true
        }
    }, {multi: true} ).nModified;
    updll += db.lablogs.update( {patientId: slave._id}, {
        $set: {
            patientId: master._id,
            _kl2: true
        }
    }, {multi: true} ).nModified;
    slave.masterId = master._id;
    db.patients.update( {_id: master._id}, {$push: {communications: {$each: slave.communications}}} );
    db.patbackup.insert( slave );
    db.patients.remove( {_id: slave._id} );
    merged++;
    return master;
}

db.patients.aggregate( [
    {
        $group: {
            _id: {lastname: '$lastname', firstname:'$firstname', kbvDob: '$kbvDob', gender:'$gender'},
            ids: {$push: '$_id'},
            cnt: {$sum: 1}
        }
    },
    {$match: {cnt: 2}}] ).forEach( ( patIds ) => {
        /*printjson(db.patients.find( {_id: {$in: patIds.ids }} ).map(a=>a.communications) );*/
        var patsRS = db.patients.find( {_id: {$in: patIds.ids }} );

        var p = patsRS.next();
        var p1 = patsRS.next();

        p = mergePatients(p,p1);
        if(patsRS.hasNext()) {
            treble.push({ _id: patIds._id, cnt: patIds.cnt});
            p1 = patsRS.next();
            mergePatients(p,p1);
        }
        sleep(1);
    }
);


print( 'Merged: ' + merged + '  trebles: ' + treble.length );
print( '\nUpdate Activities: ' + updact +'\nUpdate CaseFolders: ' + updcf +'\nUpdate Schedules: ' + updsch +'\nUpdate LabLogs: ' + updll);
printjson( treble );
