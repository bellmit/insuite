// jshint ignore: start

var pipeline = [
    {
        $match: {
            actType: "TREATMENT"
        }
    },
    {
        $group: {
            _id: "$employeeId",
            amount: {
                $sum: "$price"
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