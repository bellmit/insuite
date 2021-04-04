/**
 * User: rrrw
 * Date: 19/11/2015  15:45
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'v_diagnosis-schema', function( Y, NAME ) {

        'use strict';

        var
        // ------- Schema definitions  -------
            ramlConfig = {
                // REST API v2. parameters
                "2": {
                    description: "Collection of available diagnoses via REST /2. <br><br>" +
                                 "The endpoint exposes special POST methods <ul>" +
                                 "<li>Get all diagnoses linked to a specific contract. " +
                                 "It requires to hand over a patientId. " +
                                 "Other query parameters are free to choose. E.g.<br>" +
                                 "<pre>/2/diagnosis/:getActivitiesLinkedToContract <br>" +
                                 "POST { patientId:\"5dfd3210b832a21249999234\", _id:\"5afd4c40b83294c249999999\" }</pre></li>" +
                                 "</ul>"
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
                        "type": "VDiagnosis_T",
                        "lib": types
                    }
                },
                "DiagnosisActType_E": {
                    "type": "String",
                    "default": "DIAGNOSIS",
                    "apiv": { v:2, queryParam: true },
                    "list": [
                        {
                            "val": "DIAGNOSIS",
                            "-de": "Diagnose",
                            i18n: i18n( 'activity-schema.Activity_E.DIAGNOSIS' ),
                            "-en": "Diagnosis"
                        }

                    ]
                },
                "VDiagnosis_T": {
                    "actType": {
                        "complex": "eq",
                        "type": "DiagnosisActType_E",
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
                        "type": "Diagnosis_T",
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

            ramlConfig: ramlConfig,

            /* MANDATORY */
            name: NAME,

            /* MANDATORY */
            types: types

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true, 'D' );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'activity-schema'
        ]
    }
);
