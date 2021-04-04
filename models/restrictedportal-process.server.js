/**
 * User: pi
 * Date: 19/08/16  16:45
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

// New pattern for cascading pre and post processes.
// automatically called by the DB Layer before any
// mutation (CUD, excl R) is called on a data item.

YUI.add( 'restrictedportal-process', function( Y, NAME ) {
        /**
         * The DC Restricted portal data schema definition
         *
         * @module restrictedportal
         */

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        /**
         * Class Practice Processes --
         *
         * v.0. presents an array of pre process functions &
         *      an array of post-process functions.
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            pre: [
                {run: [
                ], forAction: 'write'}
            ],

            name: NAME
        };

    },
    '0.0.1', {requires: []}
);
