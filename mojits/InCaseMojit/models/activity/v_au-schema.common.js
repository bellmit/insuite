/**
 * User: pi
 * Date: 21/01/2016  10:40
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'v_au-schema', function( Y, NAME ) {

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
                        "type": "VAu_T",
                        "lib": types
                    }
                },
                "AuActType_E": {
                    "type": "String",
                    "default": "AU",
                    "apiv": { v:2, queryParam: true },
                    "list": [
                        {
                            "val": "AU",
                            "-de": "AU",
                            i18n: i18n( 'activity-schema.Activity_E.AU' ),
                            "-en": "AU",
                            "-de-ch": "AUF"
                        }
                    ]
                },
                "VAu_T": {
                    "actType": {
                        "complex": "eq",
                        "type": "AuActType_E",
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
                        "type": "AU_T",
                        "lib": "activity"
                    },
                    "prescriptionBase": {
                        "complex": "ext",
                        "type": "Prescription_T",
                        "lib": "activity"
                    },
                    "hasDiagnosisBase": {
                        "complex": "ext",
                        "type": "HasDiagnosis_T",
                        "lib": "activity"
                    },
                    "formExtraContact": {
                        "complex": "ext",
                        "type": "FormExtraContact_T",
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
