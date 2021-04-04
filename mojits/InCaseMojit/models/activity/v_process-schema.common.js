/*global YUI*/
YUI.add( 'v_process-schema', function( Y, NAME ) {

        'use strict';

        var
            // ------- Schema definitions  -------
            i18n = Y.doccirrus.i18n,
            types = {};

        Y.log( 'Loading Schema ' + NAME, 'debug', NAME );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        types = Y.mix( types,
            {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "VProcess_T",
                        "lib": types
                    }
                },
                "ProcessActType_E": {
                    "type": "String",
                    "default": "PROCESS",
                    "apiv": {v: 2, queryParam: true},
                    "list": [
                        {
                            "group": "PROCESSES",
                            "functionality": "sd1",
                            "val": "PROCESS",
                            "-de": "Vorgang",
                            i18n: i18n( 'activity-schema.Activity_E.PROCESS' ),
                            "-en": "Other Process"
                        }
                    ]
                },
                "VProcess_T": {
                    "actType": {
                        "complex": "eq",
                        "type": "ProcessActType_E",
                        "lib": types,
                        "apiv": {v: 2, queryParam: false},
                        "required": true
                    },
                    "activityBase": {
                        "complex": "ext",
                        "type": "Activity_T",
                        "lib": "activity"
                    },
                    "Base": {
                        "complex": "ext",
                        "type": "Measurement_T",
                        "lib": "activity"
                    },
                    "catalogBase": {
                        "complex": "ext",
                        "type": "Catalog_T",
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
