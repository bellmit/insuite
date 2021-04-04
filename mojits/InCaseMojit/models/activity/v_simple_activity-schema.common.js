/**
 * User: rrrw
 * Date: 19/11/2015  15:45
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'v_simple_activity-schema', function( Y, NAME ) {

        'use strict';

        var
        // ------- Schema definitions  -------
            ramlConfig = {
                // REST API v2. parameters
                "2": {
                    description: "Collection of available simple_activities via REST /2. <br><br>" +
                                 "Simple_activities are defined already by the most basic set of parameters. " +
                                 "These are, e.g., " +
                                 "FINDING, HISTORY, EXTERNAL, COMMUNICATION, CONTACT, ... <br><br>" +
                                 "The endpoint exposes special POST methods <ul>" +
                                 "<li>Get get all activities linked to a specific contract. " +
                                 "It requires to hand over a patientId. " +
                                 "Other query parameters are free to choose. E.g.<br>" +
                                 "<pre>/2/simple_activity/:getActivitiesLinkedToContract <br>" +
                                 "POST { patientId:\"5dfd3210b832a21249999234\", _id:\"5afd4c40b83294c249999999\" }</pre></li>" +
                                 "<li>Initialize a form for any given activity. " +
                                 "It requires to hand over an activityId. " +
                                 "The activity needs to exist, and either have a default form defined " +
                                 "for the specific activity type, " +
                                 "or a formId and optionally a formVersion set. E.g.<br>" +
                                 "<pre>/2/simple_activity/:initializeFormForActivity <br>" +
                                 "POST { _id:\"5afd4c40b83294c249123456\" }</pre></li>" +
                                 "</ul>"
                }
            },
            i18n = Y.doccirrus.i18n,
            types = {};

        Y.log( 'Loading Schema ' + NAME, 'debug', NAME );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        types = Y.mix( types,
            {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "VSimpleActivity_T",
                        "lib": types
                    }
                },
                "SimpleActivityActType_E": {
                    "type": "String",
                    //"default": "HISTORY",
                    "apiv": { v:2, queryParam: true },
                    "list": [
                        {
                            "val": "CAVE",
                            "-de": i18n( 'activity-schema.Activity_E.CAVE' ),
                            i18n: i18n( 'activity-schema.Activity_E.CAVE' ),
                            "-en": i18n( 'activity-schema.Activity_E.CAVE' )
                        },
                        {
                            "val": "HISTORY",
                            "-de": "Anamnese",
                            i18n: i18n( 'activity-schema.Activity_E.HISTORY' ),
                            "-en": "History"
                        },
                        {
                            "val": "EXTERNAL",
                            "-de": "Extern",
                            i18n: i18n( 'activity-schema.Activity_E.EXTERNAL' ),
                            "-en": "External"
                        },
                        {
                            "val": "FINDING",
                            "-de": "Befund",
                            i18n: i18n( 'activity-schema.Activity_E.FINDING' ),
                            "-en": "Finding"
                        },
                        {
                            "val": "PREVENTION",
                            "-de": "Prävention",
                            i18n: i18n( 'activity-schema.Activity_E.PREVENTION' ),
                            "-en": "Prevention"
                        },
                        {
                            "val": "PROCEDERE",
                            "-de": "Procedere",
                            i18n: i18n( 'activity-schema.Activity_E.PROCEDERE' ),
                            "-en": "Procedere"
                        },
                        {
                            "val": "THERAPY",
                            "-de": "Therapie",
                            i18n: i18n( 'activity-schema.Activity_E.THERAPY' ),
                            "-en": "Therapy"
                        },
                        /*
                        {
                            "val": "REMINDER",
                            "-de": "Erinnerung",
                            i18n: i18n( 'activity-schema.Activity_E.REMINDER' ),
                            "-en": "Reminder"
                        },
                        {
                            "val": "CREDITNOTE",
                            "-de": "Gutschrift",
                            i18n: i18n( 'activity-schema.Activity_E.CREDITNOTE' ),
                            "-en": "Credit note"
                        },
                        {
                            "val": "WARNING1",
                            "-de": "Mahnung 1",
                            i18n: i18n( 'activity-schema.Activity_E.WARNING1' ),
                            "-en": "Warning 1"
                        },
                        {
                            "val": "WARNING2",
                            "-de": "Mahnung 2",
                            i18n: i18n( 'activity-schema.Activity_E.WARNING2' ),
                            "-en": "Warning 2"
                        },
                        */
                        {
                            "val": "COMMUNICATION",
                            "-de": "Kommunikation",
                            i18n: i18n( 'activity-schema.Activity_E.COMMUNICATION' ),
                            "-en": "Communication"
                        },
                        {
                            "val": "PROCESS",
                            "-de": "Vorgang",
                            i18n: i18n( 'activity-schema.Activity_E.PROCESS' ),
                            "-en": "Other Process"
                        },
                        {
                            "val": "CONTACT",
                            "-de": "Kontakt",
                            i18n: i18n( 'activity-schema.Activity_E.CONTACT' ),
                            "-en": "Contact"
                        },
                        {
                            "val": "FROMPATIENT",
                            "-de": "Patientenformular",
                            i18n: i18n( 'activity-schema.Activity_E.FROMPATIENT' ),
                            "-en": "From patient"
                        },
                        {
                            "val": "FROMPATIENTMEDIA",
                            "-de": "Patientendatei",
                            i18n: i18n( 'activity-schema.Activity_E.FROMPATIENTMEDIA' ),
                            "-en": "From patient"
                        },
                        {
                            "val": "TELECONSULT",
                            "-de": "Telekonsil",
                            i18n: i18n( 'activity-schema.Activity_E.TELECONSULT' ),
                            "-en": "Teleconsult"
                        },
                        {
                            "val": "MEDICATIONPLAN",
                            "-de": i18n( 'activity-schema.Activity_E.MEDICATIONPLAN' ),
                            i18n: i18n( 'activity-schema.Activity_E.MEDICATIONPLAN' ),
                            "-en": i18n( 'activity-schema.Activity_E.MEDICATIONPLAN' )
                        },
                        {
                            "val": "GRAVIDOGRAMM",
                            "-de": i18n( 'activity-schema.Activity_E.GRAVIDOGRAMM' ),
                            i18n: i18n( 'activity-schema.Activity_E.GRAVIDOGRAMM' ),
                            "-en": i18n( 'activity-schema.Activity_E.GRAVIDOGRAMM' )
                        },
                        {
                            "val": "DOCLETTERDIAGNOSIS",
                            "-de": i18n( 'activity-schema.Activity_E.DOCLETTERDIAGNOSIS' ),
                            i18n: i18n( 'activity-schema.Activity_E.DOCLETTERDIAGNOSIS' ),
                            "-en": i18n( 'activity-schema.Activity_E.DOCLETTERDIAGNOSIS' )
                        },
                        {
                            "val": "DOCLETTER",
                            "-de": "Arztbrief",
                            i18n: i18n( 'activity-schema.Activity_E.DOCLETTER' ),
                            "-en": "Doctors' letter"
                        },
                        {
                            "val": "LONGPRESCR",
                            "-de": "Dauerrezept",
                            i18n: i18n( 'activity-schema.Activity_E.LONGPRESCR' ),
                            "-en": "Long prescription"
                        },
                        {
                            "val": "PRIVPRESCR",
                            "-de": "Privatrezept",
                            i18n: i18n( 'activity-schema.Activity_E.PRIVPRESCR' ),
                            "-en": "Prescription"
                        },
                        {
                            "val": "PUBPRESCR",
                            "-de": "Kassenrezept",
                            i18n: i18n( 'activity-schema.Activity_E.PUBPRESCR' ),
                            "-en": "Public Prescription"
                        },
                        {
                            "val": "FORM",
                            i18n: i18n( 'document-schema.DocType_E.FORM' ),
                            "-en": "Form",
                            "-de": "Formular"
                        },
                        {
                            "val": "THERAPYSTEP",
                            i18n: i18n( 'activity-schema.Activity_E.THERAPYSTEP' )
                        },
                        {
                            "val": "STOCKDISPENSE",
                            "-de": i18n( 'activity-schema.Activity_E.STOCKDISPENSE' ),
                            i18n: i18n( 'activity-schema.Activity_E.STOCKDISPENSE' ),
                            "-en": i18n( 'activity-schema.Activity_E.STOCKDISPENSE' )
                        },
                        {
                            "val": "VACCINATION",
                            "-de": i18n( 'activity-schema.Activity_E.VACCINATION' ),
                            i18n: i18n( 'activity-schema.Activity_E.VACCINATION' ),
                            "-en": i18n( 'activity-schema.Activity_E.VACCINATION' )
                        },
                        {
                            "val": "QDOCU",
                            "-de": i18n( 'activity-schema.Activity_E.QDOCU' ),
                            i18n: i18n( 'activity-schema.Activity_E.QDOCU' ),
                            "-en": i18n( 'activity-schema.Activity_E.QDOCU' )
                        }
                    ]
                },
                "VSimpleActivity_T": {
                    "actType": {
                        "complex": "eq",
                        "type": "SimpleActivityActType_E",
                        "lib": types,
                        "apiv": { v:2, queryParam: true },
                        "required": true
                    },
                    "Base": {
                        "complex": "ext",
                        "type": "Activity_T",
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

            getSimpleActivityList: function() {
                return types.SimpleActivityActType_E.list;
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
