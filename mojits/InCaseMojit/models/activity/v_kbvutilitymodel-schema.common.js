/**
 * User: pi
 * Date: 18/01/2016  13:45
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'v_kbvutilitymodel-schema', function( Y, NAME ) {

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
                        "type": "VKBVUtilityModel_T",
                        "lib": types
                    }
                },
                "KBVUtilityActType_E": {
                    "type": "String",
                    "default": "UTILITY",
                    "apiv": {v: 2, queryParam: false},
                    "list": [
                        {
                            "val": "KBVUTILITY",
                            "-de": "Heilmittel",
                            i18n: i18n( 'activity-schema.Activity_E.KBVUTILITY' ),
                            "-en": "Assistive Prescription"
                        }
                    ]
                },
                "VKBVUtilityModel_T": {
                    "actType": {
                        "complex": "eq",
                        "type": "KBVUtilityActType_E",
                        "lib": types,
                        "apiv": {v: 2, queryParam: false},
                        "required": true
                    },
                    "utIndicationCode": {
                        "type": "String",
                        "validate": "kbv.KBVUTILITY_utIndicationCode",
                        i18n: i18n( 'activity-schema.KBVUtility_T.utIndicationCode.i18n' )
                    },
                    "utIcdCode": {
                        "type": "String",
                        "validate": "kbv.KBVUTILITY_utIcdCode",
                        i18n: i18n( 'activity-schema.KBVUtility_T.utIcdCode.i18n' )
                    },
                    "utMedicalJustification": {
                        "type": "String",
                        "validate": "kbv.KBVUTILITY_utMedicalJustification",
                        i18n: i18n( 'activity-schema.Utility_T.utMedicalJustification.i18n' ),
                        "-en": "utMedicalJustification",
                        "-de": "HM Begründung"
                    },
                    "utLatestStartOfTreatment": {
                        "type": "Date",
                        "validate": "kbv.KBVUTILITY_utLatestStartOfTreatment",
                        i18n: i18n( 'activity-schema.Utility_T.utLatestStartOfTreatment.i18n' ),
                        "-en": "utLatestStartOfTreatment",
                        "-de": "HM Behandlungsstart"
                    },
                    "utGroupTherapy": {
                        "type": "Boolean",
                        "validate": "kbv.KBVUTILITY_utGroupTherapy",
                        i18n: i18n( 'activity-schema.Utility_T.utGroupTherapy.i18n' ),
                        "-en": "utGroupTherapy",
                        "-de": "HM Ist Gruppentherapie"
                    },
                    "utPrescriptionType": {
                        "type": "String",
                        "validate": "kbv.KBVUTILITY_utPrescriptionType",
                        i18n: i18n( 'activity-schema.Utility_T.utPrescriptionType.i18n' ),
                        "-en": "utFirstOrFollowing",
                        "-de": "utPrescriptionType"
                    },
                    "utRemedy1Seasons": {
                        "type": "Number",
                        "validate": "kbv.KBVUTILITY_utRemedy1Seasons",
                        i18n: i18n( 'activity-schema.Utility_T.utRemedy1Seasons.i18n' ),
                        "-en": "utRemedy1Seasons",
                        "-de": "HM Sitzungen 1"
                    },
                    "utRemedy2Seasons": {
                        "type": "Number",
                        "validate": "kbv.KBVUTILITY_utRemedy2Seasons",
                        i18n: i18n( 'activity-schema.Utility_T.utRemedy2Seasons.i18n' ),
                        "-en": "utRemedy1Seasons",
                        "-de": "HM Sitzungen 2"
                    },
                    "utRemedy1List": {
                        "complex": "inc",
                        "type": "UtRemedyEntry_T",
                        "lib": 'activity',
                        "validate": "kbv.KBVUTILITY_utRemedy1List",
                        i18n: i18n( 'activity-schema.KBVUtility_T.utRemedy1List.i18n' ),
                        "-en": "Heilmittel 1",
                        "-de": "Heilmittel 1",
                        override: true
                    },
                    "utRemedy2List": {
                        "complex": "inc",
                        "type": "UtRemedyEntry_T",
                        "lib": 'activity',
                        "validate": "kbv.KBVUTILITY_utRemedy2List",
                        i18n: i18n( 'activity-schema.KBVUtility_T.utRemedy1List.i18n' ),
                        "-en": "Heilmittel 2",
                        "-de": "Heilmittel 2",
                        override: true
                    },
                    "activityBase": {
                        "complex": "ext",
                        "type": "Activity_T",
                        "lib": "activity"
                    },
                    "utilityBase": {
                        "complex": "ext",
                        "type": "Utility_T",
                        "lib": "activity"
                    },
                    "catalogBase": {
                        "complex": "ext",
                        "type": "Catalog_T",
                        "lib": "activity"
                    },
                    "PrescriptionBase": {
                        "complex": "ext",
                        "type": "Prescription_T",
                        "lib": "activity"
                    },
                    "kbvutilityBase": {
                        "complex": "ext",
                        "type": "KBVUtility_T",
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
            'kbv-validations',
            'activity-schema'
        ]
    }
);
