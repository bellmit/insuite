// jshint ignore: start

var pipeline = [
    {
        $group: {
            _id: "$patientId",
            dob: {
                $max: "$dob"
            }
        }
    },
    {
        $project: {
            _id: "$_id",
            patientAge: {
                $subtract: [
                    {$year: ISODate()},
                    {$year: "$dob"}
                ]
            }
        }
    },
    {
        $project: {
            "ageGroup": {
                $cond: [
                    { $lt: [ "$patientAge" , 12 ] },
                    { $concat: [ "0-12" ] },
                    {
                        $cond: [
                            { $lt: [ "$patientAge" , 18 ] },
                            { $concat: [ "12-18" ] },
                            {
                                $cond: [
                                    { $lt: [ "$patientAge", 25 ] },
                                    { $concat: [ "18-25" ] },
                                    {
                                        $cond: [
                                            { $lt: [ "$patientAge", 35 ] },
                                            { $concat: [ "25-35" ] },
                                            {
                                                $cond: [
                                                    { $lt: [ "$patientAge", 45 ] },
                                                    { $concat: [ "35-45" ] },
                                                    {
                                                        $cond: [
                                                            { $lt: [ "$patientAge", 55 ] },
                                                            { $concat: [ "45-55" ] },
                                                            {
                                                                $cond: [
                                                                    { $lt: [ "$patientAge", 65 ] },
                                                                    { $concat: [ "55-65" ] },
                                                                    {
                                                                        $cond: [
                                                                            { $lt: [ "$patientAge", 75 ] },
                                                                            { $concat: [ "65-75" ] },
                                                                            { $concat: [ "75+" ] }
                                                                        ]
                                                                    }
                                                                ]
                                                            }
                                                        ]
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        }
    },
    {
        $group: {
            _id: "$ageGroup",
            amount: {
                $sum: 1
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