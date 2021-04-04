/**
 * User: ma
 * Date: 15/07/2014  13:25
 * (c) 2014, Doc Cirrus GmbH, Berlin
 */
/*global YUI*/


YUI.add( 'calevent-api', function( Y, NAME ) {
        const
            moment = require( 'moment' ),
            lodash = require('lodash'),
            promisify = require('util').promisify,
            ObjectId = require( 'mongoose' ).Types.ObjectId,
            getSchedulerProm = promisify( Y.doccirrus.scheduling.getScheduler ),
            i18n = Y.doccirrus.i18n,
            {formatPromiseResult, promisifyArgsCallback, handleResult} = require( 'dc-core' ).utils,
            i18response_ERR_deleted_h = 'Ungültige Angaben',
            i18response_ERR_deleted_s = 'Bitte überprüfen Sie Ihre Angaben.',
            i18response_ERR_critical_h = 'Fehler beim Laden',
            i18response_ERR_critical_s = 'Anzahl der Termineinträge zu Ihrer Suche ist größer als 1',
            AMOUNT_OF_MINUTES_SCHEDULE_CAN_BE_CONFIRMED = 15,
            { logEnter, logExit } = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME),
            RRule = require( 'rrule' ).RRule;


        /**
         * return fields from originalData that have different values in newData (i.e JSON diff)
         * @param {Array}           originalData
         * @param {Array}           newData
         * @returns {Array}
         */
        function getChangedFields( originalData, newData ) {
            var
                changes = [],
                keys = Object.keys( originalData ).concat( Object.keys( newData ) ),
                lv, rv,
                irrelevantFields = {}, // fields that should be ignored
                str;

            // remove duplicates
            keys = keys.sort();
            keys = keys.filter( function( k ) {
                if( str === k ) {
                    return false;
                }
                str = k;
                return true;
            } );

            // add more to this blacklist
            irrelevantFields._id = true;
            irrelevantFields.virtual = true;
            irrelevantFields.title = true; // because title cannot be change directly by user
            irrelevantFields.scheduled = true; // because title cannot be change directly by user
            irrelevantFields.scheduleId = true; // because title cannot be change directly by user
            irrelevantFields.__v = true;
            originalData = originalData && JSON.parse( JSON.stringify( originalData ) );

            keys.forEach( function( fName ) {
                if( !irrelevantFields.hasOwnProperty( fName ) ) {
                    lv = originalData[fName];
                    rv = newData[fName];
                    // equalize value types
                    if( lv ) {
                        lv = lv.toJSON ? lv.toJSON() : lv.toString().trim();
                    }
                    if( rv ) {
                        rv = rv.toJSON ? rv.toJSON() : rv.toString().trim();
                    }
                    if( lv !== rv ) {
                        changes.push( fName );
                    }
                }
            } );
            return changes;
        }

        async function getUnassignedResources( user, resourceTypes, cb ) {
            let err, unAssignedResources;

            [err, unAssignedResources] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb({
                    user,
                    model: 'resource',
                    action: 'aggregate',
                    pipeline: [
                        {$match: {type:{$in: resourceTypes}}},
                        {$group: {"_id": "$type", "resource": {$addToSet: '$_id'}}}
                    ]
                })
            );

            if( err ) {
                Y.log( `calculateSchedule. Error while getting unassigned resources of types: ${resourceTypes}. Error: ${err.stack || err}`, 'warn', NAME );
                return cb( err );
            }

            if( !unAssignedResources || !unAssignedResources.result || !unAssignedResources.result[0] ) {
                Y.log( `calculateSchedule. There are no such required resources ${resourceTypes} in the db.`, 'warn', NAME );
                return cb(new Y.doccirrus.commonerrors.DCError( 'calevent_03', {data: {$requiredResources: resourceTypes.join( ', ' )}} ) );
            }
            return unAssignedResources.result;
        }

        function getByweekday( schedule ) {
            var
                intArr = schedule.byweekday || [],
                byweekday = [],
                dayOfWeek;

            if( ( !schedule.byweekday || !schedule.byweekday[0] ) && 'WEEKLY' === schedule.repetition ) {
                dayOfWeek = moment( schedule.dtstart ).days();
                dayOfWeek = (dayOfWeek + 6) % 7; // convert to RRule day of week
                intArr.push( dayOfWeek.toString() );
            }

            intArr.forEach( function( val ) {
                switch( val ) {
                    case '0':
                        byweekday.push( RRule.MO );
                        break;
                    case '1':
                        byweekday.push( RRule.TU );
                        break;
                    case '2':
                        byweekday.push( RRule.WE );
                        break;
                    case '3':
                        byweekday.push( RRule.TH );
                        break;
                    case '4':
                        byweekday.push( RRule.FR );
                        break;
                    case '5':
                        byweekday.push( RRule.SA );
                        break;
                    case '6':
                        byweekday.push( RRule.SU );
                        break;
                }
            } );
            return byweekday;
        }

        /**
         * Calculates set of start dates for repetitions for given master schedule in range [dtstart, until] using RRule
         *
         * @param {Object} schedule - master appointment with repetition-relevant fields (repetition, dtstart, until, interval, byweekday)
         * @returns {Array} - start dates for repetitions in range [dtstart, until]
         */
        function getDatesForRepetitions( schedule ) {
            let rruleOpt = {
                    freq: RRule[schedule.repetition],
                    dtstart: '',
                    until: '',
                    byweekday: getByweekday( schedule ),
                    interval: +schedule.interval || 1,
                    count: Y.doccirrus.schemas.calendar.MAX_SERIES_SCHEDULES
                },
                start = new Date( schedule.start ),
                rule;

            // we need to have dtstart/until values with 'real' date value instead of utc because we will add 1 day for bith of them to have correct range of dates
            rruleOpt.dtstart = moment.utc( schedule.dtstart ).add( 1, 'd' ).hour( start.getUTCHours() ).minute( start.getUTCMinutes() )
                .second( start.getUTCSeconds() ).millisecond( 0 ).toDate();
            rruleOpt.until = moment.utc( schedule.until || '' ).add( 1, 'd' ).hour( 23 ).minute( 59 ).second( 59 ).millisecond( 0 ).toDate(); // the end of the day

            rule = new RRule( rruleOpt );
            return rule.all();
        }

        /**
         * Creates an appointment on partner side and on this side after additional checking of practice, mirrorCalendar
         * and scheduleTitle building in calendar with given mirrorCalendarId
         *
         * @param {Object} user
         * @param {Object} schedule - an appointment that will be posted
         * @param {String} mirrorCalendarId - id of mirror calendar where an appointment should be created
         * @returns {Promise<{result: *, warning: DCError}>} - complex object with final result of post and possible warning
         */
        async function postPartnerSchedule( user, schedule, mirrorCalendarId ) {
            const
                getByIdP = promisifyArgsCallback( Y.doccirrus.api.mirrorcalendar.getById ),
                getMyPracticeP = promisifyArgsCallback( Y.doccirrus.api.practice.getMyPractice ),
                getScheduleTitleP = promisify( Y.doccirrus.calUtils.getScheduleTitle ),
                callExternalApiByCustomerNoP = promisifyArgsCallback( Y.doccirrus.communication.callExternalApiByCustomerNo );
            let
                err, warning, practice, mirrorCalendar, mirrorScheduletype, scheduleTitle, patient, partnerSchedule,
                thisSchedule;

            [err, mirrorCalendar] = await formatPromiseResult(
                getByIdP( {
                    user,
                    query: {
                        _id: mirrorCalendarId
                    }
                } )
            );

            if( err ) {
                Y.log( `postPartnerSchedule. Error getting mirrorCalendar ${mirrorCalendarId}: ${err.stack || err}`, 'error', NAME );
                throw err;
            }
            if( !mirrorCalendar ) {
                throw new Y.doccirrus.commonerrors.DCError( 400, {message: 'Mirrorcalendar not found'} );
            }

            [err, practice] = await formatPromiseResult(
                getMyPracticeP( {user} )
            );

            if( err ) {
                Y.log( `postPartnerSchedule. Error getting current practice: ${err.stack || err}`, 'error', NAME );
                throw err;
            }
            if( !practice ) {
                throw new Y.doccirrus.commonerrors.DCError( 400, {message: 'Practice not found'} );
            }

            let partnerScheduleData = Object.assign( {
                _resultsOnly: true,
                partner: {
                    dcCustomerNo: practice.dcCustomerNo,
                    name: practice.coname
                }
            }, schedule, {calendar: mirrorCalendar.originalId.toString()} );

            [err, scheduleTitle] = await formatPromiseResult(
                getScheduleTitleP( user, partnerScheduleData )
            );
            if( err ) {
                Y.log( `postPartnerSchedule. Error getting calevent title: ${err.stack || err}`, 'error', NAME );
                throw err;
            }
            partnerScheduleData.title = scheduleTitle || '';

            //translate schedule type
            if( partnerScheduleData.scheduletype ) {
                [err, mirrorScheduletype] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'get',
                        model: 'mirrorscheduletype',
                        query: {
                            _id: partnerScheduleData.scheduletype
                        },
                        options: {
                            lean: true,
                            select: {
                                originalId: 1
                            }
                        }
                    } )
                );
                if( err ) {
                    Y.log( `postPartnerSchedule. Error getting mirrorscheduletype ${partnerScheduleData.scheduletype}: ${err.stack || err} `, 'error', NAME );
                    throw err;
                }
                if( mirrorScheduletype && mirrorScheduletype.length ) {
                    partnerScheduleData.scheduletype = mirrorScheduletype[0].originalId;
                }
            }

            if( partnerScheduleData.patient ) {
                [err, patient] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'get',
                        model: 'patient',
                        query: {
                            _id: partnerScheduleData.patient
                        },
                        options: {
                            lean: true,
                            select: {
                                mirrorPatientId: 1
                            }
                        }
                    } )
                );
                if( err ) {
                    Y.log( `postPartnerSchedule. Error getting patient ${partnerScheduleData.patient}: ${err.stack || err} `, 'error', NAME );
                    throw err;
                }
                if( !patient || !patient.length ) {
                    throw new Y.doccirrus.commonerrors.DCError( 400, {message: 'Patient not found'} );
                }

                if( patient[0].mirrorPatientId ) {
                    partnerScheduleData.patient = patient[0].mirrorPatientId;
                }
            }

            [err, partnerSchedule] = await formatPromiseResult(
                callExternalApiByCustomerNoP( {
                    user,
                    api: 'calevent.post',
                    dcCustomerNo: mirrorCalendar.prcCustomerNo,
                    data: partnerScheduleData
                } )
            );

            if( err ) {
                Y.log( `postPartnerSchedule. External post failed, error: ${err.stack || err}`, 'error', NAME );
                throw err;
            }

            if( !partnerSchedule || !partnerSchedule.length ) {
                Y.log( `postPartnerSchedule. Could not save schedule on partner side.`, 'error', NAME );
                throw new Y.doccirrus.commonerrors.DCError( 500, {message: 'Schedule could not been saved.'} );
            }

            partnerSchedule = partnerSchedule[0];

            if( schedule.patient && !partnerSchedule.patient ) {
                warning = new Y.doccirrus.commonerrors.DCError( 100002 );
            }

            partnerSchedule.partner = {
                scheduleId: partnerSchedule._id,
                patientId: partnerSchedule.patient,
                dcCustomerNo: mirrorCalendar.prcCustomerNo
            };
            partnerSchedule.calendar = schedule.calendar;
            partnerSchedule.scheduletype = schedule.scheduletype;
            partnerSchedule.patient = schedule.patient;

            delete partnerSchedule.title;
            delete partnerSchedule._id;

            [err, thisSchedule] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'schedule',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( partnerSchedule ),
                    options: {
                        entireRec: true
                    }
                } )
            );
            if( err ) {
                Y.log( `postPartnerSchedule. Error during saving schedule: ${err.stack || err}`, 'error', NAME );
                throw err;
            }

            return {result: thisSchedule, warning};
        }

        /**
         * Checks schedule which will be posted in partner for some required conditions:
         * - if calendar exists and is isShared
         * - if scheduletype exists
         * - if schedule will be booked for some patient, check if patient exists (if no - return with flag patientWasNotFound)
         *
         * @param {Object} user
         * @param {Object} schedule - an appointment that should be checked
         * @returns {Promise<{appointmentToCreate: *, patientWasNotFound: boolean}|{appointmentToCreate: *}>} - original schedule with some changes or with patientWasNotFound flag
         */
        async function checkPartnerSchedule( user, schedule ) {
            let err, calendar, scheduleType, patient;

            [err, calendar] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'calendar',
                    action: 'get',
                    query: {
                        _id: schedule.calendar
                    },
                    options: {
                        lean: true,
                        select: {
                            isShared: 1
                        }
                    }
                } )
            );

            if( err ) {
                Y.log( `checkPartnerSchedule. Error while getting calendar ${schedule.calendar}: ${err.stack || err}`, 'error', NAME );
                throw err;
            }
            if( !calendar.length ) {
                Y.log( `checkPartnerSchedule. Could not create schedule. Calendar not found. Calendar id: ${schedule.calendar}`, 'error', NAME );
                throw new Y.doccirrus.commonerrors.DCError( 400, {message: 'Calendar not found'} );
            }
            if( !calendar[0].isShared ) {
                Y.log( `checkPartnerSchedule. Could not create schedule. Calendar is not shared. Calendar id: ${schedule.calendar}`, 'error', NAME );
                throw new Y.doccirrus.commonerrors.DCError( 400, {message: 'Calendar not found'} );
            }

            [err, scheduleType] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'scheduletype',
                    action: 'get',
                    query: {
                        _id: schedule.scheduletype
                    },
                    options: {
                        limit: 1
                    }
                } )
            );

            if( err ) {
                Y.log( `checkPartnerSchedule. Error while getting scheduletype ${schedule.scheduletype}: ${err.stack || err}`, 'error', NAME );
                throw err;
            }
            if( !scheduleType.length ) {
                Y.log( `checkPartnerSchedule. Could not create partner schedule. Scheduletype entry not found. Scheduletype: ${schedule.scheduletype}`, 'error', NAME );
                throw new Y.doccirrus.commonerrors.DCError( 70001 );
            }

            if( schedule.patient ) {
                [err, patient] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'patient',
                        action: 'get',
                        query: {
                            mirrorPatientId: schedule.patient
                        }
                    } )
                );

                if( err ) {
                    Y.log( `checkPartnerSchedule. Error while getting patient ${schedule.patient}: ${err.stack || err}`, 'error', NAME );
                    throw err;
                }
                if( !patient.length ) {
                    delete schedule.patient;
                    return {patientWasNotFound: true, appointmentToCreate: schedule};
                }
                schedule.patient = patient[0]._id;
                delete schedule.title;
            }
            return {appointmentToCreate: schedule};
        }

        /**
         *  Posts passed data to db
         *  - if data comes from PP also add context object for further post-processing
         *
         * @param {Object} user
         * @param {Object|Array} dataToPost - it could be an array (if repetitions or resourceBased ) or an object
         * @param {Object} options - initial options from POST args
         * @returns {Promise<{scheduleId: *}|*>} - whole result if data has _resultsOnly flag, otherwise only obj with scheduleId
         */
        async function finalPost( user, dataToPost, options ) {
            let
                err, postResult,
                _resultsOnly = lodash.isArray( dataToPost ) ? dataToPost[0]._resultsOnly : dataToPost._resultsOnly,
                isFromPortal = lodash.isArray( dataToPost ) ? dataToPost[0].isFromPortal : dataToPost.isFromPortal,
                context = {};
            dataToPost = Y.doccirrus.filters.cleanDbObject( dataToPost );

            if( isFromPortal ) {
                context = {
                    createTask: true,
                    auditPP: true
                };
            }

            [err, postResult] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'schedule',
                    action: 'post',
                    context,
                    data: dataToPost,
                    options: Object.assign( {entireRec: true}, options )
                } )
            );

            if( err ) {
                Y.log( `finalPost. Error in posting a schedule ${JSON.stringify( dataToPost )}: ${err.stack || err}`, 'error', NAME );
                throw err;
            }
            if( !postResult || !postResult[0] ) {
                throw new Y.doccirrus.commonerrors.DCError( 'calevent_02' );
            }

            if( _resultsOnly ) {
                return postResult;
            } else {
                return {scheduleId: postResult.length && postResult[0]._id};
            }
        }

        /**
         * Takes master schedule and series of repetitions and passes them to util function to validate
         *
         * @param {Object} user
         * @param {Object} schedule - master appointment
         * @param {Array} serie - array of repetition appointments to validate
         * @returns {Promise<*>} - result of validation as object with possible warnings
         */
        async function validateMasterData( user, schedule, serie ) {
            const
                validateSeriesP = promisify( Y.doccirrus.calUtils.validateSeries );

            let err, validateSerieResult, handledValidationResult;

            [err, validateSerieResult] = await formatPromiseResult(
                validateSeriesP( user, schedule, serie )
            );
            if( err ) {
                throw err;
            }
            [err, handledValidationResult] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                handleValidationResult( user, null, validateSerieResult, schedule, ( warning ) => {
                    resolve( {warning} );
                }, ( error, result, warning ) => {
                    if( error ) {
                        reject( error );
                    }
                    resolve( {warning} );
                } );
            } ) );
            if( err ) {
                Y.log( `validateMasterData. Error during validation: ${err.stack || err}`, 'error', NAME );
                throw err;
            }
            return handledValidationResult;
        }

        /**
         * Creates series of repeated appointments from passed master schedule and validate it if needed
         *
         * @param {Object} user
         * @param {Object} schedule            master schedule
         * @param {Object} options             initial options from POST args
         * @param {Boolean} returnBeforePost
         * @returns {Promise<{warning}|*|*>} - post result or object with warning after validation
         */
        async function processRepetitions( user, schedule, options, returnBeforePost ) {
            let err, dates, repetitionSerie = [],
                postResult, validateSerieResult;
            if( 'DAILY' === schedule.repetition ) {
                schedule.byweekday = [];
            }
            dates = getDatesForRepetitions( schedule );

            // fix summer and winter time appointments
            if( dates && dates[0] ) {
                const
                    isStartDateDST = moment( dates[0] ).isDST();
                dates = ( dates || [] ).map( ( i ) => {
                    if( isStartDateDST ) {
                        if( !moment( i ).isDST() ) {
                            i = moment( i ).add( 1, 'hours' ).toDate();
                        }
                    } else {
                        if( moment( i ).isDST() ) {
                            i = moment( i ).subtract( 1, 'hours' ).toDate();
                        }
                    }

                    return i;
                } );
            }
            if( dates[0] ) {
                let objectId = new ObjectId();
                if( 'WEEKLY' === schedule.repetition ) {
                    schedule.dtstart = moment( dates[0] ).startOf('d').toDate();
                    schedule.start = dates[0];
                    schedule.eta = dates[0];
                    schedule.end = moment( schedule.start ) + schedule.duration * 60 * 1000;
                    schedule.end = moment( schedule.end ).utc().toDate();
                }
                // if there is no schedule _id then this schedule is just creating and we can add it to series, otherwise it already exists and will be updated elsewhere
                if( !schedule._id ) {
                    schedule._id = objectId;
                    repetitionSerie.push( schedule );
                    dates.shift();
                }

                dates.forEach( date => {
                    let template = JSON.parse( JSON.stringify( schedule ) );
                    template.start = date;
                    template.eta = date;
                    template.end = moment( template.start ) + template.duration * 60 * 1000;
                    template.end = moment( template.end ).utc().toDate();
                    template.linkSeries = schedule._id;
                    template._id = new ObjectId();
                    delete template.dtstart;
                    delete template.until;
                    delete template.repetition;
                    template.byweekday = [];
                    repetitionSerie.push( template );
                } );

                repetitionSerie.forEach( repetition => {
                    if( moment( repetition.start ).isAfter( moment().add( 15, 's' ) ) ) {
                        repetition.scheduled = Y.doccirrus.schemas.calendar.SCH_WAITING;
                    }
                } );
                repetitionSerie = Y.doccirrus.filters.cleanDbObject( repetitionSerie );
            } else {
                if( schedule._id && 'WEEKLY' === schedule.repetition ) {
                    return;
                }
                delete schedule.dtstart;
                delete schedule.until;
                schedule.repetition = 'NONE';
                schedule.byweekday = [];
            }

            if( returnBeforePost ) {
                return repetitionSerie;
            }

            if( false === schedule.notConfirmed ) {
                // we already check whole serie so just post it
                [err, postResult] = await formatPromiseResult( finalPost( user, repetitionSerie.length ? repetitionSerie : schedule, options ) );
                if( err ) {
                    throw err;
                }
                return postResult;
            } else {
                [err, validateSerieResult] = await formatPromiseResult( validateMasterData( user, schedule, repetitionSerie ) );
                if( err ) {
                    throw err;
                }
                // if some warnings were detected during validation then stop posting and return them to client
                if( validateSerieResult && validateSerieResult.warning ) {
                    return validateSerieResult;
                }

                [err, postResult] = await formatPromiseResult( finalPost( user, repetitionSerie.length ? repetitionSerie : schedule, options ) );
                if( err ) {
                    throw err;
                }
                return postResult;
            }
        }

        /**
         * Processes schedule before posting:
         * - register patient if schedule is from PP from new patient OR
         * - add a new stub for patient when it's request from PP for new Online_Sprechstunde
         * - create online conference if schedule has conferenceType and comes from PP or cardReader
         * - call processRepetitions if schedule is master of serie
         * - otherwise just call finalPost
         *
         * @param {Object} user
         * @param {Object} schedule - an appointment which should be posted
         * @param {Object} options - initial options from POST args
         * @returns {Promise<Object|*|*>} - result of post
         */
        async function doPost( user, schedule, options ) {
            const
                registerPatientP = promisifyArgsCallback( Y.doccirrus.api.patient.registerPatient ),
                addPatientForVCP = promisifyArgsCallback( Y.doccirrus.api.patient.addPatientForVC ),
                createOnlineConferenceP = promisifyArgsCallback( Y.doccirrus.api.conference.createOnlineConference );
            let
                err, registeredPatient, postResult,
                conferenceStatus = Y.doccirrus.schemas.conference.conferenceStatuses.NEW;

            if( schedule.patientData ) {
                if( schedule.isPublicVC ) {
                    Y.log( 'doPost. add new patient for VC: ' + JSON.stringify( schedule.patientData ), 'debug', NAME );

                    [err, registeredPatient] = await formatPromiseResult(
                        addPatientForVCP( {
                            user,
                            data: schedule.patientData
                        } )
                    );

                    if( err || !registeredPatient ) {
                        Y.log( `doPost. Error adding new patient for VC: ${err && err.stack || err}`, 'error', NAME );
                        throw err;
                    } else {
                        schedule.patient = registeredPatient;
                        schedule.scheduled = Y.doccirrus.schemas.calendar.SCH_UNCONFIRMED;
                        conferenceStatus = Y.doccirrus.schemas.conference.conferenceStatuses.UNCONFIRMED;
                    }
                } else {
                    schedule.patientData._id = schedule.patient; // id comes from patientreg
                    Y.log( 'doPost. register new patient from portal: ' + JSON.stringify( schedule.patientData ), 'debug', NAME );

                    [err, registeredPatient] = await formatPromiseResult(
                        registerPatientP( {
                            user,
                            data: schedule.patientData
                        } )
                    );

                    if( err || !registeredPatient ) {
                        Y.log( `doPost. Error registering the new patient: ${err.stack || err}`, 'error', NAME );
                        throw err;
                    } else {
                        schedule.patient = registeredPatient.patientId;
                    }
                }
            }

            schedule = Y.doccirrus.calUtils.cleanCalevent( schedule );
            if( schedule.conferenceType && (schedule.isFromPortal || schedule.isFromCardReader) ) {
                [err, postResult] = await formatPromiseResult(
                    createOnlineConferenceP( {
                        user,
                        data: {
                            schedule: {...schedule, employee: null},
                            conference: {
                                conferenceType: schedule.conferenceType,
                                status: conferenceStatus,
                                patients: [schedule.patient],
                                employees: [schedule.employee],
                                participants: [],
                                startDate: schedule.start,
                                isForUnregistered: schedule.isPublicVC
                            }
                        }
                    } )
                );
                if( err ) {
                    Y.log( `doPost. Error creating online conference: ${err.stack || err}`, 'error', NAME );
                    throw err;
                }
                return postResult;
            }

            schedule.start = moment( schedule.start ).utc().toDate();
            schedule.end = moment( schedule.end ).utc().toDate();
            if( moment( schedule.start ).isAfter( moment().add( 15, 's' ) ) ) {
                schedule.scheduled = Y.doccirrus.schemas.calendar.SCH_WAITING;
            }
            schedule = Y.doccirrus.filters.cleanDbObject( schedule );

            if( Y.doccirrus.calUtils.isMasterSchedule( schedule ) ) {

                [err, postResult] = await formatPromiseResult( processRepetitions( user, schedule, options ) );
                if( err ) {
                    throw err;
                }
                return postResult;
            } else {
                [err, postResult] = await formatPromiseResult( finalPost( user, schedule, options ) );
                if( err ) {
                    throw err;
                }
                if( registeredPatient && registeredPatient.patientId ) {
                    postResult.patientId = registeredPatient.patientId; // PP might want to change its own pid field
                }
                return postResult;
            }
        }

        /**
         * Prepares resourceBased appointments to create after simple click on calendar slot:
         * - get calendars with required resources from scheduletype
         * - create separate appointment for each resource
         * - validate all appointments
         *
         * @param {Object} user
         * @param {Object} schedule - original appointment with all requiredResources
         * @returns {Promise<{warning: *}|Array>} - object with warnings after validation OR array with prepared resourceBased appointments
         */
        async function prepareResourcesForCalendarClickAppointments( user, schedule ) {
            //here we create resource based appointments via regular click in calendar slot
            let err, calendars, resources,
                scheduler,
                resourceTypes = [...schedule.requiredResources],
                currentCalendar = schedule.calendar,
                warningsFromResources = [],
                eventMap = new Map(),
                linkByResource = new ObjectId().toString(),
                processedResourceBasedAppointments = [];

            [err, calendars] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'calendar',
                    query: {'resources.resourceType': {$in: schedule.requiredResources}},
                    options: {
                        select: {
                            _id: 1,
                            resources: 1
                        }
                    }
                } )
            );

            if( err ) {
                Y.log( `prepareResourcesForCalendarClickAppointments. Error while getting calendars with resources: ${schedule.requiredResources}`, 'warn', NAME );
                throw err;
            }

            if( !calendars || !calendars[0] ) {
                //then we will use just 'raw' resources to book for the current calendar
                let unAssignedResources = await getUnassignedResources( user, resourceTypes );

                calendars.push( {
                    _id: currentCalendar,
                    resources: []
                } );

                for( let item of unAssignedResources ) {
                    calendars[0].resources.push( {
                        resourceType: item._id,
                        resource: item.resource
                    } );
                }
            }
            schedule.calendarObjects = [];

            for( let calendar of calendars ) {
                for( let resource of calendar.resources ) {
                    if( 'ALL' === resource.resource ) {
                        [err, resources] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'resource',
                                query: {type: resource.resourceType},
                                options: {
                                    select: {
                                        _id: 1
                                    }
                                }
                            } )
                        );
                        if( err ) {
                            Y.log( `prepareResourcesForCalendarClickAppointments. Error while getting ALL resources of type: ${resource.resourceType}`, 'warn', NAME );
                            throw err;
                        }
                        resource.resource = resources.map( item => item._id );
                    } else {
                        //we need this to keep resource.resource type (Array) consistent for further calculations
                        resource.resource = Array.isArray( resource.resource ) ? resource.resource : [resource.resource];
                    }

                    // check if all required resources are assigned to some calendar
                    if( resourceTypes.includes( resource.resourceType ) ) {
                        resourceTypes.splice( resourceTypes.indexOf( resource.resourceType ), 1 );
                    }
                }
                schedule.calendarObjects.push( calendar );
            }

            if( resourceTypes && resourceTypes.length ) {
                // means that some required resource types aren't assigned to any calendar
                let unAssignedResources = await getUnassignedResources( user, resourceTypes ),
                    formattedResources = [];

                for( let item of unAssignedResources ) {
                    formattedResources.push( {
                        resourceType: item._id,
                        resource: item.resource
                    } );
                }

                schedule.calendar = lodash.union( schedule.calendar, [currentCalendar] );
                let currentCalIndex = schedule.calendarObjects.findIndex( item => item._id.toString() === currentCalendar );

                if( currentCalIndex > -1 ) {
                    schedule.calendarObjects[currentCalIndex].resources = [...schedule.calendarObjects[currentCalIndex].resources, ...formattedResources];
                } else {
                    schedule.calendarObjects.push( {_id: currentCalendar, resources: formattedResources} );
                }
            }

            [err, scheduler] = await formatPromiseResult( getSchedulerProm( user ) );

            if( err ) {
                Y.log( `prepareResourcesForCalendarClickAppointments. Error while getting scheduler.`, 'warn', NAME );
                throw err;
            }

            // field to save a connection between appointments which were created from one slot for several resources
            schedule.linkByResource = linkByResource;

            if( moment( schedule.start ).isAfter( moment().add( 15, 's' ) ) ) {
                schedule.scheduled = Y.doccirrus.schemas.calendar.SCH_WAITING;
            }

            for( let calendar of schedule.calendarObjects ) {
                for( let resource of calendar.resources ) {
                    // make a copy schedule with each resource of this resourceType, check it for validity
                    // and post only those without warnings or first with warning if all of them are with warnings
                    for( let resourceOfType of resource.resource ) {
                        let innerCopy = {
                                ...schedule,
                                calendar: calendar._id,
                                resourceBased: true,
                                resource: resourceOfType,
                                resourceType: resource.resourceType
                            },
                            copyValidationResult, handledCopyResult;

                        // check if calendar is in calendarRefs of scheduleType
                        if( schedule.scheduleTypeMeta && schedule.scheduleTypeMeta.calendarRefs &&
                            !schedule.scheduleTypeMeta.calendarRefs.find( calendarRef => calendarRef.calendarId === calendar._id.toString() ) ) {
                            innerCopy.isReadOnly = true;
                        }

                        [err, copyValidationResult] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                            scheduler.isValidStartAndEnd( innerCopy, false, function( err, result ) {
                                if( err ) {
                                    reject( err );
                                }
                                resolve( result );
                            } );
                        } ) );

                        if( err ) {
                            Y.log( `prepareResourcesForCalendarClickAppointments. Error during validation of copy appointment in calendar ${innerCopy.calendar}. Error: ${err.stack || err}`, 'warn', NAME );
                            throw err;
                        }

                        [err, handledCopyResult] = await formatPromiseResult( new Promise( ( resolve, reject ) => { // eslint-disable-line no-loop-func
                            handleValidationResult( user, err, copyValidationResult, innerCopy, ( warning ) => {
                                resolve( {warning} );
                            }, ( error, result, warning ) => {
                                if( error ) {
                                    reject( error );
                                }
                                resolve( {warning} );
                            } );
                        } ) );
                        if( err ) {
                            Y.log( `prepareResourcesForCalendarClickAppointments. Error when validation result for copy appointment was handled. Error: ${err.stack || err}`, 'warn', NAME );
                            throw err;
                        }
                        if( handledCopyResult && handledCopyResult.warning ) {
                            if( !eventMap.has( innerCopy.resourceType ) ) {
                                // add event with warning only if there is no entry with such key in Map
                                // -- so if there are two events with warnings we save only first one
                                // -- if there are two events - one with warning and one without we always propose
                                //    event without warnings first
                                eventMap.set( innerCopy.resourceType, {
                                    evt: innerCopy,
                                    warn: handledCopyResult.warning
                                } );
                            }
                        } else {
                            // add event without warnings ( it could overwrite event with warning )
                            eventMap.set( innerCopy.resourceType, {evt: innerCopy} );
                        }
                    }
                }
            }
            for( let event of eventMap.values() ) {
                processedResourceBasedAppointments.push( event.evt );
                // here we collect all warnings from calevents if they weren't confirmed previously
                if( event && event.warn && schedule.notConfirmed ) {
                    warningsFromResources.push( event.warn );
                }
            }

            // if we have any warning after validation of copies,
            // we should send them to the client to confirm
            if( warningsFromResources && warningsFromResources.length ) {
                return {warning: handleWarnings( warningsFromResources )};
            }

            // if there are no warnings, return processedResourceBasedAppointments to post them
            return processedResourceBasedAppointments;
        }

        /**
         * Prepares resourceBased appointments to create after searching of free slots:
         * - create separate appointment for each resource
         * - validate all appointments
         *
         * @param {Object} user
         * @param {Object} schedule - original appointment with array of calendars with resources
         * @returns {Promise<{warning: *}|Array>} - object with warnings after validation OR array with prepared resourceBased appointments
         */
        async function prepareResourcesForFoundedSlots( user, schedule ) {
            // as we create resource based appointments from Termin suchen und buchen modal,
            // we just need to check each slot validity
            let scheduler, err,
                processedResourceBasedAppointments = [],
                checkedSchedules = 0,
                linkByResource = new ObjectId().toString();

            [err, scheduler] = await formatPromiseResult( getSchedulerProm( user ) );

            if( err ) {
                Y.log( `post. Error while getting scheduler for resourceBased calevent.`, 'warn', NAME );
                throw err;
            }

            let
                intimeConfig = scheduler.getConfig() || {},
                allowAdhoc = schedule.isFromPortal ? intimeConfig.allowAdhoc : intimeConfig.allowPRCAdhoc;

            if( schedule.adhoc && !allowAdhoc ) {
                throw Y.doccirrus.errors.http( 401, 'Number not allowed' );
            }

            for( let calendarObj of schedule.calendar ) {
                let dataCopy = JSON.parse( JSON.stringify( schedule ) ),
                    dataCopyValidationResult, handledDataCopyResult, warningsFromResources = [];
                dataCopy.calendar = calendarObj._id;

                // check if calendar is in calendarRefs of scheduleType
                if( schedule.scheduleTypeMeta && schedule.scheduleTypeMeta.calendarRefs &&
                    !schedule.scheduleTypeMeta.calendarRefs.find( calendarRef => calendarRef.calendarId === calendarObj._id.toString() ) ) {
                    dataCopy.isReadOnly = true;
                }

                // field to save a connection between appoitments which were created from one slot for several resources
                dataCopy.linkByResource = linkByResource;

                if( moment( dataCopy.start ).isAfter( moment().add( 15, 's' ) ) ) {
                    dataCopy.scheduled = Y.doccirrus.schemas.calendar.SCH_WAITING;
                }

                //here we handle case when calendar could have more then 1 resource and resourceCapacity
                //bigger then 1, so we post a separate calevent for each resource
                for( let resourceObj of calendarObj.resources ) {
                    //assign concrete resource id to appointment ( for now it will take first one from multiple resource of one type )
                    dataCopy = {...dataCopy, resource: resourceObj.resource[0]};

                    [err, dataCopyValidationResult] = await formatPromiseResult( new Promise( ( resolve, reject ) => { // eslint-disable-line no-loop-func
                        scheduler.isValidStartAndEnd( dataCopy, dataCopy.forAppointmentSearch, function( err, result ) {
                            if( err ) {
                                reject( err );
                            }
                            resolve( result );
                        } );
                    } ) );

                    if( err ) {
                        Y.log( `post. Error during validation of resourceBased copy appointment in calendar ${dataCopy.calendar}. Error: ${err.stack || err}`, 'warn', NAME );
                        throw err;
                    }

                    [err, handledDataCopyResult] = await formatPromiseResult( new Promise( ( resolve, reject ) => { // eslint-disable-line no-loop-func
                        handleValidationResult( user, err, dataCopyValidationResult, dataCopy, ( warning ) => {
                            // valid callback - here we accumulate all schedules after checking
                            // and post it if their count is equal to count of required resources
                            // ( as we create one appointment per resource )
                            resolve( {warning} );
                        }, ( error, result, warning ) => {
                            //invalid callback - here we send an error or a warning to user to get approving or just to inform
                            if( error ) {
                                reject( error );
                            }
                            resolve( {warning} );
                        } );
                    } ) );
                    if( err ) {
                        Y.log( `post. Error when validation result for resourceBased copy appointment was handled. Error: ${err.stack || err}`, 'warn', NAME );
                        throw err;
                    }

                    if( handledDataCopyResult && handledDataCopyResult.warning ) {
                        warningsFromResources.push( handledDataCopyResult.warning );
                    }

                    // here we accumulate all schedules after checking
                    // and post them if their count is equal to count of required resources
                    // ( as we create one appointment per resource )
                    checkedSchedules++;
                    processedResourceBasedAppointments.push( dataCopy );

                    if( checkedSchedules === schedule.requiredResources.length ) {
                        // if we have any warning after validation of copies,
                        // we should send them to the client to confirm
                        if( warningsFromResources && warningsFromResources.length ) {
                            return {warning: handleWarnings( warningsFromResources )};
                        }
                        return processedResourceBasedAppointments;
                    }
                }
            }
        }

        function updateMasterSchedule( user, data, scheduleId, thisAndFuture, _cb ) {
            var
                changedFields,
                async = require( 'async' ),
                onlyMaster = false,
                query;
            Y.log( 'updating master schedule...', 'debug', NAME );

            if( Y.doccirrus.calUtils.isMasterSchedule( data ) ) {
                onlyMaster = true;
            }

            function updateMaster( start ) {
                if( !changedFields.length ) { // then nothing to update
                    _cb( null, [] );
                    return;
                }
                delete data.fields_;

                var newStartTime = moment.duration( moment( data.start ) - moment( data.start ).startOf( "day" ) ),
                    newEndTime = moment.duration( moment( data.end ) - moment( data.end ).startOf( "day" ) );
                data = Y.doccirrus.filters.cleanDbObject( data );

                if( thisAndFuture ){
                    if( onlyMaster ) {
                        query = {
                            $or: [
                                { linkSeries: scheduleId },
                                { _id: scheduleId } ],
                            start: { $gte: start }
                        };
                    } else {
                        query = {
                            linkSeries: scheduleId,
                            start: { $gte: start }
                        };
                    }
                } else {
                    query = { $or : [ { _id: scheduleId }, { linkSeries: scheduleId } ]};
                }

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'schedule',
                    action: 'get',
                    query: query,
                    callback: function( err, result ) {
                        if( err ) {
                            Y.log( 'error updating master schedule: ' + JSON.stringify( err ), 'error', NAME );
                           return _cb( err );
                        } else {
                            async.eachSeries( result, function( item, cb ) {
                                data.start = moment( item.start ).startOf( "day" ).add( newStartTime );
                                data.end = moment( item.end ).startOf( "day" ).add( newEndTime );
                                if( data.changeEta ) {
                                    data.eta = data.start;
                                }
                                data = Y.doccirrus.filters.cleanDbObject( data );
                                Y.doccirrus.mongodb.runDb( {
                                    user: user,
                                    model: 'schedule',
                                    action: 'put',
                                    fields: changedFields,
                                    query: { _id: item._id },
                                    data: data,
                                    callback: function( error ) {
                                        if( error ) {
                                          return cb( error );
                                        }
                                        return cb( null );
                                    }
                                } );

                            }, function() {
                               return _cb( null, result );
                            } );
                        }
                    }
                } );
            }

            Y.doccirrus.calUtils.getNRepetitions( user, {
                scheduleOrId: scheduleId,
                steps: 1,
                include: true
            }, function( err, result ) {
                if( err || !result || !result[0] ) {
                    Y.log( 'error updating master schedule (1): ' + JSON.stringify( err ), 'error', NAME );
                    return _cb( err || 'no master data' );
                }
                if( data.changeEta ) {
                    data.eta = data.start;
                }
                changedFields = getChangedFields( result[0], data ); // detect the fields user is trying to update

                if( 'NONE' === data.repetition ) {
                    if( changedFields.indexOf( 'dtstart' ) >= 0 ) {
                        changedFields.splice( changedFields.indexOf( 'dtstart' ), 1 );
                    }
                    if( changedFields.indexOf( 'until' ) >= 0 ) {
                        changedFields.splice( changedFields.indexOf( 'until' ), 1 );
                    }
                }
                updateMaster( moment( data.start ).startOf('day').toDate() );
            }, onlyMaster );
        }

        // we restrict a calevent query here
        // It may NOT be a search query
        function getQuery( myQuery ) {
            return (('string' === typeof myQuery && myQuery.length === 24) || ('object' === typeof myQuery && myQuery._id)) ? myQuery : '';
        }

        // either repetition or schedule
        function getModelName( eventType ) {
            var model = '';
            if( 'plan' === eventType || 'adhoc' === eventType ||
                'closeTime' === eventType || 'allDay' === eventType ) {
                model = 'schedule';
            } else if( 'repetition' === eventType ) { // real repetition
                model = 'repetition';
            }
            return model;
        }

        function handleWarnings( warnings ) {
            // collect all warnings about resource overbooking to show them in one message
            let overbookedWarnings = warnings.filter( warn => 7004 === warn.code ) || [],
                otherWarnings = warnings.filter( warn => [7000, 7001].includes( warn.code ) ) || [],
                conflictedCalendars = otherWarnings.map( warn => warn.data && warn.data.calendarName ),
                overbookedResources = overbookedWarnings.map( warn => warn.data && warn.data.$resources );

            if( overbookedResources && overbookedResources.length ) {
                // as we show only first one warning to the client to confirm,
                // we will show overbookedWarning only for updating of resource schedules( until we change a warning displaying )
                return [
                    {
                        ...overbookedWarnings[0],
                        data: {
                            ...overbookedWarnings[0].data,
                            $resources: lodash.union( overbookedResources, conflictedCalendars ).join( ', ' )
                        }
                    }];
            }
            return warnings;
        }


        /**
         *
         * @param   {Object}            user
         * @param   {Object}            err
         * @param   {Object}            result              validation result
         * @param   {Object}            calevent
         * @param   {Function}          validCb             callback if event data is valid
         * @param   {Function}          invalidCb           callback if event data NOT valid
         *
         * @return  {Function}           callback
         */
        function handleValidationResult( user, err, result, calevent, validCb, invalidCb ) {
            if( err ) {
                Y.log( 'Error checking validity in POST/PUT of new schedule: ' + JSON.stringify( err ), 'debug', NAME );
                if( 'schedule_05' === err.code ) {
                    return invalidCb( err );
                }
                return invalidCb( Y.doccirrus.errors.http( 500, 'possible server error' ) );
            }

            result = result || {};

            if( result.valid ||
                (!calevent.adhoc &&     // no exception for adhoc
                 Y.doccirrus.scheduling.personnelCanWrite( result, user )) ) {

                if( 1 === result.resultInt ) {  // no warning
                    validCb();

                } else if( calevent.notConfirmed ) {    // we need the user to confirm it is ok to save
                    invalidCb( null, null, Y.doccirrus.errors.rest( result.resultInt, result, true ) );   // send back as a warning

                } else {
                    result.valid = true;
                    validCb( Y.doccirrus.errors.rest( result.resultInt, result ) );
                }

            } else if( result && 1 < result.resultInt ) {
                Y.log( result.resultInt + ' # Invalid schedule dates / times in POST of new schedule: ' + result.resultInt, 'debug', NAME );
                // Block addition of this invalid
                // schedule.

                if( calevent.adhoc ) { // overwrite message for adhoc
                    result.resultInt = 7006;
                }

                invalidCb( Y.doccirrus.errors.rest( result.resultInt, result ), null, null ); // return validation result as a error

            } else {
                Y.log( 'Invalid schedule dates / times in POST of new schedule' + JSON.stringify( result ), 'debug', NAME );
                invalidCb( Y.doccirrus.errors.rest( 7005, { valid: false } ), null, null ); // an unhandled case
                return;

            }
        }

        /**
         * before writing or deleting a calevent,
         * check if the patient has confirmed/unlocked their registration on PP for this PRC
         *
         * @param   {Object}            user
         * @param   {ObjectId}          patientOrId patient entry or its _id
         * @param   {Boolean}           isFromPortal
         * @param   {Function}          callback will be called with error if patient has not confirmed
         */
        async function ppAccessCheck( user, patientOrId, isFromPortal, callback ) {
            let
                err, result,
                patient = patientOrId && patientOrId._id ? patientOrId : null;

            if( !isFromPortal ) {
                return handleResult(null, null, callback); // don't care
            }
            if( !patientOrId ) {
                return handleResult( 'insufficient parameters', null, callback ); // don't care
            }

            if( !patient ) {
                [err, result] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'patient',
                        query: { _id: patientOrId }})
                );
                if( err ) {
                    Y.log( `ppAccessCheck. Error getting patient ${patientOrId} : ${err.stack||err}`, 'error', NAME );
                    return handleResult( err, null, callback );
                }
                patient = result && result[0];
            }

            if( !patient ) {
                return handleResult( Y.doccirrus.errors.rest( 18005 ), null, callback );
            }
            if( !patient.createPlanned ) {
                return handleResult( Y.doccirrus.errors.rest( 403, `patient can't create appointment` ), null, callback );
            }
            return handleResult( null, null,  callback );
        }

        async function calculateSchedule( args ) {
            var
                moment = require( 'moment' ),
                err, scheduleTypeResources, calendars, resourceTypes, resources,
                { callback, data, user } = args;

            Y.log( ' }}}}}}}}}  PROCESSING:  --------->  ' + data.subaction, 'debug', NAME );

            /**
             * Call back from getScheduler
             *
             * At this point, we have a set of calendars selected according to the user and the
             * actions on the scheduler are available.
             * @method dispatchLogic
             * @param   {Object}            err
             * @param   {Object}            scheduler
             */
            async function dispatchLogic( err, scheduler ) {
                var
                    errMsg;
                // Catch the error case
                if( err || !scheduler ) {
                    errMsg = err.toString() || 'Scheduler not obtainable for this user.';
                    Y.log( errMsg, 'warn', NAME );
                    Y.log( `error in dispatchLogic: ${JSON.stringify( err )}`, 'error', NAME );
                    callback( Y.doccirrus.errors.http( 500, errMsg ) );
                    return;
                }
                // Now actually perform the requested scheduling action on the
                // calendar set.
                if( 'TOP_EVT' === data.subaction ) {
                    // return the top 5, circumvents problems with series blocking finding of actual data.
                    Y.doccirrus.calUtils.getNToday( user, 5, data.calendar, data.location, 'waiting', callback );

                } else if( 'EVT_LIST' === data.subaction ) {
                    // return all active for today, from now()
                    scheduler.getTodaySortedByStart( {
                        location: data.location,
                        calendar: data.calendar,
                        scheduled: 'waiting'
                    }, callback );

                } else if( 'EVTS2' === data.subaction ) {
                    // this path only for testing, exposes the entire
                    // scheduler API.
                    data = Y.merge( { callback: callback }, data );
                    Y.doccirrus.calUtils.getEventList( user, data );

                } else if( 'PAT_EVTS' === data.subaction ) {
                    // return all active from today, for a patient and show locations
                    if ( 'true' === data.isFromPortal ) {
                        await Y.doccirrus.utils.auditPPAction( user, {model: 'schedule', action: 'get', who: data.patient} );
                    }
                    Y.doccirrus.calUtils.getEventList( user, {
                        patient: data.patient,
                        eventType: [ 'plan', 'adhoc' ],
                        dateFrom: 'now',
                        duration: 'all',
                        show: 'location',
                        callback: callback
                    } );
                } else if( 'CLOSE_T_EVTS' === data.subaction ) {
                    // return all active from today, for a patient and show locations
                    Y.doccirrus.calUtils.getEventList( user, {
                        calendar: data.calendar,
                        eventType: 'closeTime',
                        dateFrom: data.dateFrom || 'now',
                        duration: data.duration || 'all',
                        useEnd: true,
                        callback: callback
                    } );

                } else if( undefined === data.subaction ) {
                    // return all for today, (was sorted by end, but not clear why, hack for the scheduled flag probably - changed 0.7)
                    scheduler.getTodaySortedByStart( {
                        location: data.location,
                        calendar: data.calendar,
                        scheduled: 'waiting'
                    }, callback );

                } else if( 'PACKED' === data.subaction ) {
                    scheduler.getTodaySortedByStart( {
                        location: data.location,
                        calendar: data.calendar,
                        scheduled: 'waiting'
                    }, function restReturn( err, response ) {
                        if( err ) {
                            callback( err, response );
                            return;
                        }
                        response = response.slice( 0, 10 );
                        callback( err, response );
                    } );

                } else if( 'ADMIT_EVT' === data.subaction ) {
                    if( !data._id || !data.calendar ) {
                        Y.log('Calculate Schedule: Invalid Admit Query', 'info', NAME );
                        callback( Y.doccirrus.errors.http( 400, 'Invalid Admit Query' ), null );
                        return;
                    }
                    // return all active for today, from now()
                    scheduler.admitOrCloseEvent( user, 'admit', data.calendar, data._id, callback );

                } else if( 'TO_WAITING_LIST' === data.subaction ) {
                    if( !data._id ) {
                        Y.log('Calculate Schedule: Invalid Admit Query', 'info', NAME );
                        callback( Y.doccirrus.errors.http( 400, 'Invalid Admit Query' ), null );
                        return;
                    }

                    scheduler.toWaitingList( user, data, callback );

                } else if( 'CLOSE_EVT' === data.subaction ) {
                    if( !data._id || !data.calendar ) {
                        Y.log('Calculate Schedule: Invalid Close_Evt Query', 'info', NAME );
                        callback( Y.doccirrus.errors.http( 400, 'Invalid Close_Evt Query' ), null );
                        return;
                    }
                    // return all active for today, from now()
                    scheduler.admitOrCloseEvent( user, 'close', data.calendar, data._id, callback );

                } else if( 'NEXT_SLOT' === data.subaction ) {
                    if( !data.calendar ) {
                        Y.log('Calculate Schedule: Invalid Next Slot Query', 'info', NAME );
                        callback( Y.doccirrus.errors.http( 400, 'Invalid Next Slot Query' ), null );
                        return;
                    }
                    // get next slot for a particular calendar
                    if( false === scheduler.getConfig().allowAdhoc ) {
                        Y.log( 'adhoc scheduling is disabled, exiting getNextNStartTimes', 'debug', NAME );
                        return callback( null, null ); // EXIT with null, PP must interpret as no available adhoc

                    } else {
                        scheduler.getNextNStartTimes(
                            {
                                n: 1,
                                windowDuration: 'day',
                                calendar: data.calendar,
                                isRandomMode: 'true' === data.isRandomMode,
                                forAdhoc: true,
                                slotDuration: data.duration || Y.doccirrus.scheduling.getAvgDuration(),
                                callback: callback
                            } );
                    }
                } else if( 'NEXT' === data.subaction ) {
                    if( !data.calendar && !data.n ) {
                        Y.log('Calculate Schedule: Invalid Next  Query', 'info', NAME );
                        callback( Y.doccirrus.errors.http( 400, 'Invalid Next  Query' ), null );
                        return;
                    }
                    let
                        windowDuration = data.windowDuration || 'quarters',
                        end = data.end || undefined,
                        endPlusDuration = moment( data.start ).add( 2, windowDuration );

                    if( 0 < endPlusDuration.diff( moment( end ), 'minutes' ) ) {
                        end = endPlusDuration.toISOString();
                    }
                    if( ( 'true' === data.isPreconfigured || true === data.isPreconfigured ) && !data.resourceSlotSearch ) {
                        scheduler.getNextPreconfigured(
                            {
                                limit: Number( data.n ),
                                dateFrom: data.start,
                                dateTo: end,
                                windowDuration: windowDuration,
                                calendar: data.calendar,
                                scheduleType: data.scheduleType,
                                slotSearch: true,
                                patientId: data.patientId,
                                callback: callback
                            } );
                    } else {
                        scheduler.getNextNStartTimes( {
                            n: Number( data.n ),
                            specialFlag: true,
                            isRandomMode: data.isRandomMode,
                            iterateLimit: 0,
                            windowDuration: windowDuration,
                            calendar: data.calendar,
                            forScheduleType: data.scheduleType,
                            calendarObjects: data.calendarObjects || [],
                            requiredResources: data.requiredResources || [],
                            resourceSlotSearch: data.resourceSlotSearch,
                            sparse: data.sparse,
                            slotDuration: data.duration || Y.doccirrus.scheduling.getAvgDuration(),
                            callback: callback,
                            dateFrom: data.start || undefined,
                            dateTo: end
                        } );
                    }
                } else if( 'NEXT_3RND' === data.subaction ) {
                    if( !data.calendar && !data.location ) {
                        Y.log('Calculate Schedule: Invalid Next 3 Slots Q', 'info', NAME );
                        callback( Y.doccirrus.errors.http( 400, 'Invalid Next 3 Slots Query' ), null );
                        return;
                    }
                    if( 'true' === data.isPreconfigured || true === data.isPreconfigured && !data.resourceSlotSearch ) {
                        scheduler.getNextPreconfigured(
                            {
                                limit: data.n ? Number( data.n ) : 3,
                                startTime: data.startTime,
                                endTime: data.endTime,
                                dateFrom: data.start,
                                dateTo: data.end,
                                windowDuration: 'month',
                                calendar: data.calendar,
                                scheduleType: data.scheduleType,
                                patientId: data.patientId,
                                callback: callback
                            } );
                    } else {
                        // get next slot for a particular calendar
                        scheduler.getNextNStartTimes(
                            {
                                n: data.n ? Number( data.n ) : 3,
                                startTime: data.startTime,
                                endTime: data.endTime,
                                specialFlag: true, // fix bugs MOJ-376
                                iterateLimit: 0,
                                dateFrom: data.start,
                                dateTo: data.end || ( data.start && moment( data.start ).add( 'month', 1 ).toISOString() ),
                                isRandomMode: 'true' === data.isRandomMode,
                                windowDuration: 'month',
                                sparse: 1,
                                randomize: 'true' === data.isRandomMode,
                                calendar: data.calendar,
                                forScheduleType: data.scheduleType,
                                calendarObjects: data.calendarObjects || [],
                                requiredResources: data.requiredResources || [],
                                resourceSlotSearch: data.resourceSlotSearch,
                                location: data.location,
                                slotDuration: data.duration || Y.doccirrus.scheduling.getAvgDuration(),
                                callback: callback
                            } );
                    }
                } else if( 'PUSH_EVT' === data.subaction ) {
                    // push a particular event down // deprioritise
                    if( !data._id ) {
                        callback( 'Invalid Push Query', null );
                        return;
                    }
                    scheduler.dePrioritiseEvent( user, data._id, data.location, callback );

                } else if( 'PATIENT_ARRIVED' === data.subaction ) {
                    if( data._id ) {
                        Y.doccirrus.api.calevent.updateArrivalStatus( {
                            user: user,
                            data: { _id: data._id, arrived: true, actualWaitingTimeMinutes: data.actualWaitingTimeMinutes, status: '' },
                            callback: callback
                        } );
                    } else {
                        return callback( 'Invalid ARRIVED update', null );
                    }

                } else if( 'PATIENT_NOT_ARRIVED' === data.subaction ) {
                    Y.doccirrus.api.calevent.updateArrivalStatus( {
                        user: user,
                        data: { _id: data._id, arrived: false },
                        callback: callback
                    } );

                } else if( 'PUSHINQ_EVT' === data.subaction ) {
                    // push a particular event down // deprioritise
                    if( !data._id || !data.calendar ) {
                        Y.log('Calculate Schedule: Invalid Push Query', 'info', NAME );
                        callback( Y.doccirrus.errors.http( 400, 'Invalid Push Query' ), null );
                        return;
                    }

                    scheduler.dePrioritiseEventInQ( user, data.calendar, data._id, callback );

                } else if( 'NEXT_NUM' === data.subaction ) {
                    // give us the next number
                    // since numbers are queue independent,
                    // this call requires no parameters
                    data.isFromPortal = ('true' === data.isFromPortal || true === data.isFromPortal) ? true : false;
                    scheduler.generateEventForNextNum( data, data.isFromPortal, callback );

                } else if( 'CLOSE_DAY' === data.subaction ) {
                    // give us the next number
                    // since numbers are queue independent,
                    // this call requires no parameters
                    scheduler.closeDay( null, callback );

                } else {
                    Y.log('Calculate Schedule: Invalid subaction ' + data.subaction, 'info', NAME );
                    return callback( 'Invalid subaction ' + data.subaction, null );

                }
            }

            if( data.resourceSlotSearch ) {

                let currentCalendar = data.calendar;

                [ err, scheduleTypeResources ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb({
                        user,
                        model: 'scheduletype',
                        query: { _id: data.scheduleType },
                        options: {
                            select: {
                                requiredResources: 1
                            }
                        }
                    })
                );

                if( err ) {
                    Y.log( `calculateSchedule. Error while getting resources from scheduletype: ${data.scheduleType}`, 'error', NAME );
                    return callback( err );
                }

                resourceTypes = scheduleTypeResources && scheduleTypeResources[0] &&
                                scheduleTypeResources[0].requiredResources &&
                                scheduleTypeResources[0].requiredResources.map( ( item ) => {
                                    return item.resourceType;
                                } );

                [ err, calendars ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb({
                        user,
                        model: 'calendar',
                        query: { 'resources.resourceType': {$in: resourceTypes} },
                        options: {
                            select: {
                                _id: 1,
                                resources: 1
                            }
                        }
                    })
                );

                if( err ) {
                    Y.log( `calculateSchedule. Error while getting calendars with resources: ${resourceTypes}`, 'error', NAME );
                    return callback( err );
                }

                if( !calendars || !calendars[0] ) {
                    //then we will use just 'raw' resources to book for the current calendar
                    let unAssignedResources = await getUnassignedResources( user, resourceTypes, callback );

                    calendars.push( {
                        _id: currentCalendar,
                        resources: []
                    } );

                    for( let item of unAssignedResources ) {
                        calendars[0].resources.push( {
                            resourceType: item._id,
                            resource: item.resource
                        } );
                    }
                }
                data.calendar = [];
                data.calendarObjects = [];
                data.requiredResources = [...resourceTypes];
                for( let calendar of calendars ) {
                    for( let resource of calendar.resources ) {
                        if( 'ALL' === resource.resource ) {
                            [ err, resources ] = await formatPromiseResult(
                                Y.doccirrus.mongodb.runDb({
                                    user,
                                    model: 'resource',
                                    query: { type: resource.resourceType },
                                    options: {
                                        select: {
                                            _id: 1
                                        }
                                    }
                                })
                            );

                            if( err ) {
                                Y.log( `calculateSchedule. Error while getting ALL resources of type: ${resource.resourceType}`, 'error', NAME );
                                return callback( err );
                            }
                            resource.resource = resources.map( item => item._id );
                        } else {
                            //we need this to keep resource.resource type (Array) consistent for further calculations
                            resource.resource = Array.isArray( resource.resource ) ? resource.resource : [resource.resource];
                        }

                        // check if all required resources are assigned to some calendar
                        if( resourceTypes.includes( resource.resourceType ) ) {
                            resourceTypes.splice( resourceTypes.indexOf( resource.resourceType ), 1 );
                        }
                    }
                    data.calendar.push( calendar._id.toString() );
                    data.calendarObjects.push( calendar );
                }
                if( resourceTypes && resourceTypes.length ) {
                    // means that some required resource types aren't assigned to any calendar
                    let unAssignedResources = await getUnassignedResources( user, resourceTypes, callback ),
                        formattedResources = [];

                    for( let item of unAssignedResources ) {
                        formattedResources.push( {
                            resourceType: item._id,
                            resource: item.resource
                        } );
                    }

                    data.calendar = lodash.union( data.calendar, [currentCalendar] );
                    let currentCalIndex = data.calendarObjects.findIndex( item => item._id.toString() === currentCalendar );

                    if( currentCalIndex > -1 ) {
                        data.calendarObjects[currentCalIndex].resources = [ ...data.calendarObjects[currentCalIndex].resources, ...formattedResources ];
                    } else {
                        data.calendarObjects.push( { _id: currentCalendar, resources: formattedResources } );
                    }
                }
            }

            // FIRST get the scheduler for this user,
            // THEN dispatch the request to logic.
            Y.doccirrus.scheduling.getScheduler( user, dispatchLogic );
        }

        function calculatePartnerSchedule( args ) {
            let
                { user, data, callback } = args,
                async = require( 'async' );
            if( !data.mirrorCalendarId ) {
                Y.log( `calculatePartnerSchedule. mirrorCalendarId is missing, data.mirrorCalendarId: ${data.mirrorCalendarId}`, 'error', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Invalid params.' } ) );
            }
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.api.mirrorscheduletype.getScheduleTypesForCalendar( {
                        user,
                        query: {
                            _id: data.scheduleType
                        },
                        callback: ( err, result )=>{
                            if( err ) {
                                return next( err );
                            }
                            if( result && result[0] ) {
                                data.scheduleType = result[0].originalId;
                            }
                            next();
                        }
                    } );
                },
                function( next ) {
                    Y.doccirrus.api.mirrorcalendar.getById( {
                        user,
                        query: {
                            _id: data.mirrorCalendarId
                        },
                        callback: next
                    } );
                },
                function( mirrorCalendar, next ) {
                    data.calendar = mirrorCalendar.originalId.toString();
                    Y.doccirrus.communication.callExternalApiByCustomerNo( {
                        api: 'calevent.calculateSchedule',
                        dcCustomerNo: mirrorCalendar.prcCustomerNo,
                        user: user,
                        data,
                        callback: ( err, result ) => {
                            if( err ) {
                                Y.log( `calculateSchedule in calculatePartnerSchedule failed, error: ${err && err.stack || err}`, 'error', NAME );
                                if( [504, 503].includes( err.code ) ) {
                                    return next( new Y.doccirrus.commonerrors.DCError( 'calevent_01' ) );
                                }
                                return next( err );
                            }
                            return next( null, result );
                        }
                    } );
                }
            ], callback );
        }

        function createCloseDayEvent( args ) {
            let
                {user, data, originalParams = {}, callback} = args,
                {ignoreClashes, scheduleIds} = originalParams,
                async = require( 'async' );

            if( scheduleIds && scheduleIds.length ) {
                Y.doccirrus.mongodb.runDb( {
                    action: 'delete',
                    query: {_id: {$in: scheduleIds}},
                    model: 'schedule',
                    user: user,
                    options: {
                        override: true // needed to override MAX_DELETE
                    }
                }, ( err ) => {
                    if( err ) {
                        return callback( err );
                    }
                    processData();
                } );
            } else {
                processData();
            }

            function postCloseDay( calevent, noValidation, cb ) {
                let caleventCalendars = JSON.parse( JSON.stringify( calevent.calendar ) ),
                    clashError,
                    clashedEvents = [];

                if( Array.isArray( caleventCalendars ) ) {
                    calevent.closeTimeId = new ObjectId();

                    async.eachSeries( caleventCalendars, ( calendar, innerDone ) => {
                        calevent.calendar = calendar;
                        Y.doccirrus.api.calevent.post( {
                            user: user,
                            data: calevent,
                            ignoreClashes: ignoreClashes,
                            noValidation: false,
                            callback: function( err ) {
                                if( err ) {
                                    if( 7009 === err.code ) {
                                        clashError = err;
                                        clashedEvents = [...clashedEvents, ...err.data.clashedEvents];
                                        return innerDone();
                                    }
                                    return innerDone( err );
                                }
                                return innerDone();
                            }
                        } );
                    }, ( err ) => {
                        if( err ) {
                            return cb( err );
                        }
                        if( clashError ) {
                            clashError.data.clashedEvents = clashedEvents;
                            clashError.data.closeTimeId = calevent.closeTimeId;
                            return cb( clashError );
                        }
                        return cb();
                    } );
                } else {
                    delete calevent.calendarType;
                    Y.doccirrus.api.calevent.post( {
                        user: user,
                        data: calevent,
                        callback: function( err ) {
                            if( err ) {
                                return cb( err );
                            }
                            return cb();
                        }
                    } );

                }
            }

            function processData() {
                if( data && 0 < data.length ) {
                    async.eachSeries( data, ( calevent, done ) => {
                        if( calevent._id || calevent.closeTimeId ) {
                            async.waterfall( [
                                function( next ) {
                                    let _query = {};
                                    if( calevent.closeTimeId ) {
                                        _query = {
                                            closeTimeId: calevent.closeTimeId
                                        };
                                    } else {
                                        _query = {
                                            _id: calevent._id
                                        };
                                    }
                                    Y.doccirrus.mongodb.runDb( {
                                        action: 'delete',
                                        query: _query,
                                        model: 'schedule',
                                        user: user,
                                        options: {
                                            override: true // needed to override MAX_DELETE
                                        }
                                    }, ( error ) => {
                                        if( error ) {
                                            return next( error );
                                        }
                                        return next();
                                    } );
                                },
                                function( next ) {
                                    delete calevent._id;
                                    postCloseDay( calevent, true, next );
                                }
                            ], ( error ) => {
                                if( error ) {
                                    return done( error );
                                }
                                return done();
                            } );

                        } else {
                            postCloseDay( calevent, false, done );
                        }
                    }, callback );
                } else {
                    return callback();
                }
            }
        }

        function getForCloseDayTable( args ) {
            let
                {user, data, callback} = args,
                async = require( 'async' ),
                pipeline,
                finalResult = [];

            function formatResult( result ) {
                async.eachSeries( result, ( populatedResult, done ) => {
                    Y.doccirrus.mongodb.runDb( {
                        action: 'get',
                        query: {_id: populatedResult.ids[0]},
                        model: 'schedule',
                        user: user
                    }, ( error, res ) => {
                        if( error ) {
                            return done( error );
                        }
                        res[0].calendar = populatedResult.calendars;
                        res[0].allDay = populatedResult.allDay;

                        finalResult.push( res[0] );
                        return done();
                    } );
                }, ( err ) => {
                    if( err ) {
                        return callback( err );
                    }
                    return callback( null, finalResult );
                } );

            }

            pipeline = [
                {
                    $match: {
                        closeTime: true,
                        end: {$gte: moment().startOf('day').toDate()}
                    }
                },
                {
                    $group: {
                        _id: { $ifNull: [ '$closeTimeId', "$_id" ] },
                        calendars: {$push: "$calendar"},
                        ids: {$push: "$_id"},
                        allDay: {$max: "$allDay"},
                        title: {$first: "$title"},
                        start: {$first: "$start"}
                    }
                },
                {
                    $sort: {
                        start: 1,
                        title: 1
                    }
                }
            ];

            if( data.closeDayType ) {
                pipeline[0].$match.closeDayType = data.closeDayType;
            }

            Y.doccirrus.mongodb.runDb( {
                action: 'aggregate',
                pipeline: pipeline,
                model: 'schedule',
                user: user
            }, ( err, result ) => {
                if( err ) {
                    return callback( err );
                }
                if( result && result.result ) {
                    formatResult( result.result );
                } else {
                    return callback();
                }
            } );
        }

        /**
         * @public
         * @async
         * @JsonRpcApi
         *
         * This method does below:
         * 1] Validates the data input
         * 2] Gets all distinct schedules with closeDayType: 'HOLIDAY' from DB
         * 3] Iterates through received documents and create new closeDay schedules for the new calendar.
         * 4] Posts created schedules into DB
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {string} args.data.calendarId - Id of new calendar. Setted for new closeDay schedules.
         * @param {string} args.data.calendarType - Type of new calendar. Needed to define allDay value.
         * @param {function} [args.callback] - If present then response will be sent via callback
         * @returns {Promise<undefined>}
         */
        async function addCloseTimeEventsToNewCalendar( args ) {
            const
                {user, data: {calendarId, calendarType = 'PATIENTS'}, callback} = args;
            let err, result = [], existedHolidays;

            if( !calendarId ) {
                Y.log( `addCloseTimeEventsToNewCalendar. Missing calendar id.`, 'warn', NAME );
                return handleResult( null, undefined, callback );
            }

            [err, existedHolidays] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                Y.doccirrus.api.calevent.getForCloseDayTable( {
                    user,
                    data: {closeDayType: 'HOLIDAY'},
                    callback( err, result ) {
                        if( err ) {
                            return reject( err );
                        } else {
                            return resolve( result );
                        }
                    }
                } );
            } ) );

            if( err ) {
                Y.log( `addCloseTimeEventsToNewCalendar. Error while getting HOLIDAY events: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            if( !existedHolidays || !existedHolidays[0] ) {
                Y.log( `addCloseTimeEventsToNewCalendar. There are no HOLIDAY closeEvents.`, 'info', NAME );
                return handleResult( null, {}, callback );
            }

            for( let item of existedHolidays ) {
                delete item._id;
                if( 'PATIENTS' === calendarType ) {
                    item.allDay = false;
                }
                item.calendar = calendarId;
                result.push( item );
            }

            [err] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    'model': 'schedule',
                    'action': 'post',
                    'data': Y.doccirrus.filters.cleanDbObject( result )
                } )
            );

            if( err ) {
                Y.log( `addCloseTimeEventsToNewCalendar. Error while creating new HOLIDAY events: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            return handleResult( null, {}, callback );
        }

        async function POST( args ) {
            const
                {user, data, sourceDcCustomerNo, options, callback} = args,
                sendMissingPatientMessageP = promisify( sendMissingPatientMessage ),
                registerPatientP = promisifyArgsCallback( Y.doccirrus.api.patient.registerPatient ),
                getPartnerP = promisifyArgsCallback( Y.doccirrus.api.partner.getPartner );

            let
                resultsWithWarnings,
                preparedAppointmentsWithResources,
                mastersWithResources,
                appointmentToCreate = JSON.parse( JSON.stringify( data ) ),
                appointmentValidationResult, handledValidationResult,
                patientWasNotFound = false,
                isPublicVC = appointmentToCreate.isPublicVC || false,
                registeredPatient,
                checkedPartnerScheduleWithFlag,
                err,
                scheduler,
                results;

            if( appointmentToCreate && appointmentToCreate.start && 'object' === typeof appointmentToCreate.start && !appointmentToCreate.start.toJSON ) {
                Y.log( `post. Data.start has wrong type: ${appointmentToCreate.start}`, 'error', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 400, {message: 'Bad "start" param'} ) );
            }
            Y.log( 'POST calevent: ' + JSON.stringify( appointmentToCreate ), 'debug', NAME );

            appointmentToCreate.adhoc = ('true' === appointmentToCreate.adhoc || true === appointmentToCreate.adhoc) ? true : false;

            if( appointmentToCreate.auth ) {
                delete appointmentToCreate.auth;
            }

            // MOJ-842
            appointmentToCreate.plannedDuration = appointmentToCreate.duration;
            appointmentToCreate.pushtime = 0;
            appointmentToCreate.eta = appointmentToCreate.eta ? appointmentToCreate.eta : appointmentToCreate.start;
            if( '' === appointmentToCreate.type ) {
                delete appointmentToCreate.type;
            }
            if( '' === appointmentToCreate.repetition ) {
                delete appointmentToCreate.repetition;
            }
            if( !appointmentToCreate.number ) {
                delete appointmentToCreate.number;
            }
            if( !appointmentToCreate._id ) {
                delete appointmentToCreate._id;
            }

            appointmentToCreate.start = moment( appointmentToCreate.start ).utc().toDate();
            appointmentToCreate.end = moment( appointmentToCreate.end ).utc().toDate();
            if( moment( appointmentToCreate.start ).isAfter( moment().add( 15, 's' ) ) ) {
                appointmentToCreate.scheduled = Y.doccirrus.schemas.calendar.SCH_WAITING;
            }

            if( sourceDcCustomerNo ) {
                // just try to get partner, if no err then partner exist
                [err] = await formatPromiseResult(
                    getPartnerP( {user, data: {dcCustomerNo: sourceDcCustomerNo}} )
                );
                if( err ) {
                    Y.log( `post. Error while getting partner with dcCustomerNo ${sourceDcCustomerNo}: ${err.stack || err} `, 'error', NAME );
                    return callback( err );
                }
                // check schedule
                [
                    err, checkedPartnerScheduleWithFlag] = await formatPromiseResult( checkPartnerSchedule( user, appointmentToCreate ) );

                if( err ) {
                    return callback( err );
                }
                if( checkedPartnerScheduleWithFlag && checkedPartnerScheduleWithFlag.patientWasNotFound ) {
                    patientWasNotFound = true;
                }
                if( checkedPartnerScheduleWithFlag && checkedPartnerScheduleWithFlag.appointmentToCreate ) {
                    appointmentToCreate = checkedPartnerScheduleWithFlag.appointmentToCreate;
                }
            } else {
                [err, results] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'calendar',
                        action: 'get',
                        query: {
                            _id: lodash.isArray( appointmentToCreate.calendar ) ? {$in: appointmentToCreate.calendar} : appointmentToCreate.calendar
                        },
                        options: {
                            lean: true,
                            select: {
                                mirrorCalendarId: 1
                            }
                        }
                    } )
                );

                if( err ) {
                    Y.log( `post. Error while getting calendar ${JSON.stringify( appointmentToCreate.calendar )} for appointment: ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }
                if( !results || !results.length ) {
                    Y.log( `post. Could not post schedule. Calendar not found. Calendar id: ${JSON.stringify( appointmentToCreate.calendar )}`, 'error', NAME );
                    return callback( new Y.doccirrus.commonerrors.DCError( 400, {message: 'Calendar not found'} ) );
                }

                let currentCalendar = results[0] || {};

                if( currentCalendar.mirrorCalendarId ) {
                    [err, resultsWithWarnings] = await formatPromiseResult( postPartnerSchedule( user, appointmentToCreate, currentCalendar.mirrorCalendarId ) );
                    if( err ) {
                        Y.log( `post. Error during posting partner schedule: ${err.stack || err}`, 'error', NAME );
                        return callback( err );
                    }
                    return callback( null, resultsWithWarnings.result, resultsWithWarnings.warning );
                } // if no currentCalendar.mirrorCalendarId then we should go forward in process
            }

            if( ( appointmentToCreate.isFromPortal || args.isFromPortal ) && !isPublicVC ) {
                [err] = await formatPromiseResult(
                    ppAccessCheck( user, appointmentToCreate.patientData || appointmentToCreate.patient, appointmentToCreate.isFromPortal || args.isFromPortal )
                );
                if( err ) {
                    Y.log( `post. Error during PP access check: ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }
            }

            if( !(false === appointmentToCreate.notConfirmed || true === args.noValidation ||
                  true === args.ignoreClashes || true === appointmentToCreate.bookResourceFromSearch ) ) {
                [err, scheduler] = await formatPromiseResult( getSchedulerProm( user ) );
                if( err ) {
                    Y.log( `post. Error while getting scheduler: ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }
                let
                    intimeConfig = scheduler.getConfig() || {},
                    allowAdhoc = appointmentToCreate.isFromPortal ? intimeConfig.allowAdhoc : intimeConfig.allowPRCAdhoc;

                if( appointmentToCreate.adhoc && !allowAdhoc ) {
                    return callback( Y.doccirrus.errors.http( 401, 'Number not allowed' ) );
                }

                // check the original schedule for validity
                [err, appointmentValidationResult] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                    scheduler.isValidStartAndEnd( appointmentToCreate, appointmentToCreate.isFromPortal, function( err, result ) {
                        if( err ) {
                            reject( err );
                        }
                        resolve( result );
                    } );
                } ) );

                if( err ) {
                    Y.log( `post. Error during validation of ${appointmentToCreate._id} appointment. Error: ${err.stack || err}`, 'warn', NAME );
                    return callback( err );
                }

                [err, handledValidationResult] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                    handleValidationResult( user, null, appointmentValidationResult, appointmentToCreate, ( warning ) => {
                        resolve( {warning} );
                    }, ( error, result, warning ) => {
                        if( error ) {
                            reject( error );
                        }
                        resolve( {warning} );
                    } );
                } ) );
                if( err ) {
                    Y.log( `post. Error when validation result for ${appointmentToCreate._id} appointment was handled. Error: ${err.stack || err}`, 'warn', NAME );
                    return callback( err );
                }
                if( handledValidationResult && handledValidationResult.warning ) {
                    // send back to client to confirm warnings or just to inform
                    return callback( null, null, handledValidationResult.warning );
                }
            }

            if( appointmentToCreate.requiredResources && appointmentToCreate.requiredResources.length &&
                !appointmentToCreate.bookResourceFromSearch ) {
                // flag from places where we need to create new repetitions for multiple resourceBased series
                if( appointmentToCreate.processAllMasters ) {
                    // first we should take all master of series
                    [err, mastersWithResources] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'schedule',
                            action: 'get',
                            query: {linkByResource: appointmentToCreate.linkByResource}}
                        )
                    );
                    if( err ) {
                        Y.log( `post. Error while getting masters of resourceBased series: ${err.stack || err}`, 'error', NAME );
                        return callback( err );
                    }

                    mastersWithResources.forEach( master => {
                        master.dtstart = appointmentToCreate.dtstart;
                        master.until = appointmentToCreate.until;
                    } );
                    preparedAppointmentsWithResources = mastersWithResources;

                } else {
                    //here we create resource based appointments via regular click in calendar slot
                    [err, preparedAppointmentsWithResources] = await formatPromiseResult( prepareResourcesForCalendarClickAppointments( user, appointmentToCreate ) );
                    if( err ) {
                        Y.log( `post. Error while preparing resources for calendar-click appointments: ${err.stack || err}`, 'error', NAME );
                        return callback( err );
                    }

                    if( preparedAppointmentsWithResources.warning ) {
                        return callback( null, null, preparedAppointmentsWithResources.warning );
                    }
                }

                if( Y.doccirrus.calUtils.isMasterSchedule( appointmentToCreate ) ) {
                    let seriesWithResources = [],
                        validateSerieResult,
                        warningsFromRepetitions = [],
                        serieLength;

                    // here we should create serie of appointments with resources
                    for( let resourceAppointment of preparedAppointmentsWithResources ) {
                        let [err, innerResult] = await formatPromiseResult( processRepetitions( user, resourceAppointment, options, true ) );
                        if( err ) {
                            return callback( err );
                        }
                        //collect all created series
                        seriesWithResources.push( innerResult );
                    }
                    serieLength = seriesWithResources[0].length;
                    for( let i = 0; i < serieLength; i++ ) {
                        let linkByResourceForRepetitions = new ObjectId();
                        seriesWithResources.forEach( serie =>{
                            serie[i].linkByResource = linkByResourceForRepetitions;
                        } );
                    }
                    if( false !== appointmentToCreate.notConfirmed ) {
                        // now we should validate each serie separately, collect all warnings if any and send them to client to confirm
                        for( let serie of seriesWithResources ) {
                            [err, validateSerieResult] = await formatPromiseResult( validateMasterData( user, serie[0], serie ) );
                            if( err ) {
                                throw err;
                            }
                            if( validateSerieResult && validateSerieResult.warning ) {
                                warningsFromRepetitions.push( validateSerieResult.warning );
                            }
                        }
                        if( warningsFromRepetitions.length ) {
                            return callback( null, null, handleWarnings( warningsFromRepetitions ) );
                        }
                    }

                    // if no warnings then just post
                    preparedAppointmentsWithResources = seriesWithResources.reduce( (sum, current) => sum.concat(current.map( c => c )), []);
                }

                [err, resultsWithWarnings] = await formatPromiseResult( finalPost( user, preparedAppointmentsWithResources, options ) );
                if( err ) {
                    Y.log( `post. Error during final post of preparedAppointmentsWithResources: ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }

                return callback( null, resultsWithWarnings );
            }

            if( appointmentToCreate.bookResourceFromSearch ) {
                // as we create resource based appointments from Termin suchen und buchen modal or PP,
                // we just need to check each slot validity
                appointmentToCreate.resourceBased = true;

                [err, preparedAppointmentsWithResources] = await formatPromiseResult( prepareResourcesForFoundedSlots( user, appointmentToCreate ) );
                if( err ) {
                    Y.log( `post. Error while preparing resources for founded slots: ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }

                if( preparedAppointmentsWithResources.warning ) {
                    return callback( null, null, preparedAppointmentsWithResources.warning );
                }

                if( appointmentToCreate.isFromPortal && appointmentToCreate.patientData ) {
                    appointmentToCreate.patientData._id = appointmentToCreate.patient; // id comes from patientreg
                    Y.log( `POST. register new patient from portal: ${JSON.stringify( appointmentToCreate.patientData )}`, 'debug', NAME );

                    [err, registeredPatient] = await formatPromiseResult(
                        registerPatientP( {
                            user,
                            data: appointmentToCreate.patientData
                        } )
                    );

                    if( err || !registeredPatient ) {
                        Y.log( `POST. Error registering the new patient: ${err.stack || err}`, 'error', NAME );
                        return callback( err );
                    } else {
                        preparedAppointmentsWithResources.forEach( appointment => {
                            appointment.patient = registeredPatient.patientId;
                        } );
                    }
                }

                [err, resultsWithWarnings] = await formatPromiseResult( finalPost( user, preparedAppointmentsWithResources, options ) );
                if( err ) {
                    Y.log( `post. Error during final post of preparedAppointmentsWithResources: ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }

                return callback( null, resultsWithWarnings );
            }

            [err, resultsWithWarnings] = await formatPromiseResult( doPost( user, appointmentToCreate, options ) );
            if( err ) {
                Y.log( `post. Error while posting appointment: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            if( patientWasNotFound ) {
                await formatPromiseResult( sendMissingPatientMessageP( {
                    user,
                    scheduleId: resultsWithWarnings[0] && resultsWithWarnings[0]._id
                } ) );
            }
            if( resultsWithWarnings.warning ) {
                return callback( null, null, resultsWithWarnings.warning );
            }

            return callback( null, resultsWithWarnings );
        }


        function sendMissingPatientMessage( params, callback ){

                let
                    { user, scheduleId } = params,
                    taskData = {
                        allDay: true,
                        alertTime: (new Date()).toISOString(),
                        title: i18n('calevent-api.text.PATIENT_APPOINTMENT_TASK_TITLE'),
                        urgency: 2,
                        details: i18n('calevent-api.text.PATIENT_APPOINTMENT_TASK_DETAILS'),
                        group: false,
                        roles: [ Y.doccirrus.schemas.role.DEFAULT_ROLE.EMPFANG ],
                        creatorName: "System",
                        skipcheck_: true,
                        scheduleId: scheduleId
                    };
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'task',
                    action: 'post',
                    data: taskData
                }, function( err ) {//, result
                    if( err ) {
                        Y.log( `Failed to add task: ${JSON.stringify( err )}`, 'error', NAME );
                    }
                    callback();
                } );
        }

        /**
         * Confirms a video_consultation appointment:
         * - get that appointment by given id
         * - check if it exists
         * - check if was created less than 30 min ago
         * - check if it is still UNCONFIRMED
         * - if all conditions are passed then change the 'scheduled' value to WAITING or ENDED (depends on 'start' value)
         * - update a conference connected to this schedule and set its' status to NEW
         *
         * @param {Object} user
         * @param {Object} query
         * @param {String} query._id - id of schedule which should be confirmed
         * @returns {Promise<void>}
         */
        async function confirmVCAppointment( user, query ) {
            let
                err, schedule, scheduled,
                scheduleCreatedAt = ObjectId( query._id ).getTimestamp(),
                now = moment();

            const timer = logEnter( `calevent-api.confirmVCAppointment, _id ${query._id}` );

            [err, schedule] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'schedule',
                    action: 'get',
                    query: {_id: query._id}
                } )
            );

            if( err ) {
                Y.log( `confirmVCAppointment: Error while getting appointment, id: ${query._id}. Error: ${err.stack || err}`, 'warn', NAME );
                throw err;
            }
            if( !schedule || !schedule[0] ) {
                Y.log( `confirmVCAppointment: There is no such appointment with id: ${query._id} to confirm.`, 'warn', NAME );
                throw new Y.doccirrus.commonerrors.DCError( 'calevent_08' );
            }

            if( AMOUNT_OF_MINUTES_SCHEDULE_CAN_BE_CONFIRMED < now.diff( scheduleCreatedAt, 'minutes' ) ) {
                Y.log( `confirmVCAppointment: Appointment with id: ${query._id} was confirmed too late.`, 'warn', NAME );
                throw new Y.doccirrus.commonerrors.DCError( 'calevent_07' );
            }
            if( Y.doccirrus.schemas.calendar.SCH_UNCONFIRMED !== schedule[0].scheduled ) {
                Y.log( `confirmVCAppointment: Appointment with id: ${query._id} is not unconfirmed.`, 'debug', NAME );
                return;
            }

            if( moment( schedule[0].start ).isAfter( moment().add( 15, 's' ) ) ) {
                scheduled = Y.doccirrus.schemas.calendar.SCH_WAITING;
            } else {
                scheduled = Y.doccirrus.schemas.calendar.SCH_ENDED;
            }

            [err] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'schedule',
                    action: 'put',
                    query: {_id: query._id},
                    data: Y.doccirrus.filters.cleanDbObject( {scheduled} ),
                    fields: ['scheduled']
                } )
            );
            if( err ) {
                Y.log( `confirmVCAppointment: Error while updating scheduled of appointment, id: ${query._id}. Error: ${err.stack || err}`, 'warn', NAME );
                throw err;
            }

            [err] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'conference',
                    action: 'mongoUpdate',
                    query: {_id: schedule[0].conferenceId},
                    data: {
                        $set: {status: Y.doccirrus.schemas.conference.conferenceStatuses.NEW}
                    }
                } )
            );

            if( err ) {
                Y.log( `confirmVCAppointment: Error while confirming conference , id: ${schedule[0].conferenceId}. Error: ${err.stack || err}`, 'warn', NAME );
                throw err;
            }
            logExit( timer );
            return;
        }

        /**
         * all interactions with calendar in terms of event happens here
         * calevent is a virtual model that represents repetition and schedule models
         *
         * @class calevent
         * @type {{name: *}}
         */
        Y.namespace( 'doccirrus.api' ).calevent = {

            name: NAME,
            ppAccessCheck: ppAccessCheck,
            get: function( args ) {
                Y.log('Entering Y.doccirrus.api.calevent.get', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.calevent.get');
                }
                const
                    async = require( 'async' );
                var
                    user = args.user,
                    params = args.originalParams || {},
                    _callback = args.callback,
                    options = args.options,
                    query = args.query,
                    isRepetition = ('repetition' === params.eventType) || (params.linkSeries && 'undefined' !== params.linkSeries);
                function callback( err, results ) {
                    if( err ) {
                        return _callback( err );
                    }
                    if( Array.isArray( results ) ) {
                        return async.mapSeries( results, ( schedule, next ) => {
                            if( schedule && schedule.conferenceId ) {
                                Y.doccirrus.mongodb.runDb( {
                                    user,
                                    model: 'conference',
                                    action: 'get',
                                    query: {
                                        _id: schedule.conferenceId
                                    }
                                }, ( err, results ) => {
                                    if( err ) {
                                        return next( err );
                                    }
                                    if( results[ 0 ] ) {
                                        delete results[ 0 ]._id;
                                    }
                                    next( null, Object.assign( schedule, results[ 0 ] ) );
                                } );
                            } else {
                                setImmediate( next, null, schedule );
                            }
                        }, _callback );
                    }
                    _callback( null, results );
                }
                // copy the fields that should be inherited from the master
                function copyFields( receiver, masterSchedule ) {
                    var
                        source = masterSchedule && JSON.parse( JSON.stringify( masterSchedule ) ),
                        repetitionFields = Y.doccirrus.schemas.calendar.getRecurrenceFields(),
                        field;

                    // add missing fields from master schedule
                    for( field in source ) {
                        if( source.hasOwnProperty( field ) ) {
                            if( undefined === receiver[field] ) {
                                receiver[field] = source[field];
                            }
                        }
                    }

                    // overwrite repetition fields
                    for( field in repetitionFields ) {
                        if( repetitionFields.hasOwnProperty( field ) ) {
                            receiver[field] = source[field];
                        }
                    }
                }

                /**
                 * mix data from master schedule into the repetition
                 * @param   {Object}          repetition
                 * @return  {Function}        callback
                 */
                function getRealCalevent( repetition ) {
                    var
                        calevent;

                    if( repetition && repetition.linkSeries ) { // if real repetition
                        calevent = repetition;
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            action: 'get',
                            model: 'schedule',
                            query: { _id: repetition.linkSeries },
                            callback: function( err1, result1 ) {
                                if( err1 || !result1 || !result1[0] ) {
                                    Y.log('getRealCalevent: master schedule not found', 'info', NAME );
                                    return callback( err1 || Y.doccirrus.errors.http( 400, 'master schedule not found' ) );
                                }
                                copyFields( calevent, result1[0] );
                                callback( null, [calevent] );
                            }
                        } );
                    } else {
                        return callback( null, [repetition] );
                    }
                }

                function getVirtualEvent( err, result ) { // TODO real repetition is not used here, e.g. the calevent could have been marked deleted
                    var
                        myCalevent;
                    if( err || !result || !result[0] ) {
                        Y.log( 'error getting base schedule for virtual calevent: ' + err, 'error', NAME );
                        return callback( err || Y.doccirrus.errors.http( 500, 'error getting calevent' ) );

                    }
                    myCalevent = Y.doccirrus.calUtils.getVirtualCalevent( result[0], params.start );
                    callback( null, [myCalevent] );
                }

                /**
                 * check if for the given parameters there exists a repetition in DB.
                 * becasue sometimes it's a real rep. but front-end doesn't know the id.
                 * we get here only if the id of that repetition is not provided
                 * @param   {Object}          err
                 * @param   {Array}           result            [repetition]
                 */
                function checkRealRepetition( err, result ) {
                    var
                        realRep = result && result[0];
                    if( err ) {
                        callback( err );
                        return;
                    }

                    if( realRep ) {
                        getRealCalevent( realRep );

                    } else {    // then it is really a virtual one!
                        // get the base schedule
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'schedule',
                            query: { _id: params.linkSeries },
                            options: { limit: 1 },
                            callback: getVirtualEvent
                        } );
                    }
                }

                query = getQuery( query ); // must be an id
                if( query ) { // if a unique real calevent, try schedules, if no result then try repetitions
                    Y.log( 'GET Calevent: ' + JSON.stringify( query ), 'debug', NAME );
                    // get the real calevent
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'schedule',
                        query: query,
                        options: { limit: 1 },
                        callback: function( err, scheduleResult ) {
                            if( err ) {
                               return callback( err );
                            }
                            if( scheduleResult && scheduleResult[0] ) {
                                return callback( null, scheduleResult );
                            }
                             // then could be a real repetition
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'schedule',
                                query: query,
                                options: { limit: 1 },
                                callback: function( err1, repResult ) {
                                    if( err ) {
                                        return callback( err1 );
                                    }
                                    getRealCalevent( repResult && repResult[0] );
                                }
                            } );
                        }
                    } );

                } else if( isRepetition && params.start ) { // a unique virtual calevent
                    Y.log( 'getting a series member, params: ' + require( 'util' ).inspect( params ), 'debug', NAME );
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'schedule',
                        query: { linkSeries: params.linkSeries },
                        options: { limit: 1 },
                        callback: checkRealRepetition
                    } );

                } else if( params.linkByResource ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'schedule',
                        query: {
                            isReadOnly: {$ne: true},
                            linkByResource: params.linkByResource
                        },
                        options: { limit: 1 },
                        callback: function( err, result ) {
                            if( err ) {
                                Y.log( `get. Error while getting linkByResource ${params.linkByResource} schedule for readOnly schedule. Error: ${err.stack || err}`, 'warn', NAME );
                                return callback( err );
                            }
                            return callback( null, result );
                        }
                    } );
                } else {
                    // a search query
                    Y.log( 'getEventList params: ' + require( 'util' ).inspect( params ), 'debug', NAME );
                    Y.doccirrus.calUtils.getEventList( user, {
                        show: params.show || 'none',
                        calendar: params.calendar || '',
                        location: params.location || '',
                        patient: params.patient || '',
                        calendarType: params.calendarType || 'real',
                        eventType: params.eventType || 'all',
                        scheduled: params.scheduled || 'all',
                        dateFrom: params.dateFrom || 'all',
                        dateTo: params.dateTo || '',
                        duration: params.duration || '',
                        useEnd: params.useEnd || false,
                        number: params.number || '',
                        fullText: params.fullText || '',
                        sort: options.sort || { start: 1, number: 1 },
                        limit: params.limit || '',
                        consult: params.consult || false,
                        negate: params.negate || false,
                        noRealign: (undefined === params.noRealign) ? true : params.noRealign,
                        callback: callback
                    } );
                }

            },

            /**
             * if an id is provided then determine the target model (i.e repetition or schedule) and do the PUT,
             * otherwise it is a virtual repetition then a real repetition will be created for it
             *
             * Always validates new data first unless noValidate=true
             * noValidate can be set only for internal calls, user's data must always go through validation
             * there are two separate validation routines for single entries and repetitions
             *
             * real repetitions are will get isCustomised=true if thay have changed compared to their original data
             * if the changes are to be applied to whole series then only modified field will be considered. That is we don't overwrite
             * a series master data with received repetition data
             *
             * if data contains a series entry, depending on parameters either updates the entry or the master series data
             *
             * @param   {Object}            args
             * @param   {Object}            args.data
             * @param   {String | Boolean}  args.data.editAll           apply changes on master schedule
             * @param   {Boolean}           args.data.alsoFuture        split the series (from the selected entry) and apply changes to the second half of series
             *
             *
             */
            put: async function( args ) {
                Y.log('Entering Y.doccirrus.api.calevent.put', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.calevent.put');
                }
                let
                    { user, data, callback, sourceDcCustomerNo } = args,
                    moment = require( 'moment' ),
                    originalData = Y.clone( data, true ),
                    query = getQuery( args.query ), // only id allowed
                    editSeries = (true === data.editAll || 'true' === data.editAll),
                    thisAndFutureReps = data.alsoFuture,
                    isManualChange = data.isManualChange,
                    async = require( 'async' ),
                    patientWasNotFound = false,
                    wasSentToPartner = false,
                    originalPatient = data.patient;
                if( data && data.start && 'object' === typeof data.start && !data.start.toJSON ) {
                    Y.log( `calevent post error. Data.start has wrong type: ${data.start}`, 'error', NAME );
                    return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Bad "start" param' } ) );
                }
                function finalCb( err, result, warnings ) {
                    if( err ) {
                        return callback( err, result, warnings );
                    }
                    if( !result ){
                        return callback( null, null, warnings );
                    }
                    if( !result.partner || !result.partner.dcCustomerNo ) {
                        return callback( null, result, warnings );
                    }
                    if( wasSentToPartner ) {
                        return callback( null, result, warnings );
                    }
                    Y.doccirrus.communication.callExternalApiByCustomerNo( {
                        api: 'calevent.updatePartnerSchedule',
                        dcCustomerNo: result.partner.dcCustomerNo,
                        user: user,
                        data: Object.assign( {}, result && result.toObject && result.toObject() || result, { originalPatientId: originalPatient && originalPatient.toString() } ),
                        callback( err, _result = {} ) {
                            if( err ) {
                                Y.log( `external updatePartnerSchedule failed. Trace: ${err && err.stack || err}`, 'error', NAME );
                            }
                            callback( null, Object.assign( { _warning: warnings }, result && result.toObject && result.toObject() || result ), err || warnings || _result._warning );
                        }
                    } );
                }

                data.adhoc = ('true' === data.adhoc || true === data.adhoc) ? true : false;
                args.fields = args.fields || '';

                if( query && query._id && data && data.confirmedVC ) {
                    // point to confirm VC appointment from PP
                    let [err] = await formatPromiseResult( confirmVCAppointment( user, query) );
                    if( err ) {
                        Y.log( `put: Error while confirming VC appointment, id: ${query._id}. Error: ${err.stack || err}`, 'warn', NAME );
                        return callback( err );
                    }
                    return callback();
                }

                function updateMasterUntil( data, _cb ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'schedule',
                        action: 'put',
                        query: { _id: data._id },
                        fields: [ 'until' ],
                        data: Y.doccirrus.filters.cleanDbObject( data ),
                        noAudit: true
                    }, function( err, result ) {
                        if( err ) {
                            return _cb( err );
                        }
                        return _cb( null, result );
                    } );
                }

                function setRepetitionToNONE( data, args, _cb ) {
                    async.parallel( {
                        deleteAllRepetitions: function( done ) {
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'schedule',
                                action: 'delete',
                                options: {
                                    override: true
                                },
                                query: { linkSeries: data._id }
                            }, done );
                        },
                        convertMasterToNormal: function( done ) {
                            data.dtstart = null;
                            data.until = null;
                            data.repetition = 'NONE';
                            data.byweekday = [];

                            data = Y.doccirrus.filters.cleanDbObject( data );
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'schedule',
                                action: 'put',
                                query: { _id: data._id },
                                fields: args.fields,
                                data: data
                            }, done );
                        }
                    }, function( err ) {
                        if( err ) {
                            return _cb( err, null, null );
                        }
                        return _cb( null, [], null );
                    } );
                }

                function createSerieFromNormalSchedule( data, args, _cb ) {

                    async.series( {
                        deleteCurrentSchedule: function( done ) {
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'schedule',
                                action: 'delete',
                                query: { _id: data._id }
                            }, done );
                        },
                        postNewSerie: function( done ) {
                            delete data._id;
                            Y.doccirrus.api.calevent.post( {
                                user: user,
                                data: data,
                                callback: function( err, res ) {
                                    if( err ) {
                                        return _cb( err );
                                    } else if( !res ) {
                                        return _cb( null, [] );
                                    }
                                    return done();
                                }
                            } );
                        }
                    }, function( err ) {
                        if( err ) {
                            return _cb( err, null, null );
                        }
                        return _cb( null, [], null );
                    } );
                }

                function changeRepetitionType( data, _cb ) {
                    async.parallel( {
                        deleteWholeSerie: function( done ) {
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'schedule',
                                action: 'delete',
                                options: {
                                    override: true
                                },
                                query: {
                                    $or: [
                                        { linkSeries: data._id },
                                        { _id: data._id }
                                    ]
                                }
                            }, done );
                        },
                        createNewSerie: function( done ) {
                            delete data._id;
                            Y.doccirrus.api.calevent.post( {
                                user: user,
                                data: data,
                                callback: function( err, res ) {
                                    if( err ) {
                                        return done( err, null );
                                    } else {
                                        return done( null, res );
                                    }
                                }
                            } );
                        }
                    }, function( err, results ) {
                        if( err ) {
                            return _cb( err, null, null );
                        }
                        if( data.forTest ) {
                            return _cb( null, results.createNewSerie, null );
                        } else {
                            return _cb( null, [], null );
                        }

                    } );
                }

                function changeSeriesRange( originalSchedule, data, args, tmpUntil, _cb ) {
                    async.series( {
                        moveMaster: function( next ) {
                            if( JSON.stringify( originalSchedule.dtstart ) !== JSON.stringify( data.dtstart ) ) {
                                //move master
                                let str;
                                data.start = new Date( data.start );
                                data.start = moment( data.dtstart ).hour( data.start.getHours() ).minute( data.start.getMinutes() )
                                    .second( data.start.getSeconds() ).millisecond( 0 );
                                data.start = moment( data.start ).utc().toDate();
                                data.end = moment( data.start ) + data.duration * 60 * 1000;
                                data.end = moment( data.end ).utc().toDate();
                                data.eta = data.start;
                                data = Y.doccirrus.filters.cleanDbObject( data );
                                args.fields.push( 'start' );
                                args.fields.push( 'end' );
                                args.fields.push( 'eta' );
                                args.fields = args.fields.sort();
                                args.fields = args.fields.filter( function( k ) {
                                    if( str === k ) {
                                        return false;
                                    }
                                    str = k;
                                    return true;
                                } );
                                Y.doccirrus.mongodb.runDb( {
                                    user: user,
                                    model: 'schedule',
                                    action: 'put',
                                    query: { _id: data._id },
                                    fields: args.fields,
                                    data: data,
                                    noAudit: true
                                }, function( err, result ) {
                                    if( err ) {
                                        return next( err );
                                    }
                                    next( null, result );
                                } );
                            } else {
                                return next( null, [] );
                            }
                        },
                        deleteLostRepetitions: function( next ) {
                            if( ( JSON.stringify( originalSchedule.dtstart ) < JSON.stringify( data.dtstart ) ) || ( JSON.stringify( originalSchedule.until ) > JSON.stringify( data.until ) ) ) {
                                //delete lost repetitions
                                async.parallel( {
                                    deleteRepetitions: function( innerNext ) {
                                        Y.doccirrus.mongodb.runDb( {
                                            user: user,
                                            model: 'schedule',
                                            action: 'delete',
                                            options: {
                                                override: true
                                            },
                                            query: {
                                                linkSeries: data._id,
                                                $or: [
                                                    { start: { $lt: moment( data.dtstart ).add( 1, 'day' ) } },
                                                    { start: { $gt: moment( data.until ).add( 1, 'day' ) } }
                                                ]
                                            }
                                        }, function( err, result ) {
                                            if( err ) {
                                                return next( err );
                                            }
                                            return innerNext( err, result );
                                        } );
                                    },
                                    updateMastersUntil: function( innerNext ) {
                                        if( JSON.stringify( originalSchedule.until ) > JSON.stringify( data.until ) ) {
                                            return updateMasterUntil( data, innerNext );
                                        }
                                        else {
                                            return innerNext( null, [] );
                                        }
                                    }
                                }, function( err, results ) {
                                    if( err ) {
                                        return next( err );
                                    }
                                    return next( null, results );
                                } );
                            } else {
                                return next( null, [] );
                            }
                        },
                        addRepetitionsToHead: function( next ) {
                            if( JSON.stringify( originalSchedule.dtstart ) > JSON.stringify( data.dtstart ) ) {
                                //create new repetitions at the head of serie
                                data.dtstart = moment( data.dtstart ).add( 1, 'day' ).utc().format();
                                data.until = moment( originalSchedule.dtstart ).utc().format();
                                if( data.resourceBased ) {
                                    data.processAllMasters = true;
                                }
                                Y.doccirrus.api.calevent.post( {
                                    user: user,
                                    data: data,
                                    callback: function( err, result ) {
                                        if( err ) {
                                            return next( err );
                                        }
                                        return next( null, result );
                                    }
                                } );
                            } else {
                                return next( null, [] );
                            }
                        },
                        addRepetitionsToTail: function( next ) {
                            if( JSON.stringify( originalSchedule.until ) < JSON.stringify( tmpUntil ) ) {
                                //create new repetitions at the tail of serie
                                data.dtstart = moment( originalSchedule.until ).add( 1, 'day' ).utc().format();
                                data.until = tmpUntil;
                                if( data.resourceBased ) {
                                    data.processAllMasters = true;
                                }
                                async.parallel( {
                                        postRepetitions: function( innerNext ) {
                                            Y.doccirrus.api.calevent.post( {
                                                user: user,
                                                data: data,
                                                callback: function( err, result ) {
                                                    if( err ) {
                                                        return next( err );
                                                    }
                                                    innerNext( null, result );
                                                }
                                            } );
                                        },
                                        updateMastersUntil: function( innerNext ) {
                                            return updateMasterUntil( data, innerNext );
                                        }
                                    }, function( error, res ) {
                                        if( error ) {
                                            return next( error, null );
                                        } else {

                                            return next( null, res );
                                        }
                                    }
                                );

                            } else {
                                return next( null, [] );
                            }
                        }
                    }, function( err, results ) {
                        if( err ) {
                            return _cb( err, null, null );
                        }
                        if( data.forTest ) {
                            return _cb( null, results, null );
                        } else {
                            return _cb( null, [], null );
                        }

                    } );
                }

                function putCalevent( warnings, callback ) {
                    //MOJ-959, update: eta = start
                    if( -1 < args.fields.indexOf( 'start' ) && data.changeEta ) {
                        args.fields.push( 'eta' );
                        data.eta = data.start;
                    }

                    // MOJ-842 moving event back and forth between WarteListe and AufrufListe
                    // also has side-effects that are unwanted

                    if( -1 < args.fields.indexOf( 'duration' ) ) {
                        data.plannedDuration = data.duration;
                    }
                    if( editSeries || thisAndFutureReps ) { // modify all repetitions in the series, i.e. only the master schedule
                        if( data.linkSeries ) {
                            updateMasterSchedule( user, originalData, data.linkSeries, thisAndFutureReps, function( err, result ) {
                                callback( err, result, warnings );
                            } );
                        } else {
                            updateMasterSchedule( user, originalData, data._id, thisAndFutureReps, function( err, result ) {
                                callback( err, result, warnings );
                            } );
                        }
                    } else if( query ) { // if _id is provided
                        if( true === data.adhoc || 'true' === data.adhoc ) { // user may not change start time of adhoc
                            args.fields = Y.Array.filter( args.fields, function( field ) {
                                return 'eta' !== field && 'start' !== field;
                            } );
                        }

                        if( ( args.fields.includes( 'dtstart' ) || args.fields.includes( 'until' ) || args.fields.includes( 'repetition' ) || args.fields.includes( 'interval' ) ) && !args.fields.includes( 'bysetpos' ) ){
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'schedule',
                                action: 'get',
                                query: query
                            }, function( err, result ) {
                                if( err ) {
                                    Y.log( 'Cannot get master schedule for update: ' + JSON.stringify( err ), 'error', NAME );
                                    return callback( err );
                                } else {
                                    if( 'NONE' === data.repetition && 'NONE' !== result[0].repetition ){
                                        //delete all repetitions from serie, convert master to normal schedule
                                        return setRepetitionToNONE( data, args, callback );
                                    } else if( 'NONE' !== data.repetition && 'NONE' === result[0].repetition ){
                                        //create serie from normal schedule
                                        return createSerieFromNormalSchedule( data, args, callback );
                                    } else if( data.repetition !== result[0].repetition || ( 'DAILY' === data.repetition && data.interval !== result[0].interval ) ){
                                        //convert serie from DAILY to WEEKLY and vise versa / change interval of DAILY serie
                                        return changeRepetitionType( data, callback );
                                    } else if( args.fields.includes( 'dtstart' ) || args.fields.includes( 'until' ) ){
                                        let tmpUntil = data.until;
                                        return changeSeriesRange( result[0], data, args, tmpUntil, callback );
                                    } else {
                                        return callback( null, [], null );
                                    }
                                }
                            } );
                        } else {

                            if( !data.hasOwnProperty( 'isCustomised' ) ) {
                                data.isCustomised = true; // exists only in repetition schema
                            }

                            data = Y.doccirrus.calUtils.cleanCalevent( data );
                            if( data.fields_ ) {
                                args.fields = args.fields.concat( data.fields_.split( ',' ) );
                                delete data.fields_;
                            }

                            if( -1 < args.fields.indexOf( 'eta' ) && null === data.eta ) {
                                args.fields = Y.Array.filter( args.fields, function( field ) {
                                    return 'eta' !== field;
                                } );
                            }

                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'schedule',
                                action: 'get',
                                query: query
                            }, function( err, originSchedule ) {
                                if( err ) {
                                    Y.log( 'Cannot get master schedule for update: ' + JSON.stringify( err.stack || err ), 'error', NAME );
                                    return callback( err );
                                }
                                if ( new Date(originSchedule[0] && originSchedule[0].start ).getDate() !== new Date( data.start ).getDate() ) {
                                    data.roomId = null;
                                    data.orderInRoom = null;
                                    data.wasInTreatment = false;
                                    data.arrivalTime = new Date('2115-01-31T23:00:00.000Z');
                                    args.fields.push('roomId');
                                    args.fields.push('orderInRoom');
                                    args.fields.push('arrivalTime');
                                    args.fields.push('wasInTreatment');
                                }
                                data = Y.doccirrus.filters.cleanDbObject( data );
                                Y.doccirrus.mongodb.runDb( {
                                    user,
                                    model: 'schedule',
                                    action: 'put',
                                    fields: args.fields,
                                    query,
                                    data,
                                    noAudit: data.noAudit || false,
                                    context: { isManualChange }
                                }, function( err, result ) {
                                    if( err ) {
                                        Y.log( `putCalevent: error updating schedule:  ${err.stack || err}`, 'error', NAME );
                                        return callback( err );

                                    } else {
                                        // to resolve MOJ-11833 eta needs to be added to the schedule document
                                        // set eta to start time if not existing
                                        if( isManualChange ) {
                                            data.eta = data.eta || data.start;
                                            return manualUpdate( user, query, data, warnings, callback );
                                        }
                                        return callback( err, result, warnings );
                                    }
                                } );

                            });

                        }

                    } else {
                        return callback( Y.doccirrus.errors.http( 400, 'invalid calevent PUT' ) );
                    }
                } //putCalevent

                function manualUpdate( user, query, data, warnings, callback ) {
                    data = Y.doccirrus.filters.cleanDbObject( data );
                    Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'schedule',
                            action: 'put',
                            fields: 'eta',
                            query: query,
                            data: data,
                            noAudit: data.noAudit || false
                        }, function( err, result ) {
                            if( err ) {
                                Y.log( 'error updating eta of the schedule: ' + JSON.stringify( err ) );
                                return callback( err );

                            } else {
                                return callback( err, result, warnings );
                            }
                        }
                    );
                }

                Y.log( 'PUT calevent: ' + JSON.stringify( data ), 'debug', NAME );

                // handle fields
                // this is just a hack, args.fields should always be an array
                // and no data.fields_
                if( 'string' === typeof args.fields ) {
                    args.fields = args.fields.split( ',' );
                }
                if( 'string' === typeof data.fields_ ) {
                    args.fields = args.fields.concat( data.fields_.split( ',' ) );
                }
                if( Array.isArray( data.fields_ ) ) {
                    args.fields.push( ...data.fields_ );
                }
                delete data.fields_;

                function processScheduleUpdate( schedule, callback ) {
                    async.waterfall( [
                        function( next ) {
                            if( !sourceDcCustomerNo ) {
                                return setImmediate( next );
                            }
                            Y.doccirrus.api.partner.getPartner( {
                                user,
                                data: {
                                    dcCustomerNo: sourceDcCustomerNo
                                },
                                callback( err ){
                                    next( err );
                                }
                            } );
                        },
                        function( next ) {
                            if( !sourceDcCustomerNo ) {
                                return setImmediate( next );
                            }
                            Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'calendar',
                                action: 'get',
                                query: {
                                    _id: schedule.calendar
                                },
                                options: {
                                    lean: true,
                                    select: {
                                        isShared: 1
                                    }
                                }
                            }, ( err, results ) => {
                                if( err ) {
                                    return next( err );
                                }
                                if( !results.length ) {
                                    Y.log( ` Could not update schedule. Calendar not found. Calendar id: ${schedule.calendar}`, 'error', NAME );
                                    return next( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Calendar not found' } ) );
                                }
                                if( !results[ 0 ].isShared ) {
                                    Y.log( ` Could not update schedule. Calendar is not shared. Calendar id: ${schedule.calendar}`, 'error', NAME );
                                    return next( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Calendar not found' } ) );
                                }
                                next();
                            } );
                        },
                        function( next ) {
                            if( !sourceDcCustomerNo ) {
                                return setImmediate( next );
                            }
                            Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'scheduletype',
                                action: 'get',
                                query: {
                                    _id: data.scheduletype
                                },
                                options: {
                                    limit: 1
                                }
                            }, ( err, results ) => {
                                if( err ) {
                                    return next( err );
                                }
                                if( !results.length ) {
                                    Y.log( ` Could not update partner schedule. Scheduletype entry not found. Scheduletype: ${data.scheduletype}`, 'error', NAME );
                                    return next( new Y.doccirrus.commonerrors.DCError( 70001 ) );
                                }
                                next();
                            } );
                        },
                        function( next ) {
                            if( !sourceDcCustomerNo || !data.patient ) {
                                return setImmediate( next );
                            }
                            Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'patient',
                                action: 'get',
                                query: {
                                    mirrorPatientId: data.patient
                                }
                            }, ( err, results ) => {
                                if( err ) {
                                    return next( err );
                                }
                                if( !results.length ) {
                                    delete data.patient;
                                    patientWasNotFound = true;
                                    return next();
                                }
                                data.patient = results[ 0 ]._id;
                                delete data.title;
                                next();
                            } );
                        },
                        function( next ) {
                            if( args.noValidation || ( args.originalParams && args.originalParams.noValidation ) ) {
                                putCalevent( null, next );

                            } else if( editSeries && Y.doccirrus.calUtils.isMasterSchedule( data ) ) { // if a series then check the whole series against closed/consult times
                                // entire series is changing
                                Y.doccirrus.calUtils.validateSeries( user, data, function( err, resultObj ) {
                                    handleValidationResult( user, err, resultObj, data, ( warning ) => {
                                        putCalevent( warning, next );
                                    }, next );
                                } );

                            } else {
                                Y.doccirrus.scheduling.getScheduler( user, async function schedCb( err, sched ) {
                                    if( err ){
                                        Y.log( 'error on getScheduler' + err.message, 'error', NAME );
                                    }
                                    if( thisAndFutureReps ) { // no validation for series updates, or server calls
                                        putCalevent( null, next );
                                    } else {
                                        if( data.linkByResource && data.notConfirmed ) {
                                            // means that we should check all schedules with same linkByResource value for validity
                                            let warningsFromResources = [], mainValidationResult, handledMainResult,
                                                putResult,
                                                [err, linkByResourceSchedules] = await formatPromiseResult(
                                                    Y.doccirrus.mongodb.runDb( {
                                                        user,
                                                        model: 'schedule',
                                                        query: {
                                                            _id: {$ne: data._id},
                                                            linkByResource: data.linkByResource
                                                        }
                                                    } )
                                                );
                                            if( err ) {
                                                Y.log( `put. Error getting linkByResource schedules for validation. Error: ${err.stack || err}`, 'warn', NAME );
                                                return next( err );
                                            }

                                            for( let schedule of linkByResourceSchedules ) {
                                                let innerCopy = {...schedule, start: data.start, end: data.end},
                                                    err, copyValidationResult, handledCopyResult;

                                                [err, copyValidationResult] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                                                    sched.isValidStartAndEnd( innerCopy, false, function( err, result ) {
                                                        if( err ) {
                                                            reject( err );
                                                        }
                                                        resolve( result );
                                                    } );
                                                } ) );

                                                if( err ) {
                                                    Y.log( `put. Error during validation of ${schedule._id} appointment. Error: ${err.stack || err}`, 'warn', NAME );
                                                    return next( err );
                                                }

                                                [err, handledCopyResult] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                                                    handleValidationResult( user, err, copyValidationResult, innerCopy, ( warning ) => {
                                                        resolve( {warning} );
                                                    }, ( error, result, warning ) => {
                                                        if( error ) {
                                                            reject( error );
                                                        }
                                                        resolve( {warning} );
                                                    } );
                                                } ) );
                                                if( err ) {
                                                    Y.log( `put. Error when validation result for ${schedule._id} appointment was handled. Error: ${err.stack || err}`, 'warn', NAME );
                                                    return next( err );
                                                }
                                                if( handledCopyResult && handledCopyResult.warning ) {
                                                    warningsFromResources.push( handledCopyResult.warning );
                                                }
                                            }

                                            // check the original schedule for validity
                                            [err, mainValidationResult] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                                                sched.isValidStartAndEnd( data, data.isFromPortal, function( err, result ) {
                                                    if( err ) {
                                                        reject( err );
                                                    }
                                                    resolve( result );
                                                } );
                                            } ) );

                                            if( err ) {
                                                Y.log( `put. Error during validation of main ${data._id} appointment. Error: ${err.stack || err}`, 'warn', NAME );
                                                return next( err );
                                            }

                                            [err, handledMainResult] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                                                handleValidationResult( user, err, mainValidationResult, data, ( warning ) => {
                                                    resolve( {warning} );
                                                }, ( error, result, warning ) => {
                                                    if( error ) {
                                                        reject( error );
                                                    }
                                                    resolve( {warning} );
                                                } );
                                            } ) );
                                            if( err ) {
                                                Y.log( `put. Error when validation result for main ${data._id} appointment was handled. Error: ${err.stack || err}`, 'warn', NAME );
                                                return next( err );
                                            }
                                            if( handledMainResult && handledMainResult.warning ) {
                                                warningsFromResources.push( handledMainResult.warning );
                                            }

                                            // if we have any warning after validation of main schedule or it's linkByResource copies,
                                            // we should send them to the client to confirm
                                            if( warningsFromResources && warningsFromResources.length ) {
                                                return next( null, null, handleWarnings( warningsFromResources ) );
                                            }

                                            [err, putResult] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                                                putCalevent( [...warningsFromResources], ( err, result, warnings ) => {
                                                    if( err ) {
                                                        reject( err );
                                                    }
                                                    resolve( {result, warnings} );
                                                } );
                                            } ) );
                                            return next( err, putResult && putResult.result, putResult && putResult.warnings );
                                        } else {
                                            sched.isValidStartAndEnd( data, data.isFromPortal, function( err, resultObj ) {
                                                handleValidationResult( user, err, resultObj, data, ( warning ) => {
                                                    putCalevent( warning, next );
                                                }, next );
                                            } );
                                        }
                                    }
                                } );
                            }
                        }
                    ], callback );
                }

                function sendUpdateToPartner( schedule, callback ) {
                    let
                        partnerData = Object.assign( {}, data );
                    delete partnerData._id;
                    delete partnerData.calendar;
                    delete partnerData.partner;

                    async.waterfall( [
                        function( next ) {
                            if( !data.scheduletype ) {
                                return setImmediate( next );
                            }
                            Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'mirrorscheduletype',
                                action: 'get',
                                query: {
                                    _id: data.scheduletype
                                },
                                options: {
                                    lean: true,
                                    select: {
                                        originalId: 1
                                    }
                                }
                            }, ( err, results ) => {
                                if( err ) {
                                    return next( err );
                                }
                                if( !results.length ) {
                                    Y.log( `sendUpdateToPartner. Mirror schedule type not found`, 'error', NAME );
                                    return next( new Y.doccirrus.commonerrors.DCError( 400, { message: 'schedule type not found' } ) );
                                }
                                partnerData.scheduletype = results[ 0 ].originalId;
                                next();
                            } );
                        },
                        function( next ) {
                            wasSentToPartner = true;
                            partnerData.fields_ = Object.keys( partnerData );
                            if( args.fields && args.fields.includes( 'bysetpos' ) ) {
                                partnerData.fields_.push( 'bysetpos' );
                            }
                            Y.doccirrus.communication.callExternalApiByCustomerNo( {
                                api: 'calevent.put',
                                dcCustomerNo: schedule.partner.dcCustomerNo,
                                user: user,
                                query: {
                                    _id: schedule.partner.scheduleId
                                },
                                data: partnerData,
                                callback( err, results ) {
                                    let
                                        warning;
                                    if( err ) {
                                        Y.log( `sendUpdateToPartner. External put failed, error: ${err && err.stack || err}`, 'error', NAME );
                                        if( "calevent_08" === err.code ) {
                                            return processScheduleUpdate( schedule, ( _err, _results ) => {
                                                next( null, _results, err );
                                            } );
                                        }
                                        return next( err );
                                    }
                                    if( results._warning ) {
                                        warning = results._warning;
                                        delete results._warning;
                                    }
                                    next( null, results, warning );
                                }
                            } );
                        }
                    ], callback );
                }

                async.waterfall( [
                    function( next ) {
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'schedule',
                            action: 'get',
                            query,
                            options: {
                                lean: true,
                                select: {
                                    partner: 1,
                                    calendar: 1
                                }
                            }
                        }, ( err, results ) => {
                            if( err ) {
                                return next( err );
                            }
                            if( !results[ 0 ] ) {
                                Y.log( `Could not update schedule. Schedule for query: ${JSON.stringify( query )} was not found`, 'error', NAME );
                                return next( new Y.doccirrus.commonerrors.DCError( "calevent_08" ) );
                            }
                            if( results[ 0 ] && results[ 0 ].partner && results[ 0 ].partner.scheduleId ) {
                                sendUpdateToPartner( results[ 0 ], next );
                            } else {
                                processScheduleUpdate( results[ 0 ], next );
                            }
                        } );
                    }
                ], function( err, results, warning ) {
                    if( err ) {
                        return finalCb( err );
                    }
                    if( patientWasNotFound ) {
                        return sendMissingPatientMessage( { user, scheduleId: results._id }, function() {
                            finalCb( null, results, new Y.doccirrus.commonerrors.DCError( 100002 ) );
                        } );
                    }
                    finalCb( null, results, warning );
                } );
            }, //put
            /**
             * Partner prc calls this function to update(sync) schedule.
             * @method updatePartnerSchedule
             * @param {Object} args
             * @param {Object} args.user
             * @param {Object} args.data
             * @param {Object} args.sourceDcCustomerNo
             * @param {Function} args.callback
             * @return {Function} callback
             */
            updatePartnerSchedule( args ){
                Y.log('Entering Y.doccirrus.api.calevent.updatePartnerSchedule', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.calevent.updatePartnerSchedule');
                }
                let
                    { user, data, callback, sourceDcCustomerNo } = args,
                    async = require( 'async' ),
                    scheduleData = {},
                    patientWasNotFound = false,
                    schedule;
                if( !data.calendar ) {
                    Y.log( `updatePartnerSchedule. calendar id is missing, data.calendar: ${data.calendar}`, 'error', NAME );
                    return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Invalid params.' } ) );
                }
                async.waterfall( [
                    function( next ) {
                        if( !sourceDcCustomerNo ) {
                            return setImmediate( next );
                        }
                        Y.doccirrus.api.partner.getPartner( {
                            user,
                            data: {
                                dcCustomerNo: sourceDcCustomerNo
                            },
                            callback( err ){
                                next( err );
                            }
                        } );
                    },
                    function( next ) {
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'schedule',
                            action: 'get',
                            query: {
                                'partner.scheduleId': data._id
                            },
                            options: {
                                lean: true
                            }
                        }, ( err, results ) => {
                            if( err ) {
                                return next( err );
                            }
                            if( !results.length ) {
                                return next( new Y.doccirrus.commonerrors.DCError( "calevent_08" ) );
                            }
                            schedule = results[ 0 ];
                            scheduleData.partner = schedule.partner;
                            if( !schedule.partner ) {
                                return next( new Y.doccirrus.commonerrors.DCError( 400, { message: 'schedule does not have partner data' } ) );
                            }
                            if( schedule.partner.dcCustomerNo !== sourceDcCustomerNo ) {
                                Y.log( `updatePartnerSchedule. schedule does not belong to current partner. partner dcCustomerNo: ${sourceDcCustomerNo}`, 'error', NAME );
                                return next( new Y.doccirrus.commonerrors.DCError( 401 ) );
                            }
                            next( null );
                        } );
                    },
                    function( next ) {
                        const
                            currentPartnerPatientId = schedule.partner.patientId && schedule.partner.patientId.toString();
                        if( data.patient && data.patient !== currentPartnerPatientId ) {
                            Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'patient',
                                action: 'get',
                                query: {
                                    mirrorPatientId: data.patient
                                }
                            }, ( err, results ) => {
                                if( err ) {
                                    return next( err );
                                }
                                if( !results.length ) {
                                    patientWasNotFound = true;
                                    return next();
                                }
                                scheduleData.partner.patientId = data.patient;
                                scheduleData.patient = results[ 0 ]._id;
                                next();
                            } );
                        } else {
                            if( !data.patient ) {
                                scheduleData.patient = data.originalPatientId;
                                scheduleData.partner.patientId = undefined;
                                delete data.originalPatientId;
                            }
                            return setImmediate( next );
                        }
                    },
                    function( next ) {
                        // patient handling
                        if( data.scheduletype ) {
                            Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'mirrorscheduletype',
                                action: 'get',
                                query: {
                                    originalId: data.scheduletype,
                                    prcCustomerNo: sourceDcCustomerNo
                                }
                            }, ( err, results ) => {
                                if( err ) {
                                    return next( err );
                                }
                                if( !results.length ) {
                                    return next( new Y.doccirrus.commonerrors.DCError( 70001 ) );
                                }
                                scheduleData.scheduletype = results[ 0 ]._id;
                                next();
                            } );
                        } else {
                            return setImmediate( next );
                        }
                    },
                    function( next ) {
                        let
                            updatedData,
                            fields;
                        delete data._id;
                        delete data.calendar;

                        fields = Object.keys( data );
                        delete data.patient;
                        delete data.scheduletype;
                        delete data.partner;
                        updatedData = Object.assign( data, scheduleData );
                        if( updatedData.patient ) {
                            fields.push( 'patient' );
                        }
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'schedule',
                            action: 'put',
                            data: Y.doccirrus.filters.cleanDbObject( updatedData ),
                            fields,
                            query: {
                                _id: schedule._id
                            }
                        }, ( err ) => {
                            if( err ) {
                                return next( err );
                            }
                            if( patientWasNotFound ) {
                                return sendMissingPatientMessage( { user, scheduleId: schedule._id }, function() {
                                    next( null, { _warning: new Y.doccirrus.commonerrors.DCError( 100002 ) } );
                                } );
                            }
                            next( null );
                        } );
                    }
                ], callback );

            },
            /**
             * write the schedule if it is a valid calevent
             * @param {Object} args
             * @param {Object} args.user
             * @param {Object} args.data
             * @param {Function} args.callback
             */
            post: async function( args ) {
                Y.log( 'Entering Y.doccirrus.api.calevent.post', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.calevent.post' );
                }
                POST( args );
            }, // post

            /**
             * if an id is provided then determine the target collection.
             * if it is not a repetition then do the DELETE, else just mark it deleted.
             * if there is no id then write a repetition marked deleted, its data is just a copy of the master schedule.
             * TODO if this is the only remaining repetition in a series, delete everything that belongs to that series
             * eventType must be always provided
             * @param {Object} args
             */
            'delete': function( args ) {
                Y.log('Entering Y.doccirrus.api.calevent.delete', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.calevent.delete');
                }
                var
                    user = args.user,
                    callback = args.callback,
                    closeTimeId = args.query && args.query.closeTimeId,
                    query = getQuery( args.query ), // expected to be id
                    params = args.data || {},
                    sourceDcCustomerNo = args.sourceDcCustomerNo,
                    //eventType = params.eventType,
                    //modelName = getModelName( eventType ),
                    async = require( 'async' ),
                    options = {},
                    context = {};
                Y.log( 'Deleting calevent: ' + require( 'util' ).inspect( params ), 'debug', NAME );

                function postDeleteProcess( err, result ) {

                    if( err ) {
                        callback( err );
                        return;
                    }
                    if( query && query._id ) {
                        Y.doccirrus.api.patient.deleteCrmReminderCalRef( {
                            user: user,
                            query: {
                                crmReminderCalRef: query._id
                            }
                        } );
                    }

                    return callback( null, result );
                }

                function handleCases() {

                    if( closeTimeId ) {
                        query = { closeTimeId: closeTimeId };
                        options = {
                            override: true // needed to override MAX_DELETE
                        };
                    }

                    if( query ) {
                        Y.log( 'DELETE calevent: ' + JSON.stringify( query ), 'debug', NAME );
                        if( params.createTask ) {
                            context = {
                                createTask: true,
                                auditPPDelete: true
                            };
                        }

                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'schedule',
                            action: 'delete',
                            field: args.fields,
                            context: context,
                            query: query,
                            options: options,
                            callback: postDeleteProcess
                        } );
                    } else if( true === params.deleteAll || 'true' === params.deleteAll && params.start && params.linkSeries ) {  // delete this and all future calevents
                        Y.log( 'DELETE all future repetitions: ' + require( 'util' ).inspect( params ), 'debug', NAME );
                        Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'schedule',
                                action: 'get',
                                query: { _id: params.linkSeries },
                                options: {
                                    lean: true
                                }
                            }, function( err, result ) {
                                var
                                    moment = require( 'moment' ),
                                    myStart = moment( params.start ), // the start time of the selected entry
                                    schedule = result && result[0], // the master schedule
                                    deletedSchedules = [];
                                if( err || !schedule ) {
                                    Y.log( 'error deleting master schedule: ' + JSON.stringify( err ) );
                                    postDeleteProcess( err || Y.doccirrus.errors.http( 400, 'calevent not found' ) );
                                    return;
                                }
                                if( moment( schedule.dtstart ).isSame( myStart, 'day' ) ) { // if this is the first repetition then delete everything
                                    Y.doccirrus.mongodb.runDb( {
                                        user: user,
                                        model: 'schedule',
                                        action: 'get',
                                        query: { linkSeries: schedule._id }
                                    }, function( err, res ) {
                                        if( err ) {
                                            Y.log( 'error deleting schedule: ' + JSON.stringify( err ) );
                                            postDeleteProcess( err || Y.doccirrus.errors.http( 400, 'calevent not found' ) );
                                        }
                                        if( res ) {
                                            res.push( schedule );
                                            async.eachSeries( res, function( item, next ) {
                                                Y.doccirrus.mongodb.runDb( {
                                                        user: user,
                                                        action: 'delete',
                                                        model: 'schedule',
                                                        query: {_id: item._id}
                                                    }, function( error, result ) {
                                                        if( error ){
                                                            return next( error );
                                                        } else {
                                                            deletedSchedules.push( result && result[0] );
                                                            return next( null );
                                                        }
                                                    }
                                                );

                                            }, function( err ) {
                                                if( err ) {
                                                    Y.log( 'error deleting schedule: ' + JSON.stringify( err ) );
                                                    postDeleteProcess( err || Y.doccirrus.errors.http( 400, 'calevent not found' ) );
                                                }
                                                else {
                                                    postDeleteProcess( null, deletedSchedules );
                                                }

                                            } );
                                        }
                                    } );
                                } else {
                                    schedule.until = myStart.add( 'day', -1 ).endOf( 'day' ); // cut the series from this repetition to the future
                                    Y.doccirrus.mongodb.runDb( {
                                        user: user,
                                        action: 'delete',
                                        model: 'schedule',
                                        options: {
                                            override: true
                                        },
                                        query: {
                                            $and: [
                                                { linkSeries: schedule._id },
                                                { start: { $gt: schedule.until } } //including selected event
                                            ]
                                        },
                                        callback: function( err ) {
                                            if( err ) {
                                                Y.log( 'error deleting future schedules: ' + JSON.stringify( err ) );
                                                postDeleteProcess( err || Y.doccirrus.errors.http( 400, 'calevent not found' ) );
                                            } else {
                                                Y.doccirrus.mongodb.runDb( {
                                                    user: user,
                                                    action: 'put',
                                                    model: 'schedule',
                                                    fields: [ 'until' ],
                                                    query: { _id: schedule._id },
                                                    data: Y.doccirrus.filters.cleanDbObject( { until: schedule.until } ),
                                                    callback: postDeleteProcess
                                                } );
                                            }
                                        }
                                    } );
                                }
                            }
                        );
                    } else {
                        return callback( Y.doccirrus.errors.http( 400, 'invalid calevent DELETE' ) );
                    }
                } // handleCases

                function sendDeleteToPartner( schedule ) {
                    if( schedule.partner.scheduleId ) {
                        Y.doccirrus.communication.callExternalApiByCustomerNo( {
                            api: 'calevent.delete',
                            dcCustomerNo: schedule.partner.dcCustomerNo,
                            user: user,
                            query: {
                                _id: schedule.partner.scheduleId
                            },
                            data: params,
                            callback( err ){
                                if( err ) {
                                    Y.log( `sendDeleteToPartner. External delete failed, error: ${err && err.stack || err}`, 'error', NAME );
                                    return callback( err );
                                }
                                handleCases();
                            }
                        } );
                    } else { //master
                        Y.doccirrus.communication.callExternalApiByCustomerNo( {
                            api: 'calevent.deletePartnerSchedule',
                            dcCustomerNo: schedule.partner.dcCustomerNo,
                            user: user,
                            query: {
                                _id: schedule._id
                            },
                            data: params,
                            callback( err ){
                                if( err ) {
                                    Y.log( `sendDeleteToPartner. deletePartnerSchedule failed, error: ${err && err.stack || err}`, 'error', NAME );
                                    return callback( err );
                                }
                                handleCases();
                            }
                        } );
                    }
                }

                function processDeleteSchedule() {
                    async.waterfall( [
                        function( next ) {
                            if( !sourceDcCustomerNo ) {
                                return setImmediate( next );
                            }
                            Y.doccirrus.api.partner.getPartner( {
                                user,
                                data: {
                                    dcCustomerNo: sourceDcCustomerNo
                                },
                                callback( err ){
                                    next( err );
                                }
                            } );
                        }, function( next ) {

                            if ( !query || '{}' === JSON.stringify( query ) ) {
                                //  happens with deleting future calendar entries
                                Y.log( 'Missing query, skipping initial delete step...', 'debug', NAME );
                                return next( null, null );
                            }

                            Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'schedule',
                                query,
                                action: 'get',
                                options: {
                                    lean: true,
                                    limit: 1
                                }
                            }, ( err, results ) => {
                                if( err ) {
                                    return next( err );
                                }
                                if( !sourceDcCustomerNo ) {
                                    return next( null, results[ 0 ] );
                                }
                                if( !results[ 0 ].partner || sourceDcCustomerNo !== results[ 0 ].partner.dcCustomerNo ) {
                                    return next( new Y.doccirrus.commonerrors.DCError( 401 ) );
                                }
                                next( null, results[ 0 ] );
                            } );
                        }
                    ], ( err, schedule ) => {
                        if( err ) {
                            return callback( err );
                        }
                        if( schedule &&
                            ([Y.doccirrus.schemas.calendar.SCH_NOSHOW, Y.doccirrus.schemas.calendar.SCH_CURRENT].includes( schedule.scheduled ) ||
                             moment( schedule.start ).isBefore( moment() )) &&
                            (params.isFromPortal || args.isFromPortal) ) {
                            // don't allow to delete NOSHOW, CURRENT appointments or appointments with start before NOW from PP
                            return callback( new Y.doccirrus.commonerrors.DCError( 'calevent_06' ) );
                        }
                        if( query && schedule && schedule.partner && !sourceDcCustomerNo ) {
                            sendDeleteToPartner( schedule );
                        } else {
                            handleCases();
                        }
                    } );
                }
                ppAccessCheck( user, params.patientId, params.isFromPortal || args.isFromPortal, function( err ) {
                    if( err ) {
                        return callback( err );
                    }
                    processDeleteSchedule();
                } );
            },

            /**
             * Partner prc calls this function to delete schedule.
             * @method deletePartnerSchedule
             * @param {Object} args
             * @param {Object} args.user
             * @param {Object} args.data
             * @param {Object} args.query
             * @param {Object} args.sourceDcCustomerNo
             * @param {Function} args.callback
             */
            deletePartnerSchedule( args ){
                Y.log('Entering Y.doccirrus.api.calevent.deletePartnerSchedule', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.calevent.deletePartnerSchedule');
                }
                let
                    { user, data, query, callback, sourceDcCustomerNo } = args,
                    async = require( 'async' );
                async.waterfall( [
                    function( next ) {
                        Y.doccirrus.api.partner.getPartner( {
                            user,
                            data: {
                                dcCustomerNo: sourceDcCustomerNo
                            },
                            callback( err ){
                                next( err );
                            }
                        } );
                    },
                    function( next ) {
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'schedule',
                            action: 'get',
                            query: {
                                'partner.scheduleId': query.scheduleId
                            },
                            options: {
                                lean: true,
                                limit: 1
                            }
                        }, ( err, results ) => {
                            if( err ) {
                                return next( err );
                            }
                            if( !results.length ) {
                                return next( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Schedule not found' } ) );
                            }
                            if( !results[ 0 ].partner || sourceDcCustomerNo !== results[ 0 ].partner.dcCustomerNo ) {
                                return next( new Y.doccirrus.commonerrors.DCError( 401 ) );
                            }
                            Y.doccirrus.api.calevent.delete( {
                                user,
                                data: data,
                                query: {
                                    _id: results[ 0 ]._id
                                },
                                sourceDcCustomerNo,
                                callback: next
                            } );
                        } );
                    } ], callback );
            },

            /**
             * count calevents given eventType and query
             * e.g. to count real repetitions of a series: /1/calevent/:count/scheduleId/<scheduleId>/deleted_ne/true?eventType=repetition
             * @param {Object} args
             * @return {Function} callback
             */
            count: function( args ) {
                Y.log('Entering Y.doccirrus.api.calevent.count', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.calevent.count');
                }
                var
                    callback = args.callback,
                    query = args.query,
                    params = args.originalParams,
                    eventType = params.eventType,
                    modelName = getModelName( eventType );
                if( !query ) {
                    return callback( Y.doccirrus.errors.http( 400, 'nothing to count!' ) );
                }
                Y.doccirrus.mongodb.runDb( {
                    user: args.user,
                    action: 'count',
                    model: modelName,
                    query: query,
                    callback: callback
                });
            },
            /**
             * Returns the waiting time info for a ticket.
             *
             * Algorithm here was (29.10):
             * - get user (logged in or SU)
             * - get schedule and get patientalert models
             * { In parallel:
             *      - delete the old wait number with this info
              *     - post the new patientalert
              * ||
              *     - if there is a waitnumber search for the waitnumber
              *     - otherwise if waitno is empty get the highest waitno available (WTF?)
              *     - if there are results, populate them with location info
              *     - finally generate texts fitting to the waiting time
              * }
             *
             * New algorithm:
             * - get schedule
             * - does it have contact details?
             *      if( true )
             *            if patient details are provided
             *                  + ignore the given details
             *            else unknown patient details
             *                  + write the details into the schedule
             *  - determine wait time for schedule
             *  - return an object:
             *  <pre>
             *     { wait: number,
             *       waitText: string,
             *       subtext: string,
             *       location: { address, telephone, locname, etc. }
             *     }
             *     </pre>
             * @method receiveWaitingTime
             * @param {Object} args
             */
            receiveWaitingTime: function( args ) {
                Y.log('Entering Y.doccirrus.api.calevent.receiveWaitingTime', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.calevent.receiveWaitingTime');
                }
                var
                    user = args.user,
                    data = args.originalParams,
                    callback = args.callback,
                    sched;

                Y.log( 'tmp msg: ' + JSON.stringify( user ) );
                if( !data.number ) {
                    callback( Y.doccirrus.errors.http( 400, 'Bad parameters' ) );
                    return;
                }

                /**
                 * update the email, mobile, tiav and wantsAlert fields in the record
                 * need to tighten this up via static function in the DBLayer - MOJ-869
                 * @method updateinfo
                 * @param mongooseObj {object}
                 */

                function updateInfo( mongooseObj ) {
                    var
                        i,
                        isDirty = false,
                        origWAVal = mongooseObj.wantsAlert;

                    if( data.wantsAlert ) {
                        let
                            mobileChange = (data.mobile || mongooseObj.mobile) && data.mobile !== mongooseObj.mobile,
                            emailChange = (data.email || mongooseObj.email) && data.email !== mongooseObj.email,
                            timeinadvanceChange = (data.timeinadvance || mongooseObj.timeinadvance) && Number(data.timeinadvance) !== Number(mongooseObj.timeinadvance);
                        if( !mobileChange && !emailChange && !timeinadvanceChange ) {
                            return;
                        }
                        mongooseObj.wantsAlert = true;
                        if( data.mobile || data.email ) {
                            // by putting this in one if statement,
                            // we allow the email or mobile also to be UNSET
                            // if the user wants it.
                            mongooseObj.mobile = data.mobile || undefined;
                            mongooseObj.email = data.email || undefined;
                            isDirty = true;
                        }
                        if( data.timeinadvance ) {
                            i = data.timeinadvance.indexOf( 'min' );
                            if( 0 < i ) {
                                mongooseObj.timeinadvance = data.timeinadvance.substring( 0, i );
                            } else {
                                mongooseObj.timeinadvance = data.timeinadvance;
                            }
                            isDirty = true;
                        }

                    } else {
                        mongooseObj.wantsAlert = false;
                    }
                    if( origWAVal !== mongooseObj.wantsAlert ) {
                        isDirty = true;
                    }
                    if( isDirty ) {
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'schedule',
                            action: 'put',
                            query: {
                                _id: mongooseObj._id
                            },
                            fields: ['wantsAlert', 'timeinadvance', 'email', 'mobile'],
                            data: Y.doccirrus.filters.cleanDbObject( {
                                wantsAlert: mongooseObj.wantsAlert,
                                timeinadvance: mongooseObj.timeinadvance,
                                email: mongooseObj.email,
                                mobile: mongooseObj.mobile
                            } )
                        }, ( err ) => {
                            if( err ) {
                                Y.log( 'Error during updateInfo' + JSON.stringify( err ), 'error' );
                            }
                            Y.log( 'Update info for event ' + mongooseObj._id.toString(), 'debug', NAME );
                        } );
                    }
                }

                //#3 generate status from schedules
                /**
                 * @method scheduleCb
                 * @param {??} err
                 * @param {??} results
                 */
                function scheduleCb( err, results ) {
                    var
                        obj,
                        response = {
                            status: 'err'
                        };
                    if( err ) {
                        callback( Y.doccirrus.errors.http( 500, 'Server error' ) );
                        return;
                    }

                    if( 0 === results.length ) {
                        Y.log( 'Wrong waiting number or schedule was deleted.' );
                        response.waitText = i18response_ERR_deleted_h;
                        response.subtext = i18response_ERR_deleted_s;
                        callback( null, response );
                        return;
                    }

                    if( 1 < results.length ) {
                        Y.log( 'Wrong number (>1) of schedules found. Sending error.' );
                        response.waitText = i18response_ERR_critical_h;
                        response.subtext = i18response_ERR_critical_s;
                        callback( null, response );
                        return;
                    }

                    if( !results[0] ) {
                        // check we have a mongoose-y type of object -- should actually throw an error
                        // as this is not a defined state.
                        Y.log( 'No valid response from DB.', 'error', NAME );
                        response.waitText = i18response_ERR_critical_h;
                        callback( null, response );
                        return;
                    }

                    response.status = 'ok';
                    updateInfo( results[0] );

                    obj = sched.getWaitTime( results[0].toJSON ? results[0].toJSON() : results[0] );
                    // don't leak any data on this route...
                    response.wait = obj.wait;
                    response.waitText = obj.waitText;
                    response.location = obj.location;
                    response.subtext = obj.subtext;
                    response.calltime = results[0].calltime;

                    // prevent crash in exceptional circumstances
                    if( results[0] && results[0].calendar ) {
                        response.location = results[0].calendar.locationId;
                    }
                    Y.log( 'Calculated waiting time : ' + JSON.stringify( response ), 'debug', NAME );
                    Y.log( 'Loading schedule for tenant=' + user.tenantId + ' and waitno=' + data.number, 'debug', NAME );

                    callback( null, response );
                }

                function handleScheduler( err, scheduler ) {

                    if( err ) {
                        callback( Y.doccirrus.errors.http( 500, 'Server error' ) );
                        return;
                    }
                    if( !scheduler ) {
                        callback( Y.doccirrus.errors.http( 500, 'No Scheduler creatable, server error' ) );
                        return;
                    }
                    sched = scheduler;

                    //#1 get waiting number
                    Y.doccirrus.calUtils.getEventList( user, {
                        dateFrom: 'today',
                        number: data.number,
                        eventType: 'adhoc', // only search for adhoc, not 'plan'
                        show: 'location',  // need this info for ticket MOJ-788
                        callback: scheduleCb
                    } );
                }

                // Step 0: Get ourselves a new scheduler
                Y.doccirrus.scheduling.getScheduler( user, handleScheduler );

            },

            /**
             *  Gets all doc calendars and each of their calevents only for the next 12 hours.
             *
             *  This is a replacement / rewrite made in response to customer issues after 3.5 update
             *
             *  Used by tab_waiting-list and tab_called-list tables, returns a set of paginated calendar enties
             *  for the table.
             *
             *  @method getDocSchedules
             *  @param  {Object}    args
             *  @param  {Object}    args.user
             *  @param  {Function}  args.callback
             *  @param  {Object}    args.originalParams
             *  @param  {Object}    args.originalParams.calendar
             *  @param  args.originalParams.location
             *  @param  args.originalParams.show
             *  @param  args.originalParams.old
             */

            getDocSchedules: function( args ) {
                Y.log('Entering Y.doccirrus.api.calevent.getDocSchedules', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.calevent.getDocSchedules');
                }
                var
                    self = this,
                    async = require( 'async'),
                    finalResult = {},
                    params = args.originalParams,           //  from table config?
                    options = args.options,                 //  from table proxy?
                    getOld = params.old || false,           //  past appointments vs pending appointments?
                    getBoth = params.both || false,         //  both appointments
                    getActive = params.active || false,     //  active appointments
                    location = params.location,             //
                    calendar = params.calendar,             //  array of calendar _ids
                    show = params.show || 'scheduletype',
                    noPopulate = params.noPopulate || false,
                    group = params.group || null,

                    scheduler,                              //  helper object
                    sortedSchedules,                        //  created by scheduler
                    count;

                async.series(
                    [
                        checkRequestArgs,
                        getScheduler,
                        invokeScheduler,
                        paginateSchedules,
                        populateConferencePatients,
                        populatePatientsInEntries,
                        populateCalendarNamesInEntries,
                        addWaitingTimesToEntries,
                        populateRoomNamesInEntries
                    ],
                    onAllDone
                );

                //  1. Sanity checks
                function checkRequestArgs( itcb ) {

                    function checkIsDocCal( cal ) {
                        return Y.doccirrus.schemas.calendar.isDoctorCalendar( cal );
                    }

                    if( Array.isArray( calendar ) ) {
                        calendar = Y.Array.filter( calendar, checkIsDocCal );
                    }

                    itcb( null );
                }


                //  2. Get ourselves a new scheduler (object which sorts calendar entries?)
                function getScheduler( itcb ) {
                    Y.doccirrus.scheduling.getScheduler( args.user, onSchedulerCreated );

                    // use the scheduler to get a list of doctors appointments, adhoc and planned.
                    function onSchedulerCreated( err, result ) {
                        if ( err ) {
                            Y.log( 'Could not create scheduler: ' + JSON.stringify( err ), 'warn', NAME );
                            return itcb( err );
                        }

                        scheduler = result;
                        itcb( null );
                    }
                }

                //  3. Invoke the scheduler with arguments passed from the table state and configuration
                function invokeScheduler( itcb ) {

                    var
                        sortQuery = Object.keys(args.options.sort).length ? args.options.sort : null,   //  table sorters?
                        schedulerSortDefault = {start: 1, arrivalTime: 1},
                        schedulerOptions = {sort: sortQuery || schedulerSortDefault},

                        scheduleStatus = getBoth ? 'activeended' : getActive ? 'active' : ( getOld ? 'old' : 'waiting' ),

                        schedulerQuery = {
                            location: location,
                            calendar: calendar,
                            group: group,
                            scheduled: scheduleStatus,
                            show: show,
                            noRealign: true,
                            forDocSchedules: getOld ? true : false
                        };

                    //  note, complex, legacy mongoose operations can be run be this
                    scheduler.getTodaySortedByStart(
                        schedulerQuery,
                        onSchedulesCreated,
                        schedulerOptions
                    );

                    function onSchedulesCreated( err, schedulesResult ) {
                        if ( err ) {
                            Y.log( 'Could not get scheduled for today: ' + JSON.stringify( err ), 'warn', NAME );
                            return itcb( err );
                        }
                        sortedSchedules = schedulesResult;
                        itcb( null );
                    }
                }

                //  4. Reduce results to table page
                function paginateSchedules( itcb ) {

                    // set up the return object, which must include pagination info
                    // Additionally cut down the result set of events to the exact number needed
                    // and join just that smaller set by populating with info from Calendar.

                    finalResult = sortedSchedules;
                    count = sortedSchedules.length; // totalItems

                    options.skip = options.skip ? options.skip : 0;

                    //  limit and skip option exist when loading a table page
                    //  when loading table for PDF we do not paginate
                    if( options.limit ) {
                        // navigate to the requested page
                        finalResult = sortedSchedules.slice( options.skip, options.skip + options.limit );
                    }

                    itcb( null );
                }

                //  5. Add patient ids from conferences to calendar entries
                function populateConferencePatients ( itcb ) {

                    if ( noPopulate ) { return itcb( null ); }

                    self.populateConferencePatientIdsInEntries(args.user, finalResult, onConferencePatientsPopulated);
                    function onConferencePatientsPopulated( err, newResult ) {
                        if ( err ) {
                            Y.log( 'Could not populate conferences info into calendar events: ' + JSON.stringify( err ), 'warn', NAME );
                            //  continue despite error, best effort
                            return itcb( null );
                        }
                        finalResult = newResult;
                        itcb( null );
                    }
                }

                //  6. Add patient objects to calendar entries
                //  now using replacement for mongoose populate
                function populatePatientsInEntries( itcb ) {
                    //  may be disabled by caller
                    if ( noPopulate ) { return itcb( null ); }

                    self.populatePatientsInEntries(args.user, finalResult, onPatientsPopulated);
                    function onPatientsPopulated( err, newResult ) {
                        if ( err ) {
                            Y.log( 'Could not populate patients into calendar events: ' + JSON.stringify( err ), 'warn', NAME );
                            //  continue despite error, best effort
                            return itcb( null );
                        }
                        finalResult = newResult;
                        itcb( null );
                    }
                }

                //  7. Populate calendar info and employee
                //  currently populating full object as a safety measure
                function populateCalendarNamesInEntries( itcb ) {
                    //  may be disabled by caller
                    if ( noPopulate ) { return itcb( null ); }

                    self.populateCalendarsInEntries( args.user, finalResult, onPopulateCalendars );
                    function onPopulateCalendars( err, newResult ) {
                        if ( err ) {
                            Y.log( 'Problem populating calendars: ' + JSON.stringify( err ), 'warn', NAME );
                            //  best effort, do not halt here
                            return itcb( null );
                        }

                        finalResult = newResult;
                        itcb( null );
                    }
                }

                //  8. Add waiting/waited times to the events
                function addWaitingTimesToEntries( itcb ) {
                    var i;

                    for( i = 0; i < finalResult.length; i++ ) {
                        // waiting times can not be attached to mongoose objects, we need to convert here
                        finalResult[i] = JSON.parse( JSON.stringify( finalResult[i] ) );
                    }

                    scheduler.addWaitingTime( finalResult, onWaitingTimesAdded );

                    // Add time waited to the events
                    function onWaitingTimesAdded( err, dataWithWaitingTimes ) {
                        if ( err ) {
                            Y.log( 'Could not add waiting times: ' + JSON.stringify( err ), 'warn', NAME );
                            return itcb( err );
                        }

                        finalResult = dataWithWaitingTimes;
                        scheduler.addTimeWaited( finalResult, onTimeWaitedAdded );
                    }

                    function onTimeWaitedAdded( err, dataWithTimeWaited ) {
                        if ( err ) {
                            Y.log( 'Could not add time waited: ' + JSON.stringify( err ), 'warn', NAME );
                            return itcb( err );
                        }

                        finalResult = dataWithTimeWaited;
                        itcb( null );
                    }
                }

                //  9. Populate calendar info and employee
                //  currently populating full object as a safety measure
                function populateRoomNamesInEntries( itcb ) {
                    self.populateRoomsInEntries( args.user, finalResult, onPopulateRooms );
                    function onPopulateRooms( err, newResult ) {
                        if ( err ) {
                            Y.log( 'Problem populating rooms: ' + JSON.stringify( err ), 'warn', NAME );
                            //  best effort, do not halt here
                            return itcb( null );
                        }

                        finalResult = newResult;
                        itcb( null );
                    }
                }

                function onAllDone( err ) {
                    if ( err ) {
                        Y.log( 'Could not get doc schedules: ' + JSON.stringify( err ), 'warn', NAME );
                        return args.callback( err );
                    }

                    let calendarsMap = new Map();

                    try {
                        // safety, can be removed when 3.5 problems are resolved
                        finalResult = JSON.parse( JSON.stringify( finalResult ) );
                    } catch ( parseErr ) {
                        return args.callback( parseErr );
                    }

                    // we need to merge duplicated schedules with resources
                    for( let item of finalResult ) {
                        if( item.linkByResource ) {
                            if( calendarsMap.has( item.linkByResource ) ) {
                                calendarsMap.set( item.linkByResource, [...calendarsMap.get( item.linkByResource ), item.calendar]);
                            } else {
                                calendarsMap.set( item.linkByResource, [item.calendar] );
                            }
                        }
                    }
                    finalResult = finalResult.filter( item => {
                        if( item.linkByResource ) {
                            if( calendarsMap.get( item.linkByResource ) ) {
                                item.calendar = calendarsMap.get( item.linkByResource );
                                calendarsMap.delete( item.linkByResource );
                                return true;
                            } else {
                                return false;
                            }
                        } else {
                            return true;
                        }
                    } );

                    finalResult.count = count;

                    //console.log( '(****) finalResult: ', finalResult );
                    args.callback( null, finalResult );
                }

            }, // end getDocSchedules

            /**
             * updates appointmentments order and room
             * @param {Object} args
             * @param {Object} args.user
             * @param {Object} args.data
             * @param {Function} args.callback
             */
            updateRoomAppointments: async function( args ) {
                Y.log('Entering Y.doccirrus.api.calevent.updateRoomAppointments', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.calevent.updateRoomAppointments');
                }
                const
                    { user, callback, data = {} } = args;
                let [ err, appointmentModel ] = await formatPromiseResult( Y.doccirrus.api.reporting.getModel( user, 'schedule' ) );
                if( data && data.appointments && data.appointments.length ) {
                    let bulk = appointmentModel.mongoose.collection.initializeUnorderedBulkOp();
                    for( let item of data.appointments ){
                        if( !item.roomId ) {
                            delete item.roomId;
                        }
                        if( 0 !== item.orderInRoom && !item.orderInRoom ) {
                            delete item.orderInRoom;
                        }
                        bulk.find( { _id: new ObjectId( item._id) }).updateOne( {$set: {roomId: item.roomId,  orderInRoom: item.orderInRoom} } );
                    }



                    [ err ] = await formatPromiseResult( bulk.execute() );
                    if( err ){
                        Y.log( `updateRoomAppointments: Error on updating data: ${err.stack || err}`, 'error', NAME );
                        return callback( err );
                    }
                }

                callback( null );

            },

            /**
             *  Replacement for mongoose populate operation which did the same thing
             *
             *  @param  user
             *  @param  calEvents
             *  @param  callback
             */

            populateCalendarsInEntries: function( user, calEvents, callback ) {
                var
                    async = require( 'async' ),
                    calendars = [];

                // make safe
                try {
                    calEvents = JSON.parse( JSON.stringify( calEvents ) );
                } catch( parseErr ) {
                    Y.log( 'Could not convert calEvents into a plain object: ' + JSON.stringify( parseErr ), 'warn', NAME );
                    callback( parseErr );
                    return;
                }

                async.series( [ getCalendars, appendToEntries ], onAllDone );

                function getCalendars( itcb ) {
                    var i, calendarIds = [];

                    //  get unique calendar _ids as strings
                    for ( i = 0; i < calEvents.length; i++ ) {
                        if ( calEvents[i].calendar && '' !== calEvents[i].calendar ) {
                            if ( -1 === calendarIds.indexOf( calEvents[i].calendar + '' ) ) {
                                calendarIds.push( calEvents[i].calendar + '' );
                            }
                        }
                    }

                    //  if no calendars to load then we can skip this step
                    if ( 0 === calendarIds.length ) { return itcb( null ); }

                    //  load them from the database
                    Y.doccirrus.mongodb.runDb( {
                        'user': user,
                        'model': 'calendar',
                        'query': { _id: { $in: calendarIds } },
                        'callback': onCalendarsLoaded
                    } );

                    function onCalendarsLoaded( err, result ) {
                        if ( err ) {
                            Y.log( 'Problem loading calendars: ' + JSON.stringify( err ), 'warn', NAME );
                            return itcb( err );
                        }
                        calendars = result;
                        itcb( null );
                    }
                }

                function appendToEntries( itcb ) {
                    var i, j;
                    for ( i = 0; i < calEvents.length; i++ ) {
                        for ( j = 0; j < calendars.length; j++ ) {

                            if ( calEvents[i].calendar && calEvents[i].calendar === calendars[j]._id + '' ) {

                                calEvents[i].calendar = {
                                    _id: calendars[j]
                                };

                                if ( calendars[j].employee ) {
                                    calEvents[i].calendar.employee = calendars[j].employee;
                                }
                            }

                        }
                    }

                    itcb( null );
                }

                function onAllDone( err ) {
                    if ( err ) {
                        Y.log( 'Error while populating calendar objects: ' + JSON.stringify( err ), 'warn', NAME );
                        return callback( err );
                    }
                    callback( null, calEvents );
                }
            },

            /**
             *  Replacement for mongoose populate operation which did the same thing
             *
             *  @param  user
             *  @param  calEvents
             *  @param  callback
             */

            populateRoomsInEntries: function( user, calEvents, callback ) {
                var
                    async = require( 'async' ),
                    rooms = [];

                // make safe
                try {
                    calEvents = JSON.parse( JSON.stringify( calEvents ) );
                } catch( parseErr ) {
                    Y.log( 'Could not convert calEvents into a plain object: ' + JSON.stringify( parseErr ), 'warn', NAME );
                    callback( parseErr );
                    return;
                }

                async.series( [ getRooms, appendToEntries ], onAllDone );

                function getRooms( itcb ) {
                    var i, roomIds = [];

                    //  get unique calendar _ids as strings
                    for ( i = 0; i < calEvents.length; i++ ) {
                        if ( calEvents[i].roomId && '' !== calEvents[i].roomId ) {
                            if ( -1 === roomIds.indexOf( calEvents[i].roomId + '' ) ) {
                                roomIds.push( calEvents[i].roomId + '' );
                            }
                        }
                    }

                    //  if no rooms to load then we can skip this step
                    if ( 0 === roomIds.length ) { return itcb( null ); }

                    //  load them from the database
                    Y.doccirrus.mongodb.runDb( {
                        'user': user,
                        'model': 'room',
                        'query': { _id: { $in: roomIds } },
                        'callback': onRoomsLoaded
                    } );

                    function onRoomsLoaded( err, result ) {
                        if ( err ) {
                            Y.log( 'Problem loading rooms: ' + JSON.stringify( err ), 'warn', NAME );
                            return itcb( err );
                        }
                        rooms = result;
                        itcb( null );
                    }
                }

                function appendToEntries( itcb ) {
                    var i, j;
                    for ( i = 0; i < calEvents.length; i++ ) {
                        for ( j = 0; j < rooms.length; j++ ) {
                            if ( calEvents[i].roomId && calEvents[i].roomId === rooms[j]._id + '' ) {
                                calEvents[i].roomName = rooms[j].name + '';
                            }

                        }
                    }

                    itcb( null );
                }

                function onAllDone( err ) {
                    if ( err ) {
                        Y.log( 'Error while populating calendar objects: ' + JSON.stringify( err ), 'warn', NAME );
                        return callback( err );
                    }
                    callback( null, calEvents );
                }
            },

            /**
             *  Replacement for mongoose populate operation which did the same thing
             *
             *  @param  user        REST user or equivalent
             *  @param  calEvents   From schedules collection, loaded by scheduler
             *  @param  callback    Of the form fn( err, calEvents )
             */

            populatePatientsInEntries: function( user, calEvents, callback ) {
                var
                    async = require( 'async' ),
                    patients = [];

                // make safe
                try {
                    calEvents = JSON.parse( JSON.stringify( calEvents ) );
                } catch( parseErr ) {
                    Y.log( 'Could not convert calEvents into a plain object: ' + JSON.stringify( parseErr ), 'warn', NAME );
                    callback( parseErr );
                    return;
                }

                async.series( [ loadPatients, addToCalEvents ], onAllDone );

                function loadPatients( itcb ) {
                    var i, patientIds = [];

                    // get unique patient _ids as strings
                    for ( i = 0; i < calEvents.length; i++ ) {
                        if ( calEvents[i].patient && '' !== calEvents[i].patient ) {
                            if ( -1 === patientIds.indexOf( calEvents[i].patient + '' ) ) {
                                patientIds.push( calEvents[i].patient + '' );
                            }
                        }
                    }

                    //  skip the rest of this step if no patients to load
                    if ( 0 === patientIds.length ) { return itcb( null ); }
                    //console.log( '(****) loading patient _ids: ', patientIds );

                    Y.doccirrus.mongodb.runDb( {
                        'user': user,
                        'model': 'patient',
                        'query': { _id: { $in: patientIds } },
                        'callback': onPatientsLoaded
                    } );

                    function onPatientsLoaded( err, result ) {
                        if ( err ) {
                            Y.log( 'Could not load patients from database: ' + JSON.stringify( err ), 'warn', NAME );
                            return itcb( err );
                        }

                        patients = result;
                        itcb( null );
                    }
                }

                function addToCalEvents( itcb ) {
                    var i, j;
                    for ( i = 0; i < calEvents.length; i++ ) {
                        for ( j = 0; j < patients.length; j++ ) {
                            if ( calEvents[i].patient + '' === patients[j]._id + '' ) {
                                calEvents[i].patient = patients[j];
                            }
                        }
                    }

                    //  TODO: delete bad values here?
                    /*
                    for ( i = 0; i < calEvents.length; i++ ) {
                        if ( calEvents[i].patient ) {
                            if ( 'object' !== typeof calEvents[i].patient || !calEvents[i].patient._id ) {
                                delete calEvents[i].patient;
                            }
                        }
                    }
                    */

                    itcb( null );
                }

                function onAllDone( err ) {
                    if ( err ) {
                        Y.log( 'Problem populating patients into calendar events: ' + JSON.stringify( err ), 'warn', NAME );
                        return callback( err );
                    }
                    callback( null, calEvents );
                }
            },

            /**
             *  Load patient ids from conferences to set them into calevents
             * @method populateConferencePatientIdsInEntries
             * @param {Object}      user
             * @param [{
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
             *           lastEditedDate:  <Date>,
             *           scheduletypePopulated: {
             *              name: <String>,
             *              duration: <Number>,
             *              durationUnit: <String>,
             *              info: <String>,
             *              _id: <ObjectId>
             *            }
             *        } ] calEvents Array of calevents to proceed
             * @param {Function}    callback
             */
            async populateConferencePatientIdsInEntries( user, calEvents, callback ) {
                let
                    conferenceIds = [];

                // make safe
                try {
                    calEvents = JSON.parse( JSON.stringify( calEvents ) );
                } catch( parseErr ) {
                    Y.log( `Could not convert calEvents into a plain object: ${parseErr.stack || parseErr}`, 'warn', NAME );
                    callback( parseErr );
                    return;
                }

                // get unique conference _ids as strings
                for( let event of calEvents ) {
                    if( event.conferenceId && '' !== event.conferenceId ) {
                        if( -1 === conferenceIds.indexOf( event.conferenceId + '' ) ) {
                            conferenceIds.push( event.conferenceId + '' );
                        }
                    }
                }

                //  skip the rest of this step if no patients to load
                if( 0 === conferenceIds.length ) {
                    return callback( null, calEvents );
                }

                let [err, conferences] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'get',
                        model: 'conference',
                        query: {_id: {$in: conferenceIds}},
                        options: {
                            select: {
                                patients: 1
                            }
                        }
                    } )
                );

                if( err ) {
                    Y.log( `Could not get conferences for calendar events. Trace: ${err.stack || err}`, 'warn', NAME );
                    return callback( err );
                }

                if( !conferences.length ) {
                    //there are no conferences to process
                    return callback( null, calEvents );
                }

                for( let event of calEvents ) {
                    for( let conference of conferences ) {
                        if( event.conferenceId + '' === conference._id + '' ) {
                            event.patient = conference.patients[0];
                        }
                    }
                }

                return callback( null, calEvents );
            },

            /**
             * group the calevents by calendar id. Just a helper for frontend.
             * delivers search parameters intact to the get.
             * @param {Object} args
             */
            getGroupedByCalId: function( args ) {
                Y.log('Entering Y.doccirrus.api.calevent.getGroupedByCalId', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.calevent.getGroupedByCalId');
                }
                var
                    result = {},
                    callback = args.callback;
                function groupThem( err, calevents ) {
                    if( err || !calevents || !calevents[0] ) {
                        callback( err, calevents );
                        return;
                    }

                    Y.Array.each( calevents, function( ce ) {
                        result[ce.calendar] = result[ce.calendar] || []; // initialize the array
                        result[ce.calendar].push( ce );
                    } );

                    callback( null, result );
                }

                args.callback = groupThem;
                Y.doccirrus.api.calevent.get( args );

            },

            /**
             * a service that provides UI with a list of time slots on which some selected calendar resources
             * are unavailable to user
             * they will be processed for overlaps later on front-end
             * @param {Object} args
             */
            getBlockedSlots: function( args ) {
                Y.log('Entering Y.doccirrus.api.calevent.getBlockedSlots', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.calevent.getBlockedSlots');
                }
                var
                    params = args.originalParams,
                    calendars = (params.calendar && params.calendar[0]) ? params.calendar : [],
                    includeInfoCalendar = params.includeInfoCalendar,
                    user = args.user,
                    callback = args.callback,
                    finalList;                function doMerge( err, result ) {
                    if( err ) {
                        callback( err );
                        return;
                    }
                    finalList = Y.doccirrus.calUtils.mergeSortEvents( finalList, result, {} );
                    callback( null, finalList );
                }

                if( !includeInfoCalendar ) {
                    // exclude info calendar
                    calendars.some( function( calId, i ) {
                        if( calId === Y.doccirrus.schemas.calendar.getDefaultCalendarId() ) {
                            calendars.splice( i, 1 );
                        }
                    } );
                }

                Y.doccirrus.calUtils.getEventList( user, Y.merge( params, {
                        calendar: calendars,
                        dateFrom: params.dateFrom,
                        dateTo: params.dateTo,
                        consult: true,
                        negate: true
                    } ), function( err, result ) {
                        if( err ) {
                            callback( err );
                            return;
                        }
                        finalList = result || [];
                        Y.doccirrus.calUtils.getEventList( user, Y.merge( params, {
                            calendar: calendars,
                            dateFrom: params.dateFrom,
                            dateTo: params.dateTo,
                            eventType: ['closeTime'],
                            negate: false
                        } ), doMerge );
                    }
                );
            },

            getConsultTimes: function( args ) {
                Y.log('Entering Y.doccirrus.api.calevent.getConsultTimes', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.calevent.getConsultTimes');
                }
                var
                    params = args.originalParams,
                    calendar = params.calendar,
                    user = args.user,
                    callback = args.callback,
                    finalList;

                Y.doccirrus.calUtils.getEventList( user, Y.merge( params, {
                        calendar: calendar,
                        dateFrom: params.dateFrom || '',
                        dateTo: params.dateTo || '',
                        specificOnly: params.specificOnly || false,
                        duration: params.duration || '',
                        consult: true
                    } ), function( err, result ) {
                        if( err ) {
                            return callback( err );
                        }
                        finalList = result || [];
                        return callback( null, finalList );
                    }
                );
            },

            /**
             * change patient arrival status
             * @param {Object}  args
             */
            updateArrivalStatus: function( args ) {
                Y.log('Entering Y.doccirrus.api.calevent.updateArrivalStatus', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.calevent.updateArrivalStatus');
                }
                var
                    moment = require( 'moment' ),
                    params = args.data,
                    _id = params._id,
                    user = args.user,
                    callback = args.callback,
                    actualWaitingTimeMinutes = params.actualWaitingTimeMinutes,
                    dateNow = Date.now(),
                    arrivalTime,
                    status = params.status,
                    fields = ['arrivalTime'],
                    data = { skipcheck_: true };
                if( params.arrived ) {
                    if( actualWaitingTimeMinutes && 0 < actualWaitingTimeMinutes  ) {
                        arrivalTime = moment( dateNow ).subtract( actualWaitingTimeMinutes, 'minutes' ).valueOf();
                    } else {
                        arrivalTime = moment( dateNow ).valueOf();
                    }
                } else {
                    arrivalTime = Y.doccirrus.schemas.calendar.getNotArrivedTime(); // a time in far future for the sake of sorting, the same as the default in schema
                }

                data.arrivalTime = arrivalTime;

                if( '' === status ) {
                    fields.push( 'status' );
                    data.status = status;
                }
                this.put( {
                    user: user,
                    query: { _id: _id },
                    fields: fields,
                    data: data, // NOW
                    noValidation: true,
                    callback: callback
                } );
            },
            /**
             * If specified patient has appointment then set arrived state.
             * @param {Object}  args
             *
             * @return {Object | Function}
             */
            checkSchedule: function( args ) {
                Y.log('Entering Y.doccirrus.api.calevent.checkSchedule', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.calevent.checkSchedule');
                }
                var moment = require( 'moment' ),
                    user = args.user,
                    params = args.originalParams,
                    callback = args.callback,
                    day = moment(),
                    event, iStart, iEnd;

                function findNearest( events ) {
                    var nearest = { diff: Infinity, idx: null },
                        target = day.toDate();
                    events.forEach( function( event, index ) {
                        var diff = Math.abs( event.start - target );
                        if( nearest.diff > diff ) {
                            nearest.diff = diff;
                            nearest.idx = index;
                        }
                    } );
                    return events[nearest.idx];
                }

                function updateCb( err ) {
                    if( err ) {
                        return callback( err );
                    }

                    callback( null, { eventFound: true } );
                }

                function getCb( err, events ) {
                    if( err ) {
                        return callback( err );
                    }
                    if( !events || !events.length ) {
                        return callback( null, { eventFound: false } );
                    }
                    if( 1 < events.length ) {
                        event = findNearest( events );
                    } else {
                        event = events[0];
                    }

                    if( params.updateArrivalStatus ) {
                        Y.log( 'set arrival status on cardread', 'info', NAME );
                        Y.doccirrus.api.calevent.updateArrivalStatus( {
                            user: user,
                            data: {
                                _id: event._id.toString(),
                                arrived: true
                            },
                            callback: updateCb
                        } );
                    } else {
                        return callback( null, { eventFound: true } );
                    }

                }

                if( !params.patientId ) {
                    return callback( new Error( 'insufficient arguments' ) );
                }

                iStart = day.clone().startOf( 'day' ).toDate();
                iEnd = day.clone().endOf( 'day' ).toDate();

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'schedule',
                    query: {
                        patient: params.patientId,
                        start: { $gte: iStart, $lte: iEnd }
                    },
                    callback: getCb
                } );
            },

            /**
             * Moves a calevent into another calendar column
             * - Can also involve to set other start and end times
             * @param {Object} parameters
             * @param {Object} parameters.originalParams
             * @param {String} parameters.originalParams.caleventId The calevent id to move
             * @param {String} parameters.originalParams.calendarId The calendar id which the schedule should receive
             * @param {String} parameters.originalParams.start The start time the schedule may receive
             * @param {String} [parameters.originalParams.end] The end time the schedule may receive
             *
             * @return {Function} callback
             */
            moveEventToOtherCalendarColumn: function( parameters ) {
                Y.log('Entering Y.doccirrus.api.calevent.moveEventToOtherCalendarColumn', 'info', NAME);
                if (parameters.callback) {
                    parameters.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(parameters.callback, 'Exiting Y.doccirrus.api.calevent.moveEventToOtherCalendarColumn');
                }
                var
                    user = parameters.user,
                    callback = parameters.callback,
                    params = parameters.originalParams,
                    calendarId = params.calendarId,
                    notConfirmed = params.notConfirmed,
                    caleventId = params.caleventId,
                    startTime = params.start,
                    etaTime = params.start,
                    endTime = params.end;

                if( !calendarId ) {
                    return callback( Y.doccirrus.errors.rest( 400, 'calendarId required' ) );
                }

                if( !caleventId ) {
                    return callback( Y.doccirrus.errors.rest( 400, 'caleventId required' ) );
                }

                Y.doccirrus.api.calevent.get( {
                    user: user,
                    query: {
                        _id: caleventId
                    },
                    callback: function( error, result ) {
                        var
                            calevent = Array.isArray( result ) && result[0];

                        if( error ) {
                            return callback( error, result );
                        }

                        if( !calevent ) {
                            return callback( Y.doccirrus.errors.rest( 400, 'calevent not found' ), result );
                        }

                        calevent = JSON.parse( JSON.stringify( calevent ) );

                        return Y.doccirrus.api.calendar.doesCalendarAcceptScheduletypeId( {
                            user: user,
                            originalParams: {
                                calendarId: calendarId,
                                scheduletypeId: calevent.scheduletype
                            },
                            callback: function( error, results ) {
                                var
                                    accepts = Y.Lang.isObject( results ) && Y.Object.owns( results, 'accepts' ) && results.accepts;

                                if( error ) {
                                    return callback( error, results );
                                }

                                if( accepts ) {
                                    return Y.doccirrus.api.calevent.put( {
                                        user: user,
                                        query: { _id: caleventId },
                                        data: Y.merge( calevent, {
                                            notConfirmed: notConfirmed,
                                            calendar: calendarId,
                                            start: startTime || calevent.start,
                                            eta: etaTime || calevent.start,
                                            end: endTime || calevent.end
                                        } ),
                                        fields: ['calendar', 'start', 'end', 'eta'],
                                        callback: callback
                                    } );
                                }
                                else {
                                    if( Y.doccirrus.schemas.calendar.isDoctorCalendar( calendarId ) ) {
                                        return Y.doccirrus.api.calevent.put( {
                                            user: user,
                                            query: { _id: caleventId },
                                            data: Y.merge( calevent, {
                                                notConfirmed: notConfirmed,
                                                calendar: calendarId,
                                                start: startTime || calevent.start,
                                                eta: etaTime || calevent.start,
                                                end: endTime || calevent.end,
                                                scheduletype: Y.doccirrus.schemas.scheduletype.getStandardId()
                                            } ),
                                            fields: ['calendar', 'start', 'end', 'scheduletype', 'eta'],
                                            callback: callback
                                        } );
                                    }
                                    else {
                                        return Y.doccirrus.api.calevent.put( {
                                            user: user,
                                            query: { _id: caleventId },
                                            data: Y.merge( calevent, {
                                                calendar: calendarId,
                                                start: startTime || calevent.start,
                                                eta: etaTime || calevent.start,
                                                end: endTime || calevent.end,
                                                scheduletype: undefined
                                            } ),
                                            fields: ['calendar', 'start', 'end', 'scheduletype', 'eta'],
                                            callback: callback
                                        } );
                                    }
                                }

                            }
                        } );

                    }
                } );
            },

            /**
             * Validates given calevent data
             * @param {Object} parameters
             * @param {Object} parameters.originalParams
             * @param {Object} parameters.originalParams.calevent
             */
            validateCaleventData: function( parameters ) {
                Y.log('Entering Y.doccirrus.api.calevent.validateCaleventData', 'info', NAME);
                if (parameters.callback) {
                    parameters.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(parameters.callback, 'Exiting Y.doccirrus.api.calevent.validateCaleventData');
                }
                var
                    user = parameters.user,
                    callback = parameters.callback,
                    params = parameters.originalParams,
                    calevent = params.calevent;

                Y.doccirrus.mongodb.getModel( user, 'schedule', false, function modelCb( error, scheduleModel ) {
                    if( error ) {
                        return callback( error );
                    }

                    (new scheduleModel.mongoose( calevent )).validate( function( validation ) {
                        var
                            errors = [];

                        if( validation && validation.errors ) {
                            errors = Y.Object.values( validation.errors ).map( function( error ) {
                                return {
                                    name: error.name,
                                    message: error.message,
                                    path: error.path,
                                    value: error.value
                                };
                            } );
                        }

                        return callback( null, { errors: errors } );

                    } );

                } );
            },

            testCloseDay: function( args ) {
                Y.log('Entering Y.doccirrus.api.calevent.testCloseDay', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.calevent.testCloseDay');
                }
                var
                    user = args.user,
                    callback = args.callback;

                function handleScheduler( err, scheduler ) {

                    if( err ) {
                        callback( Y.doccirrus.errors.http( 500, 'Server error' ) );
                        return;
                    }
                    if( !scheduler ) {
                        callback( Y.doccirrus.errors.http( 500, 'No Scheduler creatable, server error' ) );
                        return;
                    }

                    scheduler.closeDay( null, callback );
                }

                Y.doccirrus.scheduling.getScheduler( user, handleScheduler );
            },



            calculateSchedule( args ){
                Y.log('Entering Y.doccirrus.api.calevent.calculateSchedule', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.calevent.calculateSchedule');
                }
                calculateSchedule( args );
            },
            calculatePartnerSchedule( args ){
                Y.log('Entering Y.doccirrus.api.calevent.calculatePartnerSchedule', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.calevent.calculatePartnerSchedule');
                }
                calculatePartnerSchedule( args );
            },
            createCloseDayEvent( args ){
                Y.log('Entering Y.doccirrus.api.calevent.createCloseDayEvent', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.calevent.createCloseDayEvent');
                }
                createCloseDayEvent( args );
            },
            addCloseTimeEventsToNewCalendar( args ){
                Y.log('Entering Y.doccirrus.api.calevent.addCloseTimeEventsToNewCalendar', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.calevent.addCloseTimeEventsToNewCalendar');
                }
                addCloseTimeEventsToNewCalendar( args );
            },
            getForCloseDayTable( args ){
                Y.log('Entering Y.doccirrus.api.calevent.getForCloseDayTable', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.calevent.getForCloseDayTable');
                }
                getForCloseDayTable( args );
            }
        };
    },
    '0.0.1', {
        requires: [
            'oop',
            'dcerror',
            'practice-schema',
            'room-schema',
            'dccalutils',
            'calendar-api'
        ]
    }
);
