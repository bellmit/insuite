// TODO THURS MORNING
// Before installing new data
// run the following code on the actual current casefolders, patients etc.
// replace on ly in the block directly below... everything else is automatic.

/* eslint-disable */

let casefolders = db.cf2;
let patients = db.pat2;
let activities = db.act2;
let patientversions = db.pv2;

/*// 1.  find all the casefolders that are not imported*/
casefolders.find({imported:{$ne:true}}).forEach( cf => {db.add_cf.insert(cf);})

/*// 2. get all patients for these casefolders*/
var cfpat = db.add_cf.find().map( cf => ObjectId(cf.patientId) );
patients.find({_id:{$in:cfpat}}).forEach( p => {
   db.add_pat.insert(p);
});

/*// 3. get all patientversions for these casefolders*/
cfpatstr = cfpat.map( p => p.str );
patientversions.find({patientId:{$in:cfpatstr}}).forEach( p => {
    db.add_pv.insert(p);
});

/*// 4. get all activities for these casefolders*/
var cfstr = db.add_cf.find().map( cf => cf._id.str );
cfstr.length;
activities.find({caseFolderId:{$in:cfstr}}).forEach( p => {
    db.add_act.insert(p);
});

/* Show counts */
db.add_pat.count();
db.add_cf.count();
db.add_pv.count();
db.add_act.count();


/*// 4. get all patients referenced from schedules.*/
var schedpats = db.sched2.find({_id:{$gt:ObjectId("5b9e8016d677350df83ab4cf")}}).map(s=>s.patient).filter(a=>a);
patients.find({_id:{$in:schedpats}}).forEach( p => {
    p.patientNo = `DUPL-${p.patientNo}`;
    db.add_pat.insert(p);
});
db.add_pat.find({patientNo:/^DUPL/}).count();


/*install data*/
db.add_pat.find().forEach(x => {db.patients.insert(x)});
db.add_cf.find().forEach(x => {db.casefolders.insert(x)});
db.add_pv.find().forEach(x => {db.patientversions.insert(x)});
db.add_act.find().forEach(x => {db.activities.insert(x)});