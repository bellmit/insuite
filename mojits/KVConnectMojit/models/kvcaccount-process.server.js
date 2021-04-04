/**
 * User: do
 * Date: 21.08.19  13:15
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'kvcaccount-process', function( Y, NAME ) {

        // const {formatPromiseResult} = require( 'dc-core' ).utils;

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        async function cleanFiles( user, account, callback ) {
            await Y.doccirrus.kvcAccountUtils.cleanFiles( user, account );
            callback( null, account );
        }

        /**
         *
         * v.0. presents an array of pre process functions &
         *      an array of post-process functions.
         *
         * @Class kvcaccount-process
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            pre: [
                {
                    run: [
                        Y.doccirrus.auth.getCollectionAccessChecker( 'write', 'kvcaccount' )
                        // checkCertificateOfNewlyCreatedAccounts
                    ], forAction: 'write'
                },
                {
                    run: [
                        Y.doccirrus.auth.getCollectionAccessChecker( 'delete', 'kvcaccount' )
                    ], forAction: 'delete'
                }
            ],
            post: [
                {
                    run: [], forAction: 'write'
                },
                {
                    run: [cleanFiles], forAction: 'delete'
                }

            ],
            audit: {},// TODO: kvc add audit?

            name: NAME
        };

    },
    '0.0.1', {
        requires: [
            'kvcaccount-schema',
            'kvcaccount-utils'

            // @see https://confluence.intra.doc-cirrus.com/display/SD/YUI+Dependencies
            // 'dcauth',
            // 'dcschemaloader'
        ]
    }
);
