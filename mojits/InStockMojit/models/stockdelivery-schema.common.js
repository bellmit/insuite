/*global YUI*/
YUI.add( 'stockdelivery-schema', function( Y, NAME ) {

        /**
         * @module InStock
         * @submodule models
         * @namespace doccirrus.schemas
         * @class StockOrders_T
         */

        'use strict';

        var
            types = {},
            stockTypes = Object.freeze( {
                inStock: 'instock'
            } ),
            stockStatuses = Object.freeze( {
                created: "created",
                closed: 'closed',
                sent: 'sent',
                archived: 'archived',
                arrived: 'arrived',
                approved: 'approved',
                cancelled: "cancelled",
                partiallybooked: "partiallybooked"
            } ),
            i18n = Y.doccirrus.i18n;

        /**
         * Schema definitions
         * @property types
         * @type {YUI}
         */
        types = Y.mix( types, {
                root: {
                    "base": {
                        "complex": "ext",
                        "type": "StockOrders_T",
                        "lib": types
                    }
                },
                StockOrders_T: {
                    dateCreated: {
                        type: "Date",
                        i18n: i18n( 'InStockMojit.instock_schema.StockOrders_T.dateCreated' ),
                        required: true,
                        "-en": "Date created",
                        "-de": "Datum erstellt"
                    },
                    dateSent: {
                        type: "Date",
                        i18n: i18n( 'InStockMojit.instock_schema.StockOrders_T.dateSent' ),
                        "-en": "Date sent",
                        "-de": "Datum gesendet"
                    },
                    dateArchived: {
                        type: "Date",
                        i18n: i18n( 'InStockMojit.instock_schema.StockOrders_T.dateArchived' ),
                        "-en": "Date archived",
                        "-de": "Datum archiviert"
                    },
                    dateArrived: {
                        type: "Date",
                        i18n: i18n( 'InStockMojit.instock_schema.StockOrders_T.dateArrived' ),
                        "-en": "Date arrived",
                        "-de": "Datum angekommen"
                    },
                    dateClosed: {
                        type: "Date",
                        i18n: i18n( 'InStockMojit.instock_schema.StockOrders_T.dateClosed' ),
                        "-en": "Date closed",
                        "-de": "Datum abgeschlossen"
                    },
                    orderNo: {
                        type: "String",
                        i18n: i18n( 'InStockMojit.instock_schema.StockOrders_T.orderNo' ),
                        '-en': 'Order number',
                        '-de': 'Bestellnummer'
                    },
                    basecontactId: {
                        type: "ObjectId",
                        required: true,
                        i18n: i18n( 'InStockMojit.instock_schema.StockOrders_T.basecontactId' ),
                        '-en': 'Contact',
                        '-de': 'Kontakt'
                    },
                    notes: {
                        type: 'String',
                        i18n: i18n( 'InStockMojit.instock_schema.StockOrders_T.notes' ),
                        '-en': 'Notes',
                        '-de': 'Anmerkungen'
                    },
                    documentId: {
                        type: 'String',
                        i18n: i18n( 'InStockMojit.instock_schema.StockOrders_T.documentId' ),
                        '-en': 'Document',
                        '-de': 'Dokumentieren'
                    },
                    mediaId: {
                        type: "String",
                        i18n: i18n( 'InStockMojit.instock_schema.StockOrders_T.mediaId' ),
                        default: '',
                        "-en": "Files",
                        "-de": "Dateien"
                    },
                    orderFulfilled: {
                        type: "Boolean",
                        i18n: i18n( 'InStockMojit.instock_schema.StockOrders_T.orderFulfilled' ),
                        "-en": "Fulfilled",
                        "-de": "Erfüllt"
                    },
                    stocks: {
                        type: "Stocks_T",
                        lib: types,
                        complex: "inc",
                        i18n: i18n( 'InStockMojit.instock_schema.StockOrders_T.stocks' ),
                        "-en": "Stock items",
                        "-de": "Artikel auf Lager"
                    },
                    status: {
                        type: "OrderStatuses_E",
                        complex: "eq",
                        lib: stockStatuses,
                        i18n: i18n( 'InStockMojit.instock_schema.StockOrders_T.orderStatus' )
                    },
                    formId: {
                        type: "ObjectId",
                        i18n: i18n( 'InStockMojit.instock_schema.StockOrders_T.formId' )
                    },
                    locationId: {
                        type: "ObjectId",
                        i18n: i18n( 'InStockMojit.instock_schema.StockOrders_T.formId' )
                    },
                    orderId: {
                        type: "ObjectId",
                        i18n: i18n( 'InStockMojit.instock_schema.StockOrders_T.orderId' )
                    },
                    electronicData: {
                        type: "any",
                        default: null,
                        i18n: i18n( 'InStockMojit.instock_schema.StockOrders_T.onlineOrderNo' ),
                        '-en': 'Supplier order no',
                        '-de': 'Lieferantenbestellnr'
                    },
                    editorId: {
                        type: "ObjectId",
                        i18n: i18n( 'InStockMojit.instock_schema.Stocks_T.editorId' )
                    }
                },
                Stocks_T: {
                    stockType: {
                        type: "StockTypes_E",
                        complex: "eq",
                        lib: stockTypes,
                        i18n: i18n( 'InStockMojit.instock_schema.Stocks_T.stockType' )
                    },
                    references: {
                        type: "ObjectId",
                        i18n: i18n( 'InStockMojit.instock_schema.Stocks_T.items' )
                    },
                    quantity: {
                        type: "Number",
                        i18n: i18n( 'InStockMojit.instock_schema.Stocks_T.quantity' )
                    },
                    quantityDelivered: {
                        type: "Number",
                        i18n: i18n( 'InStockMojit.instock_schema.Stocks_T.quantityDelivered' )
                    },
                    editorId: {
                        type: "ObjectId",
                        i18n: i18n( 'InStockMojit.instock_schema.Stocks_T.editorId' )
                    },
                    checked: {
                        default: false,
                        type: 'Boolean'
                    },
                    stockLocationId: {
                        type: "ObjectId",
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.stockLocationId' )
                    },
                    isProcessed: {
                        type: "Boolean",
                        default: false
                    },
                    phPriceSale: {
                        type: "Number",
                        default: 0,
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.phPriceSale' )
                    },
                    phPriceSaleCatalog: {
                        type: "Number",
                        default: 0,
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.phPriceSaleCatalog' )
                    },
                    phPriceCost: {
                        type: "Number",
                        default: 0,
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.phPriceCost' )
                    },
                    phPriceCostCatalog: {
                        type: "Number",
                        default: 0,
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.phPriceCostCatalog' )
                    },
                    nota: {
                        type: "String",
                        default: "",
                        i18n: i18n( 'InStockMojit.instock_schema.StockOrders_T.nota' ),
                        '-en': i18n( 'InStockMojit.instock_schema.StockOrders_T.nota' ),
                        '-de': i18n( 'InStockMojit.instock_schema.StockOrders_T.nota' )
                    },
                    patients: {
                        type: ["ObjectId"],
                        default: [],
                        i18n: i18n( 'InStockMojit.instock_schema.StockOrders_T.patients' ),
                        '-en': i18n( 'InStockMojit.instock_schema.StockOrders_T.patients' ),
                        '-de': i18n( 'InStockMojit.instock_schema.StockOrders_T.patients' )
                    },
                    isDivisible: {
                        type: "Boolean",
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.isDivisible' ),
                        default: false,
                        required: true,
                        "-en": "Is divisible",
                        "-de": "Teilbar"
                    },
                    phPZN: {
                        type: "String",
                        default: "",
                        i18n: i18n( 'InStockMojit.instock_schema.StockOrders_T.phPZN' ),
                        '-en':  i18n( 'InStockMojit.instock_schema.StockOrders_T.phPZN' ),
                        '-de': i18n( 'InStockMojit.instock_schema.StockOrders_T.phPZN' )
                    },
                    activities: {
                        type: "linkedActivities_T",
                        lib: types,
                        complex: "inc",
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.linkedActivities' ),
                        "-en": "Linked Activities",
                        "-de": "Verlinkte Aktivitäten"
                    }
                },
                linkedActivities_T: {
                    patientId: {
                        type: "ObjectId",
                        i18n: i18n( 'InStockMojit.instock_schema.linkedActivities_T.patientId' ),
                        '-en': i18n( 'InStockMojit.instock_schema.linkedActivities_T.patientId' ),
                        '-de': i18n( 'InStockMojit.instock_schema.linkedActivities_T.patientId' )
                    },
                    activities: {
                        type: "ObjectId",
                        i18n: i18n( 'InStockMojit.instock_schema.linkedActivities_T.activities' ),
                        '-en': i18n( 'InStockMojit.instock_schema.linkedActivities_T.activities' ),
                        '-de': i18n( 'InStockMojit.instock_schema.linkedActivities_T.activities' )
                    }
                },
                StockTypes_E: {
                    type: "String",
                    list: [
                        {
                            val: "instock",
                            i18n: i18n( 'InStockMojit.instock_schema.StockOrders_T.inStock' )
                        },
                        {
                            val: "medicationscatalog",
                            i18n: i18n( 'InStockMojit.instock_schema.StockOrders_T.inStock' )
                        }
                    ]
                },
                OrderStatuses_E: {
                    type: "String",
                    list: [
                        {
                            val: "created",
                            i18n: i18n( 'InStockMojit.instock_schema.Status_E.created' )
                        },
                        {
                            val: "sent",
                            i18n: i18n( 'InStockMojit.instock_schema.Status_E.sent' )
                        },
                        {
                            val: "arrived",
                            i18n: i18n( 'InStockMojit.instock_schema.Status_E.arrived' )
                        },
                        {
                            val: "archived",
                            i18n: i18n( 'InStockMojit.instock_schema.Status_E.archived' )
                        },
                        {
                            val: "closed",
                            i18n: i18n( 'InStockMojit.instock_schema.Status_E.closed' )
                        },
                        {
                            val: "partiallybooked",
                            i18n: i18n( 'InStockMojit.instock_schema.Status_E.partiallybooked' )
                        }
                    ]
                }

            }
        );
        Y.log( 'Loading Schema ' + NAME, 'debug', NAME );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * Class REST Schemas
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            /* MANDATORY */
            name: NAME,

            /* MANDATORY */
            types: types,
            stockStatuses: stockStatuses
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {requires: ['dcschemaloader']}
);
