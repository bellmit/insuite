/**
 * User: pi
 * Date: 22/01/2016  11:10
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'v_labdata-schema', function( Y, NAME ) {

        'use strict';

        var
        // ------- Schema definitions  -------
            ramlConfig = {
                // REST API v2. parameters
                "2": {
                    description: "Collection of available labdata via REST /2. <br><br>" +
                                 "The endpoint exposes special POST methods <ul>" +
                                 "<li>Get all labdata linked to a specific contract. " +
                                 "It requires to hand over a patientId. " +
                                 "Other query parameters are free to choose. E.g.<br>" +
                                 "<pre>/2/labdata/:getActivitiesLinkedToContract <br>" +
                                 "POST { patientId:\"5dfd3210b832a21249999234\", _id:\"5afd4c40b83294c249999999\" }</pre></li>" +
                                 "</ul>"
                }
            },
            i18n = Y.doccirrus.i18n,
            types = {},
            labDataTypes = Object.freeze( {
                'HBA1C_PERCENT': 'HBA1C_PERCENT',
                'HBA1C_MMOLMOL': 'HBA1C_MMOLMOL',
                'LEGFR': 'LEGFR',
                'LDL_MGDL': 'LDL_MGDL',
                'LDL_MMOL': 'LDL_MMOL',
                'URIN': 'URIN'
            } );

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
                        "type": "VLabData_T",
                        "lib": types
                    }
                },
                "LabDataActType_E": {
                    "type": "String",
                    "default": "LABDATA",
                    "apiv": { v:2, queryParam: true },
                    "list": [
                        {
                            "val": "LABDATA",
                            "-de": "Labordaten",
                            i18n: i18n( 'activity-schema.Activity_E.LABDATA' ),
                            "-en": "labdata"
                        }
                    ]
                },
                "VLabData_T": {
                    "actType": {
                        "complex": "eq",
                        "type": "LabDataActType_E",
                        "lib": types,
                        "apiv": { v:2, queryParam: false },
                        "required": true
                    },
                    "labEntries": {
                        "type": "Object",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'activity-schema.Activity_T.labEntries.i18n' ),
                        "-en": "Simplified Lab Data",
                        "-de": "Labordaten"
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
                        "type": "LabData_T",
                        "lib": "activity"
                    },
                    "laborBase":{
                        "complex": "ext",
                        "type": "Labor_T",
                        "lib": "activity"
                    }
                }
            }
        );

        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            ramlConfig: ramlConfig,

            /* MANDATORY */
            name: NAME,

            /* MANDATORY */
            types: types,
            labDataTypes: labDataTypes

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
