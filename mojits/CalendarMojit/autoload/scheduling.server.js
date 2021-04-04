/**
 * User: rrrw
 * Date: 12.02.13  12:09
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


/*jslint anon:true, nomen:true, esnext:true */
/*global YUI*/



/**
 *
 *
 * Scheduling library used in the Calendar mojit to handle automatic
 * Calendar entry movement.
 *
 * Any dates and times coming out of the calendar can be trusted since the calendar does
 * an automatic conversion to UTC().  In the database, UTC values are stored!!
 *
 * @module calendar
 * @submodule dcscheduling
 *
 */

YUI.add( 'dcscheduling', function( Y, NAME ) {
        const
            util = require('util'),
            {formatPromiseResult} = require('dc-core').utils;

        var
            moment = require( 'moment' ),
            lodash = require( 'lodash' ),
            /**
             * PUSH_TIMEOUT_MINUTES  minutes, till the push effect is forgotten, and the event
             *    is treated according to its start time again.
             */
            //PUSH_TIMEOUT_MINUTES = 1,
            /**
             * A low average consultation duration.
             * @const AVG_DURATION_MINUTES
             * @type Number
             */
            AVG_DURATION_MINUTES = 15,
            /**
             * Always use now+buffer when moving an appointment to now, so that
             * the patient is not automatically late, but has a little time
             * @const BUFFER_TIME_MINUTES
             * @type Number
             */
            BUFFER_TIME_MINUTES = 2,

            /**
             * How often should the numbers be realigned? Can also be a float.
             * @const REALIGN_TIME_MINUTES
             * @type Number
             */
            REALIGN_TIME_MINUTES = 1,

            /**
             * Minimal duration on event admission, gridify time slots, 1=does not gridfy anything, just round to minutes
             * @const MINIMUM_DURATION_MINUTES
             * @type Number
             */
            MINIMUM_DURATION_MINUTES = 1,

            // this is the singleton Scheduling Object for the application
            // at the moment offers static functions
            myScheduling,
            // the cache allows the lastRealign system to work across tenants.
            // without the cache, lastRealign cannot work reliably.
            cache = {},
            INVALIDATE_CACHE = 'scheduler.invalidatecache',
            // Parallel movements do not need as large a buffer
            // 30 seconds / half a minute
            BUFFER_PARALLEL_REALIGN = 0.5;

        /**
         * Constructor for the module class.
         *
         * @class DCScheduling
         * @namespace doccirrus
         * @private
         */
        function DCScheduling() {
            // purely static object at the moment, nothing in the instances.
        }

        /**
         * how many minutes does an event last on average
         * this can be configured by the user - so we should
         * pull out of a db. FUTURE.
         * @method getAvgDuration {number}
         **/

        DCScheduling.prototype.getAvgDuration = function() {
            return AVG_DURATION_MINUTES;
        };

        /**
         * how many minutes fuzz around an event start or end (overlap zone)
         * @method getFuzzyMinutes
         * @returns {number}
         */
        DCScheduling.prototype.getFuzzyMinutes = function() {
            return BUFFER_TIME_MINUTES;
        };

        /**
         * how many minutes till we forget an event has been pushed.
         * @method getPushForgetMinutes
         * @returns {number}
         */
        DCScheduling.prototype.getPushForgetMinutes = function() {
            return BUFFER_TIME_MINUTES;
        };
        /**
         * @method getLastRealignTime
         * @returns {??}
         */
        DCScheduling.prototype.getLastRealignTime = function() {
            return this.lastRealign;
        };

        /**
         * the last realign just took place (no synchronisation needed
         * here race conditions cannot lead to bad effects - only
         * differences of milliseconds).
         * @method setLastRealignTime
         */
        DCScheduling.prototype.setLastRealignTime = function() {
            this.lastRealign = Date.now();
        };

        DCScheduling.prototype.getRealignInterval = function() {
            return REALIGN_TIME_MINUTES;
        };

        DCScheduling.prototype.doRealign = function( user, callback ) {
            function handleScheduler( err, result ) {
                var
                    scheduler;
                if( err ) {
                    return callback( err, result );
                }
                scheduler = result;
                scheduler.realignAdHoc( user, callback );
            }

            myScheduling.getScheduler( user, handleScheduler );
        };

        DCScheduling.prototype.doCloseDay = async function( user, callback ) {
            const
                getSchedulerProm = util.promisify( myScheduling.getScheduler.bind(myScheduling) );

            let
                err,
                scheduler,
                updateNoShowAtEod;

            // -------------------------------------------- 1. Get scheduler ------------------------------------------------------------
            [err, scheduler] = await formatPromiseResult( getSchedulerProm( user ) );

            if( err ) {
                return callback( new Error(err.stack || err) );
            }
            // -------------------------------------------------- 1. END ----------------------------------------------------------------


            // ------------------------------------ 2. Get 'updateNoShowAtEod' flag from DB ---------------------------------------------
            [err, updateNoShowAtEod] = await formatPromiseResult( Y.doccirrus.api.practice.getUpdateNoShowAtEodFlag({user}) );

            if( err ) {
                Y.log(`doCloseDay: Error in 'Y.doccirrus.api.practice.getUpdateNoShowAtEodFlag'. Error: ${err.stack || err}`, "error", NAME);
                return callback( new Error(err.stack || err) );
            }
            // ---------------------------------------------------- 2. END --------------------------------------------------------------

            scheduler.closeDay( {updateNoShowAtEod}, callback );
        };

        /**
         * called on startup
         * creates a scheduler for SU
         *
         * @param   {Object}            user
         * @param   {Function}          callback
         */
        DCScheduling.prototype.doCloseDayOnStartup = function doCloseDayOnStartup( user, callback ) {
            callback = callback || function( err ) {
                    if( err ) {
                        Y.log( 'error in doCloseDayOnStartup: ' + err.toString(), 'error' );
                    }
                };

            if( !Y.doccirrus.auth.isPRC() && !Y.doccirrus.auth.isVPRC() ) {
                Y.log( 'skipping doCloseDayOnStartup for this server type', 'debug', NAME );
                callback();
                return;
            }

            function handleScheduler( err, result ) {
                var
                    scheduler;
                if( err ) {
                    return callback( err, result );
                }
                scheduler = result;
                scheduler.closeDayOnStartup( callback );
            }

            myScheduling.getScheduler( user, handleScheduler );
        };

        /**
         * The scheduler creates virtual events to track consultTimes and openTimes.
         *
         * Currently closeTimes are also identified as virtual.
         *
         * This method tells you if an event is virtual or not.
         *
         * @method isVirtual
         * @param {Object}          event
         * @returns {boolean}
         */
        DCScheduling.prototype.isVirtual = function isVirtual( event ) {
            if( event.consultTime || event.closeTime || !event._id ) {
                return true;
            }

            return false;
        };

        DCScheduling.prototype.personnelCanWrite = function personnelCanWrite( evtValidObj, user ) {
            return (
                // not inside a consult time
                (7001 === evtValidObj.resultInt || 7011 === evtValidObj.resultInt || 7017 === evtValidObj.resultInt ||
                 // inside a close time
                 7000 === evtValidObj.resultInt || 7012 === evtValidObj.resultInt ||
                 // overbooking of resource
                 7004 === evtValidObj.resultInt) &&
                // the request comes directly for the user, not from the patient portal (Friend)
                Y.doccirrus.auth.isFromUser( user )
            );
        };

        // -------------------- Scheduler Object ----------------

        /**
         * The scheduler is a per-tenant construction, which gives
         * access to important automatic calendar functions, such
         * as realign and closeDay.
         *
         * Additionally it has helper functions such as getBusyList
         * that give simple access to complex search in the calendar.
         *
         * @class Scheduler
         * @constructor scheduler object
         */
        function Scheduler() {
            // Our user
            this.user = null;
            // Today's times
            this.startNow = moment.utc();
            this.endToday = moment().endOf( 'day' );
            this.startToday = moment().startOf( 'day' );
            // intime configuration
            this.intimeConfig = null;
        }

        /**
         * Gets a scheduler for a particular user (i.e. tenant)
         *
         * The scheduler object has all the required functionality
         * like get next slot, increase duration, push / pull / schieben,
         *  etc.
         *
         * The scheduler works on the entire calendar set of a specific tenant.
         *
         * @method getScheduler
         * @param   {Object}            user
         * @param   {Function}          callback            (err, schedulerObject)
         *
         * @return {Function}           callback
         *
         *
         */
        DCScheduling.prototype.getScheduler = function( user, callback ) {
            var
                tenantId = user.tenantId || Y.doccirrus.auth.getLocalTenantId(),
                result;

            if( cache[tenantId] ) {
                return callback( null, cache[tenantId] );
            }

            Y.log( 'scheduler not in cache: ' + tenantId, 'debug', NAME );
            result = new Scheduler();
            cache[tenantId] = result;
            result.init( user, function( err ) {
                if( err ) {
                    return callback( err, null );
                }
                callback( null, result );
            } );
        };

        /**
         *
         * @param {string} tenantId
         * @param {boolean} fromIPC prevents a loop
         */
        DCScheduling.prototype.removeFromCache = function( tenantId, fromIPC ) {
            cache[tenantId] = null;
            delete cache[tenantId];
            if( !fromIPC ) { // to prevent infinite loop
                Y.doccirrus.ipc.send( INVALIDATE_CACHE, { tenantId: tenantId } ); // trigger "removeFromCache" on other workers
            }
        };

        /**
         * Sets up the models for this scheduler object.
         *
         * Must be called before any other calls are made on the Scheduler Object.
         * (not in constructor because async)
         * @method init
         * @param   {Object}            u           user object
         * @param   {Function}          cb          (err)  if intialisation failed returns error, otherwise returns null.
         */
        Scheduler.prototype.init = function init( u, cb ) {
            var
                user = u,
                myThis = this;

            // save the user.
            this.user = u;

            Y.doccirrus.api.practice.getIntimeConfig( {
                user: user,
                callback: function setConfig( err, confData ) {
                    if( err ) {
                        cb( err );
                    } else {
                        myThis.intimeConfig = confData;
                        cb( null, null );
                    }
                }
            } );
        };

        Scheduler.prototype.getConfig = function getConfig() {
            return this.intimeConfig || {};
        };

        /**
         * Calendar actions that mutate records should get a lock here.
         *
         * @param   {Function}            callback
         */
        Scheduler.prototype.getMainLock = function( callback ) {
            var
                myCb = callback,
                that = this;

            function lockAttempt( err, result ) {
                if( err ) {
                    Y.log( 'Error trying to obtain scheduling lock: ' + err, 'warn', NAME );
                }

                that.hasLock = (result ? true : false);
                Y.log( 'Got lock for scheduling operation: ' + that.hasLock, 'info', NAME );
                // locking working stably since 0.8.5.
                myCb();
            }

            Y.doccirrus.mongodb.getModel( that.user, 'sysnum', function sysnumCb( err, model ) {
                if( err ) {
                    Y.log( 'could not get lock DB' + err, 'info', NAME );
                    myCb( null, null );
                } else {
                    try {
                        Y.doccirrus.schemas.sysnum.getSchedulingLock( model, lockAttempt );
                    } catch( e ) {
                        Y.log( 'Error occured in locking mechanism: ' + e, 'warn', NAME );
                        // not sure if we can clean up here - perhaps rather do at startup.
                        if( that.haslock ) {
                            Y.doccirrus.schemas.sysnum.releaseSchedulingLock( model );
                        }
                    }
                }
            } );

        };

        /**
         * Wrapper for getEventList.
         *
         * Gets todays doctors calendars (if calendar undefined) sorted by start.
         * Otherwise gets exactly the calendar specified.
         * The start of the event must fall within today.
         *
         * This commonly used helper function for getEventList().
         *
         * @param   {Object}            params
         * @param   {String}            params.location
         * @param   {Object}            params.calendar
         * @param   {String}            params.scheduled
         * @param   {Function}          cb
         * @param   {Boolean}           params.noRealign
         * @param   {*}                 options
         */
        Scheduler.prototype.getTodaySortedByStart = function getTodaySortedByStart( params, cb, options ) {
            var
                user = params.user || this.user,
                myParams = {
                    calendarType: 'doctor',
                    scheduled: params.scheduled
                };

            myParams.dateFrom = 'today';
            myParams.duration = 'day';
            myParams.calendar = params.calendar;
            myParams.location = params.location;
            myParams.noRealign = params.noRealign;
            myParams.show = params.show || '';
            myParams.forDocSchedules = params.forDocSchedules || false;
            myParams.group = params.group;

            if( options ) {
                myParams.sort = options.sort;
                myParams.limit = options.limit;
            }
            Y.doccirrus.calUtils.getEventList( user, myParams, cb );
        };

        /**
         * Orchestrates several calls to getEventList to build a list of
         * events representing times, when the resource attached to the
         * given calendar(s) are busy.
         *
         * Is used to find Free Slots as well as to check validity of
         * new start and end times. Always with reference to some calendar
         * or other.
         *
         * withConsultTimes: The busylist can also ignore the consult times, and allow existing
         * events to wander through the day (taking into account overtime
         * etc.)  MOJ-829
         *
         * withTimeAfterLastConsultTime: ignored if withConsultTimes is false. Otherwise
         * has the effect of removing the last consultTimeNegated entry of the day
         * for each calendar, IF the calendar has at least one consultTime per day
         * (i.e. more than one negated consult time entry).  MOJ-953
         *
         * @param {Object}params  subset of getEventList() params:
         * dateFrom
         * windowDuration: duration
         * withConsultTimes: undefined = true | false
         * withTimeAfterLastConsultTime: undefined = true | false
         * dateTo
         * calendar
         * location
         * @param {Function}    callback
         */
        Scheduler.prototype.getBusyList = function getBusyList( params, callback ) {
            var
                user = this.user,
                start,
                end,
                myCount = 0,
                joinSum = 2,
                resultCache = [];

            if( !params || 'function' !== typeof callback ) {
                return;
            }

            /**
             * returns a javascript date given a moment() or date or string date.
             * @param {Object}  mom
             * @returns {*}
             */
            function itemDay( mom ) {
                // optimise if already a moment don't parse.
                if( mom.clone ) {
                    return mom.clone().hours( 0 ).minutes( 0 ).seconds( 0 ).milliseconds( 0 ).toDate();
                }
                return moment( mom ).hours( 0 ).minutes( 0 ).seconds( 0 ).milliseconds( 0 ).toDate();
            }

            function removeTimeAfterLastConsultTime( array ) {
                var
                    i,
                    obj,
                    item,
                    curDay,
                    startDay,
                    lastOfDay;

                if( !array ) {
                    return;
                }
                i = array.length;

                while( i > 0 ) {
                    i--;
                    item = array[i];
                    // only consider negated consult times
                    if( true === item.consultTime ) {
                        startDay = itemDay( item.start );

                        //console.log( 'TTT  s: ' + startDay + '  e: ' + endDay + '  c: ' + curDay + '   last: ' + lastOfDay );
                        // this is our hint to set up lasOfDay and curDay
                        // we don't compare date objects but their numerical value...
                        if( +curDay !== +startDay ) {
                            lastOfDay = i;
                            curDay = startDay;
                        } else {
                            // we have seen this day before,
                            // check if we should delete something
                            if( lastOfDay ) {
                                // splice it out
                                obj = array.splice( lastOfDay, 1 );
                                Y.log( `removing ${lastOfDay}   el: ${JSON.stringify( obj )}`, 'info', NAME );
                                // unset last in case there are others today
                                // we will delete only once per day and
                                // only if there is more than one per day
                                lastOfDay = undefined;
                            }
                        }
                    }
                }
            }

            function join( err, data ) {
                var
                    result = [];
                if( err ) {
                    Y.log( 'Test merging error: ' + err, 'warn', NAME );
                    resultCache.push( [] );
                } else {
                    resultCache.push( data );
                }
                myCount++;
                if( joinSum === myCount ) {
                    Y.log( `BusyList merging ${myCount} results:  ${JSON.stringify( resultCache )}`, 'debug', NAME );
                    if( myCount > 1 ) {
                        result = Y.doccirrus.calUtils.mergeSortEvents( resultCache[0], resultCache[1], { toJson: true } );
                        if( myCount > 2 ) {
                            resultCache[0] = result;
                            result = Y.doccirrus.calUtils.mergeSortEvents( resultCache[0], resultCache[2], { toJson: true } );
                        }
                    }
                    if( false !== params.withConsultTimes && false === params.withTimeAfterLastConsultTime ) {
                        removeTimeAfterLastConsultTime( result );
                        Y.log( `BusyList without Time after last consult time:  ${JSON.stringify( result )}`, 'debug', NAME );
                    }
                    return callback( null, (result || []) );
                }
            }

            start = moment( params.dateFrom );
            end = moment( params.dateTo );
            if( !start.isValid() ) {
                start = moment();
            }

            if( !end.isValid() || !params.dateTo ) {
                end = start.clone();
                end = end.add( 1, params.windowDuration || 'day' );
            }
            params.dateFrom = moment( start ); // save a copy
            params.dateTo = moment( end );
            start = start.startOf( 'day' );
            end = end.endOf( 'day' );

            Y.log( 'Getting busy list for window: ' + start.toJSON() + ' - end of the ' + params.windowDuration, 'debug', NAME );

            if( false !== params.withConsultTimes ) {
                Y.log( 'Getting busy list for window, ignoring Consult Times. ', 'debug', NAME );
                Y.doccirrus.calUtils.getEventList( user, {
                    calendar: params.calendar,
                    location: params.location,
                    dateFrom: start,
                    dateTo: end,
                    forScheduleType: params.forScheduleType,
                    consult: true,
                    negate: true,
                    duration: params.windowDuration
                }, join );
            } else {
                joinSum--;
            }
            Y.doccirrus.calUtils.getEventList( user, {
                specialFlag: params.specialFlag || false,
                calendar: params.calendar,
                location: params.location,
                calendarType: 'doctor',
                eventType: ['closeTime', 'adhoc', 'plan', 'resource'],
                dateFrom: start,
                dateTo: end,
                duration: params.windowDuration,
                scheduled: 'active'
            }, function( err, result ) {
                join( err, result );
            } );
            // SEARCH FOR closeTime BY END
            // here we end up duplicating some closetime events
            // but that doesn't impact on the algorithm, important is
            // that we have any close times that affect the time window
            // fix for MOJ-888
            //            Y.doccirrus.calUtils.getEventList( user, {
            //                calendar: params.calendar,
            //                location: params.location,
            //                calendarType: 'doctor',
            //                eventType: ['closeTime'],
            //                dateFrom: start,
            //                duration: params.windowDuration
            //            }, join );

        };

        /**
         * find the next group schedule
         * @param   {Object}            params
         * @param   {ObjectId}          params.patientId
         * @param   {String}            params.dateFrom
         * @param   {String}            params.startTime
         * @param   {String}            params.endTime
         * @param   {Function}          params.callback
         */
        Scheduler.prototype.getNextPreconfigured = function getNextPreconfigured( params ) {
            var
                user = this.user,
                startTime = params.startTime && moment( params.startTime )._d,
                endTime = params.endTime && moment( params.endTime )._d,
                dateTo = params.dateTo || moment( params.dateFrom ).add( params.windowDuration, 1 ),
                callback = params.callback,
                _cb = getPatientCalevents,
                noResults = [
                    {
                        start: -999,
                        code: 22005,
                        status: 'Kein Termin im gewünschten Zeitraum verfügbar.',
                        calendar: params.calendar,
                        location: params.location
                    }
                ],
                finalResult;

            if( !params.patientId && !params.slotSearch ) {
                Y.log( 'no patientId provided: ' + require( 'util' ).inspect( params ), 'debug', NAME );
                callback( Y.doccirrus.errors.rest( 400, 'no patientId provided' ) );
                return;
            }
            if( params.slotSearch && !params.patientId ) {
                _cb = ( err, result ) => {
                    if( err ) {
                        callback( err );
                        return;
                    }

                    if( !result[0] ) {
                        result = noResults;
                    }
                    return callback( null, result );
                };
            }

            function compareTimeOfDateObjects( firstDateObject, secondDateObject ) {
                return firstDateObject.getHours() < secondDateObject.getHours() ||
                       ( firstDateObject.getHours() === secondDateObject.getHours() &&
                         firstDateObject.getMinutes() <= secondDateObject.getMinutes() );
            }

            // remove those groups that patient already has used
            function filterCalevents( err, result ) {
                if( err ){
                    Y.log( 'error on filterCalevents' + err.message, 'error', NAME );
                }
                var
                    isUsed,
                    isInTimeRange;
                finalResult = Y.Array.filter( finalResult, function( groupMaster ) {
                    if( !groupMaster._id ) { // a virtual calevent means an empty group
                        return true;
                    }
                    isUsed = false;
                    isInTimeRange = true;
                    isUsed = Y.Array.some( result, function( patientCalevent ) {
                        if( patientCalevent.groupId ) {
                            return patientCalevent.groupId.toString() === groupMaster._id.toString();
                        } else {
                            return false;
                        }
                    } );
                    if( startTime && endTime ) {
                        let
                            eventStartTime = moment( groupMaster.start )._d,
                            eventEndTime = moment( groupMaster.end )._d;

                        // check if event is in requested time range
                        isInTimeRange = compareTimeOfDateObjects( startTime, eventStartTime ) && compareTimeOfDateObjects( eventEndTime, endTime );
                    }
                    return !isUsed && isInTimeRange;
                } );

                if( !finalResult[0] ) {
                    result = noResults;
                    return callback( null, result );
                }

                callback( null, finalResult );
            }

            function getPatientCalevents( err, result ) {
                if( err ) {
                    callback( err );
                    return;
                }

                if( !result[0] ) {
                    result = noResults;
                    return callback( null, result );
                }

                finalResult = result;

                Y.doccirrus.calUtils.getEventList( user, {
                    patient: params.patientId,
                    calendar: params.calendar,
                    scheduleType: params.scheduleType,
                    dateFrom: params.dateFrom,
                    dateTo: dateTo,
                    limit: params.limit,
                    noRealign: true
                }, filterCalevents );
            }

            // get those groups with capacity>0
            Y.doccirrus.calUtils.getEventList( user, {
                calendar: params.calendar,
                scheduleType: params.scheduleType,
                eventType: 'group',
                dateFrom: params.dateFrom,
                dateTo: params.dateTo ||  moment( params.dateFrom ).add( params.windowDuration, 1 ),
                limit: params.limit,
                noRealign: true
            }, _cb );

        };

        /**  NEXT_3RND   NEXT_SLOT
         *
         *
         * Part of the new Scheduler API.  You can get N slots for a specific size of event in
         * a specific calendar or calendars. The API is steered by the parameters, which define:
         *
         *         * The time window to search for slots is defined by
         *         * Which source to use
         *         * Whether a random pattern of slots is to be returned
         *
         * This is used to get the next slot for a new Number (adhoc). It is also used to get
         * random appointments for Patient Portal.
         *
         * Return -999 as the start time, when invalid.
         *
         * n: {Integer} number of events slots
         * slotDuration: {Integer} minutes, size of the slot.
         * dateFrom: {String} Date start of window
         * dateTo: {String} Date end of window
         * windowDuration: {String} alternatively duration of window: 'month', 'week', 'day'
         * calendar: {String} calendar Id
         * forScheduleType: {String} id of scheduleType to getNextNStartTimes for
         * location: {String} location Id
         * randomize:  {Boolean} return a random pattern
         * callback: {Function} function(err,resultList)
         *
         * @param {Object}  params
         */
        Scheduler.prototype.getNextNStartTimes = function getNextNStartTimes( params ) {
            /*jslint bitwise: true*/
            var
                duration = params.slotDuration || myScheduling.getAvgDuration(),
                nSlots = params.n || 1,
                startTime = params.startTime && moment( params.startTime )._d,
                endTime = params.endTime && moment( params.endTime )._d,
                forAdhoc = params.forAdhoc || false,
                myCb,
                that = this,
                results = [],
                requiredResources = params.requiredResources || [],
                finalResult = [],
                calendarsCount = -1,
                slot = 0,
                noResultError = {
                    start: -999,
                    status: 'Kein Termin im gewünschten Zeitraum verfügbar.',
                    calendar: params.calendar,
                    location: params.location
                };

            duration = parseInt( duration, 10 );

            if( !params || 'function' !== typeof params.callback ) {
                Y.log( 'getNextNStartTimes called without callback!', 'error', NAME );
                return;
            }
            myCb = async function( err, res ) {
                //means that we are searching for slots in resource calendars so need to wait for all results
                if( calendarsCount > 0 ) {
                    calendarsCount--;
                    slot = 0;
                    results = [];
                    finalResult = Y.doccirrus.calUtils.mergeSortEvents( finalResult, res, {} );
                } else {

                    if( res && res.length === 0 ) {
                        if( !forAdhoc ) {
                            noResultError.code = 22005;
                        }
                        res = [noResultError];
                    }

                    return params.callback( err, res );
                }

                if( 0 === calendarsCount ) {
                    let tempArray = [],
                        allAvailableResources,
                        foundedSlots = [];


                    if( finalResult && finalResult.length && -999 === finalResult[0].start ) {
                        return params.callback( null, finalResult );
                    }

                    // sort by start to set all slots in order
                    finalResult = lodash.sortBy( finalResult, 'start' );

                    // process each item in final array
                    finalResult.forEach( function( item ) {

                        // firstly, filter item resources to get only required resources
                        let availableResources = item.resources && item.resources.filter( function( itemRes ) {
                                return requiredResources.includes( itemRes.resourceType );
                            } ) || [],
                            slotResources;

                        // check if current item's start is not included already into tempArray
                        if( tempArray.indexOf( item.start.toISOString() ) < 0 ) {
                            /*//cut item's availableResources to item availableCapacity value
                            slotResources = availableResources.slice( 0, item.availableCapacity );*/

                            // add this item to foundedSlots array with filledUp flag, which is true if
                            // current item resources length is equal to requiredResources length
                            foundedSlots.push( {
                                start: moment( item.start ),
                                filledUp: availableResources.length === requiredResources.length,
                                slotResources: availableResources.map( item => item.resourceType ),
                                calendars: [
                                    {
                                        _id: item.calendar,
                                        resources: availableResources
                                    }]
                            } );

                            // copy current item resources into allAvailableResources for this start slot
                            allAvailableResources = [...availableResources];

                            // add this item's start value into tempArray
                            // to indicate that slot with such start value was already pushed into final array
                            tempArray.push( item.start.toISOString() );
                        } else {
                            // if current item's start is included already into tempArray, then we just search for it in final array and
                            // modify it if this slot wasn't filledUp on previous step
                            foundedSlots.forEach( ( slot ) => {
                                if( item.start.toISOString() === slot.start.toISOString() && !slot.filledUp ) {

                                    // filter item availableResources to get those resources which wasn't included yet into
                                    // allAvailableResources for this time slot and cut them to item's availableCapacity
                                    slotResources = availableResources.filter( ( itemRes ) => {
                                        return !allAvailableResources.find( itemAll => itemAll.resourceType === itemRes.resourceType );
                                    } )/*.slice( 0, slot.availableCapacity )*/;

                                    if( slotResources && slotResources.length ) {
                                        slot.calendars.push( {
                                            _id: item.calendar,
                                            resources: slotResources
                                        } );

                                        // get only different values from allAvailableResources and slotResources
                                        // to remove duplications in slot resources
                                        allAvailableResources = lodash.union( allAvailableResources, slotResources );

                                        // set value of slot's filledUp property based on updated allAvailableResources
                                        slot.filledUp = allAvailableResources.length === requiredResources.length;

                                        slot.slotResources = lodash.union( slotResources.map( item => item.resourceType ), slot.slotResources );
                                    }
                                }
                            } );
                        }
                    } );

                    for( let slot of foundedSlots ) {
                        if( !slot.filledUp ) {
                            let
                                slotStart = moment.utc( slot.start ).seconds( 0 ).milliseconds( 0 ).toDate(),
                                end = moment( slot.start ).add( duration, 'm' ),
                                slotEnd = moment.utc( end ).seconds( 0 ).milliseconds( 0 ).toDate(),
                                resourcesLeftToBook = requiredResources.filter( item => !slot.slotResources.includes( item ) ),
                                calendarsLeftToBook = params.calendarObjects.filter( calendar => {
                                    return calendar.resources.some( item => resourcesLeftToBook.includes( item.resourceType ) );
                                } ).map( item => item._id.toString() );

                            let [err, result] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                                    that.getBusyList( {
                                        calendar: calendarsLeftToBook,
                                        withConsultTimes: true,
                                        dateFrom: slot.start,
                                        dateTo: moment( slot.start ).add( duration, 'm' ),
                                        windowDuration: 'day'
                                    }, function( err, result ) {
                                        if( err ) {
                                            reject( err );
                                        }
                                        resolve( result );
                                    } );
                                }
                            ) );

                            if( err ) {
                                Y.log( `getNextNStartTimes.Error while getting busy list for slot ${slot.start} : ${err.stack || err}`, 'warn', NAME );
                                return params.callback( err );
                            }

                            let busyListMap = new Map();

                            // as we could have mixed busy list from different calendars,
                            // we should check each calendar blocked slots separately
                            result.forEach( busySlot => {
                                if( busyListMap.has( busySlot.calendar.toString() ) ) {
                                    busyListMap.set( busySlot.calendar.toString(), [...busyListMap.get( busySlot.calendar.toString() ), busySlot] );
                                } else {
                                    busyListMap.set( busySlot.calendar.toString(), [busySlot] );
                                }
                            } );

                            for( let value of busyListMap.values() ) {
                                if( !value.some( item => {
                                    let itemStart = moment.utc( item.start ).seconds( 0 ).milliseconds( 0 ).toDate(),
                                        itemEnd = moment.utc( item.end ).seconds( 0 ).milliseconds( 0 ).toDate();

                                    return Y.doccirrus.commonutils.hasClash( itemStart, itemEnd, slotStart, slotEnd );
                                } ) ) {
                                    for( let item of value ) {
                                        if( !slot.filledUp ) {
                                            // means that we can add this slot in this calendar as free-to-book
                                            let
                                                addedResources = ((params.calendarObjects.find( calendar => calendar._id.toString() === item.calendar.toString() )
                                                                  || {}).resources || []).filter( resource => resourcesLeftToBook.includes( resource.resourceType ) );

                                            if( addedResources && addedResources.length ) {
                                                slot.calendars.push( {
                                                    _id: item.calendar,
                                                    resources: addedResources
                                                } );

                                                slot.slotResources = lodash.union( addedResources.map( item => item.resourceType ), slot.slotResources );

                                                // set value of slot's filledUp property based on updated allAvailableResources
                                                slot.filledUp = slot.slotResources.length === requiredResources.length;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // fill end result with slots that are filled up with all required resources
                    finalResult = foundedSlots.filter( function( slot ) {
                        return slot.filledUp;
                    } );

                    if( finalResult.length > nSlots ) {
                        finalResult = finalResult.slice( 0, nSlots );
                    }

                    if( finalResult && finalResult.length === 0 ) {
                        if( !forAdhoc ) {
                            noResultError.code = 22005;
                        }
                        finalResult = [noResultError];
                    }

                    return params.callback( err, finalResult );
                }
            };

            Y.log( 'Getting ' + params.slotDuration + 'm ' + params.n, 'debug', NAME );

            function makeResultFromDate( t, cal, loc, res = []/*, resCap*/ ) {
                return {
                    start: t,
                    calendar: cal,
                    location: loc,
                    resources: res//,
                    //availableCapacity: resCap
                };
            }

            function fastForward( resultList, time, beginLoop ) {
                beginLoop = beginLoop || 0;
                var i, nextt;
                for( i = beginLoop; i < resultList.length; i++ ) {
                    if( resultList[i] && resultList[i].end ) {
                        nextt = moment( resultList[i].end ).unix();
                        if( nextt > time ) {
                            break;
                        }
                    }
                }
                return i;
            }

            function resetCurrentTime( list, index, time ) {
                var i;
                if( 0 < index && index < list.length ) {
                    i = moment( list[index - 1].end ).unix();
                    if( i > time ) {
                        time = i;
                    }
                }
                return time;
            }

            // update time and the given index... so returns an object.
            function randomAddCurrent( list, index, time ) {
                var rnd;
                rnd = ( 0 | (Math.random() * 4) + 1 ) * 15;
                time = (0 | time / 15) * 15 + (rnd * 60);
                Y.log( 'Added random minutes: ' + rnd, 'debug', NAME );
                // fast forward the index
                index = fastForward( list, time, index );
                // now let time align to the list
                time = resetCurrentTime( list, index, time );
                return { i: index, time: time };
            }

            function minutesOfDay( unixt ) {
                let m = moment.unix( unixt ).utc();
                return m.minutes() + m.hours() * 60;
            }

            function roundTo( currt, to ) {
                let mnt = moment.unix( currt ).minutes();
                return currt + ( (mnt % to ) ? (to - mnt % to ) : 0 ) * 60;
            }

            function compareTimeOfDateObjects( firstDateObject, secondDateObject ) {
                return firstDateObject.getHours() < secondDateObject.getHours() ||
                       ( firstDateObject.getHours() === secondDateObject.getHours() &&
                         firstDateObject.getMinutes() <= secondDateObject.getMinutes() );
            }

            function fastForwardToStartOfRequestedTimeRange( currt ) {
                if( startTime ) {
                    let eventStartTime = moment.unix( currt )._d;

                    if( compareTimeOfDateObjects( eventStartTime, startTime ) ) {
                        eventStartTime.setHours( startTime.getHours() );
                        eventStartTime.setMinutes( startTime.getMinutes() );
                        return moment( eventStartTime ).unix();
                    }
                }

                return currt;
            }

            function timeFrames( unixt ) {
                const frames = [
                    { b: 0, e: 660 },     // [0-11) UTC
                    { b: 660, e: 840 },   // [11-14)
                    { b: 840, e: 1440 }   // [14-24)
                ];
                var ind,
                    md = unixt && minutesOfDay( unixt ) || 0;
                for( let i = 0; i < frames.length; i++ ) {
                    if( frames[i].b <= md && md < frames[i].e ) {
                        ind = i;
                        break;
                    }
                }

                if( !ind && ind !== 0 ) {
                    ind = 0;
                }

                return frames[ind];
            }

            function findSlotsInList( err, resultList ) {

                var
                    i,
                    rnd,
                    startIdx,
                    durSecs = duration * 60,
                    result = 0,
                    //resourcesCapacity = 0,
                    calendarResources = [],
                    currentCalendar,
                    bookedResourceSlots = new Map(),
                    currt = moment( params.dateFrom ).unix(),
                    nextt;

                if( err ) {
                    myCb( err );
                    Y.log( 'Get BusyList failed. Cannot get next N slots.', 'warn', NAME );
                    // done...
                    return;
                }

                //for adHoc search only in current day
                if( forAdhoc ) {
                    resultList = resultList.filter( function( item ) {
                        return moment( item.start ).isBefore( moment().endOf( 'd' ) );
                    } );
                }
                Y.log( '\nResultList:\n' + JSON.stringify( resultList.map( item => ({
                    start: item.start,
                    end: item.end
                }) ) ) + '\n\n', 'debug', NAME );
                Y.log( 'Current time: ' + currt, 'debug', NAME );

                if( params.isRandomMode && !params.resourceSlotSearch ) {
                    if( Array.isArray( resultList ) ) {
                        // first we fast forward past the result entries that are
                        // before the currt, that we are interested in.
                        startIdx = fastForward( resultList, currt );
                        // now we check whether we are currently in a gap or in the
                        // middle of an event, and take the end of the event.
                        currt = resetCurrentTime( resultList, startIdx, currt );
                        // if we pass time range for events, then check if currt is not before start time
                        currt = fastForwardToStartOfRequestedTimeRange( currt );
                        currt = roundTo( currt, 5 );

                        if( params.randomize ) {
                            // additionally add some random minutes
                            rnd = randomAddCurrent( resultList, i, currt );
                            currt = rnd.time;
                            startIdx = rnd.i;
                        }

                        // now loop through the list looking for gaps that fit
                        // we'll either report all of them till we reach nSlots
                        // or we'll reach the end of the list first.
                        for( i = startIdx; i < resultList.length; i++ ) {
                            // param checking
                            if( !resultList[i] || !resultList[i].start ) {
                                Y.log( 'Event without start in DB:  ILLEGAL condition.', 'error', NAME );
                                myCb( 'Event without start in DB:  ILLEGAL state. ' + JSON.stringify( resultList ) );
                            }
                            // calculate in unix times - simpler ito time zones etc.
                            nextt = moment( resultList[i].start ).unix();
                            // is there a gap?
                            if( nextt - currt > durSecs ) {
                                if( endTime ) {
                                    let eventEndTime = moment.unix( currt + durSecs )._d;
                                    if( compareTimeOfDateObjects( eventEndTime, endTime ) ) {
                                        result = moment.unix( currt ).utc()._d;
                                        slot++;
                                        results.push( makeResultFromDate( result, params.calendar, params.location ) );
                                    }
                                } else {
                                    result = moment.unix( currt ).utc()._d;
                                    slot++;
                                    results.push( makeResultFromDate( result, params.calendar, params.location ) );
                                }
                                if( nSlots === slot ) {
                                    break;
                                }
                                if( params.randomize ) {
                                    // fast forward 4 hours before getting the next appointment
                                    currt = currt + (4 * 60 * 60); // 4 hrs
                                    i = fastForward( resultList, currt, i );
                                    // now let currt catch up
                                    currt = resetCurrentTime( resultList, i, currt );
                                    // if we pass time range for events, then check if currt is not before start time
                                    currt = fastForwardToStartOfRequestedTimeRange( currt );
                                    // additionally add some random minutes
                                    rnd = randomAddCurrent( resultList, i, currt );
                                    currt = rnd.time;
                                    i = rnd.i - 1;
                                } else if( params.sparse ) {
                                    let frameP = timeFrames( currt );

                                    currt = currt + durSecs;

                                    let frameN = timeFrames( currt ),
                                        currm = minutesOfDay( currt );

                                    if( frameP.e === frameN.e ) { //go to the next frame
                                        currt = currt + (frameN.e - currm) * 60;
                                    }
                                    currt = resetCurrentTime( resultList, i, currt );
                                    // if we pass time range for events, then check if currt is not before start time
                                    currt = fastForwardToStartOfRequestedTimeRange( currt );
                                    currt = roundTo( currt, 5 );
                                    i--;
                                } else {
                                    // add just the event time to currt (of our known duration)
                                    currt = currt + durSecs;
                                    // but we may not have exhausted the gap, so decrement i
                                    // this is not really elegant, but it works.
                                    i--;
                                }
                            } else if( !resultList[i] || !resultList[i].end ) {
                                // this entry does not have an end -- cannot use it to calculate the currt...
                                // check if it's an allday event.
                                if( !resultList[i].allDay ) {
                                    Y.log( 'GetNextSlot skipping bogus event. Event has no end time, but is not marked allDay:  \n' + JSON.stringify( resultList[i] ), 'warning', NAME );
                                }
                            } else {
                                // calculate the curr time using the end time of the last event
                                currt = Math.max( currt, moment( resultList[i].end ).unix() );
                                // if we pass time range for events, then check if currt is not before start time
                                currt = fastForwardToStartOfRequestedTimeRange( currt );
                                currt = roundTo( currt, 5 );
                                if( params.randomize ) {
                                    // don't use any exact times of existing appointments, rather fast-forward a
                                    // a random amount of time and look there.
                                    rnd = randomAddCurrent( resultList, i, currt );
                                    currt = rnd.time;
                                    i = rnd.i - 1;
                                }
                            }
                        }
                    }
                    if( ( nSlots !== slot ) && !forAdhoc && 12 > params.iterateLimit ) {
                        params.dateFrom = params.dateTo;
                        params.dateTo = moment( params.dateFrom ).add( 1, params.windowDuration );
                        params.iterateLimit++;
                        that.getBusyList( params, findSlotsInList );
                    } else if( ( nSlots !== slot ) && forAdhoc ) {
                        return myCb( null, [] );
                    } else if( ( nSlots !== slot ) && 12 <= params.iterateLimit ) {
                        return myCb( null, [] );
                    } else {
                        return myCb( null, results );
                    }
                } else {
                    if( Array.isArray( resultList ) ) {
                        // first we fast forward past the result entries that are
                        // before the currt, that we are interested in.
                        startIdx = fastForward( resultList, currt );

                        // now we check whether we are currently in a gap or in the
                        // middle of an event, and take the end of the event.
                        currt = resetCurrentTime( resultList, startIdx, currt );
                        // if we pass time range for events, then check if currt is not before start time
                        currt = fastForwardToStartOfRequestedTimeRange( currt );
                        currt = roundTo( currt, 5 );

                        if( params.randomize ) {
                            // additionally add some random minutes
                            rnd = randomAddCurrent( resultList, i, currt );
                            currt = rnd.time;
                            startIdx = rnd.i;
                        }

                        if( params.calendarObjects && params.calendarObjects[0] ) {
                            currentCalendar = params.calendarObjects.find( function( item ) {
                                return item._id.toString() === resultList[0].calendar;
                            } );
                            //resourcesCapacity = 1;
                            calendarResources = currentCalendar && currentCalendar.resources/*.map( ( item ) => {
                                return item.resourceType;
                            } )*/;
                        }

                        // now loop through the list looking for gaps that fit
                        // we'll either report all of them till we reach nSlots
                        // or we'll reach the end of the list first.

                        for( i = startIdx; i < resultList.length; i++ ) {
                            // param checking
                            if( !resultList[i] || !resultList[i].start ) {
                                Y.log( 'Event without start in DB:  ILLEGAL condition.', 'error', NAME );
                                myCb( 'Event without start in DB:  ILLEGAL state. ' + JSON.stringify( resultList ) );
                            }
                            if( resultList[i].resourceBased ) {
                                let resourceSlotStart = moment( resultList[i].start ).unix();
                                if( bookedResourceSlots.has( resourceSlotStart ) ) {
                                    let usedResources = bookedResourceSlots.get( resourceSlotStart );
                                    bookedResourceSlots.set( resourceSlotStart, [...usedResources, resultList[i].resource] );
                                } else {
                                    bookedResourceSlots.set( resourceSlotStart, [resultList[i].resource] );
                                }
                            }
                            // calculate in unix times - simpler ito time zones etc.
                            nextt = moment( resultList[i].start ).unix();

                            // is there a gap?
                            if( nextt - currt >= durSecs ) {
                                if( endTime ) {
                                    let eventEndTime = moment.unix( currt + durSecs )._d;
                                    if( compareTimeOfDateObjects( eventEndTime, endTime ) ) {
                                        result = moment.unix( currt ).utc()._d;
                                        slot++;
                                        results.push( makeResultFromDate( result, resultList[i].calendar, params.location, calendarResources/*, resourcesCapacity*/ ) );
                                    }
                                } else {
                                    result = moment.unix( currt ).utc()._d;
                                    slot++;
                                    results.push( makeResultFromDate( result, resultList[i].calendar, params.location, calendarResources/*, resourcesCapacity*/ ) );
                                }
                                if( nSlots === slot ) {
                                    break;
                                }
                                currt = moment( resultList[i].end ).unix();
                                // if we pass time range for events, then check if currt is not before start time
                                currt = fastForwardToStartOfRequestedTimeRange( currt );
                                currt = roundTo( currt, 5 );

                            } else if( !resultList[i] || !resultList[i].end ) {
                                // this entry does not have an end -- cannot use it to calculate the currt...
                                // check if it's an allday event.
                                if( !resultList[i].allDay ) {
                                    Y.log( 'GetNextSlot skipping bogus event. Event has no end time, but is not marked allDay:  \n' + JSON.stringify( resultList[i] ), 'warning', NAME );
                                }
                            } else {
                                // calculate the curr time using the end time of the last event
                                currt = Math.max( currt, moment( resultList[i].end ).unix() );
                                // if we pass time range for events, then check if currt is not before start time
                                currt = fastForwardToStartOfRequestedTimeRange( currt );
                                currt = roundTo( currt, 5 );
                            }
                        }

                        if( bookedResourceSlots.size ) {
                            bookedResourceSlots.forEach( ( usedResources, start ) => {
                                let availableResources = calendarResources[0] && calendarResources[0].resource.filter( item => !usedResources.includes( item.toString() ) );

                                if( availableResources && availableResources.length ) {
                                    results.push( makeResultFromDate( moment.unix( start ).utc()._d, resultList[0].calendar, params.location, [
                                        {
                                            ...calendarResources[0],
                                            resource: availableResources
                                        }]/*availableResources, resourcesCapacity - val*/ ) );
                                }
                            } );
                        }
                    }
                    return myCb( null, results );
                }
            }

            if( Array.isArray( params.calendar ) ) {
                calendarsCount = params.calendar.length;
                for( let calendar of params.calendar ) {
                    this.getBusyList( {...params, ...{ calendar: calendar }}, findSlotsInList );
                }
            } else {
                this.getBusyList( params, findSlotsInList );
            }

        };

        /*
         * Given an array of events, it will add the time already waited for each event into the event.
         * Elements to be added into the event:
         * "waited" (minutes, number), if an error occurs in the calculation UNDEFINED will be returned.
         *
         * Note: the number will always be positive.
         *
         * If the patient has already been admitted, or if the event occurred on previous days,
         * this function will still return the correct time waited by the patient.
         *
         * @data  array of input appointments (can be mixed schedules and repetitions)
         * @callback  (err,array_result) returns an error if no array is passed in.
         *            The resulting array is in array_result.
         */
        Scheduler.prototype.addTimeWaited = function addTimeWaited( data, callback ) {
            var
                i;
            if( Array.isArray( data ) ) {
                for( i = 0; i < data.length; i++ ) {
                    if( data[i].eta && data[i].start ) {
                        data[i].waited = Math.floor( ( moment().unix() - moment( data[i].eta ).unix()) / 60 );
                        Y.log( '*$*$', 'debug', NAME );
                        Y.log( moment( data[i].start ).unix(), 'debug', NAME );
                        Y.log( moment( data[i].eta ).unix(), 'debug', NAME );
                        if( data[i].waited < 0 ) {
                            data[i].waited = undefined;
                        }
                    }
                }
                return callback( null, data );
            } else {
                return callback( 'no array data to add waiting time' );
            }
        };

        /**
         * Given an array of events, it will add the waiting time for each event into the event.
         * Elements will be added into the event:
         * "wait" (minutes, number), if an error occurs in the calculation, -1 will be returned.
         * "waitText" (string, DE)
         * If already present elements will be overwritten.
         * If start or end time is missing in an appointment, then unexpected results can occur.
         *
         * @data
         * @callback  (err,array_result) returns an error if no array is passed in.
         *            The resulting array is in array_result.
         *
         *@param    {Object}            data            array of input appointments (can be mixed schedules and repetitions)
         *
         *@param    {Function}          callback        (err,array_result) returns an error if no array is passed in.
         *                                              The resulting array is in array_result.
         *
         *@return   {Function}          callback
         *
         */
        Scheduler.prototype.addWaitingTime = function addWaitingTime( data, callback ) {
            var
                i, schedule;
            if( Array.isArray( data ) ) {
                for( i = 0; i < data.length; i++ ) {
                    schedule = data[i];
                    data[i] = this.getWaitTimeForWAList( schedule );
                }
                return callback( null, data );
            } else {
                return callback( 'no array data to add waiting time' );
            }
        };

        /**
         * Expects to have an event for which it must calculate the wait time.
         * Returns the event with wait and waitText filled in as for "addWaitingTime".
         *
         * @param   {Object}          event           A repetition or schedule doc.
         * @param   {Function}        callback
         *
         * @return {Object}
         */
        Scheduler.prototype.getWaitTime = function getWaitTime( event ) {
            var
                t, t1, t2,
                e = event;
            // if its not an object return
            if( 'object' !== typeof e ) {
                Y.log( 'Invalid Param not an object in getWaitTime: ' + (e || 'no such event'), 'warn', NAME );
                return {};
            }
            // check event.start
            if( !e.start ) {
                e.wait = -1;
                e.waitText = 'Ungültig';

            } else {
                // do the calculation and return text
                t1 = moment().unix();
                t2 = moment( e.start ).unix();
                t = Math.floor( ( t2 - t1 ) / 60 );
                e.wait = t;
            }

            // original patient alert code cases from AD...
            if( Y.doccirrus.schemas.calendar.SCH_CURRENT === e.scheduled ) {
                e.waitText = 'Termin läuft';
                e.subtext = '';
            } else if( Y.doccirrus.schemas.calendar.SCH_ENDED === e.scheduled ) {
                e.waitText = 'Termin beendet';
                e.subtext = 'Ihre eingegebene Nummer ist nicht mehr gültig.';
            } else {
                e.waitText = e.wait + ' Minuten';
                e.subtext = '';
                if( e.wait <= 0 ) { //i18response_OK_delayed
                    e.subtext = 'Praxis wartet';
                } //else i18response_OK_changed
            }

            return e;
        };

        /**
         * Expects to have an event for which it must calculate the wait time.
         * Returns the event with wait and waitText filled in as for "addWaitingTime".
         *
         * @param   {Object}          event           A repetition or schedule doc.
         * @param   {Function}        callback
         *
         * @return {Object}
         */
        Scheduler.prototype.getWaitTimeForWAList = function getWaitTime( event ) {
            var
                i18n = Y.doccirrus.i18n,
                e = event,
                t1, t2, t;
            // if its not an object return
            if( 'object' !== typeof e ) {
                Y.log( 'Invalid Param not an object in getWaitTime: ' + (e || 'no such event'), 'warn', NAME );
                return {};
            }
            // check event.start
            if( !e.start ) {
                e.wait = -1;
                e.waitText = 'Ungültig';

            } else {
                // do the calculation and return text
                t1 = moment().unix();
                t2 = moment( e.start ).unix();
                t = Math.floor( ( t2 - t1 ) / 60 );
                e.wait = t;
            }
            // original patient alert code cases from AD...
            if( Y.doccirrus.schemas.calendar.SCH_CURRENT === e.scheduled ) {
                e.status = i18n( 'CalendarMojit.scheduleStatus.RUNNING' );
            } else if( Y.doccirrus.schemas.calendar.SCH_ENDED === e.scheduled ) {
                e.status = i18n( 'CalendarMojit.scheduleStatus.DONE' );
            }

            return e;
        };

        /**
         *
         * Internal function that closes the given event and saves it.
         *
         * Works for adhoc and non-adhoc.
         *
         * @param   {Object}            evt                 schedule mongoose object. (must not be a repetition doc for closeday)
         * @param   {Object}            user
         * @param   {boolean}           updateNoShowAtEod   Defaults to true because thats the default behaviour
         * @param   {Function}          callback
         */
        function closeAndSaveEvent( evt, user, updateNoShowAtEod = true, callback ) {
            if( !callback ) {
                callback = function() {
                    return;
                };
            }
            if( evt && evt.scheduled === Y.doccirrus.schemas.calendar.SCH_CURRENT ) {
                Y.log( `closeAndSaveEvent: ended called calevent: ${evt._id}`, 'debug', NAME );
                //
                // these are patients that were seen.
                // if current, we might want to adjust the end time according to the office hours.
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'schedule',
                    action: 'put',
                    query: {
                        _id: evt._id
                    },
                    fields: ['scheduled'],
                    data: {
                        skipcheck_: true,
                        scheduled: Y.doccirrus.schemas.calendar.SCH_ENDED
                    }
                }, ( err ) => {
                    if( err ) {
                        Y.log( `closeAndSaveEvent. Could not udpate schedule with _id: ${evt._id.toString()}. Error: ${JSON.stringify( err )}`, 'warn', NAME );
                    }
                    callback();
                } );

            } else if( evt && evt.scheduled === Y.doccirrus.schemas.calendar.SCH_WAITING ) {
                if( evt.adhoc && 'false' !== evt.adhoc && !evt.patient ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'schedule',
                        action: 'delete',
                        query: {
                            _id: evt._id
                        }
                    }, ( err ) => {
                        if( err ) {
                            Y.log( `closeAndSaveEvent. Could not delete schedule with _id: ${evt._id.toString()}. Error: ${JSON.stringify( err )}`, 'warn', NAME );
                        } else {
                            Y.log( `closeAndSaveEvent. Schedule with _id: ${evt._id} has been deleted`, 'debug', NAME );
                        }
                        callback();
                    } );
                } else if( evt.patient && !updateNoShowAtEod ) {
                    /**
                     * Means updateNoShowAtEod is set explicitly to false by the user in in practices collection and
                     * that this method is triggered by "CloseDay" cron job. In this case we do not want to change anything
                     */
                    Y.log(`closeAndSaveEvent: Skipping setting no show counter for patient: ${evt.patient} and schedule _id = ${evt._id} because 'updateNoShowAtEod' = ${updateNoShowAtEod}`, "info", NAME);
                    callback();
                } else {
                    Y.log( `closeAndSaveEvent: ended uncalled calevent: ${JSON.stringify( evt )}`, 'debug', NAME );
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'schedule',
                        action: 'put',
                        query: {
                            _id: evt._id
                        },
                        fields: ['scheduled', 'start', 'end'],
                        data: {
                            skipcheck_: true,
                            scheduled: Y.doccirrus.schemas.calendar.SCH_NOSHOW,
                            start: evt.eta,
                            end: moment( evt.eta ).add( 'minutes', evt.duration )
                        }
                    }, ( err ) => {
                        if( err ) {
                            Y.log( `closeAndSaveEvent. Could not udpate schedule with _id: ${evt._id.toString()}. Error: ${JSON.stringify( err )}`, 'warn', NAME );
                        } else {
                            Y.log( `saveCalevent (closeAndSaveEvent): ${JSON.stringify( evt )}`, 'debug', NAME );
                        }
                        callback();
                    } );
                }
            } else if( evt && ( evt.scheduled === Y.doccirrus.schemas.calendar.SCH_ENDED || evt.scheduled === Y.doccirrus.schemas.calendar.SCH_NOSHOW ) ) {
                setImmediate( callback );
            } else {
                // error case, dare not happen.
                Y.log( `closeAndSaveEvent: Database integrity error, invalid event state: ${JSON.stringify( evt )}`, 'error', NAME );
                setImmediate( callback );
            }
        }

        var rT;
        var diff = 1500;

        /**
         * Internal realign Ad Hoc
         * @param   {Object}            user
         * @param   {Object}            scheduler           "this"
         * @param   {Function}          callback
         *
         * @return  {Function}          callback
         */
        function realignAdHoc( user, scheduler, callback ) {

            scheduler.user = user || Y.doccirrus.auth.getSUForTenant( scheduler.user.tenantId ) || scheduler.user;

            // short-circuit
            if( false === scheduler.getConfig().autoShift ) {
                Y.log( 'auto shifting is disabled, exiting realignAdHoc', 'debug', NAME );
                return callback();
            }
            let closeDayTimeFrom = Y.doccirrus.kronnd.nextFireTime('CloseDay').format('HH:mm:ss'),
                closeDayTimeTo = Y.doccirrus.kronnd.nextFireTime('CloseDay').add( 4, 'm' ).format('HH:mm:ss');

            if( moment().format( 'HH:mm:ss' ) >= closeDayTimeFrom &&
                moment().format( 'HH:mm:ss' ) <= closeDayTimeTo ) {
                return callback();
            }

            // second short-circuit
            if( rT && (Date.now() < rT + diff) ) { // if the last realign was recent enough
                Y.log( 'Skipping realign', 'debug', NAME );
                // skip out without unlocking!!
                return callback();
            } else {
                rT = Date.now();
            }

            Y.doccirrus.schemas.sysnum.getSchedulingLock( scheduler.user, realign );

            function realign( err, lock ) {
                if( err ) {
                    return callback( err );
                }
                if( !lock ) {
                    return callback();
                }
                var
                    qs,
                    // wrap the callback to release the lock
                    cb = function( err, result ) {
                        Y.log( 'release lock', 'debug', NAME );
                        Y.doccirrus.schemas.sysnum.releaseSchedulingLock( scheduler.user, callback );
                        callback( err, result );
                    },
                    alignStart = moment().second( 0 ).millisecond( 0 );

                alignStart.minute( alignStart.minute() + 1 );

                // prevent those coming after us using 'soft' realign from calling this
                //Y.doccirrus.scheduling.setLastRealignTime();

                function isSameDay( a, b ) {
                    if( a.getDate() === b.getDate() ) {
                        return true;
                    }
                    return false;
                }

                /**
                 * Mutates moveQ and staticQ and returns the first element of either of these queues.
                 * Additionally mutates the elements returned from moveQ, so that they are aligned to
                 * the alignTo time.
                 *
                 * Takes into account day boundaries and will not realign across the day boundary.
                 * Automatically shuts the event that is approaching the day boundary.
                 *
                 * Takes into account that if there is a sufficient gap between alignTo time and
                 * Tq start time, that Nq can slip in between. Future: additionally check whether
                 * Nq can be moved forward (or if has notifications switched on -- e.g. 15 minutes
                 * before)
                 *
                 * @param   {Number}            alignTo
                 * @param   {Array}             moveQ
                 * @param   {Array}             staticQ
                 *
                 * @return {Number | null}
                 */
                function getAndAlignNextEvt( alignTo, moveQ, staticQ ) {
                    var
                        movable = moveQ[0],
                        durationM,
                        endM,
                        res;

                    // if the first item is a virtual event it is not moveable.
                    if( myScheduling.isVirtual( movable ) ) {
                        //Y.log( 'virtual movable ignoring' + movable, 'debug', NAME );
                        return null;
                    }
                    durationM = Math.floor( (movable.end.getTime() - movable.start.getTime()) / (60 * 1000) );
                    endM = moment( alignTo ).add( durationM, 'm' ).toDate();
                    // selectNextMovable or insert a static
                    if( 0 !== staticQ.length ) {
                        // work out the potential end time of the movable event and
                        // see if it fits in before the next fixed event.
                        if( endM > staticQ[0].start ) {
                            res = staticQ.shift(); // mutate staticQ
                            return res;
                        }
                    }
                    // res = NQ slice, NB must mutate first, then offer exit
                    res = moveQ.shift();
                    // check whether we are aligning to a different day
                    if( !isSameDay( endM, res.start ) ) {
                        closeAndSaveEvent( res, scheduler.user );
                        return null;
                    }

                    // move the result
                    myScheduling.moveEvt( scheduler.user, res, alignTo );

                    return res;

                }

                function realignQ( q ) {
                    var
                        alignTo = alignStart,
                        i,
                        event,
                        // t = now()
                        // helper Qs
                        TQ = [], // fixed queues
                        NQ = [], // moveable queues
                        RQ = []; // result Q

                    // setup queues -- FUTURE:  we can optimise this step away,
                    // but the two pass approach sure makes the algorithm
                    // easier to understand.
                    for( i = 0; i < q.length; i++ ) {
                        if( Y.doccirrus.calq.canPush( q[i] ) && !myScheduling.isVirtual( q[i] ) ) {
                            NQ.push( q[i] );
                        } else {
                            TQ.push( q[i] );
                        }
                    }
                    Y.doccirrus.calq.logQ( NQ );

                    // if not in serial operation then do the following step:
                    myScheduling.moveEvt( scheduler.user, TQ, moment.utc().add( BUFFER_PARALLEL_REALIGN, 'm' ) );

                    while( 0 < NQ.length ) {
                        // getNextEvt changes the start times, so all NQs must
                        // be sent through that function

                        event = getAndAlignNextEvt( alignTo, NQ, TQ );
                        // when nearing a day boundary, an event cannot be mutated any more
                        // and null is returned, the event must have been set to SCH_ENDED.
                        if( event ) {
                            // we actually do have an event - the normal case.
                            RQ.push( event );
                            // now we are aligning to the the end of this event.
                            alignTo = Math.max( event.end, alignTo.valueOf() );
                            alignTo = moment( alignTo );
                        }
                    }
                    // TQs on the other hand are just slapped into the queue
                    // as they come.
                    if( 0 < TQ.length ) {
                        RQ.join( TQ );
                    }
                    // at this point the queue is realigned and we continue...
                }

                function listCb( err, list ) {
                    var
                        i;

                    if( err ) {
                        cb( err );
                        return;
                    }
                    // realign each Queue, first get the queues
                    qs = Y.doccirrus.calq.getQs( list );
                    Y.log( 'Realigning ' + qs.length + ' queues.', 'debug', NAME );

                    for( i = 0; i < qs.length; i++ ) {
                        Y.doccirrus.calq.logQ( qs[i] );
                        Y.log( 'Realigning ' + (qs[i] && qs[i][0] && qs[i][0].calendar), 'debug', NAME );
                        realignQ( qs[i] );
                    }
                    // could return TOP_EVT as will often be called after push.
                    cb();
                }

                scheduler.getBusyList( {
                        dateFrom: scheduler.startToday,
                        windowDuration: 'day',
                        withConsultTimes: true,
                        withTimeAfterLastConsultTime: false // MOJ-953
                        //calendar: event.calendar,
                    },
                    listCb );
            }
        }

        /**
         * Moves a calEvent to a given Date (updates only the start and end times).
         *
         * @param   {Object}            user
         * @param   {Object}            ce calEvent
         * @param   {Date / Moment}    alignTo  Date or moment to move to -- no checking is done
         */
        DCScheduling.prototype.moveEvt = function( user, ce, alignTo ) {
            let realignedEvents = [];

            if( Array.isArray( ce ) ) {
                ce.forEach( event => {
                    if( event.group ) {
                        //skip group master schedule from realignment
                        return;
                    }
                    if( event.scheduled === Y.doccirrus.schemas.calendar.SCH_WAITING && !myScheduling.isVirtual( event ) &&
                        Y.doccirrus.calq.isLate( event )
                    ) {
                        // set calevent duration - in case this has been falsely set
                        event.duration = Math.floor( (event.end.getTime() - event.start.getTime()) / (60 * 1000) ); // from millis
                        // set new calevent start
                        event.start = alignTo;
                        // set new calevent end
                        event.end = moment( event.start ).add( event.duration, 'm' ).toDate();
                        realignedEvents.push( {
                            id: event._id,
                            start: event.start,
                            end: event.end,
                            eta: event.eta,
                            plannedDuration: event.plannedDuration
                        } );
                        updateEvent( event );
                    }
                } );
            } else {
                if( ce.group ) {
                    //skip group master schedule from realignment
                    return;
                }
                // set calevent duration - in case this has been falsely set
                ce.duration = Math.floor( (ce.end.getTime() - ce.start.getTime()) / (60 * 1000) ); // from millis
                // set new calevent start
                ce.start = alignTo;
                // set new calevent end
                ce.end = moment( ce.start ).add( ce.duration, 'm' ).toDate();
                realignedEvents.push( {
                    id: ce._id,
                    start: ce.start,
                    end: ce.end,
                    eta: ce.eta,
                    plannedDuration: ce.plannedDuration
                } );
                updateEvent( ce );
            }

            function updateEvent( evt ) {
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'schedule',
                    action: 'update',
                    query: {
                        _id: evt._id
                    },
                    data: {
                        $set: {
                            duration: evt.duration,
                            start: evt.start,
                            end: evt.end
                        }
                    }
                }, err => {
                    if( err ) {
                        Y.log( `Error during moving event ${err.stack || err}`, 'warn', NAME );
                    }
                    Y.log( 'moveEvt: the event: ' + JSON.stringify( evt ), 'debug', NAME );
                } );
            }

            if( 0 < realignedEvents.length ) {
                Y.doccirrus.communication.emitNamespaceEvent( {
                    nsp: 'default',
                    event: `calendar.realign`,
                    tenantId: user && user.tenantId,
                    msg: {
                        data: realignedEvents
                    }
                } );
            }
        };

        /**
         * Moves all adhoc unscheduled and non-adhoc late events around in the
         * calendar to allow for passing time.  I.e. realigns to now()
         *
         * Takes into account unmovable items - Termin.  Takes into account duration
         * of the event.
         *
         * Works on all calendar queues - could also be independently called.
         *
         * @param   {Object}            user
         * @param   {Function}          callback            (null, null) on success, (err, null) otherwise
         */
        Scheduler.prototype.realignAdHoc = function( user, callback ) {
            realignAdHoc( user, this, callback );
        };

        /**
         * Current or displayed Patient "Schieben" !!
         *
         * Complex process to get the current displayed "next" patient
         * out of the way in a fair manner!
         *
         * Can be called recursively...
         *
         * Works on multiple queues, as opposed to dePrioritiseEventInQ()
         *
         * Assumes the patient is at the front or near the front of all patients.
         *
         * @param   {Object}            user
         * @param   {ObjectId}          evtId           event id to push
         * @param   {String}            location
         * @param   {Function}          callback            (err, result)  result is the event that should be showing on
         *                                                  top of the heap in the waiting room  --  or null if there are no
         *                                                  events at all or if there is an error.
         */
        Scheduler.prototype.dePrioritiseEvent = function dePrioritiseEvent( user, evtId, location, callback ) {
            var
                that = this,
                cb = callback,
                // wrap the callback to release the lock
                myCallback = function( err, result ) {
                    cb( err, result );
                },
                myqueryid = evtId;

            function swapEvents( src, target ) {
                // start with a baby simple algorithm and then
                // take care of gaps - gaps are ironed out by the realignAdHoc mechanism.
                var
                    tstart, tend, sduration,
                    async = require( 'async' );

                Y.doccirrus.calq.logQ( [src, target] );
                tstart = src.start;
                tend = src.end;
                sduration = Math.floor( (tend.getTime() - tstart.getTime()) / (60 * 1000) );
                src.start = target.start;
                src.duration = sduration;
                src.end = moment( target.start ).add( src.duration, 'm' ).toDate();

                target.duration = Math.floor( (target.end.getTime() - target.start.getTime()) / (60 * 1000) );
                target.start = tstart;
                target.end = moment( tstart ).add( target.duration, 'm' ).toDate();

                async.parallel( [
                    function( done ) {
                        //mongooselean.toObject
                        let
                            srcData = Object.assign( {}, src.toObject ? src.toObject() : src );
                        delete srcData._id;
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'schedule',
                            action: 'put',
                            query: {
                                _id: src._id
                            },
                            fields: Object.keys( srcData ),
                            data: Object.assign( { skipcheck_: true }, srcData )
                        }, ( err ) => {
                            if( err ) {
                                return done( err );
                            }
                            Y.log( `swapEvents (src): ${JSON.stringify( src )} has been updated`, 'debug', NAME );
                            done();
                        } );
                    },
                    function( done ) {
                        //mongooselean.toObject
                        let
                            targetData = Object.assign( {}, target.toObject ? target.toObject() : target);
                        delete targetData._id;
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'schedule',
                            action: 'put',
                            query: {
                                _id: target._id
                            },
                            fields: Object.keys( targetData ),
                            data: Object.assign( { skipcheck_: true }, targetData )
                        }, ( err ) => {
                            if( err ) {
                                return done( err );
                            }
                            Y.log( `swapEvents (target): ${JSON.stringify( target )} has been updated`, 'debug', NAME );
                            done();
                        } );
                    }
                ], ( err ) => {
                    if( err ) {
                        Y.log( `swapEvents. Error: ${JSON.stringify( err )}`, 'warn', NAME );
                    } else {
                        Y.log( `swapEvents. Schedules were swapped successfully`, 'debug', NAME );
                    }

                } );
                Y.doccirrus.calq.logQ( [src, target] );
            }

            // do the push in the context of a push-time queue, ptq. and index (for next)
            // used recursively:  if the next is not suitable, we do Push with the
            // following.
            function doPush( index, evtToPush, pTQ ) {
                var
                    q,
                    target = pTQ[index];
                Y.log( 'doPush() ', 'debug', NAME );

                if( target !== evtToPush && Y.doccirrus.calq.canPush( target ) ) {
                    Y.log( 'doPush Got Target: ' + ((target && target.title) || 'NO TARGET'), 'debug', NAME );

                    // get target's queue from the original ranking
                    q = Y.doccirrus.calq.getQueue( target.calendar, that.origQ );

                    // check is target at the front of the q for its own calendar?
                    // this works because we are just juggling the same references
                    if( target === q[0] ) {
                        // don't do any further processing, just
                        // return the ref as current
                        Y.log( 'doPush Target at start of ' +
                               'Q.', 'debug', NAME );
                    } else {
                        // evtToPush is movable and Target is moveable, so you can swap them.
                        Y.log( 'doPush Swapping within Q.', 'debug', NAME );
                        swapEvents( target, evtToPush );
                    }
                    myCallback( null, target );

                } else {
                    Y.log( 'doPush Changing target.', 'debug', NAME );
                    // the target is not moveable, for whatever reason.
                    // find another target.
                    index++;
                    if( index >= pTQ.length ) {
                        myCallback( null, null );
                        return;
                    }
                    doPush( index, evtToPush, pTQ );
                }

            }

            // This is the main list that will drive the push.
            // we never change this list only manipulate references into the list
            //
            // The list consists of mongoose objects, so we can at any time
            // change the values and save them. The longer we hang on to the
            // ref though, the more chance that VersionError will be thrown.
            // So it's important that the Locking be water-tight!!
            //
            // the list includes pushtimes and everything we need on an event.
            function listCb( err, result ) {
                var
                    ptq,
                    evtToPush;
                if( err ) {
                    myCallback( err, null );
                    return;
                }
                if( !result || 0 === result.length ) {
                    Y.log( 'No events found for push ' + myqueryid, 'info', NAME );
                    myCallback( null, [] );
                    return;
                }
                // find the current
                evtToPush = Y.doccirrus.calq.getListEvt( result, myqueryid );
                if( !evtToPush ) {
                    Y.log( 'Bogus call: Invalid Event Id to Push ' + myqueryid, 'info', NAME );
                    myCallback( null, null );
                    return;
                }
                // just do a Queue push downwards in the Queue, see if it is possible for
                // this type of an event.
                if( !Y.doccirrus.calq.canPush( evtToPush ) ) {
                    Y.log( 'Cannot push this Event: Id to Push ' + myqueryid, 'info', NAME );
                    myCallback( null, null );
                    return;
                }

                // remember this original Queue of mongoose objects
                that.origQ = result;

                // set the pushtime
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'schedule',
                    action: 'put',
                    query: {
                        _id: evtToPush._id
                    },
                    fields: ['pushtime'],
                    data: {
                        skipcheck_: true,
                        pushtime: moment().utc()
                    }
                }, ( err ) => {
                    if( err ) {
                        Y.log( `dePrioritiseEvent. evtToPush error: ${JSON.stringify( err )}`, 'debug', NAME );
                    } else {
                        Y.log( `dePrioritiseEvent. evtToPush: ${JSON.stringify( evtToPush )} has been updated`, 'debug', NAME );
                    }
                } );

                // sort list by pushtime, making the pushtime queue
                ptq = Y.doccirrus.calq.getPushTimeQ( user, result );
                // ready to push
                doPush( 0, evtToPush, ptq );

            }

            that.getTodaySortedByStart( {
                location: location,
                calendar: undefined,
                scheduled: 'waiting'
            }, listCb );

        };

        /**
         * Specific Patient "Schieben" !!
         *
         * Process to move the indicated appointment down the waiting list in a fair manner.
         *
         * Cannot be called recursively...  either it pushes the event id provided, or not.
         *
         * Performs realignAdHoc.
         *
         * @param   {Object}            user
         * @param   {Attay}             calId
         * @param   {ObjectId}          evtId           event id to push
         * @param   {Function}          callback            (err, result)  result is the event that should be showing on
         *                                                  top of the heap in the waiting room  --  or null if there are no
         *                                                  events at all or if there is an error.
         */
        Scheduler.prototype.dePrioritiseEventInQ = function dePrioritiseEventInQ( user, calId, evtId, callback ) {
            var
                that = this,
                cb = callback,
                // wrap the callback to release the lock
                myCallback = function( err, result ) {
                    cb( err, result );
                },
                myEventId = evtId,
                myCalId = calId;

            function swapEvents( src, target ) {
                var
                    tstart, tend, sduration,
                    async = require( 'async' );

                //Y.doccirrus.calq.logQ( [src, target] );
                tstart = src.start;
                tend = src.end;
                sduration = Math.floor( (tend.getTime() - tstart.getTime()) / (60 * 1000) );
                src.start = target.start;
                src.duration = sduration;
                src.end = moment( target.start ).add( src.duration, 'm' ).toDate();

                target.duration = Math.floor( (target.end.getTime() - target.start.getTime()) / (60 * 1000) );
                target.start = tstart;
                target.end = moment( tstart ).add( target.duration, 'm' ).toDate();

                async.parallel( [
                    function( done ) {
                        //mongooselean.toObject
                        let
                            srcData = Object.assign( {}, src.toObject ? src.toObject() : src );
                        delete srcData._id;
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'schedule',
                            action: 'put',
                            query: {
                                _id: src._id
                            },
                            fields: Object.keys( srcData ),
                            data: Object.assign( { skipcheck_: true }, srcData )
                        }, ( err ) => {
                            if( err ) {
                                return done( err );
                            }
                            Y.log( `swapEvents (src): ${JSON.stringify( src )} has been updated`, 'debug', NAME );
                            done();
                        } );
                    },
                    function( done ) {
                        //mongooselean.toObject
                        let
                            targetData = Object.assign( {}, target.toObject? target.toObject() : target );
                        delete targetData._id;
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'schedule',
                            action: 'put',
                            query: {
                                _id: target._id
                            },
                            fields: Object.keys( targetData ),
                            data: Object.assign( { skipcheck_: true }, targetData )
                        }, ( err ) => {
                            if( err ) {
                                return done( err );
                            }
                            Y.log( `swapEvents (target): ${JSON.stringify( target )} has been updated`, 'debug', NAME );
                            done();
                        } );
                    }
                ], ( err ) => {
                    if( err ) {
                        Y.log( `swapEvents. Error: ${JSON.stringify( err )}`, 'warn', NAME );
                    } else {
                        Y.log( `swapEvents. Schedules were swapped successfully`, 'debug', NAME );
                    }

                } );
                //Y.doccirrus.calq.logQ( [src, target] );
            }

            // do the push in the context of a push-time queue, ptq. and index (for next)
            // used recursively:  if the next is not suitable, we do Push with the
            // following.
            /**
             * @param   {Object}            current             the current element to be pushed.
             * @param   {Number}            index
             */
            function doDownPushInQ( current, index ) {
                var
                    target;
                if( index >= that.origQ.length - 1 ) {
                    Y.log( 'User chose last event in Q, cannot push.', 'debug', NAME );
                    myCallback( null, null );
                    return;
                }
                target = that.origQ[index + 1];

                Y.log( 'Got Target: ' + ((target && target.title) || 'NO TARGET'), 'debug', NAME );

                if( Y.doccirrus.calq.canPush( target ) ) {
                    Y.log( 'Swapping within Q.', 'debug', NAME );
                    swapEvents( target, current );
                    myCallback( null, target );

                } else {
                    index++;
                    if( index >= that.origQ.length - 1 ) {
                        Y.log( 'Tried all subsequent events, none to swap in Q.', 'debug', NAME );
                        myCallback( null, null );
                        return;
                    }
                    doDownPushInQ( current, index );
                }

            }

            // This is the main list that will drive the push.
            // we never change this list only manipulate references into the list
            //
            // The list consists of mongoose objects, so we can at any time
            // change the values and save them. The longer we hang on to the
            // ref though, the more chance that VersionError will be thrown.
            // So it's important that the Locking be water-tight!!
            //
            // We do not use pushtimes in this version of push as it does not
            // necessarily affect the waiting room display. In fact the semantics
            // are unclear / undefined.
            function listCb( err, result ) {
                var
                    i,
                    current;
                if( err ) {
                    myCallback( err, null );
                    return;
                }
                // find the current event in the Q
                for( i = 0; i < result.length; i++ ) {
                    if( myEventId === result[i]._id.toString() ) {
                        current = result[i];
                        break;
                    }
                }
                Y.log( i, 'debug', NAME );
                if( !current ) {
                    // catch two failure cases here.
                    Y.log( 'Bogus call: Empty Event List, or Invalid Event Id to Push ' + myEventId, 'info', NAME );
                    myCallback( null, null );
                    return;
                }

                // remember this original Queue of mongoose objects
                that.origQ = result;

                // just do a Queue push downwards in the Queue, see if it is possible for
                // this type of an event.
                if( Y.doccirrus.calq.canPush( current ) ) {
                    //Y.doccirrus.calq.logQ( result );
                    doDownPushInQ( current, i );
                } else {
                    Y.log( 'Cannot push this Event: Id to Push ' + myEventId, 'info', NAME );
                    myCallback( null, null );
                    return;
                }

            }

            that.getTodaySortedByStart( {
                location: undefined,
                calendar: myCalId,
                scheduled: 'waiting'
            }, listCb );

        };

        /*
         * Admits a patient to a calendar.
         *
         * Currently we are using SERIAL MODE, not PARALLEL MODE.
         *
         * __Closing Events__:
         *
         * In parallel mode a queue may have many SCH_CURRENT events. In serial mode there is only one.
         * This impacts the business logic of what happens when a patient is ended or admitted.
         *
         * SERIAL - If there was a previous current patient or patients in the doctors queue, end them all
         * with time now and set scheduled to SCH_ENDED.
         *
         * PARALLEL - Simply close this patient and set their end time to right now.
         *
         * __Admitting Events__:
         *
         * PARALLEL & SERIAL - Set the admitted patient scheduled to SCH_CURRENT and update the admitted time.
         *
         * Optimisation:: -- currently works with lists of items instead in parallel mode, could directly
         * deal with only the event.
         *
         * @param admit {String} 'admit' | 'close' specifies action on given cal id and event id
         * @param calId {String} calendar id
         * @param id {String} event id
         * @callback  the callback to use for POSTing to the DB - i.e. gets the result of POST()
         */
        Scheduler.prototype.admitOrCloseEvent = function admitOrCloseEvent( user, admit, calId, id, callback ) {
            var
                // currently have parallel operation
                /* user = this.user,*/
                scheduler = this,
                myId = id,
                myCb = callback,
                isAdmitting = ('admit' === admit);

            function success() {
                Y.doccirrus.calUtils.getNToday( user, 1, null, null, 'waiting', myCb );
            }

            function doneRealign( err ) {
                if( err ) {
                    setTimeout( success );
                } else {
                    success();
                }
            }

            function listCb( err, result ) {
                var current,
                    dbnow = moment.utc();

                if( err ) {
                    myCb( err, null );
                    return;
                }
                if( !result || !result[0] ) {
                    // bad result
                    Y.log( 'FAILURE: queue empty. Evt: ' + myId + ' / Cal: ' + calId, 'debug', NAME );
                    // still call success.
                    return success();
                }

                // find current and update it
                current = Y.doccirrus.calq.getListEvt( result, myId );
                if( current ) {
                    if( isAdmitting ) {
                        let
                            putData;
                        // we round to full minutes MOJ-292
                        // for readability we do not fall below MINIMUM_DURATION_MINUTES
                        if( !scheduler.getConfig().autoMutateOff ) {
                            current.duration = Math.round( (current.end - current.start) / 60000 ) || MINIMUM_DURATION_MINUTES; // was in less than 30 seconds.
                            if( 'function' === typeof dbnow.toDate ) {
                                current.start = dbnow.toDate(); // moment.utc(), this transparently moves the event.
                            } else {
                                current.start = dbnow;//Date
                            }
                            current.end = moment( current.start ).add( current.duration, 'm' ).toDate();
                        }
                        current.scheduled = Y.doccirrus.schemas.calendar.SCH_CURRENT;
                        current.actualWaitingTimeMinutes = moment().diff( current.arrivalTime, 'minute' );
                        //mongooselean.toObject
                        putData = current.toObject ? current.toObject() : current;
                        putData.wasInTreatment = true;
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'schedule',
                            action: 'put',
                            query: {
                                _id: current._id
                            },
                            fields: Object.keys( putData ),
                            data: Y.doccirrus.filters.cleanDbObject( putData )
                        }, ( err ) => {
                            Y.log( 'saveCalevent (current): ' + JSON.stringify( current ), 'debug', NAME );
                            doneRealign( err );
                        } );
                    } else {
                        let
                            putData;
                        if( !scheduler.getConfig().autoMutateOff ) {
                            current.end = dbnow.toDate();
                            current.duration = Math.round( (current.end - current.start) / 60000 ) || MINIMUM_DURATION_MINUTES;
                        }
                        current.scheduled = Y.doccirrus.schemas.calendar.SCH_ENDED;
                        Y.log( 'Ending Event ' + myId + ' / Cal: ' + calId, 'debug', NAME );
                        //mongooselean.toObject
                        putData = current.toObject ? current.toObject() : current;
                        if( !putData.duration || putData.duration < 0 ) {
                            putData.duration = 0;
                        }
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'schedule',
                            action: 'put',
                            query: {
                                _id: current._id
                            },
                            fields: Object.keys( putData ),
                            data: Y.doccirrus.filters.cleanDbObject( putData )
                        }, ( err ) => {
                            Y.log( 'saveCalevent (current1): ' + JSON.stringify( current ), 'debug', NAME );
                            doneRealign( err );
                        } );
                    }
                } else {
                    Y.log( 'FAILURE: could not admit event, id not found in queue. Evt: ' + myId + ' / Cal: ' + calId, 'debug', NAME );
                    // still call success.
                    success();
                }

            }

            // get list
            this.getTodaySortedByStart( { user: user, location: undefined, calendar: calId, scheduled: 'activeended' }, listCb );
        };

        /**
         * move the appointment to waiting list
         *
         * @param   {Object}            user
         * @param   {Object}            data
         * @param   {Function}          callback
         */
        Scheduler.prototype.toWaitingList = function toWaitingList( user, data, callback ) {
            var
                scheduler = this,
                moment = require( 'moment' ),
                _id = data._id,
                plannedDuration = data.plannedDuration, duration = data.duration, eta = data.eta,
                actualWaitingTimeMinutes = data.actualWaitingTimeMinutes,
                endTime, start, end, arrivalTime, values, fields;

            if( !(duration || plannedDuration) || !_id || !eta ) {
                callback( 'toWaitingList: insufficient params' );
                return;
            }

            // MOJ-842: don't change the duration here.
            //data.duration = schedule.plannedDuration || schedule.duration;
            if( scheduler.getConfig().autoShift ) {
                start = moment().toDate();
            } else {
                start = eta;
            }
            endTime = moment( start ).add( 'minutes', plannedDuration || duration || 15 );
            end = endTime.toDate();

            values = { scheduled: Y.doccirrus.schemas.calendar.SCH_WAITING, start: start, end: end };
            fields = ['start', 'end', 'scheduled'];
            if( actualWaitingTimeMinutes ) {
                arrivalTime = moment( Date.now() ).subtract( actualWaitingTimeMinutes, 'minutes' ).valueOf();
                values.arrivalTime = arrivalTime;
                fields.push( 'arrivalTime' );
            }

            Y.doccirrus.api.calevent.put( {
                user: user,
                query: { _id: _id },
                fields: fields,
                data: values,
                noValidation: true,
                callback: callback
            } );
        };

        /*
         * Makes sure the whole new schedule with _id is returned
         * to the client.
         *
         * Helper class used to create new Numbers type events. Differentiates
         * between patient portal requests and "MFA" requests.
         *
         * @callback  the callback to use for POSTing to the DB - i.e. gets the result of POST()
         */
        Scheduler.prototype.generateEventForNextNum = function generateEventForNextNum( event, isFromPortal, callback ) {
            var
                that = this,
                scheduleData = event,
                warnMessage,
                myCb = callback,
                allowAdhoc = isFromPortal ? that.getConfig().allowAdhoc : that.getConfig().allowPRCAdhoc,
                template;

            // POST only returns the _ids of the created records, so simply mix
            // the _id back into the existing template and return that.
            function finalCb( err, idList ) {
                var result;
                if( !err ) {
                    if( warnMessage ) {
                        scheduleData._id = idList[0];
                        // a bit dirty - just mix all the params into the result object.
                        // strictly we should have a structure in the return response...
                        // but that needs to be standardised for all models and rest.
                        result = Y.merge( warnMessage, scheduleData );
                    } else {
                        result = scheduleData;
                    }
                    myCb( err, [result] );
                } else {
                    myCb( err );
                }
            }

            function postSchedule( schedule ) {
                // Check validity of schedule -- not necessary
                // as we trust the getNextNStartTimes.  Further, an
                // adhoc entry will be realigned.  So do not do the check!
                // that.isValidStartAndEnd( cleanedScheduleData, isFromPortal, checkValidCb );

                // posting a calevent should always go through calevent.post
                scheduleData = schedule;
                Y.doccirrus.api.calevent.post( {
                    user: that.user,
                    data: scheduleData,
                    isFromPortal: true,
                    noValidation: true,
                    callback: finalCb
                } );
            }

            function handleStartTime( errorMsg, start ) {
                var myMoment;
                if( !errorMsg ) {
                    if( -999 !== start[0].start ) {
                        Y.log( 'Got start time ' + start[0].start, 'warn', NAME );
                        myMoment = moment( start[0].start ).utc();
                    } else if( isFromPortal ) {
                        Y.log( 'Overriding: got start time now', 'warn', NAME );
                        warnMessage = { status: 'Keine Termine verfügbar, die Nummer wird trotzdem angelegt.' };
                        myMoment = moment().utc();
                    } else {
                        myCb( start[0].status );
                        return;
                    }
                    template.start = myMoment.toJSON();
                    template.eta = template.start;
                    template.end = myMoment.add( 'minutes', template.duration ).utc().toJSON();
                    template.pushtime = 0;
                    Y.log( 'Patient event updated to ' + template.start, 'info', NAME );

                    postSchedule( template );

                } else {
                    myCb( errorMsg );
                }
            }

            function createNewAdHoc( err, doc ) {
                var duration;
                if( err ) {
                    // this will never happen.
                    Y.log( 'Error: nextnumber failed', 'error', NAME );
                    doc = { number: 999 };
                }

                /*  refactor this if out into the model... */
                if( !scheduleData || !scheduleData.calendar ) {
                    template = {
                        _id: '', // falsy string
                        allDay: false,
                        scheduled: Y.doccirrus.schemas.calendar.SCH_WAITING,
                        title: '',
                        userDescr: '',
                        urgency: 0,
                        start: new Date( Date.now() ).toJSON(),
                        eta: new Date( Date.now() ).toJSON(),
                        end: new Date( Date.now() + (AVG_DURATION_MINUTES * 60 * 1000) ).toJSON(),
                        duration: AVG_DURATION_MINUTES,
                        plannedDuration: AVG_DURATION_MINUTES,
                        pushtime: 0,
                        adhoc: true,
                        number: doc.number
                    };
                    myCb( null, [template] );
                    return;
                }
                duration = scheduleData.duration || myScheduling.getAvgDuration();
                // if we have a calendar, then write
                template = {
                    allDay: false,
                    calendar: scheduleData.calendar,
                    scheduletype: scheduleData.scheduletype || '',
                    conferenceType: scheduleData.conferenceType || '',
                    employee: scheduleData.employee,
                    scheduled: Y.doccirrus.schemas.calendar.SCH_WAITING,
                    title: scheduleData.title,
                    details: scheduleData.details,
                    userDescr: scheduleData.userDescr,
                    urgency: scheduleData.urgency,
                    duration: duration,
                    isFromPortal: scheduleData.isFromPortal || false,
                    plannedDuration: duration,
                    pushtime: 0,
                    adhoc: true,
                    patient: scheduleData.patient,
                    number: doc.number,
                    patientData: scheduleData.patientData // comes from PP
                };

                // we must create the record and return the _id value as well...
                Y.log( 'Patient event came in with ' + template.start, 'info', NAME );

                if( null !== scheduleData ) {
                    // get next slot - this adhoc schedule needs to be final
                    that.getNextNStartTimes(
                        {
                            n: 1,
                            windowDuration: 'day',
                            forAdhoc: true,
                            calendar: template.calendar,
                            slotDuration: template.duration,
                            callback: handleStartTime
                        } );
                    return;
                }

                postSchedule( template );
            }

            if( false === allowAdhoc ) {
                Y.log( 'adhoc scheduling is disabled, exiting generateEventForNextNum', 'debug', NAME );
                myCb( null, null );
            } else {
                Y.doccirrus.mongodb.getModel( that.user, 'sysnum', function sysnumCb( err, model ) {
                    if( err ) {
                        Y.log( 'could not get lock DB' + err, 'info', NAME );
                        myCb( null, null );
                    } else {
                        Y.doccirrus.schemas.sysnum.getNextTicket( model, that.user, createNewAdHoc );
                    }
                } );
            }
        };

        /**
         * Close calevents dating from lastTime to today
         * it does not close today's events if now is before the closeday time
         *
         * Future: takes into account the closing and opening times of the practice.
         *
         * @param {object | null} args
         *   @param {moment} [args.lastTime] - last time close day was called
         *   @param {boolean} [args.updateNoShowAtEod = true] - Whether to update no show counter for a patient who
         *                                                      did not arrive for this appointment. This will be
         *                                                      set if the call is coming from cronJob 'CloseDay'. For
         *                                                      calls outside of this scope this is always set to true
         *                                                      so that the current functionality is not altered for
         *                                                      other usecases.
         *@param {Function} callback
         *
         */
        Scheduler.prototype.closeDay = function closeDay( args, callback ) {
            const
                {lastTime, updateNoShowAtEod = true} = args || {};

            let
                options = {
                    sort: { start: 1, eta: 1 }
                },
                theScheduler = this,
                isExtendedMode = lastTime ? true : false,
                myCb = callback,
                user = this.user,
                now = moment(),
                dateFrom = lastTime ? moment( lastTime ).add( 24, 'hours' ).startOf( 'day' ) : 'today',// one day after lastTime, or just today
                dateTo,
                lastCloseday;

            function noteTheTime() {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'admin',
                    action: 'put',
                    query: { _id: Y.doccirrus.schemas.admin.getClosedayId() },
                    fields: ['lastCloseday'],
                    data: { lastCloseday: lastCloseday, skipcheck_: true },
                    callback: function( err ) {
                        myCb( err, [] );
                    }
                } );
            }

            // close today's events
            function closeCalevents( err, result ) {
                var
                    async = require( 'async' );
                if( err ) {
                    myCb( err );
                    return;
                }
                async.eachSeries( result, ( schedule, next ) => {
                    //
                    // these are all mongoose objects - check whether 0, or 1, close or delete.
                    Y.log( 'closeAndSaveEvent: ' + JSON.stringify( schedule ), 'debug', NAME );
                    closeAndSaveEvent( schedule, user, updateNoShowAtEod, next );
                }, noteTheTime );

            }

            dateTo = moment( now ).startOf( 'day' ).add( 24, 'hours' ).endOf( 'day' ); // tomorrow

            if( isExtendedMode ) {
                if( now.isSame( Y.doccirrus.kronnd.nextFireTime( 'CloseDay' ), 'day' ) ) { // if today's closeday is still to be triggered
                    dateTo = moment( now ).add( -24, 'hour' ).endOf( 'day' ); // yesterday
                } else { // then we already passed today's closeday
                    dateTo = moment( now ).endOf( 'day' );
                    theScheduler.startToday = moment( now ).add( 1, 'd' ).startOf( 'day' );
                }

                console.log( 'doing closeday for calevents on: ' + user.tenantId + ', dateFrom:' + dateFrom.toJSON() + ', dateTo:' + dateTo.toJSON() + ',' + //eslint-disable-line no-console
                             ' isExtendedMode:' + isExtendedMode, 'debug' );

                lastCloseday = dateTo; // the date up to which we actually will close calevents
                Y.doccirrus.calUtils.getEventList( user,
                    {
                        location: undefined,
                        calendar: undefined,
                        calendarType: 'doctor',
                        scheduled: 'active',
                        dateFrom: dateFrom,
                        dateTo: dateTo,
                        noRealign: true
                    },
                    closeCalevents );

            } else { // called by cron on closeday
                lastCloseday = now;
                theScheduler.getTodaySortedByStart( {
                    location: undefined,
                    calendar: undefined,
                    scheduled: 'active',
                    noRealign: true
                }, closeCalevents, options );
                theScheduler.startToday = moment( now ).add( 1, 'd' ).startOf( 'day' );
            }
        };

        /**
         * Provide closeDay with the time on which closeday has happened last time
         * This is called on startup to make sure of data consistency
         * @param   {Function}          callback
         */
        Scheduler.prototype.closeDayOnStartup = function closeDayOnStartup( callback ) {
            var
                myScheduler = this,
                nextFireTime = Y.doccirrus.kronnd.nextFireTime( 'CloseDay' ),
                lastFireTime; // the last closeday up to which, calevents should have been closed

            if( !nextFireTime ) {
                callback( Y.doccirrus.errors.rest( 500, 'nextFireTime is not determined' ), true );
                return;
            }

            // get the last fire time in the past (next one is always in future)
            lastFireTime = moment( nextFireTime ).add( -1, 'day' );

            function getAdminData( err, result ) {
                var
                    lastTimeClosed; // the latest date up to which, all calevents were closed
                if( err ) {
                    callback( err );
                    return;
                }
                if( !result || !result[0] ) {
                    Y.log( 'Cannot determine the lastCloseday. Just ignoring...', 'warn', NAME );
                    callback();
                    return;
                }

                if( !result[0].lastCloseday ) { // then initialize the field and exit
                    Y.doccirrus.mongodb.runDb( {
                        user: myScheduler.user,
                        model: 'admin',
                        action: 'put',
                        query: {
                            _id: result[0]._id
                        },
                        fields: ['lastCloseday'],
                        data: {
                            skipcheck_: true,
                            lastCloseday: lastFireTime
                        }
                    }, callback );
                    return;
                }

                lastTimeClosed = moment( result[0].lastCloseday );

                if( lastTimeClosed.isBefore( lastFireTime, 'day' ) ) { // if the last closeday was missed
                    Y.log( 'doing closeDayOnStartup for ' + myScheduler.user.tenantId + '... last closeday was:' + lastTimeClosed.toJSON() + ', lastCloseDayMissed:' + lastFireTime.toJSON(), 'debug' );
                    myScheduler.closeDay( { lastTime: lastTimeClosed }, callback );
                } else {
                    return callback(); // nothing to do
                }
            }

            Y.doccirrus.mongodb.runDb( {
                user: myScheduler.user,
                model: 'admin',
                query: { _id: Y.doccirrus.schemas.admin.getClosedayId() },
                options: {
                    lean: true
                }
            }, getAdminData );
        };
        /**
         * An event completely lying in the past must be SCH_ENDED, otherwise it is invalid.
         * An event crossing present time must be SCH_CURRENT, otherwise it is invalid.
         *  (MOJ-477)
         *
         * @param  {Object}          event
         * @return {Boolean}
         */
        function checkValidScheduledStatus( event ) {
            var
                now = moment.unix();
            if( moment( event.end ).unix() < now ) {                 // event completely in the past
                return Y.doccirrus.schemas.calendar.SCH_ENDED !== event.scheduled;

            } else if( moment( event.start ).unix() < now ) {       // event crosses present time
                return Y.doccirrus.schemas.calendar.SCH_CURRENT !== event.scheduled;
            }
            return true;
        }

        /**
         *
         * Checks whether the events start and end times are valid according to
         * - consultTimes
         * - closeTimes
         * - clashes with other appointments
         *    (only for SCH_WAITING -- SCH_CURRENT and SCH_ENDED cannot clash)
         *
         * Rules (also in wiki)
         * https://confluence.dc/display/PROD/Scheduling+Definition
         *

         Mutated Consult Time:
         - invalid if future events belonging to a doctor calendar are thereby invalidated.
         (The practice must first move all appointments in the "conflict zone" and then attempt to change the times.)

         Mutated Close Time:
         - invalid if future events belonging to a doctor calendar are thereby invalidated.
         (The practice must first move all appointments in the "conflict zone" and then attempt to change the times.
         In future: "Force move" option can automatically invalidate the appointments. )
         - invalid if the start time lies in the past.
         - Note: ignores the consult time (close times may or may not overlap with consult times).

         Mutated "Doctor Calendar" Time:
         - invalid if there is a closeTime clash
         - invalid if does not fall within the consult times
         - invalid if has scheduled status SCH_WAITING (0) and is adhoc and
         there is another event with the same status that clashes
         i.e. we permit some overlap with SCH_CURRENT and SCH_ENDED events
         - Note: will check start, end and scheduled are valid as per MOJ-477
         & will be able to change the scheduled value to comply with MOJ-477

         Mutated Info Calendar Time:
         - Note: always valid.

         *
         * @param {Object}          event            to check   who is calling the action
         * @param {Boolean}         isFromPortal     optional, default false
         * @param {Function}        callback         function(err, result) where result is an Object:
         *    { event: givenEvent,
         *      valid: boolean
         *      resultInt: 1 ok | 7003 busy | 7000  closed | 7001 out of consult times
         *              |  7002 cannot close | -4 cannot change consult time | 7007 invalid scheduled status
         *              |  7008 doctor cannot be allDay | 7017 scheduleType is not in calendar consultTimes
         *    }
         *
         * @return {undefined}
         */
        Scheduler.prototype.isValidStartAndEnd = function isValidStartAndEnd( event, isFromPortal, callback ) {
            isFromPortal = isFromPortal || false;
            var
                that = this,
                user = this.user,
                nowDate,
                evtEndDate,
                evtStartDate,
                resultOK = { event: event, valid: true, resultInt: 1 };

            evtStartDate = moment.utc( event.start ).seconds( 0 ).milliseconds( 0 ).toDate();
            evtEndDate = moment.utc( event.end ).seconds( 0 ).milliseconds( 0 ).toDate();
            nowDate = moment.utc().seconds( 0 ).milliseconds( 0 ).toDate(); // user cares about time, up to minute precision

            Y.log( 'Checking Validity:  ' + JSON.stringify( event ), 'debug', NAME );
            Y.log( '\nStart:  ' + evtStartDate + '\nEnd:    ' + evtEndDate + '\nNow:    ' + nowDate, 'debug', NAME );

            // sanity check
            if( evtStartDate >= evtEndDate ) {
                Y.log( 'Invalid event, start > end.' + (event._id && event._id.toString()), 'warn', NAME );
                callback( new Error( 'Invalid event, start > end.' + (event._id && event._id.toString()) + '\nStart:  ' + evtStartDate + '\nEnd:    ' + evtEndDate + '\nNow:    ' + nowDate ) );
                return;
            }

            // short-circuit if infokalendar
            if( !event || !event.calendar || !Y.doccirrus.schemas.calendar.isDoctorCalendar( event.calendar ) ) {
                Y.log( 'Non-Doctor calendar, always Valid.', 'debug', NAME );
                callback( null, resultOK );
                return;
            }



            // The given event is a close time. We need to check against the
            // list of future events to exclude future clash creation.
            function handleCheckCloseTimeClash( err, result ) {
                var i,
                    rt1,
                    rt2,
                    clashedEvents = [],
                    ok = true;
                if( err ) {
                    Y.log( 'handleCheckCloseTimeClash Error: ' + JSON.stringify( err ), 'warn', NAME );
                    callback( err );
                    return;
                }

                if( Array.isArray( result ) ) {
                    for( i = 0; i < result.length; i++ ) {
                        if( !result[i].end ) {
                            // end should be set because allday is excluded with our search params
                            // but just in case there is no end time, ignore this event
                            Y.log( 'Event without end while checking mutated close time. Ignoring.', 'warn', NAME );
                            continue;
                        }
                        if( !result[i].start ) {
                            Y.log( 'Event without start while checking mutated close time. Ignoring.', 'warn', NAME );
                            continue;
                        }
                        rt2 = moment.utc( result[i].end ).seconds( 0 ).milliseconds( 0 ).toDate();
                        rt1 = moment.utc( result[i].start ).seconds( 0 ).milliseconds( 0 ).toDate();
                        if( Y.doccirrus.commonutils.hasClash( rt1, rt2, evtStartDate, evtEndDate ) ) {
                            ok = false;
                            clashedEvents.push( result[i] );
                        }
                    }
                }
                callback( null, {
                    event: event,
                    valid: ok,
                    resultInt: ( ok ? 1 : 7009 ),
                    clashedEvents: ( ok ? [] : clashedEvents )
                } );
            }

            // is there a clash between our given event and the busy list?
            //
            // Go through the busy times and check each one against the event
            // to be validated.  The busy list contains all possible clash sources
            // and so there is a lot of logic here to differentiate whether the times
            // given are ok or not and what the exact problem is.
            function handleBusyCb( bList, actualConsultTimes, scheduleType, calendar, resource ) {
                var i,
                    rt1,
                    rt2,
                    ok = true,
                    lastConsultIndex,
                    isInConsult = false,// flag to keep track of in/out of consult time.
                    hasBusyListConsult = false,
                    returnObj = { event: event, resultInt: 1 },
                    //                    isEventAdHoc = event.adhoc || false,
                    capacityLeft = scheduleType.capacity || 9999,
                    scheduleTypeIsAvailable = false;

                if(!calendar) {calendar = {name:"-"};  }

                if( Array.isArray( bList ) ) {
                    Y.log( 'Checking Validity: doctors event against busy list. start:' +
                           moment( event.start ).format( 'YY-MM-DD HH:mm' ) + ' - ' + moment( event.end ).format( 'YY-MM-DD HH:mm' ), 'debug', NAME );
                    Y.doccirrus.calq.logQ( bList );
                    for( i = 0; i < bList.length; i++ ) {

                        // there may not be any consult time in a particular day, so
                        // we need to keep track of the consult times.
                        if( (i - 1) === lastConsultIndex ) {
                            isInConsult = true;
                        }
                        if( bList[i].consultTime ) {
                            lastConsultIndex = i;
                            isInConsult = false;
                            hasBusyListConsult = true;
                        }

                        // check if if they are the same calevents
                        if( (bList[i]._id && event._id && bList[i]._id.toString() === event._id.toString()) ||
                            (bList[i].linkSeries && event.linkSeries && bList[i].linkSeries.toString() === event.linkSeries.toString()) ) {
                            continue; // skip checking the event against itself
                        }

                        if( !bList[i].end ) {
                            // end should be set because allday is excluded with our search params
                            // but just in case there is no end time, ignore this event
                            Y.log( 'Validity: Skip entry has no end', 'debug', NAME );
                            continue;
                        }

                        if( isFromPortal && (bList[i].consultTime || bList[i].closeTime ) ) {
                            Y.log( 'Validity: Skip checking group member against close/consult time (for PP only)', 'debug', NAME );
                            continue;
                        }

                        if( !bList[i].start ) {
                            Y.log( 'Validity: Event without start while checking mutated close time. Ignoring this event.', 'warn', NAME );
                        }
                        if( bList[i].end._d ) {
                            if( !bList[i].start.add ) {
                                bList[i].start = moment( bList[i].start );
                            }
                            // HACK -- NEXT SLOT calculations require NON-UTC busy list
                            //         VALID DATE calculations require UTC busy list!!
                            // FIX:  put a busyList "utc" parameter in  MOJ-803
                            rt1 = bList[i].start.add( moment().zone(), 'm' ).seconds( 0 ).milliseconds( 0 ).toDate();
                            rt2 = bList[i].end.add( moment().zone(), 'm' ).seconds( 0 ).milliseconds( 0 ).toDate();
                        } else {
                            rt1 = moment.utc( bList[i].start ).seconds( 0 ).milliseconds( 0 ).toDate();
                            rt2 = moment.utc( bList[i].end ).seconds( 0 ).milliseconds( 0 ).toDate();
                        }
                        if( Y.doccirrus.commonutils.hasClash( rt1, rt2, evtStartDate, evtEndDate ) ) {
                            // set the failure result code
                            ok = false;
                            if( true === bList[i].closeTime ) {
                                returnObj.resultInt = 7000;
                                returnObj.calendarName = calendar.name;
                                ok = false;

                            } else if( resource && resource._id.toString() === bList[i].resource ) {
                                returnObj.resultInt = 7004;
                                returnObj.$resources = resource.type;
                                ok = false;
                                break;
                            } else if( !isInConsult ) {
                                returnObj.resultInt = 7001;
                                returnObj.calendarName = calendar.name;

                            } else if( scheduleType._id.toString() === bList[i].scheduletype ) { // then this is a clash with a group member/head
                                if( true === bList[i].group && !event.group ) { // clash with head of a group
                                    capacityLeft = bList[i].capacityOfGroup; // override the general capacity
                                    // if the group has still room, or the event is already a member then it's ok
                                    if( 0 < bList[i].capacityOfGroup || (event.groupId && event.groupId.toString() === bList[i]._id.toString()) ) {
                                        Y.log( 'Validity: overlap with group master, current free seats: ' + bList[i].capacityOfGroup + (event.groupId ? ', already a member' : '') + ' ==> OK', 'debug', NAME );
                                        event.groupId = bList[i]._id ? bList[i]._id.toString() : event.groupId; // assign it to the group
                                        event.fields_ = (event.fields_ || '') + ',groupId';
                                        event.group = null;
                                        ok = true;
                                        continue;
                                    } else {
                                        Y.log( 'Validity: overlap with group master, no free seat for: ' + JSON.stringify( event ), 'debug', NAME );
                                        returnObj.resultInt = 7010; // the group is filled up
                                        ok = false;
                                        break; // we stop the checking of blocked slots because there are no more slots in group master
                                    }

                                } else { // clash with group-mate is always ok
                                    capacityLeft--;
                                    Y.log( 'Validity: overlap with group member, capacityLeft: ' + capacityLeft + (event.groupId ? ', already a member ==> OK' : ''), 'debug', NAME );
                                    if( 0 < capacityLeft || event.groupId || event.group ) { // not full or already in a group
                                        ok = true;
                                        continue;
                                    } else {
                                        ok = false;
                                        returnObj.resultInt = 7010; // no more room
                                        break;
                                    }
                                }
                            } else { // clash with another appointment of different scheduletype
                                ok = true;
                                //we should continue here to process all events from busyList
                                continue;
                            }
                        }
                    }
                    let
                        consultationTime,
                        consultationTimeStart,
                        consultationTimeEnd;

                    //check event scheduletype for availability in consult times
                    for( consultationTime of actualConsultTimes ) {
                        consultationTimeStart = moment.utc( consultationTime.start ).seconds( 0 ).milliseconds( 0 ).toDate();
                        consultationTimeEnd = moment.utc( consultationTime.end ).seconds( 0 ).milliseconds( 0 ).toDate();
                        if( Y.doccirrus.commonutils.hasClash( consultationTimeStart, consultationTimeEnd, evtStartDate, evtEndDate ) ) {

                            //check if event scheduletype is present in scheduleTypes array for this consultTime
                            let scheduleTypes = consultationTime.availableScheduletypes;
                            if( scheduleTypes && scheduleTypes[0] && !scheduleTypes.includes( event.scheduletype ) ) {
                                returnObj.resultInt = 7017;
                                ok = false;
                            } else {
                                // set flag which indicate that current scheduletype is available for at least one consultTime
                                scheduleTypeIsAvailable = true;
                            }
                        }
                    }
                    if( ok && !hasBusyListConsult ) {
                        returnObj.resultInt = 7001;
                        returnObj.calendarName = calendar.name;
                        ok = false;
                    }
                }
                returnObj.valid = ok;

                if( scheduleTypeIsAvailable && 7017 === returnObj.resultInt ) {
                    // if scheduleType is available in at least one consultTime and even if we have error that it's not available in at least one consultTime
                    // then we don't show the error (check for resultInt value is made to avoid overwriting of other possible errors)
                    returnObj.resultInt = 1;
                    returnObj.valid = true;
                }

                Y.log( ' Checked Validity of event: ' + JSON.stringify( returnObj ), 'debug', NAME );

                callback( null, returnObj );

            }

            function getBusyList() {
                // check against the relevant busy list
                // make sure different aspects of the busy list are checked
                require( 'async' ).parallel( {
                    busyList: function( _cb ) {
                        that.getBusyList( {
                            dateFrom: moment.utc( event.start ).startOf( 'day' ),
                            windowDuration: 'day',
                            calendar: event.calendar.toString()
                        }, _cb );
                    },
                    scheduleType: function( _cb ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'scheduletype',
                            query: { _id: event.scheduletype },
                            callback: _cb
                        } );
                    },
                    resource: function( _cb ) {
                        if( event.resource ) {
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'resource',
                                query: { _id: event.resource },
                                callback: _cb
                            } );
                        } else {
                            _cb();
                        }
                    },
                    calendar: function( _cb ) {
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'calendar',
                            query: { _id: event.calendar },
                            callback: _cb
                        } );
                    },
                    actualConsultTimes: function( _cb ) {
                        Y.doccirrus.api.calevent
                            .getConsultTimes( {
                                user, originalParams: {
                                    calendar: event.calendar.toString(),
                                    dateFrom: moment.utc( event.start ).startOf( 'day' ),
                                    duration: 'day',
                                    consult: true
                                }, callback: _cb
                            } );
                    }
                }, async function allDone( err, joinedResult ) {
                    if( err ) {
                        return callback( err );
                    }
                    if( !joinedResult.calendar || !joinedResult.calendar[0] ) {
                        // should not happened - added log to identify possible reason
                        Y.log( `getBusyList. There is no calendar with id ${event.calendar} for event ${JSON.stringify( event )}. Author of request: ${JSON.stringify( user )}.`, 'warn', NAME );
                    }
                    if( joinedResult.scheduleType && joinedResult.scheduleType[0] ) {
                        if( joinedResult.resource && joinedResult.resource[0] ) {
                            handleBusyCb( joinedResult.busyList, joinedResult.actualConsultTimes, joinedResult.scheduleType[0], joinedResult.calendar[0], joinedResult.resource[0] );
                        } else {
                            handleBusyCb( joinedResult.busyList, joinedResult.actualConsultTimes, joinedResult.scheduleType[0], joinedResult.calendar[0] );
                        }

                    } else {
                        if( event.partner && event.partner.scheduleId ) {
                            // means that partner is trying to update schedule from his side
                            // and original schedule wasn't found on master side,
                            // so we should try to get mirrorscheduletype as well
                            let [mirrorScheduleTypeError, mirrorScheduleTypeResult] = await formatPromiseResult(
                                Y.doccirrus.mongodb.runDb( {
                                    user,
                                    model: 'mirrorscheduletype',
                                    action: 'get',
                                    query: {
                                        _id: event.scheduletype
                                    },
                                    options: {
                                        limit: 1
                                    }
                                } )
                            );
                            if( mirrorScheduleTypeError ) {
                                Y.log( `getBusyList. Error while getting mirror scheduletype ${event.scheduletype}: ${mirrorScheduleTypeError.stack || mirrorScheduleTypeError}`, 'error', NAME );
                                return callback( mirrorScheduleTypeError );
                            }
                            if( !mirrorScheduleTypeResult.length ) {
                                Y.log( `Could not update partner schedule. Mirror scheduletype entry not found. Mirror scheduletype: ${event.scheduletype}`, 'error', NAME );
                                return callback( new Y.doccirrus.commonerrors.DCError( 'schedule_05' ) );
                            }
                            return handleBusyCb( joinedResult.busyList, joinedResult.actualConsultTimes, mirrorScheduleTypeResult[0], joinedResult.calendar[0], joinedResult.resource && joinedResult.resource[0] );
                        } else {
                            return callback( new Y.doccirrus.commonerrors.DCError( 'schedule_05' ) );
                        }
                    }
                } );
            }

            // analyse the event, what kind is it?
            if( event.closeTime ) {
                Y.log( 'Checking if Close Time Valid', 'debug', NAME );
                // get all events from start of day (to find all day events) to end of day
                // then check that there are no doctor calendar clashes
                Y.doccirrus.calUtils.getEventList( user, {
                    calendar: event.calendar,
                    start: this.startToday,
                    end: event.end,
                    callback: handleCheckCloseTimeClash
                } );

            } else if( Y.doccirrus.schemas.calendar.isDoctorCalendar( event.calendar ) ) {
                Y.log( 'Checking if Doctor Event Valid', 'debug', NAME );
                // not allowed to be allDay
                if( true === event.allDay || 'true' === event.allDay ) {
                    Y.log( 'Doctor schedule not allowed to be allDay.', 'info', NAME );
                    callback( null, { event: event, valid: false, resultInt: 7008 } );
                    return;
                }
                // do the check for regular doctor calendars
                if( !checkValidScheduledStatus( event ) ) {
                    callback( null, {
                        event: event,
                        valid: false,
                        resultInt: 7007
                    } );
                    return;
                }

                if( true === event.adhoc ) { // then check if the adhoc is available
                    if( event._id ) {
                        callback( null, resultOK ); // done here, because user can't change the timing
                        return;
                    }
                    Y.log( 'check if the adhoc is still available', 'debug', NAME );
                    that.getNextNStartTimes(
                        {
                            n: 1,
                            windowDuration: 'day',
                            forAdhoc: true,
                            forScheduleType: event.scheduletype,
                            calendar: event.calendar,
                            slotDuration: event.duration,
                            callback: function( err, result ) {
                                if( err || !result || !result[0] ) {
                                    Y.log( 'isValid Start And End, error getting next free slot: ' + JSON.stringify( err ), 'warn', NAME );
                                    return callback( err );
                                }

                                if( -999 === result[0].start ) {
                                    Y.log( 'there is no available slot for the adhoc event => #7006', 'info', NAME );
                                    return callback( null, {
                                        event: event,
                                        valid: false,
                                        resultInt: 7006
                                    } );

                                } else { // ok to go, realign will correct the start and end
                                    return callback( null, resultOK ); // done here
                                }
                            }
                        } );

                } else { // if not adhoc

                    // MOJ-13265 was decided to always check validity and clashes for all events (even in the past)
                    getBusyList();
                }

            } else {
                Y.log( 'Unrecognised event type (accepting)  : ' + JSON.stringify( event ), 'warn', NAME );
                return callback( null, resultOK );
            }

        };

        DCScheduling.prototype.checkEndOfSchedule = function( user, callback ) {

            function closeSchedulesOutOfTime( user ) {
                var now = moment().format();
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'schedule',
                    action: 'put',
                    query: {
                        end: {$lt: now},
                        closeTime: {$ne: true}, // we don't autoEnd closeTime events because we allow them to be in the past
                        scheduled: {$lt: Y.doccirrus.schemas.calendar.SCH_ENDED}
                    },
                    fields: ['scheduled'],
                    data: Y.doccirrus.filters.cleanDbObject( {
                        scheduled: Y.doccirrus.schemas.calendar.SCH_ENDED,
                        multi_: true
                    } )
                }, callback );
            }

            Y.doccirrus.mongodb.runDb( {
                user,
                model: 'practice',
                migrate: true,
                query: {},
                action: 'get',
                options: {
                    lean: true,
                    limit: 1
                }
            }, ( err, res ) => {
                if( err ) {
                    Y.log( 'Can not get practice for auto ending schedules. Error: ' + JSON.stringify( err ), 'warn', NAME );
                }
                else if( res && res[ 0 ] ) {
                    if( true === res[ 0 ].autoEnd ) {
                        closeSchedulesOutOfTime( user );
                    }
                }
                else {
                    Y.log( 'No practices to check for auto ending schedules. ', 'debug', NAME );
                }
            } );
        };

        myScheduling = new DCScheduling();
        Y.namespace( 'doccirrus' ).scheduling = myScheduling;

        Y.doccirrus.ipc.subscribeNamed( INVALIDATE_CACHE, NAME, true, function handleCacheEvent( params ) {
            Y.doccirrus.scheduling.removeFromCache( params.tenantId, true );
        } );

    },
    '0.0.1', { requires: ['dccalq', 'dcsortlib', 'dccalutils', 'dcipc', 'dccommonutils'] }
);
