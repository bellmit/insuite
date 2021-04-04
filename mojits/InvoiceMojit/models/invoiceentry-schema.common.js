/**
 * User: do
 * Date: 11/05/15  11:14
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
'use strict';

YUI.add( 'invoiceentry-schema', function( Y, NAME ) {

        /**
         * The invoice entry schema
         *
         * @module invoiceentry-schema
         */

        var types = {},
            i18n = Y.doccirrus.i18n;

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "InvoiceEntry_T",
                        "lib": types
                    }
                },
                "InvoiceEntry_T": {
                    "invoiceLogId": {
                        "type": 'String',
                        i18n: i18n( 'invoiceentry-schema.InvoiceEntry_T.invoiceLogId.i18n' ),
                        "-en": "invoiceLogId",
                        "-de": "invoiceLogId"
                    },
                    "type": {
                        "type": 'String',
                        i18n: i18n( 'invoiceentry-schema.InvoiceEntry_T.type.i18n' ),
                        "-en": "type",
                        "-de": "type"
                    },
                    "logType": {
                        "type": 'String',
                        i18n: i18n( 'invoiceentry-schema.InvoiceEntry_T.logType.i18n' ),
                        "-en": "logType",
                        "-de": "logType"
                    },
                    "caseFolderType": {
                        "type": 'any',
                        i18n: i18n( 'invoiceentry-schema.InvoiceEntry_T.caseFolderType.i18n' ),
                        "-en": "caseFolderType",
                        "-de": "caseFolderType"
                    },
                    "cardSwipeStatus": {
                        "complex": "eq",
                        "type": "CardSwipeStatus_E",
                        "lib": types,
                        i18n: i18n( 'invoiceentry-schema.InvoiceEntry_T.cardSwipeStatus.i18n' ),
                        "-en": "Card Swipe Status",
                        "-de": "Kartenlesestatus"
                    },
                    "vsdmStatus": {
                        "complex": "eq",
                        "type": "VsdmStatusStatus_E",
                        "lib": types,
                        i18n: i18n( 'invoiceentry-schema.InvoiceEntry_T.vsdmStatus.i18n' ),
                        "-en": "VSDM Status",
                        "-de": "VSDM Status"
                    },
                    "data": {
                        "type": 'any',
                        i18n: i18n( 'invoiceentry-schema.InvoiceEntry_T.data.i18n' ),
                        "-en": "data",
                        "-de": "data"
                    },
                    "activityId": {
                        "type": "String",
                        i18n: i18n( 'invoiceentry-schema.InvoiceEntry_T.activityId.i18n' ),
                        "-en": "activityId",
                        "-de": "activityId"
                    },
                    "source": {
                        "type": "String",
                        "default": "",
                        "-en": "source",
                        "-de": "source"
                    }
                },
                "CardSwipeStatus_E": {
                    "type": "String",
                    "list": [
                        {
                            "val": "ALL",
                            i18n: i18n( 'invoiceentry-schema.CardSwipeStatus_E.ALL.i18n' ),
                            "-en": "All scheins have card swipe",
                            "-de": "Alle Scheine haben ein Kartenlesedatum"
                        },
                        {
                            "val": "SOME",
                            i18n: i18n( 'invoiceentry-schema.CardSwipeStatus_E.SOME.i18n' ),
                            "-en": "At least one schein has no card swipe",
                            "-de": "Mindestens ein Schein hat kein Kartenlesedatum"
                        }
                    ]
                },
                "VsdmStatusStatus_E": {
                    "type": "String",
                    "list": [
                        {
                            "val": "ALL",
                            i18n: i18n( 'invoiceentry-schema.VsdmStatusStatus_E.ALL.i18n' ),
                            "-en": "All scheins have VSDM status",
                            "-de": "Alle Scheine haben einen VSDM Status"
                        },
                        {
                            "val": "SOME",
                            i18n: i18n( 'invoiceentry-schema.VsdmStatusStatus_E.SOME.i18n' ),
                            "-en": "At least one schein has no VSDM status",
                            "-de": "Mindestens ein Schein hat keinen VSDM Status"
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

            indexes: [
                {
                    "key": {
                        "invoiceLogId": 1
                    },
                    indexType: { sparse: true }
                },
                {
                    key: {
                        "data.firstname": 1
                    },
                    indexType: { collation:{ locale: 'de', strength: 2, numericOrdering:true} }
                },
                {
                    key: {
                        "data.lastname": 1
                    },
                    indexType: { collation:{ locale: 'de', strength: 2, numericOrdering:true} }
                }
            ],

            /* OPTIONAL default items to be written to the DB on startup */
            defaultItems: [],
            name: NAME
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'doccirrus'
        ]
    }
);
