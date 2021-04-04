/**
 * User: pi
 * Date: 18/01/2016  13:45
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'v_kbvutility-schema', function( Y, NAME ) {

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
                        "type": "VKBVUtility_T",
                        "lib": types
                    }
                },
                "KBVUtilityActType_E": {
                    "type": "String",
                    "default": "KBVUTILITY",
                    "apiv": {v: 2, queryParam: false},
                    "list": [
                        {
                            "val": "KBVUTILITY",
                            "-de": "Heilmittel",
                            i18n: i18n( 'activity-schema.Activity_E.KBVUTILITY' ),
                            "-en": "Utility"
                        }
                    ]
                },
                "VKBVUtility_T": {
                    "activityBase": {
                        "complex": "ext",
                        "type": "Activity_T",
                        "lib": "activity"
                    },
                    "Base": {
                        "complex": "ext",
                        "type": "KBVUtility_T",
                        "lib": "activity"
                    },
                    "BaseKbvUtility": {
                        "complex": "ext",
                        "type": "KBVUtility_T",
                        "lib": "activity"
                    },
                    "BaseUtility": {
                        "complex": "ext",
                        "type": "Utility_T",
                        "lib": "activity"
                    },
                    "BaseCatalog": {
                        "complex": "ext",
                        "type": "Catalog_T",
                        "lib": "activity"
                    },
                    "BasePrescription": {
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
            types: types,

            ramlConfig: {
                // REST API v2. parameters
                "2": {
                    description: "Utility type activities represent 'Heilmittel'. These are prescriptions from three particular catalogs. The REST API currently does not allow access to these catalogs, and it is up to the caller to enter the correct courses of treatment."
                }
            }

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
