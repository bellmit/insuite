/**
 * User: pi
 * Date: 15/03/2017  08:45
 * (c) 2017, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
'use strict';
YUI.add( 'mirrorscheduletype-schema', function( Y, NAME ) {

        var
            types = {},
            i18n = Y.doccirrus.i18n;

        /**
         * Schema definitions
         * @property types
         * @type {YUI}
         */
        types = Y.mix( types, {
                root: {
                    "base": {
                        "complex": "ext",
                        "type": "MirrorScheduleType_T",
                        "lib": types
                    }
                },
                MirrorScheduleType_T: {
                    "base": {
                        "complex": 'ext',
                        "type": 'ScheduleType_T',
                        "lib": 'scheduletype'
                    },
                    "prcCustomerNo": {
                        "type": "String",
                        i18n: i18n( 'mirrorscheduletype-schema.MirrorScheduleType_T.prcCustomerNo.i18n' ),
                        "-en": i18n( 'mirrorscheduletype-schema.MirrorScheduleType_T.prcCustomerNo.i18n' ),
                        "-de": i18n( 'mirrorscheduletype-schema.MirrorScheduleType_T.prcCustomerNo.i18n' )
                    },
                    "originalId": {
                        type: "ObjectId",
                        i18n: i18n( 'mirrorscheduletype-schema.MirrorScheduleType_T.originalId.i18n' ),
                        "-en": i18n( 'mirrorscheduletype-schema.MirrorScheduleType_T.originalId.i18n' ),
                        "-de": i18n( 'mirrorscheduletype-schema.MirrorScheduleType_T.originalId.i18n' )
                    }
                }
            }
        );
        Y.log( 'Loading Schema ' + NAME, 'debug', NAME );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        Y.namespace( 'doccirrus.schemas' )[ NAME ] = {

            /* MANDATORY */
            name: NAME,

            /* MANDATORY */
            types: types
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[ NAME ], true );
    },
    '0.0.1', { requires: [ 'dcschemaloader', 'scheduletype-schema' ] }
);
