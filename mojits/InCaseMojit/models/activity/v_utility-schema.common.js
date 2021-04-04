/**
 * User: pi
 * Date: 18/01/2016  13:45
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'v_utility-schema', function( Y, NAME ) {

        'use strict';

        var
        // ------- Schema definitions  -------
            ramlConfig = {
                // REST API v2. parameters
                "2": {
                    description: "Utility type activities represent 'Heilmittelverordnung'. Utilities are ergotherapy, physiotherapy and logopaedia. " +
                                 "The REST API currently does not allow access to these catalogs, but the API tries to sanitize and " +
                                 "checks validity of transmitted data accoding to the catalog.  The value of " +
                                 "'utIndicationCode' will then be moved to 'comment'. " +
                                 "Utility activities are thus saved with status 'VALID', although the entry cannot produce a valid Prescription (Verordnung).  " +
                                 "This ensures that the user must open the activity and confirm it and thus remains KBV compliant. " +
                                 "This is an exception in the Doc Cirrus inSuite system that caters for REST manipulation of the Utilities.<ul><li>" +
                                 "'utIndicationCode' must be a valid entry " +
                                 "of the 'Heilmittel' catalog, otherwise post will be rejected. " +
                                 "</li><li>Selected utilities (heilmittel) must match catalog entry of 'utIndicationCode' or will be removed and a warning" +
                                 " will be produced. " +
                                 "</li><li>Primary and secondary ICD-10 codes are checked against ICD-10 catalog and will be removed if not found. A warning will also be produced. " +
                                 "</li><li>Furthermore there are checks if an approval for the selected 'utAgreement' type is needed." +
                                 "</li></ul> "
                }
            },
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
                        "type": "VUtility_T",
                        "lib": types
                    }
                },
                "UtilityActType_E": {
                    "type": "String",
                    "default": "KBVUTILITY",
                    "apiv": { v:2, queryParam: false },
                    "list": [
                        {
                            "val": "KBVUTILITY",
                            "-de": "Heilmittel",
                            i18n: i18n( 'activity-schema.Activity_E.KBVUTILITY' ),
                            "-en": "Utility Prescription"
                        },
                        {
                            "val": "UTILITY",
                            "-de": "Alte Heilmittel",
                            i18n: i18n( 'activity-schema.Activity_E.UTILITY' ),
                            "-en": "Old Utility Prescription"
                        }
                    ]
                },
                "UtilityCatalogType_E": {
                    "type": "String",
                    "default": "HMV",
                    "apiv": { v:2, queryParam: false },
                    "list": [
                        {
                            "val": "HMV",
                            "-de": "HMV",
                            "-en": "HMV"
                        }
                    ]
                },
                "SubType_E": {
                    "type": "String",
                    "default": "PHYSIO",
                    "apiv": { v:2, queryParam: false },
                    "list": [
                        {
                            "val": "PHYSIO",
                            "-de": "PHYSIO",
                            "-en": "PHYSIO"
                        },
                        {
                            "val": "LOGO",
                            "-de": "LOGO",
                            "-en": "LOGO"
                        },
                        {
                            "val": "ERGO",
                            "-de": "ERGO",
                            "-en": "ERGO"
                        },
                        {
                            "val": "ET",
                            "-de": "ET",
                            "-en": "ET"
                        }
                    ]
                },
                "VUtility_T": {
                    "actType": {
                        "complex": "eq",
                        "type": "UtilityActType_E",
                        "lib": types,
                        "apiv": { v:2, queryParam: false },
                        "required": true
                    },
                    "catalogShort": {
                        "complex": "eq",
                        "type": "UtilityCatalogType_E",
                        "lib": types,
                        "apiv": { v:2, queryParam: true },
                        "required": true
                    },
                    "subType": {
                        "complex": "eq",
                        "type": "SubType_E",
                        "lib": types,
                        "apiv": { v:2, queryParam: true },
                        "required": true
                    },
                    "activityBase": {
                        "complex": "ext",
                        "type": "Activity_T",
                        "lib": "activity"
                    },
                    "Base": {
                        "complex": "ext",
                        "type": "Utility_T",
                        "lib": "activity"
                    },
                    "Base2": {
                        "complex": "ext",
                        "type": "KBVUtility_T",
                        "lib": "activity"
                    },
                    "hasDiagnosisBase": {
                        "complex": "ext",
                        "type": "HasDiagnosis_T",
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
            ramlConfig: ramlConfig,
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
