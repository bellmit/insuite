/**
 * User: md
 * Date: 26/01/18  10:40
 * (c) 2018, Doc Cirrus GmbH, Berlin
 */
/*global Y,  should, it, describe, before, after, beforeEach */

const
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    mongoose = require( 'mongoose' ),
    moment = require( 'moment' ),
    util = require( 'util' ),
    path = require( 'path' ),
    {promisifyArgsCallback} = require( 'dc-core' ).utils,
    cleanDbObject = Y.doccirrus.filters.cleanDbObject,
    cleanDb = util.promisify( mochaUtils.cleanDB ),
    alertHotTasks = promisifyArgsCallback( Y.doccirrus.api.task.alertHotTasks ),
    employeePostP = promisifyArgsCallback( Y.doccirrus.api.employee.post ),
    user = Y.doccirrus.auth.getSUForLocal(),
    useCoverage = true, //current version of istanbul::esprima nto support async/await
    notificationDelayMs = 300,
    beforeCatcher = ( eventArray, evntListener ) => function() {
        Y.doccirrus.communication.event.on( evntListener, function( params ) {
            eventArray.push( params );
        } );
    },
    afterCatcher = ( evntListener ) => function() {
        Y.doccirrus.communication.event.removeAllListeners( evntListener );
    },
    interestedFiles = ['/mojits/TaskMojit/models/task-api.server.js'],
    appDir = path.dirname( require.main.filename );

async function wait( self, timeToWait = notificationDelayMs ) {
    self.timeout( self.timeout() + timeToWait );
    await new Promise( function( resolve ) {
        setTimeout( resolve, timeToWait );
    } );
}

if( useCoverage ) {
    global.YUI = {
        add: ( moduleName, fn ) => {
            fn( Y );
        }
    };
}

let
    emitEventForUserData = [],
    emitEventForSessionData = [];

//not solved for now - coverage of the process is not work properly
// '/mojits/TaskMojit/models/task-process.server.js'

describe( 'task-api', function() {
    before( async function() {
        await cleanDb( {user} );

        this.employeeId = new mongoose.Types.ObjectId().toString();
        this.creatorId = new mongoose.Types.ObjectId().toString();
        this.employeeIdWithRoles = new mongoose.Types.ObjectId().toString();
        this.identityId = new mongoose.Types.ObjectId().toString();
        this.identityCreatorId = new mongoose.Types.ObjectId().toString();
        this.identityIdWithRoles = new mongoose.Types.ObjectId().toString();

        await employeePostP( {
            user: user,
            data: {
                employee: Y.doccirrus.filters.cleanDbObject(
                    mochaUtils.getEmployeeData( {
                        _id: this.employeeId
                    } )
                ),
                identity: Y.doccirrus.filters.cleanDbObject(
                    mochaUtils.getIdentityData( {
                        _id: this.identityId,
                        specifiedBy: this.employeeId,
                        username: 'randomUsername1'
                    } )
                )
            }
        } );
        await employeePostP( {
            user: user,
            data: {
                employee: Y.doccirrus.filters.cleanDbObject(
                    mochaUtils.getEmployeeData( {
                        _id: this.creatorId,
                        lastname: 'Last Creator name',
                        firstname: 'First Creator name',
                        username: 'Creator'
                    } )
                ),
                identity: Y.doccirrus.filters.cleanDbObject(
                    mochaUtils.getIdentityData( {
                        _id: this.identityCreatorId,
                        specifiedBy: this.creatorId,
                        firstname: 'Creator First name',
                        lastname: 'Creator Last name',
                        username: 'Creator'
                    } )
                )
            }
        } );
        await employeePostP( {
            user: user,
            data: {
                employee: Y.doccirrus.filters.cleanDbObject(
                    mochaUtils.getEmployeeData( {
                        _id: this.employeeIdWithRoles,
                        lastname: 'Last with Role name',
                        firstname: 'First with Role name',
                        username: 'EmployeeWithRole',
                        roles: ['TestRole']
                    } )
                ),
                identity: Y.doccirrus.filters.cleanDbObject(
                    mochaUtils.getIdentityData( {
                        _id: this.identityIdWithRoles,
                        specifiedBy: this.employeeIdWithRoles,
                        firstname: 'With Role First name',
                        lastname: 'With Role Last name',
                        username: 'WithRole',
                        roles: ['TestRole']
                    } )
                )
            }
        } );

        this.taskData = {
            type: 'NEW_PATIENT',
            allDay: true,
            alertTime: (new Date()).toISOString(),
            title: 'not important',
            urgency: 2,
            details: 'test task details',
            roles: ['ThereAreNoSuchRole'],
            employeeId: this.employeeId
        };
        this.sessionTaskData = Object.assign( {sessionWide: true}, this.taskData );

        interestedFiles.forEach( function( file ) {
            let fileName = appDir + file;
            delete require.cache[fileName];
            require( fileName );
        } );
    } );
    before( beforeCatcher( emitEventForUserData, 'onEmitEventForUser' ) );
    before( beforeCatcher( emitEventForSessionData, 'onEmitEventForSession' ) );
    after( afterCatcher( 'onEmitEventForUser' ) );
    after( afterCatcher( 'emitEventForSessionData' ) );
    after( async function() {
        await cleanDb( {user} );
    } );

    describe( 'Skip earlier on Template task type or on doNotNotify', function() {
        let createdTaskId;

        it( 'post new template task should not notify user', async function() {
            const result = await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'task',
                action: 'post',
                data: cleanDbObject( this.taskData )
            } ); //https://github.com/mochajs/mocha/issues/1128
            await wait( this, notificationDelayMs );
            result.should.be.an( 'array' ).which.has.lengthOf( 1 );
            createdTaskId = result[0];

            // check messages
            should.exist( emitEventForUserData );
            emitEventForUserData.should.be.an( 'array' ).which.has.lengthOf( 1 );
            should.exist( emitEventForSessionData );
            emitEventForSessionData.should.be.an( 'array' ).which.has.lengthOf( 0 );

        } );
        it( 'put task should not notify user with doNotNotify', async function() { //this should be followed by test that set TEMPLATE back, otherwise Delete will not be rigth
            const newType = '';
            const result = await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'task',
                action: 'put',
                query: {_id: createdTaskId},
                context: {
                    doNotNotify: true
                },
                fields: ['type'],
                data: cleanDbObject( {type: newType} )
            } );
            await wait( this, notificationDelayMs );
            result.should.be.an( 'object' );
            result.type.should.be.equal( newType );
            // check messages
            should.exist( emitEventForUserData );
            emitEventForUserData.should.be.an( 'array' ).which.has.lengthOf( 1 );
            should.exist( emitEventForSessionData );
            emitEventForSessionData.should.be.an( 'array' ).which.has.lengthOf( 0 );

        } );
        it( 'put template task should not notify user', async function() {
            const newTitle = 'some changed title';
            const result = await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'task',
                action: 'put',
                query: {_id: createdTaskId},
                fields: ['title', 'type'],
                data: cleanDbObject( {title: newTitle, type: 'TEMPLATE'} )
            } );
            await wait( this, notificationDelayMs );
            result.should.be.an( 'object' );
            result.title.should.be.equal( newTitle );
            // check messages
            should.exist( emitEventForUserData );
            emitEventForUserData.should.be.an( 'array' ).which.has.lengthOf( 1 );
            should.exist( emitEventForSessionData );
            emitEventForSessionData.should.be.an( 'array' ).which.has.lengthOf( 0 );

        } );
        it( 'delete template task should not notify user', async function() {
            const result = await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'task',
                query: {_id: createdTaskId},
                action: 'delete'
            } );
            await wait( this, notificationDelayMs );
            result.should.be.an( 'array' ).which.has.lengthOf( 1 );
            // check messages
            should.exist( emitEventForUserData );
            emitEventForUserData.should.be.an( 'array' ).which.has.lengthOf( 1 );
            should.exist( emitEventForSessionData );
            emitEventForSessionData.should.be.an( 'array' ).which.has.lengthOf( 0 );

        } );
        it( 'post new template task should not notify session', async function() {
            const result = await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'task',
                action: 'post',
                data: cleanDbObject( this.sessionTaskData )
            } ); //https://github.com/mochajs/mocha/issues/1128
            await wait( this, notificationDelayMs );
            result.should.be.an( 'array' ).which.has.lengthOf( 1 );
            createdTaskId = result[0];

            // check messages
            should.exist( emitEventForUserData );
            emitEventForUserData.should.be.an( 'array' ).which.has.lengthOf( 1 );
            should.exist( emitEventForSessionData );
            emitEventForSessionData.should.be.an( 'array' ).which.has.lengthOf( 1 );

        } );
        it( 'put task should not notify session with doNotNotify', async function() {
            const newType = 'PRINT';
            const result = await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'task',
                action: 'put',
                query: {_id: createdTaskId},
                fields: ['type'],
                data: cleanDbObject( {type: newType} ),
                context: {
                    doNotNotify: true
                }
            } );
            await wait( this, notificationDelayMs );
            result.should.be.an( 'object' );
            result.type.should.be.equal( newType );
            // check messages
            should.exist( emitEventForUserData );
            emitEventForUserData.should.be.an( 'array' ).which.has.lengthOf( 1 );
            should.exist( emitEventForSessionData );
            emitEventForSessionData.should.be.an( 'array' ).which.has.lengthOf( 1 );

        } );
        it( 'put template task should not notify session', async function() {
            const newTitle = 'some changed title';
            const result = await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'task',
                action: 'put',
                query: {_id: createdTaskId},
                fields: ['title', 'type'],
                data: cleanDbObject( {title: newTitle, type: 'TEMPLATE'} )
            } );
            await wait( this, notificationDelayMs );
            result.should.be.an( 'object' );
            result.title.should.be.equal( newTitle );
            // check messages
            should.exist( emitEventForUserData );
            emitEventForUserData.should.be.an( 'array' ).which.has.lengthOf( 1 );
            should.exist( emitEventForSessionData );
            emitEventForSessionData.should.be.an( 'array' ).which.has.lengthOf( 1 );

        } );
        it( 'delete template task should not notify session', async function() {
            const result = await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'task',
                query: {_id: createdTaskId},
                action: 'delete'
            } );
            await wait( this, notificationDelayMs );
            result.should.be.an( 'array' ).which.has.lengthOf( 1 );
            // check messages
            should.exist( emitEventForUserData );
            emitEventForUserData.should.be.an( 'array' ).which.has.lengthOf( 1 );
            should.exist( emitEventForSessionData );
            emitEventForSessionData.should.be.an( 'array' ).which.has.lengthOf( 1 );

        } );
    } );
    describe( 'Skip earlier on not Immediate AND not Due', function() {
        let createdTaskId;

        beforeEach( function() { //clean previous messages
            emitEventForUserData.splice( 0, emitEventForUserData.length );
            emitEventForSessionData.splice( 0, emitEventForSessionData.length );
        } );

        it( 'post already DONE task', async function() {
            const taskData = {
                status: 'DONE',
                allDay: false,
                alertTime: moment().toDate(),
                title: 'not important',
                urgency: 2,
                details: 'test task details',
                roles: ['TestRole'],
                employeeId: this.employeeId
            };
            const result = await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'task',
                action: 'post',
                data: cleanDbObject( taskData )
            } ); //https://github.com/mochajs/mocha/issues/1128
            await wait( this, notificationDelayMs );
            result.should.be.an( 'array' ).which.has.lengthOf( 1 );
            createdTaskId = result[0];

            // check messages
            should.exist( emitEventForUserData );
            emitEventForUserData.should.be.an( 'array' ).which.has.lengthOf( 0 );
            should.exist( emitEventForSessionData );
            emitEventForSessionData.should.be.an( 'array' ).which.has.lengthOf( 0 );

        } );
        it( 'post to more than 15 minutes in future task', async function() {
            const taskData = {
                status: 'NEW',
                allDay: false,
                alertTime: moment().add( 17, 'minutes' ).toDate(),
                title: 'not important',
                urgency: 2,
                details: 'test task details',
                roles: ['TestRole'],
                creatorId: this.creatorId
            };
            const result = await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'task',
                action: 'post',
                data: cleanDbObject( taskData )
            } ); //https://github.com/mochajs/mocha/issues/1128
            await wait( this, notificationDelayMs );
            result.should.be.an( 'array' ).which.has.lengthOf( 1 );
            createdTaskId = result[0];

            // check messages
            should.exist( emitEventForUserData );
            emitEventForUserData.should.be.an( 'array' ).which.has.lengthOf( 0 );
            should.exist( emitEventForSessionData );
            emitEventForSessionData.should.be.an( 'array' ).which.has.lengthOf( 0 );

        } );
        it( 'put out of DUE range ', async function() { //note alertTime is NOT in DUE range
            const newType = '';
            const result = await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'task',
                action: 'put',
                query: {_id: createdTaskId},
                fields: ['alertTime', 'callTime'],
                data: cleanDbObject( {alertTime: moment().subtract( 3 * 24 + 1, 'hours' ).toDate(), callTime: null} )
            } );
            await wait( this, notificationDelayMs );
            result.should.be.an( 'object' );
            result.type.should.be.equal( newType );
            // check messages
            should.exist( emitEventForUserData );
            emitEventForUserData.should.be.an( 'array' ).which.has.lengthOf( 0 );
            should.exist( emitEventForSessionData );
            emitEventForSessionData.should.be.an( 'array' ).which.has.lengthOf( 0 );

        } );
    } );
    describe( 'Immediate notification', function() {
        let createdTaskId;

        beforeEach( function() { //clean previous messages
            emitEventForUserData.splice( 0, emitEventForUserData.length );
            emitEventForSessionData.splice( 0, emitEventForSessionData.length );
        } );
        it( 'post task to session should not notify', async function() {
            const
                taskTitle = 'test immediate session',
                taskData = {
                    allDay: true,
                    alertTime: moment().add( 10, 'minutes' ).toISOString(),
                    title: taskTitle,
                    urgency: 2,
                    details: 'task immediate details',
                    roles: ['ThereAreNoSuchRole'],
                    employeeId: this.employeeId,
                    sessionWide: true
                };

            const result = await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'task',
                action: 'post',
                data: cleanDbObject( taskData )
            } );
            await wait( this, notificationDelayMs );
            result.should.be.an( 'array' ).which.has.lengthOf( 1 );
            createdTaskId = result[0];

            // check messages
            should.exist( emitEventForSessionData );
            emitEventForSessionData.should.be.an( 'array' ).which.has.lengthOf( 0 );

            should.exist( emitEventForUserData );
            emitEventForUserData.should.be.an( 'array' ).which.has.lengthOf( 0 );

        } );
        it( 'post task to user should not notify', async function() {
            const
                taskTitle = 'test immediate',
                taskData = {
                    allDay: true,
                    alertTime: moment().add( 10, 'minutes' ).toISOString(),
                    title: taskTitle,
                    urgency: 2,
                    details: 'task immediate details',
                    roles: ['ThereAreNoSuchRole'],
                    employeeId: this.employeeId
                };

            const result = await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'task',
                action: 'post',
                data: cleanDbObject( taskData )
            } );
            await wait( this, notificationDelayMs );
            result.should.be.an( 'array' ).which.has.lengthOf( 1 );
            createdTaskId = result[0];

            // check messages
            should.exist( emitEventForUserData );
            emitEventForUserData.should.be.an( 'array' ).which.has.lengthOf( 0 );

            should.exist( emitEventForSessionData );
            emitEventForSessionData.should.be.an( 'array' ).which.has.lengthOf( 0 );

        } );
        it( 'get task to check callTime is not set for immediately notified task', async function() {
            const result = await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'task',
                action: 'get',
                query: {_id: createdTaskId}
            } );
            await wait( this, notificationDelayMs );
            result.should.be.an( 'array' ).which.has.lengthOf( 1 );

            // check callTime
            should.not.exist( result[0].callTime );
        } );
        it( 'post task to user with role and employee should not notify', async function() {
            const
                taskTitle = 'test immediate',
                taskData = {
                    allDay: true,
                    alertTime: moment().add( 10, 'minutes' ).toISOString(),
                    title: taskTitle,
                    urgency: 2,
                    details: 'task immediate details',
                    roles: ['TestRole'],
                    employeeId: this.employeeId
                };

            const result = await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'task',
                action: 'post',
                data: cleanDbObject( taskData )
            } );
            await wait( this, notificationDelayMs );
            result.should.be.an( 'array' ).which.has.lengthOf( 1 );
            createdTaskId = result[0];

            // check messages
            should.exist( emitEventForUserData );
            emitEventForUserData.should.be.an( 'array' ).which.has.lengthOf( 0 );

            should.exist( emitEventForSessionData );
            emitEventForSessionData.should.be.an( 'array' ).which.has.lengthOf( 0 );
        } );
    } );
    describe( 'Notify Task with employeeId and creatorId (former POST process)', function() {
        //former it shows changes that are not shown by pre process (if some not important fields are changed
        //now this functionality is removed and threfore this should only be triggered on delete
        let taskId = new mongoose.Types.ObjectId(),
            commonTaskTitle = 'CommonTitle';

        beforeEach( async function() {
            await cleanDb( {user, collections2clean: ['task']} );

            //clean previous messages
            emitEventForUserData.splice( 0, emitEventForUserData.length );
            emitEventForSessionData.splice( 0, emitEventForSessionData.length );
            // here we tested only change and delete so no need to post task
            const taskData = { //NOTE neither creator nor employee
                _id: taskId,
                allDay: true,
                alertTime: (new Date()),
                title: commonTaskTitle,
                urgency: 2,
                details: 'test task details',
                roles: ['ThereAreNoSuchRole'],
                sessionWide: false
            };

            await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'task',
                query: {_id: taskId},
                action: 'post',
                data: cleanDbObject( taskData )
            } );
        } );
        it( 'put task with creatorId do NOT sent to user', async function() { //NOTE here selected attributes that not triggers PRE flow
            const
                newCardioSerialNumber = 'newCS',
                taskData = {
                    cardioSerialNumber: newCardioSerialNumber,
                    sessionWide: false,
                    creatorId: this.creatorId
                };
            const result = await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'task',
                action: 'put',
                query: {_id: taskId},
                fields: Object.keys( taskData ),
                data: cleanDbObject( taskData )
            } );
            await wait( this, notificationDelayMs );

            result.should.be.an( 'object' );
            result._id.toString().should.be.equal( taskId.toString() );
            result.cardioSerialNumber.should.be.equal( newCardioSerialNumber );

            // check messages
            should.exist( emitEventForUserData );
            emitEventForUserData.should.be.an( 'array' ).which.has.lengthOf( 0 );

            should.exist( emitEventForSessionData );
            emitEventForSessionData.should.be.an( 'array' ).which.has.lengthOf( 0 );
        } );
        it( 'put task with employeeId do NOT sent to session', async function() {
            const
                newCardioSerialNumber = 'newCS2',
                taskData = {
                    cardioSerialNumber: newCardioSerialNumber,
                    sessionWide: true,
                    creatorId: this.creatorId
                };
            const result = await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'task',
                action: 'put',
                query: {_id: taskId},
                fields: Object.keys( taskData ),
                data: cleanDbObject( taskData )
            } );
            await wait( this, notificationDelayMs );

            result.should.be.an( 'object' );
            result._id.toString().should.be.equal( taskId.toString() );
            result.cardioSerialNumber.should.be.equal( newCardioSerialNumber );
            // check messages
            should.exist( emitEventForUserData );
            emitEventForUserData.should.be.an( 'array' ).which.has.lengthOf( 0 );

            should.exist( emitEventForSessionData );
            emitEventForSessionData.should.be.an( 'array' ).which.has.lengthOf( 0 );
        } );
        it( 'should notify about delete task', async function() {
            const result = await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'task',
                action: 'delete',
                query: {_id: taskId}
            } );
            await wait( this, 5000 );

            result.should.be.an( 'array' ).which.has.lengthOf( 1 );
            // check messages
            should.exist( emitEventForUserData );
            emitEventForUserData.should.be.an( 'array' ).which.has.lengthOf( 0 );

            should.exist( emitEventForSessionData );
            emitEventForSessionData.should.be.an( 'array' ).which.has.lengthOf( 0 );
        } );
    } );
    describe( 'Notify Task on change (former PRE )', function() {
        let taskId = new mongoose.Types.ObjectId(),
            commonTaskTitle = 'CommonTitleForTestPre';

        beforeEach( async function() {
            await cleanDb( {user, collections2clean: ['task']} );

            //clean previous messages
            emitEventForUserData.splice( 0, emitEventForUserData.length );
            emitEventForSessionData.splice( 0, emitEventForSessionData.length );
            // here we tested only change and delete so no need to post task
            const taskData = { //task is due but not immediate
                _id: taskId,
                allDay: false,
                alertTime: (moment().subtract( 1, 'hours' ).toDate()),
                title: commonTaskTitle,
                urgency: 1,
                details: 'test task details',
                sessionWide: false,
                creatorId: this.creatorId
            };

            await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'task',
                query: {_id: taskId},
                action: 'mongoUpdate',
                data: {$set: taskData},
                options: {upsert: true}
            } );
        } );
        it( 'new Roles and Candidates', async function() {
            const
                taskMessageUpdate = new RegExp( 'Geänderte' + ' <a[^>]+?>Aufgabe:<\\/a> ' + commonTaskTitle ),
                taskMessageNew = new RegExp( 'Neue' + ' <a[^>]+?>Aufgabe:<\\/a> ' + commonTaskTitle ),
                taskData = {
                    candidates: [this.employeeId],
                    roles: ['TestRole']
                };

            const result = await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'task',
                action: 'put',
                query: {_id: taskId},
                fields: Object.keys( taskData ),
                data: cleanDbObject( taskData )
            } );

            await wait( this, notificationDelayMs );
            result.should.be.an( 'object' );
            result._id.toString().should.be.equal( taskId.toString() );
            result.roles.should.be.an( 'array' ).which.has.lengthOf( 1 );
            result.candidates.should.be.an( 'array' ).which.has.lengthOf( 1 );

            //here we expect change notification for creator, and 2 notifications one for new candidate and one for new role

            // check messages
            should.exist( emitEventForUserData );
            emitEventForUserData.should.be.an( 'array' ).which.has.lengthOf( 3 );
            let
                changedCreator = false,
                newCandidate = false,
                newRole = false;

            for( const message of emitEventForUserData ) {
                if( message.msg && message.msg.data.match( taskMessageUpdate ) && message.targetId === this.identityCreatorId ) {
                    changedCreator = true;
                }
                if( message.msg && message.msg.data.match( taskMessageNew ) && message.targetId === this.identityId ) { //added new employee via candidates
                    newCandidate = true;
                }
                if( message.msg && message.msg.data.match( taskMessageNew ) && message.targetId === this.identityIdWithRoles ) { //added new employee via candidates
                    newRole = true;
                }
            }

            changedCreator.should.equal( true );
            newCandidate.should.equal( true );
            newRole.should.equal( true );

            should.exist( emitEventForSessionData );
            emitEventForSessionData.should.be.an( 'array' ).which.has.lengthOf( 0 );
        } );
    } );
    describe( 'Test "alertHotTask".', function() {
        const task = {
            dateCreated: new Date( moment().toISOString() ),
            employeeId: this.employeeId,
            patientId: "57580e18454cec874189c33b",
            patientName: "MochaPatient",
            alertTime: new Date( moment().subtract( 1, 'days' ).toISOString() ),
            title: "SomeTitle",
            type: "",
            location: [],
            candidatesNames: [],
            candidates: [],
            roles: [
                "Empfang"
            ],
            details: "",
            status: "NEW",
            urgency: 2,
            templateAlertTimeInterval: "Seconds",
            allDay: false,
            activities: [],
            sessionWide: false
        };

        before( async function() {
            await cleanDb( {user, collections2clean: ['task']} );
            await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'task',
                action: 'mongoInsertOne',
                data: task
            } );
        } );
        it( 'Call "alertHotTask"', async function() {
            await alertHotTasks( {
                user: user
            } );

            await wait( this, notificationDelayMs );
            should.exist( emitEventForUserData );
            emitEventForUserData.should.be.an( 'array' ).which.has.lengthOf( 3 );
            emitEventForUserData[0].event.should.equal( 'message' );
            Object.keys( emitEventForUserData[0].msg )[0].should.equal( 'taskId' );
        } );
    } );

} );