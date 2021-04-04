/**
 * (c) 2014, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

// NBB:  the file name and the schema name are linked by Mojito and must match!

YUI.add( 'accounting-schema', function( Y, NAME ) {
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
                        "type": "AccountingDelivery_T",
                        "lib": types
                    }
                },
                "AdresseeKind_E": {
                    "type": "String",
                    "list": [
                        {
                            "val": "kvca",
                            i18n: i18n( 'accounting-schema.AdresseeKind_E.kvca' ),
                            "-en": "kvca",
                            "-de": "kvca"
                        }
                    ]
                },
                "AccountingDelivery_T": {
                    "guid": {
                        "required": true,
                        "type": "String",
                        "validate": "guid",
                        i18n: i18n( 'accounting-schema.AccountingDelivery_T.guid.i18n' ),
                        "-en": "guid",
                        "-de": "guid"
                    },
                    "kind": {
                        "required": true,
                        "complex": "eq",
                        "type": "AdresseeKind_E",
                        "lib": types,
                        i18n: i18n( 'accounting-schema.AccountingDelivery_T.kind.i18n' ),
                        "-en": "kind of adressee",
                        "-de": "Adressantenart"
                    },
                    "payload": {
                        "required": true,
                        "type": "String",
                        i18n: i18n( 'accounting-schema.AccountingDelivery_T.payload.i18n' ),
                        "-en": "payload file name",
                        "-de": "Name der Nutzlastdatei"
                    },
                    "test": {
                        "type": "Boolean",
                        i18n: i18n( 'accounting-schema.AccountingDelivery_T.test.i18n' ),
                        "-en": "test delivery",
                        "-de": "Testlieferung"
                    },
                    "complete": {
                        "default": false,
                        "type": Boolean,
                        i18n: i18n( 'accounting-schema.AccountingDelivery_T.complete.i18n' ),
                        "-en": "complete",
                        "-de": "komplett"
                    },
                    "replacement": {
                        "default": false,
                        "type": Boolean,
                        i18n: i18n( 'accounting-schema.AccountingDelivery_T.replacement.i18n' ),
                        "-en": "replacement",
                        "-de": "Ersatz"
                    },
                    "version": {
                        "default": 1,
                        "type": Number,
                        i18n: i18n( 'accounting-schema.AccountingDelivery_T.version.i18n' ),
                        "-en": "version",
                        "-de": "Version"
                    },
                    "quarter": {
                        "required": true,
                        "type": "String",
                        "validate": "quarter",
                        i18n: i18n( 'accounting-schema.AccountingDelivery_T.quarter.i18n' ),
                        "-en": "accounting quarter",
                        "-de": "Abrechnungsquartal"
                    },
                    "commercialNo": {
                        "required": true,
                        "type": "Number",
                        i18n: i18n( 'accounting-schema.AccountingDelivery_T.commercialNo.i18n' ),
                        "-en": "location number",
                        "-de": "Betriebsstättennummer"
                    },
                    "sender": {
                        "type": "String",
                        "validate": "email",
                        i18n: i18n( 'accounting-schema.AccountingDelivery_T.sender.i18n' ),
                        "-en": "sender",
                        "-de": "Sender"
                    },
                    "addressee": {
                        "type": "String",
                        i18n: i18n( 'accounting-schema.AccountingDelivery_T.addressee.i18n' ),
                        "-en": "addressee",
                        "-de": "Adressat"
                    },
                    "sentId": {
                        "type": "String",
                        i18n: i18n( 'accounting-schema.AccountingDelivery_T.sentId.i18n' ),
                        "-en": "message-id of the delivered SMTP mail",
                        "-de": "Message-Id der versandten SMTP Nachricht"
                    },
                    "status": {
                        "type": "String",
                        i18n: i18n( 'accounting-schema.AccountingDelivery_T.status.i18n' ),
                        "-en": "status",
                        "-de": "Status"
                    },
                    "delivered": {
                        "type": "Date",
                        "validate": "date",
                        i18n: i18n( 'accounting-schema.AccountingDelivery_T.delivered.i18n' ),
                        "-en": "valid from",
                        "-de": "gültig ab"
                    },
                    "responded": {
                        "type": "Date",
                        "validate": "date",
                        i18n: i18n( 'accounting-schema.AccountingDelivery_T.responded.i18n' ),
                        "-en": "valid until",
                        "-de": "gültig bis"
                    },
                    "response": {
                        "type": "String",
                        i18n: i18n( 'accounting-schema.AccountingDelivery_T.response.i18n' ),
                        "-en": "response text",
                        "-de": "Antwort"
                    }
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
