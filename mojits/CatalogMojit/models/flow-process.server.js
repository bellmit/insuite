/**
 * User: pi
 * Date: 04/09/2015  14:10
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'flow-process', function( Y, NAME ) {

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        function runFileWatcher( user, flow, callback ) {
            if( flow.sources && flow.sources[0] && Y.doccirrus.schemas.v_flowsource.resourceTypes.FILE === flow.sources[0].resourceType ) {
                Y.doccirrus.api.flow.runFileWatcher();
            }
            callback( null, flow );
        }

        /**
         * @class flowProcess
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            name: NAME,

            pre: [],
            post: [
                {run: [
                    runFileWatcher
                ], forAction: 'write'}
            ],
            audit: {},
            processQuery: Y.doccirrus.filtering.models.catalogusage.processQuery,
            processAggregation: Y.doccirrus.filtering.models.catalogusage.processAggregation
        };

    },
    '0.0.1', {requires: [ 'v_flowsource-schema','flow-api']}
);
