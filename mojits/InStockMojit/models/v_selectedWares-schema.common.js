/*global YUI*/
YUI.add( 'v_selectedWares-schema', function( Y, NAME ) {

        /**
         * @module InStock
         * @submodule models
         * @namespace doccirrus.schemas
         * @class SelectedWares_T
         */

        'use strict';

        var
            types = {},
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
                        "type": "SelectedWares_T",
                        "lib": types
                    }
                },
                SelectedWares_T: {
                    phPZN: {
                        type: "String",
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.phPZN' ),
                        required: true,
                        "-en": "Code",
                        "-de": "Code"
                    },
                    gtinCode: {
                        type: "String",
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.gtinCode' ),
                        required: false,
                        "-en": "GTIN code",
                        "-de": "GTIN code"
                    },
                    description: {
                        type: "String",
                        required: true,
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.description' ),
                        "-en": "Description",
                        "-de": "Beschreibung"
                    },
                    phPriceSale: {
                        type: "Number",
                        default: 0,
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.phPriceSale' ),
                        '-en': 'Selling price',
                        '-de': 'Verkaufspreis'
                    },
                    phPriceSaleCatalog: {
                        type: "Number",
                        default: 0,
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.phPriceSaleCatalog' ),
                        '-en': 'Selling price catalog',
                        '-de': 'Katalog-Verkaufspreis'
                    },
                    phPriceCost: {
                        type: "Number",
                        default: 0,
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.phPriceCost' ),
                        '-en': 'Cost price',
                        '-de': 'Einkaufspreis'
                    },
                    phPriceCostCatalog: {
                        type: "Number",
                        default: 0,
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.phPriceCostCatalog' ),
                        '-en': 'Cost price catalog',
                        '-de': 'Katalog-Einkaufspreis'
                    },
                    vat: {
                        type: "Number",
                        default: 0,
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.vat' ),
                        '-en': 'VAT',
                        '-de': 'VAT'
                    },
                    quantity: {
                        type: 'Number',
                        default: 0,
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.quantity' ),
                        '-en': 'Inventar',
                        '-de': 'Lagerbestand',
                        "validate": "num"
                    },
                    quantityOrdered: {
                        type: 'Number',
                        default: 0,
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.quantityOrdered' ),
                        '-en': 'Quantity ordered',
                        '-de': 'Bestellte menge',
                        "validate": "quantityOrdered"
                    },
                    minimumQuantity: {
                        type: "Number",
                        default: 0,
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.minimumQuantity' ),
                        "-en": "Minimum quantity",
                        "-de": "Mindestmenge"
                    },
                    m_extra: {
                        type: "any",
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.m_extra' ),
                        "-en": "extra",
                        "-de": "extra"
                    },
                    supplier: {
                        type: "String",
                        default: '',
                        required: true,
                        i18n: i18n( 'InStockMojit.instock_schema.StockSuppliers_T.supplier' ),
                        "-en": "Suppliers",
                        "-de": "Lieferant"
                    },
                    quantityDelivered: {
                        type: "Number",
                        default: 0,
                        i18n: i18n( 'InStockMojit.instock_schema.Stocks_T.quantityDelivered' ),
                        "validate": "num"
                    },
                    editorId: {
                        type: "ObjectId",
                        i18n: i18n( 'InStockMojit.instock_schema.Stocks_T.editorId' )
                    },
                    checked: {
                        default: false,
                        type: 'Boolean'
                    },
                    editor: {
                        type: "any",
                        i18n: i18n( 'InStockMojit.instock_schema.Stocks_T.editorId' )
                    },
                    stocksId: {
                        type: "ObjectId",
                        i18n: i18n( 'InStockMojit.instock_schema.Stocks_T.stocks' )
                    },
                    stockLocationId: {
                        type: "ObjectId",
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.stockLocationId' )
                    },
                    stockItemId: {
                        type: "any"
                    },
                    stockLocation: {
                        type: "any",
                        required: true,
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.stockLocationId' )
                    },
                    isProcessed: {
                        type: "Boolean",
                        i18n: i18n( 'InStockMojit.instock_schema.Stocks_T.stocks' )
                    },
                    stockType: {
                        type: "String",
                        default: "",
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.stocks' )
                    },
                    prdNo: {
                        type: "String",
                        default: "",
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.prdNo' )
                    },
                    isDivisible: {
                        type: "Boolean",
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.isDivisible' )

                    },
                    automaticReorder: {
                        type: "Boolean",
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.automaticReorder' )
                    },
                    divisibleCount: {
                        type: "Number",
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.divisibleCount' )
                    },
                    phPackSize: {
                        type: "Number",
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.phPackSize' )
                    },
                    supplyCategory: {
                        type: "String",
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.supplyCategory' )
                    },
                    articleCategory: {
                        type: "String",
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.articleCategory' )
                    },
                    ingredients: {
                        type: ["String"],
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.ingredients' )
                    },
                    count: {
                        type: "Number",
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.count' )
                    },
                    order: {
                        type: "any"
                    },
                    canBeDispensed: {
                        type: "Boolean",
                        default: false
                    },
                    reason: {
                        type: "String"
                    },
                    phIngr: {
                        type: "any"
                    },
                    nota: {
                        type: "String"
                    },
                    patients: {
                        type: ["any"]
                    },
                    dispensedQuantity: {
                        type: "Number"
                    },
                    bookedQuantity: {
                        type: "Number"
                    },
                    dividedQuantity: {
                        type: "Number"
                    },
                    vatType: {
                        type: "Number"
                    },
                    activities: {
                        type: ["any"],
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.linkedActivities' )
                    }
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
            indexes: [
                {
                    key: {
                        "phPZN": 1
                    }
                }]
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'doccirrus',
            'dcvalidations'
        ]
    }
);
