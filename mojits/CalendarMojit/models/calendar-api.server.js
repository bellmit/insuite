/*global YUI */

YUI.add( 'calendar-api', function( Y, NAME ) {

    const
        {formatPromiseResult, handleResult} = require( 'dc-core' ).utils,
        moment = require( 'moment' ),
        ObjectId = require( 'mongoose' ).Types.ObjectId;

        function getSharedCalendars( args ) {
            let
                { user, callback } = args;
            Y.doccirrus.mongodb.runDb( {
                user,
                model: 'calendar',
                action: 'get',
                query: {
                    isShared: true,
                    mirrorCalendarId: {$exists: false}
                },
                options: {
                    lean: true,
                    select: {
                        _id: 1,
                        name: 1,
                        color: 1
                    }
                }
            }, ( err, result ) => {
                if( err ) {
                    return callback( err );
                }
                callback( null, result.map( calendar => ({
                    name: calendar.name,
                    originalId: calendar._id,
                    color: calendar.color
                }) ) );
            } );
        }

        function getPartnersSharedCalendars( args ) {
            let
                { user, callback } = args,
                async = require( 'async' );
            async.parallel( {
                mirrorCalendars( done ){
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'mirrorcalendar',
                        action: 'get',
                        query: {},
                        options: {
                            lean: true,
                            select: {
                                color: 1,
                                active: 1,
                                prcCustomerNo: 1,
                                prcCoName: 1,
                                originalId: 1,
                                name: 1
                            }
                        }
                    }, done );
                },
                partnersSharedCalendars( done ){
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'partner',
                        action: 'get',
                        query: {},
                        options: {
                            lean: true,
                            select: {
                                dcId: 1,
                                name: 1
                            }
                        }
                    }, ( err, results ) => {
                        if( err ) {
                            return done( err );
                        }
                        async.map( results, ( partner, done ) => {
                            Y.doccirrus.communication.callExternalApiByCustomerNo( {
                                api: 'calendar.getSharedCalendars',
                                dcCustomerNo: partner.dcId,
                                user: user,
                                query: {},
                                callback: function( err, data = [] ) {
                                    if( err ) {
                                        Y.log( `Could not get fresh list of shared calendars from ${partner.dcId}. Error: ${err && err.stack || err}`, 'error', NAME );
                                        return done( null, [] );
                                    }
                                    if( data.length ) {
                                        data = data.map( item => {
                                            item.prcCustomerNo = partner.dcId;
                                            item.prcCoName = partner.name;
                                            return item;
                                        } );
                                    }
                                    done( null, data );
                                }
                            } );
                        }, done );
                    } );
                }
            }, function( err, result ) {
                let
                    calendars;
                if( err ) {
                    return callback( err );
                }
                calendars = result.mirrorCalendars;
                result.partnersSharedCalendars.forEach( partnerCalendars => {
                    calendars.push( ...partnerCalendars.filter( partnerCalendar => {
                        return !calendars.some( mirrorItem => mirrorItem.originalId.toString() === partnerCalendar.originalId && mirrorItem.prcCustomerNo === partnerCalendar.prcCustomerNo );
                    } ) );

                } );

                callback( null, calendars );
            } );

        }

        /**
         * Checks if request comes from partner (sourceDcCustomerNo)
         *  if true - returns calendar document
         * @method getCalendarDataForPartner
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {String} args.data.calendarId calendarId
         * @param {String} args.sourceDcCustomerNo partner dcCustomerNo
         * @param {Function} args.callback
         *
         * @return {Function | Promise}
         */
        function getCalendarDataForPartner( args ) {
            let
                { user, data: { calendarId } = {}, callback, sourceDcCustomerNo } = args,
                async = require( 'async' );
            if( !calendarId ) {
                Y.log( 'getCalendarDataForPartner. calendarId is missing', 'error', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Invalid params.' } ) );
            }
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
                        model: 'calendar',
                        action: 'get',
                        query: {
                            _id: calendarId
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
                            Y.log( `getCalendarDataForPartner. Calendar not found, _id: ${calendarId}`, 'error', NAME );
                            return next( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Calendar not found' } ) );
                        }
                        next( null, results[ 0 ] );
                    } );
                }
            ], callback );

        }

        /**
         * Creates calendar document for mirrorcalendar.
         * Calls Y.doccirrus.api.calendar.deletePartnerCalendar before actual insert of calendar document
         * @method createPartnerCalendar
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Object} args.data.mirrorCalendarData
         * @param {Function} args.callback
         */
        function createPartnerCalendar( args ) {
            let
                { user, data: { mirrorCalendarData } = {}, callback } = args,
                postData,
                async = require( 'async' );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.api.calendar.deletePartnerCalendar( {
                        user,
                        data: {
                            mirrorCalendarId: mirrorCalendarData._id,
                            dcCustomerNo: mirrorCalendarData.prcCustomerNo
                        },
                        callback( err ){
                            next( err );
                        }
                    } );
                },
                function( next ) {
                    postData = Object.assign( {}, mirrorCalendarData );
                    delete postData._id;
                    delete postData.employee;
                    delete postData.locationId;
                    postData.mirrorCalendarId = mirrorCalendarData._id;
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'calendar',
                        action: 'post',
                        data: Y.doccirrus.filters.cleanDbObject( postData )
                    }, next );
                }
            ], callback );
        }

        /**
         * Deletes calendar (selected by mirrorCalendarId) and all its schedules
         * @method deletePartnerCalendar
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {String} args.data.mirrorCalendarId
         * @param {Function} args.callback
         *
         * @return {Function | Promise}
         */
        function deletePartnerCalendar( args ) {
            let
                { user, data: { mirrorCalendarId, dcCustomerNo } = {}, callback } = args,
                async = require( 'async' );
            if( !mirrorCalendarId || !dcCustomerNo ) {
                Y.log( `syncPartnerCalendar. calendarId: ${mirrorCalendarId} or dcCustomerNo:${dcCustomerNo} is missing`, 'error', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Invalid params.' } ) );
            }
            function deleteSchedules( params, callback ) {
                let
                    { calendarId } = params;
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'schedule',
                    action: 'delete',
                    options: {
                        override: true
                    },
                    query: {
                        calendar: calendarId
                    }
                }, err => callback( err ) );
            }

            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'calendar',
                        action: 'get',
                        query: {
                            mirrorCalendarId: mirrorCalendarId
                        },
                        options: {
                            lean: true,
                            select: {
                                _id: 1
                            }
                        }
                    }, ( err, results ) => {
                        if( err ) {
                            return next( err );
                        }
                        next( null, results && results[ 0 ] );
                    } );
                },
                function( calendar, next ) {
                    if( calendar ) {
                        deleteSchedules( {
                            calendarId: calendar._id
                        }, err => next( err, calendar ) );
                    } else {
                        setImmediate( next, null, calendar );
                    }
                },
                function( calendar, next ) {
                    if( calendar ) {
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'calendar',
                            action: 'delete',
                            query: {
                                _id: calendar._id
                            }
                        }, ( err ) => next( err ) );
                    } else {
                        setImmediate( next );
                    }
                },
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'mirrorscheduletype',
                        action: 'delete',
                        query: {
                            prcCustomerNo: dcCustomerNo
                        },
                        options: {
                            override: true
                        }
                    }, ( err ) => next( err ) );
                }
            ], callback );
        }

        /**
         * Import holidays from https://feiertage-api.de/
         * @method importCloseTime
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {String} args.data.year
         * @param {String} args.data.federalState
         * @param {Function} args.callback
         *
         * @return {Function}
         */
        function importCloseTime( args ) {
            let
                {user, data: { year, federalState } = {}, callback} = args,
                async = require( 'async' ),
                moment = require( 'moment' ),
                calendars = [];
            if( !year || !federalState ) {
                Y.log( `importCloseTime. year: ${year} or federalState:${federalState} is missing`, 'error', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 400, {message: 'Invalid params.'} ) );
            }

            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.runDb(
                        {
                            user: user,
                            model: 'calendar',
                            action: 'get',
                            query: { type: { $in: [ "INFORMAL", "PATIENTS" ] } }
                        }, ( err, result )=>{
                            if( err ) {
                                return next( err );
                            }
                            if( result && result[0] ) {
                                calendars = result;
                            }
                            return next();
                        } );
                },
                function( next ) {
                    var
                        options = Y.doccirrus.auth.setInternalAccessOptions(),
                        myUrl = `https://feiertage-api.de/api/?jahr=${year}&nur_land=${federalState}`;

                    Y.doccirrus.https.externalGet( myUrl, options, next );
                },
                function( response, holidays, next ) {
                    var
                        closeDays = holidays || [];

                    if( closeDays && 0 < Object.keys( closeDays ).length ) {
                        //create closeTime events

                        async.eachSeries( Object.keys( closeDays ), ( item, done ) => {
                            let closeTimeId = new require( 'mongoose' ).Types.ObjectId();
                            async.eachSeries( calendars, ( calendar, innerDone ) => {

                                Y.doccirrus.mongodb.runDb( {
                                    action: 'get',
                                    user: user,
                                    model: 'schedule',
                                    query: {
                                        closeTime: true,
                                        calendar: calendar._id,
                                        start: {
                                            $lte: moment().year( year ).month( 11 ).date( '31' ).endOf('day'),
                                            $gte: moment().year( year ).month( 0 ).date( '1' ).startOf('day')
                                        }
                                    }
                                },( error, res )=>{
                                    if( error ) {
                                        return done( error );
                                    }
                                    if( res && res[0] ) {
                                        let alreadyExist;


                                        alreadyExist = res.some( ( closeDayInThisCalendar )=>{
                                            return moment( closeDays[item].datum ).toISOString() === closeDayInThisCalendar.start.toISOString();
                                        } );

                                        if( !alreadyExist ) {
                                            Y.doccirrus.api.calevent.post( {
                                                user: user,
                                                data: {
                                                    userDescr: item,
                                                    start: moment( closeDays[item].datum ),
                                                    end: moment( closeDays[item].datum ).add( 1, 'day' ),
                                                    allDay: 'INFORMAL' === calendar.type ? true : false,
                                                    closeTime: true,
                                                    calendar: calendar._id,
                                                    title: item,
                                                    closeDayType: 'HOLIDAY',
                                                    closeTimeId: closeTimeId
                                                },
                                                noValidation: true,
                                                callback: ( err ) => {
                                                    if( err ) {
                                                        return innerDone( err );
                                                    }
                                                    return innerDone();
                                                }
                                            } );
                                        } else {
                                            return innerDone();
                                        }
                                    } else {
                                        Y.doccirrus.api.calevent.post( {
                                            user: user,
                                            data: {
                                                userDescr: item,
                                                start: moment( closeDays[item].datum ),
                                                end: moment( closeDays[item].datum ).add( 1, 'day' ),
                                                allDay: 'INFORMAL' === calendar.type ? true : false,
                                                closeTime: true,
                                                calendar: calendar._id,
                                                title: item,
                                                closeDayType: 'HOLIDAY',
                                                closeTimeId: closeTimeId
                                            },
                                            noValidation: true,
                                            callback: ( err ) => {
                                                if( err ) {
                                                    return innerDone( err );
                                                }
                                                return innerDone();
                                            }
                                        } );
                                    }
                                });
                            }, ( error ) => {
                                if( error ) {
                                    return done( error );
                                }
                                return done();
                            } );
                        }, ( err ) => {
                            if( err ) {
                                return next( err );
                            }
                            return next();
                        } );
                    } else {
                        setImmediate( next );
                    }
                }
            ], callback );
        }

        /**
         * Gets calendar with employee obj
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Function} args.callback
         */
        function getPopulatedCalendar( args ) {
            Y.log('Entering Y.doccirrus.api.calendar.getPopulatedCalendar', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.calendar.getPopulatedCalendar');
            }
            const
                { user, callback, query = {} } = args,
                async = require( 'async' );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'calendar',
                        action: 'get',
                        query
                    }, next );
                },
                function( calendars, next ) {
                    for( let calendar of calendars ) { // eslint-disable-line no-unused-vars
                        for( let consultTime of (calendar.consultTimes || []) ) { // eslint-disable-line no-unused-vars
                            if( consultTime && consultTime.repetitionSettings && consultTime.repetitionSettings[0] ) {
                                // generate an array of available dates based on repetitionSettings
                                consultTime.datesForRepetition = Y.doccirrus.rruleutils.getDatesForRepetitions( consultTime.repetitionSettings[0],
                                    new Date( Y.doccirrus.commonutils.convertHourArrayToMoment( consultTime.start, moment().startOf( 'day' ) ).toDate() ) );
                            }
                        }
                    }
                    return next( null, calendars );
                },
                function( calendars, next ) {
                    const
                        employeesId = calendars.map( ( item ) => {
                            if( item.employee && item.employee.toString().trim() ) {
                                return item.employee;
                            }
                            return;
                        } );

                    if( employeesId.length ) {
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'employee',
                            action: 'get',
                            query: {
                                _id: { $in: employeesId }
                            }
                        }, ( err, employees ) => {
                            let
                                employeeMap = new Map();
                            if( err ) {
                                return next( err );
                            }
                            employees.forEach( employee => {
                                employeeMap.set( employee._id.toString(), employee );
                            } );
                            calendars.forEach( calendar => {
                                if( calendar.employee ) {
                                    calendar.employeeObj = employeeMap.get( calendar.employee );
                                }
                            } );
                            next( null, calendars );

                        } );
                    } else {
                        setImmediate( next, null, calendars );
                    }
                }
            ], callback );

        }

        function getAllCalGroups( args ) {
            let
                {user, query = {}, options = {}, callback} = args,
                pipeline = [
                    {"$unwind": "$calGroup" },
                    { "$match": query },
                    { "$group":
                        { _id: null, groups: {"$addToSet": "$calGroup" } }
                    }
                ];
            Y.doccirrus.mongodb.runDb( {
                user,
                model: 'calendar',
                action: 'aggregate',
                pipeline: pipeline,
                options: options
            }, ( err, results ) => {
                if( err ) {
                    return callback( err );
                }
                if( results && results.result && results.result[0] ) {
                    return callback( null, results.result[0].groups );
                } else {
                    return callback( null, [] );
                }
            } );
        }

        /**
         * @public
         * @async
         * @JsonRpcApi
         *
         * This method does below:
         * 1] Add new resources inside a calendar
         * 2] Update existed resources inside a calendar
         * 3] Delete resources from a calendar
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.originalParams
         * @param {Array} args.originalParams.created - Array of resource objects which should be inserted into calendars
         * @param {Array} args.originalParams.updated - Array of resource objects which should be updated inside calendars
         * @param {Array} args.originalParams.deleted - Array of resource objects which should be delete from calendars
         * @param {function} [args.callback] - If present then response will be sent via callback
         * @returns {Promise<undefined>}
         */
        async function updateResources( args ) {
            const
                {user, originalParams, callback} = args,
                {created, updated, deleted} = originalParams;
            let
                err, result,
                res = {
                    created: [],
                    updated: []
                };

            if( created.length > 0 ) {
                for( let item of created ) {
                    item.data._id = new ObjectId();
                    item.data = Y.doccirrus.filters.cleanDbObject( item.data );
                    [err, result] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            action: 'update',
                            model: 'calendar',
                            query: {_id: item.calendarId},
                            data: {
                                $addToSet: {resources: item.data}
                            }
                        } )
                    );

                    if( err ) {
                        Y.log( `updateResources. Error while adding new resources for calendar: ${item.calendarId}. Error: ${err.stack || err}`, 'warn', NAME );
                        return handleResult( err, undefined, callback );
                    }

                    if( result && result.nModified ) {
                        res.created.push( item.data );
                    }
                }
            }

            if( updated.length > 0 ) {
                for( let item of updated ) {
                    item.data = Y.doccirrus.filters.cleanDbObject( item.data );
                    [err, result] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            action: 'update',
                            model: 'calendar',
                            query: {
                                _id: item.calendarId,
                                'resources._id': item.data._id
                            },
                            data: {
                                $set: {
                                    'resources.$[elem]': item.data
                                }
                            },
                            options: {
                                "arrayFilters": [{'elem._id': new ObjectId( item.data._id )}]
                            }
                        } )
                    );

                    if( err ) {
                        Y.log( `updateResources. Error while updating of resources in calendar: ${item.calendarId}. Error: ${err.stack || err}`, 'warn', NAME );
                        return handleResult( err, undefined, callback );
                    }
                    if( result && result.nModified ) {
                        res.updated.push( item.data );
                    }
                }
            }

            if( deleted.length > 0 ) {
                for( let item of deleted ) {

                    if( !item.resourceId || !item.calendarId ) {
                        Y.log( `updateResources. Missing params.`, 'warn', NAME );
                        return handleResult( new Y.doccirrus.commonerrors.DCError( 400, {message: 'insufficient arguments'} ), undefined, callback );
                    }
                    item = Y.doccirrus.filters.cleanDbObject( item );

                    [err, result] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            'action': 'update',
                            'model': 'calendar',
                            'query': {
                                _id: item.calendarId
                            },
                            'data': {
                                $pull: {resources: {_id: item.resourceId}}
                            }
                        } )
                    );
                    if( err ) {
                        Y.log( `updateResources. Error while deleting resource with _id ${item.resourceId} from calendar ${item.calendarId}. Error: ${err.stack || err}`, 'warn', NAME );
                        return handleResult( err, undefined, callback );
                    }
                }
            }
            return handleResult( null, res, callback );
        }

        Y.namespace( 'doccirrus.api' ).calendar = {

            name: NAME,

            /**
             * Override default GET action for calendar api to include audit for reading all calendars on Patient Portal
             * based on isFromPortal flag
             *
             * @param {Object} args
             * @param {Object} args.user
             * @param {Object} args.query
             * @param {Object} args.data
             * @param {Object} args.options
             * @param {Function} args.callback
             * @returns {Promise<*>}
             */
            get: async function( args ) {
                const
                    {user, query = {}, data = {}, options, callback} = args;
                let err, result;

                if( 'true' === data.isFromPortal ) {
                    await Y.doccirrus.utils.auditPPAction( user, {model: 'calendar', action: 'get', who: data.pid} );
                }

                [err, result] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        action: 'get',
                        user,
                        model: 'calendar',
                        query,
                        options
                    } )
                );
                if( err ) {
                    Y.log( `get. Error while getting calendars: ${err && err.stack || err}`, 'error', NAME );
                }
                return callback( err, result );
            },

            /**
             *
             * Refactor: Incorrectly contains the logic for the creation of repetitions and schedules,
             * should be moved into models. This code is terrible, needs refactoring urgently!
             * Also shares common code with scheduler.generateEventForNextNum()   @rw Oct '13
             *
             * @method post
             * @param {Object}          args
             */
            post: function( args ) {
                Y.log('Entering Y.doccirrus.api.calendar.post', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.calendar.post');
                }
                var
                    data = args.data,
                    user = args.user,
                    callback = args.callback;

                if( !data.consultTimes || !data.consultTimes[ 0 ] ) {
                    data.consultTimes = Y.doccirrus.schemas.calendar.getDefaultConsultTimes();
                }

                Y.log( 'Calendar Data:  / ' + JSON.stringify( data.consultTimes[ 0 ] ), 'debug', NAME );

                //  Clean of XSS and other threats before posting to database
                data = Y.doccirrus.filters.cleanDbObject( data );
                Y.doccirrus.mongodb.runDb( {
                    action: 'post',
                    user: user,
                    model: 'calendar',
                    data: data,
                    options: args.options,
                    callback: callback
                } );
            },

            /**
             * calls back with a time object
             * @param {Object}          args
             */
            'gettime': function( args ) {
                Y.log('Entering Y.doccirrus.api.calendar.gettime', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.calendar.gettime');
                }
                var
                    callback = args.callback,
                    d = new Date();
                callback( null, { time: d.getTime() } );
            },

            /**
             * Read a calendars closeTime
             * @method readCalendarCloseTime
             * @param {Object} parameters
             * @param {Object} parameters.originalParams
             * @param {String} parameters.originalParams._id
             * @param {Function} parameters.callback
             * @param {Object} parameters.user
             *
             * @return {Function}   callback
             */
            readCalendarCloseTime: function readCalendarCloseTime( parameters ) {
                Y.log('Entering Y.doccirrus.api.calendar.readCalendarCloseTime', 'info', NAME);
                if (parameters.callback) {
                    parameters.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(parameters.callback, 'Exiting Y.doccirrus.api.calendar.readCalendarCloseTime');
                }
                var
                    params = parameters.originalParams,
                    callback = parameters.callback,
                    user = parameters.user;

                if( !params._id ) {
                    return callback( new Error( 'readCalendarCloseTime: no "_id" given' ), null );
                }

                Y.doccirrus.calUtils.getEventList( user, {
                    calendar: params._id,
                    eventType: 'closeTime',
                    dateFrom: 'now',
                    duration: 'all',
                    useEnd: true,
                    callback: callback
                } );

            },

            /**
             * Read calendars overview for the admin section to edit them
             * - populates "employee" & "locationId"
             * - fetches "closeTime"
             * @method readCalendarAdminOverview
             * @param {Object} parameters
             * @param {Object} parameters.originalParams
             * @param {Function} parameters.callback
             * @param {Object} parameters.user
             */
            readCalendarAdminOverview: function readCalendarAdminOverview( parameters ) {
                Y.log('Entering Y.doccirrus.api.calendar.readCalendarAdminOverview', 'info', NAME);
                if (parameters.callback) {
                    parameters.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(parameters.callback, 'Exiting Y.doccirrus.api.calendar.readCalendarAdminOverview');
                }
                var
                    params = parameters.originalParams,
                    query = params.query || {},
                    callback = parameters.callback,
                    user = parameters.user,
                    moment = require( 'moment' ),
                    async = require( 'async' );

                Y.doccirrus.mongodb.runDb(
                    {
                        user: user,
                        model: 'calendar',
                        action: 'get',
                        query: query,
                        options: {
                            sort: { _id: 1 }
                        }
                    },
                    function calendar_runDb( error, result ) {
                        if( error ) {
                            return callback( error );
                        }

                        // get models for populate
                        async.parallel(
                            {
                                location: function location_parallel( locationCallback ) {
                                    Y.doccirrus.mongodb.getModelReadOnly( user, 'location', locationCallback );
                                },
                                employee: function employee_parallel( employeeCallback ) {
                                    Y.doccirrus.mongodb.getModelReadOnly( user, 'employee', employeeCallback );
                                }
                            },
                            function getModels_done( error, model ) {
                                if( error ) {
                                    return callback( error );
                                }
                                // populate
                                async.each( result,
                                    function populate_each( calendar, calendarCallback ) {

                                        async.parallel( {
                                            // populate location
                                            location: function location_populate( locationCallback ) {
                                                if( calendar.locationId ) {
                                                    model.location.mongoose.populate( calendar, [
                                                        {
                                                            path: 'locationId',
                                                            select: 'locname',
                                                            model: 'location'
                                                        }
                                                    ], locationCallback );
                                                }
                                                else {
                                                    locationCallback( null );
                                                }
                                            },
                                            // populate employee
                                            employee: function employee_populate( employeeCallback ) {
                                                if( calendar.employee ) {
                                                    model.employee.mongoose.populate( calendar, [
                                                        {
                                                            path: 'employee',
                                                            select: 'title nameaffix fk3120 lastname firstname',
                                                            model: 'employee'
                                                        }
                                                    ], employeeCallback );
                                                }
                                                else {
                                                    employeeCallback( null );
                                                }
                                            }
                                        }, calendarCallback );

                                    },
                                    function populate_each_done( error ) {
                                        if( error ) {
                                            return callback( error );
                                        }

                                        // finally fetch "closeTime"

                                        result = result.map( function calendar_runDb_result_map( calendar ) {
                                            return calendar.toObject ? calendar.toObject() : calendar;
                                        } );

                                        async.each( result,
                                            function getEventList_each( calendar, calendarCallback ) {

                                                if( 'INFORMAL' === calendar.type ) {
                                                    calendarCallback( null );
                                                }
                                                else {
                                                    Y.doccirrus.calUtils.getEventList( user, {
                                                        calendar: calendar._id,
                                                        eventType: 'closeTime',
                                                        dateFrom: 'now',
                                                        duration: 'all',
                                                        useEnd: true,
                                                        callback: function getEventList_each_callback( error, closeTimeResults ) {
                                                            if( !error ) {
                                                                calendar.closeTime = closeTimeResults;
                                                            }
                                                            calendarCallback( error );
                                                        }
                                                    } );
                                                }

                                            },
                                            function getEventList_each_done( error ) {
                                                if( error ) {
                                                    return callback( error );
                                                }
                                                async.each( result,
                                                    function ( calendar, innerDone ) {

                                                        if( 'INFORMAL' === calendar.type ) {
                                                            innerDone( null );
                                                        }
                                                        else {
                                                            Y.doccirrus.api.calevent
                                                                .getConsultTimes( { user: user, originalParams: {
                                                                    calendar: calendar._id,
                                                                    dateFrom: moment().toISOString(),
                                                                    duration: 'month',
                                                                    specificOnly: true,
                                                                    consult: true
                                                                }, callback: function( error, specificConsultList ) {
                                                                    if( !error ) {
                                                                        calendar.specificConsultList = specificConsultList;
                                                                    }
                                                                    innerDone( error );
                                                                } } );
                                                        }

                                                    },
                                                    function ( error ) {
                                                        callback( error, result );
                                                    }
                                                );
                                            }
                                        );

                                    }
                                );
                            }
                        );

                    }
                );

            },

            /**
             * Checks whether a calendar could accept an scheduletype
             * - a calendar accepts an scheduletype if present in this scheduletype calendarRefs
             * - an info calendar accepts scheduletype if unset
             * @param {Object} parameters
             * @param {Object} parameters.originalParams
             * @param {String} parameters.originalParams.calendarId
             * @param {String} parameters.originalParams.
             *
             * @return {Function} callback
             */
            doesCalendarAcceptScheduletypeId: function( parameters ) {
                Y.log('Entering Y.doccirrus.api.calendar.doesCalendarAcceptScheduletypeId', 'info', NAME);
                if (parameters.callback) {
                    parameters.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(parameters.callback, 'Exiting Y.doccirrus.api.calendar.doesCalendarAcceptScheduletypeId');
                }
                var
                    params = parameters.originalParams,
                    callback = parameters.callback,
                    user = parameters.user,
                    calendarId = params.calendarId,
                    scheduletypeId = params.scheduletypeId,
                    reasons = Y.doccirrus.schemas.calendar.doesCalendarAcceptScheduletypeId;

                if( !calendarId ) {
                    return callback( Y.doccirrus.errors.rest( 400, 'calendarId required' ) );
                }

                if( !Y.doccirrus.schemas.calendar.isDoctorCalendar( calendarId ) ) {
                    return callback( null, {
                        accepts: !scheduletypeId,
                        reason: !scheduletypeId ? reasons.EMPTY_FOR_INFO : reasons.NOT_EMPTY_FOR_INFO
                    } );
                }

                if( !scheduletypeId ) {
                    return callback( null, {
                        accepts: false,
                        reason: reasons.REQUIRED_FOR_CALENDAR
                    } );
                }

                Y.doccirrus.api.scheduletype.readScheduletypesForCalendarId( {
                    user: user,
                    originalParams: { calendarId: calendarId },
                    callback: function( error, results ) {
                        var
                            accepts;

                        if( error ) {
                            return callback( error, results );
                        }

                        accepts = Boolean( Y.Array.find( results, function( result ) {
                            return String( result._id ) === String( scheduletypeId );
                        } ) );

                        callback( error, {
                            accepts: accepts,
                            reason: accepts ? reasons.MATCH_FOR_CALENDAR : reasons.NO_MATCH_FOR_CALENDAR
                        } );
                    }
                } );
            },

            getSharedCalendars( args ){
                Y.log('Entering Y.doccirrus.api.calendar.getSharedCalendars', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.calendar.getSharedCalendars');
                }
                getSharedCalendars( args );
            },

            getPartnersSharedCalendars( args ){
                Y.log('Entering Y.doccirrus.api.calendar.getPartnersSharedCalendars', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.calendar.getPartnersSharedCalendars');
                }
                getPartnersSharedCalendars( args );
            },
            getCalendarDataForPartner( args ){
                Y.log('Entering Y.doccirrus.api.calendar.getCalendarDataForPartner', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.calendar.getCalendarDataForPartner');
                }
                getCalendarDataForPartner( args );
            },
            createPartnerCalendar( args ){
                Y.log('Entering Y.doccirrus.api.calendar.createPartnerCalendar', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.calendar.createPartnerCalendar');
                }
                createPartnerCalendar( args );
            },
            deletePartnerCalendar( args ){
                Y.log('Entering Y.doccirrus.api.calendar.deletePartnerCalendar', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.calendar.deletePartnerCalendar');
                }
                deletePartnerCalendar( args );
            },
            importCloseTime( args ){
                Y.log('Entering Y.doccirrus.api.calendar.importCloseTime', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.calendar.importCloseTime');
                }
                importCloseTime( args );
            },
            getAllCalGroups( args ){
                Y.log('Entering Y.doccirrus.api.calendar.getAllCalGroups', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.calendar.getAllCalGroups');
                }
                getAllCalGroups( args );
            },
            updateResources( args ){
                Y.log('Entering Y.doccirrus.api.calendar.updateResources', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.calendar.updateResources');
                }
                return updateResources( args );
            },
            getPopulatedCalendar

        };

    },
    '0.0.1', {
        requires: [
            'calendar-schema',
            'dccalutils',
            'scheduletype-api'
        ]
    }
);
