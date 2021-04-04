// jshint ignore: start

var pipeline = [
    {
        $match: {
            patientGender: "male", // select, enums: male, female
            patientAge: {
                $gte: 10,
                $lte: 90
            },
            employeeId: "100000000000000000000003"
        }
    },
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