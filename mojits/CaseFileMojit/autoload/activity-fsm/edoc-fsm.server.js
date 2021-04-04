/*global YUI */
/*jshint esnext:true */


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
YUI.add( 'dc-fsm-edoc', function( Y, NAME ) {

        /**
         * @module activity-fsm
         * @submodule dc-fsm-edoc
         * @requires activity-schema
         */

        const
            isEdmp = Y.doccirrus.schemas.activity.isEdmp,
            ObjectId = require( 'mongoose' ).Types.ObjectId,
            resetEdocStatus = Y.doccirrus.edocutils.resetEdocStatus,
            accessError = Y.doccirrus.errors.rest( 401, '', true ),
            removeFile = Y.doccirrus.edocutils.removeFile,
            transitions = Y.doccirrus.schemas.activity.getFSM( NAME ),
            Promise = require( 'bluebird' ),
            { promisifyArgsCallback } = require('dc-core').utils,

            i18n = Y.doccirrus.i18n,
            PRINT_PATIENT_DOC = i18n( 'InCaseMojit.edoc-fsmJS.printPatientDoc.i18n' );

        /**
         * State machines for invoices (does not include schein)
         *
         * @class dc-fsm-edoc
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
             *   The primary state change. Only here will you see a POST
             *  i.e. doc without an _id. In other transitions, the record will always
             *  be handled by PUT.
             *
             *  @method validate
             *  @param  {Object}                user      REST user or equivalent
             *  @param  {Object}                options   Extra options for event emitters, printing, etc
             *  @param  {Object}                activity  see activity-schema.common.js
             *  @param  {Boolean}               isTest    True if validation only, activity.status will not be changed
             *  @param  {Function}              callback  Of the form fn( err, newState)
             *
             *  @return {Function | undefined}
             */
            validate: function( user, options, activity, isTest, callback ) {

                var
                    dbOptions = {ignoreReadOnly: ['actType']},
                    action = 'post';

                if( !Y.doccirrus.auth.hasTransitionPermission( user, 'validate' ) ) {
                    Y.log( `User: ${  user.id  }, does not have permissions to validate edoc activity`, 'debug', NAME );
                    return callback( accessError );
                }
                Y.log( `Entering validate transition on edoc FSM ${  activity._id  } ${  isTest ? 'TEST' : 'REAL'}`, 'debug', NAME );

                if(activity.actType === 'ZERVIX_ZYTOLOGIE') {
                    const fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                    Y.doccirrus.fsm[fsmName].validate( user, options, activity, isTest, callback );

                    return;
                }

                // 3. return state
                function finalCb( err, data ) {
                    //  set _id on activity if this is first save
                    if( data && data[0] && data[0]._id && !activity._id ) {
                        activity._id = data[0]._id;
                    }

                    Y.log( `Valid activity saved to database:${  activity._id}`, 'debug', NAME );

                    if( err ) {
                        Y.log( `Error in transition: ${  err.toString()}`, 'error', NAME );
                        Y.log( JSON.stringify( err ), 'debug', NAME );
                        callback( err );
                        return;
                    }

                    //  set activity _id on first POST, will be returned to client
                    if( 'post' === action && data && data[0] && data[0]._id ) {
                        Object.keys( data[0] ).forEach( function( key ) {
                            activity[key] = data[0][key];
                        } );
                    }

                    callback( null, 'VALID' );
                }

                // 2. save state if !istTest
                function validCb( err ) {
                    if( err ) {
                        Y.log( `Suppressing error while testing validity: ${  JSON.stringify( err )}`, 'warn', NAME );
                        callback( null, 'INVALID' );
                        return;
                    }

                    if( !isTest ) {
                        // we need to set the status here, in case it affects the validation function!
                        // not clean because it complicates step 2.
                        // switch off writing in this case, because already written
                        // need this check here?

                        Y.doccirrus.api.edoc.buildFile( {
                            user: user,
                            activity: activity,
                            callback: ( err, result ) => {
                                if( err ) {
                                    return finalCb( err );
                                }
                                let status;
                                if( result.isCanceled || !result.isValid ) {
                                    status = 'INVALID';
                                } else {
                                    status = 'VALID';
                                }

                                activity.status = 'VALID';

                                activity = Object.assign( activity, result.updateData );
                                if( !activity.skipcheck_ ) {
                                    activity = Y.doccirrus.filters.cleanDbObject( activity );
                                }
                                dbOptions.entireRec = true;

                                Y.doccirrus.mongodb.runDb( {
                                    user: user,
                                    action: action,
                                    model: 'activity',
                                    query: {_id: activity._id}, // will be ignored for post
                                    data: activity,
                                    options: dbOptions,
                                    fields: Object.keys( activity ) // will be ignored for post
                                }, function( err, results ) {
                                    function stateChanged( err ) {
                                        if( err ) {
                                            return finalCb( err );
                                        }
                                        finalCb( null, results );
                                    }

                                    if( err ) {
                                        return finalCb( err );
                                    }
                                    if( 'INVALID' === status ) {
                                        let fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                                        return Y.doccirrus.fsm[ fsmName ]._changeState( {
                                            user,
                                            activity,
                                            isTest,
                                            toState: 'INVALID',
                                            fast: true
                                        }, stateChanged );
                                    }
                                    finalCb( null, results );
                                } );
                            }
                        } );

                    } else {
                        // 1. just check validation of activity
                        finalCb( null, [] );
                    }
                }

                // 1. has an _id and we are actually writing!
                if( activity._id ) {
                    action = 'put';
                }

                // NB: here we can trigger validations for non-existent fields
                // by setting them to undefined, they save no code, but instruct
                // mongoose to make a conditional mandatory check, which would not
                // run if the field is completely missing.
                if( !activity.code ) {
                    activity.code = null;
                }

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'validate',
                    model: 'activity',
                    args: [activity, validCb]
                } );
            },

            /**
             *  The primary state change. Only here will you see a POST
             *  i.e. doc without an _id. In other transitions, the record will always
             *  be handled by PUT.
             *
             *  @method validate
             *  @param  {Object}                user      REST user or equivalent
             *  @param  {Object}                options   Extra options for event emitters, printing, etc
             *  @param  {Object}                activity  see activity-schema.common.js
             *  @param  {Boolean}               isTest    True if validation only, activity.status will not be changed
             *  @param  {Function}              callback  Of the form fn( err, newState)
             */

            create: function( user, options, activity, isTest, callback ) {

                let actId = activity._id;
                let dmpFileId = activity.dmpFileId;
                delete activity._additionalTransitionData;
                delete activity._id;
                activity.dmpSignatureDate = null;
                if( actId ) {
                    // reset all edoc/edmp pm related data
                    activity.dmpErrors = null;
                    activity.dmpAddressee = null;
                    activity.dmpDeliveryInfo = null;
                    activity.dmpFileId = null;
                }
                const setEmployeeName = promisifyArgsCallback( Y.doccirrus.api.activity.setEmployeeName );

                Promise.resolve()
                    .then( () => {
                        return setEmployeeName( {
                            user,
                            data: activity
                        } );
                    } )
                    .then( ( dataWithEmployeeName ) => {
                        activity.timestamp = new Date(activity.timestamp);
                        if( !actId ) { // in future all edoc/edmp activties will be created automatically
                            activity.timestamp = new Date(activity.timestamp);
                            return Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'activity',
                                action: 'mongoInsertOne',
                                data: dataWithEmployeeName
                            } );
                        } else {
                            resetEdocStatus( activity );
                            return Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'activity',
                                action: 'update',
                                query: {
                                    _id: new ObjectId( actId )
                                },
                                data: {$set: dataWithEmployeeName}
                            } );
                        }
                    } )
                    .then( ( result ) => {
                        if( actId ) {
                            activity._id = actId;
                        } else {
                            activity._id = result && result.insertedId;
                        }
                        if( dmpFileId ) {
                            return removeFile( user, dmpFileId );
                        }
                        return null;
                    } )
                    .then( () => callback() )
                    .catch( err => callback( err ) );
            },

            /**
             *  @method approve
             *  @param  {Object}                user      REST user or equivalent
             *  @param  {Object}                options   Extra options for event emitters, printing, etc
             *  @param  {Object}                activity  see activity-schema.common.js
             *  @param  {Boolean}               isTest    True if validation only, activity.status will not be changed
             *  @param  {Function}              callback  Of the form fn( err, newState)
             */
            approve: function( user, options, activity, isTest, callback ) {
                var fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();

                function approvedCb( err, result ) {
                    if( !err && !isTest && isEdmp( activity.actType ) && 'APPROVED' === result ) {
                        Y.doccirrus.communication.emitEventForUser( {
                            targetId: user.identityId,
                            event: 'message',
                            eventType: Y.doccirrus.schemas.socketioevent.eventTypes.CONFIRM,
                            messageId: activity._id.toString(),
                            msg: {
                                data: `<a href="/incase#/activity/${  activity._id  }">${  PRINT_PATIENT_DOC  }</a>`
                            }
                        } );
                    }

                    callback( err, result );
                }

                Y.doccirrus.fsm[fsmName].approve( user, options, activity, isTest, approvedCb );
            },

            /**
             *  @method delete
             *  @param  {Object}                user      REST user or equivalent
             *  @param  {Object}                options   Extra options for event emitters, printing, etc
             *  @param  {Object}                activity  see activity-schema.common.js
             *  @param  {Boolean}               isTest    True if validation only, activity.status will not be changed
             *  @param  {Function}              callback  Of the form fn( err, newState)
             */
            delete: function( user, options, activity, isTest, callback ) {
                function doneCb( err ) {
                    if( err ) {
                        return callback( err );
                    }
                    callback( null, 'DELETED' );
                }

                if( activity._id && !isTest ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'delete',
                        model: 'activity',
                        query: {_id: activity._id}
                    }, callback );
                } else {
                    doneCb( null );
                }

            },

            /**
             *  @method cancel
             *  @param  {Object}                user      REST user or equivalent
             *  @param  {Object}                options   Extra options for event emitters, printing, etc
             *  @param  {Object}                activity  see activity-schema.common.js
             *  @param  {Boolean}               isTest    True if validation only, activity.status will not be changed
             *  @param  {Function}              callback  Of the form fn( err, newState)
             */
            cancel: function( user, options, activity, isTest, callback ) {
                var fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                Y.doccirrus.fsm[fsmName].cancel( user, options, activity, isTest, callback );
            },

            /**
             *  @method archive
             *  @param  {Object}                user      REST user or equivalent
             *  @param  {Object}                options   Extra options for event emitters, printing, etc
             *  @param  {Object}                activity  see activity-schema.common.js
             *  @param  {Boolean}               isTest    True if validation only, activity.status will not be changed
             *  @param  {Function}              callback  Of the form fn( err, newState)
             */
            archive: function( user, options, activity, isTest, callback ) {
                var fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                Y.doccirrus.fsm[ fsmName ]._changeState( {
                    user,
                    activity,
                    isTest,
                    toState: 'ARCHIVED',
                    fast: (options.fast && true)
                }, callback );
            },

            /**
             *  @method reject
             *  @param  {Object}                user      REST user or equivalent
             *  @param  {Object}                options   Extra options for event emitters, printing, etc
             *  @param  {Object}                activity  see activity-schema.common.js
             *  @param  {Boolean}               isTest    True if validation only, activity.status will not be changed
             *  @param  {Function}              callback  Of the form fn( err, newState)
             */
            reject: function( user, options, activity, isTest, callback ) {
                //TODO: add any special handling or events here (InvoiceMojit, emails sent, etc)
                var fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                Y.doccirrus.fsm[ fsmName ]._changeState( {
                    user,
                    activity,
                    isTest,
                    toState: 'BILLINGREJECTED',
                    fast: (options.fast && true)
                }, callback );
            },

            /**
             *  @method bill
             *  @param  {Object}                user      REST user or equivalent
             *  @param  {Object}                options   Extra options for event emitters, printing, etc
             *  @param  {Object}                activity  see activity-schema.common.js
             *  @param  {Boolean}               isTest    True if validation only, activity.status will not be changed
             *  @param  {Function}              callback  Of the form fn( err, newState)
             */
            bill: function( user, options, activity, isTest, callback ) {
                //TODO: add any special handling or events here (InvoiceMojit, emails sent, etc)
                var fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                Y.doccirrus.fsm[ fsmName ]._changeState( {
                    user,
                    activity,
                    isTest,
                    toState: 'BILLED',
                    fast: (options.fast && true)
                }, callback );
            },

            /**
             *  @method pay
             *  @param  {Object}                user      REST user or equivalent
             *  @param  {Object}                options   Extra options for event emitters, printing, etc
             *  @param  {Object}                activity  see activity-schema.common.js
             *  @param  {Boolean}               isTest    True if validation only, activity.status will not be changed
             *  @param  {Function}              callback  Of the form fn( err, newState)
             */
            pay: function( user, options, activity, isTest, callback ) {
                //TODO: add any special handling or events here (InvoiceMojit, emails sent, etc)
                var fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                Y.doccirrus.fsm[ fsmName ]._changeState( {
                    user,
                    activity,
                    isTest,
                    toState: 'PAID',
                    fast: (options.fast && true)
                }, callback );
            }

        };

    },
    '0.0.1', {requires: ['activity-schema', 'edmp-commonutils', 'edmp-utils', 'edoc-api']}
);