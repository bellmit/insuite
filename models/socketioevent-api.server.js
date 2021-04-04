/**
 * User: pi
 * Date: 18/02/2015  12:05
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'socketioevent-api', function( Y, NAME ) {

        /**
         * @module activitysequence-api
         */

        /**
         * Saves event for each user
         * @method saveBroadcastEvent
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {String} args.query.event event
         * @param {String} args.query.eventType event type
         * @param {Object} args.query.message message object
         * @param {String} args.query.messageId message id
         * @param {String} args.query.namespace event namespace
         * @param {Function} args.callback
         * @for doccirrus.api.socketioevent
         */

        function saveBroadcastEvent( args ) {
            var queryParams = args.query || {},
                data = args.data || {},
                async = require( 'async' );

            function saveEvent( identity, done ) {
                Y.doccirrus.api.socketioevent.post( {
                    user: args.user,
                    data: {
                        event: data.event,
                        eventType: data.eventType,
                        message: data.message,
                        targetId: identity._id.toString(),
                        messageId: data.messageId,
                        timestamp: data.timestamp,
                        label: data.label
                    },
                    callback: done
                } );
            }

            async.waterfall( [
                function( next ) {
                    var query = {};
                    if( 'admin' === queryParams.namespace ) {
                        query[ 'memberOf.group' ] = Y.doccirrus.schemas.identity.userGroups.ADMIN;
                    }
                    Y.doccirrus.mongodb.runDb( {
                        user: args.user,
                        model: 'identity',
                        action: 'get',
                        query: query,
                        options: {
                            select: {
                                _id: 1
                            }
                        }
                    }, next );
                },
                function( identities, next ) {
                    if( identities && identities.length ) {
                        async.each( identities, saveEvent, next );
                    } else {
                        Y.log( 'SocketIO event can not be saved. DB for tenant: ' + args.user.tenantId + ', does not have (specified) identities', 'info', NAME );
                        next();
                    }
                }
            ], args.callback );

        }

        /**
         * @method post
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Object} [args.data.label] is used to prevent duplication of the same message type.
         *  Will remove all events for unique combination label + targetId + eventType + event
         * @param {Object} args.options
         * @param {Function} args.callback
         */
        function post( args ) {
            var data = args.data || {},
                async = require( 'async' );
            async.series( [
                function( next ) {
                    if( data.label ) {
                        Y.doccirrus.mongodb.runDb( {
                            action: 'delete',
                            model: 'socketioevent',
                            user: args.user,
                            query: {
                                label: data.label,
                                targetId: data.targetId,
                                eventType: data.eventType,
                                event: data.event
                            },
                            options: {
                                override: true
                            }
                        }, next );
                    } else {
                        next();
                    }
                },
                function( next ) {
                    args.data = Y.doccirrus.filters.cleanDbObject( args.data );
                    Y.doccirrus.mongodb.runDb( {
                        action: 'post',
                        model: 'socketioevent',
                        user: args.user,
                        data: args.data,
                        options: args.options
                    }, next );
                }
            ], args.callback );

        }

        /**
         * @method getEventsForUser
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Object} [args.query.userId] target user id. Id of caller is set by default
         * @param {Function} args.callback
         * @for doccirrus.api.socketioevent
         */
        function getEventsForUser( args ) {
            var queryParams = args.query || {};
            Y.doccirrus.mongodb.runDb( {
                action: 'get',
                model: 'socketioevent',
                user: args.user,
                query: {
                    targetId: queryParams.userId || args.user.identityId
                }
            }, args.callback );
        }

        /**
         * Removes event with specified message id for current user(caller)
         * @method getEventsForUser
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query.messageId id of message to remove
         * @param {Function} args.callback
         * @for doccirrus.api.socketioevent
         */
        function deleteEventByMessageId( args ) {
            var queryParams = args.query || {};
            if( !queryParams.messageId ) {
                args.callback( Y.doccirrus.errors.rest( 400, 'Invalid deleteEventByMessageId query' ) );
                return;
            }
            Y.doccirrus.mongodb.runDb( {
                action: 'delete',
                user: args.user,
                model: 'socketioevent',
                query: {
                    $or: [
                        {
                            targetId: args.user.identityId,
                            messageId: queryParams.messageId
                        },
                        {
                            'message.taskId': queryParams.messageId
                        }
                    ]
                },
                options: {
                    override: true
                }
            }, args.callback );
        }

        /**
         * @method saveExternalApiCallEvent
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Function} args.callback
         */
        function saveExternalApiCallEvent( args ) {
            let
                { user, data = {}, callback } = args;
            data = Object.assign( {}, data, { label: Y.doccirrus.schemas.socketioevent.labels.EXTERNAL_API_CALL } );
            Y.doccirrus.mongodb.runDb( {
                user,
                model: 'socketioevent',
                action: 'post',
                data,
                options: {
                    pureLog: true
                }
            }, callback );
        }

        /**
         * @method savePUCActionCallEvent
         * @param {Object} args
         * @param {Object} [args.user] default is local SU
         * @param {Object} args.data
         * @param {Function} args.callback
         */
        function savePUCActionCallEvent( args ) {
            Y.log('Entering Y.doccirrus.api.socketioevent.savePUCActionCallEvent', 'info', NAME);
            if (args.callback) {
                args.callback = require('../server/utils/logWrapping.js')(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.socketioevent.savePUCActionCallEvent');
            }
            let
                { user = Y.doccirrus.auth.getSUForLocal(), data = {}, callback } = args;
            data = Object.assign( { skipcheck_: true }, data, { label: Y.doccirrus.schemas.socketioevent.labels.PUC_ACTION_CALL } );
            Y.doccirrus.mongodb.runDb( {
                user,
                model: 'socketioevent',
                action: 'post',
                data,
                options: {
                    pureLog: true
                }
            }, callback );
        }

        /**
         * @method getPUCActionCallEvent
         * @param {Object} args
         * @param {Object} [args.user] default is local SU
         * @param {Object} args.query
         * @param {Function} args.callback
         */
        function getPUCActionCallEvent( args ){
            Y.log('Entering Y.doccirrus.api.socketioevent.getPUCActionCallEvent', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.socketioevent.getPUCActionCallEvent');
            }
            let
                { user = Y.doccirrus.auth.getSUForLocal(), query = {}, callback } = args;
            query = Object.assign( { label: Y.doccirrus.schemas.socketioevent.labels.PUC_ACTION_CALL }, query );
            Y.doccirrus.mongodb.runDb( {
                user,
                model: 'socketioevent',
                action: 'get',
                query
            }, callback );
        }

        /**
         * @method deletePUCActionCallEvent
         * @param {Object} args
         * @param {Object} [args.user] default is local SU
         * @param {Object} args.query
         * @param {Function} args.callback
         */
        function deletePUCActionCallEvent( args ){
            Y.log('Entering Y.doccirrus.api.socketioevent.deletePUCActionCallEvent', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.socketioevent.deletePUCActionCallEvent');
            }
            let
                { user = Y.doccirrus.auth.getSUForLocal(), query = {}, callback } = args;
            query = Object.assign( { label: Y.doccirrus.schemas.socketioevent.labels.PUC_ACTION_CALL }, query );
            Y.doccirrus.mongodb.runDb( {
                user,
                model: 'socketioevent',
                action: 'delete',
                query
            }, callback );
        }

        /**
         * @method getExternalApiCallEvent
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Object} args.options
         * @param {Object} [args.query.targetId] target dcCustomerNo query. Either targetId or targetType query should be set.
         * @param {Object} [args.query.targetType] target systemType query. Either targetId or targetType query should be set.
         * @param {Function} args.callback
         */
        function getExternalApiCallEvent( args ) {
            let
                { user, query = {}, options = {}, callback } = args;
            query = Object.assign( {}, query, { label: Y.doccirrus.schemas.socketioevent.labels.EXTERNAL_API_CALL } );
            Y.doccirrus.mongodb.runDb( {
                user,
                model: 'socketioevent',
                action: 'get',
                query,
                options: { ...options, sort: { timestamp: 1 } }
            }, callback );
        }

        /**
         * @method deleteEvent
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Object} [args.options]
         * @param {Function} args.callback
         */
        function deleteEvent( args ) {
            Y.doccirrus.mongodb.runDb( {
                action: 'delete',
                model: 'socketioevent',
                user: args.user,
                query: args.query,
                options: args.options
            }, args.callback );
        }

        /**
         * @method deleteExternalApiCallEvent
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Object} [args.options]
         * @param {Function} args.callback
         */
        function deleteExternalApiCallEvent( args ) {
            let
                { user, query = {}, options, callback } = args,
                i18n = Y.doccirrus.i18n;
            const
                async = require( 'async' );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.api.socketioevent.getExternalApiCallEvent( {
                        user,
                        query: Object.assign( {}, query, {
                            'message.api': 'transfer.receive',
                            'message.options.transferLogId': { $exists: true }
                        } ),
                        callback: next
                    } );
                },
                function( socketEvents, next ) {
                    async.eachSeries( socketEvents, ( event, done ) => {
                        async.waterfall( [
                            function( next ) {
                                Y.doccirrus.mongodb.runDb( {
                                    user,
                                    model: 'partner',
                                    action: 'get',
                                    query: {
                                        dcId: event.targetId
                                    }
                                }, ( err, results ) => {
                                    if( err ) {
                                        return next( err );
                                    }
                                    next( err, results[ 0 ] );
                                } );
                            },
                            function( partner = {}, next ) {
                                Y.doccirrus.mongodb.runDb( {
                                    user,
                                    model: 'task',
                                    action: 'post',
                                    data: {
                                        allDay: true,
                                        alertTime: (new Date()).toISOString(),
                                        title: i18n( 'socketioevent-api.TRANSFER_TASK_TITLE' ),
                                        urgency: 2,
                                        details: i18n( 'socketioevent-api.TRANSFER_TASK_CONTENT', { data: { practice: partner.name } } ),
                                        group: false,
                                        roles: [ Y.doccirrus.schemas.role.DEFAULT_ROLE.EMPFANG ],
                                        type: Y.doccirrus.schemas.task.systemTaskTypes.CANCELED_TRANSFER,
                                        transferEntryId: event.message.options.transferLogId,
                                        skipcheck_: true
                                    }
                                }, next );
                            }
                        ], done );

                    }, ( err ) => {
                        next( err, socketEvents );
                    } );
                },
                function( socketEvents, next ) {
                    if( socketEvents.length ) {
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'patienttransfer',
                            action: 'put',
                            query: {
                                _id: { $in: socketEvents.map( item => item.message.options.transferLogId ) }
                            },
                            fields: [ 'status' ],
                            data: {
                                status: Y.doccirrus.schemas.patienttransfer.patientTransferTypes.CANCELED,
                                skipcheck_: true,
                                multi_: true
                            }
                        }, err => next( err ) );
                    } else {
                        return next();
                    }
                },
                function( next ) {
                    Y.doccirrus.api.socketioevent.delete( {
                        user,
                        query: Object.assign( {}, query, { label: Y.doccirrus.schemas.socketioevent.labels.EXTERNAL_API_CALL } ),
                        options,
                        callback: next
                    } );
                }
            ], callback );
        }

        /**
         * Checkes external api socket.io event before delete it.
         * Current check:
         *  if one of events is transfer.receive event, change status of transferLog entry to SENT.
         * @method releaseExternalApiCall
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Object} args.options
         * @param {Function} args.callback
         */
        function releaseExternalApiCall( args ) {
            let
                { user, query, options, callback } = args;
            const
                async = require( 'async' );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'socketioevent',
                        query: Object.assign( {}, query, {
                            'message.api': 'transfer.receive',
                            'message.options.transferLogId': { $exists: true }
                        } ),
                        action: 'get',
                        options
                    }, next );
                },
                function( socketIOEvents, next ) {
                    if( socketIOEvents.length ) {
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'patienttransfer',
                            action: 'put',
                            query: {
                                _id: { $in: socketIOEvents.map( item => item.message.options.transferLogId ) }
                            },
                            fields: [ 'status' ],
                            data: {
                                skipcheck_: true,
                                status: Y.doccirrus.schemas.patienttransfer.patientTransferTypes.SENT,
                                multi_: true
                            }
                        }, err => next( err ) );
                        return;
                    }
                    next();
                },
                function( next ) {
                    Y.doccirrus.api.socketioevent.delete( {
                        user,
                        query,
                        options,
                        callback: next
                    } );
                }
            ], callback );
        }

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        /**
         * @class socketioevent
         * @namespace doccirrus.api
         */
        Y.namespace( 'doccirrus.api' ).socketioevent = {

            name: NAME,
            'delete'(args) {
                Y.log('Entering Y.doccirrus.api.socketioevent.delete', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.socketioevent.delete');
                }
                deleteEvent( args );
            },
            releaseExternalApiCall( args ) {
                Y.log('Entering Y.doccirrus.api.socketioevent.releaseExternalApiCall', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.socketioevent.releaseExternalApiCall');
                }
                releaseExternalApiCall( args );
            },
            saveBroadcastEvent: function( args ) {
                Y.log('Entering Y.doccirrus.api.socketioevent.saveBroadcastEvent', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.socketioevent.saveBroadcastEvent');
                }
                saveBroadcastEvent( args );
            },
            post: function( args ) {
                Y.log('Entering Y.doccirrus.api.socketioevent.post', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.socketioevent.post');
                }
                post( args );
            },
            getEventsForUser: function( args ) {
                Y.log('Entering Y.doccirrus.api.socketioevent.getEventsForUser', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.socketioevent.getEventsForUser');
                }
                getEventsForUser( args );
            },
            deleteEventByMessageId: function( args ) {
                Y.log('Entering Y.doccirrus.api.socketioevent.deleteEventByMessageId', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.socketioevent.deleteEventByMessageId');
                }
                deleteEventByMessageId( args );
            },
            saveExternalApiCallEvent( args ) {
                Y.log('Entering Y.doccirrus.api.socketioevent.saveExternalApiCallEvent', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.socketioevent.saveExternalApiCallEvent');
                }
                saveExternalApiCallEvent( args );
            },
            getExternalApiCallEvent( args ) {
                Y.log('Entering Y.doccirrus.api.socketioevent.getExternalApiCallEvent', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.socketioevent.getExternalApiCallEvent');
                }
                getExternalApiCallEvent( args );
            },
            deleteExternalApiCallEvent( args ) {
                Y.log('Entering Y.doccirrus.api.socketioevent.deleteExternalApiCallEvent', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.socketioevent.deleteExternalApiCallEvent');
                }
                deleteExternalApiCallEvent( args );
            },
            savePUCActionCallEvent,
            getPUCActionCallEvent,
            deletePUCActionCallEvent

        };

    },
    '0.0.1', { requires: [ 'message-schema', 'identity-schema', 'dccommonerrors', 'socketioevent-schema' ] }
);
