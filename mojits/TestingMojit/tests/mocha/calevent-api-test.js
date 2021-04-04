/*global Y, should, it, describe, after, before, afterEach, beforeEach, context, expect */

const
    util = require( 'util' ),
    moment = require( 'moment' ),
    {wait} = require( '../utils' ),
    mongoose = require( 'mongoose' ),
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    core = require( 'dc-core' );

// TODO convert all rejections into an error

const candidate = {
    post: core.utils.promisifyArgsCallback( Y.doccirrus.api.calevent.post ),
    put: core.utils.promisifyArgsCallback( Y.doccirrus.api.calevent.put ),
    delete: core.utils.promisifyArgsCallback( Y.doccirrus.api.calevent.delete ),
    checkSchedule: core.utils.promisifyArgsCallback( Y.doccirrus.api.calevent.checkSchedule ),
    createCloseDayEvent: core.utils.promisifyArgsCallback( Y.doccirrus.api.calevent.createCloseDayEvent )
};

describe( 'calevent-api', () => {

    context( 'given a local user and a single practice', function() {

        before( async function() {
            this.timeout( 20000 );

            this.user = Y.doccirrus.auth.getSUForLocal();

            // TODO should not necessary if the other tests are written cleaner
            await util.promisify( mochaUtils.cleanDB )( {user: this.user} );

            await Y.doccirrus.mongodb.runDb( {
                user: this.user,
                model: 'practice',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( {...mochaUtils.getPracticeData(), skipcheck_: true} )
            } );
        } );

        after( async function() {
            await util.promisify( mochaUtils.cleanDB )( {user: this.user} );
        } );

        context( 'given a patient calendar with one consultation time entry from now until 10 hours later over four week days', async function() {

            before( async function() {
                this.calendar = '515ae9604013671c12c1c900';

                await Y.doccirrus.mongodb.runDb( {
                    user: this.user,
                    model: 'calendar',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( {
                        _id: this.calendar,
                        "color": "#17bfbc",
                        "name": "Arztkalender",
                        "type": "PATIENTS",
                        "isPublic": true,
                        "employee": "100000000000000000000003",
                        "locationId": new mongoose.Types.ObjectId().toString(),
                        "consultTimes": [
                            {
                                "privateInsurance": true,
                                "publicInsurance": true,
                                "_id": "54e1bd4e6af0fd620fd6cb04",
                                "end": [
                                    moment().add( 10, 'hours' ).hours(),
                                    0
                                ],
                                "start": [
                                    moment().hours(),
                                    0
                                ],
                                "colorOfConsults": "#cf4444",
                                "days": [
                                    moment().day(),
                                    moment().day( moment().day() - 2 ).day(),
                                    moment().day( moment().day() - 1 ).day(),
                                    moment().day( moment().day() + 3 ).day()
                                ]
                            }
                        ],
                        "__v": 0,
                        "isRandomMode": true,
                        "isShared": false
                    } )
                } );
            } );

            after( async function() {
                // TODO use a lib for fixtures instead of using the internal API
                await Y.doccirrus.mongodb.runDb( {
                    user: this.user,
                    model: 'calendar',
                    action: 'delete',
                    query: {_id: {$exists: true}},
                    options: {
                        override: true
                    }
                } );
            } );

            context( 'given two regular schedule types over 15 minutes and one online schedule type over 10 minutes', async function() {

                before( async function() {
                    this.type = {
                        default: '100000000000000000000008',
                        slot: '100000000000000000000009',
                        online: '100000000000000000000010'
                    };

                    await Y.doccirrus.mongodb.runDb( {
                        user: this.user,
                        model: 'scheduletype',
                        action: 'post',
                        data: Y.doccirrus.filters.cleanDbObject( {
                            _id: this.type.default,
                            "__v": 0,
                            "duration": 15,
                            "durationUnit": "MINUTES",
                            "isPublic": true,
                            "name": "Standard",
                            "calendarRefs": [],
                            "capacity": 0,
                            "numberOfSuggestedAppointments": 10,
                            "info": "",
                            "isPreconfigured": false
                        } )
                    } );
                    await Y.doccirrus.mongodb.runDb( {
                        user: this.user,
                        model: 'scheduletype',
                        action: 'post',
                        data: Y.doccirrus.filters.cleanDbObject( {
                            _id: this.type.slot,
                            "__v": 0,
                            "duration": 15,
                            "durationUnit": "MINUTES",
                            "isPublic": true,
                            "name": "Slot1",
                            "calendarRefs": [],
                            "capacity": 1,
                            "numberOfSuggestedAppointments": 10,
                            "info": "",
                            "isPreconfigured": true
                        } )
                    } );
                    await Y.doccirrus.mongodb.runDb( {
                        user: this.user,
                        model: 'scheduletype',
                        action: 'post',
                        data: Y.doccirrus.filters.cleanDbObject( {
                            _id: this.type.online,
                            "__v": 0,
                            "duration": 10,
                            "durationUnit": "MINUTES",
                            "isPublic": true,
                            "name": "Online Consultation",
                            "calendarRefs": [
                                {
                                    "_id": "5eba6aadf3422b5cf19b5524",
                                    "calendarId": this.calendar
                                }
                            ],
                            "capacity": 0,
                            "numberOfSuggestedAppointments": 10,
                            "info": "",
                            "type": "ONLINE_CONSULTATION",
                            "isPreconfigured": false
                        } )
                    } );
                } );

                after( async function() {
                    // TODO use a lib for fixtures instead of using the internal API
                    await Y.doccirrus.mongodb.runDb( {
                        user: this.user,
                        model: 'scheduletype',
                        action: 'delete',
                        query: {_id: {$exists: true}},
                        options: {
                            override: true
                        }
                    } );
                } );

                beforeEach( async function() {
                    // we should add 1 hour to the current time for 'start' value
                    // to avoid creating schedules in the past (that will skip almost all checking/validation)
                    // TODO better having these in each fixture instead of being shared
                    this.start = moment().add( 1, 'h' ).seconds( 0 ).milliseconds( 0 ).toISOString();
                    this.end = moment( this.start ).add( 10, 'minutes' ).toISOString();
                    this.dtstart = moment( this.start ).startOf( 'd' ).toISOString();
                    this.until = moment( this.dtstart ).add( 5, 'days' ).startOf( 'd' ).toISOString();
                } );

                afterEach( async function() {
                    // TODO use a lib for fixtures instead of using the internal API
                    await Y.doccirrus.mongodb.runDb( {
                        user: this.user,
                        model: 'schedule',
                        action: 'delete',
                        query: {_id: {$exists: true}},
                        options: {
                            override: true
                        }
                    } );
                } );

                describe( '.post()', function() {

                    context( 'with a master schedule start one hour in the future and daily repetition over five days', function() {

                        beforeEach( async function() {
                            this.start = moment().add( 1, 'h' ).seconds( 0 ).milliseconds( 0 ).toISOString();
                            this.end = moment( this.start ).add( 10, 'minutes' ).toISOString();
                            this.schedule = {
                                "start": this.start,
                                "end": this.end,
                                "calendar": this.calendar,
                                "scheduletype": this.type.default,
                                "duration": 10,
                                "plannedDuration": 10,
                                "dtstart": this.dtstart,
                                "interval": 1,
                                "until": moment( this.start ).startOf( 'd' ).add( 5, 'days' ).startOf( 'd' ).toISOString(),
                                "adhoc": false,
                                "scheduled": 0,
                                "byweekday": [],
                                "repetition": "DAILY",
                                "allDay": false,
                                // TODO if this is only a parameter for the receiving function this is code smell and should be provided as separate arguments
                                notConfirmed: false,
                                _resultsOnly: true
                            };
                        } );

                        afterEach( async function() {
                            // TODO use a lib for fixtures instead of using the internal API
                            await Y.doccirrus.mongodb.runDb( {
                                user: this.user,
                                model: 'schedule',
                                action: 'delete',
                                query: {_id: {$exists: true}},
                                options: {
                                    override: true
                                }
                            } );
                        } );

                        it( 'returns six schedules with a start and end time based on the given master schedule', async function() {
                            const schedules = await candidate.post( {
                                user: this.user,
                                data: this.schedule
                            } );

                            expect( schedules ).have.lengthOf( 6 );
                            expect( schedules[0].start.toISOString() ).to.equal( this.start );
                            expect( schedules[0].end.toISOString() ).to.equal( this.end );
                            expect( schedules[5].start.toISOString() ).to.equal( moment( this.start ).add( 5, 'days' ).toISOString() );
                            expect( schedules[5].end.toISOString() ).to.equal( moment( this.end ).add( 5, 'days' ).toISOString() );
                        } );
                    } );
                } );

                describe( '.checkSchedule()', function() {

                    context( 'with a patient having no schedules and no arrival status update', function() {

                        it( 'returns `eventFound` flag with false', async function() {
                            const result = await candidate.checkSchedule( {
                                user: this.user,
                                originalParams: {
                                    updateArrivalStatus: false,
                                    patientId: '57580e18454cec874189c33b'
                                }
                            } );

                            expect( result ).to.be.an( 'Object' ).that.have.property( 'eventFound' ).that.equal( false );
                        } );
                    } );

                    context( 'given an appointment for a patient', function() {

                        beforeEach( async function() {
                            const result = await Y.doccirrus.mongodb.runDb( {
                                user: this.user,
                                model: 'schedule',
                                action: 'post',
                                data: Y.doccirrus.filters.cleanDbObject( {
                                    "start": this.start,
                                    "end": this.end,
                                    "calendar": this.calendar,
                                    "scheduletype": this.type.default,
                                    "patient": '57580e18454cec874189c33b',
                                    "duration": 10,
                                    "plannedDuration": 10,
                                    "interval": 1,
                                    "adhoc": false,
                                    "scheduled": 0,
                                    "byweekday": [],
                                    "repetition": "NONE",
                                    "allDay": false
                                } )
                            } );

                            this.schedule = result[0];
                            this.patient = '57580e18454cec874189c33b';
                        } );

                        afterEach( async function() {
                            await Y.doccirrus.mongodb.runDb( {
                                user: this.user,
                                model: 'schedule',
                                action: 'delete',
                                query: {_id: {$exists: true}},
                                options: {
                                    override: true
                                }
                            } );
                        } );

                        context( 'with the given patient and arrival status update', function() {

                            it( 'returns `eventFound` flag with true', async function() {
                                const result = await candidate.checkSchedule( {
                                    user: this.user,
                                    originalParams: {
                                        updateArrivalStatus: true,
                                        patientId: this.patient
                                    }
                                } );

                                expect( result ).to.be.an( 'Object' ).that.have.property( 'eventFound' );
                                expect( result.eventFound ).to.equal( true );
                            } );

                            it( 'stores call time as arrival time in schedule', async function() {
                                await candidate.checkSchedule( {
                                    user: this.user,
                                    originalParams: {
                                        updateArrivalStatus: true,
                                        patientId: this.patient
                                    }
                                } );

                                const time = moment().seconds( 0 ).milliseconds( 0 ).toISOString();
                                const result = await Y.doccirrus.mongodb.runDb( {
                                    user: this.user,
                                    model: 'schedule',
                                    action: 'get',
                                    query: {_id: this.schedule}
                                } );

                                expect( result ).to.be.an( 'Array' ).that.have.length( 1 );
                                expect( moment( result[0].arrivalTime ).seconds( 0 ).milliseconds( 0 ).toISOString() ).to.equal( time );
                            } );
                        } );
                    } );
                } );

                describe( '.createCloseDay()', function() {

                    context( 'with a simple close time event', function() {

                        it( 'creates the given event', async function() {
                            const start = moment().hour( 0 ).minute( 0 ).second( 0 ).millisecond( 0 ).toISOString();
                            const end = moment( start ).add( 23, 'hours' ).add( 59, 'minutes' ).toISOString();

                            await expect( candidate.createCloseDayEvent( {
                                user: this.user,
                                data: [
                                    {
                                        "title": "TestCloseDay",
                                        "allDay": true,
                                        "start": start,
                                        "end": end,
                                        "closeTime": true,
                                        "closeDayType": "OTHER",
                                        "calendar": this.calendar
                                    }]
                            } ) ).to.be.fulfilled;
                        } );
                    } );
                } );

                context( 'given a master schedule with daily repetition over five days', function() {

                    beforeEach( async function() {
                        // TODO use fixtures for this instead of creating this through the internal API
                        this.schedules = await candidate.post( {
                            user: this.user,
                            data: {
                                "start": this.start,
                                "end": this.end,
                                "calendar": this.calendar,
                                "scheduletype": this.type.default,
                                "duration": 10,
                                "plannedDuration": 10,
                                "dtstart": this.dtstart,
                                "interval": 1,
                                "until": this.until,
                                "adhoc": false,
                                "scheduled": 0,
                                "byweekday": [],
                                "repetition": "DAILY",
                                "allDay": false,
                                notConfirmed: false,
                                _resultsOnly: true
                            }
                        } );
                    } );

                    describe( '.put()', function() {

                        context( 'with the identifier of the given master schedule series and an until date over three days longer', function() {

                            it( 'returns three additional schedules', async function() {
                                const result = await candidate.put( {
                                    user: this.user,
                                    query: {_id: this.schedules[0]._id},
                                    data: Y.doccirrus.filters.cleanDbObject( {
                                        ...this.schedules[0],
                                        until: moment( this.schedules[0].until ).add( 3, 'days' ).toISOString(),
                                        notConfirmed: false,
                                        // TODO code smell which violates SOLID principles so split this into two functions
                                        _resultsOnly: true,
                                        // TODO refactor if this is only for Mocha tests otherwise remove this comment
                                        forTest: true
                                    } ),
                                    fields: ['until'],
                                    noValidation: true
                                } );

                                expect( result ).to.have.property( 'addRepetitionsToTail' )
                                    .that.is.an( 'object' ).that.has.property( 'postRepetitions' )
                                    .that.is.an( 'array' ).that.has.lengthOf( 3 );

                                const schedules = result.addRepetitionsToTail.postRepetitions;

                                expect( schedules[0].start.toISOString() ).to.equal( moment( this.start ).add( 6, 'days' ).toISOString() );
                                expect( schedules[0].end.toISOString() ).to.equal( moment( this.end ).add( 6, 'days' ).toISOString() );
                                expect( schedules[2].start.toISOString() ).to.equal( moment( this.start ).add( 8, 'days' ).toISOString() );
                                expect( schedules[2].end.toISOString() ).to.equal( moment( this.end ).add( 8, 'days' ).toISOString() );
                            } );
                        } );

                        context( 'with the identifier of the given master schedule series and a weekly repetition by the fourth weekday', async function() {

                            // TODO not sure if the return value is the master identifier
                            it( 'returns the master schedule identifier', async function() {
                                const result = await candidate.put( {
                                    user: this.user,
                                    query: {_id: this.schedules[0]._id},
                                    data: Y.doccirrus.filters.cleanDbObject( {
                                        ...this.schedules[0],
                                        repetition: 'WEEKLY',
                                        byweekday: ['4'],
                                        notConfirmed: false,
                                        // TODO refactor if this is only for Mocha tests otherwise remove this comment
                                        forTest: true
                                    } ),
                                    fields: ['repetition', 'byweekday'],
                                    noValidation: true
                                } );
                                // TODO this needs much more checks or dedicated tests regarding the changes in the database
                                expect( result ).to.have.property( 'scheduleId' );
                            } );
                        } );
                    } );

                    describe( '.delete()', function() {

                        context( 'with the identifier of the given master schedule', function() {

                            it( 'returns all deleted schedules', async function() {
                                const result = await candidate.delete( {
                                    user: this.user,
                                    query: {},
                                    data: {
                                        eventType: 'plan',
                                        linkSeries: this.schedules[0]._id,
                                        start: this.schedules[0].start,
                                        deleteAll: 'true'
                                    }
                                } );

                                // TODO check that they are deleted
                                expect( result ).to.have.lengthOf( 6 );
                            } );
                        } );
                    } );
                } );

                context( 'given an appointment over 20 minutes which blocks a room', function() {

                    beforeEach( async function() {
                        const result = await Y.doccirrus.mongodb.runDb( {
                            user: this.user,
                            model: 'schedule',
                            action: 'post',
                            data: Y.doccirrus.filters.cleanDbObject( {
                                "title": "1, testCh, 01.01.2005, ID:16, Standard",
                                "userDescr": "",
                                "urgency": 0,
                                "severity": "NONE",
                                "allDay": false,
                                "byweekday": [],
                                "wasInTreatment": false,
                                "arrivalTime": this.start,
                                "isReadOnly": false,
                                "start": this.start,
                                "end": this.end,
                                "calendar": this.calendar,
                                "scheduletype": "51b732232e837550c90851fb",
                                "duration": 20,
                                "plannedDuration": 20,
                                "patient": '57580e18454cec874189c33b',
                                "adhoc": false,
                                "pushtime": this.start,
                                "eta": this.start,
                                "scheduled": 0,
                                "lastEditedDate": this.start,
                                "lastChanged": this.start,
                                "roomId": '000000000000000000000001'
                            } )
                        } );

                        this.schedule = result[0];
                    } );

                    describe( '.put()', function() {

                        context( 'with a change of start and end time less than 20 minutes', function() {

                            it( 'keeps the room', async function() {
                                const start = moment( this.start ).add( 10, 'minutes' ).toISOString();
                                const end = moment( this.startNoChange ).add( 10, 'minutes' ).toISOString();

                                await candidate.put( {
                                    user: this.user,
                                    query: {_id: this.schedule},
                                    data: Y.doccirrus.filters.cleanDbObject( {
                                        start: start,
                                        end: end
                                    } ),
                                    fields: ['start', 'end'],
                                    noValidation: true
                                } );

                                const result = await Y.doccirrus.mongodb.runDb( {
                                    user: this.user,
                                    model: 'schedule',
                                    action: 'get',
                                    query: {_id: this.schedule}
                                } );

                                expect( result ).to.be.an( 'array' ).with.lengthOf( 1 );
                                expect( result[0] ).to.be.an( 'object' ).that.have.property( 'roomId' ).that.not.equal( null );
                            } );
                        } );

                        context( 'with a change of start and end time more than 20 minutes', function() {

                            it( 'releases the room', async function() {
                                const start = moment( this.start ).add( 25, 'hours' ).toISOString();
                                const end = moment( this.startUpdate ).add( 10, 'minutes' ).toISOString();

                                await candidate.put( {
                                    user: this.user,
                                    query: {_id: this.schedule},
                                    data: Y.doccirrus.filters.cleanDbObject( {
                                        start: start,
                                        end: end
                                    } ),
                                    fields: ['start', 'end'],
                                    noValidation: true
                                } );

                                const result = await Y.doccirrus.mongodb.runDb( {
                                    user: this.user,
                                    model: 'schedule',
                                    action: 'get',
                                    query: {_id: this.schedule}
                                } );

                                expect( result ).to.be.an( 'array' ).with.lengthOf( 1 );
                                expect( result[0] ).to.be.an( 'object' ).that.have.property( 'roomId' ).that.equal( null );
                            } );
                        } );
                    } );
                } );

                context( 'given a schedule over 2 hours', function() {

                    beforeEach( async function() {
                        // TODO use a lib for fixtures instead of using the internal API
                        const result = await Y.doccirrus.mongodb.runDb( {
                            user: this.user,
                            model: 'schedule',
                            action: 'post',
                            data: Y.doccirrus.filters.cleanDbObject( {
                                "urgency": 0,
                                "severity": "NONE",
                                "allDay": false,
                                "repetition": "NONE",
                                "byweekday": [],
                                "wasInTreatment": false,
                                "isReadOnly": false,
                                "start": this.start,
                                "end": this.end,
                                "scheduletype": this.type.default,
                                "duration": 15,
                                "plannedDuration": 15,
                                "interval": 1,
                                "adhoc": false,
                                "calendar": this.calendar
                            } )
                        } );

                        this.schedule = result[0];
                    } );

                    describe( '.createCloseDay()', function() {

                        context( 'with an overlapping close event', function() {

                            it( 'creates not a close event', async function() {
                                const start = moment().hour( 0 ).minute( 0 ).second( 0 ).millisecond( 0 ).toISOString();
                                const end = moment( start ).add( 23, 'hours' ).add( 59, 'minutes' ).toISOString();

                                await expect( candidate.createCloseDayEvent( {
                                    user: this.user,
                                    data: [
                                        {
                                            "title": "TestCloseDay",
                                            "allDay": true,
                                            "start": start,
                                            "end": end,
                                            "closeTime": true,
                                            "closeDayType": "OTHER",
                                            "calendar": this.calendar
                                        }]
                                } ) ).to.be.eventually.rejected.and.with.property( 'code' ).to.equal( 7009 );
                            } );
                        } );
                    } );

                    describe( '.put()', function() {

                        context( 'with a shift of one hour for the given schedule', function() {

                            beforeEach( async function() {
                                this.counter = 0;

                                // wait some time to finish all previous schedule creations with post-processes
                                await wait( this, 500 );

                                Y.doccirrus.communication.event.on( 'onSendMessagesForEvents', () => {
                                    this.counter++;
                                } );
                            } );

                            afterEach( function() {
                                Y.doccirrus.communication.event.removeAllListeners( 'onSendMessagesForEvents' );
                            } );

                            it( 'should send a message for events', async function() {
                                await candidate.put( {
                                    user: this.user,
                                    query: {_id: this.schedule},
                                    data: Y.doccirrus.filters.cleanDbObject( {
                                        isManualChange: true,
                                        start: moment( this.start ).add( 1, 'h' ).toISOString(),
                                        end: moment( this.end ).add( 3, 'h' ).seconds( 0 ).milliseconds( 0 ).toISOString()
                                    } ),
                                    fields: ['start', 'end']
                                } );

                                expect( this.counter ).to.equal( 1 );
                            } );
                        } );
                    } );
                } );

                context( 'given an unregistered user', function() {
                    let onlineConsultationId;

                    beforeEach( function() {
                        this.patient = {
                            firstname: 'test',
                            lastname: 'test',
                            email: 'test@test.com'
                        };
                    } );

                    describe( '.post()', function() {

                        context( 'with an online consultation schedule for the given user', function() {

                            beforeEach( async function() {
                                this.schedule = {
                                    start: this.start,
                                    end: this.end,
                                    scheduletype: this.type.online,
                                    duration: 10,
                                    plannedDuration: 10,
                                    calendar: this.calendar,
                                    type: 'BOOKED',
                                    adhoc: false,
                                    allDay: false,
                                    isFromPortal: true,
                                    isPublicVC: true,
                                    patientData: this.patient,
                                    employee: '100000000000000000000003',
                                    conferenceType: Y.doccirrus.schemas.conference.conferenceTypes.ONLINE_CONSULTATION,
                                    pushtime: 0,
                                    eta: this.start,
                                    scheduled: 0
                                };

                                this.counter = 0;

                                Y.doccirrus.email.event.on( 'onSendEmail', ( email ) => {
                                    this.email = email;
                                    this.counter++;
                                } );
                            } );

                            afterEach( async function() {
                                // TODO move this to the upper context
                                await Y.doccirrus.mongodb.runDb( {
                                    user: this.user,
                                    model: 'schedule',
                                    action: 'delete',
                                    query: {_id: {$exists: true}},
                                    options: {
                                        override: true
                                    }
                                } );

                                await Y.doccirrus.mongodb.runDb( {
                                    user: this.user,
                                    model: 'conference',
                                    action: 'delete',
                                    query: {_id: {$exists: true}},
                                    options: {
                                        override: true
                                    }
                                } );

                                await Y.doccirrus.mongodb.runDb( {
                                    user: this.user,
                                    model: 'patient',
                                    action: 'delete',
                                    query: {_id: {$exists: true}},
                                    options: {
                                        override: true
                                    }
                                } );

                                Y.doccirrus.email.event.removeAllListeners( 'onSendEmail' );
                            } );

                            it( 'creates a valid online schedule', async function() {
                                await candidate.post( {
                                    user: this.user,
                                    data: this.schedule
                                } );

                                const result = await Y.doccirrus.mongodb.runDb( {
                                    user: this.user,
                                    model: 'schedule',
                                    action: 'get'
                                } );

                                expect( result ).to.be.an( 'array' ).with.lengthOf( 1 );
                                expect( result[0] ).should.be.an( 'object' );

                                expect( result[0] ).to.have.property( 'scheduled' ).that.equal( Y.doccirrus.schemas.calendar.SCH_UNCONFIRMED );
                                expect( result[0] ).to.have.property( 'conferenceId' );
                                expect( result[0] ).to.have.property( 'patient' );
                            } );

                            it( 'creates a valid online conference', async function() {
                                await candidate.post( {
                                    user: this.user,
                                    data: this.schedule
                                } );

                                const result = await Y.doccirrus.mongodb.runDb( {
                                    user: this.user,
                                    model: 'conference',
                                    action: 'get'
                                } );

                                expect( result ).to.be.an( 'array' ).with.lengthOf( 1 );

                                expect( result[0] ).to.be.an( 'object' );
                                expect( result[0] ).to.have.property( 'status' ).that.equal( Y.doccirrus.schemas.conference.conferenceStatuses.UNCONFIRMED );
                                expect( result[0] ).to.have.property( 'participants' ).that.is.an( 'array' ).which.has.lengthOf( 1 );

                                expect( result[0].participants[0] ).have.property( 'firstname' ).that.equal( this.patient.firstname );
                                expect( result[0].participants[0] ).have.property( 'lastname' ).that.equal( this.patient.lastname );
                                expect( result[0].participants[0] ).have.property( 'email' ).that.equal( this.patient.email );
                            } );

                            it( 'creates a new patient entry for the given user', async function() {
                                await candidate.post( {
                                    user: this.user,
                                    data: this.schedule
                                } );

                                const result = await Y.doccirrus.mongodb.runDb( {
                                    user: this.user,
                                    model: 'patient',
                                    action: 'get'
                                } );

                                expect( result ).to.be.an( 'array' ).with.lengthOf( 1 );

                                expect( result[0] ).to.be.an( 'object' );
                                expect( result[0] ).to.have.property( 'isStub' ).that.equal( true );
                                expect( result[0] ).to.have.property( 'firstname' ).that.equal( this.patient.firstname );
                                expect( result[0] ).to.have.property( 'lastname' ).that.equal( this.patient.lastname );
                                expect( result[0] ).to.have.property( 'communications' ).to.be.an( 'array' ).which.has.lengthOf( 1 );
                                expect( result[0].communications[0] ).to.be.an( 'object' );
                                expect( result[0].communications[0] ).to.have.property( 'value' ).that.equal( this.patient.email );
                            } );

                            it( 'sends an email to the unregistered user', async function() {
                                await candidate.post( {
                                    user: this.user,
                                    data: this.schedule
                                } );

                                const result = await Y.doccirrus.mongodb.runDb( {
                                    user: this.user,
                                    model: 'schedule',
                                    action: 'get'
                                } );
                                const url = Y.doccirrus.auth.getPUCUrl(
                                    `/inconference/confirmVC?prac=${mochaUtils.getPracticeNo()}&schedule=${result[0]._id}`
                                );
                                const start = moment( result[0].start );

                                expect( this.counter ).equal( 1 );
                                expect( this.email.to ).to.equal( this.patient.email );
                                expect( this.email.html ).to.have.string(
                                    `Guten Tag ${this.patient.firstname} ${this.patient.lastname}, <br/><br/>hiermit laden wir Sie herzlich zur Teilnahme an unserer Videosprechstunde am ${start.format( 'DD.MM.YYYY' )} um ${start.format( 'HH:mm' )} Uhr ein. Bitte bestätigen Sie den Termin. Sie erhalten dann 30 Minuten vor dem Termin eine weitere E-Mail mit den Zugangsdaten zur Videosprechstunde.<br/><br/><a href="${url}" style="background: #22405E; color: white; display: inline-block; width: auto; text-align: center;text-decoration:none;border:10px solid #22405E;font-weight: bold;font-size: 15px;font-style: normal"><span>Termin bestätigen</span></a><br><br>Falls Sie den Termin nicht bestätigen, müssen Sie nichts weiter tun. Die erhobenen Daten und der Termin werden automatisch gelöscht.<br>Für die Teilnahme öffnen Sie den Zugangslink in einem aktuellen Chrome, Firefox oder Edge. Des Weiteren benötigen Sie an Ihrem Rechner ein Mikrofon, Lautsprecher und eine Kamera, um teilnehmen zu können.<br>Sie können <a href='https://test.webrtc.org/' target='_blank'>hier</a> testen, ob sie über die notwendigen Voraussetzungen verfügen.<br/><br/>Mit freundlichen Grüßen,`
                                );
                            } );
                        } );
                    } );

                    context( 'given an online consultation schedule and conference for an unregistered user', function() {

                        beforeEach( async function() {
                            // TODO use fixtures for this instead of creating this through the internal API
                            this.schedule = await candidate.post( {
                                user: this.user,
                                data: {
                                    start: this.start,
                                    end: this.end,
                                    scheduletype: this.type.online,
                                    duration: 10,
                                    plannedDuration: 10,
                                    calendar: this.calendar,
                                    type: 'BOOKED',
                                    adhoc: false,
                                    allDay: false,
                                    isFromPortal: true,
                                    isPublicVC: true,
                                    patientData: this.patient,
                                    employee: '100000000000000000000003',
                                    conferenceType: Y.doccirrus.schemas.conference.conferenceTypes.ONLINE_CONSULTATION,
                                    pushtime: 0,
                                    eta: this.start,
                                    scheduled: 0
                                }
                            } );
                        } );

                        afterEach( function() {
                            Y.doccirrus.email.event.removeAllListeners( 'onSendEmail' );
                        } );

                        describe( '.put()', function() {

                            context( 'with a confirmation for the given schedule', function() {

                                beforeEach( async function() {
                                    await candidate.put( {
                                        user: this.user,
                                        query: {_id: this.schedule},
                                        data: {confirmedVC: true}
                                    } );
                                } );

                                afterEach( async function() {
                                    // TODO move this to the upper context
                                    await Y.doccirrus.mongodb.runDb( {
                                        user: this.user,
                                        model: 'schedule',
                                        action: 'delete',
                                        query: {_id: {$exists: true}},
                                        options: {
                                            override: true
                                        }
                                    } );
                                } );

                                it( 'confirms the schedule', async function() {
                                    const result = await Y.doccirrus.mongodb.runDb( {
                                        user: this.user,
                                        model: 'schedule',
                                        action: 'get',
                                        query: {_id: this.schedule}
                                    } );

                                    expect( result ).to.be.an( 'array' ).with.lengthOf( 1 );
                                    expect( result[0] ).to.be.an( 'object' );
                                    expect( result[0] ).to.have.property( 'scheduled' ).that.equal(
                                        Y.doccirrus.schemas.calendar.SCH_WAITING
                                    );
                                } );

                                it( 'confirms the conference', async function() {
                                    const result = await Y.doccirrus.mongodb.runDb( {
                                        user: this.user,
                                        model: 'conference',
                                        action: 'get',
                                        query: {_id: onlineConsultationId}
                                    } );

                                    expect( result ).to.be.an( 'array' ).with.lengthOf( 1 );
                                    expect( result[0] ).to.be.an( 'object' );
                                    expect( result[0] ).to.have.property( 'status' ).that.equal(
                                        Y.doccirrus.schemas.conference.conferenceStatuses.NEW
                                    );
                                } );
                            } );
                        } );
                    } );
                } );

                // TODO make this work with a clear description using given-when-then or remove it
                context.skip( 'given a group master', function() {

                    before( async function() {
                        const result = await candidate.post( {
                            user: this.user,
                            data: {
                                "start": this.start,
                                "end": this.end,
                                "calendar": this.calendar,
                                "scheduletype": this.type.slot,
                                "duration": 10,
                                "group": true,
                                "plannedDuration": 10,
                                "severity": "NONE",
                                "repetition": "NONE",
                                "interval": 1,
                                "adhoc": false,
                                "scheduled": 0,
                                "title": "",
                                "capacityOfGroup": 1,
                                "urgency": 0,
                                "userDescr": "",
                                "byweekday": [],
                                "allDay": false,
                                // TODO looks like a code smell
                                notConfirmed: true
                            }
                        } );

                        this.groupMasterId = result.scheduleId.toString();
                    } );

                    it( 'post group member (fits into slot)', async function() {
                        await candidate.post( {
                            user: this.user,
                            data: {
                                "start": this.start,
                                "end": this.end,
                                "calendar": this.calendar,
                                "scheduletype": this.type.slot,
                                "duration": 10,
                                "plannedDuration": 10,
                                "severity": "NONE",
                                "repetition": "NONE",
                                "interval": 1,
                                "adhoc": false,
                                "scheduled": 0,
                                "title": "",
                                "urgency": 0,
                                "userDescr": "",
                                "byweekday": [],
                                "allDay": false,
                                notConfirmed: true,
                                _resultsOnly: true
                            }
                        } );

                    } );

                    it( 'get group member schedule', async function() {
                        const results = await Y.doccirrus.mongodb.runDb( {
                            user: this.user,
                            model: 'schedule',
                            action: 'get',
                            query: {groupId: this.groupMasterId},
                            options: {
                                sort: {_id: -1}
                            }
                        } );

                        should.exist( results );
                        results.should.be.an( 'array' ).which.has.lengthOf( 1 );
                    } );

                    it( 'post group member (no more rooms in group)', async function() {
                        await expect( candidate.post( {
                            user: this.user,
                            data: {
                                "start": this.start,
                                "end": this.end,
                                "calendar": this.calendar,
                                "scheduletype": this.type.slot,
                                "duration": 10,
                                "plannedDuration": 10,
                                "severity": "NONE",
                                "repetition": "NONE",
                                "interval": 1,
                                "adhoc": false,
                                "scheduled": 0,
                                "title": "",
                                "urgency": 0,
                                "userDescr": "",
                                "byweekday": [],
                                "allDay": false,
                                notConfirmed: true
                            }
                        } ) ).to.be.rejected.and.property( 'code' ).to.equal( 7010 );
                    } );
                } );
            } );
        } );

        context('given group appointment', function () {
            beforeEach( async function() {
                this.sendEventCount = 0;
                Y.doccirrus.communication.event.on( 'onSendMessagesForEvents',
                    () =>
                        {
                            this.sendEventCount++;
                        } );

                const scheduleType = await Y.doccirrus.mongodb.runDb( {
                                    user: this.user,
                                    model: 'scheduletype',
                                    action: 'post',
                                    data: Y.doccirrus.filters.cleanDbObject( {
                                        _id: "60210a104dc5617c4e5d237e",
                                        "__v": 0,
                                        "duration": 15,
                                        "durationUnit": "MINUTES",
                                        "isPublic": true,
                                        "name": "Group Schedule type",
                                        "calendarRefs": [],
                                        "capacity": 3,
                                        "numberOfSuggestedAppointments": 10,
                                        "info": "",
                                        "isPreconfigured": true,
                                        "type": "STANDARD"
                                    } )
                                } );

                const mainScheduleResult = await Y.doccirrus.mongodb.runDb( {
                    user: this.user,
                    model: 'schedule',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( {
                        "start": moment().add( 60, 'm' ).toISOString(),
                        "end": moment().add( 70, 'm').toISOString(),
                        "calendar": '515ae9604013671c12c1c900',
                        "scheduletype": scheduleType[0],
                        "group": true,
                        "duration": 10,
                        "plannedDuration": 10,
                        "interval": 1,
                        "adhoc": false,
                        "scheduled": 0,
                        "byweekday": [],
                        "repetition": "NONE",
                        "allDay": false,
                        "userDescr": "1111"
                    } )
                } );

                this.mainSchedule = mainScheduleResult[0];

                await Y.doccirrus.mongodb.runDb( {
                    user: this.user,
                    model: 'schedule',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( {
                        "start": moment().add( 60, 'm' ).toISOString(),
                        "end": moment().add( 70, 'm').toISOString(),
                        "calendar": '515ae9604013671c12c1c900',
                        "scheduletype": "60210a104dc5617c4e5d237e",
                        "patient": '57580e18454cec874189c33b',
                        "groupId": this.mainSchedule,
                        "duration": 10,
                        "plannedDuration": 10,
                        "interval": 1,
                        "adhoc": false,
                        "scheduled": 0,
                        "byweekday": [],
                        "repetition": "NONE",
                        "allDay": false,
                        "userDescr": "1111"
                    } )
                } );
            } );
            afterEach( function() {
                Y.doccirrus.communication.event.removeAllListeners( 'onSendMessagesForEvents' );
            } );

            it('sends email when appoint is moved', async function() {
                const start = moment().add( 25, 'hours' ).toISOString();
                const end = moment( start ).add( 10, 'minutes' ).toISOString();
                await candidate.put( {
                    user: this.user,
                    query: { _id: this.mainSchedule },
                    data: Y.doccirrus.filters.cleanDbObject( {
                        start: start,
                        end: end
                    } ),
                    fields: ['start', 'end'],
                    noValidation: true
                } );

                this.sendEventCount.should.equal( 1 );
            });
        });
    } );
} );
