/**
 * User: pi
 * Date: 30/09/2015  13:30
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*jshint esnext:true */
/*global YUI */


YUI.add( 'task-api', function( Y, NAME ) {
        /**
         * @module task-api
         */

        const
            i18n = Y.doccirrus.i18n,
            CHECK_ACT_TYPE = i18n( 'TaskModel.text.CHECK_ACT_TYPE' ),
            ObjectId = require( 'mongodb' ).ObjectID,
            moment = require( 'moment' ),
            async = require( 'async' ),
            {formatPromiseResult} = require( 'dc-core' ).utils;


        function sendSystemMessge( user, messageObject, sessionWide ){
            Y.log(`task ${messageObject && messageObject.msg && messageObject.msg.taskId || ''} is notified to ${messageObject && messageObject.targetId} via system message sessionWide: ${sessionWide}`, 'info', NAME );
            if( sessionWide ){
                Y.doccirrus.communication.emitEventForSession( Object.assign( messageObject, { sessionId: user.sessionId } ) );
            } else {
                //target id should be in messageObject
                Y.doccirrus.communication.emitEventForUser( Object.assign( messageObject, { user: user } ) );
            }
        }

        function getIdentityQuery( task, recipients, user ) {
            let
                originalData = task.originalData_ || {},
                newTask = task.wasNew || task.isNew,

                isEmployeeChanged = task.originalData_ && ( originalData.employeeId !== task.employeeId ),

                currentCandidates = task.candidates || [],
                oldCandidates = originalData.candidates || [],
                newCandidates = newTask ? currentCandidates : currentCandidates.filter( candidateId => -1 === oldCandidates.indexOf( candidateId ) ),
                removedCandidates = newTask ? [] : oldCandidates.filter( candidateId => -1 === currentCandidates.indexOf( candidateId ) ),

                currentRoles = task.roles,
                oldRoles = originalData.roles || [],
                newRoles = newTask ? currentRoles : currentRoles.filter( role => -1 === oldRoles.indexOf( role ) ),
                removedRoles = newTask ? [] : oldRoles.filter( role => -1 === currentRoles.indexOf( role ) ),


                employeesIdsList = [],
                rolesList = [],
                query = {
                    status: { $ne: "INACTIVE" },
                    $or: []
                };

            (recipients || []).forEach( recipient => {
               switch (recipient) {
                   case 'candidates':
                       employeesIdsList = [ ...employeesIdsList, ...currentCandidates ];
                       break;
                   case 'newCandidates':
                       employeesIdsList = [ ...employeesIdsList, ...newCandidates ];
                       break;
                   case 'oldCandidates':
                       employeesIdsList = [ ...employeesIdsList, ...oldCandidates ];
                       break;
                   case 'removedCandidates':
                       employeesIdsList = [ ...employeesIdsList, ...removedCandidates ];
                       break;
                   case 'roles':
                       rolesList = [...rolesList, ...currentRoles];
                       break;
                   case 'newRoles':
                       rolesList = [...rolesList, ...newRoles];
                       break;
                   case 'oldRoles':
                       rolesList = [...rolesList, ...oldRoles];
                       break;
                   case 'removedRoles':
                       rolesList = [...rolesList, ...removedRoles];
                       break;
                   case 'employee':
                       employeesIdsList.push( task.employeeId );
                       break;
                   case 'oldEmployee':
                       if( isEmployeeChanged && originalData.employeeId ) {
                           employeesIdsList.push( originalData.employeeId );
                       }
                       break;
                   case 'creator':
                       if( user && user.specifiedBy !== task.creatorId ) {
                           employeesIdsList.push( task.creatorId );
                       }
                       break;
               }
            });

            //remove undefined end null
            employeesIdsList = employeesIdsList.filter( el => el );
            rolesList = rolesList.filter( el => el );

            query.$or.push( { specifiedBy: { $in: employeesIdsList } } );
            if( rolesList.length ) {
                query.$or.push( { roles: { $in: rolesList } } );
            }

            if( task.locations && task.locations.length && recipients.includes( 'locations' ) ) {
                query = {$and: [{'locations._id': {$in: task.locations.map( location => location._id.toString()) }}, query]};
            }

            return query;
        }

        /**
         * Alerts hot tasks. Task is hot if alert time is less than now() and
         *  call time is null(is not alerted yet).
         * @param {Object} args
         * @param {Object} args.user
         * @param {Function} args.callback
         */
        function alertHotTasks( args ) {
            var
                user = args.user,
                callback = args.callback,
                query;

            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'task',
                        action: 'get',
                        query: {
                            $and: [
                                { alertTime: { $exists: true } },
                                {
                                    alertTime: {
                                        $lt: new Date( moment().toISOString() ),
                                        $gt: new Date( moment().subtract( 3, 'days' ).toISOString() )
                                    }
                                },
                                { status: { $ne: 'DONE' } }
                            ],
                            callTime: { $exists: false }
                        }
                    }, next );
                },
                function( tasks, next ) {
                    async.eachSeries( tasks, function( task, done ) {
                        query = getIdentityQuery( task, ['candidates', 'roles', 'employee', 'locations' ] );
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'identity',
                            action: 'get',
                            query: query,
                            options: {
                                lean: true
                            }
                        }, function( err, results ) {
                            if( err ) {
                                return done( err );
                            }
                            if( !results.length ) {
                                return done();
                            }

                            //notify hotTask and set callTime in task
                            results.forEach( employee => {
                                sendSystemMessge(
                                    user,
                                    {
                                        targetId: employee._id && employee._id.toString(),
                                        eventType: Y.doccirrus.schemas.socketioevent.eventTypes.CONFIRM,
                                        event: 'message',
                                        messageId: task._id && task._id.toString(),
                                        msg: {
                                            taskId: task._id && task._id.toString(),
                                            data: '<a class="showDCTask" data-messageId="" href="#" data-taskId="' + (task._id && task._id.toString()) + '"> ' + i18n( 'CalendarMojit.task_api.title.TASK' ) + ': </a>' + task.title
                                        }
                                    },
                                    task.sessionWide
                                );
                            } );

                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                action: 'mongoUpdate',
                                model: 'task',
                                query: {
                                    _id: task._id
                                },
                                data: {
                                    $set: { callTime: moment().toDate() }
                                }
                            }, done );
                        } );
                    }, next );
                }
            ], callback );
        }

        /**
         * Deletes batch of tasks
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Array} args.query.ids
         * @param {Function} args.callback
         */
        function deleteBatch( args ) {
            var
                ids = args.query && args.query.ids,
                callback = args.callback;
            args.options = args.options || {};
            args.options.override = true;
            Y.log( 'Removing following tasks: ' + JSON.stringify( ids ), 'info', NAME );
            Y.doccirrus.mongodb.runDb( {
                model: 'task',
                user: args.user,
                action: 'delete',
                query: { _id: { $in: ids } },
                options: args.options
            }, callback );
        }

        /**
         * Assign and update status batch of tasks
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Array} args.query.ids
         * @param {Function} args.callback
         */
        function assignTaskAndUpdateStatus( args ) {
            var
                ids = args.query && args.query.ids,
                callback = args.callback,
                status = args.query.status,
                user = args.user;

            async.waterfall( [
                ( callback ) => {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'identity',
                        action: 'get',
                        query: {
                            _id: user.identityId
                        },
                        callback: ( error, result ) => {

                            if( error || !(result && result.length) ) {
                                return callback( error );
                            }

                            callback( null, result[0] );
                        }
                    } );
                },
                ( identity, callback ) => {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'employee',
                        action: 'get',
                        query: {
                            _id: identity.specifiedBy
                        },
                        callback: ( error, result ) => {
                            if( error || !(result && result.length) ) {
                                return callback( error );
                            }

                            callback( null, result[0] );
                        }
                    } );
                }

            ], ( err, currUser ) => {
                if( err ) {
                    Y.log( `Error on getting employee ${err.message}`, 'error', NAME );
                }
                Y.log( 'Updating following tasks: ' + JSON.stringify( ids ), 'info', NAME );
                Y.doccirrus.mongodb.runDb( {
                    model: 'task',
                    user: user,
                    action: 'update',
                    query: { _id: { $in: ids } },
                    data: {
                        $set: {
                            status: status,
                            employeeName: Y.doccirrus.schemas.person.personDisplay( currUser ),
                            employeeId: currUser._id.toString()
                        }
                    },
                    options: {
                        multi: true
                    }
                }, callback );
            } );
        }

        /**
         * Gets most hottest task for patient
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {String} args.query.patientId
         * @param {Object} args.callback
         *
         * @return {Function}   callback
         */
        function getPatientHotTask( args ) {
            var
                user = args.user,
                queryParams = args.query || {},
                callback = args.callback,
                finalResult = [];
            if( !queryParams.patientId ) {
                Y.log( 'getPatientHotTask. Patient id is missing', 'error', NAME );
                return callback( Y.doccirrus.errors.rest( 400, 'patient id is missing', true ) );
            }
            function makeRequest( params, callback ) {
                var
                    query = params.query || {};

                query.patientId = queryParams.patientId;
                query.status = { $ne: 'DONE' };
                Y.doccirrus.api.task.getPopulatedTask( {
                    user: user,
                    query: query,
                    options: {
                        limit: 1,
                        sort: params.sort || {}
                    },
                    callback: callback
                } );
            }

            async.series( [
                function( next ) {
                    makeRequest( {
                        query: {
                            $and: [
                                { alertTime: { $exists: true } },
                                { alertTime: { $lt: new Date( moment().toISOString() ) } }
                            ]
                        },
                        sort: {
                            alertTime: -1,
                            _id: -1
                        }
                    }, function( err, results ) {
                        if( err ) {
                            return next( err );
                        }
                        if( results.length ) {
                            finalResult = results;
                        }
                        return next();
                    } );
                },
                function( next ) {
                    if( finalResult.length ) {
                        return next();
                    }
                    makeRequest( {
                        query: {
                            $and: [
                                { alertTime: { $exists: true } },
                                { alertTime: { $gt: new Date( moment().toISOString() ) } }
                            ]
                        },
                        sort: {
                            alertTime: 1,
                            _id: 1
                        }
                    }, function( err, results ) {
                        if( err ) {
                            return next( err );
                        }
                        if( results.length ) {
                            finalResult = results;
                        }
                        return next();
                    } );
                },
                function( next ) {
                    if( finalResult.length ) {
                        return next();
                    }
                    makeRequest( {
                        sort: {
                            _id: 1
                        }
                    }, function( err, results ) {
                        if( err ) {
                            return next( err );
                        }
                        if( results.length ) {
                            finalResult = results;
                        }
                        return next();
                    } );
                }
            ], function( err ) {
                if( err ) {
                    return callback( err );
                }
                callback( err, finalResult );
            } );
        }

        /**
         * Gets task with populated candidates
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Object} [args.options]
         * @param {Function} args.callback
         */
        function getPopulatedTask( args ) {
            let
                user = args.user,
                callback = args.callback,
                query = args.query,
                options = {
                    lean: true
                },
                scheduleRange, linkedScheduleRange, lastScheduleRange,
                async = require( 'async' );
            if( args.options ) {
                options.sort = args.options.sort;

                if( args.options.paging === true ) {
                    options = Y.merge( options, args.options );
                } else {
                    options.limit = args.options.limit;
                }
            }
            function populateEntry( task, callback ) {
                let
                    employeesId = [];

                if( task.candidates ) {
                    employeesId = employeesId.concat( task.candidates );
                }
                async.parallel( [
                    ( done ) => {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'employee',
                            action: 'get',
                            query: {
                                _id: {$in: employeesId}
                            },
                            options: {
                                lean: true,
                                select: {
                                    lastname: 1,
                                    middlename: 1,
                                    nameaffix: 1,
                                    firstname: 1,
                                    title: 1,
                                    specifiedBy: 1
                                }
                            },
                            callback: function( err, result ) {
                                if( err ) {
                                    Y.log( 'getPopulatedEmployee. getting employee error: ' + JSON.stringify( err ), 'error', NAME );
                                    return done( err );
                                }
                                task.candidatesObj = result;
                                return done();
                            }
                        } );
                    },
                    ( done ) => {
                        if( task.patientId ) {
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'schedule',
                                action: 'get',
                                query: {
                                    patient: task.patientId,
                                    start: {$gt: new Date()}
                                },
                                options: {
                                    lean: true,
                                    sort: {
                                        start: 1
                                    },
                                    select: {
                                        title: 1,
                                        start: 1
                                    }
                                },
                                callback: function( err, result ) {
                                    if( err ) {
                                        Y.log( 'getPopulatedSchedule. getting schedule error: ' + JSON.stringify( err ), 'error', NAME );
                                        return done( err );
                                    }
                                    task.schedule = result && result[0];
                                    return done();
                                }
                            } );
                        } else {
                            return done();
                        }
                    },
                    ( done ) => {
                        if( task.patientId ) {
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'schedule',
                                action: 'get',
                                query: {
                                    patient: task.patientId,
                                    end: {$lt: new Date()}
                                },
                                options: {
                                    lean: true,
                                    sort: {
                                        end: -1
                                    },
                                    select: {
                                        title: 1,
                                        start: 1,
                                        end: 1
                                    }
                                },
                                callback: function( err, result ) {
                                    if( err ) {
                                        Y.log( 'getPopulatedLastSchedule. getting last schedule error: ' + JSON.stringify( err ), 'error', NAME );
                                        return done( err );
                                    }
                                    task.lastSchedule = result && result[0];
                                    return done();
                                }
                            } );
                        } else {
                            return done();
                        }
                    },
                    ( done ) => {
                        if( task.linkedSchedule ) {
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'schedule',
                                action: 'get',
                                query: {
                                    _id: task.linkedSchedule
                                },
                                options: {
                                    lean: true,
                                    select: {
                                        title: 1,
                                        start: 1
                                    }
                                },
                                callback: function( err, result ) {
                                    if( err ) {
                                        Y.log( 'getPopulatedSchedule. getting linkedSchedule error: ' + JSON.stringify( err ), 'error', NAME );
                                        return done( err );
                                    }
                                    task.linkedSchedule = result && result[0] || {};
                                    return done();
                                }
                            } );
                        } else {
                            return done();
                        }
                    },
                    ( done ) => {
                        if( task.mediaId ) {
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'document',
                                action: 'get',
                                query: {
                                    mediaId: task.mediaId
                                },
                                options: {
                                    lean: true,
                                    select: {
                                        contentType: 1,
                                        mediaId: 1
                                    }
                                },
                                callback: function( err, result ) {
                                    if( err ) {
                                        Y.log( 'getPopulatedSchedule. getting linkedSchedule error: ' + JSON.stringify( err ), 'error', NAME );
                                        return done( err );
                                    }
                                    task.mediaId = result && result[0] || {};
                                    return done();
                                }
                            } );
                        } else {
                            return done();
                        }
                    },
                    ( done ) => {
                        if( task.taskType ) {
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'tasktype',
                                action: 'get',
                                query: {
                                    _id: task.taskType
                                },
                                options: {
                                    lean: true
                                },
                                callback: function( err, result ) {
                                    if( err ) {
                                        Y.log( 'populateEntry. getting tasktype error: ' + JSON.stringify( err ), 'error', NAME );
                                        return done( err );
                                    }
                                    task.taskTypeObj = result && result[0] || {};
                                    return done();
                                }
                            } );
                        } else {
                            return done();
                        }
                    },
                    ( done ) => {
                        if( task.conferenceId ) {
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'conference',
                                action: 'get',
                                query: {
                                    _id: task.conferenceId
                                },
                                options: {
                                    lean: true
                                },
                                callback: function( err, result ) {
                                    if( err ) {
                                        Y.log( `populateEntry. getting conference error: ${err.stack || err}`, 'error', NAME );
                                        return done( err );
                                    }
                                    task.conferenceObj = result && result[0] || {};
                                    return done();
                                }
                            } );
                        } else {
                            return done();
                        }
                    }
                ], ( err ) => {
                    if( err ) {
                        Y.log( 'getPopulatedEmployee. getting populated info error: ' + JSON.stringify( err ), 'error', NAME );
                        return callback( err );
                    }

                    if( task.schedule && task.schedule.start && scheduleRange ) {
                        if( moment( task.schedule.start ).isBefore( moment( scheduleRange.$gte )) ||
                            moment( task.schedule.start ).isAfter( moment( scheduleRange.$lte ).add( 1, 'day' ) ) ) {
                            return callback( null, null );
                        }
                    }
                    if( scheduleRange && !task.schedule ) {
                        return callback( null, null );
                    }

                    if( task.lastSchedule && task.lastSchedule.end && lastScheduleRange ) {
                        if( moment( task.lastSchedule.end ).isBefore( moment( lastScheduleRange.$gte )) ||
                            moment( task.lastSchedule.end ).isAfter( moment( lastScheduleRange.$lte ).add( 1, 'day' ) ) ) {
                            return callback( null, null );
                        }
                    }
                    if( lastScheduleRange && !task.lastSchedule ) {
                        return callback( null, null );
                    }

                    if( task.linkedSchedule && task.linkedSchedule.start && linkedScheduleRange ) {
                        if( moment( task.linkedSchedule.start ).isBefore( moment( linkedScheduleRange.$gte )) ||
                            moment( task.linkedSchedule.start ).isAfter( moment( linkedScheduleRange.$lte ).add( 1, 'day' ) ) ) {
                            return callback( null, null );
                        }
                    }
                    if( linkedScheduleRange && !task.linkedSchedule ) {
                        return callback( null, null );
                    }
                    return callback( null, task );
                } );
            }

            async.waterfall( [
                ( callback ) => {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'identity',
                        action: 'get',
                        query: {
                            _id: user.identityId
                        },
                        callback: ( error, result ) => {

                            if( error || !(result && result.length) ) {
                                return callback( error );
                            }

                            callback( null, result[0] );
                        }
                    } );
                },
                ( identity, callback ) => {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'employee',
                        action: 'get',
                        query: {
                            _id: identity.specifiedBy
                        },
                        callback: ( error, result ) => {
                            if( error || !(result && result.length) ) {
                                return callback( error );
                            }

                            callback( null, result[0] );
                        }
                    } );
                }

            ], ( err, currUser ) => {
                if( err ){
                    Y.log( `Error on populating task ${err.message}`, 'error', NAME );
                }
                // Task should be visible to user on following cases:
                if( currUser ) {
                    query.$or = [
                        { creatorId: currUser._id.toString() },
                        { employeeId: currUser._id.toString() },
                        { candidates: currUser._id.toString() },
                        { roles: { $in: currUser.roles || [] } }
                    ];
                }
                if( query.schedule ) {
                    query.patientId = { $exists: true };
                    scheduleRange = query.schedule;
                    delete query.schedule;
                }

                if( query.lastSchedule ) {
                    query.patientId = { $exists: true };
                    lastScheduleRange = query.lastSchedule;
                    delete query.lastSchedule;
                }

                if( query.linkedSchedule ) {
                    query.patientId = { $exists: true };
                    linkedScheduleRange = query.linkedSchedule;
                    delete query.linkedSchedule;
                }

                if( query["taskTypeObj.name"] ) {
                    query.taskType = query["taskTypeObj.name"];
                    delete query["taskTypeObj.name"];
                }

                query = {
                    $and: [
                        {
                            $or: [
                                {locations: null},
                                {locations: []},
                                {'locations._id': {$in: user.locations.map( location => location._id.toString() )}}
                            ]
                        },
                        query
                    ]
                };

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'task',
                    action: 'get',
                    query: query,
                    options: options,
                    callback: ( err, result ) => {
                        if( err ) {
                            Y.log( 'getPopulatedEmployee error: ' + JSON.stringify( err ), 'error', NAME );
                            callback( err );
                            return;
                        }
                        async.mapSeries( result.result || result, populateEntry, ( err, res ) => {
                            if( result.result ) {
                                result.result = res.filter( item => item );
                                return callback( err, result );
                            } else {
                                return callback( err, res.filter( item => item ) );
                            }

                        } );
                    }
                } );
            } );
        }

        function createTasksForActivities( args ) {
            var
                user = args.user,
                callback = args.callback,
                data = args.data,
                taskTemplate = data.taskData,
                tasksCount = data.tasksCount,
                activities = data.activities;

            switch( tasksCount ) {
                case 'MULTIPLE' :
                    if( activities && activities.length ) {
                        taskTemplate.activities = [];
                        async.eachSeries( activities, ( activity, done ) => {
                            taskTemplate.activityType = activity.actType;
                            taskTemplate.activityId = activity._id;
                            taskTemplate.title = Y.Lang.sub( CHECK_ACT_TYPE, {
                                actTypes: [Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', activity.actType, 'i18n', '' )]
                            } );
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                action: 'post',
                                model: 'task',
                                data: Y.doccirrus.filters.cleanDbObject( taskTemplate )
                            }, done );
                        }, callback );
                    }
                    break;
                case 'SINGLE' :
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'post',
                        model: 'task',
                        data: Y.doccirrus.filters.cleanDbObject( taskTemplate )
                    }, callback );
                    break;
                default :
                    return callback();
            }
        }

        /**
         * helper for sendEmailNotification
         * @param {Object} config
         * @param {Object} config.task
         * @param {Object} config.employees
         * @param {Object} config.tenantId
         * @returns {string}
         * @see sendEmailNotification
         */
        function createEmailText( config ) {
            let
                fields = ['title', 'details', 'employeeName', 'roles', 'candidates', 'patientName', 'urgency', 'alertTime'],
                task = config.task,
                employees = config.employees,
                i18n = Y.doccirrus.i18n,
                tenantId = config.tenantId,
                result = '',
                moment = require( 'moment' ),
                casefolder_url = Y.doccirrus.auth.getMyHost( tenantId, true ) + ( Y.doccirrus.auth.isISD() ? '/iscd/patients' : '/incase' ),
                devicelog_url = Y.doccirrus.auth.getMyHost( tenantId, true ) + '/deviceLog';
            fields.forEach( field => {
                if( (Array.isArray( task[field] ) && task[field].length) || (!Array.isArray( task[field] ) && task[field]) ) {
                    result += '<b>' + i18n( 'task-schema.Task_T.' + field + '.i18n' ) + '</b>';
                    result += '<br>';
                    switch( field ) {
                        case 'title':
                            if( task.deviceLogEntryId ) {
                                result += Y.Lang.sub( '<a href="{href}" class="devicelog-linkToCase" target="_blank">{text}</a>', {
                                    text: task[field],
                                    href: devicelog_url + '#' + task.deviceLogEntryId
                                } );
                            } else {
                                result += task[field];
                                result += '<br>';
                                if( task.activityId && task.activityType ) {
                                    let
                                        activityId = task.activityId,
                                        activityType = task.activityType;

                                    activityType = Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', activityType, 'i18n', '' );
                                    result += Y.Lang.sub( '<a href="{href}" class="activity-linkToCase" target="_blank">{text}</a>', {
                                        text: activityType,
                                        href: casefolder_url + '#/activity/' + activityId
                                    } );
                                }
                            }
                            break;
                        case 'candidates':

                            result += task.candidates.map( candidate => {
                                let
                                    employee = employees.find( employee => employee._id.toString() === candidate );
                                return employee && Y.doccirrus.schemas.person.personDisplay( employee );

                            } ).join( ', <br>' );

                            break;
                        case 'alertTime':
                            result += moment( task[field] ).format( i18n( task.allDay ? 'general.TIMESTAMP_FORMAT' : 'general.TIMESTAMP_FORMAT_LONG' ) );
                            break;
                        case 'urgency':
                            result += Y.doccirrus.schemaloader.getEnumListTranslation( 'task', 'Urgency_E', task[field], 'i18n', '' );
                            break;
                        case 'roles':
                            result += task[field].join( ', ' );
                            break;
                        case 'patientName':
                            result += Y.Lang.sub( '<a href="{href}" class="patient-linkToCase" target="_blank">{text}</a>', {
                                text: i18n( 'task-schema.Task_T.' + field + '.i18n' ),
                                href: casefolder_url + '#/patient/' + task.patientId + '/tab/casefile_browser'
                            } );
                            break;
                        default:
                            result += task[field];
                    }
                    result += '<br><br>';
                }
            } );
            return result;
        }

        /**
         * @method sendEmailNotification
         * @param   {Object}              user
         * @param   {Object}              config
         * @param   {String}              config.email target email address
         * @param   {String}              config.subject
         * @param   {String}              config.tenantId
         * @param   {Object}              config.task full task data
         * @param   {Array}               config.employees employees which are connected to the task
         * @param { Function}            callback
         */
        function sendEmailNotification( user, config, callback ) {
            var
                jadeParams = {},
                emailOptions = {},
                email = config.email,
                subject = config.subject,
                tenantId = config.tenantId,
                employees = config.employees || [],
                task = config.task,
                emailConfig;

            jadeParams.text = createEmailText( {
                task: task,
                employees: employees,
                tenantId: tenantId
            } );

            emailOptions = Y.mix( emailOptions, {
                serviceName: 'prcService',
                jadeParams: jadeParams,
                subject: subject,
                user: user,
                jadePath: './mojits/UserMgmtMojit/views/task_notification.jade.html',
                to: email
            } );
            emailConfig = Y.doccirrus.email.createHtmlEmailMessage( emailOptions );
            emailConfig.from = emailConfig.to; // override no-reply
            Y.doccirrus.email.sendEmail( {
                ...Y.doccirrus.email.createHtmlEmailMessage( emailOptions ),
                user
            }, err => callback( err ) );
        }

        /**
         * @method sendEmailNotification
         * @param {Object} config
         * @param {Array} config.roles
         * @param {Date} config.alertTime
         * @param {String} config.title
         * @param {String} config.details
         * @param {Number} config.urgency
         * @param {Boolean} config.allDay
         * @param {Boolean} config.tenant
         * @param {Boolean} config.unique check if the given settings already exist in the db
         * @param {Function} callback
         */
        function createTaskForRoles( config, callback ) {
            callback = callback || function() {
                };
            var Yauth = Y.doccirrus.auth;
            var user = config.user || ( config.tenant ? Yauth.getSUForTenant( config.tenant ) : Yauth.getSUForLocal() );
            if( config.unique ) {
                let query = {};
                ["roles", "title", "details", "type"].forEach( configAtt => {
                    if( config[configAtt] ) {
                        query[configAtt] = config[configAtt];
                    }
                } );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'get',
                    model: 'task',
                    query: query,
                    options: {
                        lean: true
                    },
                    callback: function( err, res ) {
                        if ( err ) {
                            return callback( err );
                        }

                        if( !res[0] ) {
                            checkAndAddPatientName();
                        } else {
                            Y.log( "tried to create task, but already exists", 'warn', NAME );
                            async.each( res,
                                ( taskData, _next ) => {
                                    let task = Object.assign( {}, taskData, { originalData_: taskData } );
                                    //force taskIsChanged
                                    //task.originalData_.alertTime = moment(task.originalData_.alertTime ).add(1, 'ms' ).toISOString();
                                    task.originalData_.roles = [];
                                    notifyAssignedEmployees( user, task, {}, _next );
                                },
                                callback
                            );
                        }
                    }
                } );
            } else {
                checkAndAddPatientName();
            }

            function checkAndAddPatientName() {
                // If patientId is present then populate patientName by querying patients collection
                if(config.patientId) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'patient',
                        action: 'get',
                        query: {
                            _id: config.patientId
                        },
                        callback: ( error, result ) => {
                            if(result && result.length) {
                                config.patientName = result[0].lastname+", "+result[0].firstname;
                            }
                            addTask();
                        }
                    } );
                } else {
                    addTask();
                }
            }

            function addTask() {
                let data = {
                    dateCreated: new Date(),
                    creatorName: "System",
                    creatorId: "",
                    employeeName: "",
                    alertTime: config.alertTime || new Date(),
                    title: config.title || "[untitled]",
                    type: config.type || '',
                    location: [],
                    candidates: [],
                    roles: config.roles,
                    details: config.details || "",
                    status: "NEW",
                    urgency: config.urgency || 2,
                    allDay: config.allDay || true,
                    cardioSerialNumber: config.cardioSerialNumber,
                    skipcheck_: true,
                    patientId : config.patientId || '',
                    patientName: config.patientName || ''
                };
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'post',
                    model: 'task',
                    data: data,
                    callback: function( err, res ) {
                        callback( err, res );
                    }
                } );
            }
        }

        function createTaskMapperContext( user, taskId, callback ) {

            let context = {};

            async.waterfall( [
                function ( next ) { //getTaskModel
                    Y.doccirrus.mongodb.getModel( user, 'task', ( err, model ) => {
                            if( err ){
                                Y.log( `Error on getting task model ${err.message}`, 'error', NAME );
                            }
                            model.mongoose.findOne( { _id: new ObjectId( taskId ) }, ( err, res ) => {
                                if( err ) {
                                    Y.log( `Error in createTaskMapperContext: ${JSON.stringify( err )}`, 'error', NAME );
                                }
                                context.task = res && res.toObject();

                                return next( null, context );
                            } );
                        }
                    );
                },

                function ( ctx, next ) { //getPatientModel
                    if( context.task && context.task.patientId ) {
                        Y.doccirrus.mongodb.getModel( user, 'patient', ( err, model ) => {
                            if( err ){
                                Y.log( `Error on getting patient model ${err.message}`, 'error', NAME );
                            }
                            model.mongoose.findOne( { _id: new ObjectId( context.task.patientId ) }, ( err, res ) => {
                                if( err ) {
                                    Y.log( `Error in createTaskMapperContext: ${JSON.stringify( err )}`, 'error', NAME );
                                }
                                context.patient = res && res.toObject();
                                return next( null, context );
                            } );
                        } );
                    } else {
                        return next( null, context );
                    }
                },

                function ( ctx, next ) {//getEmployeeModel
                    if( context.task && context.task.employeeId ) {
                        Y.doccirrus.mongodb.getModel( user, 'employee', ( err, model ) => {
                            if( err ){
                                Y.log( `Error on getting employee model ${err.message}`, 'error', NAME );
                            }
                            model.mongoose.findOne( { _id: new ObjectId( context.task.employeeId ) }, ( err, res ) => {
                                if( err ) {
                                    Y.log( `Error in createTaskMapperContext: ${JSON.stringify( err )}`, 'error', NAME );
                                }
                                context.employee = res && res.toObject();
                                return next( null, context );
                            } );
                        } );
                    } else {
                        return next( null, context );
                    }
                },

                function ( ctx, next ) { //getLocationModel
                    Y.doccirrus.mongodb.getModel( user, 'location', ( err, model ) => {
                        if( err ){
                            Y.log( `Error on getting location model ${err.message}`, 'error', NAME );
                        }
                        model.mongoose.findOne( { _id: new ObjectId( Y.doccirrus.schemas.location.getMainLocationId() ) }, ( err, res ) => {
                            if( err ) {
                                Y.log( `Error in createTaskMapperContext: ${JSON.stringify( err )}`, 'error', NAME );
                            }
                            context.locations = [res && res.toObject()];
                            return next( null, context );
                        } );
                    } );
                }

            ], ( err ) => {
                callback( err, context );
            } );

        }

        async function getEmployesFromIdentities( user, identityQuery ){//jshint ignore:line
            let
                err,
                foundIdentities = [],
                employeeIds;

            [err, foundIdentities] = await formatPromiseResult( //jshint ignore:line
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'identity',
                    action: 'get',
                    query: identityQuery
                } )
            );
            if( err ){
                throw err;
            }
            employeeIds = foundIdentities.map( el => el.specifiedBy ).filter( el => el );
            if( !employeeIds ){
                Y.log('Employees not found from identities query ' + JSON.stringify(identityQuery), 'debug', NAME );
                return [];
            }

            let foundEmployees;
            [err, foundEmployees] = await formatPromiseResult( //jshint ignore:line
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'employee',
                    action: 'get',
                    query: {_id: {$in: employeeIds } }
                } )
            );
            if( err ){
                throw err;
            }
            foundEmployees = (foundEmployees || []).map( employee => {
                let emplIdentities = foundIdentities.filter( identity => identity.specifiedBy === employee._id.toString());
                employee.identityData = emplIdentities && emplIdentities[0] || {};
                return employee;
            } );
            return foundEmployees;
        }

        function notifyAssignedEmployees( user, task, options, callback ) {
            // Do not send notifications if template was created. OR task is updated with doNotNotify
            if( task.type === 'TEMPLATE' || options.context && options.context.doNotNotify ) {
                Y.log( `No need to notify task because type:${task.type} OR doNotNotify:${options.context && options.context.doNotNotify}`, 'info', NAME );
                callback( null, task );
                return;
            }

            // firstly check if task Due
            // note taskIsDue reflect same query as in AlertHotTas BUT w/o !task.callTime
            let
                notDone = 'DONE' !== task.status,
                isNew = task.isNew || task.wasNew,
                alertTimeMoment = moment( task.alertTime ),
                taskAfterButNotConference = alertTimeMoment.isAfter( moment() ) && !task.conferenceId,
                taskIsDue = notDone && task.alertTime &&
                            !(alertTimeMoment.isBefore(moment().subtract( 3, 'days' )) || taskAfterButNotConference ); //inclusive range comparison [a,b]

            Y.log(`Notification of task is requested with:
    new: ${isNew}        
    notDone: ${notDone}
    alertTime: ${task.alertTime}
    callTime: ${task.callTime} 
    taskIsDue: ${taskIsDue}`, 'debug', NAME);

            if( !taskIsDue ) {
                Y.log( 'No need to notify task yet', 'info', NAME );
                callback( null, task );
                return;
            }


            let
                systemMessages = [],
                emailNotifications = [],
                cachedEmpoyee = [],
                updateToOriginalTask = {},
                processResult = (result) => {
                    if( !result ) {
                        return;
                    }
                    systemMessages = [...systemMessages, ...(result.systemMessages || [])];
                    emailNotifications = [...emailNotifications, ...(result.emailMessages || [])];
                    cachedEmpoyee = [...cachedEmpoyee, ...(result.employees || [])];
                };

            //determine notable changes in task

            async.waterfall( [
                function( next ) { //this was in PRE processing 1 step
                    // main notifications
                    //TODO: should here be old data - implement oldCandidates, oldRoles
                    let
                        identityQuery = getIdentityQuery( task, ['creator', 'oldCandidates', 'oldRoles', 'oldEmployee', 'locations'], user );

                    /*if( 'su' !== user.id && user.identityId) {
                        identityQuery.$or.push( {_id: user.identityId} );
                    }*/

                    prepareNotificationData( {
                        user: user,
                        task: task,
                        identityQuery: identityQuery,
                        options: options,
                        purpose: 'onChange'
                    }, next );
                },
                function( preparedNotificationData, next ) { //this was in PRE processing 2 step
                    processResult( preparedNotificationData );

                    let
                        identityQuery = getIdentityQuery( task, ['newCandidates', 'newRoles', 'employee', 'locations' ] );

                    prepareNotificationData( {
                        user: user,
                        task: task,
                        identityQuery: identityQuery,
                        options: options,
                        purpose: 'onNew'
                    }, next );
                },
                function( preparedNotificationData, next ) { //this was previously triggered on POST change/delete
                    processResult( preparedNotificationData );

                    let
                        identityQuery = getIdentityQuery( task, ['employee', 'creator', 'locations' ], user );

                    /*if( 'su' !== user.id && user.identityId) {
                        identityQuery.$or.push( {_id: user.identityId} );
                    }*/
                    prepareNotificationData( {
                        user: user,
                        task: task,
                        identityQuery: identityQuery,
                        options: options,
                        purpose: 'onDelete'
                    }, next );
                },
                function( preparedNotificationData, next ) { //actual system messages send
                    processResult( preparedNotificationData );

                    let systemMessagesToSend = {};
                    systemMessages.forEach( el => {
                        if( !systemMessagesToSend[ ( el.identity + '_' + el.messageId ) ] ){ // notify only first message
                            systemMessagesToSend[ ( el.identity + '_' + el.messageId ) ] = el;
                        }
                    } );

                    if( Object.keys(systemMessagesToSend).length ){
                        Object.keys(systemMessagesToSend).forEach( key => {
                            let message = systemMessagesToSend[key];

                            if( message.user.identityId !== message.identity ) {
                                sendSystemMessge(
                                    user,
                                    {
                                        targetId: message.identity,
                                        sessionId: message.user.sessionId,
                                        messageId: message.messageId,
                                        event: 'message',
                                        msg: {
                                            taskId: task._id && task._id.toString(),
                                            data: message.data
                                        }
                                    },
                                    task.sessionWide
                                );
                            }
                        } );
                    }

                    next( null );
                },
                function( next ) { //actual send email here

                    let emailsToSend = {}, employeesToSendDeDuplicated = [];
                    //send only first generated message for identity
                    emailNotifications.forEach( el => {
                        emailsToSend[ ( el.identity + '_' + el.messageId ) ] = el;
                    } );


                    if( Object.keys(emailsToSend).length ){
                        Object.keys(emailsToSend).forEach( key => {
                            let emailObj = emailsToSend[key],
                                employeesToSend = [ ...(cachedEmpoyee || []).filter( empl => {
                                return emailObj.task.candidates.includes( empl._id.toString());
                            }), emailObj.employeeObj ];
                            let uniqueKeys = [...new Set(employeesToSend.map(el => el._id.toString()))];
                            uniqueKeys.forEach( uniqueKey => {
                                let oneOf = employeesToSend.find( el => el._id.toString() === uniqueKey );
                                if( oneOf ){
                                    employeesToSendDeDuplicated.push( oneOf );
                                }
                            } );
                            if( emailObj.user.identityId !== emailObj.identity ) {
                                Y.doccirrus.api.task.sendEmailNotification( user, {
                                    subject: emailObj.subject,
                                    email: emailObj.email,
                                    task: emailObj.task,
                                    employees: employeesToSendDeDuplicated,
                                    tenantId: emailObj.tenantId || user.tenantId
                                }, ( err ) => {
                                    if( err ) {
                                        Y.log( `notifyAssignedEmployees. Could not send email. Error: ${JSON.stringify( err )}`, 'error', NAME );
                                    }
                                } );
                            }
                        } );
                    }

                    next();
                },
                function( next ) {
                    //hence now this function is called in post process then populate all changes back to task
                    let updateKeys = Object.keys(updateToOriginalTask);
                    if(!updateKeys.length){
                        return next( null );
                    }
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'mongoUpdate',
                        model: 'task',
                        query: {
                            _id: task._id
                        },
                        data: {
                            $set: updateToOriginalTask
                        }
                    }, (err) => {
                        next( err );
                    } );
                }
            ], function( err ) {
                callback( err, task );
            } );

        }

        /**
         * Helper
         * @method prepareNotificationData
         * @param {Object} config
         * @param {Object} config.user
         * @param {Object} config.task
         * @param {Object} config.identityQuery
         * @param {String} config.options
         * @param {String} config.purpose
         * @param {Function} callback
         *
         * @return {Function}   callback
         */
        function prepareNotificationData( config, callback ) {
            const
                EMPLOYEE_CHANGED = i18n( 'task-process.text.EMPLOYEE_CHANGED' ),
                NEW_TASK = i18n( 'task-process.text.NEW_TASK' ),
                TASK_DONE = i18n( 'task-process.text.TASK_DONE' ),
                EDITED_TASK = i18n( 'task-process.text.EDITED_TASK' ),
                DELETED_TASK = i18n( 'task-process.text.TASK_DELETED' );

            let
                user = config.user,
                task = config.task,
                identityQuery = config.identityQuery,
                options = config.options || {},
                purpose = config.purpose || {},

                originalData = task.originalData_,

                notDone = 'DONE' !== task.status,
                isNew = task.isNew || task.wasNew,
                fields = ['title', 'details', 'urgency'],
                isDataChanged = originalData && (fields.some( field => originalData[field] !== task[field] )),
                isAlertTimeChanged = originalData && !moment( task.alertTime ).isSame( originalData.alertTime ),
                isPatientChanged = originalData && ( originalData.patientId !== task.patientId ),
                isEmployeeChanged = originalData && ( originalData.employeeId !== task.employeeId ),

                currentRoles = task.roles,
                oldRoles = (originalData && originalData.roles) || [],
                newRoles = isNew ? currentRoles : currentRoles.filter( role => -1 === oldRoles.indexOf( role ) ),
                removedRoles = isNew ? [] : oldRoles.filter( role => -1 === currentRoles.indexOf( role ) ),
                isRolesChanged = Boolean(newRoles.length || removedRoles.length),

                currentCandidates = task.candidates,
                oldCandidates = (originalData && originalData.candidates) || [],
                newCandidates = task.wasNew ? currentCandidates : currentCandidates.filter( candidateId => -1 === oldCandidates.indexOf( candidateId ) ),
                removedCandidates = isNew ? [] : oldCandidates.filter( candidateId => -1 === currentCandidates.indexOf( candidateId ) ),
                isCandidatesChanged = Boolean(newCandidates.length || removedCandidates.length),

                taskTriggeredOnDelete = options.onDelete,

                taskHasChanges = isDataChanged || isAlertTimeChanged || isEmployeeChanged || isPatientChanged || isRolesChanged || isCandidatesChanged,
                taskDone = (!isNew && originalData && task.status !== originalData.status && 'DONE' === task.status ),
                taskNotDoneButChanged = notDone && (isNew || taskHasChanges) && !taskTriggeredOnDelete,

                processOnDelete = 'onDelete' === purpose && taskTriggeredOnDelete,
                processOnChange = 'onChange' === purpose && ( taskDone || taskNotDoneButChanged),
                processOnNew = 'onNew' === purpose && ( newRoles.length || newCandidates.length ) && !taskTriggeredOnDelete,

                text,
                subject,
                userName,
                skipEmail = false,
                systemMessagesList = [],
                emailNotificationList = [];

            if( !( processOnDelete || processOnChange || processOnNew ) ){
                return callback(null, {});
            }

            if (processOnChange){
                let
                    textPrefix = (task.wasNew ? NEW_TASK : EDITED_TASK);
                if( taskDone ) {
                    text = Y.Lang.sub( TASK_DONE, { title: `<a class="showDCTask" data-messageId="" href="#" data-taskId="${(task._id && task._id.toString())}">${i18n( 'CalendarMojit.task_api.title.TASK' )}:</a> ${task.title}` } );
                    subject = TASK_DONE;
                } else {
                    text = `${textPrefix} <a class="showDCTask" data-messageId="" href="#" data-taskId="${(task._id && task._id.toString())}">${i18n( 'CalendarMojit.task_api.title.TASK' )}:</a> ${task.title}`;
                    subject = `${textPrefix} ${i18n( 'CalendarMojit.task_api.title.TASK' )}: ${task.title}`;
                }
            } else if (processOnNew){
                let
                    textPrefix = NEW_TASK;
                text = `${textPrefix} <a class="showDCTask" data-messageId="" href="#" data-taskId="${(task._id && task._id.toString())}">${i18n( 'CalendarMojit.task_api.title.TASK' )}:</a> ${task.title}`;
                subject = `${textPrefix} ${i18n( 'CalendarMojit.task_api.title.TASK' )}: ${task.title}`;
            } else if( processOnDelete ){
                text = Y.Lang.sub( DELETED_TASK, { title: `${i18n( 'CalendarMojit.task_api.title.TASK' )}: ${task.title}` } );
                subject = text;
            }
            getEmployesFromIdentities( user, identityQuery ).then( employees => {
                let
                    oldEmployeeIdentityId,
                    targetList = [];

                originalData = originalData || {};
                if( employees && employees.length ) {
                    let
                        identitiesList = [];
                    employees.forEach( employee => {
                        let
                            identity = employee.identityData || {},
                            identityId = String( identity._id );
                        //now allow send to self if not RULE_ENGINE
                        if( employee._id.toString() === user.specifiedBy && Y.doccirrus.schemas.task.systemTaskTypes.RULE_ENGINE === task.type) {
                            userName = Y.doccirrus.schemas.person.personDisplay( employee );
                            //person that trigger rule with task, should also be specified directly in task
                            // or have corresponding role
                            let allowedEmployees = ( task.candidates || [] ).filter( emplId => emplId === employee._id.toString() ),
                                allowedRoles = ( task.roles || [] ).filter( role => ( employee.roles || [] ).includes( role ) );

                            if( !(allowedEmployees.length || allowedRoles.length) ) {
                                return;
                            }
                        }
                        if( employee._id.toString() === user.specifiedBy && processOnDelete) { // identify who delete task
                            userName = Y.doccirrus.schemas.person.personDisplay( employee );
                        }
                        if( identity.specifiedBy === originalData.employeeId ) {
                            oldEmployeeIdentityId = identityId;
                        }
                        if( -1 === identitiesList.indexOf( identityId ) ) {
                            let
                                email = Y.doccirrus.schemas.simpleperson.getEmail( employee.communications || [] );
                            identitiesList.push( identityId );
                            targetList.push( {
                                employeeId: employee._id.toString(),
                                identityId: identityId,
                                emailNotification: !skipEmail && employee.notifications && employee.notifications.some( notification => Y.doccirrus.schemas.employee.notificationTypeList.EMAIL === notification.type && notification.active ),
                                email: email && email.value,
                                employeeObj: employee
                            } );
                        }
                    } );
                }
                targetList.forEach( target => {
                    let
                        identity = target.identityId,
                        emailNotification = target.emailNotification,
                        email = target.email,
                        _text = text,
                        _subject = subject;

                    /**
                     * Employee has been changed
                     */
                    if( isEmployeeChanged && !taskDone && identity === oldEmployeeIdentityId ) {
                        _subject = EMPLOYEE_CHANGED;
                        _text = Y.Lang.sub( EMPLOYEE_CHANGED, {title: `${i18n( 'CalendarMojit.task_api.title.TASK' )}: ${task.title}`} );
                    }
                    userName = userName || 'system';
                    _subject = _subject && Y.Lang.sub( _subject, {
                            title: ` ${i18n( 'CalendarMojit.task_api.title.TASK' )}: ${task.title}`,
                            userName: userName
                        } );
                    _text = Y.Lang.sub( _text, {userName: userName} );

                    /**
                     * * Employee has been changed because of somebody else has done the task
                     */
                    if( isEmployeeChanged && taskDone && identity === oldEmployeeIdentityId ) {
                        _text = _subject; //show message without link.
                    }

                    systemMessagesList = [
                        ...systemMessagesList, {
                            user: user,
                            identity: identity,
                            messageId: task._id && task._id.toString(),
                            data: _text
                        }
                    ];

                    if( emailNotification && email ) {
                        emailNotificationList = [
                            ...emailNotificationList, {
                                user: user,
                                subject: _subject,
                                email: email,
                                task: task,
                                tenantId: user.tenantId,
                                identity: identity,
                                messageId: task._id && task._id.toString(),
                                employeeObj: target.employeeObj
                            }
                        ];
                    }
                } );

                callback( null, {
                    systemMessages: systemMessagesList,
                    emailMessages: emailNotificationList,
                    employees: employees
                } );

            } ).catch( err => {
                /**
                 * Do not need to stop process.
                 * Just nobody will be notified via system message.
                 */
                Y.log( 'notifyAssignedEmployees. can not get employee list from identities ' + err.message, 'error', NAME );
                callback( null, {} );
            } );
        }

        /**
         * updates columns order
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Function} args.callback
         */
        async function updateColumns( args ) {
            Y.log('Entering Y.doccirrus.api.task.updateColumns', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.task.updateColumns');
            }
            const
                { user, callback, data = {} } = args;

            let column;
            for( column of data.columns ) {
                let data = Y.doccirrus.filters.cleanDbObject( column );
                let [err] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        action: 'put',
                        user,
                        model: 'list',
                        migrate: true,
                        query: {_id: column._id},
                        data,
                        fields: ['order']
                    } )
                );
                if( err ){
                    Y.log( `updateColumns: Error on updating data: ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }
            }
            callback( null );
        }

        /**
         * updates tasks order and column
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Function} args.callback
         */
        async function updateColumnTask( args ) {
            Y.log('Entering Y.doccirrus.api.task.updateColumnTask', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.task.updateColumnTask');
            }
            const
                { user, callback, data = {} } = args;
            let [ err, tasksModel ] = await formatPromiseResult( Y.doccirrus.api.reporting.getModel( user, 'task' ) );

            if( err ) {
                Y.log( `updateName: Error loading task model: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            if( data && data.tasks && data.tasks.length ) {
                let bulk = tasksModel.mongoose.collection.initializeUnorderedBulkOp(),
                    updateValues = {};
                for( let item of data.tasks ) {
                    if( !item.columnId ) {
                        delete item.columnId;
                    }
                    if( 0 !== item.orderInColumn && !item.orderInColumn ) {
                        delete item.orderInColumn;
                    }

                    if( item.columnId ) {
                        let [err, list] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'list',
                                action: 'get',
                                query: {
                                    _id: item.columnId
                                },
                                options: {
                                    lean: true
                                }
                            } )
                        );

                        if( err ) {
                            Y.log( `updateColumnTask: Error on getting list for task: ${err.stack || err}`, 'error', NAME );
                            return callback( err );
                        }

                        if( list && list[0] ) {
                            if( list[0].urgencyFilterValue ) {
                                updateValues.urgency = Number( list[0].urgencyFilterValue );
                            }

                            if( list[0].tasksFilterValue ) {
                               updateValues.taskType = list[0].tasksFilterValue;
                            }

                            if( list[0].locationsFilterValue && list[0].locationsFilterValue.length ) {
                               updateValues.locations = list[0].locationsFilterValue.map( ( i ) => {
                                   return {
                                       _id: i.id,
                                       locname: i.text
                                   };
                               });
                            }

                            if( list[0].rolesFilterValue && list[0].rolesFilterValue.length ) {
                                updateValues.roles = list[0].rolesFilterValue.map( ( i ) => {
                                    return i.text;
                                });
                            }

                            if( list[0].employeesFilterValue && list[0].employeesFilterValue.length ) {
                                updateValues.candidates = list[0].employeesFilterValue.map( ( i ) => {
                                    return i.id;
                                });
                                updateValues.candidatesNames = list[0].employeesFilterValue.map( ( i ) => {
                                    return i.text;
                                });
                            }

                            if( list[0].patientsFilterValue ) {
                                updateValues.patientId = list[0].patientsFilterValue;
                                updateValues.patientName = list[0].patientsNameValue;
                            }

                            if( list[0].employeeNameFilterValue ) {
                                updateValues.employeeId = list[0].employeeNameFilterValue;
                                updateValues.employeeName = list[0].employeeNameTextValue;
                            }

                            if( list[0].alertTimeFilterValue ) {
                                updateValues.alertTime = list[0].alertTimeFilterValue;
                            }
                        }
                    }
                    let
                        updateData = {
                            columnId: item.columnId,
                            orderInColumn: item.orderInColumn,
                            columnName: item.columnName,
                            ...updateValues
                        };
                    bulk.find( { _id: new ObjectId( item._id) }).updateOne( {$set: updateData } );
                }



                [ err ] = await formatPromiseResult( bulk.execute() );
                if( err ) {
                    Y.log( `updateColumnTask: Error on updating data: ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }
            }

            callback( null );

        }

        /**
         * updates tasks columnName
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Object} args.data
         * @param {Function} args.callback
         */
        async function updateName( args ) {
            Y.log('Entering Y.doccirrus.api.task.updateName', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.task.updateName');
            }
            const
                { user, query = {}, data = {}, callback } = args;
            let
                err, tasksModel, tasksItems;

            [err, tasksItems] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    action: 'get',
                    model: 'task',
                    user,
                    query
                } )
            );
            if( err ) {
                Y.log( `updateName: Error while getting data. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            [ err, tasksModel ] = await formatPromiseResult( Y.doccirrus.api.reporting.getModel( user, 'task' ) );

            if( err ) {
                Y.log( `updateName: Error loading task model: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            if( tasksItems && tasksItems.length ) {
                let bulk = tasksModel.mongoose.collection.initializeUnorderedBulkOp();
                for( let item of tasksItems ){
                    bulk.find( { _id: new ObjectId( item._id) }).updateOne( {$set: {columnName: data.columnName} } );
                }



                [ err ] = await formatPromiseResult( bulk.execute() );
                if( err ) {
                    Y.log( `updateName: Error on updating data: ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }
            }

            callback( null );

        }


        /**
         * @class task
         * @namespace doccirrus.api
         * @main
         */
        Y.namespace( 'doccirrus.api' ).task = {
            /**
             * @property name
             * @type {String}
             * @default task-api
             * @protected
             */
            name: NAME,
            alertHotTasks: function( args ) {
                Y.log('Entering Y.doccirrus.api.task.alertHotTasks', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.task.alertHotTasks');
                }
                alertHotTasks( args );
            },
            deleteBatch: function( args ) {
                Y.log('Entering Y.doccirrus.api.task.deleteBatch', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.task.deleteBatch');
                }
                deleteBatch( args );
            },
            assignTaskAndUpdateStatus: function( args ) {
                Y.log('Entering Y.doccirrus.api.task.assignTaskAndUpdateStatus', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.task.assignTaskAndUpdateStatus');
                }
                assignTaskAndUpdateStatus( args );
            },
            getPatientHotTask: function( args ) {
                Y.log('Entering Y.doccirrus.api.task.getPatientHotTask', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.task.getPatientHotTask');
                }
                getPatientHotTask( args );
            },
            getPopulatedTask: function( args ) {
                Y.log('Entering Y.doccirrus.api.task.getPopulatedTask', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.task.getPopulatedTask');
                }
                getPopulatedTask( args );
            },
            sendEmailNotification: function( user, config, callback ) {
                sendEmailNotification( user, config, callback );
            },
            createTaskForRoles: function( args, callback ) {
                createTaskForRoles( args.originalParams || args, args.callback || callback );
            },

            createTaskMapperContext: createTaskMapperContext,
            createActivitiesForPatients: ( args ) => {
                Y.log('Entering Y.doccirrus.api.task.createActivitiesForPatients', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.task.createActivitiesForPatients');
                }
                Y.doccirrus.tasks.mailmerge.createActivitiesForPatients( args.user, args.originalParams.options, args.callback );
            },

            notifyAssignedEmployees: notifyAssignedEmployees,
            createTasksForActivities: function( args ) {
                Y.log('Entering Y.doccirrus.api.task.createTasksForActivities', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.task.createTasksForActivities');
                }
                createTasksForActivities( args );
            },
            updateColumns,
            updateColumnTask,
            updateName
        };

    },
    '0.0.1', {
        requires: [
            'dccommunication',
            'employee-schema',
            'activity-schema',
            'task-schema',
            'dcauth',
            'mailmerge-helper'
        ]
    }
);
