// jshint ignore: start

var pipeline = [
    {
        $group: {
            _id: "$patientId",
            gender: {
                $first: "$patientGender"
            }
        }
    },
    {
        $group: {
            _id: "$gender",
            amount: {
                $sum: 1
            }
        }
    }
];
db.reportings.aggregate(pipeline);