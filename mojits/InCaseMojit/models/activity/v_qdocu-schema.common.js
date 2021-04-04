/**
 * User: sabine.gottfried
 * Date: 22.01.21  16:08
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */

YUI.add( 'v_qdocu-schema', function( Y, NAME ) {

        'use strict';

        var
            // ------- Schema definitions  -------
            // i18n = Y.doccirrus.i18n,
            types = {};

        Y.log( 'Loading Schema ' + NAME, 'debug', NAME);

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * This is a virtual schema and
         * does not actually have a collection related
         * to it in the DB.
         */
        types = Y.mix( types,
            {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "VQDocu_T",
                        "lib": types
                    }
                },
                "QDocuActType_E": {
                    "type": "String",
                    "default": "QDOCU",
                    "apiv": { v:2, queryParam: true },
                    "list": [
                        {
                            "val": "QDOCU",
                            "-de": "QDOCU",
                            "-en": "QDOCU"
                        }
                    ]
                },
                "VQDocu_T": {
                    "actType": {
                        "complex": "eq",
                        "type": "QDocuActType_E",
                        "lib": types,
                        "apiv": { v:2, queryParam: false },
                        "required": true
                    },
                    status: {
                        "type": "string",
                        "apiv": { v:2, queryParam: true },
                        "-en": "The status of an activity is read-only. Using this parameter in POST / PUT has no effect."
                    },
                    "activityBase": {
                        "complex": "ext",
                        "type": "Activity_T",
                        "lib": "activity"
                    },
                    "BaseEDOC_BASE_T": {
                        "complex": "ext",
                        "type": "EDOC_BASE_T",
                        "lib": "activity"
                    },
                    "Base": {
                        "complex": "ext",
                        "type": "QDOCU_T",
                        "lib": "activity"
                    },
                    "BaseDMP_BASE_T": {
                         "complex": "ext",
                         "type": "DMP_BASE_T",
                         "lib": "activity"
                    }
                }
            }
        );

        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            /* MANDATORY */
            name: NAME,

            /* MANDATORY */
            types: types

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );

    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'activity-schema'
        ]
    }
);