/**
 * User: pi
 * Date: 13/03/2017  16:15
 * (c) 2017, Doc Cirrus GmbH, Berlin
 */
/*global YUI */

YUI.add( 'mirrorcalendar-process', function( Y, NAME ) {

        const
            {formatPromiseResult} = require( 'dc-core' ).utils;

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        function checkActiveStatus( user, mirrorcalendar, callback ) {
            if( mirrorcalendar.activeWasModified ) {
                if( mirrorcalendar.active ) {
                    let
                        mirrorCalendarData = mirrorcalendar.toObject ? mirrorcalendar.toObject() : mirrorcalendar;
                    Y.doccirrus.api.calendar.createPartnerCalendar( {
                        user,
                        data: {
                            mirrorCalendarData: mirrorCalendarData
                        },
                        callback( err ){
                            callback( err, mirrorcalendar );
                        }
                    } );
                } else {
                    Y.doccirrus.api.calendar.deletePartnerCalendar( {
                        user,
                        data: {
                            dcCustomerNo: mirrorcalendar.prcCustomerNo,
                            mirrorCalendarId: mirrorcalendar._id
                        },
                        callback( err ){
                            callback( err, mirrorcalendar );
                        }
                    } );
                }

            } else {
                return setImmediate( callback, null, mirrorcalendar );
            }
        }

        function setIsModified( user, mirrorcalendar, callback ) {
            mirrorcalendar.wasNew = mirrorcalendar.isNew;
            mirrorcalendar.activeWasModified = mirrorcalendar.isModified( 'active' );
            callback( null, mirrorcalendar );
        }

        function syncPartnerCalendar( user, mirrorcalendar, callback ) {
            if( mirrorcalendar.activeWasModified ) {
                if( mirrorcalendar.active ) {
                    return Y.doccirrus.api.mirrorcalendar.getFullPartnerCalendarData( {
                        user,
                        data: {
                            calendarId: mirrorcalendar.originalId,
                            dcCustomerNo: mirrorcalendar.prcCustomerNo,
                            mirrorCalendarId: mirrorcalendar._id
                        },
                        callback( err, data ){
                            let
                                fields = [ 'name', 'type', 'isPublic', 'employee', 'locationId', 'consultTimes', 'isShared' ];
                            if( err ) {
                                return callback( err );
                            }
                            mirrorcalendar._syncScheduleTypes = true;
                            fields.forEach( key => {
                                mirrorcalendar[ key ] = data[ key ];
                            } );
                            callback( err, mirrorcalendar );
                        }
                    } );
                }
            }
            setImmediate( callback, null, mirrorcalendar );
        }

        function syncScheduleTypes( user, mirrorcalendar, callback ) {
            if( mirrorcalendar._syncScheduleTypes ) {
                Y.doccirrus.api.mirrorscheduletype.syncPartnerScheduleTypes( {
                    user,
                    data: {
                        partnerCalendarId: mirrorcalendar.originalId.toString(),
                        mirrorCalendarId: mirrorcalendar._id,
                        dcCustomerNo: mirrorcalendar.prcCustomerNo
                    },
                    callback( err ){
                        callback( err, mirrorcalendar );
                    }
                } );
            } else {
                return setImmediate( callback, null, mirrorcalendar );
            }
        }

        /**
         * Update agent's calendar with master data received from partner and already stored in mirrorcalendar
         *
         * @param user {Object}
         * @param {{
         *          _id: <ObjectId>,
         *          name: <String>,
         *          color: <String>
         *        }} mirrorcalendar: Object with data from master calendar
         * @param callback {Function}
         * @returns {Promise.<*>}
         */
        async function syncCalendarWithMaster( user, mirrorcalendar, callback ) {
            if( this && this.context && this.context.updateCalendar ) {
                let [err] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'update',
                        model: 'calendar',
                        query: { mirrorCalendarId: mirrorcalendar._id },
                        data: { $set: {
                            color: mirrorcalendar.color,
                            name: mirrorcalendar.name
                        } }
                    })
                );
                if( err ) {
                    Y.log( `syncCalendarWithMaster. Error while updating calendar with mirrorCalendarId: ${mirrorcalendar._id} : ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }
            }
            return callback( null, mirrorcalendar );
        }

        /**
         * Class Event Processes --
         *
         * v.0. presents an array of pre process functions &
         *      an array of post-process functions.
         */
        Y.namespace( 'doccirrus.schemaprocess' )[ NAME ] = {

            pre: [
                {
                    run: [
                        setIsModified,
                        syncPartnerCalendar,
                        checkActiveStatus
                    ], forAction: 'write'
                }
            ],

            post: [
                {
                    run: [
                        syncScheduleTypes,
                        syncCalendarWithMaster
                    ],
                    forAction: 'write'
                }
            ],

            name: NAME
        };

    },
    '0.0.1', { requires: [] }
);
