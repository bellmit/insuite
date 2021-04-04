/**
 * (c) 2014, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


// NBB:  the file name and the schema name are linked by Mojito and must match!

YUI.add( 'incash-schema', function( Y, NAME ) {
        /**
         * this defines delivery documents for accounting statements (ie KBV)
         *
         * @module accounting-schema
         */

        var types = {},
            i18n = Y.doccirrus.i18n;

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "IncashItem_T",
                        "lib": types
                    }
                },
                "IncashItem_T": {
                    "incashNo": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: true, readOnly: true },
                        i18n: i18n( 'activity-schema.IncashItem_T.incashNo.i18n' ),
                        "-en": "incashNo",
                        "-de": "incashNo"
                    },
                    "timestamp": {
                        "type": "Date",
                        "apiv": { v: 2, queryParam: true },
                        "validate": "pastOrPresentDate",
                        i18n: i18n( 'activity-schema.IncashItem_T.timestamp.i18n' ),
                        "required": true,
                        "-en": "Date",
                        "-de": "Datum"
                    },
                    "amount": {
                        "type": "Number",
                        "validate": "decNumberNegative",
                        i18n: i18n( 'activity-schema.IncashItem_T.amount.i18n' ),
                        "-en": "Amount",
                        "-de": "Betrag"
                    },
                    "employeeName": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'activity-schema.IncashItem_T.employeeName.i18n' ),
                        "-en": "employee",
                        "-de": "Arzt"
                    },
                    "locationId": {
                        "required": true,
                        "type": "ObjectId",
                        "apiv": { v: 2, queryParam: true },
                        "ref": "location",
                        i18n: i18n( 'activity-schema.IncashItem_T.locationId.i18n' ),
                        "-en": "location Id",
                        "-de": "location Id"
                    },
                    "content": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'activity-schema.IncashItem_T.content.i18n' ),
                        "-en": 'content',
                        "-de": 'content'
                    },
                    "cashbook": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'activity-schema.IncashItem_T.cashbook.i18n' ),
                        "-en": 'cashbook',
                        "-de": 'Kassenbuch'
                    },
                    "status": {
                        "default": "VALID",
                        "complex": "eq",
                        "type": "ActStatus_E",
                        "apiv": { v: 2, queryParam: true, readOnly: true },
                        "lib": types,
                        i18n: i18n( 'activity-schema.Activity_T.status.i18n' ),
                        "-en": "cashbook status",
                        "-de": "Kassenbuch Status"
                    },
                    "paymentMethod": {
                        "type": "String",
                        "default": "CASH",
                        i18n: i18n( 'activity-schema.Receipt_T.paymentMethod.i18n' ),
                        "apiv": { v: 2, queryParam: true },
                        "-en": "Payment method",
                        "-de": "Zahlungsmethode"
                    },
                    "cashbookId": {
                        "type": "String",
                        i18n: i18n( 'activity-schema.IncashItem_T.cashbookId.i18n' ),
                        "-en": 'cashbookId',
                        "-de": 'cashbookId'
                    }
                },
                "ActStatus_E": {
                    "type": "String",
                    "default": "VALID",
                    "list": [
                        {
                            "val": "VALID",
                            i18n: i18n( 'activity-schema.ActStatus_E.VALID' ),
                            "-en": "Valid",
                            "-de": "Validiert"
                        },
                        {
                            "val": "CANCELLED",
                            i18n: i18n( 'activity-schema.ActStatus_E.CANCELLED' ),
                            "-en": "Cancelled",
                            "-de": "Storniert"
                        }
                    ]
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,
            /* OPTIONAL default items to be written to the DB on startup */
            defaultItems: [],
            name: NAME
        };
        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'doccirrus',
            'dcschemaloader',
            'dcvalidations'
        ]
    }
);
