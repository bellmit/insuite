/**
 * User: pi
 * Date: 04/10/2017  13:00
 * (c) 2017, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'conference-api', function( Y, NAME ) {

        const
            moment = require( 'moment' ),
            async = require( 'async' ),
            i18n = Y.doccirrus.i18n,
            {formatPromiseResult, promisifyArgsCallback, handleResult} = require('dc-core').utils,
            ObjectId = require( 'mongoose' ).Types.ObjectId,
            AMOUNT_OF_MINUTES_SCHEDULE_CAN_BE_CONFIRMED = 15,
            TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' );

        /**
         * @module conference-api
         */

        /**
         * Based on configuration settings extend participant list by cc emails for all opertaion types
         *
         * @method extendParticipantsByCopyEmails
         * @private
         *
         * @param {Object} user
         * @param {Object|String} calendarId        - assigned to schedule calendar
         * @param {Array<Object>} emailParticipants - array of conference participants to whom an email will be send
         *
         * @returns {Promise} - mutate emailParticipants array
         */
        async function extendParticipantsByCopyEmails( user, calendarId, emailParticipants ){
            const filterActiveLocationEmail = ( el ) => {
                return el.type === 'email' && el.receiver === 'location' && el.active;
            };

            let [err, practices] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'practice',
                    query: {},
                    useCache: false,
                    options: {
                        select: {
                            createAlert: 1,
                            updateAlert: 1,
                            deleteAlert: 1
                        }
                    }
                } )
            );
            if( err ){
                Y.log( `extendParticipantsByCopyEmails: error getting practice ${err.stack || err}`, 'error', NAME );
                throw( err );
            }

            let copyCreate = (practices && practices[0] && practices[0].createAlert || []).find( filterActiveLocationEmail ),
                copyUpdate = (practices && practices[0] && practices[0].updateAlert || []).find( filterActiveLocationEmail ),
                copyDelete = (practices && practices[0] && practices[0].deleteAlert || []).find( filterActiveLocationEmail );

            if( copyCreate || copyUpdate || copyDelete ) {
                let [err, emails] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'calendar',
                        action: 'aggregate',
                        pipeline: [
                            {$match: {_id: ObjectId( calendarId.toString() )}},
                            {
                                $lookup: {
                                    from: 'locations',
                                    localField: 'locationId',
                                    foreignField: '_id',
                                    as: 'locations'
                                }
                            },
                            {$unwind: '$locations'},
                            {$project: {email: '$locations.email'}}
                        ]
                    } )
                );
                if( err ) {
                    Y.log( `extendParticipantsByCopyEmails: Error on getting location email for calendar ${calendarId}: ${err.stack || err}`, 'error', NAME );
                    throw( err );
                }
                emails = ((emails.result ? emails.result : emails) || []).map( el => el.email ).filter( Boolean );

                if( emails.length ) {
                    emails = emails.join( ', ' );
                    emailParticipants.map( el => {
                        if( copyCreate ) {
                            el.copyEmailCreate = emails;
                        }
                        if( copyUpdate ) {
                            el.copyEmailUpdate = emails;
                        }
                        if( copyDelete ) {
                            el.copyEmailDelete = emails;
                        }
                    } );
                }
            }
        }

        /**
         * Creates a conference first, then creates schedule with link to the conference
         * - if schedule is UNCONFIRMED then send a confirmation email to patient
         * @method createOnlineConference
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Object} args.data.conference conference data
         * @param {Object} args.data.schedule schedule data
         * @param {Function} args.callback
         */
        async function createOnlineConference( args ) {
            Y.log( 'Entering Y.doccirrus.api.conference.createOnlineConference', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.conference.createOnlineConference' );
            }
            const
                {user, data: {conference, schedule} = {}, callback} = args,
                sendVCConfirmationEmailP = promisifyArgsCallback( Y.doccirrus.api.conference.sendVCConfirmationEmail );
            let context = {},
                err, patient, result, conferenceId, scheduleId,
                email = {};
            if( !conference || !schedule ) {
                return handleResult( new Y.doccirrus.commonerrors.DCError( 400, {message: 'conference or schedule data is missing'} ), null, callback );
            }
            if( schedule.isFromPortal ) {
                context = {
                    createTask: true
                };
            }

            // check employees array for valid entries
            if( conference && conference.employees ) {
                if( !conference.employees.length ) {
                    // should not happen since there is validation on UI
                    Y.log( `createOnlineConference. There are no employees in conference!`, 'warn', NAME );
                    return handleResult( new Y.doccirrus.commonerrors.DCError( 'conference_02' ), null, callback );
                }
                if( conference.employees.some( ( item ) => {
                    return null === item || undefined === item || !Y.doccirrus.comctl.isObjectId( item ) || !item;
                } ) ) {
                    Y.log( `createOnlineConference. Some values in conference employees has wrong format - ${JSON.stringify( conference.employees )}`, 'warn', NAME );
                    return handleResult( new Y.doccirrus.commonerrors.DCError( 'conference_01' ), null, callback );
                }
            } else {
                Y.log( `createOnlineConference. Employees field is missing in conference!`, 'warn', NAME );
                return handleResult( new Y.doccirrus.commonerrors.DCError( 'conference_02' ), null, callback );
            }

            if( ( schedule.isFromPortal || schedule.isFromCardReader ) && Y.doccirrus.schemas.conference.conferenceTypes.ONLINE_CONSULTATION === conference.conferenceType ) {
                [err, result] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'patient',
                        action: 'get',
                        query: {
                            _id: conference.patients[0]
                        },
                        options: {
                            select: {
                                _id: 1,
                                firstname: 1,
                                lastname: 1,
                                talk: 1,
                                communications: 1
                            }
                        }
                    } )
                );

                if( err ) {
                    return handleResult( err, null, callback );
                }
                if( result && result[0] ) {
                    patient = result[0];

                    if( patient.communications ) {
                        email = Y.doccirrus.schemas.simpleperson.getEmail( patient.communications );
                        if( email ) {
                            conference.participants.push( {
                                email: email.value,
                                talk: patient.talk,
                                firstname: patient.firstname,
                                lastname: patient.lastname
                            } );
                        }
                    }
                    schedule.patient = patient._id.toString();
                }
            }

            //check if additionally need copy to location
            let emailParticipants = (conference.participants || []).filter( el => el.email );
            if( emailParticipants.length && schedule.calendar ){
                let [err] = await formatPromiseResult( extendParticipantsByCopyEmails( user, schedule.calendar, emailParticipants ) );
                if( err ){
                    Y.log( `notifyParticipant: error getting copy emails ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }
            }

            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'conference',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( conference )
                } )
            );

            if( err ) {
                return handleResult( err, null, callback );
            }
            conferenceId = result && result[0];

            schedule.conferenceId = conferenceId;
            schedule.eta = schedule.start;
            if( moment( schedule.start ).isAfter( moment().add( 15, 's' ) ) &&
                schedule.scheduled !== Y.doccirrus.schemas.calendar.SCH_UNCONFIRMED ) {
                schedule.scheduled = Y.doccirrus.schemas.calendar.SCH_WAITING;
            }

            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'schedule',
                    action: 'post',
                    context,
                    data: Y.doccirrus.filters.cleanDbObject( schedule )
                } )
            );

            if( err ) {
                return handleResult( err, null, callback );
            }

            scheduleId = result && result[0];

            if( schedule.scheduled === Y.doccirrus.schemas.calendar.SCH_UNCONFIRMED ) {
                [err] = await formatPromiseResult( sendVCConfirmationEmailP( {
                    user,
                    data: {
                        scheduleId: scheduleId,
                        participant: conference.participants[0],
                        startDate: conference.startDate
                    }
                } ) );

                if( err ) {
                    return handleResult( err, null, callback );
                }
            }

            return handleResult( null, scheduleId, callback );
        }

        /**
         * Update a conference and schedule.
         * @method updateOnlineConference
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Object} args.data.conference conference data
         * @param {Object} args.data.conference._id conference _id
         * @param {Object} args.data.schedule schedule data
         * @param {Object} args.data.schedule._id schedule _id
         * @param {Function} args.callback
         */
        async function updateOnlineConference( args ) {
            Y.log('Entering Y.doccirrus.api.conference.updateOnlineConference', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.conference.updateOnlineConference');
            }
            const
                { user, data: { conference, schedule } = {}, callback } = args;
            if( !conference || !conference._id || !schedule || !schedule._id ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'conference or schedule data is missing' } ) );
            }

            //check if additionally need copy to location
            let emailParticipants = (conference.participants || []).filter( el => el.email );
            if( emailParticipants.length && schedule.calendar ){
                let [err] = await formatPromiseResult( extendParticipantsByCopyEmails( user, schedule.calendar, emailParticipants ) );
                if( err ){
                    Y.log( `notifyParticipant: error getting copy emails ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }
            }

            let [err] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'conference',
                    action: 'put',
                    query: {
                        _id: conference._id
                    },
                    fields: Object.keys( conference ),
                    data: Y.doccirrus.filters.cleanDbObject( conference )
                } )
            );
            if( err ){
                Y.log( `updateOnlineConference: error updating conference ${conference._id}: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }
            let results;
            [err, results] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'schedule',
                    query: {
                        _id: schedule._id
                    },
                    action: 'put',
                    context: {
                        skipConferenceUpdate: true
                    },
                    fields: Object.keys( schedule ),
                    data: Y.doccirrus.filters.cleanDbObject( schedule )
                })
            );
            if( err ){
                Y.log( `updateOnlineConference: error updating schedule ${schedule._id}: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }
            callback( null, results && results[0] );
        }

        function initializeConferences( args ) {
            Y.log('Entering Y.doccirrus.api.conference.initializeConferences', 'debug', NAME);
            /* gets called very often, by cronjob. not required on info level.*/
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.conference.initializeConferences', 'debug');
            }
            const
                { user, callback } = args;
            Y.log( `Initialize "hot" conferences of tenant: ${user.tenantId}`, 'debug', NAME );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'conference',
                        action: 'get',
                        query: {
                            startDate: {
                                $gt: new Date( moment().startOf( 'd' ).toISOString() ), // get conferences only for today to avoid some old uninitialized entries
                                $lt: new Date( moment().add( 30, 'minutes' ).toISOString() ) },
                            status: Y.doccirrus.schemas.conference.conferenceStatuses.NEW
                        }
                    }, ( err, result ) => {
                        if( err ) {
                            Y.log( `initializeConferences. Error while getting conferences to initialize: ${err.stack || err}`, 'warn', NAME );
                            return next( err );
                        }
                        next( null, result );
                    } );
                },
                function( conferences, next ) {
                    Y.log( `initializeConferences. ${conferences && conferences.length} conferences will be initialized.`, 'info', NAME );
                    async.mapSeries( conferences, ( conference, done ) => {
                        Y.doccirrus.api.conference.initializeConference( {
                            user,
                            data: conference,
                            callback: done
                        } );
                    }, ( err, schedules ) => {
                        if( err ) {
                            Y.log( `initializeConferences. Error during initialize each conference: ${err.stack || err}`, 'warn', NAME );
                            return next( err );
                        }
                        next( null, {
                            calendarIds: schedules && schedules.map( item => item.calendar ),
                            conferences
                        } );
                    } );
                },
                function( data, next ) {
                    let
                        { conferences, calendarIds } = data;
                    if( !conferences || !conferences.length ) {
                        Y.log( `initializeConferences. There are no conferences to initialize.`, 'info', NAME );
                        return next();
                    }
                    Y.log( `initializeConferences. ${conferences && conferences.length} conferences will be updated to INITIALIZED status.`, 'info', NAME );
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'conference',
                        action: 'put',
                        query: {
                            _id: { $in: conferences.map( item => item._id ) }
                        },
                        fields: [ 'status' ],
                        data: {
                            status: Y.doccirrus.schemas.conference.conferenceStatuses.INITIALIZED,
                            multi_: true,
                            skipcheck_: true
                        }
                    }, err => {
                        if( err ) {
                            Y.log( `initializeConferences. Error while updating status of conferences: ${err.stack || err}`, 'warn', NAME );
                            return next( err );
                        }
                        Y.doccirrus.communication.emitNamespaceEvent( {
                            nsp: 'default',
                            event: `calendar.refresh`,
                            tenantId: user && user.tenantId,
                            doNotChangeData: true,
                            msg: {
                                data: calendarIds.map( item => item.toString() )
                            }
                        } );
                        next();
                    } );
                }
            ], ( err ) => {
                if( err ) {
                    Y.log( `initializeConferences. Error: ${err.stack || err}`, 'warn', NAME );
                }
                return callback( err );
            } );

        }

        /**
         * Gets full data for conference
         * @method getCallData
         * @param {Object} params
         * @param {Object} params.user
         * @param {Array} params.employeesId
         * @param {Array} params.patientsId
         * @param {String} params.conferenceId
         * @param {Function} callback
         */
        function getCallData( params, callback ) {
            const
                { user, employeesId, patientsId, conferenceId } = params;
            async.series( {
                employees( next ) {
                    Y.doccirrus.api.employee.get( {
                        user,
                        query: {
                            _id: { $in: employeesId }
                        },
                        originalParams: { includeIdentity: true },
                        callback( err, results ) {
                            if( err ) {
                                Y.log( `getCallData. Error while getting employees for callaudit: ${err.stack || err}.`, 'warn', NAME );
                                return next( err );
                            }
                            next( null, results );
                        }
                    } );
                },
                prcId( next ) {
                    Y.doccirrus.communication.getPRCId( next );
                },
                schedule( next ) {
                    async.waterfall( [
                        function( next ) {
                            Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'schedule',
                                action: 'get',
                                query: {
                                    conferenceId
                                },
                                options: {
                                    limit: 1
                                }
                            }, ( err, results ) => {
                                if( err ) {
                                    Y.log( `getCallData. Error while getting schedule for conference ${conferenceId}: ${err.stack || err}.`, 'warn', NAME );
                                    return next( err );
                                }
                                if( !results || !results[ 0 ] ) {
                                    Y.log( `initializeConference. Can not get schedule entry for conference: ${conferenceId.toString()}, tenant: ${user.tenantId}`, 'error', NAME );
                                    return next( new Y.doccirrus.commonerrors.DCError( 500, { message: `Can not get schedule entry for conference: ${conferenceId.toString()}` } ) );
                                }
                                next( null, results[ 0 ] );
                            } );
                        },
                        function( schedule, next ) {
                            Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'scheduletype',
                                action: 'get',
                                query: {
                                    _id: schedule && schedule.scheduletype
                                },
                                options: {
                                    limit: 1
                                }
                            }, ( err, results ) => {
                                if( err ) {
                                    Y.log( `getCallData. Error while getting scheduletype ${schedule.scheduletype}: ${err.stack || err}.`, 'warn', NAME );
                                    return next( err );
                                }
                                if( !results || !results[ 0 ] ) {
                                    Y.log( `initializeConference. Can not get scheduletype entry _id: ${schedule.scheduletype}, tenant: ${user.tenantId}`, 'error', NAME );
                                }
                                schedule.scheduleTypeName = results && results[ 0 ] && results[ 0 ].name || '';
                                schedule.appointmentType = results && results[ 0 ] && results[ 0 ].type || 'CONFERENCE';
                                next( null, schedule );
                            } );
                        }
                    ], next );
                },
                practice( next ) {
                    Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'practice',
                            query: {}
                        }, function( err, results ) {
                            if( err ) {
                                Y.log( `getCallData. Error while getting practice: ${err.stack || err}.`, 'warn', NAME );
                                return next( err );
                            }
                            if( !results || !results[ 0 ] ) {
                                Y.log( `initializeConference. Can not get practice entry of tenant: ${user.tenantId}`, 'error', NAME );
                                return next( new Y.doccirrus.commonerrors.DCError( 500, { message: `Can not get practice` } ) );
                            }
                            next( null, results[ 0 ] );
                        }
                    );

                },
                location( next ) {
                    Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'location',
                            query: { _id: Y.doccirrus.schemas.location.getMainLocationId() }
                        }, function( err, results ) {
                            if( err ) {
                                Y.log( `getCallData. Error while getting main location: ${err.stack || err}.`, 'warn', NAME );
                                return next( err );
                            }
                            if( !results || !results[0] ) {
                                Y.log( `initializeConference. Can not get main location entry of tenant: ${user.tenantId}`, 'error', NAME );
                                return next( new Y.doccirrus.commonerrors.DCError( 500, {message: `Can not get main location`} ) );
                            }
                            next( null, results[0] );
                        }
                    );
                },
                patients( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'patient',
                        action: 'get',
                        query: {
                            _id: { $in: patientsId }
                        },
                        callback: ( err, results ) => {
                            if( err ) {
                                Y.log( `getCallData. Error while getting patients: ${err.stack || err}.`, 'warn', NAME );
                                return next( err );
                            }
                            next( null, results );
                        }
                    } );
                }
            }, ( err, results )=>{
                if( err ) {
                    Y.log( `getCallData. Error: ${err.stack || err}.`, 'warn', NAME );
                }
                return callback( err, results );
            } );
        }

        /**
         * initializes conference
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Function} args.callback
         */
        function initializeConference( args ) {
            Y.log('Entering Y.doccirrus.api.conference.initializeConference', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.conference.initializeConference');
            }
            const
                { user, callback, data } = args;

            /**
             * 1. create callAudit for host and employee
             * 2. invite participants
             * 3. update conference entry => status to "INITIALIZED"
             */

            async.waterfall( [
                function( next ) {
                    // since we need PUC running for some steps in initializeConference process, here we check if PUC is available to
                    // prevent email sending, callaudit creation etc. in case if not
                    Y.doccirrus.communication.isPucOnline( function( status ) {
                        if( !status ) {
                            return next( new Y.doccirrus.commonerrors.DCError( 504, {message: 'PUC is offline'} ) );
                        }
                        next();
                    } );
                },
                function( next ) {
                    Y.log('initializeConference. getCallData is called', 'debug', NAME);
                    getCallData( {
                        user,
                        conferenceId: data._id,
                        employeesId: data.employees,
                        patientsId: data.patients
                    }, ( err, results ) => {
                        if( err ) {
                            Y.log( `initializeConference. Error while getting call data: ${err.stack || err}`, 'warn', NAME );
                        }
                        next( err, results );
                    } );
                },
                function( callData, next ) {
                    if( !(data.employees && data.employees.length) && !(callData.employees && callData.employees.length) ) {
                        Y.log(`initializeConference. There are no employees in conference ${data._id}.`, 'warn', NAME);
                    }

                    Y.doccirrus.api.conference.createCallAuditForConference( {
                        user,
                        data: Object.assign( {}, data, callData ),
                        callback( err ) {
                            if( err ) {
                                Y.log( `initializeConference. Error while creating call audit for conference: ${err.stack || err}`, 'warn', NAME );
                            }
                            next( err, callData && callData.schedule );
                        }
                    } );
                }
            ], ( err, results ) => {
                if( err ) {
                    Y.log( `initializeConference. Error: ${err.stack || err}`, 'warn', NAME );
                }
                return callback( err, results );
            } );
        }

        /**
         * Creates call audit entries, sends invitations, creates task
         * @method createCallAuditForConference
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {String} args.data.startDate
         * @param {Object} args.data.location
         * @param {String} args.data.location.name
         * @param {Object} args.data.practice
         * @param {String} args.data.prcId
         * @param {Array} args.data.employees
         * @param {Array} args.data.participants
         * @param {Array} args.data.patients
         * @param {Object} args.data.schedule
         * @param {String} [args.data.conferenceType=CONFERENCE]
         * @param {Function} args.callback
         */
        function createCallAuditForConference( args ) {
            Y.log('Entering Y.doccirrus.api.conference.createCallAuditForConference', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.conference.createCallAuditForConference');
            }
            const
                { user, callback, data } = args,
                { startDate, location: { name: locationName } = {}, practice, prcId, employees = [], participants, patients, schedule, conferenceType = Y.doccirrus.schemas.conference.conferenceTypes.CONFERENCE } = data,
                caller = employees && employees[ 0 ] || {},
                conferenceId = data._id.toString(),
                isForUnregistered = data.isForUnregistered || false,
                callAudit = {
                    identityId: caller.identityData && caller.identityData._id.toString(),
                    callId: conferenceId,
                    locationName,
                    employeeId: caller && caller._id && caller._id.toString(),
                    type: caller.type,
                    lastname: caller.lastname,
                    firstname: caller.firstname,
                    consultNote: patients.map( patient => {
                        return `${Y.doccirrus.schemas.person.personDisplay( patient )} [${moment( patient.dob ).format( TIMESTAMP_FORMAT )}]`;
                    } ).join( ', \n' ),
                    callee: [],
                    caller: [
                        Object.assign( {}, caller, {
                            tenantId: user.tenantId,
                            dcCustomerNo: practice.dcCustomerNo,
                            prcId,
                            locationName,
                            identityId: caller.identityData && caller.identityData._id.toString(),
                            host: Y.doccirrus.auth.getMyHost( user.tenantId ).toLowerCase()
                        } )
                    ],
                    picked: true,
                    tenantId: user.tenantId,
                    skipcheck_: true
                };
            let
                participantsForTask = [];
            if( 'CONFERENCE' === conferenceType ) {
                participantsForTask = participants;
                callAudit.callee = employees.filter( employee => employee !== caller ).map( employee => {
                    return Object.assign( {}, employee, {
                        dcCustomerNo: practice.dcCustomerNo,
                        prcId,
                        locationName,
                        identityId: employee.identityData && employee.identityData._id.toString(),
                        host: Y.doccirrus.auth.getMyHost( user.tenantId ).toLowerCase(),
                        tenantId: user.tenantId
                    } );
                } );
            }
            async.waterfall( [
                function( next ) {
                    /**
                     * 1. creates callAudit for host and employee
                     */
                    Y.log('createCallAuditForConference. callaudit is post', 'debug', NAME);
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'callaudit',
                        action: 'post',
                        data: callAudit,
                        callback: function( err ) {
                            if( err ) {
                                Y.log( `createCallAuditForConference. Could not create callaudit entry: ${JSON.stringify( err )}`, 'error', NAME );
                                return next( err );
                            }
                            next();
                        }
                    } );
                },
                function( next ) {
                    /**
                     * 2. invites participants by email
                     */
                    Y.log('createCallAuditForConference. inviteExternalParticipants is called', 'debug', NAME);
                    Y.doccirrus.api.telecommunication.inviteExternalParticipants( {
                        user,
                        data: {
                            participants,
                            conferenceId,
                            startDate,
                            isForUnregistered,
                            conferenceType: conferenceType
                        },
                        callback: ( err ) => {
                            if( err ) {
                                Y.log( `createCallAuditForConference. Error while inviting external participants: ${err.stack || err}`, 'warn', NAME );
                            }
                            next( err );
                        }
                    } );
                },
                function( next ) {
                    /**
                     * 3.1. Tasks for employees
                     */
                    Y.log('createCallAuditForConference. createTaskForConference for employees is called', 'debug', NAME);
                    async.eachSeries( employees, ( employee, done ) => {
                        createTaskForConference( {
                            user,
                            employee,
                            scheduleTypeName: schedule.scheduleTypeName,
                            conferenceData: {
                                conferenceId: data._id.toString(),
                                startDate,
                                employees,
                                participants: participantsForTask,
                                patients
                            }
                        }, done );
                    }, ( err ) => {
                        if( err ) {
                            Y.log( `createCallAuditForConference. Error while creating task about conference for employee: ${err.stack || err}`, 'warn', NAME );
                        }
                        next( err );
                    } );

                }, function( next ) {
                    /**
                     * 3.2. Tasks for role "Empfang"
                     */
                    Y.log('createCallAuditForConference. createTaskForConference for Empfang is called', 'debug', NAME);
                    createTaskForConference( {
                        user,
                        scheduleTypeName: schedule.scheduleTypeName,
                        conferenceData: {
                            conferenceId: data._id.toString(),
                            startDate,
                            employees,
                            participants: participantsForTask,
                            patients
                        }
                    }, ( err ) => {
                        if( err ) {
                            Y.log( `createCallAuditForConference. Error while creating task about conference for role "Empfang": ${err.stack || err}`, 'warn', NAME );
                        }
                        next( err );
                    } );
                }
            ], callback );

        }

        /**
         * Creates conference task for employee
         * @method createTaskForConference
         * @param {Object} params
         * @param {Object} params.user
         * @param {Object} [params.employee]
         * @param {String} params.scheduleTypeName
         * @param {Object} params.conferenceData
         * @param {String} params.conferenceData.startDate
         * @param {Array} params.conferenceData.employees array with employees objects
         * @param {Array} params.conferenceData.participants array with participants objects
         * @param {Array} params.conferenceData.patients array with patients objects
         * @param {String} params.conferenceData.conferenceId
         * @param {Function} callback
         */
        function createTaskForConference( params, callback ) {
            const
                { user, employee, scheduleTypeName, conferenceData: { startDate, employees, participants, patients, conferenceId } = {} } = params,
                patientsList = patients.map( patient => Y.doccirrus.schemas.person.personDisplay( patient ) ),
                participantsList = [].concat( employees.map( employee => Y.doccirrus.schemas.person.personDisplay( employee ) ), participants.map( item => item.email ) ),
                employeeId = employee && employee._id.toString(),
                taskData = {
                    allDay: false,
                    alertTime: moment( startDate ).toISOString(),
                    title: i18n( 'conference-api.text.CONFERENCE_TASK_TITLE', { data: { scheduleTypeName } } ),
                    urgency: 2,
                    details: i18n( 'conference-api.text.CONFERENCE_TASK_DETAILS', {
                        data: {
                            participants: participantsList.join( ', ' ),
                            patients: patientsList.join( ', ' )
                        }
                    } ),
                    group: false,
                    creatorName: "System",
                    conferenceId: conferenceId,
                    skipcheck_: true
                };
            if( employeeId ) {
                taskData.employeeId = employeeId;
                taskData.candidates = [ employeeId ];
                taskData.status = 'ASSIGNED';
            } else {
                taskData.roles = [ Y.doccirrus.schemas.role.DEFAULT_ROLE.EMPFANG ];
            }
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'task',
                action: 'post',
                data: taskData
            }, function( err ) {
                if( err ) {
                    Y.log( `createTaskForConference. Failed to create task: ${JSON.stringify( err )}`, 'error', NAME );
                    return callback( err );
                }
                callback();
            } );
        }

        /**
         * Gets conference and populated arrays (employeesObj, patientsObj)
         * @method getConferenceData
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Object} args.callback
         */
        function getConferenceData( args ) {
            Y.log('Entering Y.doccirrus.api.conference.getConferenceData', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.conference.getConferenceData');
            }
            const
                { query, user, callback } = args;
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'conference',
                        action: 'get',
                        query
                    }, ( err, results ) => {
                        if( err ) {
                            return next( err );
                        }
                        if( !results[ 0 ] ) {
                            return next( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Conference not found' } ) );
                        }
                        next( null, results[ 0 ] );
                    } );
                },
                function( conference, next ) {
                    if( conference.employees && conference.employees.length ) {
                        let
                            employees = conference.employees.map( item => item && item.toString() );
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'employee',
                            action: 'get',
                            query: {
                                _id: { $in: employees }
                            }
                        }, ( err, results ) => {
                            if( err ) {
                                return next( err );
                            }
                            conference.employeesObj = results.sort( ( itemA, itemB ) => employees.indexOf( itemA._id.toString() ) > employees.indexOf( itemB._id.toString() ) ? 1 : -1 );
                            next( null, conference );
                        } );
                    } else {
                        setImmediate( next, null, conference );
                    }
                },
                function( conference, next ) {
                    if( conference.patients && conference.patients.length ) {
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'patient',
                            action: 'get',
                            query: {
                                _id: { $in: conference.patients }
                            }
                        }, ( err, results ) => {
                            if( err ) {
                                return next( err );
                            }
                            conference.patientsObj = results;
                            next( null, conference );
                        } );
                    } else {
                        setImmediate( next, null, conference );
                    }
                }

            ], callback );
        }

        /**
         * Deletes conference
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Object} args.options
         * @param {Function} args.callback
         */
        function deleteConference( args ) {
            const
                { user, query, options, callback } = args;
            Y.doccirrus.mongodb.runDb( {
                action: 'delete',
                model: 'conference',
                user: user,
                query: query,
                options: options
            }, callback );
        }

        /**
         * Cancels conference - excludes all participants.
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Object} args.data._id conference id
         * @param {Array} args.data.participants list of participants (from conference entry)
         * @param {Array} args.data.employees list of employees ids (from conference entry)
         * @param {String} args.data.startDate conference entry "startDate"
         * @param {String} [args.data.conference.conferenceType=CONFERENCE]
         * @param {Function} args.callback
         *
         * @return {Function} callback
         */
        function cancelConference( args ) {
            Y.log('Entering Y.doccirrus.api.conference.cancelConference', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.conference.cancelConference');
            }
            const
                { user, data: { _id: conferenceId, startDate, participants, employees, conferenceType = Y.doccirrus.schemas.conference.conferenceTypes.CONFERENCE, isForUnregistered } = {}, callback } = args;

            if( !conferenceId ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'conferenceId is missing' } ) );
            }
            async.waterfall( [

                function( next ) {
                    Y.doccirrus.api.conference.excludeEmployees( {
                        user,
                        data: {
                            conferenceId,
                            employeesId: employees,
                            doNotUpdatePUC: true
                        },
                        options: {
                            removeAllTasks: true
                        },
                        callback: next
                    } );
                },
                function( next ) {
                    if( participants && participants.length ) {
                        Y.doccirrus.api.telecommunication.cancelEmailInvitations( {
                            user,
                            data: {
                                participants,
                                conference: {
                                    startDate: startDate,
                                    isForUnregistered: isForUnregistered,
                                    conferenceId,
                                    conferenceType
                                },
                                doNotUpdatePUC: true
                            },
                            callback( err ) {
                                next( err );
                            }
                        } );
                    } else {
                        setImmediate( next );
                    }
                },
                function( next ) {
                    Y.doccirrus.api.telecommunication.cancelConferenceCallAudit( {
                        user,
                        data: {
                            callId: conferenceId
                        },
                        callback: next
                    } );
                }
            ], err => callback( err ) );
        }

        /**
         * Excludes employees - all task about this conference is removed for this employee,
         *  exclude employees from call audit.
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Array} [args.data.employeesId] employees ids
         * @param {String} args.data.conferenceId
         * @param {Object} [args.options]
         * @param {Boolean} [args.options.removeAllTasks=false]
         * @param {Boolean} [args.data.doNotUpdatePUC=false] if set to true, PUC call audit WON'T be updated
         * @param {Function} args.callback
         */
        function excludeEmployees( args ) {
            Y.log('Entering Y.doccirrus.api.conference.excludeEmployees', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.conference.excludeEmployees');
            }
            const
                { user, data: { doNotUpdatePUC = false, employeesId = [], conferenceId } = {}, options: { removeAllTasks = false } = {}, callback } = args;
            async.waterfall( [
                function( next ) {
                    let
                        _query = {
                            conferenceId
                        };
                    if( !removeAllTasks ) {
                        _query.candidates = { $in: employeesId };
                    }
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'task',
                        action: 'delete',
                        query: _query,
                        options: {
                            override: true
                        }
                    }, err => next( err ) );
                },
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'identity',
                        action: 'get',
                        query: {
                            specifiedBy: {
                                $in: employeesId
                            }
                        }
                    }, next );
                },
                function( identities, next ) {
                    Y.doccirrus.api.telecommunication.excludeParticipantsFromCallAudit( {
                        user,
                        data: {
                            doNotUpdatePUC,
                            conferenceId,
                            participants: identities.map( item => ({ identityId: item._id.toString() }) )
                        },
                        callback: next
                    } );
                }
            ], err => callback( err ) );
        }

        /**
         * Adds tasks for employees, includes them into call audit
         * @method addEmployeesToConference
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Array} [args.data.employeesId] array of employees id
         * @param {Object} args.data.conference conference obj
         * @param {Boolean} [args.data.doNotUpdatePUC=false] if set to true, PUC call audit WON'T be updated
         * @param {Function} args.callback
         */
        function addEmployeesToConference( args ) {
            Y.log('Entering Y.doccirrus.api.conference.addEmployeesToConference', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.conference.addEmployeesToConference');
            }
            const
                { user, data: { doNotUpdatePUC = false, employeesId = [], conference } = {}, callback } = args;

            async.waterfall( [
                function( next ) {
                    getCallData( {
                        user,
                        conferenceId: conference._id,
                        employeesId: conference.employees,
                        patientsId: conference.patients
                    }, next );
                },
                function( additionalData, next ) {
                    let
                        participantsForTask = conference.participants;
                    if( conference && Y.doccirrus.schemas.conference.conferenceTypes.ONLINE_CONSULTATION === conference.conferenceType ) {
                        participantsForTask = [];
                    }
                    async.eachSeries( employeesId, ( employee, done ) => {
                        createTaskForConference( {
                            user,
                            employee: { _id: employee },
                            scheduleTypeName: additionalData.schedule.scheduleTypeName,
                            conferenceData: {
                                conferenceId: conference._id.toString(),
                                startDate: conference.startDate,
                                employees: additionalData.employees,
                                participants: participantsForTask,
                                patients: additionalData.patients
                            }
                        }, done );
                    }, err => next( err, additionalData ) );
                },
                function( additionalData, next ) {
                    Y.doccirrus.api.telecommunication.addParticipantsToCallAudit( {
                        user,
                        data: {
                            doNotUpdatePUC,
                            conferenceId: conference._id,
                            participants: additionalData.employees.filter( item => employeesId.includes( item._id.toString() ) ).map( employee => {
                                return Object.assign( {}, employee, {
                                    dcCustomerNo: additionalData.practice.dcCustomerNo,
                                    prcId: additionalData.prcId,
                                    locationName: additionalData.location.name,
                                    identityId: employee.identityData && employee.identityData._id.toString(),
                                    host: Y.doccirrus.auth.getMyHost( user.tenantId ).toLowerCase(),
                                    tenantId: user.tenantId
                                } );
                            } )
                        },
                        callback: next
                    } );
                }
            ], err => callback( err ) );

        }

        /**
         * Handles employees list changes
         * @method updateEmployees
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Array} args.data.addedEmployees list of added employees to conference entry
         * @param {Array} args.data.deletedEmployees list of deleted employees from conference entry
         * @param {Object} args.data.conference conference object
         * @param {String} args.data.callerId current callerId
         * @param {Function} args.callback
         */
        function updateEmployees( args ) {
            Y.log('Entering Y.doccirrus.api.conference.updateEmployees', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.conference.updateEmployees');
            }
            const
                { user, data: { addedEmployees = [], deletedEmployees = [], conference, callerId } = {}, callback } = args,
                conferenceId = conference._id;
            async.waterfall( [
                function( next ) {
                    if( deletedEmployees.length ) {
                        Y.doccirrus.api.conference.excludeEmployees( {
                            user,
                            data: {
                                conferenceId,
                                employeesId: deletedEmployees,
                                callerId,
                                doNotUpdatePUC: Boolean( callerId || addedEmployees.length )
                            },
                            callback: next
                        } );
                        return;
                    }
                    setImmediate( next );
                },
                function( next ) {
                    if( addedEmployees.length ) {
                        Y.doccirrus.api.conference.addEmployeesToConference( {
                            user,
                            data: {
                                conference,
                                employeesId: addedEmployees,
                                callerId,
                                doNotUpdatePUC: Boolean( callerId )
                            },
                            callback: next
                        } );
                        return;
                    }
                    setImmediate( next );
                },
                function( next ) {
                    if( callerId ) {
                        Y.doccirrus.api.telecommunication.updateCaller( {
                            user,
                            data: {
                                conferenceId,
                                callerId
                            },
                            callback: next
                        } );
                    } else {
                        setImmediate( next );
                    }
                }
            ], err => callback( err ) );
        }

        /**
         * Handles participants list changes
         * @method sendNotificationsToParticipants
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Array} args.data.participants
         * @param {String} args.data.startDate
         * @param {String} args.data.conferenceType
         * @param {Function} args.callback
         */
        function notifyParticipants( args ) {
            Y.log('Entering Y.doccirrus.api.conference.notifyParticipants', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.conference.notifyParticipants');
            }
            const
                { data: { participants = [], startDate, conferenceType } = {}, callback, user } = args;

            async.waterfall( [
                function ( next ) {
                    async.eachSeries( participants, ( participant, done ) => {
                        Y.doccirrus.api.conference.notifyParticipant( {
                            data: {
                                participant,
                                startDate,
                                conferenceType
                            },
                            user,
                            callback: done
                        } );
                    }, next );
                }
            ], callback );
        }

        /**
         * @method notifyParticipant
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Object} args.data.participant
         * @param {String} args.data.startDate
         * @param {String} [args.data.conference.type=CONFERENCE]
         * @param {Function} args.callback
         *
         * @return {Function} callback
         */
        function notifyParticipant( args ) {
            Y.log('Entering Y.doccirrus.api.conference.notifyParticipant', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.conference.notifyParticipant');
            }
            const
                { data: { participant = {}, startDate, conferenceType = Y.doccirrus.schemas.conference.conferenceTypes.CONFERENCE } = {}, callback, user } = args,
                moment = require( 'moment' ),
                email = participant.email,
                TIME_FORMAT = i18n( 'general.TIME_FORMAT' ),
                eventType = i18n( `telecommunicaiton-api.title.${conferenceType}` ),
                subject = i18n( 'telecommunicaiton-api.notificationEmail.SUBJECT', { data: { eventType } } ),
                BODY_CONTENT = i18n( 'telecommunicaiton-api.notificationEmail.BODY_CONTENT', {
                    data: {
                        time: moment( startDate ).format( TIME_FORMAT ),
                        date: moment( startDate ).format( TIMESTAMP_FORMAT ),
                        eventType
                    }
                } ),
                BODY_COMPLIMENTARY_CLOSE = i18n( 'telecommunicaiton-api.notificationEmail.BODY_COMPLIMENTARY_CLOSE' ),
                BODY_DC_SIGNATURE = i18n( 'IntouchPrivateMojit.general.DOCCIRRUS_SIGN' );
            let
                BODY_GREETING,
                emailContent = '',
                jadeParams = {},
                emailMessage;

            if( !email ) {
                Y.log( `notifyParticipant error: email is missing`, 'error', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'email is missing' } ) );
            }

            // start: Adding the greeting

            switch (true) {
                case 'MR' === participant.talk:
                    BODY_GREETING = i18n( 'telecommunicaiton-api.notificationEmail.BODY_GREETING_MR' );
                    break;
                case 'MS' === participant.talk:
                    BODY_GREETING = i18n( 'telecommunicaiton-api.notificationEmail.BODY_GREETING_MS' );
                    break;
                default:
                    BODY_GREETING = i18n( 'telecommunicaiton-api.notificationEmail.BODY_GREETING' );
            }


            emailContent += `${BODY_GREETING}`;

            if ( participant.firstname ) {
                emailContent += ` ${participant.firstname}`;

                if ( participant.lastname ) {
                    emailContent += ` ${participant.lastname}`;
                }
            }

            emailContent +=  `, <br/><br/>`;

            // end: Adding the greeting

            emailContent += `${BODY_CONTENT}<br/><br/>${BODY_COMPLIMENTARY_CLOSE}`;

            emailContent = emailContent.replace( /\r\n/g, '<br/>' ).replace( /\n|\r/g, '<br/>' );

            jadeParams.text = emailContent;

            jadeParams.docCirrusSign = BODY_DC_SIGNATURE;

            Y.log( `notifyParticipant: sending email with following content: 
                to: ${email}
                subject: ${subject}
                content: ${jadeParams.text}
            `, 'info', NAME );

            emailMessage = Y.doccirrus.email.createHtmlEmailMessage( {
                serviceName: 'conferenceService',
                to: email,
                subject: subject,
                jadeParams: jadeParams,
                jadePath: './mojits/IntouchPrivateMojit/views/inviteparticipantemail.jade.html',
                cc: participant.copyEmailCreate
            } );

            Y.doccirrus.email.sendEmail( { ...emailMessage, user }, err => callback( err ) );
        }

        /**
         * Updates patients list in call audit notes.
         * @method updatePatientList
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {String} args.data.conferenceId
         * @param {Array} args.data.patients
         * @param {Function} args.callback
         *
         * @return {Function} callback
         */
        function updatePatientList( args ) {
            Y.log('Entering Y.doccirrus.api.conference.updatePatientList', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.conference.updatePatientList');
            }
            const
                { user, data: { conferenceId, patients } = {}, callback } = args;
            if( !conferenceId ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'conferenceId is missing' } ) );
            }
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'callaudit',
                        action: 'get',
                        query: {
                            callId: conferenceId
                        }
                    }, ( err, results ) => {
                        if( err ) {
                            return next( err );
                        }
                        if( !results || !results[ 0 ] ) {
                            Y.log( `updatePatientList. Call audit entry not found for conference: ${conferenceId.toString()}, tenant: ${user.tenantId}`, 'error', NAME );
                            return next( new Y.doccirrus.commonerrors.DCError( 400, { message: `Call audit entry not found for conference: ${conferenceId.toString()}` } ) );
                        }
                        next( null, results[ 0 ] );
                    } );
                },
                function( callAudit, next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'patient',
                        action: 'get',
                        query: {
                            _id: { $in: patients }
                        },
                        options: {
                            select: {
                                firstname: 1,
                                lastname: 1,
                                dob: 1
                            }
                        }
                    }, ( err, results ) => {
                        if( err ) {
                            return next( err );
                        }
                        callAudit.consultNote = results.map( patient => {
                            return `${Y.doccirrus.schemas.person.personDisplay( patient )} [${moment( patient.dob ).format( TIMESTAMP_FORMAT )}]`;
                        } ).join( ', \n' );
                        next( null, callAudit );
                    } );
                },
                function( callAudit, next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'callaudit',
                        action: 'put',
                        query: {
                            _id: callAudit._id
                        },
                        fields: [ 'consultNote' ],
                        data: {
                            skipcheck_: true,
                            consultNote: callAudit.consultNote
                        }

                    }, err => next( err ) );
                },
                function( next ) {
                    Y.doccirrus.api.telecommunication.upsertCallAuditOnPUC( {
                        user,
                        data: {
                            callId: conferenceId
                        },
                        callback: next
                    } );
                }

            ], callback );

        }

        /**
         * Send an email with video_consultation appointment confirmation link to a patient
         * - gets current practice' dcCustomerNo
         * - create an email content
         * - send an email
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Object} args.data.participant - patient that participate in appointment
         * @param {String} args.data.scheduleId - id of appointment
         * @param {String} args.data.startDate - start of appointment
         * @param {Function} args.callback
         * @returns {Promise<*>}
         */
        async function sendVCConfirmationEmail( args ) {
            Y.log( 'Entering Y.doccirrus.api.conference.sendVCConfirmationEmail', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.conference.sendVCConfirmationEmail' );
            }
            const
                {data: {participant = {}, scheduleId, startDate} = {}, callback, user} = args,
                email = participant.email,
                TIME_FORMAT = i18n( 'general.TIME_FORMAT' ),
                eventType = i18n( 'conference-api.vc_confirm_email.SUBJECT_EVENTTYPE' ),
                subject = i18n( 'telecommunicaiton-api.notificationEmail.SUBJECT', {data: {eventType}} ),
                BODY_COMPLIMENTARY_CLOSE = i18n( 'telecommunicaiton-api.notificationEmail.BODY_COMPLIMENTARY_CLOSE' ),
                BODY_DC_SIGNATURE = i18n( 'IntouchPrivateMojit.general.DOCCIRRUS_SIGN' );

            let
                BODY_GREETING,
                emailContent = '',
                jadeParams = {},
                emailMessage,
                err, dcCustomerNo,
                BODY_CONTENT;

            if( !email ) {
                Y.log( `sendVCConfirmationEmail error: email is missing`, 'error', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 400, {message: 'email is missing'} ) );
            }

            [err, dcCustomerNo] = await formatPromiseResult(
                Y.doccirrus.api.practice.getDCCustomerNo( user )
            );
            if( err ) {
                Y.log( `sendVCConfirmationEmail: Error getting dcCustomerNo: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            // start: Adding the greeting

            switch (true) {
                case 'MR' === participant.talk:
                    BODY_GREETING = i18n( 'telecommunicaiton-api.notificationEmail.BODY_GREETING_MR' );
                    break;
                case 'MS' === participant.talk:
                    BODY_GREETING = i18n( 'telecommunicaiton-api.notificationEmail.BODY_GREETING_MS' );
                    break;
                default:
                    BODY_GREETING = i18n( 'telecommunicaiton-api.notificationEmail.BODY_GREETING' );
            }


            emailContent += `${BODY_GREETING}`;

            if ( participant.firstname ) {
                emailContent += ` ${participant.firstname}`;

                if ( participant.lastname ) {
                    emailContent += ` ${participant.lastname}`;
                }
            }

            emailContent +=  `, <br/><br/>`;

            // end: Adding the greeting


            BODY_CONTENT = i18n( 'conference-api.vc_confirm_email.BODY_CONTENT', {
                data: {
                    time: moment( startDate ).format( TIME_FORMAT ),
                    date: moment( startDate ).format( TIMESTAMP_FORMAT ),
                    confirmUrl: `${Y.doccirrus.auth.getPUCUrl( '/inconference/confirmVC?prac=' )}${dcCustomerNo}&schedule=${scheduleId}`
                }
            } );

            emailContent += `${BODY_CONTENT}<br/><br/>${BODY_COMPLIMENTARY_CLOSE}`;

            emailContent = emailContent.replace( /\r\n/g, '<br/>' ).replace( /\n|\r/g, '<br/>' );

            jadeParams.text = emailContent;

            jadeParams.docCirrusSign = BODY_DC_SIGNATURE;

            Y.log( `sendVCConfirmationEmail: sending email with following content: 
                to: ${email}
                subject: ${subject}
                content: ${jadeParams.text}
            `, 'info', NAME );

            emailMessage = Y.doccirrus.email.createHtmlEmailMessage( {
                serviceName: 'conferenceService',
                to: email,
                subject: subject,
                jadeParams: jadeParams,
                jadePath: './mojits/IntouchPrivateMojit/views/inviteparticipantemail.jade.html',
                cc: participant.copyEmailCreate
            } );

            [err] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.email.sendEmail( {...emailMessage, user}, err => {
                        if( err ) {
                            reject( err );
                        }
                        resolve();
                    } );
                } )
            );
            if( err ) {
                Y.log( `sendVCConfirmationEmail: Error while sending email: ${err.stack || err}`, 'warn', NAME );
                return callback( err );
            }
            return callback();
        }

        /**
         * Cleans up entries created with request for VC from PP
         * - get UNCONFIRMED conferences
         * - if conference' time of creation (timestamp) is 'older' than AMOUNT_OF_MINUTES_SCHEDULE_CAN_BE_CONFIRMED
         * -- delete that conference
         * -- delete schedule by conferenceId
         * -- delete patient by conference.patients
         * -- delete task by patientId
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Function} args.callback
         * @returns {Promise<Object|*>}
         */
        async function cleanUnconfirmedConsultations( args ) {
            Y.log( 'Entering Y.doccirrus.api.conference.cleanUnconfirmedConsultations', 'debug', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.conference.cleanUnconfirmedConsultations', 'debug' );
            }
            const
                {user, callback} = args,
                now = moment();

            let
                err, conferences;

            [err, conferences] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'conference',
                    action: 'get',
                    query: {
                        status: Y.doccirrus.schemas.conference.conferenceStatuses.UNCONFIRMED
                    }
                } )
            );
            if( err ) {
                Y.log( `cleanUnconfirmedConsultations: Error while getting UNCONFIRMED conferences: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, undefined, callback );
            }
            for( let conference of conferences ) {
                let conferenceCreatedAt = ObjectId( conference._id ).getTimestamp();
                if( AMOUNT_OF_MINUTES_SCHEDULE_CAN_BE_CONFIRMED < now.diff( conferenceCreatedAt, 'minutes' ) ) {
                    // clean up this conference and connected schedule and patient (and task about schedule from patient)
                    [err] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'conference',
                            action: 'delete',
                            query: {
                                _id: conference._id
                            }
                        } )
                    );
                    if( err ) {
                        Y.log( `cleanUnconfirmedConsultations: Error while deleting conference ${conference._id}: ${err.stack || err}`, 'error', NAME );
                    }
                    [err] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'schedule',
                            action: 'delete',
                            query: {
                                conferenceId: conference._id
                            }
                        } )
                    );
                    if( err ) {
                        Y.log( `cleanUnconfirmedConsultations: Error while deleting schedule for conference ${conference._id}: ${err.stack || err}`, 'error', NAME );
                    }
                    if( conference.patients && conference.patients[0] ) {
                        [err] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'patient',
                                action: 'delete',
                                query: {
                                    _id: conference.patients[0],
                                    isStub: true
                                }
                            } )
                        );
                        if( err ) {
                            Y.log( `cleanUnconfirmedConsultations: Error while deleting patient ${conference.patients[0]} for conference ${conference._id}: ${err.stack || err}`, 'error', NAME );
                        }
                        [err] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'task',
                                action: 'delete',
                                query: {
                                    patientId: conference.patients[0]
                                }
                            } )
                        );
                        if( err ) {
                            Y.log( `cleanUnconfirmedConsultations: Error while deleting task with patient ${conference.patients[0]} for conference ${conference._id}: ${err.stack || err}`, 'error', NAME );
                        }
                    }
                }
            }
            return handleResult( undefined, undefined, callback );
        }

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        /**
         * @class conference
         * @namespace doccirrus.api
         */
        Y.namespace( 'doccirrus.api' ).conference = {

            name: NAME,

            createOnlineConference,
            updateOnlineConference,
            initializeConferences,
            initializeConference,
            createCallAuditForConference,
            getConferenceData,
            excludeEmployees,
            'delete': deleteConference,
            addEmployeesToConference,
            cancelConference,
            updateEmployees,
            notifyParticipant,
            notifyParticipants,
            updatePatientList,
            sendVCConfirmationEmail,
            cleanUnconfirmedConsultations

        };

    },
    '0.0.1', { requires: [ 'conference-schema', 'dccommonerrors' ] }
);
