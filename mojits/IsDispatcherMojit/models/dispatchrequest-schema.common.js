/**
 * User: MD
 * Date: 18/02/2016  13:06
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'dispatchrequest-schema', function( Y, NAME ) {

        'use strict';

        var
        // ------- Schema definitions  -------
            types = {},

            ramlConfig = {
                // REST API v2. parameters
                "2": {
                    description: "The dispatcher request sends a limited collection of activities to the dispatcher for further routing." +
                                 "The allowed types are listed in the JSON Schema definition. This API has no effect on data safes, or MVPRC servers."
                }
            },
            i18n = Y.doccirrus.i18n;

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        types = Y.mix( types, {
            'root': {
                base: {
                    complex: 'ext',
                    type: 'DispatchRequest_T',
                    "apiv": {v: 2, queryParam: false},
                    lib: types
                }
            },
            "DispatchRequest_T": {
                bsnr: {
                    type: 'String',
                    i18n: i18n( 'dispatchrequest-schema.DispatchRequest_T.BSNR' ),
                    "apiv": {v: 2, queryParam: true},
                    "-de": "BSNR",
                    "-en": "BSNR"
                },
                lanr: {
                    type: 'String',
                    i18n: i18n( 'dispatchrequest-schema.DispatchRequest_T.LANR' ),
                    "apiv": {v: 2, queryParam: true},
                    "-de": "LANR",
                    "-en": "LANR"
                },
                employeeId: {
                    type: 'String',
                    i18n: i18n( 'dispatchrequest-schema.DispatchRequest_T.EmployeeId' ),
                    "-de": "Employee Id",
                    "-en": "Mitarbeiter ID"
                },
                patientId: {
                    type: 'String',
                    i18n: i18n( 'dispatchrequest-schema.DispatchRequest_T.PatientId' ),
                    "apiv": {v: 2, queryParam: false},
                    "-de": "Patienten Id",
                    "-en": "Patient ID"
                },
                dispatchActivities: {
                    "-de": "Einträge",
                    "-en": "Activities",
                    complex: 'inc',
                    type: 'DispatchActivity_T',
                    lib: types
                },
                createdDate: {
                    type: 'Date',
                    required: true,
                    default: Date.now,
                    i18n: i18n( 'dispatchrequest-schema.DispatchRequest_T.createdDate' ),
                    "-en": "When",
                    "-de": "Wann"
                },
                dateConfirmed: {
                    type: 'Date',
                    i18n: i18n( 'dispatchrequest-schema.DispatchRequest_T.dateConfirmed' ),
                    "-en": "Confirmed when",
                    "-de": "Bestätigt Wann"
                },
                status: {
                    "-de": "Status",
                    "-en": "Status",
                    complex: 'eq',
                    type: 'Status_E',
                    lib: types
                },
                comment: {
                    type: 'String',
                    i18n: i18n( 'dispatchrequest-schema.DispatchActivity_T.comment' ),
                    "apiv": {v: 2, queryParam: false},
                    "-de": "Comment",
                    "-en": "Kommentar"
                },
                careTitle: {
                    type: 'String',
                    i18n: i18n( 'dispatchrequest-schema.DispatchRequest_T.careTitle' ),
                    "apiv": {v: 2, queryParam: false},
                    "-de": "careTitle",
                    "-en": "careTitle"
                },
                carePhone: {
                    type: 'String',
                    i18n: i18n( 'dispatchrequest-schema.DispatchRequest_T.carePhone' ),
                    "apiv": {v: 2, queryParam: false},
                    "-de": "carePhone",
                    "-en": "carePhone"
                }
            },
            DispatchActivity_T: {
                activityId: {
                    type: 'String',
                    i18n: i18n( 'dispatchrequest-schema.DispatchActivity_T.id' ),
                    "-de": "Aufgabe Id",
                    "-en": "Entry Id"

                },
                actType: {
                    complex: 'eq',
                    type: 'DispatchActType_E',
                    lib: types,
                    "apiv": {v: 2, queryParam: false},
                    "-de": "Typ",
                    "-en": "Type"
                },
                prescriptionDate: {
                    type: 'Date',
                    i18n: i18n( 'dispatchrequest-schema.DispatchActivity_T.prescriptionDate' ),
                    "apiv": {v: 2, queryParam: false},
                    "-en": "Prescripton Date",
                    "-de": "Verordnung Datum"
                },
                fileName: {
                    type: 'String',
                    i18n: i18n( 'dispatchrequest-schema.DispatchActivity_T.fileName' ),
                    "apiv": {v: 2, queryParam: false},
                    "-de": "PDF Dateiname",
                    "-en": "PDF Filename"
                },
                fileContentBase64: {
                    type: 'String',
                    i18n: i18n( 'dispatchrequest-schema.DispatchActivity_T.fileContentBase64' ),
                    "apiv": {v: 2, queryParam: false},
                    "-de": "File Content",
                    "-en": "File Content"
                },
                fileDocumentId: {
                    type: 'String',
                    i18n: i18n( 'dispatchrequest-schema.DispatchActivity_T.fileDocumentId' ),
                    "-de": "Document Id",
                    "-en": "Document Id"
                },
                activities: {
                    "-de": "Einträge",
                    "-en": "Activities",
                    "apiv": {v: 2, queryParam: false},
                    complex: 'inc',
                    type: 'Activity_T',
                    lib: types
                },
                notifiedActivities: {
                    "-de": "Verständigen Einträge",
                    "-en": "Notified Activities",
                    complex: 'inc',
                    type: 'Activity_T',
                    lib: types
                }
            },
            Activity_T: {
                activityId: {
                    type: ['String'],
                    i18n: i18n( 'dispatchrequest-schema.Activity_T.id' ),
                    "-de": "Aufgabe Id",
                    "-en": "Entry Id"
                },
                actType: {
                    complex: 'eq',
                    type: 'DispatchActivitiesType_E',
                    lib: types,
                    "apiv": {v: 2, queryParam: false},
                    "-de": "Typ",
                    "-en": "Type"
                },
                codePZN: {
                    type: 'String',
                    i18n: i18n( 'dispatchrequest-schema.Activity_T.codePZN' ),
                    "apiv": {v: 2, queryParam: false},
                    "-de": "Code PZN",
                    "-en": "Code PZN"
                },
                codeHMV: {
                    type: 'String',
                    i18n: i18n( 'dispatchrequest-schema.Activity_T.codeHMV' ),
                    "apiv": {v: 2, queryParam: false},
                    "-de": "Code HMV",
                    "-en": "Code HMV"
                },
                note: {
                    type: 'String',
                    i18n: i18n( 'dispatchrequest-schema.Activity_T.note' ),
                    "apiv": {v: 2, queryParam: false},
                    "-de": "Notiz",
                    "-en": "Note"
                },
                dose: {
                    type: 'String',
                    i18n: i18n( 'dispatchrequest-schema.Activity_T.dose' ),
                    "apiv": {v: 2, queryParam: false},
                    "-de": "Dosis",
                    "-en": "Dose"
                },
                quantity: {
                    type: 'Number',
                    "apiv": {v: 2, queryParam: false},
                    "-de": "Menge",
                    "-en": "Quantity"
                },
                prescPeriod: {
                    type: 'String',
                    i18n: i18n( 'dispatchrequest-schema.Activity_T.prescPeriod' ),
                    "apiv": {v: 2, queryParam: false},
                    "-de": "Verordnungszeitraum",
                    "-en": "Prescription Period"
                },
                valid: {
                    type: 'Boolean',
                    default: true,
                    i18n: i18n( 'dispatchrequest-schema.Activity_T.valid' ),
                    '-en': 'valid',
                    '-de': 'valid'
                }
            },
            Status_E: {
                type: 'Number',
                "apiv": {v: 2, queryParam: false},
                'list': [
                    {
                        'val': 0,
                        i18n: i18n( 'dispatchrequest-schema.Status_E.INVALID' ),
                        "apiv": {v: 2, queryParam: false},
                        "-de": "Ungültig",
                        "-en": "Invalid"
                    },
                    {
                        'val': 1,
                        i18n: i18n( 'dispatchrequest-schema.Status_E.PROCESSED' ),
                        "apiv": {v: 2, queryParam: false},
                        "-de": "Bearbeitet",
                        "-en": "Processed"
                    },
                    {
                        'val': 2,
                        i18n: i18n( 'dispatchrequest-schema.Status_E.CONFIRMED' ),
                        "apiv": {v: 2, queryParam: false},
                        "-de": "Angenommen",
                        "-en": "Confirmed"
                    },
                    {
                        'val': 3,
                        i18n: i18n( 'dispatchrequest-schema.Status_E.IRRELEVANT' ),
                        "apiv": {v: 2, queryParam: false},
                        "-de": "Unerheblich",
                        "-en": "Irrelevant"
                    }
                ]
            },
            "DispatchActType_E": {
                "type": "String",
                i18n: i18n( 'dispatchrequest-schema.DispatchActivity_T.actType' ),
                "apiv": {v: 2, queryParam: true},
                "list": [
                    {
                        "val": "PRESASSISTIVE",
                        "-de": "Rezept H",
                        i18n: i18n( 'activity-schema.Activity_E.PRESASSISTIVE' ),
                        "-en": "Rezept H"
                    },
                    {
                        "val": "PUBPRESCR",
                        "-de": "Kassenrezept",
                        i18n: i18n( 'activity-schema.Activity_E.PUBPRESCR' ),
                        "-en": "Public Prescription"
                    },
                    {
                        "val": "COMMUNICATION",
                        "-de": "Kommunikation",
                        i18n: i18n( 'activity-schema.Activity_E.COMMUNICATION' ),
                        "-en": "Communication"
                    },
                    {
                        "val": "UTILITY",
                        "-de": "Heilmittel",
                        i18n: i18n( 'activity-schema.Activity_E.UTILITY' ),
                        "-en": "Assistive Prescription"
                    },
                    {
                        "val": "PROCESS",
                        "-de": "Vorgang",
                        i18n: i18n( 'activity-schema.Activity_E.PROCESS' ),
                        "-en": "Process"
                    }

                ]
            },
            "DispatchActivitiesType_E": {
                "type": "String",
                i18n: i18n( 'dispatchrequest-schema.DispatchActivity_T.actType' ),
                "apiv": {v: 2, queryParam: true},
                "list": [
                    {
                        "val": "DIAGNOSIS",
                        "-de": "Diagnose",
                        i18n: i18n( 'activity-schema.Activity_E.UTILITY' ),
                        "-en": "Diagnosis"
                    }
                ]
            }
        } );

        /**
         * Class REST Schemas
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            ramlConfig: ramlConfig,

            /* MANDATORY */
            name: NAME,

            /* MANDATORY */
            types: types

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {requires: ['dcvalidations', 'dcschemaloader']}
)
;
