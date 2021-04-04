/**
 * User: strix
 * Date: 06/02/18
 * (c) 2018, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'v_percentilecurve-schema', function( Y, NAME ) {

        'use strict';

        var
        // ------- Schema definitions  -------
            i18n = Y.doccirrus.i18n,
            types = {},
            medDataTypes = Y.doccirrus.schemas.v_meddata.percentileCurveDataTypes;

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
                        "type": "VPercentileCurve_T",
                        "lib": types
                    }
                },
                "VPercentileCurveMedDataItem_T": {
                    "category": {
                        "type": "String",
                        "default": "PERCENTILECURVE",
                        "required": true,
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'activity-schema.MedData_T.category.i18n' ),
                        "-en": i18n( 'activity-schema.MedData_T.category.i18n' ),
                        "-de": i18n( 'activity-schema.MedData_T.category.i18n' )
                    },
                    "Base": {
                        "complex": "ext",
                        "type": "MedDataItem_T",
                        "lib": "activity"
                    }
                },
                "PercentileCurveActType_E": {
                    "type": "String",
                    "default": "PERCENTILECURVE",
                    "apiv": { v:2, queryParam: true },
                    "list": [
                        {
                            "val": "PERCENTILECURVE",
                            "-de": "Perzentilenkurven",
                            i18n: i18n( 'activity-schema.Activity_E.PERCENTILECURVE' ),
                            "-en": "Percentilecurve"
                        }
                    ]
                },
                "VPercentileCurve_T": {
                    "actType": {
                        "complex": "eq",
                        "type": "PercentileCurveActType_E",
                        "lib": types,
                        "apiv": { v:2, queryParam: false },
                        "required": true
                    },
                    "medData": {
                        "complex": "inc",
                        "type": "VPercentileCurveMedDataItem_T",
                        "apiv": { v: 2, queryParam: false },
                        "lib": types
                    },
                    "activityBase": {
                        "complex": "ext",
                        "type": "Activity_T",
                        "lib": "activity"
                    },
                    "Base": {
                        "complex": "ext",
                        "type": "PercentileCurve_T",
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

            medDataTypes: medDataTypes
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'activity-schema',
            'v_meddata-schema'
        ]
    }
);
