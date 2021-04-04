// jshint ignore: start

var pipeline = [
    {
        $project: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
            patientId: "$patientId"
        }
    },
    {
        $group: {
            _id: "$date",
            patients: {$addToSet: "$patientId"}
        }
    },
    {
        $project: {
            _id: "$_id",
            amount: {
                $size: "$patients"
            }
        }
    },
    {
        $group: {
            _id: 0,
            amount: {
                $sum: "$amount"
            }
        }
    }
];
db.reportings.aggregate(pipeline);