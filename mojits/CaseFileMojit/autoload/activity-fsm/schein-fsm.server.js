/**
 * User: strix
 * Date: 11/02/2014  15:45
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
YUI.add( 'dc-fsm-schein', function( Y, NAME ) {

        /**
         * @module activity-fsm
         * @submodule dc-fsm-schein
         * @requires activity-schema
         */

        var transitions = Y.doccirrus.schemas.activity.getFSM(NAME);
        const {formatPromiseResult} = require( 'dc-core' ).utils;

        /**
         * Checks can user delete/cancel 'Schein' or not.
         * Algorithm:
         *  1. Check if there is 'Schein' with older date in quarter. If yes, current 'Schein' can be deleted/cancelled.
         *  2. Check if there is 'Schein' with earlier date in quarter. If yes, than endPoint for next step
         *      is date of the found 'Schein'. If no, endPoint is end of quarter.
         *  3. Check if these are treatments/diagnoses from [current 'Schein' date] to endPoint. If no, current 'Schein' can be deleted/cancelled.
         * @param {Object} user
         * @param {Object} activity Schein
         * @param {Function} callback is called with single argument - err. If err is undefined, current Schein can be deleted/cancelled
         */

        function checkForConnectedActivity( user, activity, callback ) {
            var moment = require( 'moment' ),
                async = require( 'async' ),
                forbiddenStatuses = ['BILLED', 'CANCELLED'],
                activityTypes = ['TREATMENT', 'DIAGNOSIS'],
                currentDate = moment( activity.timestamp ).toISOString(),
                startQuarter = moment( currentDate ).startOf( 'quarter' ).toISOString(),
                endQuarter = moment( currentDate ).endOf( 'quarter' ).toISOString(),
                allowTransition = false,
                isGKVSchein = 'SCHEIN' === activity.actType;

            let timestamp;

            async.waterfall( [
                function( next ) {
                    timestamp = {
                        $lt: new Date( currentDate )
                    };
                    if( isGKVSchein ) {
                        timestamp.$gte = new Date( startQuarter );
                    }
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'count',
                        model: 'activity',
                        query: {
                            actType: activity.actType,
                            patientId: activity.patientId,
                            caseFolderId: activity.caseFolderId,
                            locationId: activity.locationId,
                            timestamp: timestamp,
                            status: {
                                $nin: forbiddenStatuses
                            }
                        },
                        options: {
                            limit: 1
                        }
                    }, next );
                },
                function( count, next ) {
                    if( 0 < count ) {
                        allowTransition = true;
                        return next( null, [] );
                    } else {
                        timestamp = {
                            $gt: new Date( currentDate )
                        };
                        if( isGKVSchein ) {
                            timestamp.$lt = new Date( endQuarter );
                        }
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            action: 'get',
                            model: 'activity',
                            query: {
                                actType: activity.actType,
                                patientId: activity.patientId,
                                caseFolderId: activity.caseFolderId,
                                locationId: activity.locationId,
                                timestamp: timestamp,
                                status: {
                                    $nin: forbiddenStatuses
                                }
                            },
                            options: {
                                limit: 1,
                                lean: true,
                                sort: {
                                    _id: 1
                                },
                                select: {
                                    timestamp: 1
                                }
                            }
                        }, next );
                    }
                },
                function( activities, next ) {
                    var endDate = endQuarter,
                        timestamp = {};
                    if( allowTransition ) {
                        return next();
                    }
                    if( activities && activities[0] && activities[0].timestamp ) {
                        endDate = moment( activities[0].timestamp ).toISOString();
                    }
                    timestamp.$gt = new Date( currentDate );
                    if( isGKVSchein ) {
                        timestamp.$lt = new Date( endDate );
                    }
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'count',
                        model: 'activity',
                        query: {
                            actType: {
                                $in: activityTypes
                            },
                            patientId: activity.patientId,
                            caseFolderId: activity.caseFolderId,
                            locationId: activity.locationId,
                            timestamp: {

                                $gt: new Date( currentDate ),
                                $lt: new Date( endDate )
                            },
                            status: {
                                $nin: forbiddenStatuses
                            }
                        }
                    }, next );

                }
            ], function( err, results ) {
                if( err ) {
                    return callback( err );
                }
                if( results ) {
                    return callback( Y.doccirrus.errors.rest( 18000, '', true ) );
                }
                callback();
            } );
        }

        /**
         * State machine for scheins.
         *
         * @class dc-fsm-schein
         * @constructor
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
             * The primary state change. Only here will you see a POST
             * i.e. doc without an _id. In other transitions, the record will always
             * be handled by PUT.
             *
             *  @method  validate
             *  @param   {Object}     user          REST user or equivalent
             *  @param   {Object}     options       Extra options for event emitters, printing, etc
             *  @param   {Object}     activity      see activity-schema.common.js
             *  @param   {Object}     isTest        True if validation only, activity.status will not be changed
             *  @param   {Function}   callback      Of the form fn( err, newState )
             */
            validate: async function(user, options, activity, isTest, callback) {
                const fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName(),
                    isSwiss = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland();

                let callOnHoldValidatedCallback, currentStatus;

                let [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    model: 'activity',
                    query: {
                        _id: {$in: activity.continuousMedications || []},
                        phContinuousMed: true,
                        $or: [
                            { noLongerValid: { $exists: false } },
                            { noLongerValid: false }
                        ]
                    },
                    user,
                    options: {}
                } ) );
                if ( err ) {
                    Y.log( `Failed to get continuousMedications: ${err.stack || err}`, 'error', NAME );
                    return callback( err, activity );
                }

                // checking and remove already discontinued medications
                let continuousMedications = result.filter( ( i ) => {
                    return -1 !== activity.continuousMedications.indexOf( i._id.toString() );
                }).map( i => i._id );

                activity.continuousMedications = JSON.parse( JSON.stringify( continuousMedications ) );

                // KAT-293 put schein on hold
                if( isSwiss && activity.actType === 'PKVSCHEIN' ) {
                    [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activity',
                        query: {
                            _id: activity._id
                        },
                        options: {
                            fields: {
                                status: 1
                            }
                        }
                    } ) );
                    if( err || !Array.isArray( result ) || !result[0] || !result[0].status ) {
                        if( err ) {
                            Y.log( `validate: Failed to get schein from database: ${err.stack || err}`, 'error', NAME );
                        }
                        currentStatus = 'CREATED';
                    } else {
                        currentStatus = result[0].status;
                    }

                    // if onHold checkbox is checked - instead of validate do onHold
                    if( activity.onHold ) {
                        return Y.doccirrus.fsm[fsmName].onHold( user, options, activity, isTest, callback );
                    }
                    // if onHold checkbox is unchecked instead of validate restore the status which was before onHold
                    if( !activity.onHold && currentStatus === 'ONHOLD' && activity.statusBeforeHold ) {
                        callOnHoldValidatedCallback = true;
                    }
                }

                async function _onHoldValidatedCallback( err ) {
                    if( err ) {
                        return callback( err );
                    }
                    [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activity',
                        action: 'update',
                        query: {
                            _id: activity._id
                        },
                        data: {
                            ...(activity.statusBeforeHold === 'VALID' ? {} : {$set: {status: activity.statusBeforeHold}}),
                            $unset: {
                                onHoldNotes: 1,
                                statusBeforeHold: 1
                            }
                        }
                    } ) );

                    if( err ) {
                        Y.log( `_onHoldValidatedCallback: Failed to restore schein status before invoice was put on hold.\nError: ${err.stack || err}`, 'error', NAME );
                        return callback( err );
                    }
                    return callback( null, activity.statusBeforeHold );
                }

                Y.doccirrus.fsm[fsmName].validate( user, options, activity, isTest, callOnHoldValidatedCallback ? _onHoldValidatedCallback : callback );
            },

            approve: function(user, options, activity, isTest, callback) {
                var
                    fsmName;
                fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                Y.doccirrus.fsm[fsmName].approve( user, options, activity, isTest, callback );
            },

            /**
             *  @method  encrypt
             *  @param   {Object}     user          REST user or equivalent
             *  @param   {Object}     options       Extra options for event emitters, printing, etc
             *  @param   {Object}     activity      see activity-schema.common.js
             *  @param   {Object}     isTest        True if validation only, activity.status will not be changed
             *  @param   {Function}   callback      Of the form fn( err, newState )
             */
            encrypt: function(user, options, activity, isTest, callback) {
                //  No rules as yet
                //   callback(null, 'CRYPT_ERR');
                callback(null, 'ENCRYPTED');
            },

            /**
             *  @method  send
             *  @param   {Object}     user          REST user or equivalent
             *  @param   {Object}     options       Extra options for event emitters, printing, etc
             *  @param   {Object}     activity      see activity-schema.common.js
             *  @param   {Object}     isTest        True if validation only, activity.status will not be changed
             *  @param   {Function}   callback      Of the form fn( err, newState )
             */
            send: function(user, options, activity, isTest, callback) {
                //  No rules as yet
                //   callback(null, 'KBVERROR');
                callback(null, 'KBVBILLED');
            },

            /**
             *  @method  reject
             *  @param   {Object}     user          REST user or equivalent
             *  @param   {Object}     options       Extra options for event emitters, printing, etc
             *  @param   {Object}     activity      see activity-schema.common.js
             *  @param   {Object}     isTest        True if validation only, activity.status will not be changed
             *  @param   {Function}   callback      Of the form fn( err, newState )
             */
            reject: function(user, options, activity, isTest, callback) {
                //  No rules as yet
                callback(null, 'KBVREJECTED');
            },

            /**
             *  @method  renew
             *  @param   {Object}     user          REST user or equivalent
             *  @param   {Object}     options       Extra options for event emitters, printing, etc
             *  @param   {Object}     activity      see activity-schema.common.js
             *  @param   {Object}     isTest        True if validation only, activity.status will not be changed
             *  @param   {Function}   callback      Of the form fn( err, newState )
             */
            renew: function(user, options, activity, isTest, callback) {
                //  No rules as yet
                callback(null, 'CREATED');
            },

            /**
             *  @method  archive
             *  @param   {Object}     user          REST user or equivalent
             *  @param   {Object}     options       Extra options for event emitters, printing, etc
             *  @param   {Object}     activity      see activity-schema.common.js
             *  @param   {Object}     isTest        True if validation only, activity.status will not be changed
             *  @param   {Function}   callback      Of the form fn( err, newState )
             */
            archive: function(user, options, activity, isTest, callback) {
                //  No rules as yet
                callback(null, 'ARCHIVED');
            },

            /**
             *  @method  delete
             *  @param   {Object}     user          REST user or equivalent
             *  @param   {Object}     options       Extra options for event emitters, printing, etc
             *  @param   {Object}     activity      see activity-schema.common.js
             *  @param   {Object}     isTest        True if validation only, activity.status will not be changed
             *  @param   {Function}   callback      Of the form fn( err, newState )
             *
             *  @return {Fuction}
             */
            delete: function( user, options, activity, isTest, callback ) {
                var fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                if( isTest ) {
                    return Y.doccirrus.fsm[fsmName].delete( user, options, activity, isTest, callback );
                }
                //MOJ-4348
                checkForConnectedActivity( user, activity, function(err){
                    if(err){
                        return callback(err);
                    }
                    Y.doccirrus.fsm[fsmName].delete( user, options, activity, isTest, callback );
                });
            },

            /**
             *  @method  cancel
             *  @param   {Object}     user          REST user or equivalent
             *  @param   {Object}     options       Extra options for event emitters, printing, etc
             *  @param   {Object}     activity      see activity-schema.common.js
             *  @param   {Object}     isTest        True if validation only, activity.status will not be changed
             *  @param   {Function}   callback      Of the form fn( err, newState )
             */
            cancel: function( user, options, activity, isTest, callback ) {
                var fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                if( isTest ){
                    Y.doccirrus.fsm[fsmName].cancel( user, options, activity, isTest, callback );
                }
                //MOJ-4348
                checkForConnectedActivity( user, activity, function(err){
                    if(err){
                        return callback(err);
                    }
                    Y.doccirrus.fsm[fsmName].cancel( user, options, activity, isTest, callback );
                });

            }
        };

    },
    '0.0.1', { requires: ['activity-schema'] }
);