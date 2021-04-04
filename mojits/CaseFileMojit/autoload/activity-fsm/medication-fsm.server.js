/**
 * User: dcdev
 * Date: 3/10/20  4:09 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


/**
 * NB: the states and transitions are defined in activity-schema, this is an interchangeable unit of business
 * logic which is used to validate state changes.  Member names correspond to transitions, and all have a
 * common form called on the server by a REST action on CaseFileMojit.
 *
 * When calling back an error, the error message should refer to the CaseFileMojit il8n dictionary, so
 * that the client can inform the user about what needs to be done to before the transition will complete.
 *
 * Multiple error messages / informational strings can be comma separated (you need to do x,y,z first).
 *
 * @module activity-fsm
 */
YUI.add( 'dc-fsm-medication', function( Y, NAME ) {

        /**
         * @module activity-fsm
         * @submodule dc-fsm-medication
         * @requires activity-schema
         */

        var
            transitions = Y.doccirrus.schemas.activity.getFSM( NAME ),
            accessError = Y.doccirrus.errors.rest( 401, '', true ),
            {formatPromiseResult} = require( 'dc-core' ).utils;

        /**
         * State machines for receipts
         *
         * @class dc-fsm-receipt
         * @namespace doccirrus.fsm
         * @static
         */
        Y.namespace( 'doccirrus.fsm' )[NAME] = {

            /**
             * @property transitions
             * @type {Object}
             */
            transitions: transitions,
            /**
             * @property name
             * @type {String}
             * @protected
             */
            name: NAME,

            /**
             *  The primary state change. Only here will you see a POST
             *  i.e. doc without an _id. In other transitions, the record will always
             *  be handled by PUT.
             *
             *  @method validate
             *  @param   {Object}   user        REST user or equivalent
             *  @param   {Option}   options     Extra options for event emitters, printing, etc
             *  @param   {Object}   activity    see activity-schema.common.js
             *  @param   {Boolean}  isTest      True if validation only, activity.status will not be changed
             *  @param   {Function} callback    Of the form fn( err, newState )
             */
            validate: async function( user, options, activity, isTest, callback ) {
                let
                    fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                Y.doccirrus.fsm[fsmName].validate( user, options, activity, isTest, callback );
            },

            /**
             *  @method store
             *  @param  {Object}                user            REST user or equivalent
             *  @param  {Object}                options         Extra options for event emitters, printing, etc
             *  @param  {Boolean}               options.fast    Skip pre-and post-processes
             *  @param  {Objct}                 activity        see activity-schema.common.js
             *  @param  {Boolen}                isTest          True if validation only, activity.status will not be changed
             *  @param  {Function}              callback        Of the form fn( err, newState )
             */
            store: function( user, options, activity, isTest, callback ) {
                var
                    fsmName;

                fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                Y.doccirrus.fsm[fsmName].store( user, options, activity, isTest, callback );
            },

            /**
             *  @method approve
             *  @param  {Objeect}               user            REST user or equivalent
             *  @param  {Object}                options         Extra options for event emitters, printing, etc
             *  @param  {Boolean}               options.fast    Skip pre-and post-processes
             *  @param  {Object}                activity        see activity-schema.common.js
             *  @param  {Boolean}               isTest          True if validation only, activity.status will not be changed
             *  @param  {Function}              callback        Of the form fn( err, newState )
             */
            approve: function( user, options, activity, isTest, callback ) {
                var
                    fsmName;

                fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                Y.doccirrus.fsm[fsmName].approve( user, options, activity, isTest, callback );
            },

            /**
             *  @method bill
             *  @param  {Object}                user            REST user or equivalent
             *  @param  {Object}                options         Extra options for event emitters, printing, etc
             *  @param  {Boolean}               options.fast    Skip pre-and post-processes
             *  @param  {Object}                activity        see activity-schema.common.js
             *  @param  {Boolean}               isTest          True if validation only, activity.status will not be changed
             *  @param  {Function}              callback
             */
            bill: function( user, options, activity, isTest, callback ) {
                var
                    fsmName;

                fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                Y.doccirrus.fsm[fsmName].bill( user, options, activity, isTest, callback );
            },

            /**
             *  @method approveandprint
             *  @param  {Object}                user            REST user or equivalent
             *  @param  {Object}                options         Extra options for event emitters, printing, etc
             *  @param  {Boolean}               options.fast    Skip pre-and post-processes
             *  @param  {Object}                activity        see activity-schema.common.js
             *  @param  {Boolean}               isTest          True if validation only, activity.status will not be changed
             *  @param  {Function}              callback        Of the form fn( err, newState )
             */
            approveandprint: function( user, options, activity, isTest, callback ) {
                var
                    fsmName;

                fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                Y.doccirrus.fsm[fsmName].approveandprint( user, options, activity, isTest, callback );
            },

            /**
             *  @method delete
             *  @param  {Object}                user            REST user or equivalent
             *  @param  {Object}                options         Extra options for event emitters, printing, etc
             *  @param  {Boolean}               options.fast    Skip pre-and post-processes
             *  @param  {Object}                activity        see activity-schema.common.js
             *  @param  {Boolean}               isTest          True if validation only, activity.status will not be changed
             *  @param  {Function}              callback        Of the form fn( err, newState )
             */
            delete: function( user, options, activity, isTest, callback ) {
                var
                    fsmName;

                fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                Y.doccirrus.fsm[fsmName].delete( user, options, activity, isTest, callback );
            },

            /**
             *  @method cancel
             *  @param  {Object}                user            REST user or equivalent
             *  @param  {Object}                options         Extra options for event emitters, printing, etc
             *  @param  {Boolean}               options.fast    Skip pre-and post-processes
             *  @param  {Object}                activity        see activity-schema.common.js
             *  @param  {Boolean}               isTest          True if validation only, activity.status will not be changed
             *  @param  {Function}              callback        Of the form fn( err, newState )
             */
            cancel: async function( user, options, activity, isTest, callback ) {
                const
                    fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();

                if( activity.orderId ) {
                    let [err, order] = await formatPromiseResult( Y.doccirrus.api.stockordersrequest.getOrders( {
                        user,
                        query: {_id: activity.orderId}
                    } ) );

                    if( err ) {
                        Y.log( `medication-fsm:cancel: failed to get order by id ${activity.orderId},  err: ${err.stack || err}`, 'error', NAME );
                        return callback( `Failed to do cancel transition, Failed to find stock order` );
                    }

                    if( order.length && order[0].status === 'created') {
                        order = order[0];
                    } else {
                        return Y.doccirrus.fsm[fsmName].cancel( user, options, activity, isTest, callback );
                    }

                    order.stocks.forEach( orderedItem => {
                        if( orderedItem && orderedItem.stockItem && orderedItem.stockItem.phPZN === activity.phPZN ) {
                            if ( orderedItem.quantity > 0) {
                                orderedItem.quantity--;
                            }
                        }
                    } );

                    [err] = await formatPromiseResult( Y.doccirrus.api.stockordersrequest.updateOrder( {
                        user,
                        data: order
                    } ) );

                    if( err ) {
                        Y.log( `medication-fsm:cancel: failed to reduce count in order id ${activity.orderId}, err: ${err.stack || err}`, 'error', NAME );
                        return callback( `Failed to do cancel transition, Failed to reduce medication in order` );
                    }

                }

                Y.doccirrus.fsm[fsmName].cancel( user, options, activity, isTest, callback );
            },

            /**
             *  @param  {Object}                user            REST user or equivalent
             *  @param  {Object}                options         Extra options for event emitters, printing, etc
             *  @param  {Boolean}               options.fast    Skip pre-and post-processes
             *  @param  {Object}                activity        see activity-schema.common.js
             *  @param  {Boolean}               isTest          True if validation only, activity.status will not be changed
             *  @param  {Function}              callback        Of the form fn( err, newState )
             */
            archive: function( user, options, activity, isTest, callback ) {
                var
                    fsmName;

                fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                Y.doccirrus.fsm[fsmName].archive( user, options, activity, isTest, callback );
            },

            _changeState: function( params, callback ) {
                var fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                Y.doccirrus.fsm[fsmName]._changeState( params, callback );
            },

            /**
             * @method order
             * @param {Object} user
             * @param {Object} options
             * @param {Object} activity
             * @param {Boolean} isTest
             * @param {Function} callback
             */
            order: async function( user, options, activity, isTest, callback ) {
                if( !Y.doccirrus.auth.hasTransitionPermission( user, 'order' ) ) {
                    Y.log( 'User: ' + user.id + ', does not have permissions to archive activity', 'debug', NAME );
                    return callback( accessError );
                }

                const
                    toState = 'ORDERED';

                if( !activity.orderId || activity.isArrived ) {
                    return callback( new Error( 'Activity orderId or isArrived properties has incorrect valuies' ) );
                }

                let [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    action: 'update',
                    model: 'activity',
                    query: {_id: activity._id},
                    fields: ['isArrived', 'orderId'],
                    user,
                    data: {isArrived: false, 'orderId': activity.orderId}
                } ) );

                if( err ) {
                    Y.log(`dc-fsm-medication:order: Failed to update activity ${activity._id}`, 'error', NAME);
                    return callback(err);
                }

                this._changeState( {
                    user,
                    activity,
                    isTest,
                    toState: toState,
                    fast: (options.fast && true)
                }, callback );
            },

            /**
             * @method order
             * @param {Object} user
             * @param {Object} options
             * @param {Object} activity
             * @param {Boolean} isTest
             * @param {Function} callback
             */
            removeFromOrder: async function( user, options, activity, isTest, callback ) {
                if( !Y.doccirrus.auth.hasTransitionPermission( user, 'order' ) ) {
                    Y.log( 'User: ' + user.id + ', does not have permissions to remove activity from order', 'debug', NAME );
                    return callback( accessError );
                }

                const
                    toState = 'VALID';

                if( !activity.orderId || activity.isArrived ) {
                    return callback( new Error( 'Activity orderId or isArrived properties has incorrect valuies' ) );
                }

                let [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    action: 'update',
                    model: 'activity',
                    query: {_id: activity._id},
                    fields: ['orderId'],
                    user,
                    data: {'orderId': null}
                } ) );

                if( err ) {
                    Y.log(`dc-fsm-medication:order: Failed to update activity ${activity._id}`, 'error', NAME);
                    return callback(err);
                }

                this._changeState( {
                    user,
                    activity,
                    isTest,
                    toState: toState,
                    fast: (options.fast && true)
                }, callback );
            },

            /**
             * @method dispense
             * @param {Object} user
             * @param {Object} options
             * @param {Object} activity
             * @param {Boolean} isTest
             * @param {Function} callback
             */
            dispense: async function( user, options, activity, isTest, callback ) {
                if( !Y.doccirrus.auth.hasTransitionPermission( user, 'order' ) ) {
                    Y.log( 'User: ' + user.id + ', does not have permissions to archive activity', 'debug', NAME );
                    return callback( accessError );
                }

                const
                    toState = 'DISPENSED';

                let [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    action: 'update',
                    model: 'activity',
                    query: {_id: activity._id},
                    fields: ['isDispensed', 'activities'],
                    user,
                    data: {isDispensed: true, activities: activity.activities}
                } ) );

                if( err ) {
                    Y.log(`dc-fsm-medication:dispense: Failed to update activity ${activity._id}`, 'error', NAME);
                    return callback(err);
                }

                this._changeState( {
                    user,
                    activity,
                    isTest,
                    toState: toState,
                    fast: (options.fast && true)
                }, callback );
            }

        };

    },
    '0.0.1', {requires: ['activity-schema', 'dcauth']}
);