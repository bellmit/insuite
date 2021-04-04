/**
 * User: pi
 * Date: 21/01/2016  10:40
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'v_dmpdm2-schema', function( Y, NAME ) {

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
                        "type": "VDmpDm2_T",
                        "lib": types
                    }
                },
                "DmpDm2ActType_E": {
                    "type": "String",
                    "default": "DM2",
                    "apiv": { v:2, queryParam: true },
                    "list": [
                        {
                            "val": "DM2",
                            "-de": "Diabetes mellitus Typ II",
                            i18n: i18n( 'activity-schema.Activity_E.DM2' ),
                            "-en": "Diabetes mellitus Typ II"
                        }
                    ]
                },
                "VDmpDm2_T": {
                    "actType": {
                        "complex": "eq",
                        "type": "DmpDm2ActType_E",
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
                        "type": "DM_T",
                        "lib": "activity"
                    },
                    "BaseDM2_T": {
                        "complex": "ext",
                        "type": "DM2_T",
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
