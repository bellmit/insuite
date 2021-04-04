/**
 * User: florian
 * Date: 03.03.21  09:40
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'kimaccount-process', function( Y, NAME ) {

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        /**
         *
         * v.0. presents an array of pre process functions &
         *      an array of post-process functions.
         *
         * @Class kimaccount-process
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            pre: [
                {
                    run: [
                        Y.doccirrus.auth.getCollectionAccessChecker( 'write', 'kimaccount' )
                    ], forAction: 'write'
                },
                {
                    run: [
                        Y.doccirrus.auth.getCollectionAccessChecker( 'delete', 'kimaccount' )
                    ], forAction: 'delete'
                }
            ],
            post: [
                {
                    run: [], forAction: 'write'
                },
                {
                    run: [], forAction: 'delete'
                }

            ],
            audit: {
                noteAttempt: false,

                attributesExcludingList: ['kimPassword'],

                descrFn: function( data ) {
                    return `Der KIM-Account ${data._doc.kimUsername} wurde aktualisiert.`;
                },

                name: NAME
            },

            name: NAME
        };

    },
    '0.0.1', {requires: ['kimaccount-schema']}
);