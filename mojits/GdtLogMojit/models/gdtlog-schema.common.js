/**
 * User: abhijit.baldawa
 * Date: 18.06.18  14:00
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'gdtlog-schema', function( Y, NAME ) {

        'use strict';

        var
            // ------- Schema definitions  -------
            types = {},
            i18n = Y.doccirrus.i18n,
            gdtResultMessageObj = Object.freeze( {
                PARSE_ERROR: 'PARSE_ERROR',
                NO_PATIENT_NUM_FOUND_IN_FILE: 'NO_PATIENT_NUM_FOUND_IN_FILE',
                ERROR_CREATING_ACTIVITY: 'ERROR_CREATING_ACTIVITY',
                PATIENT_NOT_FOUND: 'PATIENT_NOT_FOUND',
                SUCCESSFUL: 'SUCCESSFUL',
                /* For GDT file pulled from device server  */
                ERROR_CREATING_ATTACHMENT: 'ERROR_CREATING_ATTACHMENT',
                INVALID_ATTACHMENT: 'INVALID_ATTACHMENT',
                DATABASE_ERROR: 'DATABASE_ERROR'
            } );

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
                        type: 'GdtLog_T',
                        lib: types
                    }
                },
                'GdtLog_T': {
                    user: {
                        'type': 'String',
                        i18n: i18n( 'InpacsLogMojit.tabInpacsLogOverview.user' ),
                        '-en': i18n( 'InpacsLogMojit.tabInpacsLogOverview.user' ),
                        '-de': i18n( 'InpacsLogMojit.tabInpacsLogOverview.user' )
                    },
                    fileSourceType: {
                        complex: 'eq',
                        type: 'FileSourceType_E',
                        lib: types
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
                    fileName: {
                        'type': 'String',
                        i18n: i18n( 'GdtLogMojit.gdtLogSchema.fileNameText' ),
                        '-en': i18n( 'GdtLogMojit.gdtLogSchema.fileNameText' ),
                        '-de': i18n( 'GdtLogMojit.gdtLogSchema.fileNameText' )
                    },
                    fileDownloadUrl: {
                        'type': 'String',
                        i18n: i18n( 'GdtLogMojit.gdtLogSchema.fileDownloadUrlText' ),
                        '-en': i18n( 'GdtLogMojit.gdtLogSchema.fileDownloadUrlText' ),
                        '-de': i18n( 'GdtLogMojit.gdtLogSchema.fileDownloadUrlText' )
                    },
                    gdtResult: {
                        complex: 'eq',
                        type: 'GdtResult_E',
                        lib: types
                    }
                },
                GdtResult_E: {
                    type: 'String',
                    i18n: i18n( 'GdtLogMojit.gdtLogSchema.gdtResultText' ),
                    '-en': i18n( 'GdtLogMojit.gdtLogSchema.gdtResultText' ),
                    '-de': i18n( 'GdtLogMojit.gdtLogSchema.gdtResultText' ),
                    'list': [
                        {
                            'val': gdtResultMessageObj.PARSE_ERROR,
                            i18n: i18n( 'GdtLogMojit.gdtLogStatus.PARSE_ERROR' ),
                            '-de': i18n( 'GdtLogMojit.gdtLogStatus.PARSE_ERROR' ),
                            '-en': i18n( 'GdtLogMojit.gdtLogStatus.PARSE_ERROR' )
                        },
                        {
                            'val': gdtResultMessageObj.NO_PATIENT_NUM_FOUND_IN_FILE,
                            i18n: i18n( 'GdtLogMojit.gdtLogStatus.NO_PATIENT_NUM_FOUND_IN_FILE' ),
                            '-de': i18n( 'GdtLogMojit.gdtLogStatus.NO_PATIENT_NUM_FOUND_IN_FILE' ),
                            '-en': i18n( 'GdtLogMojit.gdtLogStatus.NO_PATIENT_NUM_FOUND_IN_FILE' )
                        },
                        {
                            'val': gdtResultMessageObj.ERROR_CREATING_ACTIVITY,
                            i18n: i18n( 'GdtLogMojit.gdtLogStatus.ERROR_CREATING_ACTIVITY' ),
                            '-de': i18n( 'GdtLogMojit.gdtLogStatus.ERROR_CREATING_ACTIVITY' ),
                            '-en': i18n( 'GdtLogMojit.gdtLogStatus.ERROR_CREATING_ACTIVITY' )
                        },
                        {
                            'val': gdtResultMessageObj.PATIENT_NOT_FOUND,
                            i18n: i18n( 'GdtLogMojit.gdtLogStatus.PATIENT_NOT_FOUND' ),
                            '-de': i18n( 'GdtLogMojit.gdtLogStatus.PATIENT_NOT_FOUND' ),
                            '-en': i18n( 'GdtLogMojit.gdtLogStatus.PATIENT_NOT_FOUND' )
                        },
                        {
                            'val': gdtResultMessageObj.ERROR_CREATING_ATTACHMENT,
                            i18n: i18n( 'GdtLogMojit.gdtLogStatus.ERROR_CREATING_ATTACHMENT' ),
                            '-de': i18n( 'GdtLogMojit.gdtLogStatus.ERROR_CREATING_ATTACHMENT' ),
                            '-en': i18n( 'GdtLogMojit.gdtLogStatus.ERROR_CREATING_ATTACHMENT' )
                        },
                        {
                            'val': gdtResultMessageObj.INVALID_ATTACHMENT,
                            i18n: i18n( 'GdtLogMojit.gdtLogStatus.INVALID_ATTACHMENT' ),
                            '-de': i18n( 'GdtLogMojit.gdtLogStatus.INVALID_ATTACHMENT' ),
                            '-en': i18n( 'GdtLogMojit.gdtLogStatus.INVALID_ATTACHMENT' )
                        },
                        {
                            'val': gdtResultMessageObj.DATABASE_ERROR,
                            i18n: i18n( 'GdtLogMojit.gdtLogStatus.DATABASE_ERROR' ),
                            '-de': i18n( 'GdtLogMojit.gdtLogStatus.DATABASE_ERROR' ),
                            '-en': i18n( 'GdtLogMojit.gdtLogStatus.DATABASE_ERROR' )
                        },
                        {
                            'val': gdtResultMessageObj.SUCCESSFUL,
                            i18n: i18n( 'GdtLogMojit.gdtLogStatus.SUCCESSFUL' ),
                            '-de': i18n( 'GdtLogMojit.gdtLogStatus.SUCCESSFUL' ),
                            '-en': i18n( 'GdtLogMojit.gdtLogStatus.SUCCESSFUL' )
                        }
                    ]
                },
                FileSourceType_E: {
                        type: 'String',
                        i18n: i18n( 'GdtLogMojit.gdtLogSchema.fileSourceType' ),
                        '-en': i18n( 'GdtLogMojit.gdtLogSchema.fileSourceType' ),
                        '-de': i18n( 'GdtLogMojit.gdtLogSchema.fileSourceType' ),
                        'list': [
                            {
                                'val': 'INCOMING',
                                i18n: i18n( 'GdtLogMojit.gdtLogSchema.incoming' ),
                                '-de': i18n( 'GdtLogMojit.gdtLogSchema.incoming' ),
                                '-en': i18n( 'GdtLogMojit.gdtLogSchema.incoming' )
                            },
                            {
                                'val': 'OUTGOING',
                                i18n: i18n( 'GdtLogMojit.gdtLogSchema.outgoing' ),
                                '-de': i18n( 'GdtLogMojit.gdtLogSchema.outgoing' ),
                                '-en': i18n( 'GdtLogMojit.gdtLogSchema.outgoing' )
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
            types: types,

            gdtResultMessageObj: gdtResultMessageObj
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {requires: ['dcvalidations', 'dcschemaloader', 'activity-schema', 'inpacslog-schema']}
);