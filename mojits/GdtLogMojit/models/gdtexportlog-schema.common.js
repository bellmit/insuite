/**
 * User: abhijit.baldawa
 * Date: 13.07.18  11:06
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'gdtexportlog-schema', function( Y, NAME ) {

        'use strict';

        var
            // ------- Schema definitions  -------
            types = {},
            i18n = Y.doccirrus.i18n,
            transformerTypes = Object.freeze( {
                GDTSTUDY: 'GDTSTUDY',
                GDTPATIENT: 'GDTPATIENT',
                GDTVIEW: 'GDTVIEW'
            } );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        function createSchemaTransformerList() {
            var
                result = [];

            Object.keys( transformerTypes ).forEach( function( type ) {
                result.push( {
                    val: transformerTypes[type],
                    i18n: i18n( 'flow-schema.TransformerType_E.' + transformerTypes[type] + '.i18n' ),
                    '-en': i18n( 'flow-schema.TransformerType_E.' + transformerTypes[type] + '.i18n' ),
                    '-de': i18n( 'flow-schema.TransformerType_E.' + transformerTypes[type] + '.i18n' )
                } );
            } );
            return result;
        }

        types = Y.mix( types, {
                'root': {
                    abstractBase: {
                        complex: 'ext',
                        type: 'AbstractLog_T',
                        lib: 'inpacslog'
                    },
                    base: {
                        complex: 'ext',
                        type: 'GdtExportLog_T',
                        lib: types
                    }
                },
                TransformerType_E: {
                    type: 'String',
                    list: createSchemaTransformerList(),
                    i18n: i18n('GdtLogMojit.gdtExportLogSchema.transformer'),
                    '-en': i18n('GdtLogMojit.gdtExportLogSchema.transformer'),
                    '-de': i18n('GdtLogMojit.gdtExportLogSchema.transformer')
                },
                'GdtExportLog_T': {
                    user: {
                        'type': 'String',
                        i18n: i18n( 'InpacsLogMojit.tabInpacsLogOverview.user' ),
                        '-en': i18n( 'InpacsLogMojit.tabInpacsLogOverview.user' ),
                        '-de': i18n( 'InpacsLogMojit.tabInpacsLogOverview.user' )
                    },
                    fileHash: {
                        'type': 'String',
                        i18n: i18n( 'GdtLogMojit.gdtLogSchema.fileHashText' ),
                        '-en': i18n( 'GdtLogMojit.gdtLogSchema.fileHashText' ),
                        '-de': i18n( 'GdtLogMojit.gdtLogSchema.fileHashText' )
                    },
                    flowTitle: {
                        'type': 'String',
                        i18n: i18n( 'GdtLogMojit.gdtLogSchema.flowTitle' ),
                        '-en': i18n( 'GdtLogMojit.gdtLogSchema.flowTitle' ),
                        '-de': i18n( 'GdtLogMojit.gdtLogSchema.flowTitle' )
                    },
                    transformerType: {
                        complex: 'eq',
                        type: 'TransformerType_E',
                        lib: types
                    },
                    fileDownloadUrl: {
                        'type': 'String',
                        i18n: i18n( 'GdtLogMojit.gdtLogSchema.fileDownloadUrlText' ),
                        '-en': i18n( 'GdtLogMojit.gdtLogSchema.fileDownloadUrlText' ),
                        '-de': i18n( 'GdtLogMojit.gdtLogSchema.fileDownloadUrlText' )
                    }
                }
            }
        );

        /**
         * Class REST Schemas
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            /* MANDATORY */
            name: NAME,

            /* MANDATORY */
            types: types
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {requires: ['dcvalidations', 'dcschemaloader', 'activity-schema', 'inpacslog-schema']}
);
