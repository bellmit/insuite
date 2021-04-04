/**
 * User: strix
 * Date: 28/08/18
 * (c) 2018, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'v_invoiceref-schema', function( Y, NAME ) {

        'use strict';

        var
        // ------- Schema definitions  -------
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
                        "type": "VInvoiceRef_T",
                        "lib": types
                    }
                },
                "InvoiceRefActType_E": {
                    "type": "String",
                    "default": "INVOICEREF",
                    "apiv": { v:2, queryParam: true },
                    "list": [
                        {
                            "val": "INVOICEREF",
                            "-de": "KVG Abrechnung",
                            i18n: i18n( 'activity-schema.Activity_E.INVOICEREF' ),
                            "-en": "GKV Invoice"
                        }
                    ]
                },
                "VInvoiceRef_T": {
                    "actType": {
                        "complex": "eq",
                        "type": "InvoiceRefActType_E",
                        "lib": types,
                        "apiv": { v:2, queryParam: false },
                        "required": true
                    },
                    "activityBase": {
                        "complex": "ext",
                        "type": "Activity_T",
                        "lib": "activity"
                    },
                    "Base": {
                        "complex": "ext",
                        "type": "InvoiceRef_T",
                        "lib": "activity"
                    },
                    "referenceNo": {
                        "type": "String"
                    },
                    "Diagnoses": {
                        "complex": "ext",
                        "type": "HasDiagnosis_T",
                        "lib": "activity"
                    }
                }
            }
        );

        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            /* MANDATORY */
            name: NAME,

            /* MANDATORY */
            types: types
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
