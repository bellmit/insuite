/**
 * User: ma
 * Date: 26/06/14  15:37
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


// New pattern for cascading pre and post processes.
// automatically called by the DB Layer before any
// mutation (CUD, excl R) is called on a data item.

YUI.add( 'dummy-process', function( Y, NAME ) {

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        function myPre1( user, doc, callback ) {
            // if( doc.originalData_ ) {
                // console.log( 'Can access original Data: ' + doc.originalData_.additional1 );
            // }
            doc.lastname += ', myPre1';
            Y.log( 'after myPre1: ' + JSON.stringify( doc.toObject ? doc.toObject() : doc ) );
            setTimeout( function() {
                callback( null, doc );
            }, 20 );
        }

        function myPre2( user, doc, callback ) {
            doc.lastname += ', myPre2';
            Y.log( 'after myPre2: ' + JSON.stringify( doc.toObject ? doc.toObject() : doc ) );
            callback( null, doc );
        }

        function myErrorPre( user, doc, callback ) {
            if( doc.originalData_ && doc.originalData_.additional2 === 'ERROR') {
                Y.log( 'Passing back error: ' );
                callback( Y.doccirrus.errors.rest( 4005, doc.originalData_.additional1, true ) );
                return;
            }
            callback( null, doc );
        }

        function myPost( user, data, callback ) {
            if( data ) {
                data.firstname = 'YYYYYYY';
            }
            callback( null, data );
        }

        /**
         *
         * v.0. presents an array of pre process functions &
         *      an array of post-process functions.
         *
         * @Class RepetitionProcess
         */
        NAME = Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            pre: [
                {run: [myPre1, myPre2, myErrorPre], forAction: 'all'}
            ],
            post: [
                {run: [myPost], forAction: 'read'}

            ],
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
                 * @param   {Object}      data
                 * @returns {*|string|string}
                 */
                descrFn: function( data ) {
                    return data.firstname + ' ' + data.lastname || "Eintrag ohne Titel";
                }

            },

            name: NAME
        };

    },
    '0.0.1', {requires: []}
);
