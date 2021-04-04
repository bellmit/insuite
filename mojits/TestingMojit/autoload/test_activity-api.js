/**
 * User: rrrw
 * Date: 15.08.13  16:14
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI*/



/**
 *
 * Work-in-Progress:  after the actual test is run, needs ASSERT statements
 * to pick up the true success of the call -- i.e. inspect the DB (directly?)
 * and see what objects are contained in it.
 *
 *
 */

YUI.add( 'test_activity-api', function( Y, NAME ) {

        var
                   moment = require( 'moment' ),
            config = { tenantId: '1111111111' },
        //            user = Y.doccirrus.auth.getSUForTenant( config.tenantId ),
            testData = {
                "0": "activity",
                "actType": "FROMPATIENT",
                "timestamp": moment().add('m',10 ).toJSON(),
                "patientId": "10000000000000000000000b",
                "employeeId": "111ae9604013671c12c1c111",
                "locationId": "000000000000000000000001",
                "unit": "",
                "actualUnit": "",
                "content": "Aw: Sprachübung 2",
                "observationValuation": "",
                "observationTherapyStatus": "",
                "fk5073": "",
                "fk5072": "",
                "fk5071": "",
                "fk5070": "",
                "fk5044": "",
                "fk5040": "",
                "fk5037": "",
                "fk5034": "",
                "fk5026": "",
                "fk5025": "",
                "fk5024": "",
                "fk5023": "",
                "fk5019": "",
                "fk5017": "",
                "fk5013": "",
                "fk5008": "",
                "fk5005": "",
                "fk5002": "",
                "forInsuranceType": "",
                "fk5042Set": [
                    {
                        "_id": "54169267ffffefc92025693c",
                        "fk5043": "",
                        "fk5042": ""
                    }
                ],
                "fk5038": "",
                "fk5020Set": [
                    {
                        "_id": "54169267ffffefc92025693d",
                        "fk5021": "",
                        "fk5020": "false"
                    }
                ],
                "fk5018": "",
                "fk5016": "",
                "fk5015": "",
                "fk4217": "",
                "fk4241": "",
                "fk4219": "",
                "fk4236": "false",
                "fk4234": "false",
                "fk4206": "",
                "fk4123": "",
                "fk4125to": "",
                "fk4125from": "",
                "fk4126": "",
                "fk4124": "",
                "scheinSlipMedicalTreatment": "",
                "scheinNextTherapist": "",
                "scheinClinicalTreatmentTo": "",
                "scheinClinicalTreatmentFrom": ""
            },
            testSuite = {};

        Y.mix( testSuite, {

            testCreateActivityFromExternalFuture: function( callback ) {
                // tests MOJ-2335
                var
                    user = Y.doccirrus.auth.getSUForTenant( config.tenantId );
                Y.log( '>>>>  activity in the future: ' + testData.timestamp, 'debug', NAME );
                Y.doccirrus.filters.setSkipCheck( testData, true );
                Y.doccirrus.mongodb.runDb( {
                        user: user,
                        migrate: true,
                        model: "activity",
                        action: "post",
                        data: testData,
                        options: {entireRec: true}
                    },
                    function( err, result ) {
                        console.log('NOTE:  THESE ERRORS WILL DISAPPEAR WITH COMPLETION OF MOJ-2336 AND USE OF API.');
                        console.log( '\n\n>>>> err: ', err, '\n\n>>>>result: ', result );
                        console.dir( err );
                        Y.log( JSON.stringify( err ), 'info', NAME );
                        callback( err, result );
                    } );

                // Should use the API instead! MOJ-2336
                //                args =  {
                //                    user: user,
                //                    model: "activity",
                //                    action: "post",
                //                    data: testData,
                //                    options: {entireRec: true},
                //                    callback:                     function( err, result ) {
                //                        console.log( '\n\n>>>> err: ', err, '\n\n>>>>result: ', result );
                //                        console.dir( err );
                //                        Y.log( JSON.stringify( err ), 'info', NAME );
                //                        callback( err, result );
                //                    }
                //
                //                };
                //                Y.doccirrus.api.activity.post( args );
            }

        } );

        Y.namespace( 'doccirrus.test' )['activity-api'] = testSuite;
    },
    '0.0.1', {requires: []}
);
