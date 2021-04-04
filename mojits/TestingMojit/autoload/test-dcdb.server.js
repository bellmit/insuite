/**
 * User: rrrw
 * Date: 15.08.13  16:14
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*jslint anon:true, nomen:true*/
/*global YUI*/



/**
 *
 * Whitebox integration tests.
 *
 * Test suite for low level DCDB (and discriminator) functionality.
 *
 * Assumes loadTestData was run.
 *
 * Work-in-Progress:  after the actual test is run, needs ASSERT statements
 * to pick up the true success of the call -- i.e. inspect the DB (directly?)
 * and see what objects are contained in it.
 *
 *
 */

YUI.add( 'test-dcdb', function( Y ) {

        var
            config = { tenantId: '1111111111' },
            test1data = {
                "_id": "10000000000000000000000b",  // loadtestdata
                //_id: "5284dbc23f07870000000046", // 4795c10b0000
                //_id: 535f6dd2895110d70bc0da79,
                careDegree: 'NO',
                dob: "Wed Sep 17 1941 02:00:00 GMT+0200 (CEST)",
                gender: 'FEMALE',
                isPensioner: false,
                kbvDob: '17.09.1941',
                markers: [ '000000000000000000000013',
                    '000000000000000000000015',
                    '000000000000000000000016' ],
                physicians: [],
                primaryDoc: '111ae9604013671c12c1c111',
                images: [],
                affiliates: [],
                insuranceStatus: [
                    {
                        billingFactor: 'privatversicherte',
                        insuranceName: 'HUK24',
                        locationId: '000000000000000000000001',
                        type: 'PRIVATE',
                        feeSchedule: '3',
                        costCarrierBillingGroup: '',
                        costCarrierBillingSection: '',
                        fk4110: null,
                        fk4108: '',
                        cardTypeGeneration: '0',
                        cdmVersion: '5.1.0' }
                ],
                addresses: [
                    { kind: 'OFFICIAL',
                        countryCode: 'D',
                        country: 'Deutschland',
                        city: 'Boos',
                        zip: '88737',
                        houseno: '189',
                        street: 'Reichau ' }
                ],
                communications: [
                    { type: 'PHONEJOB',
                        value: '030692088720'
                    },
                    { type: 'EMAILJOB',
                        value: 'waldtraud@doc-cirrus.com' }
                ],
                prodServices: [],
                accounts: [
                    {
                        accountOwner: 'Waldtraud Dorf',
                        bankBIC: '40040040',
                        bankIBAN: '030030030030',
                        bankName: 'Doc Cirrus Bank',
                        cardType: 'BANK' }
                ],
                lastname: 'Dorf',
                middlename: '',
                nameaffix: '',
                firstname: 'Waldtraud',
                title: '',
                talk: 'MR',
                createPlanned: false,
                "fields_": "talk,title,firstname,nameaffix,middlename,lastname,civilStatus,gender,dob,jobTitle,workingAt,accounts,prodServices,communications,addresses,insuranceStatus,affiliates,images,primaryDoc,physicians,markers,careDegree,fullname,preventions,user,age,status,createPlanned",
                "query": "_id,52dfa12ff25509000000002a"
            },

            testSuite = {};

        Y.mix( testSuite, {

            schemaloader: function( cb ) {
                var
                    s = Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', 'TREATMENT', '-de', '***FEHLER***' );
                cb(
                    null,
                    s
                );
            },

            //
            //
            //
            //
            // ==================  testSubDocArrayPutPatient ===================
            //
            testSubDocArrayPutPatient: function( callback ) {
                var user = Y.doccirrus.auth.getSUForTenant( config.tenantId );

                // hit the db a little
                Y.doccirrus.mongodb.runDb(
                    { model: 'patient', user: user, query: {} },
                    function( err ) {
                        if( err ) {
                            console.log( 'TEST WARMUP ERROR: ', err );
                        }
                    } );

                // now do the put
                Y.doccirrus.api.patient.addPatient(
                    user,
                    test1data,
                    callback
                );
            },
            //
            //
            //
            //
            // ==================  testSubDocArrayPutPatient ===================
            //
            testSubDocArrayPutPatient2: function( callback ) {

                setTimeout( function() {
                    console.log( ' ********************* ' );
                    console.log( ' ********************* ' );
                    console.log( ' ********************* ' );
                    console.log( ' ********************* ' );
                    console.log( ' ********************* ' );
                    console.log( ' ********************* ' );
                    // hit the db a little
                    Y.doccirrus.mongodb.runDb(
                        { model: 'patient', user: Y.doccirrus.auth.getSUForTenant( config.tenantId ), data: test1data, query: {} },
                        function( err ) {
                            if( err ) {
                                console.log( 'TEST WARMUP ERROR: ', err );
                            }
                        } );

                    test1data.firstname = 'Immanuel';
                    test1data.firstname = 'Kant';
                    test1data.addresses[0].zip = '88555';
                    // now do the put
                    Y.doccirrus.api.patient.addPatient(
                        Y.doccirrus.auth.getSUForTenant( config.tenantId ),
                        test1data,
                        callback
                    );
                }, 300 );

                //                    Y.doccirrus.mongodb.runDb(
                //                        { action: 'put', model: 'physician', user: Y.doccirrus.auth.getSUForTenant( '4795c10b0000' ), data: data, query: {_id: "5281e5db2cdec4000000001a"} },
                //                        callback );
            },

            //
            //
            //
            //
            // ==================  testSubDocArrayPutPushObjCalendar ===================
            //
            testCalMPostCalendar: function( callback ) {
                var
                // NEED A GENERIC CENTRAL  MAKE_DUMMY_AC( user, data, options )  FN
                    dummyAc = {
                        rest: {
                            model: 'calendar',
                            originalparams: {
                                "name": "14779 QA",
                                "type": "PATIENTS",
                                "isPublic": true,
                                "color": "#22dd50",
                                "consultTimes": [
                                    {
                                        "days": [
                                            1,
                                            2,
                                            3,
                                            4,
                                            5
                                        ],
                                        "start": [
                                            9
                                        ],
                                        "end": [
                                            17,
                                            30
                                        ],
                                        "privateInsurance": true,
                                        "publicInsurance": true
                                    }
                                ],
                                "scheduled": 0,
                                "taint_": "4c9bf70b5768785d30a897010423d1e7"
                            },
                            user: Y.doccirrus.auth.getSUForTenant( config.tenantId ),
                            options: {}
                        }
                    },
                // NEED A GENERIC CENTRAL  RESTCONTROLLER_MOCK( callback )  FN
                // yes the following code is cut and pasted...
                // this is a deprectaed pattern only for testing old code...
                    restControllerMock = {
                        _getCallback: function() {
                            return callback;
                        }
                    };

                Y.mojito.controllers.CalendarMojit.post.call( restControllerMock, dummyAc );

            },
            //
            //
            // TEST FUB integration
            //
            fubIntegration: function( callback ) {
                var
                    gen = require( './test-fub' );

                gen.preprocess( Y, Y.doccirrus.auth.getSUForTenant( config.tenantId ), function( err, result ) {
                    console.log( 'FUBINTEGRATION:  ', err, result );
                    callback( err );
                } );

            },

            //
            //
            //
            // TEST patient versioning
            //
            // T1:  PUT patient and check copy was made
            // T2:  check the copy has a timestamp field
            // TODO:
            // T3:  POST patient and check copy was made
            // T4: T2
            patientVersioning: function( callback ) {
                var
                //addPat = testSuite.testSubDocArrayPutPatient,
                    user = Y.doccirrus.auth.getSUForTenant( config.tenantId );

                function modelCb( err, model ) {
                    var
                        before;

                    function checkTimestamp( err, result ) {
                        var
                            t,
                            r;
                        if( err ) {
                            callback( err );
                        }
                        else {
                            r = result && result[0];
                            if( !r ) {
                                r = result;
                            }

                            console.log( 'TEST TIMESTAMP OBJ:  ', r.timestamp );  // wow toObject() is working here...

                            t = Date.now() - r.timestamp;
                            console.log( 'TEST TIMESTAMP DIFF: ', t );

                            if( t < 200 ) {
                                callback( null, result );
                            } else {
                                callback( 'TEST FAILURE: TIMESTAMP MISSING OR RESPONSE TOO SLOW' );
                            }
                        }
                    }

                    function afterSaveCb() {
                        //console.log( 'TEST TIMESTAMP --1:  ', result.timestamp );

                        model.count( {}, function( err, count ) {
                            console.log( 'TEST COUNT AFTER patient versions: ', count );
                            if( count !== before + 1 ) {
                                console.log( 'TEST PATIENT VERSIONING FAILED' );
                                callback( 'ERR no patient copy made' );
                            } else {
                                // get the most recently added patient version
                                // & then check its timestamp
                                Y.doccirrus.mongodb.runDb( {
                                    user: user,
                                    model: 'patientversion',
                                    query: {},
                                    options: { limit: 1, sort: { $natural: -1} }
                                }, checkTimestamp );
                            }
                        } );

                    }

                    if( err ) {
                        callback( err );
                    } else {
                        // do a count...
                        before = model.count( {}, function( err, cnt ) {
                            console.log( 'TEST COUNT BEFORE patient versions: ', cnt );
                            before = cnt;
                            // do an addPatient...
                            Y.doccirrus.mongodb.runDb( {user: user, model: 'patient', query: {_id: test1data._id}}, function( err, result ) {
                                if( err ) {
                                    callback( err );
                                }
                                else {
                                    if( result && result[0] ) {
                                        result[0].lastname = 'TEST VERSIONING';

                                        //mongooselean.save_fix
                                        Y.doccirrus.mongodb.runDb( {
                                            user: user,
                                            model: 'patient',
                                            action: 'put',
                                            query: {
                                                _id: result[0]._id
                                            },
                                            fields: Object.keys(result[0]),
                                            data: Y.doccirrus.filters.cleanDbObject(result[0])
                                        }, function() {
                                            setTimeout( afterSaveCb, 50 );
                                        });
                                    }
                                    else {
                                        afterSaveCb();
                                    }
                                }
                            } );

                        } );

                    }

                }

                Y.doccirrus.mongodb.getModel( user, 'patientversion', modelCb );
            },

            //
            //
            //  setup read-only test data
            //  T1: get readonly fields (cardSwipe now)
            //  T2: get readonly fields (cardSwipe long ago)
            //  T3: check that the server does not write the fields
            readOnlyFields: function( callback ) {
                //                    var
                //                        ro,
                //                        data = {};
                callback();
                return;
                // getReadOnlyFields is w-i-p by DD, [TODO MOJ-1390]
                //                    data.cardSwipe = Date.now();
                //                    ro = Y.doccirrus.schemas.patient.getReadOnlyFields( data );
                //                    if( !ro.length ||
                //                        -1 === ro.indexOf( 'lastname' )
                //                        ) {
                //                        callback( 'TEST FAILED READONLY FIELDS NOT RECOGNISED FOR PATIENT', null );
                //                    }
                //
                //                    data.cardSwipe = Date.now() - (60 * 60 * 24 * 90);// 90 days ago
                //                    ro = Y.doccirrus.schema.patient.getReadOnlyFields( data );
                //                    if( ro.length ) {
                //                        callback( 'TEST FAILED READONLY FIELDS SHOULD BE EMPTY', null );
                //                    }
            },

            testPreProcessChaining: function( callback ) {
                var
                    user = Y.doccirrus.auth.getSUForTenant( config.tenantId ),
                    dummy;

                dummy = {
                    firstname: 'Mahmoud',
                    lastname: 'A',
                    additional1: 'this is not in the schema',
                    age: '29'
                };
                dummy = Y.doccirrus.filters.cleanDbObject( dummy );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'dummy',
                    action: 'post',
                    options: {entireRec: true},
                    data: dummy,
                    callback: function( err, result ) {
                        var errStr = err.toString();
                        if( result && result[0] ) {
                            errStr = '';
                            if( result[0].additional1 ) {
                                errStr = 'testDummySchema added additional non-schema field to DB. \n' + errStr;
                            }
                            if( result[0].lastname !== "A, myPre1, myPre2" ) {
                                errStr = 'pre-process strings not correctly included in pre-processed result. \n' + errStr;
                            }
                            callback( errStr, result );
                            //                            setImmediate( function() {
                            //                                Y.doccirrus.mongodb.runDb( {
                            //                                    user: user,
                            //                                    model: 'dummy',
                            //                                    query: result[0]._id
                            //                                }, function( err, result ) {
                            //                                    if( result && result[0] ) {
                            //                                        //FixME: add checks for YYYYYY = firstname, etc. here.
                            //                                        errStr = null;
                            //                                    } else {
                            //                                        errStr = 'Pre- and Post processing chaining failed (2) -- Error occurred. ' + errStr;
                            //                                    }
                            //                                    callback( errStr, result );
                            //                                } );
                            //                            } );
                        } else {
                            errStr = 'Pre- and Post processing chaining failed -- Error occurred. ' + errStr;
                            callback( errStr, result );
                        }

                    }

                } );
            },

            testProcessChainError: function( callback ) {
                var
                    user = Y.doccirrus.auth.getSUForTenant( config.tenantId ),
                    dummy;

                dummy = {
                    firstname: 'Batman',
                    lastname: 'B.',
                    additional1: 'Custom message',
                    additional2: 'ERROR',
                    age: '30'
                };
                dummy = Y.doccirrus.filters.cleanDbObject( dummy );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'dummy',
                    action: 'post',
                    options: {entireRec: true},
                    data: dummy,
                    callback: function( err, result ) {
                        if( err ) {
                            Y.log('Error returned had: code/' + err.code + '  data/' + err.data );

                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'dummy',
                                query: {firstname: 'batman'},
                                callback: function( err, result ) {
                                    if( err || (result && (result.length > 0) ) ) {
                                        callback( 'Process Chain was not interrupted -- failing test', result );
                                    } else {
                                        callback( null, result);
                                    }

                                }
                            } );
                        } else {
                            callback( 'Process Chain did not return an ERROR object -- failing test', result );
                        }
                    }

                } );
            },

            /**
             * Just reset the semaphores. not an automated test.
             * @param {Function}            callback
             */
            resetSemaphores: function( callback ) {
                var
                    user = Y.doccirrus.auth.getSUForTenant( config.tenantId );

                Y.doccirrus.schemas.sysnum.resetSemaphores( user, callback );
            },

            /**
             *
             */
            testRequiredEnums: function( ) {

            }



        } );

        Y.namespace( 'doccirrus.test' ).dcdb = testSuite;
    },
    '0.0.1', {requires: []}
);
