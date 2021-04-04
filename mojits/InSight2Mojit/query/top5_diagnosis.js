// jshint ignore: start

var pipeline = [
    {
        $match: {
            actType: "DIAGNOSIS"
        }
    },
    {
        $group: {
            _id: "$code",
            amount: {
                $sum: 1
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
