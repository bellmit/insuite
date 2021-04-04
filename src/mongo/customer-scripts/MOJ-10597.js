/**
 * User: abhijit.baldawa
 * Date: 16.11.18  10:46
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global db, ObjectId, print */

function cleanUpGdtLogs() {
    const
        aggregateResArr = db.gdtlogs.aggregate([
                            {$project:{fileHash:1, _id:1, activityId:1 }},
                            {$group: {_id:"$fileHash", gdtLogs: {$push: "$$ROOT"}, activityIds: {$addToSet: "$activityId"}, count: {$sum: 1} }},
                            {$match: {count:{$gt:1}} }
                          ]).toArray();

    let
        activityIdsToKeepArr = new Set(),
        activityIdsToDelete = new Set(),
        totalGdtLogsDeleted = 0;

    for( let gdtAggregateRecord of aggregateResArr ) {
        let
            keepGdtLogWithActivityId = null,
            keepGdtLogWithId,
            hasKeptOneGdtLog = false;

        if( gdtAggregateRecord.activityIds.length ) {
            keepGdtLogWithActivityId = gdtAggregateRecord.activityIds[gdtAggregateRecord.activityIds.length - 1];
            activityIdsToKeepArr.add(keepGdtLogWithActivityId);
        } else {
            keepGdtLogWithId = gdtAggregateRecord.gdtLogs[gdtAggregateRecord.gdtLogs.length - 1]._id;
        }

        for( let gdtLog of gdtAggregateRecord.gdtLogs ) {
            if( (gdtLog._id !== keepGdtLogWithId && gdtLog.activityId !== keepGdtLogWithActivityId) || hasKeptOneGdtLog ) {
                db.gdtlogs.deleteOne({_id: gdtLog._id});
                totalGdtLogsDeleted++;

                if( gdtLog.activityId && !activityIdsToKeepArr.has(gdtLog.activityId) ) {
                    activityIdsToDelete.add(gdtLog.activityId);
                }

                print(`cleanUpGdtLogs: Deleted gdtLog._id = ${gdtLog._id.str}`);
            } else {
                hasKeptOneGdtLog = true;
            }
        }
    }

    for( let activityId of [...activityIdsToDelete] ) {
        const
            activityObj = db.activities.findOne({_id: ObjectId(activityId)});

        db.activities.deleteOne({_id: activityObj._id});
        db.MOJ_10597_activitiesbckp.insert(activityObj);

        print(`cleanUpGdtLogs: deleted activity _id = ${activityId}`);
    }

    print(`cleanUpGdtLogs: Completed. Total activities deleted = ${activityIdsToDelete.size} and total gdtlogs deleted = ${totalGdtLogsDeleted}`);
}

function cleanUpActivities() {
    const
        casefoldersArr = db.activities.aggregate([
                              { $match: {subType : "IMPF", actType:"FINDING" } },
                              { $group: { _id: "$caseFolderId", count: {$sum: 1} } },
                              { $match: { count: {$gt:1} } }
                           ]).toArray();

    let
        totalActivitiesDeleted = 0;

    for( let casefolderObj of casefoldersArr ) {
        const
            aggregateByDateArr = db.activities.aggregate([
                                    { $match: {subType : "IMPF", actType:"FINDING", caseFolderId: casefolderObj._id} },
                                    {
                                        $project: {
                                            formattedDay: {
                                                "$dateToString": { "format": "%d-%m", "date": "$timestamp" }
                                            },
                                            timestamp: 1,
                                            content:1,
                                            _id: 1,
                                            caseFolderId: 1
                                        }
                                    },
                                    { $sort: {_id: 1} },
                                    {
                                        $group: {
                                            _id: { f: "$formattedDay", c: "$content"},
                                            activities: {$push: "$$ROOT"},
                                            totalActivities: {$sum: 1}
                                        }
                                    },
                                    {$match: {totalActivities:{$gt:2}} }
                                 ]).toArray();

        for( let aggregateByDateObj of aggregateByDateArr ) {
            for( let [index, activity] of aggregateByDateObj.activities.entries() ) {
                if( index === 0 ) {
                    continue;
                }

                const fullActivity = db.activities.findOne({_id: activity._id});

                db.activities.deleteOne({_id: activity._id});
                db.MOJ_10597_activitiesbckp.insert(fullActivity);
                totalActivitiesDeleted++;

                print(`cleanUpActivities: deleted activity _id = ${activity._id.str}`);
            }
        }
    }

    print(`cleanUpActivities: Completed. Total activities deleted = ${totalActivitiesDeleted}`);
}


function unassignDanglingGdtLogs() {
    const
        assignedgdtLogsArr = db.gdtlogs.find({status:"PROCESSED"}).toArray();

    let
        totalGdtLogsUnassigned = 0;

    for( let assignedGdtLog of assignedgdtLogsArr ) {
        const activityObj = db.activities.findOne({_id: ObjectId(assignedGdtLog.activityId)});

        if( !activityObj ) {
            db.gdtlogs.update({_id: assignedGdtLog._id}, {$set: {status: "UNPROCESSED"}, $unset: {patientId: 1, activityId: 1} });
            totalGdtLogsUnassigned++;

            print(`unassignDanglingGdtLogs: Unclaiming dangling gdtLogId: ${assignedGdtLog._id.str} from non existent activityId: ${assignedGdtLog.activityId}`);
        }
    }

    print(`unassignDanglingGdtLogs: Completed. Total unclaimed dangling gdtLogs = ${totalGdtLogsUnassigned}`);
}

cleanUpGdtLogs();
cleanUpActivities();
unassignDanglingGdtLogs();