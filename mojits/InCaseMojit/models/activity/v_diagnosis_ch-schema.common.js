/*global YUI*/
YUI.add( 'v_diagnosis_ch-schema', function( Y, NAME ) {

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
                        "type": "VDiagnosis_T",
                        "lib": types
                    }
                },
                "DiagnosisActType_E": {
                    "type": "String",
                    "default": "DIAGNOSIS",
                    "apiv": { v:2, queryParam: true },
                    "list": [
                        {
                            "val": "DIAGNOSIS",
                            "-de": "Diagnose",
                            i18n: i18n( 'activity-schema.Activity_E.DIAGNOSIS' ),
                            "-en": "Diagnosis"
                        }

                    ]
                },
                "VDiagnosis_T": {
                    "actType": {
                        "complex": "eq",
                        "type": "DiagnosisActType_E",
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
                    "Base": {
                        "complex": "ext",
                        "type": "Diagnosis_T",
                        "lib": "activity"
                    },
                    "catalogBase": {
                        "complex": "ext",
                        "type": "Catalog_T",
                        "lib": "activity"
                    },
                    "diagnosis_CH": {
                        "complex": "ext",
                        "type": "Diagnosis_CH_T",
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

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true, 'CH' );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'activity-schema'
        ]
    }
);
