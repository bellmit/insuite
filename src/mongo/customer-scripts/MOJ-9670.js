/**
 * User: rrrw
 * Date: 19/04/2018  17:25
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global db, ISODate*/
var prev_a;
prev_a = undefined;
db.activities.find({timestamp: {$gt: ISODate("2018-03-31T00:00:00.000Z")}, actType: "TREATMENT", code: "3541H"}).count();
db.activities.find({
    timestamp: {$gt: ISODate("2018-03-31T00:00:00.000Z")},
    actType: "TREATMENT",
    code: "3541H"
}).sort({"labRequestRef": 1}).forEach(a => {
    if (a.labRequestRef === prev_a) { /* check & cleanup */
        print('check linked activities: ' + db.activities.find({
            timestamp: {$gt: ISODate("2018-03-31T00:00:00.000Z")},
            activities: a._id.str
        }, {_id: 1}).map(i => i._id.str));
        db.MOJ9670_backupDeleteAfterJul18.insert(a);
        db.activities.remove({_id: a._id}); /* comment out this line for a dry run */
        print(`${a.code} ${a.labRequestRef}`);
    } else {
        prev_a = a.labRequestRef;
    }
});
db.activities.find({timestamp: {$gt: ISODate("2018-03-31T00:00:00.000Z")}, actType: "TREATMENT", code: "3541H"}).count();