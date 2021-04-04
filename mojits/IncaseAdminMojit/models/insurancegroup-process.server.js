/**
 * User: do
 * Date: 22.10.18  19:13
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'insurancegroup-process', function( Y, NAME ) {

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        /**
         *
         * v.0. presents an array of pre process functions &
         *      an array of post-process functions.
         *
         * @Class kvcmessage-process
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            pre: [
                {
                    run: [
                        // Y.doccirrus.auth.getCollectionAccessChecker( 'write', 'insurancegroup' )
                    ], forAction: 'write'
                },
                {
                    run: [
                        // Y.doccirrus.auth.getCollectionAccessChecker( 'delete', 'insurancegroup' )
                    ], forAction: 'delete'
                }
            ],
            post: [
                {
                    run: [], forAction: 'write'
                }
            ],
            audit: {
                descrFn: function( data ) {
                    const itemsStr = (data.items || []).map( item => {
                        const contentStr = (item.content || []).map( function( content ) {
                            return content.name;
                        } ).join( '; ' );
                        return `${item.serialNo}: ${contentStr}`;
                    } ).join( ', ' );
                    return `${data.name}: ${itemsStr}\n`;
                }

            },

            name: NAME
        };

    },
    '0.0.1', {requires: ['insurancegroup-schema']}
);
