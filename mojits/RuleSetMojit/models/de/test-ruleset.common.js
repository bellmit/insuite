/*
 * Author: rw
 * Date: 20.02.14  09:34
 * (c) 2014, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

/**
 * Ruleset for TESTING ONLY.
 *
 *
 */

YUI.add( 'test-ruleset', function( Y, NAME ) {

        var
            rules = {
                "_version": 1.0,
                "_name": "TEST",
                "_meta": "Some more machine readable metadata.",
                "_country": "D",
                "fields": {
                    "location": [
                        {"fieldCode": "0000", "path": "locname", "st": "Location_T", "type": "String", "ruleIds": [ 89, 890 ],
                            validate: "email" }
                    ]
                }
            };
        NAME = Y.doccirrus.schemaloader.deriveRuleSetName( NAME );

        function appliesTo( data, callback ) {
            var result = false;
            if( data && data.locname && -1 < data.locname.indexOf( '__TEST' ) ) {
                result = true;
                Y.log( '  ++ TEST APPLIES' );
            }
            // test always applies
            if( callback ) {
                callback( null, result );
            }
            return result;
        }

        Y.namespace( 'doccirrus.ruleset' )[NAME] = {

            definition: rules,

            appliesTo: appliesTo,

            name: NAME
        };

       /* // build into a test, TBD... tests several useful things.

        function test() {
            var
                user = Y.doccirrus.auth.getSUForLocal(),
                a;

            Y.log( '\n  Testing rules\n=================' );

            function callback( err, data ) {
                Y.log( '  ++ POST came back: ' + err + '\n' + JSON.stringify( data ) );
            }

            // map test
            a = Y.doccirrus.rules.mapData( [
                {"actType": "MEDICATION", "activities": ["52df927d979e340000000032", "52df9265979e340000000030"], "code": "VolonA10", "editor": [
                    {"name": "Ron Wertlen", "_id": "52e276ca60197e00000000e6"},
                    {"name": "Ron Wertlen", "_id": "52fc9b6a8a46dd0549001450"}
                ], "employeeId": "111ae9604013671c12c1c111", "formId": "", "formVersion": "", "patientId": "5284e3a561545a0000000023", "price": 0, "status": "CREATED", "timestamp": "2014-01-24T14:20:58.154Z", "unit": "-"},
                {"actType": "TREATMENT", "catalogRef": "", "code": "C2", "status": "CREATED", "timestamp": "2014-02-13T10:16:17.915Z", "unit": "Euro"}
            ],
                'activity'
            );

            Y.log( '   ++ Maptest:\n' + JSON.stringify( a, 4 ) );

            // wait a bit lets get clean output.
            setTimeout( function() {
                    // Y.doccirrus.api.patient.activitiesExportKBV( Y.doccirrus.auth.getSUForTenant( '4795c10b0000' ), { bsnr: "391234511", quarter:"1", year: "2014" }, function( err, result ) {
                    Y.doccirrus.api.patient.activitiesExportKBV( Y.doccirrus.auth.getSUForTenant( 'df6c7cfc11' ), { bsnr: "391234511", quarter: "1", year: "2014" }, function( err, result ) {
                        if( err ) {
                            Y.log( '   ++ Exporttest (ERROR):\n' + JSON.stringify( err, 4 ) );
                        }
                        else {
                            Y.log( '   ++ Exporttest:\n' + JSON.stringify( result, 4 ) );
                        }
                    } );
                },
                1000 );

            Y.log( '   ++ Write test:\n' );

            function clearTestData() {
                Y.doccirrus.mongodb.runDb( { user: user, action: 'delete', model: 'location', query: "5555566685555565c5000017"}, callback );
                Y.doccirrus.mongodb.runDb( { user: user, action: 'delete', model: 'location', query: "5555566685555565c5000019"}, callback );
            }

            clearTestData();
            setTimeout(
                function testRuleDrivenInsert() {
                    Y.doccirrus.mongodb.runDb( { user: user, action: 'post', model: 'location',
                        data: {
                            "_id": "5555566685555565c5000017",
                            "email": "kur@thur.de",
                            "fax": "",
                            "phone": "070525345",
                            "houseno": "23",
                            "street": "Henningsstr",
                            "zip": "23455",
                            "city": "Thur",
                            "country": "Deutschland",
                            "locname": "Filiale Obermuckshausens __TEST 123",
                            "openTimes": [
                                { "end": [    18, 0 ], "start": [    8, 0 ], "days": [    1, 2, 3, 4, 5 ] }
                            ],
                            skipcheck_: true
                        }
                    }, callback );
                    Y.doccirrus.mongodb.runDb( { user: user, action: 'post', model: 'location',
                        data: {
                            "_id": "5555566685555565c5000019",
                            "email": "kur@thur.de",
                            "fax": "",
                            "phone": "070525345",
                            "houseno": "23",
                            "street": "Henningsstr",
                            "zip": "23455",
                            "city": "Thur",
                            "country": "Deutschland",
                            "locname": "__TEST@mypraxis.de",
                            "openTimes": [
                                { "end": [    18, 0 ], "start": [    8, 0 ], "days": [    1, 2, 3, 4, 5 ] }
                            ],
                            skipcheck_: true
                        }
                    }, callback );

                    setTimeout( clearTestData, 300 );
                }, 100 );
        }

        setTimeout( test, 3000 );*/
    },
    '0.0.1', {requires: ['dcschemaloader']}
);
