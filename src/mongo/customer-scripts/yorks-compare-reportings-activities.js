/**
 * User: rrrw
 * Date: 06/12/2016  11:53 AM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global db, ISODate, ObjectId */
"use strict";

db.reportings.aggregate( {
        $match: {
            timestampDate: {$gt: ISODate( "2016-07-09T08:02:03Z" )},
            actType: "TREATMENT"
        }
    },
    {
        $project: { actType:1, timestampDate:1, activityId:1 }
    },
    { $group: {
        _id:"$activityId",
        cnt: {$sum:1}
    }},{
    $sort: {cnt:-1}
    });



db.casefolders.find({type:"PUBLIC", _id:{$gt:ObjectId("57beebc74982ed5904c28423")}}).forEach(function chkAndDel(item) {
    db.activities.update(
        {
            actType: {$in: ["SCHEIN", "TREATMENT"]},
            timestamp: {$lt: ISODate( "2016-09-30T22:00:00.000Z" )},
            caseFolderId: item._id.str
        }, {
            $set: {status: "BILLED"}
        }, {
            multi: true
        } );
});
/*
    print("_______CF________   " + item._id.str)
    print( "APPR: " + db.activities.count({actType:{$in:["SCHEIN","TREATMENT"]}, timestamp: {$lt: ISODate( "2016-09-30T22:00:00.000Z" )}, caseFolderId:item._id.str, status:"APPROVED"}) );
    print( "VALID: " + db.activities.count({actType:{$in:["SCHEIN","TREATMENT"]}, timestamp: {$lt: ISODate( "2016-09-30T22:00:00.000Z" )}, caseFolderId:item._id.str, status:"VALID"}) );
    print( "BILL: " + db.activities.count({actType:{$in:["SCHEIN","TREATMENT"]}, timestamp: {$lt: ISODate( "2016-09-30T22:00:00.000Z" )}, caseFolderId:item._id.str, status:"BILLED"}) );
    print( "CAN: " + db.activities.count({actType:{$in:["SCHEIN","TREATMENT"]}, timestamp: {$lt: ISODate( "2016-09-30T22:00:00.000Z" )}, caseFolderId:item._id.str, status:"CANCELLED"}) );
})*/
