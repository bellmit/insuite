/*global YUI */
YUI.add( 'billing-schema', function( Y, NAME ) {

        'use strict';

        /**
         * The billing_T entry schema,
         *
         * @module 'billing-schema'
         */

        var
            types = {},
            i18n = Y.doccirrus.i18n,

            // ------- Schema definitions  -------
            ramlConfig = {
                // REST API v2. parameters
                "2": {
                    description: "Only for MTS systems. It gathers some information in master tenant"
                }
            },

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "billing_T",
                        "lib": types
                    }
                },
                "billing_T": {
                    "practiceName": {
                        "type": "String",
                        i18n: i18n( 'person-schema.Company_T.coname' ),
                        "apiv": { v: 2, queryParam: false },
                        "-en": "practiceName",
                        "-de": "practiceName"
                    },
                    "practiceId": {
                        "type": "String",
                        i18n: i18n( 'person-schema.Company_T.customerNo' ),
                        "apiv": { v: 2, queryParam: false },
                        "-en": "practiceId",
                        "-de": "practiceId"
                    },
                    "patientId": {
                        "required": true,
                        "type": "String",
                        "apiv": {v: 2, queryParam: true},
                        i18n: i18n( 'activity-schema.Activity_T.patientId.i18n' ),
                        "-en": "Patient ID",
                        "-de": "Patienten-ID"
                    },
                    "patientFirstName": {
                        "default": "",
                        "type": "String",
                        "apiv": {v: 2, queryParam: true},
                        "required": true,
                        "validate": "kbv.Person_T_firstname",
                        i18n: i18n( 'person-schema.Person_T.firstname.i18n' ),
                        "-en": "First Name",
                        "-de": "Vorname"
                    },
                    "patientLastName": {
                        "default": "",
                        "type": "String",
                        "apiv": {v: 2, queryParam: true},
                        "required": true,
                        "validate": "kbv.Person_T_lastname",
                        i18n: i18n( 'person-schema.Person_T.lastname.i18n' ),
                        "-en": "Last Name",
                        "-de": "Nachname"
                    },
                    "patientAge": {
                        "default": "",
                        "type": "Number",
                        "apiv": {v: 2, queryParam: true},
                        i18n: i18n( 'person-schema.Person_T.lastname.i18n' ),
                        "-en": "Age",
                        "-de": "Alter"
                    },
                    "patientGender": {
                        "default": "",
                        "type": "String",
                        "apiv": {v: 2, queryParam: true},
                        i18n: i18n( 'person-schema.Person_T.lastname.i18n' ),
                        "-en": "Gender",
                        "-de": "Geschlecht"
                    },
                    "employeeName": {
                        "default": "",
                        "type": "String",
                        "apiv": {v: 2, queryParam: true},
                        i18n: i18n( 'person-schema.Person_T.lastname.i18n' ),
                        "-en": "Doctor Name",
                        "-de": "Arzt Name"
                    },
                    "explanations": {
                        "default": "",
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'activity-schema.Treatment_T.fk5038.i18n' ),
                        "-en": "Explanations",
                        "-de": "Begründungen"
                    },
                    "factors": {
                        "default": "",
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'activity-schema.Treatment_T.billingFactorValue.i18n' ),
                        "-en": "Factors",
                        "-de": "Faktoren"
                    },

                    "patientDOB": {
                        "required": true,
                        "type": "Date",
                        "apiv": {v: 2, queryParam: false},
                        "validate": "Patient_T_dob",
                        i18n: i18n( 'patient-schema.Patient_T.dob' ),
                        "-en": "Date of Birth",
                        "-de": "Geburtsdatum"
                    },
                    "orderNo": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: true},
                        "-en": "Order Number",
                        "-de": "Order Number"
                    },
                    "invoiceNo": {
                        "type": "String",
                        i18n: i18n( 'activity-schema.Invoice_T.invoiceNo.i18n' ),
                        "apiv": {v: 2, queryParam: true},
                        "-en": "Invoice Number",
                        "-de": "Rechnunsnummern"
                    },
                    "timestamp": {
                        "type": "Date",
                        "apiv": {v: 2, queryParam: true},
                        i18n: i18n( 'activity-schema.Activity_T.timestamp.i18n' ),
                        "required": true,
                        "-en": "Date",
                        "-de": "Datum"
                    },
                    "status": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: true },
                        i18n: i18n( 'activity-schema.Activity_T.status.i18n' ),
                        "-en": "status",
                        "-de": "Status"
                    },
                    "insuranceType": {
                        "complex": "eq",
                        "type": "Insurance_E",
                        "apiv": {v: 2, queryParam: false},
                        "lib": 'person'
                    },
                    "insuranceName": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'person-schema.InsuranceStatus_T.insuranceName' ),
                        "-en": "Insurance",
                        "-de": "Kasse"
                    },
                    "medneo_fields": {
                        complex: "ext",
                        "type": "BillingTrackSchein_T",
                        "lib": "activity",
                        "apiv": {v: 2, queryParam: false}
                    },
                    "scheinNotes": {
                        "default": "",
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'activity-schema.Schein_T.scheinNotes.i18n' ),
                        "-en": "Notes",
                        "-de": "Notizen"
                    },
                    "order": {
                        "default": "",
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'activity-schema.Schein_T.scheinOrder.i18n' ),
                        "-en": "Order",
                        "-de": "Auftrag"
                    },
                    "content": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: true},
                        i18n: i18n( 'activity-schema.Activity_T.content.i18n' ),
                        "-en": "content",
                        "-de": "Inhalt"
                    },
                    "comment": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'activity-schema.Activity_T.comment.i18n' ),
                        "-en": "comment",
                        "-de": "Kommentar"
                    },
                    "billingCodes": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: true},
                        i18n: i18n( 'activity-schema.Catalog_T.code.i18n' ),
                        "-en": "code",
                        "-de": "Kode"
                    },
                    "tenantId": {
                        "type": "string",
                        i18n: i18n( 'auth-schema.root.tenantId' ),
                        "-en": "tenantId",
                        "-de": "tenantId"
                    },
                    "treatCost": {
                        "type": "Number",
                        "apiv": {v: 2, queryParam: true},
                        i18n: i18n( 'activity-schema.Price_T.price.i18n' ),
                        "-en": "Service cost",
                        "-de": "Leistungkosten"
                    },
                    "drugCost": {
                        "type": "Number",
                        "apiv": {v: 2, queryParam: true},
                        i18n: i18n( 'activity-schema.Price_T.price.i18n' ),
                        "-en": "Drug cost",
                        "-de": "Medikamentenkosten"
                    },
                    "matCost": {
                        "type": "Number",
                        "apiv": {v: 2, queryParam: true},
                        i18n: i18n( 'activity-schema.Price_T.price.i18n' ),
                        "-en": "Material cost",
                        "-de": "Materialkosten"
                    },
                    "totalCost": {
                        "type": "Number",
                        "apiv": {v: 2, queryParam: true},
                        i18n: i18n( 'activity-schema.Price_T.price.i18n' ),
                        "-en": "Total cost",
                        "-de": "Gesamtkosten"
                    }
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            ramlConfig: ramlConfig,

            types: types,
            indexes: [
                {
                    "key": {
                        "orderNo": 1
                    }
                }
            ],

            name: NAME
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: ['dcschemaloader','person-schema']
    }
);

