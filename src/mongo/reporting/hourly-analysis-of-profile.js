/**
 * User: rrrw
 * Date: 08/02/2017  12:46 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global db, ISODate */
"use strict";
var project1 = { mins: { $minute: "$ts" }, millis:1 };
var project2 = { grp: {$cond: [
    {$lt: ["$mins", 10]}, {$concat: ["0-9"]},
    {
        $cond: [
            {$lt: ["$mins", 20]}, {$concat: ["10-19"]},
            {
                $cond: [
                    {$lt: ["$mins", 30]}, {$concat: ["20-29"]},
                    {
                        $cond: [
                            {$lt: ["$mins", 40]}, {$concat: ["30-39"]},
                            {
                                $cond: [
                                    {$lt: ["$mins", 50]}, {$concat: ["40-49"]}, {$concat: ["50-59"]}
                                ]
                            }
                        ]
                    }
                ]
            }
        ]
    }
]}, millis:1 };

db.system.profile.aggregate([{$match:{ts:{$gt:ISODate("2017-02-08T07:00:00.000Z")}}},{$project:project1}, {$project:project2}, {$group:{_id:"$grp",cnt:{$sum:1},sum:{$sum:"$millis"}}}, {$project:{_id:1, cnt:1, sum:1, avg:{$divide:["$sum","$cnt"]}}}]);