/**
 * User: MD
 * Date: 13/12/2018  12:06
 * (c) 2018, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'v_complexprescription-schema', function( Y, NAME ) {

        'use strict';

        var
        // ------- Schema definitions  -------
            types = {},

            ramlConfig = {
                // REST API v2. parameters
                "2": {
                    description: "Create Prescription with Medication"
                }
            },
            i18n = Y.doccirrus.i18n;

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        types = Y.mix( types, {
            'root': {
                base: {
                    complex: 'ext',
                    type: 'ComplexPrescription_T',
                    "apiv": {v: 2, queryParam: false},
                    lib: types
                }
            },
            "ComplexPrescription_T": {
                requestId: {
                    type: 'String',
                    i18n: i18n( 'v_complexprescription-schema.ComplexPrescription_T.requestId' ),
                    "apiv": {v: 2, queryParam: true},
                    "-de": "requestId",
                    "-en": "requestId"
                },
                bsnr: {
                    type: 'String',
                    i18n: i18n( 'v_complexprescription-schema.ComplexPrescription_T.BSNR' ),
                    "apiv": {v: 2, queryParam: false},
                    "-de": "BSNR",
                    "-en": "BSNR"
                },
                lanr: {
                    type: 'String',
                    i18n: i18n( 'v_complexprescription-schema.ComplexPrescription_T.LANR' ),
                    "apiv": {v: 2, queryParam: true},
                    "-de": "LANR",
                    "-en": "LANR"
                },
                locationId: {
                    type: 'String',
                    i18n: i18n( 'v_complexprescription-schema.ComplexPrescription_T.LocationId' ),
                    "apiv": {v: 2, queryParam: false},
                    "-de": "Location Id",
                    "-en": "Betriebsstätte Id"
                },
                employeeId: {
                    type: 'String',
                    i18n: i18n( 'v_complexprescription-schema.ComplexPrescription_T.EmployeeId' ),
                    "apiv": {v: 2, queryParam: false},
                    "-de": "Employee Id",
                    "-en": "Mitarbeiter Id"
                },
                patientId: {
                    type: 'String',
                    i18n: i18n( 'v_complexprescription-schema.ComplexPrescription_T.PatientId' ),
                    "apiv": {v: 2, queryParam: false},
                    "-de": "Patienten Id",
                    "-en": "Patient Id"
                },
                caseFolderId: {
                    type: 'String',
                    i18n: i18n( 'v_complexprescription-schema.ComplexPrescription_T.caseFolderId' ),
                    "apiv": {v: 2, queryParam: false},
                    "-de": "Fall Id",
                    "-en": "Case Folder Id"
                },
                comment: {
                    type: 'String',
                    i18n: i18n( 'dispatchrequest-schema.DispatchActivity_T.comment' ),
                    "apiv": {v: 2, queryParam: false},
                    "-de": "Comment",
                    "-en": "Kommentar"
                },
                dispatchActivities: {
                    "-de": "Einträge",
                    "-en": "Activities",
                    complex: 'inc',
                    type: 'DispatchActivity_T',
                    lib: types
                }
            },
            DispatchActivity_T: {
                activityId: {
                    type: 'String',
                    i18n: i18n( 'v_complexprescription-schema.DispatchActivity_T.id' ),
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
                    i18n: i18n( 'v_complexprescription-schema.DispatchActivity_T.prescriptionDate' ),
                    "apiv": {v: 2, queryParam: false},
                    "-en": "Prescripton Date",
                    "-de": "Verordnung Datum"
                },
                activities: {
                    "-de": "Einträge",
                    "-en": "Activities",
                    "apiv": {v: 2, queryParam: false},
                    complex: 'inc',
                    type: 'Activity_T',
                    lib: types
                }
            },
            Activity_T: {
                activityId: {
                    type: ['String'],
                    i18n: i18n( 'v_complexprescription-schema.Activity_T.id' ),
                    "-de": "Eintrag Id",
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
                    i18n: i18n( 'v_complexprescription-schema.Activity_T.codePZN' ),
                    "apiv": {v: 2, queryParam: false},
                    "-de": "Code PZN",
                    "-en": "Code PZN"
                },
                codeHMV: {
                    type: 'String',
                    i18n: i18n( 'v_complexprescription-schema.Activity_T.codeHMV' ),
                    "apiv": {v: 2, queryParam: false},
                    "-de": "Code HMV",
                    "-en": "Code HMV"
                },
                note: {
                    type: 'String',
                    i18n: i18n( 'v_complexprescription-schema.Activity_T.note' ),
                    "apiv": {v: 2, queryParam: false},
                    "-de": "Notiz",
                    "-en": "Note"
                },
                dose: {
                    type: 'String',
                    i18n: i18n( 'v_complexprescription-schema.Activity_T.dose' ),
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
                    i18n: i18n( 'v_complexprescription-schema.Activity_T.prescPeriod' ),
                    "apiv": {v: 2, queryParam: false},
                    "-de": "Verordnungszeitraum",
                    "-en": "Prescription Period"
                }
            },
            "DispatchActType_E": {
                "type": "String",
                i18n: i18n( 'v_complexprescription-schema.DispatchActivity_T.actType' ),
                "apiv": {v: 2, queryParam: false},
                "list": [
                    {
                        "val": "PUBPRESCR",
                        i18n: i18n( 'activity-schema.Activity_E.PUBPRESCR' ),
                        "-de": "Kassenrezept",
                        "-en": "Public Prescription"
                    }
                ]
            },
            "DispatchActivitiesType_E": {
                "type": "String",
                i18n: i18n( 'v_complexprescription-schema.DispatchActivity_T.actType' ),
                "apiv": {v: 2, queryParam: false},
                "list": [
                    {
                        "val": "MEDICATION",
                        i18n: i18n( 'activity-schema.Activity_E.UTILITY' ),
                        "-de": "Medikament",
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
);
