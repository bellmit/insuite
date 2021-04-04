/**
 * User: pi
 * Date: 17/02/16  16:10
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'v_invoice-schema', function( Y, NAME ) {

        'use strict';

        var
        // ------- Schema definitions  -------
            i18n = Y.doccirrus.i18n,
            ramlConfig = {
                // REST API v2. parameters
                "2": {
                    description: "Returns all requested invoice activity types. When an invoice is posted into the system using this method in v.4.0, additional manual intervention is still required to create a PDF for the invoice and get an invoice number from the system."
                }
            },
            types = {};

        Y.log( 'Loading Schema ' + NAME, 'debug', NAME );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        types = Y.mix( types,
            {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "VInvoice_T",
                        "lib": types
                    }
                },
                "InvoiceActType_E": {
                    "type": "String",
                    "default": "INVOICE",
                    "apiv": { v:2, queryParam: true },
                    "list": [
                        {
                            "val": "INVOICE",
                            "-de": "Rechnung",
                            i18n: i18n( 'activity-schema.Activity_E.INVOICE' ),
                            "-en": "Invoice"
                        }
                    ]
                },
                "VInvoice_T": {
                    "actType": {
                        "complex": "eq",
                        "type": "InvoiceActType_E",
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
                        "type": "Invoice_T",
                        "lib": "activity"
                    },
                    "billingBase": {
                        "complex": "ext",
                        "type": "BillingTrackSchein_T",
                        "lib": "activity"
                    },
                    "priceBase": {
                        "complex": "ext",
                        "type": "Price_T",
                        "lib": "activity"
                    },
                    "hasDiagnosisBase": {
                        "complex": "ext",
                        "type": "HasDiagnosis_T",
                        "lib": "activity"
                    },
                    "putOnHoldBase": {
                        "complex": "ext",
                        "type": "PutOnHold_T",
                        "lib": "activity"
                    },
                    "invoiceLogId" : {
                        "type": "String"
                    },
                    "blockApprove": {
                        "type": "Boolean"
                    },
                    "scheinId": {
                        "type": "String"
                    },
                    "medidataRejected": {
                        "type": "Boolean"
                    }
                }
            }
        );

        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            /* MANDATORY */
            name: NAME,

            /* MANDATORY */
            types: types,

            ramlConfig: ramlConfig

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
