/*global YUI */


YUI.add( 'gkv_deliverysettings-process', function( Y, NAME ) {

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        /**
         *
         * v.0. presents an array of pre process functions &
         *      an array of post-process functions.
         *
         * @Class DeliverysettingsProcess
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            pre: [
                {
                    run: [], forAction: 'write'
                }
            ],
            post: [
                {
                    run: [], forAction: 'write'
                }
            ],

            name: NAME
        };

    },
    '0.0.1', {requires: ['gkv_deliverysettings-schema']}
);
