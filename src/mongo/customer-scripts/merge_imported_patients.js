/**
 * User: rrrw
 * Date: 17/04/2018  22:24
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/**
 * Function  to merge up to THREE separate patient databases, each of which is in
 * itself has unique patients, but accross DB, the patients are duplicated.
 *
 * mergePatients() was developed for Klosterstern, and this new version driven
 * by aggregation for Schmerzzentrum Janssen.
 */

/*global printjson, db, sleep*/
'use strict';

var merged = 0, updact = 0, updcf = 0, updsch = 0, updll = 0, treble = [];

function hasCardSwipe(result, ins){
    if(ins) {  return result || Boolean( ins.cardSwipe );  }
    return result;
}

function mergePatients(p, p1) {
    var master, slave;

    /*fix is to merge the files, and delete the slave*/
    if( p.insuranceStatus.reduce( hasCardSwipe, false ) ) {
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
            _id: {lastname: '$lastname', firstname: '$firstname', kbvDob: '$kbvDob',insurance:'$insuranceStatus.insuranceNo',gender:'$gender'},
            ids: {$push: '$_id'},
            cnt: {$sum: 1}
        }
    }, {$match: {cnt: {$gt: 1}}}] ).forEach( ( patIds ) => {
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
        sleep(10);
    }
);


print( 'Merged: ' + merged + '  trebles: ' + treble.length );
print( '\nUpdate Act: ' + updact +'\nUpdate CF: ' + updcf +'\nUpdate Sch: ' + updsch +'\nUpdate LabLogs: ' + updll);
printjson( treble );
