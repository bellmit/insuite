// jshint ignore: start

var pipeline = [
    {
        $match: {
            $or: [
                {actType: "DIAGNOSIS"},
                {actType: "TREATMENT"}
            ]
        }
    },
    {
        $group: {
            _id: "$caseFolderId",
            price: {
                $sum: "$price"
            },
            items: {
                $push: {
                    code: "$code",
                    actType: "$actType"
                }
            }
        }
    },
    {
        $unwind: "$items"
    },
    {
        $match: {
            "items.actType": "DIAGNOSIS"
        }
    },
    {
        $project: {
            _id: "$items.code",
            amount: "$price"
        }
    },
    {
        $group: {
            _id: "$_id",
            amount: {
                $sum: "$amount"
            }
        }
    },
    {
        $sort: {
            amount: -1
        }
    },
    {
        $limit: 5
    }
];
db.reportings.aggregate(pipeline);