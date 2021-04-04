/*global YUI*/
YUI.add( 'v_ehksd-schema', function( Y, NAME ) {

        'use strict';

        var
        // ------- Schema definitions  -------
            i18n = Y.doccirrus.i18n,
            types = {};

        Y.log( 'Loading Schema ' + NAME, 'debug', NAME );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * MOJ-5065 this is a virtual schema and
         * does not actually have a collection related
         * to it in the DB.
         */
        types = Y.mix( types,
            {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "VEHKSD_T",
                        "lib": types
                    }
                },
                "EHKSDActType_E": {
                    "type": "String",
                    "default": "EHKSD",
                    "apiv": { v:2, queryParam: true },
                    "list": [
                        {
                            "val": "EHKSD",
                            "-de": i18n( 'activity-schema.Activity_E.EHKSD' ),
                            i18n: i18n( 'activity-schema.Activity_E.EHKSD' ),
                            "-en": i18n( 'activity-schema.Activity_E.EHKSD' )
                        }
                    ]
                },
                "VEHKSD_T": {
                    "actType": {
                        "complex": "eq",
                        "type": "EHKSDActType_E",
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
                        "type": "EHKS_D_T",
                        "lib": "activity"
                    },
                    "BaseEHKS_BASE_T": {
                        "complex": "ext",
                        "type": "EHKS_BASE_T",
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
