/**
 * User: pi
 * Date: 17/02/2016  14:30
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'v_prescription-schema', function( Y, NAME ) {

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
                        "type": "VPrescription_T",
                        "lib": types
                    }
                },
                "PrescriptionActType_E": {
                    "type": "String",
                    "default": "PRIVPRESCR",
                    "apiv": { v:2, queryParam: true },
                    "list": [
                        {
                            "val": "PRIVPRESCR",
                            "-de": "Privatrezept",
                            i18n: i18n( 'activity-schema.Activity_E.PRIVPRESCR' ),
                            "-en": "Prescription"
                        },
                        {
                            "val": "PUBPRESCR",
                            "-de": "Kassenrezept",
                            i18n: i18n( 'activity-schema.Activity_E.PUBPRESCR' ),
                            "-en": "Public Prescription"
                        },
                        {
                            "val": "PRESCRBTM",
                            "-de": "Rezept BTM",
                            i18n: i18n( 'activity-schema.Activity_E.PRESCRBTM' ),
                            "-en": "BTM Prescription"
                        },
                        {
                            "val": "PRESCRG",
                            "-de": "Rezept G",
                            i18n: i18n( 'activity-schema.Activity_E.PRESCRG' ),
                            "-en": "G Prescription"
                        },
                        {
                            "val": "PRESCRT",
                            "-de": "Rezept T",
                            i18n: i18n( 'activity-schema.Activity_E.PRESCRT' ),
                            "-en": "T Prescription"
                        },
                        {
                            "val": "LONGPRESCR",
                            "-de": "Dauerrezept",
                            i18n: i18n( 'activity-schema.Activity_E.LONGPRESCR' ),
                            "-en": "Long prescription"
                        }
                    ]
                },
                "VPrescription_T": {
                    "actType": {
                        "complex": "eq",
                        "type": "PrescriptionActType_E",
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
                    "hasDiagnosisBase": {
                        "complex": "ext",
                        "type": "HasDiagnosis_T",
                        "lib": "activity"
                    },
                    "Base": {
                        "complex": "ext",
                        "type": "Prescription_T",
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
