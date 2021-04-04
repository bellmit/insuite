/**
 * User: strix
 * Date: 06/02/18
 * (c) 2018, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'v_gravidogrammprocess-schema', function( Y, NAME ) {

        'use strict';

        var
        // ------- Schema definitions  -------
            i18n = Y.doccirrus.i18n,
            types = {},
            medDataTypes = Y.doccirrus.schemas.v_meddata.gravidogrammDataTypes;

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
                        "type": "VGravidogrammProcess_T",
                        "lib": types
                    }
                },
                "VGravidogrammProcessMedDataItem_T": {
                    "category": {
                        "type": "String",
                        "default": "GRAVIDOGRAMM",
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
                "GravidogrammProcessActType_E": {
                    "type": "String",
                    "default": "GRAVIDOGRAMMPROCESS",
                    "apiv": { v:2, queryParam: true },
                    "list": [
                        {
                            "val": "GRAVIDOGRAMMPROCESS",
                            "-de": "Gravidogramm Untersuchung",
                            i18n: i18n( 'activity-schema.Activity_E.GRAVIDOGRAMMPROCESS' ),
                            "-en": "Pregnancy checkup"
                        }
                    ]
                },
                "VGravidogrammProcess_T": {
                    "actType": {
                        "complex": "eq",
                        "type": "GravidogrammProcessActType_E",
                        "lib": types,
                        "apiv": { v:2, queryParam: false },
                        "required": true
                    },
                    "medData": {
                        "complex": "inc",
                        "type": "VGravidogrammProcessMedDataItem_T",
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
                        "type": "GravidogrammProcess_T",
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
