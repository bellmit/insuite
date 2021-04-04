/**
 * User: strix
 * Date: 28/08/18
 * (c) 2018, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'v_invoicerefpvs-schema', function( Y, NAME ) {

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
                        "type": "VInvoiceRefPVS_T",
                        "lib": types
                    }
                },
                "InvoiceRefPVSActType_E": {
                    "type": "String",
                    "default": "INVOICEREFPVS",
                    "apiv": { v:2, queryParam: true },
                    "list": [
                        {
                            "val": "INVOICEREFPVS",
                            "-de": "PVS Abrechnung",
                            i18n: i18n( 'activity-schema.Activity_E.INVOICEREFPVS' ),
                            "-en": "PVS Invoice"
                        }
                    ]
                },
                "VInvoiceRefPVS_T": {
                    "actType": {
                        "complex": "eq",
                        "type": "InvoiceRefPVSActType_E",
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
                        "type": "InvoiceRefPVS_T",
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
