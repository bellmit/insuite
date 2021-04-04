/**
 * User: Clemens Büttner
 * Date: 17.04.19  10:03
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */

YUI.add( 'v_dmphgv-schema', function( Y, NAME ) {

        'use strict';

        var
       // ------- Schema definitions  -------
            i18n = Y.doccirrus.i18n,
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
                        "type": "VDmpHgv_T",
                        "lib": types
                    }
                },
                "DmpHgvActType_E": {
                    "type": "String",
                    "default": "HGV",
                    "apiv": { v:2, queryParam: true },
                    "list": [
                        {
                            "val": "HGV",
                            "-de": i18n( 'activity-schema.Activity_E.HGV' ),
                            i18n: i18n( 'activity-schema.Activity_E.HGV' ),
                            "-en": i18n( 'activity-schema.Activity_E.HGV' )
                        },
                        {
                            "val": "HGVK",
                            "-de": i18n( 'activity-schema.Activity_E.HGV' ),
                            i18n: i18n( 'activity-schema.Activity_E.HGV' ),
                            "-en": i18n( 'activity-schema.Activity_E.HGV' )
                        }
                    ]
                },
                "VDmpHgv_T": {
                    "actType": {
                        "complex": "eq",
                        "type": "DmpHgvActType_E",
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
                        "type": "HGV_T",
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