/**
 * User: strix
 * Date: 10/08/2016
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
YUI.add( 'dc-fsm-receipt', function( Y, NAME ) {

        /**
         * @module activity-fsm
         * @submodule dc-fsm-receipt
         * @requires activity-schema
         */

        var
            async = require( 'async' ),
            transitions = Y.doccirrus.schemas.activity.getFSM( NAME ),
            accessError = Y.doccirrus.errors.rest( 401, '', true );

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
             *  @param   {Object}     user          REST user or equivalent
             *  @param   {Object}     options       Extra options for event emitters, printing, etc
             *  @param   {Object}     activity      see activity-schema.common.js
             *  @param   {Bpolean}    isTest        True if validation only, activity.status will not be changed
             *  @param   {Function}   callback      {Function}  Of the form fn( err, newState )
             */
            validate: function( user, options, activity, isTest, callback ) {
                var
                    fsmName;

                fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                Y.doccirrus.fsm[fsmName].validate( user, options, activity, isTest, callback );
            },

            /**
             *  @method approve
             *
             *  @param   {Object}     user          REST user or equivalent
             *  @param   {Object}     options       Extra options for event emitters, printing, etc
             *  @param   {Object}     activity      see activity-schema.common.js
             *  @param   {Bpolean}    isTest        True if validation only, activity.status will not be changed
             *  @param   {Function}   callback      {Function}  Of the form fn( err, newState )
             *
             *  Unique to this transition
             *
             *  @param  {Function}   options.onPdfGenerated Called when PDF render queue has regenerated PDF for this activity (optional)
             *  @param  {Function}   options.onPdfProgress Called repeatedly as PDF is generated (optional)
             */
            approve: function( user, options, activity, isTest, callback ) {

                var
                    fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName(),
                    currState = activity.status;

                // test does not update form or assign invoice number
                if ( isTest ) {
                    Y.doccirrus.fsm[fsmName].approve( user, options, activity, true, callback );
                    return;
                }

                //  NOTE: receipts do not approve linked activities
                options.skipLinkedApprove = true;

                async.series(
                    [
                        assignReceiptNumber,
                        saveReceiptNumber,
                        approveCurrentActivity
                    ],
                    onAllDone
                );

                // 1. assign an receipt number to this activity
                function assignReceiptNumber( itcb ) {

                    Y.doccirrus.api.invoiceconfiguration.getNextReceiptNumber( {
                        user: user,
                        data: { locationId: activity.locationId },
                        callback: onReceiptNumberAssigned
                    } );

                    function onReceiptNumberAssigned( err, numberStr ) {

                        if( err ) {
                            Y.log( 'Error assigning receipt number: ' + JSON.stringify( err ), 'warn', NAME );
                            return itcb( err );
                        }

                        activity.receiptNo = numberStr;

                        // regenerate the content too
                        activity.content = Y.doccirrus.schemas.activity.generateContent( activity );
                        itcb( null );
                    }
                }

                // 2. update activity in the database with new receipt number
                // (includes content, date and timestamp at time of approval)
                function saveReceiptNumber( itcb ) {
                    var
                        setArgs = {
                            'receiptNo': activity.receiptNo,
                            'content': activity.content,
                            'timestamp': activity.timestamp
                        };

                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'update',
                        model: 'activity',
                        query: { _id: activity._id + '' },
                        data: { $set: setArgs },
                        options: {
                            multi: false
                        }
                    }, itcb );
                }

                // 3. do the actual approve transition
                // (done by default FSM)
                function approveCurrentActivity( itcb ) {
                    Y.doccirrus.fsm[fsmName].approve( user, options, activity, false, onDefaultApprove );

                    function onDefaultApprove( err, newState ) {
                        if( err ) {
                            Y.log( 'Could not approve receipt: ' + JSON.stringify( err ), 'warn', NAME );
                            itcb( err );
                            return;
                        }

                        currState = newState;
                        itcb( null );
                    }
                }

                //  Finally
                function onAllDone( err ) {

                    function onRevertReceiptNumber( additionalErr ) {
                        callback( additionalErr || err );
                    }

                    if ( err ) {
                        Y.log( 'Error during approve transition: ' + JSON.stringify( err ), 'warn', NAME );
                        Y.log( 'Reverting receipt number: ' + activity.receiptNo, 'warn', NAME );
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            action: 'update',
                            model: 'activity',
                            query: { _id: activity._id + '' },
                            data: { $set: { 'receiptNo': '' } },
                            options: {
                                multi: false
                            }
                        }, onRevertReceiptNumber );
                        return;
                    }

                    callback( null, currState );
                }

            },

            /**
             *  Special transition for quickPrint functionality
             *
             *  DEPRECATED, to be replaced by an option
             *
             *  @method approveandprint
             *  @param   {Object}     user          REST user or equivalent
             *  @param   {Object}     options       Extra options for event emitters, printing, etc
             *  @param   {Object}     activity      see activity-schema.common.js
             *  @param   {Bpolean}    isTest        True if validation only, activity.status will not be changed
             *  @param   {Function}   callback      {Function}  Of the form fn( err, newState )
             */

            'approveandprint': function( user, options, activity, isTest, callback ) {
                var self = this;
                //  a little hacky, but simple
                options.printOnApprove = true;
                self.approve(  user, options, activity, isTest, callback );
            },

            /**
             *  @method delete
             *  @param   {Object}     user          REST user or equivalent
             *  @param   {Object}     options       Extra options for event emitters, printing, etc
             *  @param   {Object}     activity      see activity-schema.common.js
             *  @param   {Bpolean}    isTest        True if validation only, activity.status will not be changed
             *  @param   {Function}   callback      {Function}  Of the form fn( err, newState )
             */
            delete: function( user, options, activity, isTest, callback ) {
                var fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                Y.doccirrus.fsm[fsmName].delete( user, options, activity, isTest, callback );
            },

            /**
             *  @method cancel
             *  @param   {Object}     user          REST user or equivalent
             *  @param   {Object}     options       Extra options for event emitters, printing, etc
             *  @param   {Object}     activity      see activity-schema.common.js
             *  @param   {Bpolean}    isTest        True if validation only, activity.status will not be changed
             *  @param   {Function}   callback      {Function}  Of the form fn( err, newState )
             */
            cancel: function( user, options, activity, isTest, callback ) {
                var fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                //  post-process will cause any linked invces to update their totals, and this receipt will
                //  no longer be counted against the outstanding balance.

                Y.doccirrus.fsm[fsmName].cancel( user, options, activity, isTest, callback );
            },

            /**
             *  @method archive
             *  @param   {Object}     user          REST user or equivalent
             *  @param   {Object}     options       Extra options for event emitters, printing, etc
             *  @param   {Object}     activity      see activity-schema.common.js
             *  @param   {Bpolean}    isTest        True if validation only, activity.status will not be changed
             *  @param   {Function}   callback      {Function}  Of the form fn( err, newState )
             */
            archive: function( user, options, activity, isTest, callback ) {
                var fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                Y.doccirrus.fsm[fsmName].archive( user, options, activity, isTest, callback );
            },

            /**
             *  @method reject
             *  @param   {Object}     user          REST user or equivalent
             *  @param   {Object}     options       Extra options for event emitters, printing, etc
             *  @param   {Object}     activity      see activity-schema.common.js
             *  @param   {Bpolean}    isTest        True if validation only, activity.status will not be changed
             *  @param   {Function}   callback      {Function}  Of the form fn( err, newState )
             *
             *  @return {Function}    callback
             **/
            reject: function( user, options, activity, isTest, callback ) {

                //  TODO: update linked treatments to this state on success
                //  logic as for cancellation
                if( !Y.doccirrus.auth.hasTransitionPermission( user, 'reject' ) ) {
                    Y.log( 'User: ' + user.id + ', does not have permissions to reject activity', 'debug', NAME );
                    return callback( accessError );
                }
                var fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                Y.doccirrus.fsm[ fsmName ]._changeState( {
                    user,
                    activity,
                    isTest,
                    toState: 'BILLINGREJECTED',
                    fast: (options.fast && true)
                }, callback );
            }

        };

    },
    '0.0.1', { requires: ['activity-schema', 'dcauth'] }
);