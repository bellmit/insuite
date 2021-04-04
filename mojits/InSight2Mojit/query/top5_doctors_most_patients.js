// jshint ignore: start

var pipeline = [
    {
        $group: {
            _id: {
                employeeId: "$employeeId",
                patientId: "$patientId"
            },
            employeeName: {
                $first: "$employeeName"
            }
        }
    },
    {
        $group: {
            _id: "$_id.employeeId",
            employeeName: {
                $first: "$employeeName"
            },
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