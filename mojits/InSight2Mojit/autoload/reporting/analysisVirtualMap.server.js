/*global YUI */



YUI.add( 'analysisVirtualMap', function( Y/*, NAME*/ ) {

    var map = {
        ageGroup: {
            originalField: 'age',
            query: {
                $cond: [
                    {$lt: ["$age", 12]},
                    {$concat: ["0-12"]},
                    {
                        $cond: [
                            {$lt: ["$age", 18]},
                            {$concat: ["12-18"]},
                            {
                                $cond: [
                                    {$lt: ["$age", 25]},
                                    {$concat: ["18-25"]},
                                    {
                                        $cond: [
                                            {$lt: ["$age", 35]},
                                            {$concat: ["25-35"]},
                                            {
                                                $cond: [
                                                    {$lt: ["$age", 45]},
                                                    {$concat: ["35-45"]},
                                                    {
                                                        $cond: [
                                                            {$lt: ["$age", 55]},
                                                            {$concat: ["45-55"]},
                                                            {
                                                                $cond: [
                                                                    {$lt: ["$age", 65]},
                                                                    {$concat: ["55-65"]},
                                                                    {
                                                                        $cond: [
                                                                            {$lt: ["$age", 75]},
                                                                            {$concat: ["65-75"]},
                                                                            {$concat: ["75+"]}
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
        },
        mediCode: {
            originalField: 'code',
            query: {
                $cond: [
                    {$eq: ['$actType', 'MEDICATION']},
                    '$code', '_EMPTY_'
                ]
            }
        },
        diagCode: {
            originalField: 'code',
            query: {
                $cond: [
                    {$eq: ['$actType', 'DIAGNOSIS']},
                    '$code', '_EMPTY_'
                ]
            }
        },
        treatCode: {
            originalField: 'code',
            query: {
                $cond: [
                    {$eq: ['$actType', 'TREATMENT']},
                    '$code', '_EMPTY_'
                ]
            }
        }
    };

    function getMap(name) {
        return map[name] || null;
    }

    Y.namespace( 'doccirrus.insight2' ).analysisVirtualMap = {
        getMap: getMap
    };

}, '0.0.1', {requires: [
]});