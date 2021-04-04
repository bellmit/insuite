/**
 * User: pi
 * Date: 13/03/17  12:15
 * (c) 2017, Doc Cirrus GmbH, Berlin
 */

/*global YUI */

YUI.add( 'mirrorscheduletype-api', function( Y, NAME ) {

        const
            {formatPromiseResult, handleResult} = require( 'dc-core' ).utils;

        /**
         * Upsert all MAPPED* partner schedule types for calendar (selected by "partnerCalendarId").
         * Mapped* means "calendarId" === "partnerCalendarId" of "calendarRefs" are replaced with "mirrorCalendarId"
         * @method syncPartnerScheduleTypes
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {String} args.data.dcCustomerNo partner dcCustomerNo
         * @param {String} args.data.partnerCalendarId calendar _id from partner system
         * @param {String} args.data.mirrorCalendarId mirrorCalendar doc _id
         * @param {Function} args.callback
         *
         * @return {Function}
         */
        function syncPartnerScheduleTypes( args ) {
            let
                { user, data:{ dcCustomerNo, partnerCalendarId, mirrorCalendarId } = {}, callback } = args,
                async = require( 'async' );
            if( !dcCustomerNo || !mirrorCalendarId || !partnerCalendarId ) {
                Y.log( `syncPartnerScheduleTypes. dcCustomerNo: ${dcCustomerNo}, partnerCalendarId: ${partnerCalendarId} or mirrorCalendarId: ${mirrorCalendarId} is missing`, 'error', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Invalid params.' } ) );
            }
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.communication.callExternalApiByCustomerNo( {
                        api: 'scheduletype.getScheduleTypeForPartner',
                        dcCustomerNo: dcCustomerNo,
                        data: {
                            calendarId: partnerCalendarId
                        },
                        user: user,
                        callback: ( err, result ) => {
                            if( err ) {
                                Y.log( `getScheduleTypeForPartner in syncPartnerScheduleTypes failed, error: ${err && err.stack || err}`, 'error', NAME );
                                return next( err );
                            }
                            return next( null, result );
                        }
                    } );
                },
                function( scheduleTypes, next ) {
                    scheduleTypes = scheduleTypes.map( scheduleType => {
                        scheduleType.originalId = scheduleType._id;
                        scheduleType.prcCustomerNo = dcCustomerNo;
                        scheduleType.calendarRefs = scheduleType.calendarRefs && scheduleType.calendarRefs.filter( calendarRef => {
                                return calendarRef.calendarId === partnerCalendarId;
                            } )
                                .map( calendarRef => {
                                    calendarRef.calendarId = mirrorCalendarId;
                                    return calendarRef;
                                } ) || [];
                        delete scheduleType._id;
                        scheduleType.type = 'STANDARD';
                        return scheduleType;
                    } );
                    async.eachSeries( scheduleTypes, ( scheduleType, done ) => {
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'mirrorscheduletype',
                            action: 'upsert',
                            query: {
                                originalId: scheduleType.originalId,
                                prcCustomerNo: scheduleType.prcCustomerNo
                            },
                            data: Y.doccirrus.filters.cleanDbObject( scheduleType )
                        }, done );
                    }, next );
                }
            ], callback );
        }

        /**
         * Returns mapped "mirrorscheduletype" docs (mirrorCalendarId => calendar doc _id).
         * @method getScheduleTypesForCalendar
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} [args.data]
         * @param {Boolean} [args.data.includeScheduletype] if set - includes "scheduletype" docs.
         * @param {Object} args.query
         * @param {Function} args.callback
         */
        function getScheduleTypesForCalendar( args ) {
            let
                { user, query, data: { includeScheduletype } = {}, callback } = args,
                async = require( 'async' );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'calendar',
                        action: 'get',
                        query: {
                            mirrorCalendarId: { $exists: true }
                        },
                        options: {
                            select: {
                                mirrorCalendarId: 1
                            }
                        },
                        callback( err, results ){
                            let
                                calendarMap = new Map();
                            if( err ) {
                                return next( err );
                            }
                            results.forEach( calendar => {
                                calendarMap.set( calendar.mirrorCalendarId.toString(), calendar._id.toString() );
                            } );
                            next( null, calendarMap );
                        }
                    } );

                },
                function( calendarMap, next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'mirrorscheduletype',
                        action: 'get',
                        query,
                        callback( err, results ){
                            if( err ) {
                                return next( err );
                            }
                            results.forEach( scheduleType => {
                                scheduleType.calendarRefs = scheduleType.calendarRefs.map( calendarRef => {
                                    if( calendarMap.has( calendarRef.calendarId ) ) {
                                        calendarRef.calendarId = calendarMap.get( calendarRef.calendarId );
                                    }
                                    return calendarRef;
                                } );
                            } );
                            next( null, results );
                        }
                    } );

                },
                function( mirrorScheduleTypes, next ) {
                    if( includeScheduletype ) {
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'scheduletype',
                            action: 'get',
                            query,
                            callback( err, results ){
                                if( err ) {
                                    return next( err );
                                }
                                mirrorScheduleTypes.push( ...results );
                                next( null, mirrorScheduleTypes );
                            }
                        } );
                    } else {
                        setImmediate( next, null, mirrorScheduleTypes );
                    }
                }
            ], callback );
        }

        /**
         * Receive request from partner with scheduletype to update it on this side
         * - checks if here is some calendar which is in calendarRefs of received scheduletype
         * - upsert mirrorscheduletype with 'originalId' === data._id
         *
         * @param args.user {Object}
         * @param {{
         *          _id: <ObjectId>,
         *          type: <String>,
         *          name: <String>,
         *          color: <String>,
         *          isPreconfigured: <Boolean>,
         *          isPublic: <Boolean>,
         *          calendarRefs: [Object],
         *          durationUnit: <String>,
         *          duration: <Number>,
         *          capacity: <Number>
         *          numberOfSuggestedAppointments: <Number>
         *        }} args.data
         * @param args.callback {Function}
         * @returns {Promise.<*>}
         */
        async function updateMirrorScheduleTypeFromMaster( args ) {
            const
                { user, data = {}, callback } = args;

            let err, mirrorcalendars, originalId;

            if( !data || !data._id )  {
                Y.log( `updateMirrorScheduleTypeFromMaster. scheduletype is missing`, 'error', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Invalid params.' } ) );
            }

            originalId = data._id;

            [err, mirrorcalendars] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'mirrorcalendar',
                    action: 'get',
                    query: {
                        originalId: { $in: data.calendarRefs.map( item => { return item.calendarId; } ) }
                    },
                    options: {
                        select: {
                            _id: 1,
                            prcCustomerNo: 1
                        }
                    }
                } )
            );

            if( err ) {
                return handleResult( err, undefined, callback );
            }

            // we should update/create this schedule type because it's used by already registered partner calendar
            if( mirrorcalendars && mirrorcalendars[0] ) {

                data.calendarRefs = [...mirrorcalendars.map( item => { return { calendarId: item._id };} )];
                delete data._id;
                data.type = 'STANDARD';
                data.prcCustomerNo = mirrorcalendars[0].prcCustomerNo;

                [err] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'upsert',
                        model: 'mirrorscheduletype',
                        query: {
                            originalId: originalId
                        },
                        fields: Object.keys( data ),
                        data: Y.doccirrus.filters.cleanDbObject( data )
                    } )
                );

                if( err ) {
                    return handleResult( err, undefined, callback );
                }
            } else {
                /*there are no matches between mirrorcalendars and calendarRefs from this scheduletype; could be because:
                     1. this scheduletype doesn't have shared calendar
                     2. shared calendar was deleted from this scheduletype
                so we try to clean up this scheduletype anyway*/

                [err] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'delete',
                        model: 'mirrorscheduletype',
                        query: {
                            originalId: originalId
                        }
                    } )
                );

                if( err ) {
                    Y.log( `updateMirrorScheduleTypeFromMaster. Error while deleting mirrorscheduletype with originalId: ${originalId} : ${err.stack || err}`, 'error', NAME );
                    return handleResult( err, undefined, callback );
                }
            }
            return handleResult( null, {}, callback );
        }

        Y.namespace( 'doccirrus.api' ).mirrorscheduletype = {

            name: NAME,

            syncPartnerScheduleTypes( args ){
                Y.log('Entering Y.doccirrus.api.mirrorscheduletype.syncPartnerScheduleTypes', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.mirrorscheduletype.syncPartnerScheduleTypes');
                }
                syncPartnerScheduleTypes( args );
            },
            getScheduleTypesForCalendar( args ){
                Y.log('Entering Y.doccirrus.api.mirrorscheduletype.getScheduleTypesForCalendar', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.mirrorscheduletype.getScheduleTypesForCalendar');
                }
                getScheduleTypesForCalendar( args );
            },
            updateMirrorScheduleTypeFromMaster( args ){
                Y.log('Entering Y.doccirrus.api.mirrorscheduletype.updateMirrorScheduleTypeFromMaster', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.mirrorscheduletype.updateMirrorScheduleTypeFromMaster');
                }
                updateMirrorScheduleTypeFromMaster( args );
            }
        };

    },
    '0.0.1', {
        requires: []
    }
);
