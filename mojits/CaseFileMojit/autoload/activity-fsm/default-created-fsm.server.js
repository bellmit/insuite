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
YUI.add( 'dc-fsm-default-created', function( Y, NAME ) {

        /**
         * @module activity-fsm
         * @submodule dc-fsm-default-created
         * @requires activity-schema
         */

        const
            transitions = Y.doccirrus.schemas.activity.getFSM( NAME );

        /**
         * State machines used for activities that may be stored in the CREATED state,
         * but else behave the same as default activities.
         *
         * @class dc-fsm-meddata
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
             *  @method validate
             *  @param  {Object}                user        REST user or equivalent
             *  @param  {Object}                options     Extra options for event emitters, printing, etc
             *  @param  {Object}                activity    see activity-schema.common.js
             *  @param  {Boolean}               isTest      True if validation only, activity.status will not be changed
             *  @param  {Function}              callback    Of the form fn( err, newState)
             */
            validate: function( user, options, activity, isTest, callback ) {
                var fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                Y.doccirrus.fsm[fsmName].validate( user, options, activity, isTest, callback );
            },

            /**
             *  @method store
             *  @param  {Object}                user        REST user or equivalent
             *  @param  {Object}                options     Extra options for event emitters, printing, etc
             *  @param  {Object}                activity    see activity-schema.common.js
             *  @param  {Boolean}               isTest      True if validation only, activity.status will not be changed
             *  @param  {Function}              callback    Of the form fn( err, newState)
             */
            store: function( user, options, activity, isTest, callback ) {
                var fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                Y.doccirrus.fsm[fsmName].store( user, options, activity, isTest, callback );
            },

            /**
             *  @method validate
             *  @param  {Object}                user        REST user or equivalent
             *  @param  {Object}                options     Extra options for event emitters, printing, etc
             *  @param  {Object}                activity    see activity-schema.common.js
             *  @param  {Boolean}               isTest      True if validation only, activity.status will not be changed
             *  @param  {Function}              callback    Of the form fn( err, newState)
             */
            create: function( user, options, activity, isTest, callback ) {
                var self = this;
                if( !options ) {
                    options = {};
                }
                options.toState = 'CREATED';
                self.store( user, options, activity, isTest, callback );
            },

            /**
             *  @method approve
             *  @param  {Object}                user        REST user or equivalent
             *  @param  {Object}                options     Extra options for event emitters, printing, etc
             *  @param  {Object}                activity    see activity-schema.common.js
             *  @param  {Boolean}               isTest      True if validation only, activity.status will not be changed
             *  @param  {Function}              callback    Of the form fn( err, newState)
             */
            approve: function( user, options, activity, isTest, callback ) {
                var fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                Y.doccirrus.fsm[fsmName].approve( user, options, activity, isTest, callback );
            },

            /**
             *  @method approveandprint
             *  @param  {Object}                user        REST user or equivalent
             *  @param  {Object}                options     Extra options for event emitters, printing, etc
             *  @param  {Object}                activity    see activity-schema.common.js
             *  @param  {Boolean}               isTest      True if validation only, activity.status will not be changed
             *  @param  {Function}              callback    Of the form fn( err, newState)
             */
            approveandprint: function( user, options, activity, isTest, callback ) {
                var fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                Y.doccirrus.fsm[fsmName].approveandprint( user, options, activity, isTest, callback );
            },

            /**
             *  @method delete
             *  @param  {Object}                user        REST user or equivalent
             *  @param  {Object}                options     Extra options for event emitters, printing, etc
             *  @param  {Object}                activity    see activity-schema.common.js
             *  @param  {Boolean}               isTest      True if validation only, activity.status will not be changed
             *  @param  {Function}              callback    Of the form fn( err, newState)
             */
            delete: function( user, options, activity, isTest, callback ) {
                var fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                Y.doccirrus.fsm[fsmName].delete( user, options, activity, isTest, callback );
            },

            /**
             *  @method cancel
             *  @param  {Object}                user        REST user or equivalent
             *  @param  {Object}                options     Extra options for event emitters, printing, etc
             *  @param  {Object}                activity    see activity-schema.common.js
             *  @param  {Boolean}               isTest      True if validation only, activity.status will not be changed
             *  @param  {Function}              callback    Of the form fn( err, newState)
             */
            cancel: function( user, options, activity, isTest, callback ) {
                var fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                Y.doccirrus.fsm[fsmName].cancel( user, options, activity, isTest, callback );
            },

            /**
             *  @method archive
             *  @param  {Object}                user        REST user or equivalent
             *  @param  {Object}                options     Extra options for event emitters, printing, etc
             *  @param  {Object}                activity    see activity-schema.common.js
             *  @param  {Boolean}               isTest      True if validation only, activity.status will not be changed
             *  @param  {Function}              callback    Of the form fn( err, newState)
             */
            archive: function( user, options, activity, isTest, callback ) {
                var fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                Y.doccirrus.fsm[fsmName].archive( user, options, activity, isTest, callback );
            }

        };

    },
    '0.0.1', {
        requires: [
            'activity-schema'
        ]
    }
);