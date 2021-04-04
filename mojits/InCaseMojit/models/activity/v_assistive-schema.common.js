/**
 * User: pi
 * Date: 20/01/2016  14:00
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'v_assistive-schema', function( Y, NAME ) {

        'use strict';

        var
        // ------- Schema definitions  -------
            i18n = Y.doccirrus.i18n,
            ramlConfig = {
                // REST API v2. parameters
                "2": {
                    description: "Assistive type activities represent 'Hilfsmittel', e.g. assId '100.99.0.2990'. These may be prescribed from a catalog. The REST API currently does not allow access to catalogs, and it is up to the caller to enter the correct prescriptions (assId code and descriptions)."
                }
            },
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
                        "type": "VAssistive_T",
                        "lib": types
                    }
                },
                "AssistiveActType_E": {
                    "type": "String",
                    "default": "ASSISTIVE",
                    "apiv": { v:2, queryParam: true },
                    "list": [
                        {
                            "val": "ASSISTIVE",
                            "-de": "Hilfsmittel",
                            i18n: i18n( 'activity-schema.Activity_E.ASSISTIVE' ),
                            "-en": "Assistive"
                        }
                    ]
                },
                "VAssistive_T": {
                    "actType": {
                        "complex": "eq",
                        "type": "AssistiveActType_E",
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
                        "type": "Assistive_T",
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
            types: types,

            ramlConfig: ramlConfig

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
