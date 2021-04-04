/**
 * User: ma
 * Date: 25.07.14  12:09
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


/**
 * This is a library of useful DC methods that are available throughout mojito without
 * having to dynamically boot the action context into including them.
 *
 * They do however mostly need the Action Context to work (i.e. mojito).
 *
 * Uses the YUI namespace.
 */

/*global YUI*/



YUI.add( 'dccalutils', function( Y, NAME ) {
        const
            ObjectId = require( 'mongoose' ).Types.ObjectId,
            // eslint-disable-next-line no-unused-vars
            RRule = require( 'rrule' ).RRule,
            { formatPromiseResult } = require( 'dc-core' ).utils;

        let
            myUtils,
            moment;

        /**
         * Constructor for the module class.
         *
         * @class DCCalUtils
         * @private
         */
        function DCCalUtils() {
            // purely static object at the moment, nothing in the instances.
        }

        DCCalUtils.prototype.init = function() {
            moment = require( 'moment' );
        };

        function makePatientTypeQuery( query, options, params ) {
            if( params.patient ) {
                query.patient = params.patient;
                delete params.consult;
                params.calendarType = 'doctor';

            } else if( options.distinctPatients ) {
                query.patient = {$exists: true};
            }
        }

        function addNumberQuery( query, num ) {
            if( !num ) {
                return;
            }
            query.number = parseInt( num, 10 );
            if( isNaN( query.number ) ) {
                delete query.number;
            }
        }

        // add text search query in conjunction with other conditions, i.e. AND to the rest of the query
        function addFullTextQuery( query, strQuery ) {
            var
                r,
                myOr = [];
            if( !strQuery ) {
                return;
            }
            strQuery = strQuery.trim();
            if( !query.$and ) {
                query.$and = [];
            }

            r = Y.doccirrus.commonutils.$regexLikeUmlaut( strQuery, {merge: {$options: 'i'}} );
            myOr.push( {title: r} );
            myOr.push( {details: r} );
            if( /^\d+$/.test( strQuery ) ) {
                myOr.push( {number: strQuery} );
            }
            query.$and.push( {$or: myOr} );
        }

        /**
         * Generate an array with length of nEvts of events started from dateFrom
         * based on consultTimes for specific scheduleType
         *
         * @method generateEvents
         * @param {Number} nEvts - number of events to generate
         * @param {Object} dateFrom - moment object with start date
         * @param {Array} weeklyTimes - array of consultTimes of calendar
         * @param {String} scheduleType - current scheduleType
         * @param {Object} attrs   these attributes are copied into the resulting event that is generated.
         * @return {Array} result - array of generated events
         */
        function generateEvents( nEvts, dateFrom, weeklyTimes, scheduleType, attrs ) {
            attrs = attrs || {};
            nEvts = nEvts || 0;
            var
                i,
                moment = require( 'moment' ),
                start = moment( dateFrom ).startOf( 'day' ),
                startDay = start.day(),
                unpacked,
                cnt = startDay,
                result = [];

            unpacked = Y.doccirrus.schemas.location.unpackWeeklyTimes( weeklyTimes, scheduleType );


            function convertDay( dayTimes, momentT ) {
                var
                    i,
                    day,
                    availableSlots,
                    list = Y.clone( dayTimes ),
                    rangeBegin, rangeEnd;
                for( i = 0; i < list.length; i++ ) {
                    availableSlots = [];
                    day = Y.merge( list[i], attrs );
                    day.start = Y.doccirrus.commonutils.convertHourArrayToMoment( day.start, momentT ).toDate();
                    day.end = Y.doccirrus.commonutils.convertHourArrayToMoment( day.end, momentT ).toDate();

                    if( day.repetitionSettings ) {
                        availableSlots = Y.doccirrus.rruleutils.getDatesForRepetitions( day.repetitionSettings, new Date( day.start ) );
                    }

                    if( day.range ) {
                        rangeBegin = moment( day.range[0], "DD-MM-YYYY" );
                        rangeEnd = moment( day.range[1], "DD-MM-YYYY" ).add( 1, 'day' );
                        if( !( moment( day.start ).isBefore( rangeBegin ) || moment( day.start ).isAfter( rangeEnd ) ) ) {
                            result.push( day );
                        }
                    } else {
                        if( availableSlots && availableSlots.length ) {
                            if( availableSlots.includes( moment( day.start ).toISOString() ) ) {
                                result.push( day );
                            }
                        } else {
                            // save the day
                            result.push( day );
                        }
                    }
                }
            }

            // instantiate from
            for( i = 0; i < nEvts; i++ ) {
                try {
                    convertDay( unpacked[cnt], start );
                } catch( e ) {
                    // got an erroneous date format
                    Y.log( 'GenerateEvents:  Invalid data in DB! (ignoring) ' + unpacked[cnt], 'warn', NAME );
                }
                // update counters...
                cnt++;
                cnt = cnt % 7;
                start = start.add( 'd', 1 );
            }

            // and don't forget to return!
            return result;
        }

        /**
         * mutates the query to include the correct  scheduled  property
         * @method addScheduleQuery
         * @param {Object}  query
         * @param {String}scheduled
         */
        function addScheduleQuery( query, scheduled ) {
            scheduled = scheduled || 'all';
            switch( scheduled ) {
                case 'all':
                    delete query.scheduled;
                    break;
                case 'old':
                    query.scheduled = {$gte: Y.doccirrus.schemas.calendar.SCH_CURRENT};
                    break;
                case 'active':
                    query.scheduled = {$in: [Y.doccirrus.schemas.calendar.SCH_CURRENT, Y.doccirrus.schemas.calendar.SCH_WAITING, Y.doccirrus.schemas.calendar.SCH_UNCONFIRMED]}; // current, waiting and unconfirmed
                    break;
                case 'activeended':
                    query.scheduled = {$in: [Y.doccirrus.schemas.calendar.SCH_CURRENT, Y.doccirrus.schemas.calendar.SCH_WAITING, Y.doccirrus.schemas.calendar.SCH_ENDED]}; // current, waiting and ended
                    break;
                case 'current':
                    query.scheduled = {$eq: Y.doccirrus.schemas.calendar.SCH_CURRENT};
                    break;
                case 'waiting':
                    query.scheduled = {$eq: Y.doccirrus.schemas.calendar.SCH_WAITING};
                    break;
                case 'noshow':
                    query.scheduled = {$eq: Y.doccirrus.schemas.calendar.SCH_NOSHOW};
                    break;
            }
            if( query.scheduled ) {
                query.$and = query.$and || []; // will contain any condition that must be satisfied
                query.$and.push(
                    {scheduled: query.scheduled}
                );
                delete query.scheduled;
            }
        }

        /**
         * mutates the query to include the correct  calType  property
         * @method addCalTypeQuery
         * @param {Object}  query
         * @param {String}  calType
         */
        function addCalTypeQuery( query, calType ) {
            switch( calType ) {
                case 'real':
                /* no break */
                case 'all':
                    delete query.calendar;
                    break;
                case 'info':
                    query.calendar = {
                        $lt: Y.doccirrus.schemas.calendar.getComparatorId(),
                        $ne: Y.doccirrus.schemas.calendar.getCloseTimeCalId()
                    };
                    break;
                case 'close':
                    query.calendar = Y.doccirrus.schemas.calendar.getCloseTimeCalId();
                    break;
                case 'doctor':
                    query.calendar = {$gt: Y.doccirrus.schemas.calendar.getComparatorId()};
                    break;
                // 'open', 'consult':  these are virtual calendars, don't require search string here
            }
        }

        /**
         * mutates the query to include the correct  eventType  property
         * @param {Object}                  query
         * @param {String | Array}          eventType           String or Array: ["plan","adhoc"] | "all" | ["plan", "adhoc", "allday", "closeTime"] --> combination
         */
        function addEventTypeQuery( query, eventType ) {
            eventType = eventType || ['plan', 'adhoc'];
            var i,
                isPlan = {$and: []};

            if( -1 < eventType.indexOf( 'all' ) ) { // no restriction needed on eventType
                return; // nothing to do
            }
            //            query.allDay = false;
            function handleEventType( type ) {
                switch( type ) {
                    case 'plan':
                        isPlan.$and.push( {adhoc: {$ne: true}} );
                        isPlan.$and.push( {closeTime: {$ne: true}} );
                        isPlan.$and.push( {allDay: {$ne: true}} );
                        query.$or.push( isPlan ); // $and describes plan event

                        break;
                    case 'adhoc':
                        query.$or.push( {adhoc: true} );
                        break;
                    case 'group':
                        query.$or.push( {group: true, capacityOfGroup: {$gt: 0}} );
                        break;
                    case 'allDay':
                        query.$or.push( {allDay: true} );
                        break;
                    case 'closeTime':
                        query.$or.push( {closeTime: true} );
                        break;
                    case 'resource':
                        query.$or.push( {resourceBased: true} );
                        break;
                }
            }

            query.$or = query.$or ? query.$or : []; // at least one entry will be pushed
            if( 'string' === typeof eventType ) {
                handleEventType( eventType );
            }
            else if( Array.isArray( eventType ) ) {
                for( i = 0; i < eventType.length; i++ ) {
                    handleEventType( eventType[i] );
                }
            }
        }

        // if duration is provided then set/overwrite time range accordingly
        function setTimeRange( params ) {
            var
                begin, end;
            switch( params.duration ) {
                case 'day':
                    begin = moment( params.dateFrom ).startOf( 'day' );
                    end = moment( params.dateFrom ).endOf( 'day' );
                    break;
                case 'week':
                    begin = moment( params.dateFrom ).startOf( 'week' );
                    end = moment( params.dateFrom ).endOf( 'week' );
                    break;
                case 'month':
                    begin = moment( params.dateFrom ).startOf( 'month' );
                    end = moment( params.dateFrom ).endOf( 'month' );
                    break;
                case 'all':
                    begin = moment( params.dateFrom );
                    break;
            }
            // overwrite any current value
            params.dateFrom = begin;
            params.dateTo = end;
        }

        // set the condition that makes sure an event time span intersect the queried range
        function addRangeQuery( query, from, to ) { // from < start/end < to
            var
                begin, end;

            if( from && 'all' !== from ) {
                begin = moment( from );
                query.end = query.end || {};
                query.end.$gte = begin;
            }

            if( 'day' === to ) {
                end = moment( from ).endOf( 'day' );
            } else if( to ) {
                end = moment( to );
            }

            if( end ) {
                query.start = query.start || {};
                query.start.$lte = end;
            }
        }

        function isDurationQuery( params ) {
            return ('all' !== params.dateFrom && params.duration);
        }

        // translate named dates to real date objects
        function setupDateQuery( params ) {
            if( 'all' !== params.dateFrom ) {
                // we will not always provide a time range
                if( !params.duration && !params.dateTo ) {
                    params.duration = 'day';
                }

                if( 'now' === params.dateFrom ) {
                    params.dateFrom = moment();
                } else if( 'today' === params.dateFrom ) {
                    params.dateFrom = moment().startOf( 'day' );
                }

                if( params.duration ) {
                    params.dateFrom = moment( params.dateFrom );
                    if( !params.dateFrom.isValid() ) {
                        return false;
                    }
                }
            }
            return true;
        }

        /**
         * set conditions that satisfy those calevents whose time span interesect the queried range
         * @param {Object}          query
         * @param {Object}          scheduleQuery
         * @param {Object}          options
         */
        function addIntervalQuery( query, scheduleQuery, options ) {
            var
                rangeQuery1 = {};

            delete scheduleQuery.start;
            delete scheduleQuery.end;
            delete scheduleQuery.$or;
            scheduleQuery.$and = scheduleQuery.$and || [];

            if( query.$or ) { // eventType sub-query
                scheduleQuery.$and.push( {$or: query.$or} );
            }

            if( query.start || query.end ) {

                // set condition for start
                if( query.start ) {
                    options.rangeEnd = query.start.$lte;
                    rangeQuery1.start = query.start;
                }

                // set condition for end
                if( query.end ) {
                    options.rangeBegin = query.end.$gte;
                    rangeQuery1.end = query.end;
                }
                scheduleQuery.$and.push( rangeQuery1 );
            }
        }

        function generateOpenList( query, callback ) {
            callback( null, [] );
        }

        function generateConsultList( user, params, callback ) {
            var
                query = {},
                myCb = callback;

            function calCb( err, result ) {
                var mresult = [],
                    i,
                    calId,
                    allConsultTimes = [],
                    d = moment( params.dateFrom ),
                    startUTC = moment( d.toDate() ),
                    numberOfDays;
                if( err ) {
                    myCb( err );
                }
                if( result && Array.isArray( result ) ) {
                    for( i = 0; i < result.length; i++ ) {
                        calId = result[i]._id.toString();
                        allConsultTimes = params.specificOnly ? ( result[i].specificConsultTimes || [] ) : result[i].consultTimes && result[i].consultTimes.concat( result[i].specificConsultTimes || [] );
                        Y.log( 'Generating Consult List for: ' + params.duration + ' / ' + params.dateFrom + ' / ' + startUTC, 'debug', NAME );
                        if( 'week' === params.duration ) {
                            mresult = Y.doccirrus.calUtils.mergeSortEvents(
                                mresult,
                                generateEvents( 7, startUTC, allConsultTimes, params.forScheduleType, {calendar: calId, consult: true} )
                            );
                        } else if( 'month' === params.duration ) {
                            mresult = Y.doccirrus.calUtils.mergeSortEvents(
                                mresult,
                                generateEvents( 31, startUTC, allConsultTimes, params.forScheduleType, {calendar: calId, consult: true} )
                            );
                        } else if( params.dateTo ) {
                            numberOfDays = Math.ceil( -startUTC.diff( params.dateTo, 'hour' ) / 24 );
                            mresult = Y.doccirrus.calUtils.mergeSortEvents(
                                mresult,
                                generateEvents( numberOfDays, startUTC, allConsultTimes, params.forScheduleType, {
                                    calendar: calId,
                                    consult: true
                                } )
                            );
                        } else {
                            mresult = Y.doccirrus.calUtils.mergeSortEvents(
                                mresult,
                                generateEvents( 1, startUTC, allConsultTimes, params.forScheduleType, {calendar: calId, consult: true} )
                            );
                        }
                    }
                }
                Y.log( `Consult List: ${JSON.stringify( mresult )}`, 'debug', NAME );
                myCb( null, mresult );
            }

            if( params.location ) {
                query.locationId = params.location;
            } else if( params.calendar ) {
                if( Array.isArray( params.calendar ) ) {
                    query._id = {$in: params.calendar};
                } else {
                    query._id = params.calendar;
                }
            }

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'calendar',
                query: query,
                options: {},
                callback: calCb
            } );
        }

        /**
         * Return the inverse of this list of events (i.e. an event for every gap), per calendar.
         * NB!
         * Assumes that the day boundary is the start and end of processing.
         *
         * Assumes the list is sorted.
         *
         * NBB! Assumes the list comes from the database and start and end are JS Date Objects.
         *
         * The return value is always an array of events, sorted by start time.
         * Properties are: start, end, calendar and consultTime
         *
         * if there is no entry in the list for a calendar, then the the interval [dateFrom,dateTo] will be the result of negation for that calendar
         *
         * @param {Array}           list                    of events.
         * @param {moment | string}   dateFrom                start date for negation, must precede the start time of the first event in the list
         * @param {moment | string}   dateTo                 (optional) end date of negation. If not provided then end of day will be used instead
         * @param {array | string}    calendar               calendarId(s), on which we do the negation independently
         * @returns {*}
         */
        function negateEventList( list, dateFrom, dateTo, calendar ) {
            var
                calendars = (calendar && !Array.isArray( calendar )) ? [calendar] : (calendar || []),
                start = dateFrom ? moment( dateFrom ) : '',
                i, j,
                qs = Y.doccirrus.calq.getQs( list ),
                result = [],
                hasResult;

            function negateQ( queue ) {
                var
                    i,
                    item,
                    next,
                    maxEndInThisDay,
                    resultI = [];

                if( Array.isArray( queue ) && queue.length ) {
                    // do first, set next to start
                    next = moment.utc( start ).toDate();
                    maxEndInThisDay = moment.utc( start ).startOf( 'day' );
                    //                    // check start was valid with regards to the list.
                    //                    if( next.isAfter(moment.utc( queue[0].start ).startOf( 'day' ))) {
                    //                        next = moment.utc( queue[0].start ).startOf( 'day' );
                    //                    }
                    // iterate next
                    Y.log( '\nNegating list: ' + JSON.stringify( queue ) +
                           '\nStart ' + next.toString() +
                           '\nstart ' + start.toString(), 'debug', NAME );

                    for( i = 0; i < queue.length; i++ ) {
                        if( moment( maxEndInThisDay ).isBefore( moment( queue[i].end ) ) ) {
                            item = {};
                            item.start = next;
                            item.end = queue[i].start;
                            item.calendar = queue[i].calendar;
                            item.availableScheduletypes = queue[i].availableScheduletypes;
                            item.consultTime = true;
                            if( moment( item.start ).isBefore( moment( item.end ) ) ) {
                                resultI.push( item );
                            }
                            // check
                            if( i > 0 && (queue[i].calendar !== queue[i - 1].calendar) ) {
                                Y.log( 'Scheduler Error in Queue negation process, queue calendars out of sync.', 'warn', NAME );
                                Y.log( JSON.stringify( queue ) );
                            }
                            next = queue[i].end;
                            maxEndInThisDay = moment.utc( queue[i].end ).toDate();
                        }
                    }
                    // does not take into account list item.ends
                    // so if there is a multi-day event in the second last position, you might get strange results here.
                    item = {};
                    item.start = next;
                    item.end = moment.utc( dateTo || next ).endOf( 'day' ).toDate();
                    item.calendar = queue[0].calendar;
                    item.consultTime = true;
                    resultI.push( item );

                    Y.log( 'Negated list of  ' + queue.length + ' to list of len ' + resultI.length, 'debug', NAME );

                } else { // handle calendar with empty result
                    // edge case, we have no consult times in this DB!
                    item = {};
                    item.start = start.toDate();
                    if( dateTo ) {
                        item.end = dateTo;
                    } else {
                        // clone moment
                        item.end = start.clone().add( 'month', 1 ).toDate();
                    }
                    item.calendar = queue.calendarId;
                    item.consultTime = true;
                    resultI.push( item );

                    Y.log( 'Negated nil queue ' + JSON.stringify( resultI ), 'debug', NAME );
                }
                return resultI;
            }

            // insert an empty queue for calendars with no result
            for( j = 0; j < calendars.length; j++ ) {
                hasResult = false;
                for( i = 0; i < qs.length; i++ ) {
                    if( qs[i][0] && qs[i][0].calendar === calendars[j] ) {
                        hasResult = true;
                    }
                }
                if( !hasResult ) {
                    qs.push( {calendarId: calendars[j]} );  // represents the emlty queue
                }
            }

            if( 0 === qs.length ) {
                result = negateQ( [] );
            } else {
                // loop through the qs and do each one separately.
                for( i = 0; i < qs.length; i++ ) {
                    result = Y.doccirrus.calUtils.mergeSortEvents( result, negateQ( qs[i] ), {} );
                }
            }

            return result;
        }

        /**
         * Augments the given query with a {calendar:{$in:[arrayOfCalendarIds]}}
         * search clause. The calendar Ids are all assigned to the given
         * params.location.
         *
         * @param {Object}              user                auth object for user DB access
         * @param {Object}              query               query object we are building
         * @param {Object}              params              getEventList() params
         * @param {Function}            callback            callback(err,query)
         *
         */
        function makeLocationTypeQuery( user, query, params, callback ) {
            function getInList( err, list ) {
                var i,
                    result = [];
                if( err ) {
                    callback( err );
                    return;
                }
                for( i = 0; i < list.length; i++ ) {
                    result.push( list[i]._id.toString() );
                }
                Y.log( 'Looking for events $in calendars: ' + result, 'debug', NAME );
                query.calendar = {$in: result};
                callback( null, query );
            }

            if( params.location ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'calendar',
                    query: {locationId: params.location},
                    callback: getInList
                } );
            }
        }

        /**
         * Show Calendar params in a result set with repetition/schedule events
         *
         * Add the cal name to the given result set. Fields is a space delimited
         * string of additional fields besides calname, eg.  'isPublic color'
         * @param {Object}          user
         * @param {Array}           resultList
         * @param {String}          fields
         * @param {Function}        callback
         */
        function addCalendarInfo( user, resultList, fields, callback ) {
            var i,
                flds = 'name';

            if( fields && 'string' === typeof fields ) {
                flds = flds + ' ' + fields;
            }

            //workaround for handling empty string ref values - crashes server when trying to convert to objid
            for( i = 0; i < resultList.length; i++ ) {
                resultList[i].calendar = resultList[i].calendar || undefined;
            }

            Y.doccirrus.mongodb.getModel( user, 'calendar', function( err, model ) {
                if( err || !model ) {
                    callback( err || 'error getting calendar model' );
                }
                model.mongoose.populate(
                    resultList,
                    [
                        {path: 'calendar', select: flds}
                    ],
                    callback );
            } );

        }

        /**
         * Show location params in a result set with repetition/schedule events
         *
         * Add the locname to the given result set. Fields is a space delimited
         * string of additional fields besides locname, eg.  'email phone'
         *
         * @param {Object}          user
         * @param {Array}           resultList
         * @param {String}          fields
         * @param {Function}        callback
         */
        function addLocationInfo( user, resultList, fields, callback ) {
            var
                interimResults;

            function handleLocationModel( err, model ) {
                var flds = 'locname';

                if( err ) {
                    callback( err );
                    return;
                }
                Y.log( 'Adding location, interim results  ' + JSON.stringify( interimResults ), 'info', NAME );
                if( fields && 'string' === typeof fields ) {
                    flds = flds + ' ' + fields;
                }
                //workaround for handling empty string ref values - crashes server when trying to convert to objid
                // comment out, we may not need this...
                //                for( i = 0; i < interimResults.length; i++ ) {
                //                    if( interimResults[i].calendar && interimResults[i].calendar[0] ) {
                //                        interimResults[i].calendar[0].location = interimResults[i].calendar[0].location || undefined;
                //                    }
                //                }
                model.mongoose.populate(
                    interimResults,
                    [
                        {
                            path: 'calendar.locationId', select: flds
                        }
                    ],
                    callback );
            }

            addCalendarInfo( user, resultList, 'locationId', function getLModel( err, results ) {
                if( err ) {
                    callback( err );
                    return;
                }
                interimResults = results;
                Y.doccirrus.mongodb.getModelReadOnly( user, 'location', handleLocationModel );
            } );
        }

        /**
         * Show patient params in a result set with repetition/schedule events
         *
         * Add fields from the patient to the given result set. Fields is a space delimited
         * string of fields to add, eg.  'firstname lastname'
         *
         * @param {Object}          user
         * @param {Array}           resultList
         * @param {String}          fields
         * @param {Function}        callback
         */
        function addPatientInfo( user, resultList, fields, callback ) {

            function handlePatientModel( err, model ) {
                var flds = '_id';

                if( err ) {
                    callback( err );
                    return;
                }
                Y.log( 'Adding patient info', 'info', NAME );
                if( fields && 'string' === typeof fields ) {
                    flds = flds + ' ' + fields;
                }
                //workaround for handling empty string ref values - crashes server when trying to convert to objid
                // (see location fn)
                model.mongoose.populate(
                    resultList,
                    [
                        {
                            path: 'patient', select: flds
                        }
                    ],
                    callback );
            }

            Y.doccirrus.mongodb.getModel( user, 'patient', handlePatientModel );
        }

        /**
         * include scheduleType data into the final calevent list
         * @param {Object}          user
         * @param {Array}           resultList
         * @param {String}          fields
         * @param {Function}        callback
         */
        function addScheduleTypeInfo( user, resultList, fields, callback ) {

            function doPopulate( err, model ) {
                var flds = '_id';

                if( err ) {
                    callback( err );
                    return;
                }
                Y.log( 'Adding schedule type info', 'info', NAME );
                if( fields && 'string' === typeof fields ) {
                    flds = flds + ' ' + fields;
                }
                // keep the scheduletype id in scheduletype
                // and at scheduletypePopulated separately
                resultList = resultList.map( function( obj ) {
                    obj.scheduletypePopulated = obj.scheduletype;
                    return obj;
                } );

                model.mongoose.populate(
                    resultList,
                    [
                        {
                            path: 'scheduletypePopulated', select: flds
                        }
                    ],
                    callback );
            }

            Y.doccirrus.mongodb.getModel( user, 'scheduletype', doPopulate );
        }

        /**
         * Gets events ('adhoc' and 'plan', Repetition_T and Schedule_T)
         *
         * Don't use this function, rather use the getEventList()
         *
         * @param {Object}              user
         * @param {Object}              scheduleQuery       this part is applied to both repetitions and schedules.
         * @param {Object}              baseOptions         these are limit and sorting options, and helper data for time range query
         * @param {Function }           callback            callback(err result), the result is an array of events.
         */
        function getCalevents( user, scheduleQuery, baseOptions, callback ) {
            Y.log( 'scheduleQuery: ' + JSON.stringify( scheduleQuery ), 'debug', NAME );
            Y.log( 'options: ' + JSON.stringify( baseOptions ), 'debug', NAME );

            let schedules;

            // get entries from schedule collection, e.g. adhocs, allDay, master Schedules ..., that satisfy user query
            Y.doccirrus.mongodb.runDb( {
                migrate: baseOptions.migrate,
                user: user,
                model: 'schedule',
                query: scheduleQuery,
                options: baseOptions,
                callback: function aggregate3( err, result ) {
                    if( err ) {
                        Y.log( 'error getting master schedules: ' + JSON.stringify( err ), 'error', NAME );
                        callback( err );
                        return;
                    }
                    schedules = result || [];
                    Y.log( 'Got schedules: ' + schedules.length, 'debug', NAME );

                    callback( null, schedules );
                }
            } );
        }

        /**
         * getEventList()
         *
         * new API to the scheduler giving simple and standard access to the
         * data in the calendars, scheduleTypes, locations, and other referenced
         * collections.
         *
         * getEventList is responsible for only preparing queries and helper parameters, meaning it does not get the result by itself
         *
         * Supply search Dates as regular moment, this API converts formats for searching etc. into
         * UTC as all DB date data is in UTC format. (WeeklyTimes, are also converted into UTC).
         *
         * NB: rules are applied in order...
         *
         * - patient: if set, then the calendar type is automatically set to "doctor"
         *
         * - consult: if true, then a specific calendar must be selected, and in this case,
         *      a) eventtypes are ignored. b) calendarTypes are ignored.
         *      i.e. You will only get a list of consult times
         *      Consult can be used together with negate (then you will get a list of the
         *      gaps). If there is no consult time for a particular day, you should get an empty
         *      list (negated you will get the entire day, whereby duration plays a role -
         *      you may just get a single event spanning several days (e.g. weekends)).
         *
         * - calendar: if set, then calendarType and location are ignored.
         *      This is because the calendarType and location select multiple or special calendars
         *      and are thus not compatible with selection of a single calendar.
         *
         * - calendarType: "real" is a combination of "close", "doctor" and "info", ignoring the
         *       virtuals "consult" and "open"
         *
         * - location: if set, then the calendarType is automatically set to "doctor"
         *
         * - number: if set, then the calendar type is automatically set to "doctor"
         *
         * - eventtype: may be a string or an array. The eventtypes generally apply to calendar
         *      types "doctor" and "info" and are otherwise ignored.
         *
         * - dateFrom: if set to "all", then no date search is applied at all (duration has no effect)
         *
         * - duration: if duration is supplied, dateTo is ignored. ("duration type" query)
         *
         * - dateTo: if set and dateFrom is empty, then an open range search up to dateTo is made.
         *    ("from-to" type query)
         *
         *
         * - sort: for now  start, eta and number are supported, and at most two fields at a time
         *
         * - fullText: query string for fulltext search in title, details and number fields (regex)
         *
         * - show: ScheduleTypes, Locations, Employees in result set
         *
         * - negate: boolean   Negated calendars show events for times that contain no
         *      events in a certain time period.
         *      If negate is true:
         *      + a specific calendar must be selected, or the calendarType must be "close".
         *      + the eventType may be 'closeTime' or 'consult' must be specified
         *      + scheduled and sort parameters are ignored.
         *
         * @param {Object} user
         * @param {Object} params
         * {
             calendar: specific_id | array id Ids | undefined
             location: locationId | undefined
             patient: patientId | undefined
             calendarType: default = "all" | "doctor" | "info" | "close" | "open" | "real" | FUTURE
             eventType: undefined = ["plan","adhoc"] | "all" | ["plan", "adhoc", "group", "allDay", "closeTime", "resource"] --> any combination or single
             consult: undefined = false | true
             negate: undefined = false | true
             scheduled: undefined = "all" | "waiting" | "current" | "active" | "old"
             dateFrom: undefined = "now" | "all" | "today" | dateInJSON
             dateTo: dateInJSON
             duration: "day" | "week" | "month" | "all", undefined = [dateFrom,dateTo] | "day"
             number: a specific ticket number
             fullText: string | ''
             sort: undefined = {start: 1, number: 1}
             limit: n
             show: default = "none" | "all" | ["schedule","location","employee", "patient" ]  --> combination
             specificOnly: true | false
             specialFlag: true | false
             scheduleType: true | false
             forDocSchedules: params | false
             group: true | false

             !--- Not used in getEventList() but appears in function calls ---
             !useEnd:       not used in function but appears in function calls
             !noRealign:    not used in function but appears in function calls

             !--- Not used in function calls() --
             !scheduleId: restrict the result to only repetitions of the given series
             !distinctPatients: undefined = false | true return all calEvents assigned to patients and include only the first one for each patient (in the sorted order)
             !callEventType: "info" | "close" | "open" | FUTURE

             callback: Function(err, result) if the cb is missing, the function does nothing. // DEPRECATED
         }
         *
         * @param {Function}    callback  function( err, result) if the cb is missing, first checks for a callback in
         *                                the params object otherwise does nothing.
         */
        DCCalUtils.prototype.getEventList = function getEventList( user, params, callback ) {
            var
                addVirtualOpen = false,
                addVirtualConsult = false,
                isPureVirtual = false,
                query = {},
                scheduleQuery,
                options = {},
                myCount = 0,
                myCallback = callback || params.callback,
                joinCnt,
                events = []; // the final result

            Y.log( 'calevent API call:' + require( 'util' ).inspect( params ), 'debug', NAME );
            // Do basic checks
            if( !user || !params || 'function' !== typeof myCallback ) {
                Y.log( 'getEventList called with insufficient parameters: Progammer error ', 'warn', NAME );
                // exit
                return;
            }

            // Augment the information in the list with
            // additional info from other collections according
            // to show params.
            function addInfo( result, params, callback ) {
                //
                // DO NOT MAKE ANY FURTHER CHANGES HERE -- TODO USE schemaprocess.event
                // And refactor large parts of the scheduler out to the event API.
                // TODO:  MOJ-1036
                //
                function finalCb( err, result ) {
                    Y.log( 'Added show information: ' + JSON.stringify( result ), 'debug', NAME );
                    callback( err, result );
                }

                function doScheduleType( err, result ) {
                    if( err ){
                        Y.log( 'error on addPatientInfo' + err.message, 'error', NAME );
                    }
                    if( -1 < params.show.toLowerCase().indexOf( 'scheduletype' ) ) {
                        Y.log( 'Adding show information: scheduleType', 'debug', NAME );
                        addScheduleTypeInfo( user, result, 'name info duration durationUnit', finalCb );
                    } else {
                        finalCb( null, result );
                    }
                }

                function doPatient( err, result ) {
                    if( err ){
                        Y.log( 'error on addLocationInfo' + err.message, 'error', NAME );
                    }
                    if( -1 < params.show.indexOf( 'patient' ) ) {
                        Y.log( 'Adding show information: patient', 'debug', NAME );
                        addPatientInfo( user, result, 'firstname lastname communications noMailing', doScheduleType );
                    } else {
                        doScheduleType( null, result );
                    }
                }

                if( params.show ) {
                    if( -1 < params.show.indexOf( 'location' ) ) {
                        Y.log( 'Adding show information: location', 'debug', NAME );
                        addLocationInfo( user, result, 'email phone street houseno zip city', doPatient );
                    } else {
                        doPatient( null, result );
                    }
                } else {
                    finalCb( null, result );
                }
            }

            // allow differentiated sorting
            // Y.doccirrus.utils.sortEventsK()  TODO with sorting criteria...
            //sortCriteria = Object.keys( options.sort );

            function join( err, data ) {
                var
                    result = [];
                myCount++;
                if( err ) {
                    Y.log( 'Error getting Doctor or Info Calendar events: ' + err, 'warn', NAME );
                } else {
                    result = data;
                }
                Y.log( 'GetEventList collected result: ' + myCount + ' / ' + joinCnt, 'debug', NAME );

                events = Y.doccirrus.calUtils.mergeSortEvents( events, result, {} ); // merge sort the newly arrived with the current ones

                if( joinCnt === myCount ) {
                    if( params.negate ) { // check do we need to negate now...
                        // this negates per calendar and returns a sorted list
                        events = negateEventList( events, params.dateFrom, params.dateTo, params.calendar );
                    }

                    if( params.limit ) {
                        events = events.slice( 0, params.limit );
                    }

                    addInfo( events, params, function returnEvent( err, result ) {
                        myCallback( err, result ); // final event list
                    } );
                }
            }

            async function doReal( err, query ) {
                if( !err ) {

                    if( params.linkSeries ) {
                        scheduleQuery = {_id: params.linkSeries};
                    } else {
                        if( params.fullText ){
                            //additionally collect all patients that match search criteria
                            let [error, patients] = await formatPromiseResult(
                                Y.doccirrus.api.patient.getPatients( {
                                        user,
                                        query: {
                                            term: params.fullText
                                        },
                                        options: { select: { _id: 1 } }
                                    }
                                )
                            );
                            if( error ){
                                Y.log( `getEventList.doReal: error getting patients: ${error.stack || error}`, 'warn', NAME );
                            } else {
                                patients = (patients || []).map( el => new ObjectId( el._id ) );
                                if( patients.length ){
                                    let orClause = query.$and && query.$and.find( el => el.$or );
                                    if( orClause ){
                                        orClause.$or.push( { patient: { $in: patients } } );
                                    }
                                }
                            }
                        }

                        scheduleQuery = Object.assign( {}, query );
                    }
                    if( !params.forDocSchedules ) {
                        addIntervalQuery( query, scheduleQuery, options );
                    }
                    // go get the list of bookable calevents that satisfy both queries, and also the options
                    getCalevents( user, scheduleQuery, options, join );
                } else {
                    myCallback( err );
                }

            }

            if( true === params.distinctPatients ) {
                options.distinctPatients = true;
            }

            options.migrate = params.migrate;

            // Set Defaults
            params.calendarType = params.calendarType || 'all';

            makePatientTypeQuery( query, options, params );

            if( params.scheduleType ) {
                query.scheduletype = params.scheduleType;
            }

            if( params.group ) {
                query.group = params.group;
            }

            if( params.consult ) {
                // want the consult times for only this calendar.
                // if called for a location, for all calendars at this location
                addVirtualConsult = true;
                isPureVirtual = true;
                joinCnt = 1;
            } else {

                // Setup the query
                if( params.calendar ) {
                    params.calendar = Array.isArray( params.calendar ) ? {$in: params.calendar} : params.calendar;
                    query.calendar = params.calendar;
                    joinCnt = 1;
                } else if( params.location ) {
                    joinCnt = 1;
                } else if( params.number ) {
                    joinCnt = 1;
                } else {
                    // set query
                    if( params.linkSeries ) { // only repetitions have this, so no virtual calendar
                        params.calendarType = 'real';
                    }
                    addCalTypeQuery( query, params.calendarType );
                    // are we adding virtual records?
                    switch( params.calendarType ) {
                        case 'close':
                            //query.calendar = Y.doccirrus.schemas.calendar.getCloseCalendarId();
                            query.closeTime = true;
                            joinCnt = 1;
                            break;
                        case 'open':
                            addVirtualOpen = true;
                            isPureVirtual = true;
                            joinCnt = 1;
                            break;
                        case 'all':
                            addVirtualOpen = true;
                            addVirtualConsult = true;
                            // is not only virtual
                            joinCnt = 3;
                            break;
                        case 'real':
                            joinCnt = 1;
                            break;
                        case 'doctor':
                            joinCnt = 1;
                            break;
                        case 'info':
                            // incomplete code?
                            joinCnt = 1;
                            break;
                    }
                }

                if( !isPureVirtual ) {
                    addEventTypeQuery( query, params.eventType );
                }

                addScheduleQuery( query, params.scheduled );

                // set query date searching
                if( !setupDateQuery( params ) ) {
                    myCallback( 'Invalid date params passed' );
                    return;
                }

                // if duration is specified then determine time range
                if( !params.specialFlag && isDurationQuery( params ) ) {
                    setTimeRange( params );
                }

                addRangeQuery( query, params.dateFrom, params.dateTo );

                options.sort = ('object' === typeof params.sort && Object.keys( params.sort ).length) ? params.sort : {
                    start: 1,
                    number: 1
                };
                if( params.limit ) {
                    options.limit = parseInt( params.limit, 10 );
                }
            }

            addNumberQuery( query, params.number );
            addFullTextQuery( query, params.fullText );

            if( addVirtualOpen ) {
                Y.log( 'add virtuals open events', 'debug', NAME );
                generateOpenList( query, join );
            }
            if( addVirtualConsult ) {
                Y.log( 'add virtuals consult events', 'debug', NAME );
                generateConsultList( user, params, join );
            }

            if( !isPureVirtual ) {
                if( params.location ) {
                    makeLocationTypeQuery( user, query, params, doReal );
                } else {
                    doReal( null, query );
                }
            }

        };

        /**
         * Wrapper for getEventList. Gets N Events for Today.
         *
         * @param   {Object}            user
         * @param   {number}            n
         * @param   {Object}            calendar
         * @param   {String}            location
         * @param   {String}            scheduled
         * @param   {Function}          cb
         */
        DCCalUtils.prototype.getNToday = function getNToday( user, n, calendar, location, scheduled, cb ) {
            Y.log( 'Entering getNToday', 'info', NAME );

            n = n || 0;
            var
                num = parseInt( n, 10 ),
                params = {
                    calendarType: 'doctor',
                    scheduled: scheduled
                };

            if( isNaN( num ) ) {
                num = 0;
            }
            if( calendar ) {
                params.calendar = calendar;
            }
            if( location ) {
                params.location = location;
            }
            params.sort = {start: 1, number: 1};
            params.limit = num;

            Y.doccirrus.calUtils.getEventList( user, params, cb );
        };

        /**
         * Merge sort two arrays of objects.  The objects are sorted by their
         * start and then number fields. Only for already sorted arrays.
         * @method sortedMerge
         * @param {Array}           arr1
         * @param {Array}           arr2
         * @param {Object} options attrs: 'sort'  'toJson' 'toString'
         * @return {Array}
         */
        DCCalUtils.prototype.mergeSortEvents = function mergeSortEvents( arr1, arr2, options ) {
            // Optimisation: the whole algorithm with just slice() and no ptrs
            var
                comp1,
                comp2 = function( obj ) {
                    return obj.number;
                };

            function nop( obj ) {
                return obj;
            }

            function convertJSON( obj ) {
                if( obj.toJSON ) {
                    return obj.toJSON();
                }
                return obj;
            }

            function getCompareFn( compareAttribute, convertFn ) {
                var
                    cA = compareAttribute,
                    conv = convertFn;
                if( options && options.reverse ) {
                    return function compare2( item1, item2 ) {
                        var
                            i1 = conv( item1[cA] ),
                            i2 = conv( item2[cA] );
                        if( i1 === i2 ) {
                            return 0;
                        }
                        if( i1 > i2 ) {
                            return -1;
                        }
                        return 1;
                    };
                }
                return function compare1( item1, item2 ) {
                    var
                        i1 = conv( item1[cA] ),
                        i2 = conv( item2[cA] );
                    if( i1 === i2 ) {
                        return 0;
                    }
                    if( i1 < i2 ) {
                        return -1;
                    }
                    return 1;
                };
            }

            if( options && options.toJson ) {
                comp1 = getCompareFn( 'start', convertJSON );
            }
            else {
                comp1 = getCompareFn( 'start', nop );
            }

            //            comp2 = getCompareFn( 'number', nop );

            if( !arr1 && Array.isArray( arr2 ) ) {
                Y.log( 'sortedMerge with invalid parameter. #1', 'warn', NAME );
                return arr2;
            }
            if( !arr2 && Array.isArray( arr1 ) ) {
                Y.log( 'sortedMerge with invalid parameter. #2', 'warn', NAME );
                return arr1;
            }
            if( !arr1 || !arr2 ) {
                Y.log( 'sortedMerge with invalid parameter. #3', 'warn', NAME );
                return [];
            }

            return Y.doccirrus.utils.sort.sortedMerge( arr1, arr2, comp1, comp2 );
        };

        // creates a title string using the patient info in PRC
        DCCalUtils.prototype.getScheduleTitle = function getScheduleTitle( user, scheduleData, callback ) {
            Y.log( 'Entering getScheduleTitle', 'info', NAME );

            // user defines title for "closeTime"-schedules
            if( scheduleData.closeTime ) {
                callback( null, scheduleData.title || '' );
                return;
            }

            var
                async = require( 'async' );

            async.parallel(
                {
                    patient: function getScheduleTitlePatient( patientCallback ) {
                        var
                            patientId = scheduleData.patient;

                        if( patientId ) {
                            Y.doccirrus.mongodb.runDb( {
                                action: 'get',
                                user: user,
                                model: 'patient',
                                migrate: true,
                                query: {_id: scheduleData.patient},
                                callback: function getScheduleTitlePatientCallback( error, results ) {
                                    if( error || !results.length ) {
                                        patientCallback( error );
                                    } else {
                                        patientCallback( null, results[0] );
                                    }
                                }
                            } );

                        } else {
                            patientCallback( null, null );

                        }
                    },
                    scheduletype: function getScheduleTitleScheduletype( scheduletypeCallback ) {
                        var
                            scheduletypeId = scheduleData.scheduletype,
                            isPartnerSchedule = scheduleData.partner && scheduleData.partner.scheduleId;
                        if( isPartnerSchedule ) {
                            Y.doccirrus.mongodb.runDb( {
                                action: 'get',
                                user: user,
                                model: 'mirrorscheduletype',
                                query: {_id: scheduletypeId},
                                callback: function getScheduleTitleScheduletypeCallback( error, results ) {
                                    if( error || !results.length ) {
                                        scheduletypeCallback( error );
                                    } else {
                                        scheduletypeCallback( null, results[0] );
                                    }
                                }
                            } );
                        } else if( scheduletypeId ) {
                            Y.doccirrus.mongodb.runDb( {
                                action: 'get',
                                user: user,
                                migrate: true,
                                model: 'scheduletype',
                                query: {_id: scheduletypeId},
                                callback: function getScheduleTitleScheduletypeCallback( error, results ) {
                                    if( error || !results.length ) {
                                        scheduletypeCallback( error );
                                    } else {
                                        scheduletypeCallback( null, results[0] );
                                    }
                                }
                            } );

                        } else {
                            scheduletypeCallback( null, null );

                        }
                    }
                },
                function getScheduleTitleComplete( error, result ) {
                    if( error ) {
                        callback( error );

                    } else {
                        callback( null, Y.doccirrus.schemas.calendar.buildScheduleTitle( {
                            event: scheduleData,
                            patient: result.patient,
                            scheduletype: result.scheduletype
                        } ) );

                    }
                }
            );

        };

        /**
         * create a virtual calevent using a copy of the master schedule
         *
         * @param   {String}            schedule           contains the date of the virtual calevent.
         *                                                  The time if day for the calevent comes from schedule.start
         * @param   {Object}            eventStart
         *
         * @returns {Object}            the calevent
         */
        DCCalUtils.prototype.getVirtualCalevent = function getVirtualCalevent( schedule, eventStart ) {
            Y.log( 'Entering getVirtualCalevent', 'info', NAME );

            var
                myCalevent = schedule.toObject ? schedule.toObject() : Y.clone( schedule, true ),
                eventEnd,
                masterStart = schedule.start.toJSON ? schedule.start : new Date( schedule.start );

            eventStart = moment( eventStart );
            eventStart.hour( masterStart.getHours() );
            eventStart.minute( masterStart.getMinutes() );
            eventStart.second( masterStart.getSeconds() );

            eventEnd = eventStart.clone().add( 'minutes', schedule.duration );
            myCalevent.start = eventStart.toDate();
            myCalevent.eta = myCalevent.start;
            myCalevent.linkSeries = myCalevent._id;
            myCalevent.end = eventEnd.toDate();
            myCalevent.scheduled = Y.doccirrus.schemas.calendar.SCH_WAITING; // for future events
            myCalevent.virtual = true; // just a helper flag for frontend. Currently not used
            delete myCalevent._id;
            return myCalevent;
        };

        /**
         * quickly check if there exist any appointment inside the given time interval.
         * this function counts only 1 for all repetitions of a series that fall in the interval.
         * to get a precise number of calevents, you need to use getEventList.
         * @param   {Object}          user
         * @param   {String}          iStart             start of interval
         * @param   {String}          iEnd               end of interval
         * @param   {Function}        callback
         */
        DCCalUtils.prototype.isThereAppointment = function isThereAppointment( user, iStart, iEnd, callback ) {
            Y.log( 'Entering isThereAppointment', 'info', NAME );

            Y.doccirrus.mongodb.runDb( {
                user: user,
                action: 'count',
                model: 'schedule',
                query: {
                    allDay: {$ne: true},
                    closeTime: {$ne: true},
                    start: {$gte: iStart, $lte: iEnd}
                },
                callback: function( err, count ) {
                    var cb = callback;
                    if( err || 0 < count ) {
                        cb( err, count );
                        return;
                    }
                    cb( null, count );
                }
            } );
        };

        /**
         * alert patient when their calevent is created or updated
         * called only from schedule/repetition-process.server
         * @param {Object}              user
         * @param {Object}              calevent
         * @param {Functio}             callback
         *
         * @return {Function}           callback
         */
        DCCalUtils.prototype.alertEvent = async function alertEvent( user, calevent, callback ) {
            Y.log( 'Entering alertEvent', 'info', NAME );
            var
                updatedFields = calevent.$__.activePaths.states.modify,
                alertOption = calevent.isNew ? {created: true} : {updated: true},
                needsAlert = calevent.isNew || (updatedFields.start && (updatedFields.eta || this.context.isManualChange)) /* || updatedFields.dtstart || updatedFields.until*/;
            if( calevent.start < Date.now() ) {
                callback( null, calevent );
                return;
            }
            if( alertOption.created && calevent.conferenceId ) {
                // don't need to alert about schedule from conference since email will be send with conference details
                return callback( null, calevent );
            }

            // handle repetition creation or update
            if( (calevent.linkSeries && calevent.linkSeries) ) { // if a repetition
                if( calevent.eta.toJSON() === calevent.linkSeries.toJSON() ) {
                    needsAlert = false;     // no alert if not shifted
                } else if( calevent.isNew ) {
                    alertOption = {updated: true};
                }
                if( updatedFields.deleted && calevent.deleted ) { // if the repetition was marked "deleted"
                    Y.doccirrus.calUtils.alertEventDelete( user, calevent, callback );
                    return; // done here
                }
            }

            if( needsAlert ) {
                if( '' === calevent.patient ) {
                    delete calevent._doc.patient; // a hack to prevent mongoose.populate crash
                }

                if (calevent.group) {
                    let [scheduleError, schedules] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'schedule',
                            action: 'get',
                            query: {
                                groupId: calevent._id
                            }
                        } )
                    );

                    if( scheduleError ) {
                        Y.log( 'error getting schedules. ' + JSON.stringify( scheduleError ), 'error', NAME );
                    }

                    const mainEvent = calevent.toObject ? calevent.toObject() : calevent;

                    const updatedSchedules = schedules.map(el => {
                        el.start = mainEvent.start;
                        el.end = mainEvent.end;

                        return el;
                    });

                    if (schedules.length > 0) {
                        Y.doccirrus.patalert.alertEvents( user, [mainEvent, ...updatedSchedules], alertOption, function( err ) {
                            if( err ) {
                                Y.log( 'error came back from alertEvents. AlertOption: ' + JSON.stringify( alertOption ), 'error', NAME );
                            }
                        } );
                    }
                    callback( null, calevent );
                    return;
                }

                //mongooselean.toObject
                Y.doccirrus.patalert.alertEvents( user, [calevent.toObject ? calevent.toObject() : calevent], alertOption, function( err ) {
                    if( err ) {
                        Y.log( 'error came back from alertEvents. AlertOption: ' + JSON.stringify( alertOption ), 'error', NAME );
                    }
                } );
            }
            callback( null, calevent );
        };

        DCCalUtils.prototype.alertEventDelete = function alertEventDelete( user, calevent, callback ) {
            Y.log( 'Entering alertEventDelete', 'info', NAME );


            if( calevent.start < Date.now() ) {
                callback( null, calevent );
                return;
            }

            if( calevent.conferenceId ) {
                // don't need to alert about schedule from conference since email will be send with conference details
                return callback( null, calevent );
            }

            Y.doccirrus.patalert.alertEvents( user, [calevent], {deleted: true}, function( err ) {
                if( err ) {
                    Y.log( 'error came back from alertEvents. deleted:true', 'error', NAME );
                }
            } );
            callback( null, calevent );
        };

        /**
         * returns the next/previous N repetitions of a series, N=|steps|
         * if steps > 0 then goes forward in time, otherwise backward direction
         * deleted repetitions are skipped and not counted
         *
         * @param   {Object}            user
         * @param   {Object}            params
         *
         * @param   {Object}            params.scheduleOrId  the master schedule object containing rrule data, or just its id
         * @param   {Object}            params.steps number if recurrences and the direction
         * @param   {Function}          callback result is always in ascending order of start times
         * @param   {Boolean}           onlyMaster
         */
        DCCalUtils.prototype.getNRepetitions = function getNRepetitions( user, params, callback, onlyMaster = false ) {
            Y.log( 'Entering getNRepetitions', 'info', NAME );

            var
                scheduleOrId = params.scheduleOrId, steps = params.steps,
                scheduleId = scheduleOrId.linkSeries || scheduleOrId._id || ( 'string' === typeof scheduleOrId ? scheduleOrId : '' );


            if( 0 === +steps ) {
                callback( null, null );
            }

            // here we take into account the real repetitions
            function buildResult( err, result ) {

                if( err ) { // don't care of steps is zero
                    callback( err );
                    return;
                }
                callback( null, result );
            }

            if( !scheduleId ) {
                // we have nothing to search for, can happen in edge case
                allDone( null, [] );
            } else {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'schedule',
                    query: onlyMaster ? {_id: scheduleId} : {linkSeries: scheduleId},
                    options: {sort: {start: 1}, limit: steps},
                    callback: allDone
                } );
            }

            function allDone( err, joinedResult ) {
                if( err ) {
                    callback( err );
                } else {
                    buildResult( err, joinedResult );

                }
            }
        };

        /**
         * get the first not deleted entry
         * @param   {Object}            user
         * @param   {Object}            masterSchedule
         * @param   {Object}            callback
         */
        DCCalUtils.prototype.getFirstRepetitions = function getFirstRepetitions( user, masterSchedule, callback ) {
            Y.log( 'Entering getFirstRepetitions', 'info', NAME );

            Y.doccirrus.calUtils.getNRepetitions( user, {
                scheduleOrId: masterSchedule,
                baseDate: masterSchedule.dtstart,
                steps: 1,
                include: true
            }, callback );
        };

        /**
         * get the last not deleted entry
         * returns null if infinite series
         * @param   {Object}          user
         * @param   {Object}          masterSchedule
         * @param   {Function}        callback
         */
        DCCalUtils.prototype.getLastRepetitions = function getLastRepetitions( user, masterSchedule, callback ) {
            Y.log( 'Entering getLastRepetitions', 'info', NAME );

            if( masterSchedule.until ) {
                Y.doccirrus.calUtils.getNRepetitions( user, {
                    scheduleOrId: masterSchedule,
                    baseDate: masterSchedule.until,
                    steps: -1,
                    include: true
                }, callback );
            } else {
                callback( null, null );
            }
        };

        DCCalUtils.prototype.isMasterSchedule = function isMasterSchedule( calevent ) {
            return calevent.repetition && 'NONE' !== calevent.repetition && !calevent.linkSeries;
        };

        /**
         * A central place that removes/modifies fields, so that the calevent will be consistent to it's type
         *
         * it tries to detect the type of calevent, but must set isMaster if the calevent is for sure a master schedule
         *
         * makes sure the following conditions always hold for any calevent:
         * if a master schedule
         * 1- dtstart/until should be aligned to the start/end of day, for the sake of rrule
         * 2- start/end time should be in sync with dtstart/until, so that it represents the whole series (this is required for queires)
         * else if not a master schedule, then no repetition field..., delete them if any exists
         * @param   {Object}        data
         * @param   {Boolean}        isMaster is a master schedule? can be undefined when we can't know it
         * @param   {Boolan}        keepOriginal            set to true to keep it as mongoose object
         * @return  {Object}        raw JSON object
         */
        DCCalUtils.prototype.cleanCalevent = function cleanCalevent( data, isMaster, keepOriginal ) {
            var
                dtstart, until,
                myCalevent = (data && !keepOriginal) ? JSON.parse( JSON.stringify( data ) ) : data;

            myCalevent.start = moment( myCalevent.start ).seconds( 0 ).milliseconds( 0 ).toJSON();
            myCalevent.end = moment( myCalevent.end ).seconds( 0 ).milliseconds( 0 ).toJSON();

            if( Y.doccirrus.calUtils.isMasterSchedule( myCalevent ) ) {
                myCalevent.linkSeries = null;
                if( 'DAILY' === myCalevent.repetition ) {
                    myCalevent.byweekday = [];
                }

                if( myCalevent.dtstart && myCalevent.repetition ) {
                    dtstart = moment( myCalevent.dtstart );
                    myCalevent.dtstart = dtstart.toDate();
                }

                if( myCalevent.until && myCalevent.repetition ) {
                    until = moment( myCalevent.until );
                    myCalevent.until = until.toDate();
                }
            }

            return myCalevent;
        };

        /**
         * examine a series against blocked and consule times
         * as of now there is now check if there is any overlap with other series (as well as normal schedule)
         *
         * @param   {Object}          user
         * @param   {Object}          schedule            a master schedule
         * @param   {Array}           masterData
         * @param   {Function}        callback
         */
        DCCalUtils.prototype.validateSeries = function validateSeries( user, schedule, masterData, callback ) {
            Y.log( 'entering validateSeries: ' + JSON.stringify( schedule ), 'debug', NAME );
            var
                query = {},
                isPlanned,
                finalResult = {event: schedule, resultInt: 1, valid: true},
                async = require( 'async' );

            if( !schedule.repetition || 'NONE' === schedule.repetition || !schedule.dtstart ) {
                callback( Y.doccirrus.errors.rest( 400, 'cannot validate master schedule' ) );
                return;
            }

            // check if the consult time covers the event
            // it covers if they are on the same day of week and the event falls within the consult time span (by comparing only time parts)
            // the comparison is independent of tine zones
            function isInConsultTime( ev, con ) {
                var
                    conStart = new Date( con.start ),
                    conEnd = new Date( con.end ),
                    sameDay = ev.start.getDay() === conStart.getDay(); // same day of week?
                // set the date part so that both intervals will be in the same time zone
                conStart.setFullYear( ev.start.getFullYear(), ev.start.getMonth(), ev.start.getDate() );
                conEnd.setFullYear( ev.end.getFullYear(), ev.end.getMonth(), ev.end.getDate() );
                return sameDay && +ev.start >= +conStart && +ev.end <= +conEnd;
            }

            // helper
            function theyOverLap( ev1, ev2 ) {
                return !( ev1.start >= ev2.end || ev2.start >= ev1.end ); // if there is no gap between them
            }

            function checkRepetitionCount() {
                var startDate = moment( schedule.dtstart ),
                    endDate = moment( schedule.until ),
                    count;

                if( 'WEEKLY' === schedule.repetition ) {
                    count = endDate.diff( startDate, 'weeks', true );
                    count *= schedule.byweekday.length;
                } else {
                    count = endDate.diff( startDate, 'days', true );
                }

                if( ( Math.ceil( count ) + 1) > Y.doccirrus.schemas.calendar.MAX_SERIES_SCHEDULES ) {
                    finalResult = {
                        resultInt: 7014,
                        valid: false
                    };
                    return callback( null, finalResult );
                }
                else {
                    return callback( null, finalResult );
                }
            }

            function pairCheck( err, allResults ) {
                var
                    myReps;
                var
                    foundConsult;
                if( err ) {
                    Y.log( 'pairCheck error: printing stack\n' + new Error().stack, 'warn', NAME );
                    callback( err );
                    return;
                }

                myReps = masterData;
                Y.Array.some( myReps, function( rep ) {
                    foundConsult = Y.Array.find( allResults.consultTimes, function( con ) {
                        if( isInConsultTime( rep, con ) ) {
                            return con;
                        }
                    } );
                    if( !foundConsult ) {
                        finalResult = {
                            event: rep,
                            resultInt: 7011,
                            valid: false
                        };
                        return true;
                    }
                } );
                if( finalResult.valid ) {
                    checkRepetitionCount();
                } else {
                    return callback( null, finalResult ); // done
                }
            }

            function checkWithConsultTimes() {
                var
                    baseDate = moment().startOf( 'week' );

                async.parallel( {
                    consultTimes: function( _cb ) {
                        // get consult times for a week
                        Y.doccirrus.calUtils.getEventList( user, {
                            calendar: schedule.calendar,
                            dateFrom: baseDate,
                            consult: true,
                            duration: 'week'
                        }, _cb );
                    }
                }, pairCheck );
            }

            function checkClashType( err, result ) {
                if( err ) {
                    Y.log( 'error in checkClashType:' + JSON.stringify( err ), 'error', NAME );
                    callback( err );
                    return;
                }

                if( !result || !result.length ) {
                    checkWithConsultTimes();
                    return;
                }

                Y.Array.some( result, function( calevent ) {
                    if( calevent.closeTime ) {
                        finalResult = {
                            resultInt: 7012,
                            data: calevent,
                            valid: false
                        };
                        return true;
                    }
                    if( calevent.resourceClash ) {
                        finalResult = {
                            $resources: calevent.warnResource,
                            resultInt: 7004,
                            data: calevent,
                            valid: false
                        };
                        return true;
                    }
                } );

                if( finalResult.valid ) {
                    checkWithConsultTimes();
                } else {
                    return callback( null, finalResult ); // done
                }
            }

            function checkBlockedTimes( err, result ) {
                if( err ) {
                    Y.log( 'error in validateSeries (get schedules):' + JSON.stringify( err ), 'error', NAME );
                    callback( err );
                    return;
                }
                if( !result || !result.length ) {
                    checkWithConsultTimes();
                    return;
                }
                // collect those blocked times that actually overlap a repetition
                // blocked times are expected to span at most one day
                async.concatSeries( result, function( blockedTime, _cb ) {

                    async.each( masterData, function( seriePart, done ) {

                        if( theyOverLap( seriePart, blockedTime ) ) {
                            if( seriePart.resource === blockedTime.resource ) {
                                Y.doccirrus.mongodb.runDb( {
                                    user,
                                    model: 'resource',
                                    query: {_id: blockedTime.resource},
                                    callback: function( err, result ) {
                                        if( err ) {
                                            Y.log( `checkBlockedTimes. Error while getting resource ${blockedTime.resource}: ${err.stack || err}`, 'error', NAME );
                                            return setImmediate( done, [{...blockedTime, resourceClash: true, warnResource: blockedTime.resource}] );
                                        }
                                        return setImmediate( done, [{...blockedTime, resourceClash: true, warnResource: result[0] && result[0].type}] );
                                    }
                                } );
                            } else {
                                return setImmediate( done, [blockedTime] ); // return the overlapping calevent
                            }
                        } else {
                            return setImmediate( done );
                        }
                    }, function( err1 ) {
                        if( err1 ) {
                            return _cb( null, err1 );
                        }
                        return _cb();
                    } );
                }, checkClashType );
            }

            isPlanned = {
                $and: [
                    {adhoc: {$ne: true}},
                    {closeTime: {$ne: true}},
                    {allDay: {$ne: true}}
                ]
            };

            if( schedule._id ) { // to prevent checking against itself
                query._id = {$ne: schedule._id};
                query.linkSeries = {$ne: schedule._id};
            }
            query.calendar = schedule.calendar;
            query.$or = [
                {adhoc: true},
                {closeTime: true},
                isPlanned
            ];
            query.scheduled = Y.doccirrus.schemas.calendar.SCH_WAITING;
            if( schedule.until ) {
                query.start = {$lte: moment( schedule.until ).endOf( 'day' ).toJSON()};
            }
            query.end = {$gte: moment( schedule.dtstart ).startOf( 'day' ).toJSON()};

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'schedule',
                query: query,
                callback: checkBlockedTimes
            } );
        };

        myUtils = new DCCalUtils();
        myUtils.init();

        Y.namespace( 'doccirrus' ).calUtils = myUtils;

    },
    '0.0.1', {requires: [
            'oop',
            'dccommonutils',
            'dcutils',
            'rruleutils'
    ]}
);
