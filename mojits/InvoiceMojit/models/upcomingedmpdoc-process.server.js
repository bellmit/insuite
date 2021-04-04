/**
 * User: oliversieweke
 * Date: 21.09.18  17:23
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/

YUI.add( 'upcomingedmpdoc-process', function( Y, NAME ) {
        /**
         * @module upcomingedmpdoc-process
         */

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        /**
         * @class upcomingedmpdoc
         * @namespace doccirrus.schemaprocess
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {
            pre: [
                {
                    run: [
                        Y.doccirrus.filtering.models.upcomingedmpdoc.resultFilters[0]
                    ], forAction: 'write'
                },
                {
                    run: [
                        Y.doccirrus.filtering.models.upcomingedmpdoc.resultFilters[0]
                    ], forAction: 'delete'
                }
            ],
            post: [],
            audit: {},

            processQuery: Y.doccirrus.filtering.models.upcomingedmpdoc.processQuery,
            processAggregation: Y.doccirrus.filtering.models.upcomingedmpdoc.processAggregation,

            name: NAME
        };

    },
    '0.0.1', {
        requires: []
    }
);