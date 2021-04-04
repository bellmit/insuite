/**
 * User: rrrw
 * Date: 16/11/2012  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'devicelog-schema', function( Y, NAME ) {

        'use strict';

        var
            // ------- Schema definitions  -------
            types = {},
            i18n = Y.doccirrus.i18n;

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        types = Y.mix( types, {
                'root': {
                    abstractBase: {
                        complex: 'ext',
                        type: 'AbstractLog_T',
                        lib: 'inpacslog'
                    },
                    base: {
                        complex: 'ext',
                        type: 'DeviceLog_T',
                        lib: types
                    }
                },
                'DeviceLog_T': {
                    deviceId: {
                        type: 'String',
                        i18n: i18n( 'devicelog-schema.DeviceLog_T.patientId.i18n' ),
                        '-en': 'patientId',
                        '-de': 'patientId'
                    },
                    attachedMedia: {
                        "required": true,
                        "complex": "inc",
                        "type": "AttachedMedia_T",
                        "lib": 'activity'
                    },
                    attachments: {
                        "required": true,
                        "type": [String],
                        i18n: i18n( 'devicelog-schema.DeviceLog_T.attachments.i18n' ),
                        "-en": "Attachments",
                        "-de": "Anhänge"
                    },
                    user: {
                        'complex': 'inc',
                        'type': 'EmployeeShort_T',
                        'lib': 'employee',
                        i18n: i18n( 'devicelog-schema.DeviceLog_T.user.i18n' ),
                        '-en': i18n( 'devicelog-schema.DeviceLog_T.user.i18n' ),
                        '-de': i18n( 'devicelog-schema.DeviceLog_T.user.i18n' )
                    },
                    fileName: {
                        'type': 'String',
                        i18n: i18n( 'GdtLogMojit.gdtLogSchema.fileNameText' ),
                        '-en': i18n( 'GdtLogMojit.gdtLogSchema.fileNameText' ),
                        '-de': i18n( 'GdtLogMojit.gdtLogSchema.fileNameText' )
                    },
                    fileHash: {
                        'type': 'String',
                        i18n: i18n( 'GdtLogMojit.gdtLogSchema.fileHashText' ),
                        '-en': i18n( 'GdtLogMojit.gdtLogSchema.fileHashText' ),
                        '-de': i18n( 'GdtLogMojit.gdtLogSchema.fileHashText' )
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
    '0.0.1', {requires: ['dcvalidations', 'dcschemaloader', 'activity-schema', 'employee-schema', 'inpacslog-schema']}
);