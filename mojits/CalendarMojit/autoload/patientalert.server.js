/*
 @author: rw
 @date: 2013 November
 */
//TRANSLATION INCOMPLETE!! MOJ-3201

/**
 * Library of functions concerning patient alert logic
 *
 * @module calendar
 * @submodule dcpatalert
 */

/*jslint anon:true, nomen:true*/
/*global YUI*/

YUI.add( 'dcpatalert', function( Y, NAME ) {

        const
            moment = require( 'moment' ),
            i18n = Y.doccirrus.i18n;

        var
            myPA;

        /**
         * Constructor for the module class.
         *
         * this is the singleton PatAlert Object for the application
         * at the moment offers only static functions
         * @class DCPatientAlert
         * @namespace doccirrus
         * @private
         */
        function DCPatientAlert() {
            // purely static object at the moment, nothing in the instances.
        }

        // there is a limit to SMS length (140 chars), so we have to cut the address if necessary
        function checkSMSLength( address, subject, text, placeHolder ) {
            var staticLength = subject.length + text.length - placeHolder.length,
                extraLength = 0,
                LIMIT = 138;

            if( LIMIT < staticLength + address.length ) {
                extraLength = (staticLength + address.length) - LIMIT;
                if( 0 < extraLength ) {
                    address = address.substr( 0, address.length - extraLength );
                    Y.log( 'createSMSBody: text after cut=' + text, 'debug', NAME );
                }
            }
            text = text.replace( placeHolder, address );
            return text;
        }

        /**
         * Takes an array of prefilled schedules (i.e. with patient data and location data)
         * and gives back a list of messages.
         *
         * @method  getAlertText
         * @param   {Array<String>}         type            'CALL' | 'TIME' | 'DELETED' | 'CREATED' | 'UPDATED' -- currently supports three modes explicit call to the patient
         * @param   {Object}                schedule
         * @param   {Object}                content         This object gets pre-filled: content.text and content.subject will be set.
         * @param   {boolean}               isShort         set to "true" if the alert is meant for SMS
         */
        DCPatientAlert.prototype.getAlertText = function getAlertText( type, schedule, content, isShort ) {
            var
                address,
                locName,
                sstart,
                locPhone;

            // always give something back.
            content.subject = content.subject || '';
            content.text = content.text || '';

            // calendar may also have been deleted
            if( !schedule || !schedule.start || !schedule.calendar || !content ) {
                Y.log( 'getAlertText called with invalid parameters', 'warn', NAME );
                content.text = '';
                return;
            }

            // prevent server crash here, in case location has been deleted
            // gotcha: mongoose getter, so checking falsy state is not enough.
            if( !schedule.calendar.locationId ) {
                Y.log( 'Location does not exist, invalid appointment, aborting.', 'warn', NAME );
                // location deleted
                content.text = '';
                return;
            }

            address = schedule.calendar.locationId.locname +
                      '\n' + schedule.calendar.locationId.street + ' ' + schedule.calendar.locationId.houseno +
                      '\n' + schedule.calendar.locationId.zip + ' ' + schedule.calendar.locationId.city;

            sstart = moment( schedule.start );
            locName = schedule.calendar.locationId.locname;
            locPhone = schedule.calendar.locationId.phone || "k.A.";
            const bookingDate = sstart.format( i18n( 'CalendarMojit.tab_waiting-list.patientAlert.TIMESTAMP_FORMAT_WITH_DAY_AND_TIME' ) );
            if( 0 === type.indexOf( 'TIME' ) ) {
                if( isShort ) {
                    content.subject = i18n( 'CalendarMojit.tab_waiting-list.patientAlert.TIME.isShort.subject' );
                    content.text = i18n( 'CalendarMojit.tab_waiting-list.patientAlert.TIME.isShort.text', {
                        data: {
                            bookingDate: bookingDate,
                            locName: locName,
                            locPhone: locPhone
                        }
                    } );
                } else {
                    content.subject = i18n( 'CalendarMojit.tab_waiting-list.patientAlert.TIME.isLong.subject', {
                        data: {
                            bookingDate: bookingDate,
                            locName: locName
                        }
                    } );
                    if( schedule.number ) {
                        content.subject += `. ${i18n( 'CalendarMojit.tab_waiting-list.patientAlert.TIME.isLong.number', {
                            data: {
                                number: schedule.number
                            }
                        } )}`;
                    }
                    content.text = i18n( 'CalendarMojit.tab_waiting-list.patientAlert.TIME.isLong.text', {
                        data: {
                            locPhone: locPhone
                        }
                    } );
                }
            } else if( 0 === type.indexOf( 'CALL' ) ) {
                schedule.calltime = moment().utc().toJSON(); // we are calling now
                if( isShort ) {
                    content.subject = i18n( 'CalendarMojit.tab_waiting-list.patientAlert.CALL.isShort.subject' );
                    content.text = i18n( 'CalendarMojit.tab_waiting-list.patientAlert.CALL.isShort.text', {
                        data: {
                            bookingDate: bookingDate,
                            locName: locName,
                            locPhone: locPhone
                        }
                    } );
                } else {
                    // NB: the SMS channel will join subject and content
                    content.subject = i18n( 'CalendarMojit.tab_waiting-list.patientAlert.CALL.isLong.subject' );
                    content.text = i18n( 'CalendarMojit.tab_waiting-list.patientAlert.CALL.isLong.text', {
                        data: {
                            locPhone: locPhone
                        }
                    } );
                }
            } else if( 0 === type.indexOf( 'DELETED' ) ) {
                if( isShort ) {
                    content.subject = i18n( 'CalendarMojit.tab_waiting-list.patientAlert.DELETED.isShort.subject' );
                    content.text = i18n( 'CalendarMojit.tab_waiting-list.patientAlert.DELETED.isShort.text', {
                        data: {
                            bookingDate: bookingDate,
                            locName: locName,
                            locPhone: locPhone
                        }
                    } );
                } else {
                    content.subject = i18n( 'CalendarMojit.tab_waiting-list.patientAlert.DELETED.isLong.subject' );
                    content.text = i18n( 'CalendarMojit.tab_waiting-list.patientAlert.DELETED.isLong.text', {
                        data: {
                            bookingDate: bookingDate,
                            locPhone: locPhone
                        }
                    } );
                }
            } else if( 0 === type.indexOf( 'CREATED' ) ) {
                if( isShort ) {
                    content.subject = i18n( 'CalendarMojit.tab_waiting-list.patientAlert.CREATED.isShort.subject' );
                    content.text = i18n( 'CalendarMojit.tab_waiting-list.patientAlert.CREATED.isShort.text', {
                        data: {
                            bookingDate: bookingDate,
                            locName: locName,
                            locPhone: locPhone
                        }
                    } );
                } else {
                    content.subject = i18n( 'CalendarMojit.tab_waiting-list.patientAlert.CREATED.isLong.subject', {
                        data: {
                            bookingDate: bookingDate
                        }
                    } );
                    content.text = i18n( 'CalendarMojit.tab_waiting-list.patientAlert.CREATED.isLong.text', {
                        data: {
                            bookingDate: bookingDate,
                            locPhone: locPhone
                        }
                    } );
                }
            } else if( 0 === type.indexOf( 'UPDATED' ) ) {
                if( isShort ) {
                    content.subject = i18n( 'CalendarMojit.tab_waiting-list.patientAlert.UPDATED.isShort.subject' );
                    content.text = i18n( 'CalendarMojit.tab_waiting-list.patientAlert.UPDATED.isShort.text', {
                        data: {
                            bookingDate: bookingDate,
                            locName: locName,
                            locPhone: locPhone
                        }
                    } );
                } else {
                    content.subject = i18n( 'CalendarMojit.tab_waiting-list.patientAlert.UPDATED.isLong.subject', {
                        data: {
                            bookingDate: bookingDate
                        }
                    } );
                    content.text = i18n( 'CalendarMojit.tab_waiting-list.patientAlert.UPDATED.isLong.text', {
                        data: {
                            bookingDate: bookingDate,
                            locPhone: locPhone
                        }
                    } );
                }
            }

            if( isShort ) {
                content.text = checkSMSLength( address, content.subject, content.text, '$address$' ); // cut off some of the text to fit in a single SMS
            } else {
                content.text = content.text.replace( '$address$', address );
            }
        };

        /**
         * compute the next reminding time.
         * Either the reminder set by patient or the one set by practice
         * returns null if there is no next alert
         * @param   {Date}      eta         original start time of the event
         * @param   {Date}      start
         * @param   {Date}      alertTime
         * @param {Array}       alerts
         * @returns {moment}    next alert time
         */
        function getNextAlertTime( eta, start, alertTime, alerts ) {
            var
                now = moment(),
                lastCall = moment( alertTime || 0 ), //last time an alert called for the event
                etaTime = moment( eta ), // original start time
                startTime = moment( start ),
                myAlertTime,
                nextAlert = null,
                nextAlertTime = null;

            // sort all reminders in increasing order of minutes-in-advance
            alerts = alerts.sort( function( a, b ) {
                return a.minutesinadvance > b.minutesinadvance || !a.minutesinadvance;
            } );

            // pick the alert with the latest time which is still in the past
            // alertTime < alert time < now
            nextAlert = Y.Array.find( alerts, function( alert ) {
                if( true === alert.patientAlert ) {
                    myAlertTime = moment( startTime ).add( -alert.minutesinadvance, 'minutes' );
                    return alert.minutesinadvance && myAlertTime.isAfter( lastCall ) && myAlertTime.isBefore( now );
                } else {
                    myAlertTime = moment( etaTime ).add( -alert.minutesinadvance, 'minutes' );
                    return alert.minutesinadvance && myAlertTime.isAfter( lastCall ) && myAlertTime.isBefore( now );
                }
            } );

            if( nextAlert && true === nextAlert.patientAlert ) {
                nextAlertTime = startTime.add( -nextAlert.minutesinadvance, 'minutes' );

            } else if( nextAlert ) {
                nextAlertTime = etaTime.add( -nextAlert.minutesinadvance, 'minutes' );
            }

            return nextAlertTime;
        }

        /** automated checks for whether a patient reminder needs to go out
         * Goes through a list of events, and checks the timeinadvance, alertTime and
         * start time to determine if the event qualifies to be alerted.
         *
         * An alert is triggered only if the alert is in the past
         *
         * @param   {Object}            user
         * @param   {Object}            events
         * @param   {Object}            alertSettings global notification settings
         * @param   {Function}          callback
         *
         */
        function checkEventAlert( user, events, alertSettings, callback ) {

            function practiceCb( err, results ) {
                var
                    practice,
                    alerts,
                    now = moment(),
                    nextAlertTime,
                    event,
                    hotEvents = [],
                    i;

                if( err || !results || !results[0] ) {
                    Y.log( err || 'Patient Alert Error getting practice', 'debug', NAME );
                    callback( err );
                    return;
                }

                practice = results[0];
                alerts = (practice.reminderAlert1 || []).concat( practice.reminderAlert2 || [] ).concat( practice.reminderAlert3 || [] ); // mix all alerts in one pan

                // remove deactivated alerts. only for practice defined alerts.
                alerts = alerts.filter( function( a ) {
                    if( 'sms' === a.type && !alertSettings.smsActive ) {
                        return false;
                    } else if( 'email' === a.type && !alertSettings.emailActive ) {
                        return false;
                    }
                    return a.active;
                } );

                for( i = 0; i < events.length; i++ ) {
                    // check each event
                    event = events[i];

                    // add the patient defined alert
                    if( event.wantsAlert ) {
                        let myAlert = Y.doccirrus.schemas.practice.createAlert( 'sms', 'patient', true, event.timeinadvance );
                        myAlert.patientAlert = true;
                        alerts.push( myAlert );
                        myAlert = Y.doccirrus.schemas.practice.createAlert( 'email', 'patient', true, event.timeinadvance );
                        myAlert.patientAlert = true;
                        alerts.push( myAlert );
                    }

                    nextAlertTime = getNextAlertTime( event.eta, event.start, event.alertTime, alerts );

                    if( nextAlertTime && nextAlertTime.isBefore( (now) ) ) {
                        Y.log( 'reminder will be sent for the event. startTime: ' + event.start, 'debug', NAME );
                        //event.alertTime = moment.utc().toJSON();
                        hotEvents.push( event );
                    }
                }
                callback( err, hotEvents );
            }

            Y.doccirrus.mongodb.runDb( {
                model: 'practice',
                user: user,
                query: {},
                callback: practiceCb
            } );
        }

        function alertEventDeleted( user, events, options, callback ) {
            if( options.smsActive || options.emailActive ) {
                Y.doccirrus.communication.sendMessagesForEvents( user, 'DELETED', events, options, callback );
            } else {
                Y.log( 'Email and SMS alert globally off for DELETE event, no message will be sent', 'info', NAME );
                callback();
            }
        }

        function alertEventUpdated( user, events, options, callback ) {
            if( options.smsActive || options.emailActive ) {
                Y.doccirrus.communication.sendMessagesForEvents( user, 'UPDATED', events, options, callback );
            } else {
                Y.log( 'Email and SMS alert globally off for UPDATE event, no message will be sent', 'info', NAME );
                callback();
            }
        }

        function alertEventCreated( user, events, options, callback ) {
            if( options.smsActive || options.emailActive ) {
                Y.doccirrus.communication.sendMessagesForEvents( user, 'CREATED', events, options, callback );
            } else if( options.copyToLocation ) {
                // may have to do some preprocessing
                Y.doccirrus.communication.sendMessagesForEvents( user, 'CREATED', events, options, callback );
            } else {
                Y.log( 'Email and SMS alert globally off for CREATE event, no message will be sent', 'info', NAME );
                callback();
            }
        }

        function alertEventReminder( user, events, options, callback ) {
            Y.doccirrus.communication.sendMessagesForEvents( user, 'TIME', events, options, callback );
        }

        function alertEventCalled( user, events, options, callback ) {
            Y.doccirrus.communication.sendMessagesForEvents( user, 'CALL', events, options, callback );
        }

        function alertEventCron( user, events, options, callback ) {
            callback( null );
        }

        /**
         *
         * @method  alertEvents
         * @param   {Object}            user
         * @param   {Array}             events
         * @param   {Object}            options
         * @param   {Boolean}           options.deleted         event was deleted
         * @param   {Boolean}           options.updated         event start time was changed
         * @param   {Boolean}           options.created         event is newly created
         * @param   {Boolean}           options.reminder        patient needs reminder
         * @param   {Boolean}           options.cron            true, if triggered by cron, otherwise comes from user
         * @param   {Function}          callback
         */
        DCPatientAlert.prototype.alertEvents = function alertEvents( user, events, options, callback ) {
            Y.log( 'alertEvents, options: ' + JSON.stringify( options ) + ' #ofEvents: ' + events.length, 'debug', NAME );
            var
                createAlert,
                updateAlert,
                deleteAlert,
                reminderAlert1,
                alertSettings = {
                    smsActive: true, // global off/on for sms
                    emailActive: true, // global off/on for email
                    copyToLocation: false // dis/enable CC to location
                },
                filteredEvents = [],
                async = require( 'async' );

            if( !events || !events.length ) {
                callback( null );
                return; // EXIT
            }

            function dispatchEvents( err, practice ) {

                if( !events || !events.length ) {
                    callback( null );
                    return; // EXIT
                }

                if( err || !practice || !practice[1] || !practice[1][0] ) {
                    Y.log( 'Patient Alert: Error getting practice', 'debug', NAME );
                    callback( err );
                    return;
                }

                practice = practice[1][0];
                createAlert = practice.createAlert || [];
                updateAlert = practice.updateAlert || [];
                deleteAlert = practice.deleteAlert || [];
                reminderAlert1 = practice.reminderAlert1 || [];

                if( options.deleted ) {
                    alertSettings.emailActive = Y.doccirrus.schemas.practice.getAlert( deleteAlert, 'patient', 'email' ).active;
                    alertSettings.smsActive = Y.doccirrus.schemas.practice.getAlert( deleteAlert, 'patient', 'sms' ).active;
                    alertSettings.copyToLocation = Y.doccirrus.schemas.practice.getAlert( deleteAlert, 'location', 'email' ).active;
                    alertEventDeleted( user, events, alertSettings, callback );

                } else if( options.updated ) {
                    alertSettings.emailActive = Y.doccirrus.schemas.practice.getAlert( updateAlert, 'patient', 'email' ).active;
                    alertSettings.smsActive = Y.doccirrus.schemas.practice.getAlert( updateAlert, 'patient', 'sms' ).active;
                    alertSettings.copyToLocation = Y.doccirrus.schemas.practice.getAlert( updateAlert, 'location', 'email' ).active;
                    events.forEach( item => {
                        item._sendAt = moment().add( 2, 'm' ).toISOString();
                    } );
                    alertEventUpdated( user, events, alertSettings, callback );

                } else if( options.created ) {
                    alertSettings.emailActive = Y.doccirrus.schemas.practice.getAlert( createAlert, 'patient', 'email' ).active;
                    alertSettings.smsActive = Y.doccirrus.schemas.practice.getAlert( createAlert, 'patient', 'sms' ).active;
                    alertSettings.copyToLocation = Y.doccirrus.schemas.practice.getAlert( createAlert, 'location', 'email' ).active;
                    alertEventCreated( user, events, alertSettings, callback );

                } else if( options.reminder ) {
                    alertSettings.emailActive = Y.doccirrus.schemas.practice.getAlert( reminderAlert1, 'patient', 'email' ).active;
                    alertSettings.smsActive = Y.doccirrus.schemas.practice.getAlert( reminderAlert1, 'patient', 'sms' ).active;
                    alertSettings.copyToLocation = Y.doccirrus.schemas.practice.getAlert( reminderAlert1, 'location', 'email' ).active;

                    async.waterfall( [
                        function( next ) {
                            checkEventAlert( user, events, alertSettings, next );
                        },
                        function( hotEvents, next ) {
                            if( !hotEvents.length ) {
                                Y.log( 'no event with reminder alert at this moment', 'debug', NAME );
                                return setImmediate( next, null, hotEvents );
                            }
                            Y.log( `sending reminder alerts for ${hotEvents.length} event(s)`, 'debug', NAME );

                            alertEventReminder( user, hotEvents, alertSettings, err => next( err, hotEvents ) );

                        },
                        function( hotEvents, next ) {
                            if( !hotEvents.length ) {
                                return setImmediate( next, null, hotEvents, null );
                            }
                            Y.doccirrus.mongodb.getModel( user, 'schedule', true, ( err, model ) => next( err, hotEvents, model ) );
                        },
                        function( hotEvents, model, next ) {
                            if( !hotEvents.length ) {
                                return setImmediate( next, null );
                            }
                            model.mongoose.update( {_id: {$in: hotEvents.map( item => item._id )}}, {
                                $set: {
                                    alertTime: moment().toISOString(),
                                    wantsAlert: false
                                }
                            }, {multi: true}, err => {
                                next( err );
                            } );
                        }
                    ], callback );

                } else if( options.called ) {
                    alertEventCalled( user, events, alertSettings, callback );

                } else if( options.cron ) {
                    alertEventCron( user, events, alertSettings, callback );

                } else {
                    if( options.updated || options.created || options.deleted || options.reminder ) {
                        Y.log( `All alerts are off for: ${JSON.stringify( options )}`, 'warn', NAME );

                    } else { // wrong options
                        throw new Error( `No such alert type: ${JSON.stringify( options )}` );
                    }
                }
            }

            // first get alert settings
            async.series( [
                    function( next ) {
                        async.eachSeries( events, ( item, innerNext ) => {
                            if( item.scheduletype ) {
                                Y.doccirrus.mongodb.runDb( {
                                    model: 'scheduletype',
                                    user: user,
                                    query: {_id: item.scheduletype}
                                }, ( error, result ) => {
                                    if( error ) {
                                        return innerNext( error );
                                    }
                                    if( result && result[0] ) {
                                        if( !result[0].noPatientMessage ) {
                                            filteredEvents.push( item );
                                        }
                                    }
                                } );
                            } else {
                                filteredEvents.push( item );
                            }
                            return innerNext();
                        }, ( err ) => {
                            if( err ) {
                                return next( err );
                            }
                            events = filteredEvents;
                            return next();
                        } );
                    },
                    function( next ) {
                        Y.doccirrus.mongodb.runDb( {
                            model: 'practice',
                            user: user,
                            query: {},
                            callback: next
                        } );
                    }
                ],
                dispatchEvents
            );

        };

        /**
         *
         * Get the patient alerts relevant to right now. Current algorithm:
         *
         * select all schedules where:
         *   start > now
         *   conferenceId is not present which means that it's not a schedule from CONFERENCE or ONLINE_CONSULTATION
         *
         * we don't try to narrow things down by alertTime, repeat calls, etc.
         * Realign must notice a big jump and react by deleting the alertTime.
         *
         * @method getPatientAlerts
         * @param {Object} user
         * @param {Function} callback function( err, resultArray) array of mongoose objects
         */
        function getPatientAlerts( user, callback ) {
            // hit the DB...
            Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'schedule',
                    query: {
                        conferenceId: {$exists: false},
                        start: {
                            $gt: moment.utc().toJSON(),
                            $lt: moment.utc().add( Y.doccirrus.schemas.practice.getMaxMinutesInAdvance(), 'minutes' ).toJSON()
                        }
                    },
                    callback: callback
                }
            );
        }

        DCPatientAlert.prototype.alertPatients = function alertPatients( user, callback ) {

            function patAlertCb( err, response ) {
                if( err ) {
                    callback( err );
                    return;
                }
                Y.doccirrus.patalert.alertEvents( user, response, {reminder: true}, callback );
            }

            getPatientAlerts( user, patAlertCb );
        };

        myPA = new DCPatientAlert();

        Y.namespace( 'doccirrus' ).patalert = myPA;

    },
    '0.0.1', {requires: []}
)
;
