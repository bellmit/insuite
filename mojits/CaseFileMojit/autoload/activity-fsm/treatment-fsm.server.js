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
YUI.add( 'dc-fsm-treatment', function( Y, NAME ) {

        /**
         * @module activity-fsm
         * @submodule dc-fsm-treatment
         * @requires activity-schema
         */

        var transitions = Y.doccirrus.schemas.activity.getFSM( NAME );

        /**
         * State machines for invoices (does not include schein)
         *
         * @class dc-fsm-treatment
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
             *  @method validate
             *  @param  {Option}                user            REST user or equivalent
             *  @param  {Option}                options         Extra options for event emitters, printing, etc
             *  @param  {Boolean}               options.fast    Skip pre-and post-processes
             *  @param  {Object}                activity        see activity-schema.common.js
             *  @param  {Boolean}               isTest          True if validation only, activity.status will not be changed
             *  @param  {Function}              callback        Of the form fn( err, newState )
             */
            validate: function( user, options, activity, isTest, callback ) {
                var
                    async = require( 'async' ),
                    moment = require( 'moment' ),
                    numberOfCopies = 0,
                    explanationsIsTemplate = false,
                    explanationsArray = [],
                    hasContext = ( ( options && options.activityContext && options.activityContext.weakQueueKey ) ? true : false ),
                    skipInvalidateParentActivities = options && options.activityContext && options.activityContext.skipInvalidateParentActivities,
                    wasLastInBatch = ( ( hasContext && options.activityContext.lastInBatch ) || !hasContext ),
                    newStatus,
                    doNotNotify = ( activity.hierarchyRules || [] ).some( ( act ) => {
                        return act.checked;
                    });

                async.series( [ checkNumberOfCopies, setupContext, attemptValidation, makeCopies, notifyClient ], onAllDone );

                //  client may have passed optional virtual field to make multiple copies of new treatment, EXTMOJ-1064
                function checkNumberOfCopies( itcb ) {
                    if ( activity.numberOfCopies ) {
                        numberOfCopies = ( activity.numberOfCopies - 1 );
                        Y.log( 'Will make copies of treatment if valid: ' + numberOfCopies, 'debug', NAME );
                        delete activity.numberOfCopies;
                    }
                    explanationsIsTemplate = numberOfCopies > 0 && ( -1 !== (activity.explanations || '').indexOf('#') );
                    if ( explanationsIsTemplate ){
                        explanationsArray = activity.explanations.split( '#' ).map( el => el.trim() );
                    }

                    itcb( null );
                }

                //  create an activity context if none exists, allows more efficient creation of multiple copies
                function setupContext( itcb ) {
                    //  if a context was passed we can skip this step
                    if ( hasContext || isTest ) { return itcb( null ); }
                    options.activityContext = {
                        skipInvalidateParentActivities,
                        'cache': {},
                        'queueKey': {},
                        'lastInBatch': ( 0 === numberOfCopies )
                    };
                    itcb( null );
                }

                //  default validate transition for the original object
                function attemptValidation( itcb ) {
                    var fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();

                    if( explanationsIsTemplate ){
                        activity.explanations = explanationsArray.shift();
                    }
                    Y.doccirrus.fsm[fsmName].validate( user, options, activity, isTest, onValidateComplete );

                    function onValidateComplete( err, result ) {
                        newStatus = result;
                        itcb( err );
                    }
                }

                //  make requested copies of the valid treatment
                function makeCopies( itcb ) {
                    //  if not valid, test, or no copies to make then skip this step
                    if (
                        isTest ||
                        ( 0 === numberOfCopies ) ||
                        ( 'VALID' !== newStatus )
                    ) {
                        return itcb( null );
                    }

                    Y.log( 'Making copies of valid treatment: ' + numberOfCopies, 'debug', NAME );
                    var copies = [], plainObj, i;
                    for ( i = 0; i < numberOfCopies; i++ ) {
                        plainObj = JSON.parse( JSON.stringify( activity ) );
                        plainObj.isLastInCurrentBatch = ( i === ( numberOfCopies - 1 ) );

                        //  These metadata properties can interfere with taint check on DB layer, not needed at this point
                        delete plainObj.taint_;
                        delete plainObj._additionalTransitionData;
                        delete plainObj.ignoreReadOnly_;

                        //  References to attachments should not be duplicated
                        plainObj.attachments = [];
                        plainObj.attachedMedia = [];

                        //  Copies of the activitiy will get their own _id
                        delete plainObj._id;

                        if( explanationsIsTemplate ){
                            plainObj.explanations = explanationsArray.shift();
                        }

                        Y.log( 'Queue additional copies of this treatment, #:' + i + ' isLastInBatch: ' + plainObj.isLastInBatch, 'debug', NAME );
                        copies.push( plainObj );
                    }

                    async.eachSeries( copies, saveSingleCopy , itcb );
                }

                function saveSingleCopy( copyActivity, itcb ) {

                    if ( copyActivity.isLastInCurrentBatch ) {
                        Y.log( 'Current copy is last in batch, hasContext: ' + hasContext + ' waslastInBatch: ' + wasLastInBatch, 'debug', NAME );
                        options.activityContext.lastInBatch  = ( !hasContext || wasLastInBatch);
                    } else {
                        Y.log( 'Current copy is not last in batch', 'debug', NAME );
                        options.activityContext.lastInBatch  = false;
                    }

                    delete copyActivity.isLastInCurrentBatch;

                    if( 'PREPARED' === copyActivity.status ) {
                        copyActivity.timestamp = moment( new Date() ).toISOString();
                    }

                    copyActivity = Y.doccirrus.filters.cleanDbObject( copyActivity );

                    Y.doccirrus.mongodb.runDb( {
                        'user': user,
                        'model': 'activity',
                        'action': 'post',
                        'data': copyActivity,
                        'context': options.activityContext,
                        'callback': itcb
                    } );
                }

                //  emit an event to prompt the client to update the activities table
                function notifyClient( itcb ) {
                    if( !doNotNotify ) {
                        Y.doccirrus.communication.emitEventForUser( {
                            targetId: user.identityId,
                            nsp: 'default',
                            event: 'treatmentCopiesCreated',
                            msg: { data: { 'message': 'Created ' + numberOfCopies + ' duplicate treatments' } }
                        } );
                    }

                    itcb( null );
                }

                function onAllDone( err ) {
                    callback( err, newStatus );
                }
            },

            /**
             *  @method approve
             *  @param  {Option}                user            REST user or equivalent
             *  @param  {Option}                options         Extra options for event emitters, printing, etc
             *  @param  {Boolean}               options.fast    Skip pre-and post-processes
             *  @param  {Object}                activity        see activity-schema.common.js
             *  @param  {Boolean}               isTest          True if validation only, activity.status will not be changed
             *  @param  {Function}              callback        Of the form fn( err, newState )
             *
             *  Unique to this transition
             *
             *  @param  {Function}              options.onPdfGenerated  Called when PDF render queue has regenerated PDF for this activity (optional)
             *  @param  {Function}              options.onPdfProgress   Called repeatedly as PDF is generated (optional)
             */
            approve: function( user, options, activity, isTest, callback ) {
                var fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                Y.doccirrus.fsm[fsmName].approve( user, options, activity, isTest, callback );
            },

            /**
             *  @method delete
             *  @param  {Option}                user            REST user or equivalent
             *  @param  {Option}                options         Extra options for event emitters, printing, etc
             *  @param  {Boolean}               options.fast    Skip pre-and post-processes
             *  @param  {Object}                activity        see activity-schema.common.js
             *  @param  {Boolean}               isTest          True if validation only, activity.status will not be changed
             *  @param  {Function}              callback        Of the form fn( err, newState )
             */
            delete: function( user, options, activity, isTest, callback ) {
                var fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                Y.doccirrus.fsm[fsmName].delete( user, options, activity, isTest, callback );
            },

            /**
             *  @method cancel
             *  @param  {Option}                user            REST user or equivalent
             *  @param  {Option}                options         Extra options for event emitters, printing, etc
             *  @param  {Boolean}               options.fast    Skip pre-and post-processes
             *  @param  {Object}                activity        see activity-schema.common.js
             *  @param  {Boolean}               isTest          True if validation only, activity.status will not be changed
             *  @param  {Function}              callback        Of the form fn( err, newState )
             */
            cancel: function( user, options, activity, isTest, callback ) {
                var fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                Y.doccirrus.fsm[fsmName].cancel( user, options, activity, isTest, callback );
            },

            /**
             *  @method archive
             *  @param  {Option}                user            REST user or equivalent
             *  @param  {Option}                options         Extra options for event emitters, printing, etc
             *  @param  {Boolean}               options.fast    Skip pre-and post-processes
             *  @param  {Object}                activity        see activity-schema.common.js
             *  @param  {Boolean}               isTest          True if validation only, activity.status will not be changed
             *  @param  {Function}              callback        Of the form fn( err, newState )
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
             *  @param  {Option}                user            REST user or equivalent
             *  @param  {Option}                options         Extra options for event emitters, printing, etc
             *  @param  {Boolean}               options.fast    Skip pre-and post-processes
             *  @param  {Object}                activity        see activity-schema.common.js
             *  @param  {Boolean}               isTest          True if validation only, activity.status will not be changed
             *  @param  {Function}              callback        Of the form fn( err, newState )
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
             *  @param  {Option}                user            REST user or equivalent
             *  @param  {Option}                options         Extra options for event emitters, printing, etc
             *  @param  {Boolean}               options.fast    Skip pre-and post-processes
             *  @param  {Object}                activity        see activity-schema.common.js
             *  @param  {Boolean}               isTest          True if validation only, activity.status will not be changed
             *  @param  {Function}              callback        Of the form fn( err, newState )
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
             *  @param  {Option}                user            REST user or equivalent
             *  @param  {Option}                options         Extra options for event emitters, printing, etc
             *  @param  {Boolean}               options.fast    Skip pre-and post-processes
             *  @param  {Object}                activity        see activity-schema.common.js
             *  @param  {Boolean}               isTest          True if validation only, activity.status will not be changed
             *  @param  {Function}              callback        Of the form fn( err, newState )
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
    '0.0.1', { requires: ['activity-schema'] }
);