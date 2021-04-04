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
        $sort: {
            _id: 1
        }
    }
];
db.reportings.aggregate(pipeline);