/**
 * User: pi
 * Date: 13/03/17  12:15
 * (c) 2017, Doc Cirrus GmbH, Berlin
 */

/*global YUI */

YUI.add( 'mirrorcalendar-api', function( Y, NAME ) {

    const
        {formatPromiseResult, handleResult} = require( 'dc-core' ).utils;

        function updateCalendars( args ) {
            let
                { user, data: { calendars = [] } = {}, callback } = args,
                async = require( 'async' );

            function processCalendar( calendar, done ) {
                if( calendar._id ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'mirrorcalendar',
                        action: 'put',
                        query: {
                            _id: calendar._id
                        },
                        fields: [ 'color', 'active' ],
                        data: Y.doccirrus.filters.cleanDbObject( calendar )
                    }, done );
                } else {
                    let
                        postData = Y.doccirrus.filters.cleanDbObject( calendar );
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'mirrorcalendar',
                        action: 'post',
                        data: postData
                    }, done );
                }
            }

            async.eachSeries( calendars, processCalendar, callback );
        }

        /**
         * Return full data about a partner calendar (entire calendar document)
         * @method getFullPartnerCalendarData
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {String} args.data.dcCustomerNo
         * @param {String} args.data.calendarId partner calendar _id
         * @param {Function} args.callback
         *
         * @return {Function} callback
         */
        function getFullPartnerCalendarData( args ) {
            let
                { user, data: { dcCustomerNo, calendarId } = {}, callback } = args;
            if( !dcCustomerNo || !calendarId ) {
                Y.log( `syncPartnerCalendar. calendarId: ${calendarId} or dcCustomerNo: ${dcCustomerNo} is missing`, 'error', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Invalid params.' } ) );
            }
            Y.doccirrus.communication.callExternalApiByCustomerNo( {
                api: 'calendar.getCalendarDataForPartner',
                dcCustomerNo: dcCustomerNo,
                user: user,
                data: {
                    calendarId: calendarId
                },
                callback: ( err, result ) => {
                    if( err ) {
                        Y.log( `getCalendarDataForPartner in getFullPartnerCalendarData failed, error: ${err && err.stack || err}`, 'error', NAME );
                        return callback( err );
                    }
                    return callback( null, result );
                }
            } );
        }

        function getById( args ) {
            let
                { user, query: { _id } = {}, callback } = args;
            if( !_id ) {
                Y.log( `getDcCustomerNoByCalendarId. _id is missing`, 'error', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Invalid params' } ) );
            }

            Y.doccirrus.mongodb.runDb( {
                user,
                model: 'mirrorcalendar',
                query: {
                    _id: _id
                },
                action: 'get',
                options: {
                    lean: true,
                    limit: 1
                }
            }, ( err, results ) => {
                if( err ) {
                    return callback( err );
                }
                if( !results.length ) {
                    Y.log( `calculatePartnerSchedule. Mirror calendar not found, _id: ${_id}`, 'error', NAME );
                    return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'mirror calendar not found.' } ) );
                }
                callback( null, results[ 0 ] );
            } );
        }

        /**
         * Receive request from partner with master calendar data to update it on this side
         * - it updates mirrorcalendar with 'originalId' === data._id
         * - then, in mirrorcalendar post-process, actual calendar is updated
         *
         * @param args.user {Object}
         * @param {{
         *          _id: <ObjectId>,
         *          name: <String>,
         *          color: <String>
         *        }} args.data
         * @param args.callback {Function}
         * @returns {Promise.<*>}
         */
        async function updateMirrorCalendarFromMaster( args ) {
            const
                { user, data = {}, callback } = args;

            let err, result;

            if( !data || !data._id )  {
                Y.log( `updateMirrorCalendarFromMaster. calendarId is missing`, 'error', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Invalid params.' } ) );
            }

            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'mirrorcalendar',
                    action: 'put',
                    context: {
                        updateCalendar: true
                    },
                    query: {
                        originalId: data._id
                    },
                    fields: [ 'color', 'name' ],
                    data: Y.doccirrus.filters.cleanDbObject( data )
                } )
            );

            if( err ) {
                Y.log( `updateMirrorCalendarFromMaster. Error while updating mirrorcalendar with originalId: ${data._id} : ${err.stack || err}`, 'error', NAME );
                return handleResult( err, undefined, callback );
            }

            return handleResult( null, result, callback );
        }

        Y.namespace( 'doccirrus.api' ).mirrorcalendar = {

            name: NAME,

            updateCalendars( args ){
                Y.log('Entering Y.doccirrus.api.mirrorcalendar.updateCalendars', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.mirrorcalendar.updateCalendars');
                }
                updateCalendars( args );
            },
            getFullPartnerCalendarData( args ){
                Y.log('Entering Y.doccirrus.api.mirrorcalendar.getFullPartnerCalendarData', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.mirrorcalendar.getFullPartnerCalendarData');
                }
                getFullPartnerCalendarData( args );
            },
            getById( args ){
                Y.log('Entering Y.doccirrus.api.mirrorcalendar.getById', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.mirrorcalendar.getById');
                }
                getById( args );
            },
            updateMirrorCalendarFromMaster( args ){
                Y.log('Entering Y.doccirrus.api.mirrorcalendar.updateMirrorCalendarFromMaster', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.mirrorcalendar.updateMirrorCalendarFromMaster');
                }
                updateMirrorCalendarFromMaster( args );
            }

        };

    },
    '0.0.1', {
        requires: []
    }
);
