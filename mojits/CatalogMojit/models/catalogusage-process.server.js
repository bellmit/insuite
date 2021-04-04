/**
 * User: pi
 * Date: 09/02/2015  13:30
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'catalogusage-process', function( Y, NAME ) {

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        /**
         * Updates tag collection
         * @param {Object} user
         * @param {Object} catalogusage
         * @param {Function} callback
         */
        function updateTags( user, catalogusage, callback ) {
            let
                oldTags,
                currentTags = catalogusage.tags || [];
            if( catalogusage.wasNew ) {
                oldTags = [];
            } else {
                oldTags = catalogusage.originalData_ && catalogusage.originalData_.tags || [];
            }
            Y.doccirrus.api.tag.updateTags( {
                user,
                data: {
                    documentId: catalogusage._id.toString(),
                    type: Y.doccirrus.schemas.tag.tagTypes.CATALOG,
                    catalogShort: catalogusage.catalogShort,
                    oldTags,
                    currentTags
                },
                callback: function( err ) {
                    callback( err, catalogusage );
                }
            } );
        }

        // workaround @MOJ-6625
        function setIsModified( user, catalogusage, callback ) {
            catalogusage.wasNew = catalogusage.isNew;
            callback( null, catalogusage );
        }

        /**
         * Updates tag collection
         * @param {Object} user
         * @param {Object} catalogusage
         * @param {Function} callback
         */
        function updateTagsOnDelete( user, catalogusage, callback ) {
            let
                oldTags = catalogusage.tags || [],
                currentTags = [];
            Y.doccirrus.api.tag.updateTags( {
                user,
                data: {
                    documentId: catalogusage._id.toString(),
                    type: Y.doccirrus.schemas.tag.tagTypes.CATALOG,
                    catalogShort: catalogusage.catalogShort,
                    oldTags,
                    currentTags
                },
                callback: function( err ) {
                    callback( err, catalogusage );
                }
            } );
        }

        function updateReporting( user, catalogUsage, callback ) {
            let
                syncAuxManager = Y.doccirrus.insight2.syncAuxManager;
            syncAuxManager.auxHook( catalogUsage, 'catalogUsage', user );
            callback( null, catalogUsage );
        }

        function setUnifiedSeq( user, catalogUsage, callback ){
            catalogUsage.unifiedSeq = Y.doccirrus.schemas.catalog.unifySeq( catalogUsage.seq );
            setImmediate( callback, null, catalogUsage );
        }

        /**
         *  Remove references to invoicing or other activities from catalog usages, CCDEV-65
         *
         *  @param {Object} user
         *  @param {Object} catalogusage
         *  @param {Function} callback
         */

        function removeReferences( user, catalogusage, callback ) {
            const
                disallowProperties = [
                    'invoiceId',
                    'invoiceLogId',
                    'invoiceLogType'
                ];
            let k;
            for ( k of disallowProperties ) {
                delete catalogusage[disallowProperties[k]];
            }
            callback( null, catalogusage );
        }

        /**
         * @class catalogusageProcess
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            name: NAME,

            pre: [
                {
                    run: [
                        Y.doccirrus.auth.getCollectionAccessChecker( 'write', 'catalogusage' ),
                        setIsModified,
                        setUnifiedSeq,
                        removeReferences,
                        Y.doccirrus.filtering.models.catalogusage.resultFilters[0]
                    ], forAction: 'write'
                },
                {
                    run: [
                        Y.doccirrus.auth.getCollectionAccessChecker( 'delete', 'catalogusage' ),
                        Y.doccirrus.filtering.models.catalogusage.resultFilters[0]
                    ], forAction: 'delete'
                }
            ],
            post: [
                {
                    run: [
                        Y.doccirrus.filtering.models.catalogusage.resultFilters[0]
                    ], forAction: 'read' },
                {
                    run: [
                        updateReporting,
                        updateTags
                    ], forAction: 'write'
                },
                {
                    run: [
                        updateTagsOnDelete
                    ], forAction: 'delete'
                }
            ],

            processQuery: Y.doccirrus.filtering.models.catalogusage.processQuery,
            processAggregation: Y.doccirrus.filtering.models.catalogusage.processAggregation
        };

    },
    '0.0.1', { requires: [] }
);
