/**
 * User: rrrw
 * Date: 15.08.13  16:14
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
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

YUI.add( 'test_patient-api', function( Y, NAME ) {

        var
            moment = require( 'moment' ),
            config = { tenantId: '1111111111' },
        //            user = Y.doccirrus.auth.getSUForTenant( config.tenantId ),
            testSuite = {};

        function testCRUD( adhoc, callback ) {
            var
                options = Y.doccirrus.auth.setInternalAccessOptions(),
                host = 'http://' + config.tenantId + '.dev.dc',
                url = host + '/1/calevent',
                start = moment().add( 'minutes', 5 ),
                end = moment( start ).add( 'minutes', 20 ),
                eventData = {
                    start: start.utc().toJSON(),
                    end: end.utc().toJSON(),
                    linkSeries: start.utc().toJSON(),
                    scheduletype: '100000000000000000000008',
                    duration: 20,
                    plannedDuration: 20,
                    calendar: '300000000000000000000007',
                    type: 'BOOKED',
                    details: 'no details...',
                    adhoc: adhoc,
                    allDay: false,
                    title: 'test adhoc 1',
                    patient: '10000000000000000000000b',
                    repetition: 'DAILY',
                    dtstart: start.utc().toJSON(),
                    until: start.add( 'days', 6 ).utc().toJSON()
                };

            function deleteEventCb( err, response, body ) {
                if( err || !body ) {
                    Y.log( 'DELETE event failed. error:' + JSON.stringify( err ), 'error', NAME );
                    callback( err );
                } else {
                    Y.log( 'DELETE event was successful. response:' + JSON.stringify( body.data ), 'debug', NAME );
                    callback( null );
                }
            }

            function putEventCb( err, response, body ) {
                var
                    id;
                if( err || !body.data || !body.data._id ) {
                    Y.log( 'PUT event failed. error:' + JSON.stringify( err ), 'error', NAME );
                    callback( err || 'failed to put the event' );

                } else {
                    Y.log( 'PUT event was successful. response:' + JSON.stringify( body.data ), 'debug', NAME );
                    id = body.data._id;
                    deleteEventCb();
                    Y.doccirrus.https.externalDelete( url + '/' + id + '?eventType=' + (adhoc ? 'adhoc' : 'plan'), {}, options, deleteEventCb );
                }
            }

            function getEventCb( err, response, body ) {
                var
                    id,
                    putUrl;
                if( err || !body.data || !body.data[0] || body.data[0].length > 1 ) {
                    Y.log( 'POST event failed. error:' + JSON.stringify( err ), 'error', NAME );
                    callback( err || 'failed to get the event by id' );

                } else {
                    Y.log( 'POST event was successful. response:' + JSON.stringify( body.data ), 'debug', NAME );
                    id = body.data[0]._id;
                    putUrl = url + '/' + id + '?eventType=' + (adhoc ? 'adhoc' : 'plan') + '&fields_=title';
                    eventData.title = 'updated...';
                    Y.doccirrus.https.externalPut( putUrl, eventData, options, putEventCb );
                }
            }

            function postCb( err, response, body ) {
                var
                    id;
                if( err ) {
                    Y.log( 'POST event failed. error:' + JSON.stringify( err ), 'error', NAME );
                    callback( err );
                } else {
                    Y.log( 'POST event was successful. response:' + JSON.stringify( body.data ), 'debug', NAME );
                    id = body.data[0];
                    Y.doccirrus.https.externalGet( url + '/' + id + '?eventType=' + (adhoc ? 'adhoc' : 'plan'), options, getEventCb );
                }
            }

            function getAdhocCb( err, response, body ) {
                if( err ) {
                    Y.log( 'GET adhoc failed:' + JSON.stringify( err ), 'error', NAME );
                    callback( err || 'failed to get event' );

                } else {
                    if( body.data.length > 0 ) {
                        Y.log( 'adhoc exists. Please delete all adhocs for the calendar ' + eventData.calendar + '. Exiting test for adhoc.', 'warn', NAME );
                        callback();
                    } else {
                        Y.doccirrus.https.externalPost( url, eventData, options, postCb );
                    }
                }
            }

            eventData.adhoc = adhoc;
            if( adhoc ) {
                Y.doccirrus.https.externalGet( url + '?eventType[]=adhoc' + '&calendar=' + eventData.calendar, options, getAdhocCb );
            } else {
                Y.doccirrus.https.externalPost( url, eventData, options, postCb );
            }

        }

        Y.mix( testSuite, {

            testCalevent: function( callback ) {
                Y.log( '--1- test calevent-api for adhoc event', 'debug', NAME );
                testCRUD( false, function( err ) {
                    if( err ) {
                        Y.log( 'failed test calevent-api for planned event', 'error', NAME );
                        callback( err );
                    } else {
                        Y.log( '--2- test calevent-api for adhoc event', 'debug', NAME );
                        testCRUD( true, callback );
                        callback();
                    }
                } );
            }

        } );

        Y.namespace( 'doccirrus.test' )['patient-api'] = testSuite;
    },
    '0.0.1', {requires: ['patient-api']}
);
