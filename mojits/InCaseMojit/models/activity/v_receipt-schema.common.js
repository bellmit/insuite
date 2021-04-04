/**
 * User: strix
 * Date: 09/08/16
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'v_receipt-schema', function( Y, NAME ) {

        'use strict';

        var
        // ------- Schema definitions  -------
            i18n = Y.doccirrus.i18n,
            types = {};

        Y.log( 'Loading Schema ' + NAME, 'debug', NAME );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        types = Y.mix( types,
            {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "VReceipt_T",
                        "lib": types
                    }
                },
                "ReceiptActType_E": {
                    "type": "String",
                    "default": "RECEIPT",
                    "apiv": { v:2, queryParam: true },
                    "list": [
                        {
                            "val": "RECEIPT",
                            "-de": "Quittung",
                            i18n: i18n( 'activity-schema.Activity_E.RECEIPT' ),
                            "-en": "Receipt"
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
                        {
                            "val": "REMINDER",
                            "-de": "Erinnerung",
                            i18n: i18n( 'activity-schema.Activity_E.REMINDER' ),
                            "-en": "Reminder"
                        },
                        {
                            "val": "BADDEBT",
                            "-de": "Ausbuchen",
                            i18n: i18n( 'activity-schema.Activity_E.CREDITNOTE' ),
                            "-en": "Credit note"
                        },
                        {
                            "val": "COMMUNICATION",
                            "-de": "Kommunikation",
                            i18n: i18n( 'activity-schema.Activity_E.COMMUNICATION' ),
                            "-en": "Communication"
                        }
                    ]
                },
                "VReceipt_T": {
                    "actType": {
                        "complex": "eq",
                        "type": "ReceiptActType_E",
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
                        "type": "Receipt_T",
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
