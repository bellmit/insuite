/**
 * User: rrrw
 * Date: 15.08.13  16:14
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*jslint anon:true, nomen:true*/
/*global YUI*/



YUI.add( 'test-rest_2-api', function( Y ) {
        // jshint unused:false

        var
            baseUrl = 'http://1111111111.dev.dc/2',
            targetUrl,
            patient = {
                "kbvDob": "04.04.1970",
                "jobTitle": "QA Tester",
                "workingAt": "Doc Cirrus GmbH",
                "careDegree": "NO",
                "dob": "2008-04-03T22:00:00.000Z",
                "primaryDoc": "111ae9604013671c12c1c111",
                "patientNumber": 211,
                "sendPatientReceipt": false,
                "gender": "FEMALE",
                "talk": "MS",
                "markers": [],
                "physicians": [
                    "54be2294c404c1d77a286c6f"
                ],
                "insuranceStatus": [
                    {
                        "insuranceNo": "M987654321",
                        "insuranceId": "107277500",
                        "insuranceName": "Techniker-Krankenkasse",
                        "insurancePrintName": "Techniker Krankenkasse",
                        "insuranceGrpId": "95605",
                        "type": "PUBLIC",
                        "billingFactor": "privatversicherte",
                        "kv": "98",
                        "locationId": "000000000000000000000001",
                        "_id": "54be764fc404c1d77a286d4e",
                        "cardSwipe": null,
                        "address2": "",
                        "address1": "",
                        "bgNumber": "",
                        "unzkv": [],
                        "fused": false,
                        "feeSchedule": "2",
                        "costCarrierBillingGroup": "11",
                        "costCarrierBillingSection": "00",
                        "dmp": "1",
                        "persGroup": "",
                        "insuranceKind": "1",
                        "fk4110": "2015-12-30T23:00:00.000Z",
                        "fk4133": null
                    },
                    {
                        "insuranceId": "120390466",
                        "insuranceName": "BG Energie Textil Elektro Medienerzeugnisse",
                        "insurancePrintName": "BG Energie Textil Elektro Medienerzeugnisse",
                        "insuranceGrpId": "",
                        "type": "BG",
                        "billingFactor": "privatversicherte",
                        "notes": "Test test",
                        "locationId": "000000000000000000000001",
                        "_id": "553f59a22b1941713a33144b",
                        "address2": "38100 Braunschweig",
                        "address1": "Lessingplatz 13",
                        "bgNumber": "9435788349",
                        "unzkv": [],
                        "fused": false,
                        "feeSchedule": "3",
                        "costCarrierBillingGroup": "00",
                        "costCarrierBillingSection": "00",
                        "dmp": "",
                        "persGroup": "",
                        "insuranceKind": "",
                        "fk4110": null,
                        "fk4133": null
                    }
                ],
                "addresses": [
                    {
                        "kind": "OFFICIAL",
                        "_id": "54be764fc404c1d77a286d4f",
                        "addon": "",
                        "countryCode": "D",
                        "country": "Deutschland",
                        "city": "Berlin",
                        "zip": "12103",
                        "houseno": "82",
                        "street": "Bessemerstr"
                    }
                ],
                "communications": [
                    {
                        "type": "PHONEJOB",
                        "value": "030-1234567890",
                        "_id": "54be764fc404c1d77a286d51"
                    },
                    {
                        "type": "EMAILJOB",
                        "value": "qa-patient1@doc-cirrus.com",
                        "_id": "54be764fc404c1d77a286d50"
                    }
                ],
                "lastname": "A001-v2.1.2 (Ron)",
                "fk3120": "",
                "middlename": "",
                "nameaffix": "",
                "firstname": "A001-v2.1.2",
                "title": "",
                "activeCaseFolderId": "553f59ec2b1941713a331451"
            },
            patientPut = Y.mix( {
                "firstname": "MA",
                "lastname": "after PUT"
            }, patient ),
            patientSubDoc = {
                field: 'communications',
                data: {
                    "type": "EMAILJOB",
                    "value": "ma@doc-cirrus.com",
                    "_id": "54be764fc404c1d77a286d50"
                }
            },
            activity = {
                "actType": "FROMPATIENT",
                "timestamp": "12.01.1975",
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
                        "fk5043": "0",
                        "fk5042": "0"
                    },
                    {
                        "_id": "54169267ffffefc920211111",
                        "fk5043": "0",
                        "fk5042": "0"
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
                "scheinClinicalTreatmentFrom": "",
                caseNo: '123131' // not while-listed
            },
            activityPut = {
                userContent: 'after update...'
            },
            activitySubDoc = {
                field: 'fk5042Set',
                data: {
                    "_id": "54169267ffffefc92025693c",
                    "fk5043": "1",
                    "fk5042": "1"
                }
            },
            postData, updateData, subDoc,

            testSuite = {

                setTestData: function( callback ) {
                    targetUrl = baseUrl + '/patient';
                    postData = patient;
                    updateData = patientPut;
                    subDoc = patientSubDoc;
                    callback();
                },
                postData: function( callback ) {
                    Y.log( 'postData', 'debug' );
                    function checkResponse( err, response, body ) {
                        body = body[0] || body;
                        Y.log( 'postData response: ' + JSON.stringify( body ) );
                        if( err || !body._id ) {
                            Y.log( 'error from postData: ' + JSON.stringify( err ), 'error' );
                            callback( err || 'no data came back' );
                        } else {
                            postData._id = body._id;
                            updateData._id = postData._id;
                            callback();
                        }

                    }

                    Y.doccirrus.https.externalPost(
                        targetUrl,
                        postData,
                        Y.doccirrus.auth.setInternalAccessOptions(),
                        checkResponse
                    );
                },
                getActivity: function( callback ) {
                    Y.log( 'getActivity: ' + postData._id, 'debug' );

                    function checkResponse( err, response, body ) {
                        body = body[0] || body;
                        var
                            data = body && body.data && body.data[0];
                        Y.log( 'activity get response: ' + JSON.stringify( body ) );
                        if( err || !data || data._id !== postData._id ) {
                            Y.log( 'error from get activity: ' + JSON.stringify( err ), 'error' );
                            callback( err || 'no data came back' );
                        } else {
                            if( Object.keys( postData ).length !== Object.keys( data ).length ) {
                                Y.log( 'got data different than original data', 'warn' );
                            }
                            callback();
                        }
                    }

                    Y.doccirrus.https.externalGet(
                        targetUrl + '/' + postData._id,
                        Y.doccirrus.auth.setInternalAccessOptions(),
                        checkResponse
                    );
                },
                putData: function( callback ) {
                    Y.log( 'putData: ' + JSON.stringify( updateData._id ), 'debug' );

                    function checkResponse( err, response, body ) {
                        body = body[0] || body;
                        Y.log( 'putData response: ' + JSON.stringify( body ) );
                        if( err || !body.message ) {
                            Y.log( 'error in putData: ' + JSON.stringify( err ), 'error' );
                            callback( err || 'no data came back' );
                        } else {
                            postData = Y.merge( postData, updateData );
                            callback();
                        }

                    }

                    Y.doccirrus.https.externalPut(
                        targetUrl + '/' + postData._id,
                        updateData,
                        Y.doccirrus.auth.setInternalAccessOptions(),
                        checkResponse
                    );
                },
                putSubDoc: function( callback ) {
                    Y.log( 'putSubDoc: ' + JSON.stringify( subDoc ), 'debug' );

                    function checkResponse( err, response, body ) {
                        body = body[0] || body;
                        var
                            data = body && body.data;
                        Y.log( 'putSubDoc response: ' + JSON.stringify( response.body ) );
                        if( err || !body.message ) {
                            Y.log( 'error in putSubDoc: ' + JSON.stringify( err ), 'error' );
                            callback( err || 'no data came back' );
                        } else {
                            callback();
                        }

                    }

                    Y.doccirrus.https.externalPut(
                        targetUrl + '/' + postData._id + '/' + subDoc.field + '/' + subDoc.data._id,
                        subDoc.data,
                        Y.doccirrus.auth.setInternalAccessOptions(),
                        checkResponse
                    );
                },
                invalidQuery: function( callback ) {
                    Y.log( 'invalidQuery', 'debug' );

                    function checkResponse( err, response, body ) {
                        body = body[0] || body;
                        var
                            data = body && body.data && body.data[0];
                        Y.log( 'activity invalidQuery response: ' + JSON.stringify( body ) );
                        if( !err || (data && data._id) ) {
                            Y.log( 'error from invalidQuery activity: ' + JSON.stringify( err ), 'error' );
                            callback( err || 'data came back!' );

                        } else {
                            callback();
                        }
                    }

                    Y.doccirrus.https.externalGet(
                        targetUrl + '?dummyField=12345',
                        Y.doccirrus.auth.setInternalAccessOptions(),
                        checkResponse
                    );
                },
                validQuery: function( callback ) {
                    Y.log( 'validQuery', 'debug' );

                    function checkResponse( err, response, body ) {
                        body = body[0] || body;
                        var
                            data = body && body.data && body.data[0];
                        Y.log( 'activity validQuery response: ' + JSON.stringify( body ) );
                        if( err || !data || !data._id ) {
                            Y.log( 'error in validQuery: ' + JSON.stringify( err ), 'error' );
                            callback( err || 'no data came back' );

                        } else {
                            callback();
                        }
                    }

                    Y.doccirrus.https.externalGet(
                        targetUrl + '?firstname=' + postData.firstname,
                        Y.doccirrus.auth.setInternalAccessOptions(),
                        checkResponse
                    );
                },
                deleteData: function( callback ) {
                    Y.log( 'deleteData: ' + postData._id, 'debug' );
                    function checkResponse( err, response, body ) {
                        body = body[0] || body;
                        var
                            data = body && body.data && body.data[0];
                        Y.log( 'deleteData response: ' + JSON.stringify( body ) );
                        if( err || !data || data._id !== postData._id ) {
                            Y.log( 'error in deleteData: ' + JSON.stringify( err ), 'error' );
                            callback( err || 'no data came back' );
                        } else {
                            callback();
                        }
                    }

                    Y.doccirrus.https.externalDelete(
                        targetUrl + '/' + postData._id,
                        {},
                        Y.doccirrus.auth.setInternalAccessOptions(),
                        checkResponse
                    );
                },
                postForbidden: function( callback ) {
                    Y.log( 'postForbidden', 'debug' );
                    function checkResponse( err, response, body ) {
                        body = body[0] || body;
                        Y.log( 'postForbidden response: ' + JSON.stringify( body ) + response.statusCode );
                        if( err && 403 !== response.statusCode ) {
                            Y.log( 'error in postForbidden: ' + JSON.stringify( err ), 'error' );
                            callback( err || 'no data came back' );
                        } else {
                            postData._id = body._id;
                            updateData._id = postData._id;
                            callback();
                        }

                    }

                    Y.doccirrus.https.externalPost(
                        baseUrl + '/company',
                        {coname: 'dummy'},
                        Y.doccirrus.auth.setInternalAccessOptions(),
                        checkResponse
                    );
                }
            };

        Y.namespace( 'doccirrus.test' ).rest_2 = testSuite;
    },
    '0.0.1', {requires: ['patient-api']}
);
