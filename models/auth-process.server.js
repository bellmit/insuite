/**
 * User: ma
 * Date: 27/05/14  15:37
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


/*global YUI */
'use strict';

// New pattern for cascading pre and post processes.
// automatically called by the DB Layer before any
// mutation (CUD, excl R) is called on a data item.

YUI.add( 'auth-process', function( Y, NAME ) {

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        /**
         *
         * v.0. presents an array of pre process functions &
         *      an array of post-process functions.
         *
         * @Class AuthProcess
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            audit: {
                // audit: {}  switches on auditing.  for no auditing, do not include the "audit" parameter

                /**
                 * optional:  true = in addition to regular auditing note down actions
                 * on this model that were attempted as well as ones that failed.
                 * Descr. in this case will always be "Versuch".
                 *
                 * false = note down only things that actually took place,
                 * not attempts that failed
                 */
                noteAttempt: false,

                /**
                 * optional: here we can override what is shown in the audit log description
                 * only used when the action succeeds (see noteAttempt)
                 *
                 * @param data
                 * @returns {*|string|string}
                 */
                descrFn: function() {
                    return 'login';
                }

            },

            name: NAME
        };

    },
    '0.0.1', {requires: []}
);
