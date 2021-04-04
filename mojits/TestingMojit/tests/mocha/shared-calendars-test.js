/**
 * User: pi
 * Date: 05.12.17  08:58
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global Y, should, it, describe, before */

const
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    mongoose = require( 'mongoose' ),
    fs = require( 'fs' ),
    {wait} = require( '../utils' ),
    {formatPromiseResult, promisifyArgsCallback} = require( 'dc-core' ).utils,
    locationId = new mongoose.Types.ObjectId().toString(),
    masterCalendarId = new mongoose.Types.ObjectId().toString(),
    masterScheduleType1 = new mongoose.Types.ObjectId().toString(),
    masterScheduleType2 = new mongoose.Types.ObjectId().toString(),
    masterScheduleType3 = new mongoose.Types.ObjectId().toString(),
    masterPatientId = new mongoose.Types.ObjectId().toString(),
    transferedPatientId = new mongoose.Types.ObjectId().toString(),
    patient1Id = new mongoose.Types.ObjectId().toString(),
    patient2Id = new mongoose.Types.ObjectId().toString(),
    user = Y.doccirrus.auth.getSUForLocal(),
    updateCalendarsP = promisifyArgsCallback( Y.doccirrus.api.mirrorcalendar.updateCalendars ),
    caleventPostP = promisifyArgsCallback( Y.doccirrus.api.calevent.post ),
    caleventPutP = promisifyArgsCallback( Y.doccirrus.api.calevent.put ),
    caleventDeleteP = promisifyArgsCallback( Y.doccirrus.api.calevent.delete ),
    scheduleTestData = JSON.parse( fs.readFileSync( `${__dirname}/../fixtures/shared-calendar/schedule.json`, 'utf8' ) ),
    scheduletypeTestData = JSON.parse( fs.readFileSync( `${__dirname}/../fixtures/shared-calendar/scheduletype.json`, 'utf8' ) ),
    calendarTestData = JSON.parse( fs.readFileSync( `${__dirname}/../fixtures/shared-calendar/calendar.json`, 'utf8' ) ),
    partnerTestData = JSON.parse( fs.readFileSync( `${__dirname}/../fixtures/shared-calendar/partner.json`, 'utf8' ) ),
    excludedProps = [
        '_id',
        'calendar',
        'scheduletype',
        'partner',
        'lastEditedDate',
        'pushtime',
        'eta',
        'patient',
        'title',
        'lastChanged'
    ];

function checkThatSchedulesAreIdentical( schedules ) {
    Object.keys( schedules[0] ).forEach( key => {
        if( excludedProps.includes( key ) ) {
            return;
        }
        schedules[0][key].should.deep.equal( schedules[1][key] );
    } );
}

async function insertScheduletype( data ) {
    let [err, result] = await formatPromiseResult(
        Y.doccirrus.mongodb.runDb( {
            user,
            model: 'scheduletype',
            action: 'post',
            data: Object.assign( {skipcheck_: true}, scheduletypeTestData, data, {calendarRefs: [{calendarId: masterCalendarId}]} )
        } )
    );
    should.not.exist( err );
    should.exist( result );
}

async function cleanScheduleCollection() {
    await Y.doccirrus.mongodb.runDb( {
        user,
        model: 'schedule',
        action: 'delete',
        query: {
            _id: {$exists: true}
        },
        options: {
            override: true
        }
    } );
}

/**
 * This test covers synchronisation of shared calendar, schedule synchronisation warnings.
 */
describe( 'Test schedule sync of shared calendars', function() {
    let
        sharedCalendar,
        scheduletypeMap = new Map();
    describe( '0. Setup', () => {
        it( 'Cleans db', function( done ) {
            this.timeout( 20000 );
            mochaUtils.cleanDB( {user}, err => {
                should.not.exist( err );
                done();
            } );
        } );
        it( 'Inserts practice', async () => {
            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'practice',
                    action: 'post',
                    data: Object.assign( {
                        skipcheck_: true
                    }, mochaUtils.getPracticeData() )
                } )
            );
            should.not.exist( err );
            should.exist( result );
        } );
        it( 'Inserts mochaTestCustomerNo2 partner record', async () => {
            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'partner',
                    action: 'post',
                    data: Object.assign( {skipcheck_: true}, partnerTestData,
                        {name: `${mochaUtils.getSecondPracticeNo()} Praxis`, dcId: mochaUtils.getSecondPracticeNo()} )
                } )
            );
            should.not.exist( err );
            should.exist( result );
        } );
        it( 'Inserts mochaTestCustomerNo partner record', async () => {
            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'partner',
                    action: 'post',
                    data: Object.assign( {skipcheck_: true}, partnerTestData,
                        {name: `${mochaUtils.getPracticeNo()} Praxis`, dcId: mochaUtils.getPracticeNo()} )
                } )
            );
            should.not.exist( err );
            should.exist( result );
        } );
        it( 'Inserts "master" calendar', async () => {
            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'calendar',
                    action: 'post',
                    data: Object.assign( {skipcheck_: true}, calendarTestData, {_id: masterCalendarId} )
                } )
            );
            should.not.exist( err );
            should.exist( result );
        } );
        it( 'Inserts scheduletype 1 for "master" calendar', function() {
            return insertScheduletype( {
                name: "Mocha Standard 1",
                _id: masterScheduleType1
            } );
        } );
        it( 'Inserts scheduletype 2 for "master" calendar', function() {
            return insertScheduletype( {
                name: "Mocha Standard 2",
                _id: masterScheduleType2
            } );
        } );
        it( 'Inserts scheduletype 3 for "master" calendar', function() {
            return insertScheduletype( {
                name: "Mocha Standard 3",
                _id: masterScheduleType3
            } );
        } );
        it( 'Insert shared calendar into partner system', async () => {
            const
                data = {
                    calendars: [
                        {
                            name: "Lego calendar",
                            calGroup: [],
                            locationId: locationId,
                            consultTimes: [],
                            specificConsultTimes: [],
                            color: "#258a39",
                            active: true,
                            prcCustomerNo: mochaUtils.getSecondPracticeNo(),
                            prcCoName: "Gotham Praxis",
                            originalId: masterCalendarId
                        }
                    ]
                };
            let [err] = await formatPromiseResult(
                updateCalendarsP( {
                    user,
                    data
                } )
            );
            should.not.exist( err );
        } );
        it( 'Wait post process', async function() {
            await wait( this, 1000 );
        } );
        it( 'Gets calendars', async () => {
            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'calendar',
                    action: 'get',
                    query: {}
                } )
            );
            should.not.exist( err );
            should.exist( result );
            result.should.be.an( 'array' ).which.has.lengthOf( 2 );
            result.forEach( item => {
                if( item._id.toString() !== masterCalendarId ) {
                    sharedCalendar = item;
                }
            } );
        } );
        it( 'Gets mirrorscheduletype', async () => {
            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'mirrorscheduletype',
                    action: 'get',
                    query: {}
                } )
            );
            should.not.exist( err );
            should.exist( result );
            result.should.be.an( 'array' ).which.has.lengthOf( 3 );
            result.forEach( item => {
                scheduletypeMap.set( item.originalId.toString(), item );
            } );
        } );
        it( 'Insert master patient', async () => {
            const
                patientData = mochaUtils.getPatientData( {
                    firstname: 'test',
                    lastname: 'patient',
                    _id: masterPatientId,
                    skipcheck_: true
                } );
            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'patient',
                    action: 'post',
                    data: patientData
                } )
            );
            should.not.exist( err );
            should.exist( result );
        } );
        it( 'Insert transferred patient', async () => {
            const
                patientData = mochaUtils.getPatientData( {
                    firstname: 'test',
                    lastname: 'patient_transferred',
                    mirrorPatientId: masterPatientId,
                    _id: transferedPatientId,
                    skipcheck_: true
                } );
            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'patient',
                    action: 'post',
                    data: patientData
                } )
            );
            should.not.exist( err );
            should.exist( result );
        } );
        it( 'Insert mirror patient', async () => {
            const
                patientData = mochaUtils.getPatientData( {
                    firstname: 'test',
                    lastname: 'patient_mirror',
                    _id: masterPatientId,
                    skipcheck_: true
                } );
            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'mirrorpatient',
                    action: 'post',
                    data: patientData
                } )
            );
            should.not.exist( err );
            should.exist( result );
        } );
        it( 'Insert patient 1', async () => {
            const
                patientData = mochaUtils.getPatientData( {
                    firstname: 'test',
                    lastname: 'patient 1',
                    _id: patient1Id,
                    skipcheck_: true
                } );
            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'patient',
                    action: 'post',
                    data: patientData
                } )
            );
            should.not.exist( err );
            should.exist( result );
        } );
        it( 'Insert patient 2', async () => {
            const
                patientData = mochaUtils.getPatientData( {
                    firstname: 'test',
                    lastname: 'patient 2',
                    _id: patient2Id,
                    skipcheck_: true
                } );
            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'patient',
                    action: 'post',
                    data: patientData
                } )
            );
            should.not.exist( err );
            should.exist( result );
        } );
    } );
    describe( '1. Test schedules sync between shared calendar and master calendar ', function() {
        const
            userDescr = 'new Title 123',
            details = 'new details 123';
        let
            schedules;
        it( 'Inserts schedule in shared calendar', async () => {
            let [err] = await formatPromiseResult(
                caleventPostP( {
                    user,
                    data: Object.assign( {}, scheduleTestData, {
                        calendar: sharedCalendar._id.toString(),
                        patient: masterPatientId,
                        scheduletype: scheduletypeMap.get( masterScheduleType1 )._id.toString()
                    } )
                } )
            );
            should.not.exist( err );
        } );
        it( 'Gets schedules', async () => {
            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'schedule',
                    action: 'get',
                    query: {},
                    options: {
                        sort: {_id: -1}
                    }
                } )
            );
            should.not.exist( err );
            should.exist( result );
            result.should.be.an( 'array' ).which.has.lengthOf( 2 );
            result[0].calendar.toString().should.equal( sharedCalendar._id.toString() );
            result[0].scheduletype.should.equal( scheduletypeMap.get( masterScheduleType1 )._id.toString() );
            result[0].patient.toString().should.equal( masterPatientId );
            result[1].calendar.toString().should.equal( masterCalendarId );
            result[1].scheduletype.should.equal( masterScheduleType1 );
            result[1].patient.toString().should.equal( transferedPatientId );
            schedules = result;
        } );
        it( 'Checks that schedules are identical', function() {
            checkThatSchedulesAreIdentical( schedules );
        } );
        it( 'Updates shared schedule', async () => {
            const
                scheduleData = Object.assign( {}, schedules[0] ),
                scheduleId = scheduleData._id.toString();
            delete scheduleData._id;
            scheduleData.userDescr = userDescr;
            scheduleData.scheduletype = scheduletypeMap.get( masterScheduleType2 )._id.toString();
            let [err] = await formatPromiseResult(
                caleventPutP( {
                    user,
                    fields: Object.keys( scheduleData ).concat( ['bysetpos'] ),
                    data: scheduleData,
                    query: {
                        _id: scheduleId
                    }
                } )
            );
            should.not.exist( err );
        } );
        it( 'Wait post process', async function() {
            await wait( this, 1000 );
        } );
        it( 'Gets schedules', async () => {
            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'schedule',
                    action: 'get',
                    query: {},
                    options: {
                        sort: {_id: -1}
                    }
                } )
            );
            should.not.exist( err );
            should.exist( result );
            result.should.be.an( 'array' ).which.has.lengthOf( 2 );
            result[0].calendar.toString().should.equal( sharedCalendar._id.toString() );
            result[0].scheduletype.should.equal( scheduletypeMap.get( masterScheduleType2 )._id.toString() );
            result[0].userDescr.should.equal( userDescr );
            result[1].calendar.toString().should.equal( masterCalendarId );
            result[1].scheduletype.should.equal( masterScheduleType2 );
            result[1].userDescr.should.equal( userDescr );
            schedules = result;
        } );
        it( 'Checks that schedules are identical', function() {
            checkThatSchedulesAreIdentical( schedules );
        } );
        it( 'Updates master schedule', async () => {
            const
                scheduleData = Object.assign( {}, schedules[1] ),
                scheduleId = scheduleData._id.toString();
            delete scheduleData._id;
            scheduleData.details = details;
            scheduleData.scheduletype = masterScheduleType3;
            let [err] = await formatPromiseResult(
                caleventPutP( {
                    user,
                    fields: Object.keys( scheduleData ).concat( ['bysetpos'] ),
                    data: scheduleData,
                    query: {
                        _id: scheduleId
                    }
                } )
            );
            should.not.exist( err );
        } );
        it( 'Wait post process', async function() {
            await wait( this, 1000 );
        } );
        it( 'Gets schedules', async () => {
            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'schedule',
                    action: 'get',
                    query: {},
                    options: {
                        sort: {_id: -1}
                    }
                } )
            );
            should.not.exist( err );
            should.exist( result );
            result.should.be.an( 'array' ).which.has.lengthOf( 2 );
            result[0].calendar.toString().should.equal( sharedCalendar._id.toString() );
            result[0].scheduletype.should.equal( scheduletypeMap.get( masterScheduleType3 )._id.toString() );
            result[0].details.should.equal( details );
            result[1].calendar.toString().should.equal( masterCalendarId );
            result[1].scheduletype.should.equal( masterScheduleType3 );
            result[1].details.should.equal( details );
            schedules = result;
        } );
        it( 'Checks that schedules are identical', function() {
            checkThatSchedulesAreIdentical( schedules );
        } );
        it( 'Delete shared schedule', async () => {
            const
                scheduleId = schedules[0]._id.toString();
            let [err] = await formatPromiseResult(
                caleventDeleteP( {
                    user,
                    query: {
                        _id: scheduleId
                    }
                } )
            );
            should.not.exist( err );
        } );
        it( 'Wait post process', async function() {
            await wait( this, 1000 );
        } );
        it( 'Gets schedules', async () => {
            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'schedule',
                    action: 'get',
                    query: {},
                    options: {
                        sort: {_id: -1}
                    }
                } )
            );
            should.not.exist( err );
            should.exist( result );
            result.should.be.an( 'array' ).which.has.lengthOf( 0 );
        } );
    } );
    describe( '2. Test schedules sync warnings (on create)', function() {
        before( cleanScheduleCollection );
        /**
         * 1. patient does not exist on master side - warning
         * 2. scheduletype has been deleted on master side - error
         */
        it( 'Inserts schedule in shared calendar', async () => {
            let [err, warning] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.calevent.post( {
                        user,
                        data: Object.assign( {}, scheduleTestData, {
                            calendar: sharedCalendar._id.toString(),
                            patient: patient1Id, // this patient was not transferred.
                            scheduletype: scheduletypeMap.get( masterScheduleType1 )._id.toString()
                        } ),
                        callback( err, result, warning ) {
                            if( err ) {
                                return reject( err );
                            }
                            resolve( warning );
                        }
                    } );
                } )
            );
            should.not.exist( err );
            should.exist( warning );
            warning.code.should.equal( 100002 );
        } );
        it( 'Gets schedules', async () => {
            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'schedule',
                    action: 'get',
                    query: {},
                    options: {
                        sort: {_id: -1}
                    }
                } )
            );
            should.not.exist( err );
            should.exist( result );
            result.should.be.an( 'array' ).which.has.lengthOf( 2 );
        } );
        it( 'Deletes masterScheduleType3', async () => {
            let [err] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'scheduletype',
                    action: 'delete',
                    query: {
                        _id: masterScheduleType3
                    }
                } )
            );
            should.not.exist( err );
        } );
        it( 'Inserts schedule in shared calendar', async () => {
            let [err] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.calevent.post( {
                        user,
                        data: Object.assign( {}, scheduleTestData, {
                            calendar: sharedCalendar._id.toString(),
                            scheduletype: scheduletypeMap.get( masterScheduleType3 )._id.toString(),
                            patient: null
                        } ),
                        callback( err ) {
                            if( err ) {
                                return reject( err );
                            }
                            resolve();
                        }
                    } );
                } )
            );
            should.exist( err );
            err.code.should.equal( 70001 );
        } );
        it( 'Gets schedules', async () => {
            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'schedule',
                    action: 'get',
                    query: {},
                    options: {
                        sort: {_id: -1}
                    }
                } )
            );
            should.not.exist( err );
            should.exist( result );
            result.should.be.an( 'array' ).which.has.lengthOf( 2 );
        } );
    } );
    describe( '3. Test schedules sync warnings (on update partner => master)', function() {
        let
            schedules;
        before( cleanScheduleCollection );
        /**
         * partner actions
         * 1. set patient which does not exist on master side - warning
         * 2. set scheduletype which does not exist (has been deleted) on master side - error
         */
        it( 'Inserts schedule in shared calendar', async () => {
            let [err, warning] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.calevent.post( {
                        user,
                        data: Object.assign( {}, scheduleTestData, {
                            calendar: sharedCalendar._id.toString(),
                            patient: masterPatientId, // this patient was not transferred.
                            scheduletype: scheduletypeMap.get( masterScheduleType1 )._id.toString()
                        } ),
                        callback( err, result, warning ) {
                            if( err ) {
                                return reject( err );
                            }
                            resolve( warning );
                        }
                    } );
                } )
            );
            should.not.exist( err );
            should.not.exist( warning );
        } );
        it( 'Gets schedules', async () => {
            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'schedule',
                    action: 'get',
                    query: {},
                    options: {
                        sort: {_id: -1}
                    }
                } )
            );
            should.not.exist( err );
            should.exist( result );
            result.should.be.an( 'array' ).which.has.lengthOf( 2 );
            schedules = result;
        } );
        it( 'Updates shared schedule patient', async () => {
            const
                scheduleData = Object.assign( {}, schedules[0] ),
                scheduleId = scheduleData._id.toString();

            delete scheduleData._id;
            scheduleData.patient = patient1Id;

            let [err, warning] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.calevent.put( {
                        user,
                        fields: Object.keys( scheduleData ).concat( ['bysetpos'] ),
                        data: scheduleData,
                        query: {
                            _id: scheduleId
                        },
                        callback( err, result, warning ) {
                            if( err ) {
                                return reject( err );
                            }
                            resolve( warning );
                        }
                    } );
                } )
            );
            should.not.exist( err );
            should.exist( warning );
            warning.code.should.equal( 100002 );
        } );
        it( 'Checks schedules', async () => {
            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'schedule',
                    action: 'get',
                    query: {},
                    options: {
                        sort: {_id: -1}
                    }
                } )
            );
            should.not.exist( err );
            should.exist( result );
            result.should.be.an( 'array' ).which.has.lengthOf( 2 );
            result[0].calendar.toString().should.equal( sharedCalendar._id.toString() );
            result[0].scheduletype.should.equal( scheduletypeMap.get( masterScheduleType1 )._id.toString() );
            result[0].patient.toString().should.equal( patient1Id );
            result[1].calendar.toString().should.equal( masterCalendarId );
            result[1].scheduletype.should.equal( masterScheduleType1 );
            should.not.exist( result[1].patient );
            schedules = result;
        } );
        it( 'Deletes masterScheduleType3', async () => {
            let [err] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'scheduletype',
                    action: 'delete',
                    query: {
                        _id: masterScheduleType3
                    }
                } )
            );
            should.not.exist( err );
        } );
        it( 'Updates shared schedule type', async () => {
            const
                scheduleData = Object.assign( {}, schedules[0] ),
                scheduleId = scheduleData._id.toString();

            delete scheduleData._id;
            scheduleData.scheduletype = scheduletypeMap.get( masterScheduleType3 )._id.toString();
            let [err] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.calevent.put( {
                        user,
                        fields: Object.keys( scheduleData ).concat( ['bysetpos'] ),
                        data: scheduleData,
                        query: {
                            _id: scheduleId
                        },
                        callback( err ) {
                            if( err ) {
                                return reject( err );
                            }
                            resolve();
                        }
                    } );
                } )
            );
            should.exist( err );
            err.code.should.equal( 70001 );
        } );
        it( 'Checks schedules', async () => {
            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'schedule',
                    action: 'get',
                    query: {},
                    options: {
                        sort: {_id: -1}
                    }
                } )
            );
            should.not.exist( err );
            should.exist( result );
            result.should.be.an( 'array' ).which.has.lengthOf( 2 );
            result[0].calendar.toString().should.equal( sharedCalendar._id.toString() );
            result[0].scheduletype.should.equal( scheduletypeMap.get( masterScheduleType1 )._id.toString() );
            result[1].calendar.toString().should.equal( masterCalendarId );
            result[1].scheduletype.should.equal( masterScheduleType1 );
        } );
    } );
    describe( '4. Test schedules sync warnings (on update master => partner)', function() {
        let
            schedules;
        before( cleanScheduleCollection );
        /**
         * master actions
         * 1. set patient which does not exist on partner side - warning
         * 2. set scheduletype which does not exist (has not been synchronised) on partner side - error
         */
        it( 'Inserts schedule in shared calendar', async () => {
            let [err, warning] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.calevent.post( {
                        user,
                        data: Object.assign( {}, scheduleTestData, {
                            calendar: sharedCalendar._id.toString(),
                            patient: masterPatientId, // this patient was not transferred.
                            scheduletype: scheduletypeMap.get( masterScheduleType1 )._id.toString()
                        } ),
                        callback( err, result, warning ) {
                            if( err ) {
                                return reject( err );
                            }
                            resolve( warning );
                        }
                    } );
                } )
            );
            should.not.exist( err );
            should.not.exist( warning );
        } );
        it( 'Gets schedules', async () => {
            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'schedule',
                    action: 'get',
                    query: {},
                    options: {
                        sort: {_id: -1}
                    }
                } )
            );
            should.not.exist( err );
            should.exist( result );
            result.should.be.an( 'array' ).which.has.lengthOf( 2 );
            schedules = result;
        } );
        it( 'Updates master schedule patient', async () => {
            const
                scheduleData = Object.assign( {}, schedules[1] ),
                scheduleId = scheduleData._id.toString();

            delete scheduleData._id;
            scheduleData.patient = patient1Id;
            let [err, warning] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.calevent.put( {
                        user,
                        fields: Object.keys( scheduleData ).concat( ['bysetpos'] ),
                        data: scheduleData,
                        query: {
                            _id: scheduleId
                        },
                        callback( err, result, warning ) {
                            if( err ) {
                                return reject( err );
                            }
                            resolve( warning );
                        }
                    } );
                } )
            );
            should.not.exist( err );
            should.exist( warning );
            warning.code.should.equal( 100002 );
        } );
        it( 'Get schedules', async () => {
            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'schedule',
                    action: 'get',
                    query: {},
                    options: {
                        sort: {_id: -1}
                    }
                } )
            );
            should.not.exist( err );
            should.exist( result );
            result.should.be.an( 'array' ).which.has.lengthOf( 2 );
            schedules = result;
        } );
        it( 'Inserts scheduletype 3 for "master" calendar again', () => {
            return insertScheduletype( {
                name: "Mocha Standard 3",
                _id: masterScheduleType3
            } );
        } );
        it( 'Wait post process', async function() {
            await wait( this, 1000 );
        } );
        it( 'Deletes mirror schedule type of masterScheduleType3', async () => {
            let [err] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'mirrorscheduletype',
                    action: 'delete',
                    query: {
                        originalId: masterScheduleType3
                    }
                } )
            );
            should.not.exist( err );
        } );
        it( 'Updates shared schedule type', async () => {
            const
                scheduleData = Object.assign( {}, schedules[1] ),
                scheduleId = scheduleData._id.toString();

            delete scheduleData._id;
            scheduleData.scheduletype = masterScheduleType3;
            let [err] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.calevent.put( {
                        user,
                        fields: Object.keys( scheduleData ).concat( ['bysetpos'] ),
                        data: scheduleData,
                        query: {
                            _id: scheduleId
                        },
                        callback( err, results, warning ) { //eslint-disable-line
                            if( warning ) {
                                return reject( warning );
                            }
                            resolve();
                        }
                    } );
                } )
            );
            should.exist( err );
            err.code.should.equal( 70001 );
        } );
        it( 'Checks schedules', async () => {
            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'schedule',
                    action: 'get',
                    query: {},
                    options: {
                        sort: {_id: -1}
                    }
                } )
            );
            should.not.exist( err );
            should.exist( result );
            result.should.be.an( 'array' ).which.has.lengthOf( 2 );
            result[0].calendar.toString().should.equal( sharedCalendar._id.toString() );
            result[0].scheduletype.should.equal( scheduletypeMap.get( masterScheduleType1 )._id.toString() );
            should.not.exist( result[0].patient );
            result[1].calendar.toString().should.equal( masterCalendarId );
            result[1].scheduletype.should.equal( masterScheduleType3 );
            result[1].patient.toString().should.equal( patient1Id );
        } );
    } );
    describe( '5. Test schedules sync when one of the side does not have schedule (was deleted and not synchronised)', function() {
        const
            userDescr = 'userDescr',
            userDescrMaster = 'userDescrMaster',
            newScheduleId = new mongoose.Types.ObjectId();
        let
            schedules;
        before( cleanScheduleCollection );
        /**
         * master actions
         * 1. set patient which does not exist on partner side - warning
         * 2. set scheduletype which does not exist (has not been synchronised) on partner side - error
         */
        it( 'Inserts schedule in shared calendar', async () => {
            let [err, warning] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.calevent.post( {
                        user,
                        data: Object.assign( {}, scheduleTestData, {
                            calendar: sharedCalendar._id.toString(),
                            patient: masterPatientId, // this patient was not transferred.
                            scheduletype: scheduletypeMap.get( masterScheduleType1 )._id.toString()
                        } ),
                        callback( err, result, warning ) {
                            if( err ) {
                                return reject( err );
                            }
                            resolve( warning );
                        }
                    } );
                } )
            );
            should.not.exist( err );
            should.not.exist( warning );
        } );
        it( 'Gets schedules', async () => {
            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'schedule',
                    action: 'get',
                    query: {},
                    options: {
                        sort: {_id: -1}
                    }
                } )
            );
            should.not.exist( err );
            should.exist( result );
            result.should.be.an( 'array' ).which.has.lengthOf( 2 );
            schedules = result;
        } );
        it( 'Changes _id of schedule on master side', async () => {
            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'schedule',
                    action: 'get',
                    query: {
                        _id: schedules[1]._id
                    }
                } )
            );
            should.not.exist( err );
            should.exist( result );
            result[0]._id = newScheduleId;
            [err] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'schedule',
                    action: 'mongoInsertOne',
                    data: result[0]
                } )
            );
            should.not.exist( err );
            [err] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'schedule',
                    action: 'delete',
                    query: {
                        _id: schedules[1]._id
                    }
                } )
            );
            should.not.exist( err );
        } );
        it( 'Get schedules', async () => {
            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'schedule',
                    action: 'get',
                    query: {},
                    options: {
                        sort: {_id: -1}
                    }
                } )
            );
            should.not.exist( err );
            should.exist( result );
            result.should.be.an( 'array' ).which.has.lengthOf( 2 );
            schedules = result;
        } );
        it( 'Updates shared schedule userDescr', async () => {
            const
                scheduleData = Object.assign( {}, schedules[0] ),
                scheduleId = scheduleData._id.toString();

            delete scheduleData._id;
            scheduleData.userDescr = userDescr;
            let [err] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.calevent.put( {
                        user,
                        fields: Object.keys( scheduleData ).concat( ['bysetpos'] ),
                        data: scheduleData,
                        query: {
                            _id: scheduleId
                        },
                        callback( err, result, warning ) { //eslint-disable-line
                            if( warning ) {
                                return reject( warning );
                            }
                            resolve();
                        }
                    } );
                } )
            );
            should.exist( err );
            err.code.should.equal( 'calevent_08' );
        } );
        it( 'Updates master schedule userDescr', async () => {
            const
                scheduleData = Object.assign( {}, schedules[1] ),
                scheduleId = scheduleData._id.toString();

            delete scheduleData._id;
            scheduleData.userDescr = userDescrMaster;
            let [err] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.calevent.put( {
                        user,
                        fields: Object.keys( scheduleData ).concat( ['bysetpos'] ),
                        data: scheduleData,
                        query: {
                            _id: scheduleId
                        },
                        callback( err, result, warning ) { //eslint-disable-line
                            if( warning ) {
                                return reject( warning );
                            }
                            resolve();
                        }
                    } );
                } )
            );
            should.exist( err );
            err.code.should.equal( 'calevent_08' );
        } );
        it( 'Checks schedules', async () => {
            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'schedule',
                    action: 'get',
                    query: {},
                    options: {
                        sort: {_id: -1}
                    }
                } )
            );
            should.not.exist( err );
            should.exist( result );
            result.should.be.an( 'array' ).which.has.lengthOf( 2 );
            result[0].calendar.toString().should.equal( sharedCalendar._id.toString() );
            result[0].scheduletype.should.equal( scheduletypeMap.get( masterScheduleType1 )._id.toString() );
            result[0].userDescr.should.equal( userDescr );
            result[1].calendar.toString().should.equal( masterCalendarId );
            result[1].scheduletype.should.equal( masterScheduleType1 );
            result[1].userDescr.should.equal( userDescrMaster );
        } );
    } );
} );