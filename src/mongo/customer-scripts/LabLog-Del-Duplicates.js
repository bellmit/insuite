/**
 * User: rrrw
 * Date: 18/07/2018  17:11
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global db, print*/

/**
 * Assumptions are:
 * - that the user has not cleaned up any duplicate TREATMENTS
 * - that TREATMENTS are created exactly on ReportDate
 * - we can clean up LABLOGS first and then TREATMENTS, LABDATA.
 * - and then LABTESTS
 */

/**
 * STEP 0:  Define necessary function.  Relevant for STEP 2, 3, 4...
 */
/**
 * When there is no labRequestRef, we need to analyse the times of the TREATMENTS
 * and then work with such lists.
 * @param duplicateList
 * @returns {Array}
 */
function getActivitiesByTestDateForLabLogs(duplicateList) {
    var res = {};

    function getDateListWithGnrs(llId, res) {
        var ds = [];
        db.SUP9085backupll.find({"_id": llId}).next().l_data.records.forEach(
            (rec) => {
                if (!rec.reportDate || !rec.testId) {
                    return;
                }
                ds.push(rec.reportDate);
                if (!res[rec.reportDate]) {
                    res[rec.reportDate] = {cnt:0,list:[]};
                }
                rec.testId.reduce((val, t) => {
                    var a = t.gnr ? t.gnr.length : 0;
                    val.cnt += a;
                    return val;
                }, res[rec.reportDate]); /*reduce with side-effect*/
            }
        );
    }

    duplicateList.forEach(d => getDateListWithGnrs(d, res));

    /* generate datetime stamps for the gnr containing records */
    var dates = Object.keys(res).map( a => new Date(a));

    /* find activities for those dates, and enrich the res data structure */
    dates.forEach( d => {
        db.activities.find({
            timestamp: d,
            /*            _id: {$gt: ObjectId("5a4ed8c66e146b9be6d1bcba")},*/
            actType: {$in:["TREATMENT","LABDATA"]}
        },{_id:1, caseFolderId:1, patientId:1, timestamp:1, actType:1, code:1, content:1, invoiceId :1, invoiceLogId :1}).sort({_id: -1}).forEach(a => {
            res[d].list.push(a);
        });
    });
    return res;
}


/**
 * STEP 1:  find duplicate logs and move them to a backup collection.
 *
 * Aggregate and keep the first.
 * SUP9085lists --> TEMP COLLECTION, overwritten with each run, should be safe though
 * SUP9085backupll --> "PERMANENT" COLLECTION, here we add all the lablogs that were removed. Once removed they can be kept for a long time.
 */

db.lablogs.aggregate([{
    $group: {
        _id: "$fileHash",
        cnt: {$sum: 1},
        list: {$addToSet: "$_id"}
    }
}, {$match: {cnt: {$gt: 1}}}, {$out: "SUP9085lists"}]);

db.SUP9085lists.find();
db.SUP9085lists.find().forEach(dlist => {
    dlist.list.forEach((dId, ix) => {
        if (ix > 0) {
            let llRs = db.lablogs.find({_id: dId});
            if (llRs.hasNext()) {
                db.SUP9085backupll.insert(llRs.next());
                db.lablogs.remove({_id: dId});
                print(`backed up & removed: ${dId.str}`);
            }
        }
    });
});

/**
 * STEP 2: Report about TREATMENTS and LABDATAs
 */
/**
 * Cycle through the list of lablogs and gather activities for all of them.
 */
db.SUP9085backupll.aggregate([{
    $group: {
        _id: "$fileHash",
        cnt: {$sum: 1},
        list: {$addToSet: "$_id"}
    }
}]).forEach(dupLL => {
    print(`-------- LabLog with filehash: ${dupLL._id} --------`);

    var aGroupedIds = getActivitiesByTestDateForLabLogs(dupLL.list);

    var dates = Object.keys(aGroupedIds).map( a => new Date(a));
    /* print overview */
    dates.forEach( date => {
        if( aGroupedIds[date].list && aGroupedIds[date].list.length ) {
            print(`-------- Activities for Date: ${date} --------`);
            aGroupedIds[date].list.forEach( a => {
                print(`${a._id.str} ${a.caseFolderId} ${a.timestamp} ${a.actType} ${a.code || ''} ${a.content.substr(0, 10)} ${a.invoiceId || ''} ${a.invoiceLogId || ''}`);
            });
        }
    });
});

/**
 * STEP 3:
 * Clean up LABDATA
 */

db.SUP9085backupll.aggregate([{
    $group: {
        _id: "$fileHash",
        cnt: {$sum: 1},
        list: {$addToSet: "$_id"}
    }
}]).forEach(dupLL => {
    print(`-------- LabLog with filehash: ${dupLL._id} --------`);

    var aGroupedIds = getActivitiesByTestDateForLabLogs(dupLL.list);

    var dates = Object.keys(aGroupedIds).map( a => new Date(a));
    /* print overview */
    dates.forEach( date => {
        if( aGroupedIds[date].list && aGroupedIds[date].list.length ) {
            print(`-------- Activities for Date: ${date} --------`);
            let DUP_CF = '';
            aGroupedIds[date].list.forEach( a => {
                if( a.actType === 'LABDATA') {
                    if(a.caseFolderId === DUP_CF) {
                        print(`DELETING ${a._id.str} ${a.caseFolderId} ${a.timestamp} ${a.actType} ${a.code || ''} ${a.content.substr(0, 10)} ${a.invoiceId || ''} ${a.invoiceLogId || ''}`);
                        db.SUP9085backupact.insert( db.activities.find({_id:a._id}).next() );
                        db.activities.remove({_id:a._id});
                    } else {
                        DUP_CF = a.caseFolderId;
                    }
                }
            });
        }
    });
});

/**
 * STEP 4:
 * Clean up TREATMENT --> cannot be done automatically without labRequestRef, two branches:
 *
 * 1) without labRequestRef
 * create list of links to the casefolders that need to be checked.
 *
 * 2) with labRequestRef
 * identify the activities for the deleted labRequestRef and remove those after backing up.
 *
 */

/*
 * 1)  print overview with deep links.
 */
db.SUP9085backupll.aggregate([{
    $group: {
        _id: "$fileHash",
        cnt: {$sum: 1},
        list: {$addToSet: "$_id"}
    }
}]).forEach(dupLL => {
    var aGroupedIds = getActivitiesByTestDateForLabLogs(dupLL.list);
    var dates = Object.keys(aGroupedIds).map( a => new Date(a));
    dates.forEach( date => {
        var DUP_CF = '';
        if( aGroupedIds[date].list && aGroupedIds[date].list.length ) {
            print(`-------- Activities for Date: ${date} --------`);
            aGroupedIds[date].list.forEach( a => {
                if( a.actType === 'TREATMENT') {
                    if(a.caseFolderId === DUP_CF) {
                        print(`  ${a._id.str} ${a.caseFolderId} ${a.timestamp} ${a.actType} ${a.code || ''} ${a.invoiceId || ''} ${a.invoiceLogId || ''}`);
                    } else {
                        print(`check eickhoff folder: ${a.patientId} ${a.caseFolderId} `);
                        print(` ${a._id.str} ${a.caseFolderId} ${a.timestamp} ${a.actType} ${a.code || ''} ${a.invoiceId || ''} ${a.invoiceLogId || ''}`);
                        DUP_CF = a.caseFolderId;
                    }
                }
            });
        }
    });
});

/*
 *  2) -- TBD
 */




///  --------------------- ONCE OFF FOR WILMERSDORF ----------------
/*eslint-disable*/
function doCleanup() {

    var aGroupedIds = getActivitiesByTestDateForLabLogs( [ ObjectId("5b7f9a93a76c80e143c50eb3") ]);

    var dates = Object.keys(aGroupedIds).map( a => new Date(a));
    /* print overview */
    dates.forEach( date => {
        if( aGroupedIds[date].list && aGroupedIds[date].list.length ) {
            print(`-------- Activities for Date: ${date} --------`);
            let DUP_CF = '';
            aGroupedIds[date].list.forEach( a => {
                        print(`DELETING ${a._id.str} ${a.caseFolderId} ${a.timestamp} ${a.actType} ${a.code || ''} ${a.content.substr(0, 10)} ${a.invoiceId || ''} ${a.invoiceLogId || ''}`);
                        db.SUP9085backupact.insert( db.activities.find({_id:a._id}).next() );
                        print(`db.activities.remove({_id:${a._id});`);
            });
        }
    });
}