/*global YUI*/


YUI.add( 'schedule-api', function( Y, NAME ) {

        const
            {formatPromiseResult, promisifyArgsCallback, handleResult} = require( 'dc-core' ).utils;

        /**
         * Checks fields from passed object to validity due to their names
         *
         * @param {Object} data - data to validate
         * @returns {Array} - returns an array of non-valid fields
         */
        function validateScheduleFields( data ) {
            let paramDate = ['start', 'end'],
                paramBoolean = ['isReadOnly'],
                paramNumber = ['scheduled', 'duration'],
                paramObjectId = ['patient', 'calendar', 'scheduletype'],
                keys = Object.keys( data ),
                errors = [];

            for( let key of keys ) {
                if( paramDate.includes( key ) ) {
                    if( !Y.doccirrus.validations.common._date( data[key] ) ) {
                        errors.push( key );
                    }
                }
                if( paramBoolean.includes( key ) ) {
                    if( !(['true', 'false'].includes( data[key] )) ) {
                        errors.push( key );
                    }
                }
                if( paramNumber.includes( key ) ) {
                    if( !Y.doccirrus.validations.common._num( data[key] ) ) {
                        errors.push( key );
                    }
                }
                if( paramObjectId.includes( key ) ) {
                    if( !Y.doccirrus.comctl.isObjectId( data[key] ) ) {
                        errors.push( key );
                    }
                }
            }

            return errors;
        }

        /**
         * Handles POST call of schedule API
         * - validate passed data
         * - check if all required fields are present
         * - check if calendar, scheduletype, patient records exists in the db
         * - create schedule based on scheduletype
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data - data to post
         * @param {Function} args.callback
         * @returns {Promise<*>}
         */
        async function postSchedule( args ) {
            const {user, data = {}, callback} = args,
                createOnlineConferenceP = promisifyArgsCallback( Y.doccirrus.api.conference.createOnlineConference ),
                ONLINE_CONSULTATION = Y.doccirrus.schemas.scheduletype.appointmentTypes.ONLINE_CONSULTATION,
                CONFERENCE = Y.doccirrus.schemas.scheduletype.appointmentTypes.CONFERENCE,
                STANDARD = Y.doccirrus.schemas.scheduletype.appointmentTypes.STANDARD,
                STATUS_NEW = Y.doccirrus.schemas.conference.conferenceStatuses.NEW,
                dataErrors = validateScheduleFields( data );

            let
                err, postResult, calendar, scheduletype, patient, patientEmail,
                conference, schedule;

            if( dataErrors.length ) {
                return handleResult( new Y.doccirrus.commonerrors.DCError( 'schedule_01', {data: {$fields: dataErrors.join( ', ' )}} ), undefined, callback );
            }

            if( !data.start || !data.calendar ) {
                return handleResult( new Y.doccirrus.commonerrors.DCError( 'schedule_02' ), undefined, callback );
            }

            //get calendar from data
            [err, calendar] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    action: 'get',
                    model: 'calendar',
                    user,
                    query: {_id: data.calendar}
                } )
            );
            if( err ) {
                Y.log( `postSchedule: Error while getting calendar ${data.calendar}: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }
            if( !calendar || !calendar[0] ) {
                Y.log( `postSchedule: Could not post schedule. Calendar with id ${data.calendar} is not found.`, 'warn', NAME );
                return handleResult( new Y.doccirrus.commonerrors.DCError( 'schedule_03' ), undefined, callback );
            }
            calendar = calendar[0];

            if( data.patient ) {
                //get patient from data
                [err, patient] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        action: 'get',
                        model: 'patient',
                        user,
                        query: {_id: data.patient}
                    } )
                );
                if( err ) {
                    Y.log( `postSchedule: Error while getting patient ${data.patient}: ${err.stack || err}`, 'warn', NAME );
                    return handleResult( err, undefined, callback );
                }
                if( !patient || !patient[0] ) {
                    Y.log( `postSchedule: Could not post schedule. Patient with id ${data.patient} is not found.`, 'warn', NAME );
                    return handleResult( new Y.doccirrus.commonerrors.DCError( 'schedule_04' ), undefined, callback );
                }
                patient = patient[0];
            }

            if( data.scheduletype ) {
                let patientIdAsStr;

                //get scheduletype from data to define it's type
                [err, scheduletype] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        action: 'get',
                        model: 'scheduletype',
                        user,
                        query: {_id: data.scheduletype}
                    } )
                );
                if( err ) {
                    Y.log( `postSchedule: Error while getting scheduletype ${data.scheduletype}: ${err.stack || err}`, 'warn', NAME );
                    return handleResult( err, undefined, callback );
                }
                if( !scheduletype || !scheduletype[0] ) {
                    Y.log( `postSchedule: Could not post schedule. Scheduletype with id ${data.scheduletype} is not found.`, 'warn', NAME );
                    return handleResult( new Y.doccirrus.commonerrors.DCError( 'schedule_05' ), undefined, callback );
                }
                scheduletype = scheduletype[0];

                //check if this calendar is in calendarRefs of this scheduletype
                if( !(scheduletype.calendarRefs || []).some( item => item.calendarId === data.calendar ) ) {
                    Y.log( `postSchedule: Could not post schedule. Calendar ${data.calendar} is not present in scheduletype ${data.scheduletype} calendarRefs.`, 'warn', NAME );
                    return handleResult( new Y.doccirrus.commonerrors.DCError( 'schedule_06' ), undefined, callback );
                }

                switch( scheduletype.type ) {
                    case ONLINE_CONSULTATION:
                        //check if patient is present
                        if( !patient ) {
                            Y.log( `postSchedule: Could not post schedule with ${ONLINE_CONSULTATION} scheduletype without patient.`, 'warn', NAME );
                            return handleResult( new Y.doccirrus.commonerrors.DCError( 'schedule_07' ), undefined, callback );
                        }
                        // check if desired patient have an email since it's required for ONLINE_CONSULTATION
                        patientEmail = Y.doccirrus.schemas.simpleperson.getEmail( patient.communications || [] );

                        if( !patientEmail ) {
                            Y.log( `postSchedule: Could not post schedule with ${ONLINE_CONSULTATION} scheduletype for patient ${data.patient} without email.`, 'warn', NAME );
                            return handleResult( new Y.doccirrus.commonerrors.DCError( 'schedule_08' ), undefined, callback );
                        }

                        // check if desired calendar has an employee assigned since it's required for ONLINE_CONSULTATION
                        if( !calendar.employee ) {
                            Y.log( `postSchedule: Could not post schedule. Calendar ${data.calendar} does not have an employee assigned.`, 'warn', NAME );
                            return handleResult( new Y.doccirrus.commonerrors.DCError( 'schedule_09' ), undefined, callback );
                        }

                        patientIdAsStr = patient._id.toString();
                        conference = {
                            participants:
                                [
                                    {
                                        firstname: patient.firstname,
                                        lastname: patient.lastname,
                                        email: patientEmail.value,
                                        talk: patient.talk
                                    }],
                            employees: [calendar.employee],
                            patients: [patient._id],
                            startDate: data.start,
                            status: STATUS_NEW,
                            conferenceType: ONLINE_CONSULTATION
                        };

                        data.patient = patientIdAsStr;

                        schedule = {...data};

                        [err, postResult] = await formatPromiseResult(
                            createOnlineConferenceP( {
                                user,
                                data: {
                                    schedule,
                                    conference
                                }
                            } )
                        );
                        if( err ) {
                            Y.log( `postSchedule: Error while creating online consultation: ${err.stack || err}`, 'error', NAME );
                            return handleResult( err, undefined, callback );
                        }
                        break;
                    case CONFERENCE:
                        //check if patient is present
                        if( !patient ) {
                            Y.log( `postSchedule: Could not post schedule with ${CONFERENCE} scheduletype without patient.`, 'warn', NAME );
                            return handleResult( new Y.doccirrus.commonerrors.DCError( 'schedule_07' ), undefined, callback );
                        }

                        // check if desired calendar has an employee assigned since it's required for CONFERENCE
                        if( !calendar.employee ) {
                            Y.log( `postSchedule: Could not post schedule. Calendar ${data.calendar} does not have an employee assigned.`, 'warn', NAME );
                            return handleResult( new Y.doccirrus.commonerrors.DCError( 'schedule_09' ), undefined, callback );
                        }

                        conference = {
                            participants: [],
                            employees: [calendar.employee],
                            patients: [patient._id],
                            startDate: data.start,
                            status: STATUS_NEW,
                            conferenceType: CONFERENCE
                        };

                        delete data.patient;

                        schedule = {...data};

                        [err, postResult] = await formatPromiseResult(
                            createOnlineConferenceP( {
                                user,
                                data: {
                                    schedule,
                                    conference
                                }
                            } )
                        );
                        if( err ) {
                            Y.log( `postSchedule: Error while creating online conference: ${err.stack || err}`, 'error', NAME );
                            return handleResult( err, undefined, callback );
                        }
                        break;
                    case STANDARD:
                        [err, postResult] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                action: 'post',
                                model: 'schedule',
                                user,
                                data: Y.doccirrus.filters.cleanDbObject( data )
                            } )
                        );
                        if( err ) {
                            Y.log( `postSchedule: Error while creating schedule: ${err.stack || err}`, 'warn', NAME );
                            return handleResult( err, undefined, callback );
                        }
                        break;
                }
            } else {
                // for other schedules without scheduletype - closeTime, Infocalendar entries etc.
                [err, postResult] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        action: 'post',
                        model: 'schedule',
                        user,
                        data: Y.doccirrus.filters.cleanDbObject( data )
                    } )
                );
                if( err ) {
                    Y.log( `postSchedule: Error while creating schedule: ${err.stack || err}`, 'warn', NAME );
                    return handleResult( err, undefined, callback );
                }
            }

            return handleResult( null, postResult, callback );
        }

        /**
         *
         * @class schedule
         * @type {{name: *}}
         */
        Y.namespace( 'doccirrus.api' ).schedule = {

            name: NAME,
            get: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.schedule.get', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.schedule.get' );
                }
                let
                    {user, model = 'schedule', query = {}, options, callback} = args,
                    queryErrors = validateScheduleFields( query );

                if( queryErrors.length ) {
                    return callback( new Y.doccirrus.commonerrors.DCError( 'schedule_01', {data: {$fields: queryErrors.join( ', ' )}} ) );
                }

                Y.doccirrus.mongodb.runDb( {
                    action: 'get',
                    model,
                    user,
                    query,
                    options
                }, callback );

            },
            post: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.schedule.post', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.schedule.post' );
                }
                postSchedule( args );
            }
        };
    },
    '0.0.1', {
        requires: [
            'oop',
            'dc-comctl',
            'dcerror'
        ]
    }
);