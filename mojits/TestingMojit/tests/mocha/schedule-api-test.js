/*global Y, should, it, describe */
const
    moment = require( 'moment' ),
    mongoose = require( 'mongoose' ),
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    ONLINE_CONSULTATION = Y.doccirrus.schemas.scheduletype.appointmentTypes.ONLINE_CONSULTATION,
    CONFERENCE = Y.doccirrus.schemas.scheduletype.appointmentTypes.CONFERENCE,
    STANDARD = Y.doccirrus.schemas.scheduletype.appointmentTypes.STANDARD,
    {formatPromiseResult, promisifyArgsCallback} = require( 'dc-core' ).utils,
    schedulePost = promisifyArgsCallback( Y.doccirrus.api.schedule.post ),
    calendarId = new mongoose.Types.ObjectId().toString(),
    unexistedEntryId = new mongoose.Types.ObjectId().toString(),
    patientId = new mongoose.Types.ObjectId().toString(),
    patientWithoutEmailId = new mongoose.Types.ObjectId().toString(),
    calendarWithoutEmployeeId = new mongoose.Types.ObjectId().toString(),
    calendarWithoutScheduletypeLinkedId = new mongoose.Types.ObjectId().toString(),
    standardScheduletypeId = new mongoose.Types.ObjectId().toString(),
    onlineConsultationScheduleTypeId = new mongoose.Types.ObjectId().toString(),
    conferenceScheduleTypeId = new mongoose.Types.ObjectId().toString(),
    locationId = new mongoose.Types.ObjectId().toString(),
    runDb = Y.doccirrus.mongodb.runDb,
    user = Y.doccirrus.auth.getSUForLocal();

describe( 'schedule-api', function() {
    // we should add 1 hour to the current time for 'start' value
    // to avoid creating schedules in the past (that will skip almost all checking/validation)

    let start = moment().add( 1, 'h' ).seconds( 0 ).milliseconds( 0 ).toISOString(),
        end = moment( start ).add( 10, 'minutes' ).toISOString();

    describe( '0. Setup db.', function() {
        it( 'cleans db', function( done ) {
            this.timeout( 20000 );
            mochaUtils.cleanDB( {user}, function( err ) {
                should.not.exist( err );
                done();
            } );
        } );
        it( 'insert patient', async function() {
            let
                patientData = mochaUtils.getPatientData( {
                    firstname: 'test',
                    lastname: 'patient',
                    _id: patientId
                } ),
                err, result;

            [err, result] = await formatPromiseResult(
                runDb( {
                    user,
                    model: 'patient',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( patientData )
                } )
            );
            should.not.exist( err );
            should.exist( result );
        } );
        it( 'insert patient without email', async function() {
            let
                patientData = mochaUtils.getPatientData( {
                    firstname: 'test',
                    lastname: 'patient',
                    communications: [],
                    _id: patientWithoutEmailId
                } ),
                err, result;

            [err, result] = await formatPromiseResult(
                runDb( {
                    user,
                    model: 'patient',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( patientData )
                } )
            );
            should.not.exist( err );
            should.exist( result );
        } );
        it( 'insert calendar', async function() {
            let
                calendarData = {
                    _id: calendarId,
                    "color": "#17bfbc",
                    "name": "Arztkalender",
                    "type": "PATIENTS",
                    "isPublic": true,
                    "employee": "100000000000000000000003",
                    "locationId": locationId,
                    "consultTimes": [
                        {
                            "privateInsurance": true,
                            "publicInsurance": true,
                            "_id": "54e1bd4e6af0fd620fd6cb04",
                            "end": [
                                22,
                                0
                            ],
                            "start": [
                                9,
                                0
                            ],
                            "colorOfConsults": "#cf4444",
                            "days": [
                                1,
                                2,
                                5,
                                3,
                                4
                            ]
                        }
                    ],
                    "__v": 0,
                    "isRandomMode": true,
                    "isShared": false
                },
                err, result;

            [err, result] = await formatPromiseResult(
                runDb( {
                    user,
                    model: 'calendar',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( calendarData )
                } )
            );
            should.not.exist( err );
            should.exist( result );
        } );
        it( 'insert calendar without employee', async function() {
            let
                calendarData = {
                    _id: calendarWithoutEmployeeId,
                    "color": "#17bfbc",
                    "name": "Arztkalender without employee",
                    "type": "PATIENTS",
                    "isPublic": true,
                    "locationId": locationId,
                    "consultTimes": [
                        {
                            "privateInsurance": true,
                            "publicInsurance": true,
                            "_id": "54e1bd4e6af0fd620fd6cb04",
                            "end": [
                                22,
                                0
                            ],
                            "start": [
                                9,
                                0
                            ],
                            "colorOfConsults": "#cf4444",
                            "days": [
                                1,
                                2,
                                5,
                                3,
                                4
                            ]
                        }
                    ],
                    "__v": 0,
                    "isRandomMode": true,
                    "isShared": false
                },
                err, result;

            [err, result] = await formatPromiseResult(
                runDb( {
                    user,
                    model: 'calendar',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( calendarData )
                } )
            );
            should.not.exist( err );
            should.exist( result );
        } );
        it( 'insert calendar not assigned to any scheduletype', async function() {
            let
                calendarData = {
                    _id: calendarWithoutScheduletypeLinkedId,
                    "color": "#17bfbc",
                    "name": "Arztkalender not assigned to scheduletype",
                    "type": "PATIENTS",
                    "isPublic": true,
                    "employee": "100000000000000000000003",
                    "locationId": locationId,
                    "consultTimes": [
                        {
                            "privateInsurance": true,
                            "publicInsurance": true,
                            "_id": "54e1bd4e6af0fd620fd6cb04",
                            "end": [
                                22,
                                0
                            ],
                            "start": [
                                9,
                                0
                            ],
                            "colorOfConsults": "#cf4444",
                            "days": [
                                1,
                                2,
                                5,
                                3,
                                4
                            ]
                        }
                    ],
                    "__v": 0,
                    "isRandomMode": true,
                    "isShared": false
                },
                err, result;

            [err, result] = await formatPromiseResult(
                runDb( {
                    user,
                    model: 'calendar',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( calendarData )
                } )
            );
            should.not.exist( err );
            should.exist( result );
        } );
        it( 'insert STANDARD scheduletype', async function() {
            let
                scheduletypeData = {
                    _id: standardScheduletypeId,
                    "__v": 0,
                    "duration": 15,
                    "durationUnit": "MINUTES",
                    "isPublic": true,
                    "name": "Standard",
                    "calendarRefs": [
                        {
                            "_id": "5eba6aadf3422b5cf19b5524",
                            "calendarId": calendarId
                        },
                        {
                            "_id": "5eba6aadf3422b5cf19b5525",
                            "calendarId": calendarWithoutEmployeeId
                        }
                    ],
                    "capacity": 0,
                    "numberOfSuggestedAppointments": 10,
                    "info": "",
                    "type": STANDARD,
                    "isPreconfigured": false
                },
                err, result;

            [err, result] = await formatPromiseResult(
                runDb( {
                    user,
                    model: 'scheduletype',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( scheduletypeData )
                } )
            );
            should.not.exist( err );
            should.exist( result );
        } );
        it( 'insert ONLINE_CONSULTATION scheduleType', async function() {
            let
                scheduletypeData = {
                    _id: onlineConsultationScheduleTypeId,
                    "__v": 0,
                    "duration": 10,
                    "durationUnit": "MINUTES",
                    "isPublic": true,
                    "name": "Online Consultation",
                    "calendarRefs": [
                        {
                            "_id": "5eba6aadf3422b5cf19b5524",
                            "calendarId": calendarId
                        },
                        {
                            "_id": "5eba6aadf3422b5cf19b5525",
                            "calendarId": calendarWithoutEmployeeId
                        }
                    ],
                    "capacity": 0,
                    "numberOfSuggestedAppointments": 10,
                    "info": "",
                    "type": ONLINE_CONSULTATION,
                    "isPreconfigured": false
                },
                err, result;

            [err, result] = await formatPromiseResult(
                runDb( {
                    user,
                    model: 'scheduletype',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( scheduletypeData )
                } )
            );
            should.not.exist( err );
            should.exist( result );
        } );
        it( 'insert CONFERENCE scheduleType', async function() {
            let
                scheduletypeData = {
                    _id: conferenceScheduleTypeId,
                    "__v": 0,
                    "duration": 10,
                    "durationUnit": "MINUTES",
                    "isPublic": true,
                    "name": "Conference",
                    "calendarRefs": [
                        {
                            "_id": "5eba6aadf3422b5cf19b5524",
                            "calendarId": calendarId
                        },
                        {
                            "_id": "5eba6aadf3422b5cf19b5525",
                            "calendarId": calendarWithoutEmployeeId
                        }
                    ],
                    "capacity": 0,
                    "info": "",
                    "type": CONFERENCE,
                    "isPreconfigured": false
                },
                err, result;

            [err, result] = await formatPromiseResult(
                runDb( {
                    user,
                    model: 'scheduletype',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( scheduletypeData )
                } )
            );
            should.not.exist( err );
            should.exist( result );
        } );
    } );

    describe( '1. Test schedule POST request', function() {
        let
            scheduleData = {
                "severity": "NORMAL",
                "start": start,
                "end": end,
                "calendar": calendarId,
                "duration": "15",
                "patient": patientId,
                "scheduletype": standardScheduletypeId
            };

        it( 'post schedule with wrong values', async function() {
            let err, result;

            [err, result] = await formatPromiseResult(
                schedulePost( {
                    user,
                    data: {...scheduleData, start: 'wrong data'}
                } )
            );
            should.not.exist( result );
            should.exist( err );
            err.should.be.an( 'object' );
            err.code.should.be.equal( 'schedule_01' );
        } );
        it( 'post schedule without some required fields', async function() {
            let err, result,
                scheduleDataWithoutStart = {
                    "severity": "NORMAL",
                    "end": end,
                    "calendar": calendarId,
                    "duration": "15",
                    "patient": "5dc2ba9ea992cc4b48f558c7",
                    "scheduletype": standardScheduletypeId
                };

            [err, result] = await formatPromiseResult(
                schedulePost( {
                    user,
                    data: {...scheduleDataWithoutStart}
                } )
            );
            should.not.exist( result );
            should.exist( err );
            err.should.be.an( 'object' );
            err.code.should.be.equal( 'schedule_02' );
        } );
        it( 'post schedule in non-existed calendar', async function() {
            let err, result;

            [err, result] = await formatPromiseResult(
                schedulePost( {
                    user,
                    data: {...scheduleData, calendar: unexistedEntryId}
                } )
            );
            should.not.exist( result );
            should.exist( err );
            err.should.be.an( 'object' );
            err.code.should.be.equal( 'schedule_03' );
        } );
        it( 'post schedule with non-existed patient ', async function() {
            let err, result;

            [err, result] = await formatPromiseResult(
                schedulePost( {
                    user,
                    data: {...scheduleData, patient: unexistedEntryId}
                } )
            );
            should.not.exist( result );
            should.exist( err );
            err.should.be.an( 'object' );
            err.code.should.be.equal( 'schedule_04' );
        } );
        it( 'post schedule with non-existed scheduletype', async function() {
            let err, result;

            [err, result] = await formatPromiseResult(
                schedulePost( {
                    user,
                    data: {...scheduleData, scheduletype: unexistedEntryId}
                } )
            );
            should.not.exist( result );
            should.exist( err );
            err.should.be.an( 'object' );
            err.code.should.be.equal( 'schedule_05' );
        } );
        it( 'post schedule in calendar without assigned scheduletype', async function() {
            let err, result;

            [err, result] = await formatPromiseResult(
                schedulePost( {
                    user,
                    data: {...scheduleData, calendar: calendarWithoutScheduletypeLinkedId}
                } )
            );
            should.not.exist( result );
            should.exist( err );
            err.should.be.an( 'object' );
            err.code.should.be.equal( 'schedule_06' );
        } );

        it( 'post ONLINE_CONSULTATION without patient', async function() {
            let err, result,
                onlineConsultationWithoutPatient = {
                    "severity": "NORMAL",
                    "start": start,
                    "end": end,
                    "calendar": calendarId,
                    "duration": "15",
                    "scheduletype": onlineConsultationScheduleTypeId
                };

            [err, result] = await formatPromiseResult(
                schedulePost( {
                    user,
                    data: {...onlineConsultationWithoutPatient}
                } )
            );
            should.not.exist( result );
            should.exist( err );
            err.should.be.an( 'object' );
            err.code.should.be.equal( 'schedule_07' );
        } );
        it( 'post ONLINE_CONSULTATION for patient without email', async function() {
            let err, result;

            [err, result] = await formatPromiseResult(
                schedulePost( {
                    user,
                    data: {
                        ...scheduleData,
                        scheduletype: onlineConsultationScheduleTypeId,
                        patient: patientWithoutEmailId
                    }
                } )
            );
            should.not.exist( result );
            should.exist( err );
            err.should.be.an( 'object' );
            err.code.should.be.equal( 'schedule_08' );
        } );
        it( 'post ONLINE_CONSULTATION schedule in calendar without employee', async function() {
            let err, result;

            [err, result] = await formatPromiseResult(
                schedulePost( {
                    user,
                    data: {
                        ...scheduleData,
                        calendar: calendarWithoutEmployeeId,
                        scheduletype: onlineConsultationScheduleTypeId
                    }
                } )
            );
            should.not.exist( result );
            should.exist( err );
            err.should.be.an( 'object' );
            err.code.should.be.equal( 'schedule_09' );
        } );
        it( 'post normal schedule', async function() {
            let err, result;

            [err, result] = await formatPromiseResult(
                schedulePost( {
                    user,
                    data: {
                        ...scheduleData
                    }
                } )
            );
            should.not.exist( err );
            should.exist( result );
            result.should.be.an( 'array' ).that.has.lengthOf( 1 );
            result[0].should.be.a( 'string' );
            result[0].should.not.equal( '' );
        } );

    } );
} );
