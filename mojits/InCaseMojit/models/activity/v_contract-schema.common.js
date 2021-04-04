/**
 * User: rrrw
 * Date: 02/06/2015  15:45
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global YUI*/

'use strict';

YUI.add( 'v_contract-schema', function( Y, NAME ) {

        var
        // ------- Schema definitions  -------
            ramlConfig = {
                // REST API v2. parameters
                "2": {
                    description: "Collection of available contracts via REST /2. <br><br>" +
                                 "The contract is needed for any sort of invoicing. The contract type " +
                                 "provided specifies which insurance status of the patient is used  " +
                                 "  SCHEIN - PUBLIC | " +
                                 "  PKVSCHEIN - PRIVATE | " +
                                 "  SZSCHEIN - SELFPAYER | " +
                                 "  BGSCHEIN - BG     " +
                                 "Note -- The SZSCHEIN psuedo-activity type for contracts. When " +
                                 "this type is used, a SELFPAYER casefolder is added, although " +
                                 "the contract is of type PKVSCHEIN. <br><br>" +
                                 "The endpoint exposes special POST methods <ul>" +
                                 "<li>Get all activities linked to a specific contract. " +
                                 "It requires to hand over a patientId. " +
                                 "Other query parameters are free to choose. E.g.<br>" +
                                 "<pre>/2/contract/:getLinkedActivities <br>" +
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
                        "type": "Contract_T",
                        "lib": types
                    }
                },
                "ScheinActType_E": {
                    "type": "String",
                    "default": "SCHEIN",
                    "apiv": { v:2, queryParam: true },
                    "list": [
                        {
                            "val": "SCHEIN",
                            "-de": "Schein",
                            i18n: i18n( 'activity-schema.Activity_E.SCHEIN' ),
                            "-en": "Schein Received"
                        },
                        {
                            "val": "PKVSCHEIN",
                            "-de": "Privat Schein",
                            i18n: i18n( 'activity-schema.Activity_E.PKVSCHEIN' ),
                            "-en": "Private schein Received"
                        },
                        {
                            "val": "SZSCHEIN",
                            "-de": "Selbstzahler Schein",
                            i18n: i18n( 'person-schema.Insurance_E.SELFPAYER' ),
                            "-en": "Selfpayer"
                        },
                        {
                            "val": "BGSCHEIN",
                            "-de": "BG Schein",
                            i18n: i18n( 'activity-schema.Activity_E.BGSCHEIN' ),
                            "-en": "BG schein Received"
                        },
                        {
                            "val": "AMTSSCHEIN",
                            "-de": "Amts Schein",
                            i18n: i18n( 'activity-schema.Activity_E.AMTSSCHEIN' ),
                            "-en": "Amts schein Received"
                        }
                    ]
                },
                "Contract_T": {
                    "actType": {
                        "complex": "eq",
                        "type": "ScheinActType_E",
                        "lib": types,
                        "apiv": { v:2, queryParam: true },
                        "required": true
                    },
                    status: {
                        "type": "string",
                        "apiv": { v:2, queryParam: true },
                        "-en": "The status of an activity is read-only. Using this parameter in POST / PUT has no effect."
                    },
                    activityId: {
                        "type": "string",
                        "apiv": { v:2, queryParam: true }
                    },
                    "activityBase": {
                        "complex": "ext",
                        "type": "Activity_T",
                        "lib": "activity"
                    },
                    "billingBase": {
                        "complex": "ext",
                        "type": "BillingTrackSchein_T",
                        "lib": "activity"
                    },
                    "scheinBase": {
                        "complex": "ext",
                        "type": "Schein_T",
                        "lib": "activity"
                    },
                    "base_BGSchein_T": {
                        "complex": "ext",
                        "type": "BGSchein_T",
                        "lib": "activity"
                    },
                    "scheinGKVBase": {
                        "complex": "ext",
                        "type": "GKVSchein_T",
                        "lib": "activity"
                    },
                    "diagBase": {
                        "complex": "ext",
                        "type": "HasDiagnosis_T",
                        "lib": "activity"
                    },
                    "base_HasUvGoaeType_T": {
                        "complex": "ext",
                        "type": "HasUvGoaeType_T",
                        "lib": "activity"
                    },
                    "base_AMTSSchein_T": {
                        "complex": "ext",
                        "type": "AMTSSchein_T",
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

            scheinActTypes: types.ScheinActType_E.list.map( function( item ) {
                return item.val;
            } )

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'billing-schema',
            'activity-schema'
        ]
    }
);
