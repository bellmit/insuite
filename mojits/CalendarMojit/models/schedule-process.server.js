/**
 * User: ma
 * Date: 27/05/14  15:37
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


// New pattern for cascading pre and post processes.
// automatically called by the DB Layer before any
// mutation (CUD, excl R) is called on a data item.

YUI.add( 'schedule-process', function( Y, NAME ) {
        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        const
            moment = require( 'moment' ),
            i18n = Y.doccirrus.i18n,
            async = require ( 'async' ),
            _ = require( 'lodash' ),
            { formatPromiseResult } = require( 'dc-core' ).utils;

        function theyOverLap( ev1, ev2 ) {
            return !(ev1.start >= ev2.end || ev2.start >= ev1.end); // if there is no gap between them
        }

        /**
         * Set value of capacityOfGroup field for current group master and for old one if needed
         * according to use case:
         * 1] group member added to group -> capacityOfGroup - 1 for current group master
         * 2] group member deleted / moved out of group -> capacityOfGroup + 1 for current group master
         * 3] group member moved from one group to another ->
         *    capacityOfGroup - 1 for current group master and capacityOfGroup + 1 for the old one
         *
         * @param {Object} user
         * @param {String} action - identify which action was done - write or delete
         * @param {Object} calevent - calevent object
         * @param {Function} callback
         * @returns {Function} callback
         */
        async function updateGroupMaster( user, action, calevent, callback ) {
            let err,
                currentGroupMaster,
                oldGroupMaster,
                updateOldGroupMaster = false,
                oldData = calevent.originalData_ || {},
                groupMasterWasChanged = calevent.groupId && oldData.groupId && calevent.groupId !== oldData.groupId;

            if( calevent.groupId === calevent._id.toString() ) { // just to prevent a deadly loop
                Y.log( `corrupted data: schedule is a member of itself: _id: ${calevent._id.toString()}`, 'warn', NAME );
                calevent.groupId = null;
                return callback( null, calevent );
            }

            // remove fields that belong only to group master
            calevent.capacityOfGroup = null;
            calevent.group = null;

            [err, currentGroupMaster] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'schedule',
                    query: {_id: calevent.groupId}
                } )
            );

            if( err ) {
                Y.log( `updateGroupMaster. Error getting current group master ${calevent._id.toString()}: ${err.stack || err}`, 'warn', NAME );
                return callback( err );
            }
            currentGroupMaster = currentGroupMaster && currentGroupMaster[0];

            if( groupMasterWasChanged ) {
                [err, oldGroupMaster] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'schedule',
                        query: {_id: oldData.groupId}
                    } )
                );
                if( err ) {
                    Y.log( `updateGroupMaster. Error getting old group master ${oldData.groupId}: ${err.stack || err}`, 'warn', NAME );
                    return callback( err );
                }
                oldGroupMaster = oldGroupMaster && oldGroupMaster[0];
            }

            if( !currentGroupMaster ) {
                Y.log( `updateGroupMaster. the group master does not exist: ${calevent._id.toString()}`, 'debug', NAME );
                return callback( null, calevent );
            }

            if( 'delete' === action ) {
                currentGroupMaster.capacityOfGroup = currentGroupMaster.capacityOfGroup + 1;

            } else if( theyOverLap( currentGroupMaster, calevent )
                       && currentGroupMaster.scheduletype === calevent.scheduletype
                       && currentGroupMaster.calendar.toString() === calevent.calendar.toString() ) { // then update the capacity only if it a new member or just left the group
                if( calevent.isModified( 'groupId' ) ) {    // if a new member
                    calevent.groupId = currentGroupMaster._id.toString();
                    currentGroupMaster.capacityOfGroup = currentGroupMaster.capacityOfGroup - 1;
                    if( oldGroupMaster ) {
                        oldGroupMaster.capacityOfGroup = oldGroupMaster.capacityOfGroup + 1;
                        updateOldGroupMaster = true;
                    }
                } else { // just an update while still inside the group
                    return callback( null, calevent );
                }

            } else { // left the group
                currentGroupMaster.capacityOfGroup = currentGroupMaster.capacityOfGroup + 1;
                calevent.groupId = null;
            }

            [err] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'schedule',
                    action: 'put',
                    query: {
                        _id: currentGroupMaster._id
                    },
                    fields: ['capacityOfGroup'],
                    data: Y.doccirrus.filters.cleanDbObject( {
                        capacityOfGroup: currentGroupMaster.capacityOfGroup
                    } )
                } )
            );
            if( err ) {
                Y.log( `updateGroupMaster. Error updating capacityOfGroup in current group master ${currentGroupMaster._id}: ${err.stack || err}`, 'warn', NAME );
                return callback( err );
            }

            if( updateOldGroupMaster ) {
                [err] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'schedule',
                        action: 'put',
                        query: {
                            _id: oldGroupMaster._id
                        },
                        fields: ['capacityOfGroup'],
                        data: Y.doccirrus.filters.cleanDbObject( {
                            capacityOfGroup: oldGroupMaster.capacityOfGroup
                        } )
                    } )
                );
                if( err ) {
                    Y.log( `updateGroupMaster. Error updating capacityOfGroup in old group master ${oldGroupMaster._id}: ${err.stack || err}`, 'warn', NAME );
                    return callback( err );
                }
            }

            return callback( null, calevent );
        }

        /**
         * Updates all group members with groupId === calevent._id if group master was moved in time range or between calendars
         * so all group members will be moved together with master
         *
         * @param {Object} user
         * @param {Object} calevent
         * @param {Function} callback
         * @returns {Promise<*>}
         */
        async function updateGroupMembersOnMasterMove( user, calevent, callback ) {
            let
                err,
                oldData = calevent.originalData_ || null,
                // master can be moved in time range or between calendars
                masterWasMoved = calevent && calevent.group && oldData &&
                                 (!moment( calevent.start ).isSame( oldData.start ) || !moment( calevent.end ).isSame( oldData.end ) ||
                                  calevent.calendar.toString() !== oldData.calendar.toString());

            if( !masterWasMoved ) {
                return callback( null, calevent );
            }

            [err] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'schedule',
                    action: 'update',
                    query: {
                        groupId: calevent._id
                    },
                    data: {
                        $set: {
                            start: calevent.start,
                            end: calevent.end,
                            calendar: calevent.calendar
                        }},
                    options: {multi: true}
                } )
            );

            if( err ) {
                Y.log( `updateGroupMembersOnMasterMove. Error updating members of ${calevent._id} group: ${err.stack || err}`, 'warn', NAME );
                return callback( err );
            }
            return callback( null, calevent );
        }

        /**
         * if the calevent belongs to a group then update the remaining capacity of the group
         * @param   {Object}          user
         * @param   {Object}          calevent
         * @param   {Function}        callback
         */
        function increaseGroupCapacity( user, calevent, callback ) {

            if( !calevent.groupId ) {
                callback( null, calevent );
                return;
            }

            updateGroupMaster( user, 'delete', calevent, callback );
        }

        /**
         * if the calevent belongs to a group then update the remaining capacity of the group
         * increase the capacity if the event has left the group
         * decrease the capacity if it is a new member
         * @param   {Object}          user
         * @param   {Object}          calevent
         * @param   {Function}        callback
         */
        function updateGroupMembership( user, calevent, callback ) {
            // to prevent setting master of group into other group
            if( !calevent.groupId || calevent.group ) {
                callback( null, calevent );
                return;
            }

            updateGroupMaster( user, 'write', calevent, callback );
        }

        function setScheduled( user, calevent, callback ) {
            function handleScheduler( err, result ) {
                var
                    scheduler;
                if( err ) {
                    return callback( err );
                }
                scheduler = result;

                if( Y.doccirrus.schemas.calendar.SCH_NOSHOW === calevent.scheduled ||
                    Y.doccirrus.schemas.calendar.SCH_UNCONFIRMED === calevent.scheduled ) {
                    return callback( null, calevent );
                }

                if( !scheduler.getConfig().autoMutateOff ){
                    if( moment( calevent.start ).isAfter( moment().add( 15, 's' ) ) ) {
                        calevent.scheduled = Y.doccirrus.schemas.calendar.SCH_WAITING;
                    }
                }
                callback( null, calevent );
            }

            Y.doccirrus.scheduling.getScheduler( user, handleScheduler );
        }

        function removePatientFromGroupMaster( user, calevent, callback ) {
            if( calevent.group ) {
                delete calevent._doc.patient;
            }
            return callback( null, calevent );
        }

        /**
         * set a new title if necessary
         * @param   {Object}          user
         * @param   {Object}          calevent
         * @param   {Function}        callback
         */
        function setTitle( user, calevent, callback ) {
            let
                isNewFromPartner = calevent.title && calevent.partner && calevent.isNew;
            if( !calevent.isModified( 'patient' ) && !calevent.isModified( 'userDescr' ) && !calevent.isModified( 'title' ) && !calevent.isModified( 'scheduletype' ) || ( isNewFromPartner && !( this.context && this.context.migrateGroup ) ) ) {
                callback( null, calevent );
                return;
            }

            Y.doccirrus.calUtils.getScheduleTitle( user, calevent, function( err, title ) {
                if( err ) {
                    Y.log( `error in setting calevent title: ${JSON.stringify( err )}`, 'error', NAME );
                }
                calevent.title = title;
                callback( err, calevent );
            } );
        }

        /**
         * Returns a short description for cal event.
         *
         * @param   {Object}            data            CalEvent (repetition or schedule)
         * @returns {string}
         */
        function describeCalEvent( data ) {
            var
                msg = data.title || '',
                time = '';
            if( data.start ) {
                time = moment( data.start ).format( 'DD.MM HH:mm' );
                if( data.duration ) {
                    time += ',' + data.duration + 'm';
                }
                time = '(' + time + ')';
            }

            if( msg ) {
                msg += ' ' + time;
            }
            else {
                msg = time;
            }

            if( data.adhoc ) {
                msg += ', Nr. ' + (data.number ? data.number : '');
            }

            return msg;
        }

        /**
         * delete all repetitions that belong to this schedule
         * @param   {Object}          user
         * @param   {Object}          schedule
         * @param   {Function}        callback
         *
         * @return {Function}         callback
         */
        function createNewMaster( user, schedule, callback ) {
            var newMaster,
                newLinkId;
            if( !schedule.repetition || schedule.repetition === 'NONE') {
                return callback( null, schedule );
            }
            else {
                // Y.log( 'updating all repetitions for the master schedule: ' + JSON.stringify( schedule ), 'debug', NAME );
                Y.doccirrus.mongodb.runDb({
                    user: user,
                    model: 'schedule',
                    action: 'get',
                    query: {
                        linkSeries: schedule._id
                    },
                    options: {
                        sort: { start: 1 }
                    }
                }, function( err, result ) {
                    if( err ) {
                        return callback( err );
                    }
                    if ( result && result[0] ) {
                            newMaster = result[0];
                            newLinkId = newMaster._id;
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            action: 'put',
                            model: 'schedule',
                            query: {
                                _id: newMaster._id
                            },
                            fields: [ 'linkSeries', 'repetition', 'dtstart', 'until' ],
                            data: Y.doccirrus.filters.cleanDbObject({
                                linkSeries: '',
                                repetition: schedule.repetition,
                                dtstart: moment( newMaster.start ).add( 'day', -1 ).endOf( 'day' ).add( 1, 'milliseconds' ),
                                until: schedule.until
                            }),
                            options: { override: true },
                            callback: function( err ) {
                                if( err ) {
                                    return callback( err );
                                } else {
                                    result.shift();
                                    if (result){
                                        async.each( result, function( item ) {
                                            Y.doccirrus.mongodb.runDb( {
                                                user: user,
                                                action: 'put',
                                                model: 'schedule',
                                                query: {
                                                    _id: item._id
                                                },
                                                fields: [ 'linkSeries' ],
                                                data: Y.doccirrus.filters.cleanDbObject({
                                                    linkSeries: newLinkId
                                                }),
                                                options: {override: true},
                                                callback: function( err ) {
                                                    if( err ) {
                                                        return callback( err );
                                                    }
                                                    else {
                                                        return callback( null, schedule );
                                                    }
                                                }
                                            } );

                                        }, function(err) {
                                            return callback( err );
                                        } );
                                    }
                                    else {
                                        return callback( null, schedule );
                                    }


                                }
                            }
                        } );

                    }
                    else {
                        return callback( null, schedule );
                    }
                } );
            }
        }

        /**
         * if the timing of the calevent is changed then update the nextAppointment of the relevant patient
         *
         * @param   {Object}          user
         * @param   {Object}          calevent
         * @param   {Function}        callback
         */
        function updateNextAppointment( user, calevent, callback ) {
            var
                oldData = calevent.originalData_ || {},
                scheduledWasChanged = oldData.scheduled !== calevent.scheduled;

            if( !calevent.patient && !oldData.patient ) {
                callback( null, calevent );
                return;
            }

            function done( err ) {
                if( err ) {
                    Y.log( 'error in updating nextAppointment: ' + JSON.stringify( err ), 'error', NAME );
                    callback( err );
                } else {
                    callback( null, calevent );
                }
            }

            function updatePatient( patientId, _callback ) {
                Y.doccirrus.calUtils.getEventList( user, {
                        calendarType: 'real',
                        scheduled: 'waiting',
                        patient: patientId,
                        dateFrom: 'now',
                        duration: 'all',
                        limit: 1
                    },
                    function( err, calevents ) {
                        var
                            nextApp = calevents && calevents[0];
                        if( err ) {
                            _callback( err );
                            return;
                        }

                        function directUpdateCb( err, patientModel ) {
                            if( err ) {
                                Y.log( 'could not get patientModel to set next appointment ' + patientId + ' and appointment ' + nextApp.start, 'error', NAME );
                                return callback( err );
                            }

                            patientModel.mongoose.update( {
                                _id: patientId
                            }, {
                                nextAppointment: nextApp ? nextApp.start : null
                            }, callback );

                        }

                        Y.doccirrus.mongodb.getModel( user, 'patient', true, directUpdateCb );
                    } );
            }

            // if there was any change that can affect next appointment then recompute it
            // false positives are ok here
            if( !oldData._id || calevent.isNew || calevent.deleted ||           // action id delete or post
                !moment( oldData.eta ).isSame( calevent.eta, 'minutes' ) ||     // start time changed
                (calevent.dtstart && !moment( oldData.dtstart ).isSame( calevent.dtstart, 'minutes' )) ||   // series time span was changed
                (calevent.repetition && oldData.repetition !== calevent.repetition) ||              // repetition field changed
                (!oldData.patient && calevent.patient) || (oldData.patient && !calevent.patient) ||   // patient added/removed to/from the calevent
                oldData.patient.toString() !== calevent.patient.toString() || scheduledWasChanged ) {                   // patient changed

                // update nextAppointment for one or two patients
                updatePatient( oldData.patient || calevent.patient, function updateNewPatient( err ) {
                    if( err ) {
                        done( err );
                        return;
                    }
                    if( oldData.patient && calevent.patient && oldData.patient.toString() !== calevent.patient.toString() ) {    // if a patient was switched with another
                        updatePatient( calevent.patient, done ); // update the new patient
                    } else {
                        done();
                    }
                } );

            } else {
                callback( null, calevent );
            }
        }

        /**
         * Set the the name of the latest user who do the change
         * @param   {Object}          user
         * @param   {Object}          calevent
         * @param   {Function}        callback
         */
        function setLastEditUser( user, calevent, callback ) {

            let Promise = require( 'bluebird' ),
                runDb = Promise.promisify( Y.doccirrus.mongodb.runDb );

            function getEmployeeFromUsername( user, username ) {
                return runDb( {
                    user: user,
                    model: 'employee',
                    action: 'get',
                    query: {
                        username: username
                    }
                } );
            }

            calevent.lastEditedDate = new Date();

            if( 'su' !== user.id ) {
                getEmployeeFromUsername( user, user.id )
                    .then( ( currentUser ) => {
                        if( currentUser && Array.isArray( currentUser ) ) {
                            let employee = currentUser[0];
                            calevent.lastEditor = Y.doccirrus.schemas.person.personDisplay( employee );
                        }
                        callback( null, calevent );
                    } )
                    .catch( ( err ) => callback( err, calevent ) );
            } else {
                callback( null, calevent );
            }
        }

        function updateReporting( user, schedule, callback ) {
            //TODO: merge and insert check for task template
            Y.doccirrus.insight2.utils.requestReporting( user, 'SCHEDULE', schedule._id.toString() );
            callback( null, schedule );
        }

        /**
         *  When a schedule is deleted we will need to delete its reporting entry, and any queued task to update
         *  the reporting.
         *
         *  @param  {Object}    user
         *  @param  {Object}    schedule
         *  @param  {Functoion} callback
         */

        function deleteReporting( user, schedule, callback ) {
            Y.doccirrus.insight2.utils.removeReporting( user.tenantId, 'SCHEDULE', schedule._id );
            callback( null, schedule );
        }

        function realignSchedule( user, schedule, callback ) {
            Y.doccirrus.scheduling.doRealign( user, ( err ) => {
                if ( err ) {
                    return callback( err, schedule );
                } else {
                   return callback( null, schedule );
                }
            } );
        }

        function emitCalendars( user, schedule, callback ) {
            let
                oldData = schedule.originalData_ || {},
                calendarWasChanged = schedule.calendar && oldData.calendar && schedule.calendar !== oldData.calendar,
                calendarsToRefresh = calendarWasChanged ? [schedule.calendar.toString(), oldData.calendar.toString()] : ( schedule.calendar && schedule.calendar.toString() );
            if( schedule.closeTime ) {
                Y.doccirrus.communication.emitNamespaceEvent( {
                    nsp: 'default',
                    event: `calendar.blockedSlotRefresh`,
                    tenantId: user && user.tenantId,
                    msg: {
                        data: schedule.calendar && schedule.calendar.toString()
                    }
                } );
                Y.doccirrus.communication.emitNamespaceEvent( {
                    nsp: 'default',
                    event: `calendar.closeTimeRefresh`,
                    tenantId: user && user.tenantId,
                    msg: {
                        data: schedule.calendar && schedule.calendar.toString()
                    }
                } );
            } else {
                Y.doccirrus.communication.emitNamespaceEvent( {
                    nsp: 'default',
                    event: `calendar.refresh`,
                    tenantId: user && user.tenantId,
                    msg: {
                        data: calendarsToRefresh
                    }
                } );
            }
            return callback( null, schedule );
        }

        function updateConference( user, schedule, callback ) {
            const
                context = this && this.context;
            if( !schedule.conferenceId || (context && context.skipConferenceUpdate) ) {
                return setImmediate( callback, null );
            }
            Y.doccirrus.mongodb.runDb( {
                user,
                model: 'conference',
                action: 'update',
                query: {
                    _id: schedule.conferenceId,
                    status: Y.doccirrus.schemas.conference.conferenceStatuses.NEW
                },
                data: {
                    $set: {
                        startDate: schedule.start
                    }
                }
            }, ( err ) => callback( err ) );
        }

        function setEventState( user, calevent, callback ) {
            var
                oldData = calevent.originalData_ || {},
                now = new Date().toJSON(),
                start = calevent.start,
                end = calevent.end;

            if( ( Y.doccirrus.schemas.calendar.SCH_ENDED === calevent.scheduled && Y.doccirrus.schemas.calendar.SCH_CURRENT === oldData.scheduled ) ||
                Y.doccirrus.schemas.calendar.SCH_NOSHOW === calevent.scheduled || Y.doccirrus.schemas.calendar.SCH_UNCONFIRMED === calevent.scheduled ) {
                return callback( null, calevent );
            }

            if( calevent.adhoc ) {
                return callback( null, calevent );
            }

            if( !start || !end ) {
                Y.log( 'cannot determine calevent state', 'debug', NAME );
                return callback( null, calevent );
            }

            if( calevent.closeTime ) {
                calevent.scheduled = Y.doccirrus.schemas.calendar.SCH_WAITING;
                return callback( null, calevent );
            }

            if( !moment( oldData.start ).isSame( start, 'minutes' ) ||
                !moment( oldData.end ).isSame( end, 'minutes' )) {
                now = now.slice( 0, -8 ); // slice the part after minute, since the exact now creates problem

                end = end && end.toJSON ? end.toJSON() : end;
                start = start.toJSON ? start.toJSON() : start;
                start = start.slice( 0, -8 );

                //MOJ-465, enforce scheduled flag for entries in the past
                if( end && end < now ) {                                 // if completely in the past
                    calevent.scheduled = Y.doccirrus.schemas.calendar.SCH_ENDED;
                    Y.log( 'setting the calevent to ENDED: end=' + end + ' ,now=' + now, 'debug', NAME );

                } else if( start < now ) {    // if starts in the past and ends in the future (and if not specified)
                    calevent.scheduled = Y.doccirrus.schemas.calendar.SCH_CURRENT;
                    Y.log( 'setting the calevent to CURRENT: start=' + start + ' ,now=' + now, 'debug', NAME );

                } else if( start > now ) {
                    Y.log( 'setting the calevent to WAITING: start=' + start + ' ,now=' + now, 'debug', NAME );
                    calevent.scheduled = Y.doccirrus.schemas.calendar.SCH_WAITING;
                }
                return callback( null, calevent );
            } else {
                return callback( null, calevent );
            }
        }

        function createTaskForReception( user, calevent, callback ) {
            const
                ID_LENGTH = 24,
                context = this.context,
                taskData = {
                    allDay: false,
                    alertTime: (new Date()).toISOString(),
                    title: '',
                    urgency: 2,
                    group: false,
                    roles: [Y.doccirrus.schemas.role.DEFAULT_ROLE.EMPFANG],
                    creatorName: "System",
                    details: '',
                    skipcheck_: true,
                    linkedSchedule: calevent._id,
                    patientId: '',
                    patientName: ''
                };

            let usePatientId = calevent.patient;

            if( !context || ( context && 0 === Object.keys( context ).length ) ) {
                return callback( null, calevent );
            }

            if( !calevent.isFromPortal || !calevent.patient ) {
                return callback( null, calevent );
            }

            //  Extra checks on patientId from PP due to issue seen in EXTMOJ-1686
            if ( 'string' === typeof usePatientId && usePatientId.length > ID_LENGTH ) {
                try {
                    usePatientId = JSON.parse( usePatientId );
                } catch ( parseErr ) {
                    return callback( Y.doccirrus.errors.rest( 500, `Invalid patient to create task: ${JSON.stringify( usePatientId )}`  ) );
                }
            }

            if ( 'object' === typeof usePatientId ) {
                if ( !usePatientId._id ) {
                    return callback( Y.doccirrus.errors.rest( 500, `Invalid patient to create task: ${JSON.stringify( usePatientId )}` ) );
                }
                usePatientId = usePatientId._id;
            }

            taskData.patientId = usePatientId;
            taskData.patientName = calevent.title && calevent.title.split( ', ' )[0] + ', ' + calevent.title.split( ', ' )[1];

            if( calevent.isNew && ( context && context.createTask ) ) {
                taskData.title = i18n( 'CalendarMojit.schedule_process.text.CREATE_APPOINTMENT_PP' );
            }

            if( !calevent.isNew && ( context && context.createTask ) ) {
                taskData.title = i18n( 'CalendarMojit.schedule_process.text.DELETE_APPOINTMENT_PP' );
            }

            if( taskData.title ) {
                async.series( [
                    ( next ) => {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'calendar',
                            action: 'get',
                            query: {_id: calevent.calendar},
                            options: {
                                select: {
                                    name: 1
                                }
                            }
                        }, function( err, result ) {
                            if( err ) {
                                return next( err );
                            }
                            if( result && result[0] ) {
                                taskData.details += result[0].name + '\n';
                            }
                            return next();
                        } );
                    },
                    ( next ) => {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'scheduletype',
                            action: 'get',
                            query: {_id: calevent.scheduletype},
                            options: {
                                select: {
                                    name: 1
                                }
                            }
                        }, function( err, result ) {
                            if( err ) {
                                return next( err );
                            }
                            if( result && result[0] ) {
                                taskData.details += result[0].name + '\n';
                            }
                            return next();
                        } );
                    },
                    ( next ) => {
                        taskData.details += moment( calevent.start ).format( 'DD.MM.YYYY (HH:mm)' );
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'task',
                            action: 'post',
                            data: taskData
                        }, function( err ) {
                            if( err ) {
                                return next( err );
                            }
                            return next();
                        } );
                    }
                ], ( err ) => {
                    if( err ) {
                        return callback( err, calevent );
                    }
                    return callback( null, calevent );
                } );
            } else {
                return callback( null, calevent );
            }
        }

        /**
         * Sets value for noShowCount property in patient
         *
         * @method setPatientNoShowCounter
         *
         * @param {object} user
         * @param {{
         *           title: <String>,
         *           userDescr: <String>,
         *           urgency: <Number>,
         *           severity: <String>,
         *           allDay:  <Boolean>,
         *           repetition: <String>,
         *           byweekday: [String],
         *           arrivalTime: <Date>,
         *           _id: <ObjectId>,
         *           start: <Date>,
         *           end: <Date>,
         *           group: <Boolean>,
         *           calendar: <ObjectId>,
         *           scheduletype: <String>,
         *           duration: <Number>,
         *           plannedDuration: <Number>,
         *           interval: <Number>,
         *           capacityOfGroup: <Number>,
         *           adhoc: <Boolean>,
         *           pushtime: <Date>,
         *           eta: <Date>,
         *           adhoc: <Boolean>,
         *           pushtime: <Date>,
         *           capacityOfGroup: <Number>,
         *           conferenceId: <ObjectId>,
         *           scheduled: <Number>,
         *           lastEditor: <String>,
         *           dtstart: <Date>,
         *           until: <Date>,
         *           lastEditedDate:  <Date>
         *        }} calevent :REQUIRED: Object which is passed to pre/post process
         * @param {function} callback
         * @returns {function} callback
         */
        async function setPatientNoShowCounter( user, calevent, callback ) {
            let
                oldData = calevent.originalData_ || {},
                patient,
                setToNoShow = Y.doccirrus.schemas.calendar.SCH_NOSHOW === calevent.scheduled && Y.doccirrus.schemas.calendar.SCH_NOSHOW !== oldData.scheduled,
                activateAgain = Y.doccirrus.schemas.calendar.SCH_NOSHOW !== calevent.scheduled && Y.doccirrus.schemas.calendar.SCH_NOSHOW === oldData.scheduled;

            if( !calevent.patient || ( !setToNoShow && !activateAgain ) ) {
                return callback( null, calevent );
            }

            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'patient',
                    action: 'get',
                    query: {_id: calevent.patient}
                } )
            );

            if( err ) {
                Y.log( `error in getting patients: ${err.stack || err}`, 'error', NAME );
                return callback( err );

            }
            if( !result || !result[0] ) {
                Y.log( 'No patient to set noShowCount.', 'info', NAME );
                return callback( null, calevent );
            }
            patient = result[0];
            if( setToNoShow ) {
                patient.noShowCount = patient.noShowCount ? patient.noShowCount + 1 : 1;
            }
            if( activateAgain ) {
                patient.noShowCount = patient.noShowCount ? patient.noShowCount - 1 : 0;
            }

            [err] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.patient.put( {
                        user: user,
                        data: patient && JSON.parse( JSON.stringify( patient ) ),
                        fields: ['noShowCount'],
                        callback: ( err ) => {
                            if( err ) {
                                return reject( err );
                            }
                            return resolve();
                        }
                    } );
                } )
            );

            if( err ) {
                Y.log( `Error in setting noShowCount for patient: ${patient._id}. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }
            return callback( null, calevent );
        }

        /**
         * Set initials values for calevent
         *
         * @param   {Object}          user
         * @param   {Object}          calevent
         * @param   {Function}        callback
         */
        function setWasNew( user, calevent, callback ) {
            let context = this && this.context || {};
            if( context.activeActiveWrite ) {
                calevent.lastChanged = calevent.lastChanged || new Date();
            } else {
                calevent.lastChanged = new Date();
            }
            calevent.wasNew = calevent.isNew;
            callback( null, calevent );
        }

        /**
         * Check that end value of calevent is equal to start + duration and fix if it's not
         *
         * @param   {Object}          user
         * @param   {Object}          calevent
         * @param   {Function}        callback
         *
         * @return  {Function}        callback
         */
        function checkEndAndDurationAccordance( user, calevent, callback ) {
            let start = calevent.start,
                duration = calevent.duration,
                end = calevent.end,
                calcDuration;

            if( end && duration ) {
                calcDuration = moment( end ).diff( moment( start ), "minutes" );

                if( calcDuration !== duration ) {
                    calevent.end = moment( start ).add( duration, 'minutes' ).toISOString();
                }
            }
            return callback( null, calevent );
        }

        function syncScheduleWithDispatcherOnDelete( user, schedule, callback ) {
            callback( null, schedule );
            let context = this && this.context || {};
            if( context.activeActiveWrite ){
                Y.log( 'Write by activeActive, immediate sync skipped', 'info', NAME );
                return;
            }
            Y.doccirrus.api.dispatch.syncObjectWithDispatcher(user, 'activeReference', {
                addedFrom: `schedule_${ schedule._id.toString()}`,
                entityName: 'schedule',
                entryId: schedule._id.toString(),
                lastChanged: schedule.lastChanged,
                onDelete: true
            }, () => {} );
        }

        function syncScheduleWithDispatcher( user, schedule, callback ) {
            callback( null, schedule );
            let context = this && this.context || {};
            if( context.activeActiveWrite ){
                Y.log( 'Write by activeActive, immediate sync skipped', 'info', NAME );
                return;
            }
            Y.doccirrus.api.dispatch.syncObjectWithDispatcher(user, 'activeReference', {
                addedFrom: `schedule_${ schedule._id.toString()}`,
                entityName: 'schedule',
                entryId: schedule._id.toString(),
                lastChanged: schedule.lastChanged,
                onDelete: false
            }, () => {} );
        }

        /**
         * Deletes conference connected to this schedule
         * if schedule has 'conferenceId' property set
         *
         * @param {object} user
         * @param {object} schedule
         * @param {function} callback
         * @returns {function} callback
         */
        function deleteRelatedConference( user, schedule, callback ) {
            if( !schedule.conferenceId  ) {
                return callback( null, schedule );
            }
            Y.doccirrus.mongodb.runDb( {
                user,
                model: 'conference',
                action: 'delete',
                query: {
                    _id: schedule.conferenceId
                }
            }, err => {
                if( err ) {
                   Y.log( `Error while deleting conference connected to schedule ${schedule._id}. Error: ${err.stack || err}`, 'error', NAME );
                   return callback( err );
                }
                return callback( null, schedule );
            });
        }

        /**
         * @private
         * @async
         *
         * This method does below:
         * 1] Deletes all schedules with the same 'linkByResource' value as in the deleted schedule
         *
         * @param {Object} user
         * @param {Object} schedule
         * @param {function} callback
         * @returns {function} callback
         */
        async function deleteResourceLinkedCalevents( user, schedule, callback ) {
            if( schedule.resourceBased && schedule.linkByResource ) {
                let [err, result] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'schedule',
                        action: 'delete',
                        query: {
                            linkByResource: schedule.linkByResource
                        },
                        options: {
                            override: true // needed to override MAX_DELETE
                        }
                    } )
                );

                if( err ) {
                    Y.log( `deleteResourceLinkedCalevent. Error while deleting resourceLinked schedules connected to schedule ${schedule._id}. Error: ${err.stack || err}`, 'warn', NAME );
                    return callback( err );
                }
                if( result && result.length ) {
                    Y.log( `deleteResourceLinkedCalevent. Successfully deleted ${result.length} linked schedules.`, 'info', NAME );
                }
            }
            return callback( null, schedule );
        }

        /**
         * @private
         * @async
         *
         * This method does below:
         * 1] Updates all schedules with the same 'linkByResource' value as in the updated schedule
         *    with all data changes except '_id', 'calendar', 'resource'. Works for updated (not created) schedules only.
         *
         * @param {Object} user
         * @param {Object} schedule
         * @param {function} callback
         * @returns {function} callback
         */
        async function updateResourceLinkedCalevents( user, schedule, callback ) {
            if( schedule.resourceBased && schedule.linkByResource && !schedule.wasNew ) {
                let
                    dataToUpdate = _.omit( schedule.toObject(), ['_id', 'calendar', 'resource', 'isReadOnly', 'linkSeries'] ),
                    [err, result] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'schedule',
                            action: 'update',
                            query: {
                                linkByResource: schedule.linkByResource
                            },
                            fields: Object.keys( dataToUpdate ),
                            data: dataToUpdate,
                            options: {
                                multi: true
                            }
                        } )
                    );
                if( err ) {
                    Y.log( `updateResourceLinkedCalevents. Error while updating resourceLinked schedules connected to schedule ${schedule._id}. Error: ${err.stack || err}`, 'warn', NAME );
                    return callback( err );
                }

                if( result && result.nModified ) {
                    Y.log( `updateResourceLinkedCalevents. Successfully updated ${result.nModified} linked schedules.`, 'info', NAME );
                }
            }
            return callback( null, schedule );
        }

        /**
         *  Call function to create audit log entry on each create/delete of schedule from Patient Portal
         *
         *  @param  {Object}    user
         *  @param  {Object}    schedule
         *  @param  {Function}  callback
         *
         *  @return {Function}  callback
         */
        function auditPP( user, schedule, callback ) {
            if( this.context && this.context.auditPP ) {
                Y.doccirrus.utils.auditPPAction( user, {
                    model: 'schedule',
                    action: 'post',
                    who: schedule.patient,
                    entry: schedule
                } );
            }
            if( this.context && this.context.auditPPDelete ) {
                Y.doccirrus.utils.auditPPAction( user, {
                    model: 'schedule',
                    action: 'delete',
                    who: schedule.patient,
                    entry: schedule
                } );
            }
            return callback( null, schedule );
        }

        /**
         *  Delete reporting entry for this schedule after it is deleted
         *
         *  @param  {Object}    user
         *  @param  {Object}    schedule
         *  @param  {Function}  callback
         */

        function removeReporting( user, schedule, callback ) {
            let
                scheduleId = schedule._id.toString();

            Y.log( `Remove reporting entry after deletion of schedule: ${scheduleId}`, 'info', NAME );
            Y.doccirrus.insight2.utils.removeReporting( user.tenantId, 'SCHEDULE', scheduleId );

            callback( null, schedule );
        }

        /**
         *
         * v.0. presents an array of pre process functions &
         *      an array of post-process functions.
         *
         * @Class ScheduleProcess
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            pre: [
                {
                    run: [
                        removePatientFromGroupMaster,
                        setTitle,
                        setScheduled,
                        setEventState,
                        Y.doccirrus.calUtils.alertEvent,
                        updateGroupMembership,
                        updateGroupMembersOnMasterMove,
                        setLastEditUser,
                        createTaskForReception,
                        setWasNew,
                        checkEndAndDurationAccordance
                    ],
                    forAction: 'write'
                },
                {
                    run: [
                        Y.doccirrus.calUtils.alertEventDelete,
                        createNewMaster,
                        increaseGroupCapacity,
                        syncScheduleWithDispatcherOnDelete
                    ],
                    forAction: 'delete'
                }
            ],
            post: [
                {
                    run: [
                        updateConference,
                        updateNextAppointment,
                        updateReporting,
                        realignSchedule,
                        setPatientNoShowCounter,
                        emitCalendars,
                        syncScheduleWithDispatcher,
                        updateResourceLinkedCalevents,
                        auditPP
                    ],
                    forAction: 'write'
                },
                {
                    run: [
                        updateNextAppointment,
                        deleteReporting,
                        emitCalendars,
                        createTaskForReception,
                        deleteRelatedConference,
                        deleteResourceLinkedCalevents,
                        removeReporting,
                        auditPP
                    ],
                    forAction: 'delete'
                }
            ],

            updateNextAppointment: updateNextAppointment,

            describe: describeCalEvent,

            audit: {
                // audit: {}  switches on auditing.  for no auditing, do not include the "audit" parameter

                /**
                 * optional:  true = in addition to regular auditing note down actions
                 * on this model that were attempted as well as ones that failed.
                 * Descr. in this case will always be "Versuch".
                 *
                 * false = note down only things that actually took place,
                 * not attempts that failed
                 */
                noteAttempt: false,

                /**
                 * optional: here we can override what is shown in the audit log description
                 * only used when the action succeeds (see noteAttempt)
                 *
                 * @param data
                 * @returns {*|string|string}
                 */
                descrFn: describeCalEvent
            },
            name: NAME,

            setTitle: setTitle // exposed for repetition-process
        };

    },
    '0.0.1', {requires: ['syncreporting-utils', 'conference-schema']} );
