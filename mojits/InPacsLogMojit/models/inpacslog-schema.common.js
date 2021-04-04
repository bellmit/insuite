/**
 * User: abhijit.baldawa
 * Date: 26.10.17  13:21
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'inpacslog-schema', function( Y, NAME ) {

        'use strict';

        var
            // ------- Schema definitions  -------
            types = {},
            i18n = Y.doccirrus.i18n;

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        types = Y.mix( types, {
                'root': {
                    base: {
                        complex: 'ext',
                        type: 'InPacsLog_T',
                        lib: types
                    },
                    abstractBase: {
                        complex: 'ext',
                        type: 'AbstractLog_T',
                        lib: types
                    }
                },
                'AbstractLog_T': {
                    timestamp: {
                        'type': 'Date',
                        '-en': i18n( 'InpacsLogMojit.tabInpacsLogOverview.timestamp' ),
                        '-de': i18n( 'InpacsLogMojit.tabInpacsLogOverview.timestamp' ),
                        i18n: i18n( 'InpacsLogMojit.tabInpacsLogOverview.timestamp' )
                    },

                    created: {
                        'required': true,
                        'type': 'Date',
                        default: Date.now,
                        '-en': i18n( 'InpacsLogMojit.tabInpacsLogOverview.created' ),
                        '-de': i18n( 'InpacsLogMojit.tabInpacsLogOverview.created' ),
                        i18n: i18n( 'InpacsLogMojit.tabInpacsLogOverview.created' )
                    },

                    patientId: {
                        type: 'String',
                        i18n: i18n( 'patienttransfer-schema.PatientTransfer_T.patientId.i18n' ),
                        '-en': 'patientId',
                        '-de': 'patientId'
                    },

                    patientName: {
                        type: 'String',
                        i18n: i18n( 'InpacsLogMojit.tabInpacsLogOverview.patientName' ),
                        '-en': i18n( 'InpacsLogMojit.tabInpacsLogOverview.patientName' ),
                        '-de': i18n( 'InpacsLogMojit.tabInpacsLogOverview.patientName' )
                    },

                    activityId: {
                        type: 'String',
                        i18n: i18n( 'patienttransfer-schema.PatientTransfer_T.activityId.i18n' ),
                        '-en': 'activityId',
                        '-de': 'activityId'
                    },

                    status: {
                        complex: 'eq',
                        type: 'Status_E',
                        lib: types
                    }
                },
                'InPacsLog_T': {

                    user: {
                        'type': 'String',
                        i18n: i18n( 'InpacsLogMojit.tabInpacsLogOverview.user' ),
                        '-en': i18n( 'InpacsLogMojit.tabInpacsLogOverview.user' ),
                        '-de': i18n( 'InpacsLogMojit.tabInpacsLogOverview.user' )
                    },

                    orthancStudyUId: {
                        type: 'String',
                        i18n: i18n( 'InpacsLogMojit.inpacsLogSchema.orthancStudyUId' ),
                        '-en': i18n( 'InpacsLogMojit.inpacsLogSchema.orthancStudyUId' ),
                        '-de': i18n( 'InpacsLogMojit.inpacsLogSchema.orthancStudyUId' )
                    },

                    patientDob: {
                        "type": "Date",
                        i18n: i18n( 'InpacsLogMojit.tabInpacsLogOverview.patientDob' ),
                        "-en": i18n( 'InpacsLogMojit.tabInpacsLogOverview.patientDob' ),
                        "-de": i18n( 'InpacsLogMojit.tabInpacsLogOverview.patientDob' )
                    },

                    patientGender: {
                        type: 'String',
                        i18n: i18n( 'InpacsLogMojit.tabInpacsLogOverview.gender' ),
                        '-en': i18n( 'InpacsLogMojit.tabInpacsLogOverview.gender' ),
                        '-de': i18n( 'InpacsLogMojit.tabInpacsLogOverview.gender' )
                    },

                    g_extra: {
                        "type": "any",
                        i18n: i18n( 'InpacsLogMojit.inpacsLogSchema.extraData' ),
                        "-en": i18n( 'InpacsLogMojit.inpacsLogSchema.extraData' ),
                        "-de": i18n( 'InpacsLogMojit.inpacsLogSchema.extraData' )
                    },

                    external: {
                        type: 'Boolean',
                        i18n: i18n( 'InpacsLogMojit.inpacsLogSchema.external' ),
                        '-en': i18n( 'InpacsLogMojit.inpacsLogSchema.external' ),
                        '-de': i18n( 'InpacsLogMojit.inpacsLogSchema.external' )
                    }
                },

                Status_E: {
                    type: 'String',
                    'default': 'UNPROCESSED',
                    i18n: i18n( 'InpacsLogMojit.tabInpacsLogOverview.status' ),
                    '-en': i18n( 'InpacsLogMojit.tabInpacsLogOverview.status' ),
                    '-de': i18n( 'InpacsLogMojit.tabInpacsLogOverview.status' ),
                    'list': [
                        {
                            'val': 'PROCESSED',
                            i18n: i18n( 'InpacsLogMojit.tabInpacsLogOverview.processed' ),
                            '-de': i18n( 'InpacsLogMojit.tabInpacsLogOverview.processed' ),
                            '-en': i18n( 'InpacsLogMojit.tabInpacsLogOverview.processed' )
                        },
                        {
                            'val': 'UNPROCESSED',
                            i18n: i18n( 'InpacsLogMojit.tabInpacsLogOverview.unprocessed' ),
                            '-de': i18n( 'InpacsLogMojit.tabInpacsLogOverview.unprocessed' ),
                            '-en': i18n( 'InpacsLogMojit.tabInpacsLogOverview.unprocessed' )
                        }
                    ]
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
    '0.0.1', {requires: ['dcvalidations', 'dcschemaloader', 'activity-schema']}
);