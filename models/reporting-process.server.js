/**
 * User: do
 * Date: 27/04/18  14:17
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'reporting-process', function( Y, NAME ) {
        /**
         * The DC Restricted portal data schema definition
         *
         * @module reporting
         */

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        /**
         * Class reporting Processes --
         *
         * v.0. presents an array of pre process functions &
         *      an array of post-process functions.
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            pre: [
                {
                    run: [], forAction: 'write'
                }
            ],
            processQuery: Y.doccirrus.filtering.models.reporting.processQuery,
            processAggregation: Y.doccirrus.filtering.models.reporting.processAggregation,

            name: NAME
        };

    },
    '0.0.1', {requires: []}
);
