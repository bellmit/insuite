/**
 * User: strix
 * Date: 05/10/17
 * (c) 2017, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'v_gravidogramm-schema', function( Y, NAME ) {

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
                        "type": "VGravidogramm_T",
                        "lib": types
                    }
                },
                "GravidogrammActType_E": {
                    "type": "String",
                    "default": "GRAVIDOGRAMM",
                    "apiv": { v:2, queryParam: true },
                    "list": [
                        {
                            "val": "GRAVIDOGRAMM",
                            "-de": "Gravidogramm",
                            i18n: i18n( 'activity-schema.Activity_E.GRAVIDOGRAMM' ),
                            "-en": "Gravidogramm"
                        }
                    ]
                },
                "VGravidogramm_T": {
                    "actType": {
                        "complex": "eq",
                        "type": "GravidogrammActType_E",
                        "lib": types,
                        "apiv": { v:2, queryParam: false },
                        "required": true
                    },
                    "activityBase": {
                        "complex": "ext",
                        "type": "Activity_T",
                        "lib": "activity"
                    },
                    "Base": {
                        "complex": "ext",
                        "type": "Gravidogramm_T",
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
