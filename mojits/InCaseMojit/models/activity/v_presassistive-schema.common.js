/**
 * User: pi
 * Date: 17/02/2016  14:30
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'v_presassistive-schema', function( Y, NAME ) {

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
                        "type": "VPresassistive_T",
                        "lib": types
                    }
                },
                "PresassistiveActType_E": {
                    "type": "String",
                    "default": "PRESASSISTIVE",
                    "apiv": { v:2, queryParam: true },
                    "list": [
                        {
                            "val": "PRESASSISTIVE",
                            "-de": "Rezept H",
                            i18n: i18n( 'activity-schema.Activity_E.PRESASSISTIVE' ),
                            "-en": "Prescription H"
                        }
                    ]
                },
                "VPresassistive_T": {
                    "actType": {
                        "complex": "eq",
                        "type": "PresassistiveActType_E",
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
                        "type": "Prescription_T",
                        "lib": "activity"
                    },
                    "hasDiagnosisBase": {
                        "complex": "ext",
                        "type": "HasDiagnosis_T",
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
