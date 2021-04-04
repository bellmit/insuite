/*global YUI */

YUI.add( 'room-api', function( Y, NAME ) {
        const
            {formatPromiseResult, handleResult} = require( 'dc-core' ).utils,
            moment = require( 'moment' );
        /**
         * updates rooms order
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Function} args.callback
         */
        async function updateRooms( args ) {
            Y.log('Entering Y.doccirrus.api.room.updateRooms', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.room.updateRooms');
            }
            const
                { user, callback, data = {} } = args;

            let room;
            for( room of data.rooms ) {
                let data = Y.doccirrus.filters.cleanDbObject( room );
                let [err] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        action: 'put',
                        user,
                        model: 'room',
                        migrate: true,
                        query: {_id: room._id},
                        data,
                        fields: ['order']
                    } )
                );
                if( err ){
                    Y.log( `updateRooms: Error on updating data: ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }
            }
            callback( null );
        }

        /**
         * Gets all rooms for some query and also counts all schedules in each room for today
         * As result return array of available rooms with number of schedules in each of them
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Function} args.callback
         * @returns {Promise<Object|*|*>}
         */
        async function getRoomsWithCountedSchedules( args ) {
            Y.log( 'Entering Y.doccirrus.api.room.getRoomsWithCountedSchedules', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.room.getRoomsWithCountedSchedules' );
            }
            const {user, query = {}, callback} = args;
            let err, rooms, amountOfSchedulesInRoom, availableRooms = [];

            [err, rooms] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'get',
                    model: 'room',
                    query
                } )
            );

            if( err ) {
                Y.log( `getRoomsWithCountedSchedules. Error while getting rooms: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }
            for( let room of rooms ) {
                // count all schedules in this room for today
                [err, amountOfSchedulesInRoom] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'count',
                        model: 'schedule',
                        query: {
                            roomId: room._id,
                            $and: [{start: {$gt: moment().startOf( 'd' )}}, {end: {$lt: moment().endOf( 'd' )}}]
                        }
                    } )
                );
                if( err ) {
                    Y.log( `getRoomsWithCountedSchedules. Error when counting appointments in room ${room._id}: ${err.stack || err}`, 'warn', NAME );
                    return callback( err );
                }

                //check if this room still have place for appointment
                if( (room.numberOfPatients && amountOfSchedulesInRoom < room.numberOfPatients) || !room.numberOfPatients ) {
                    // add this room as suggested for new appointment
                    availableRooms.push( {...room, nextOrderNumberInRoom: amountOfSchedulesInRoom} );
                }
            }
            return handleResult( null, availableRooms, callback );
        }
        Y.namespace( 'doccirrus.api' ).room = {
            name: NAME,
            post: function( args ) {
                Y.log('Entering Y.doccirrus.api.room.post', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.room.post');
                }
                let
                    { data, user, callback, options } = args;
                data = Y.doccirrus.filters.cleanDbObject( data );
                Y.doccirrus.mongodb.runDb( {
                    action: 'post',
                    user,
                    model: 'room',
                    data,
                    options,
                    callback
                } );
            },
            updateRooms,
            getRoomsWithCountedSchedules
        };

    },
    '0.0.1', {
        requires: [
            'room-schema',
            'dccalutils'
        ]
    }
);
