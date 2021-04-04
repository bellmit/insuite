/*global YUI*/
YUI.add( 'instock-schema', function( Y, NAME ) {

        /**
         * @module InStock
         * @submodule models
         * @namespace doccirrus.schemas
         * @class InStock_T
         */

        'use strict';

        var
            types = {},
            i18n = Y.doccirrus.i18n,
            unwrap = Y.doccirrus.commonutils.unwrap;

        /**
         * Schema definitions
         * @property types
         * @type {YUI}
         */
        types = Y.mix( types, {
                root: {
                    "base": {
                        "complex": "ext",
                        "type": "InStock_T",
                        "lib": types
                    }
                },
                InStock_T: {
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
                        "-en": "Article description",
                        "-de": "Produktbeschreibung"
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
                        '-en': 'Purchase price',
                        '-de': 'Einkaufspreis'
                    },
                    phPriceCostCatalog: {
                        type: "Number",
                        default: 0,
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.phPriceCostCatalog' ),
                        '-en': 'Purchase price catalog',
                        '-de': 'Katalog-Einkaufspreis'
                    },
                    vat: {
                        type: "Number",
                        default: 0,
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.vat' ),
                        '-en': 'VAT',
                        '-de': 'MWST'
                    },
                    vatType: {
                        type: "Number",
                        default: 0
                    },
                    vatTypeCatalog: {
                        type: "Number",
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.vatTypeCatalog' ),
                        '-en': 'Catalog VAT',
                        '-de': 'Katalog-MWST'
                    },
                    quantity: {
                        type: 'Number',
                        default: 0,
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.quantity' ),
                        '-en': 'Inventar',
                        '-de': 'Lagerbestand'
                    },
                    quantityOrdered: {
                        type: 'Number',
                        default: 0,
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.quantityOrdered' ),
                        '-en': 'Ordered quantity',
                        '-de': 'Bestellte Menge'
                    },
                    minimumQuantity: {
                        type: "Number",
                        default: 0,
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.minimumQuantity' ),
                        "-en": "Minimum stock",
                        "-de": "Mindestlagerbestand"
                    },
                    m_extra: {
                        type: "any",
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.m_extra' ),
                        "-en": "extra",
                        "-de": "extra"
                    },
                    supplierId: {
                        type: "ObjectId",
                        default: null,
                        // required: true,
                        i18n: i18n( 'InStockMojit.instock_schema.StockSuppliers_T.supplier' ),
                        "-en": "Suppliers",
                        "-de": "Lieferant"
                    },
                    locationId: {
                        type: "ObjectId",
                        required: true,
                        i18n: i18n( 'InStockMojit.instock_schema.StockOrders_T.locationId' )
                    },
                    stockLocationId: {
                        type: "ObjectId",
                        required: true,
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.stockLocationId' )
                    },
                    notes: {
                        type: "String",
                        default: "",
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.notes' ),
                        "-en": "Reason",
                        "-de": "Begründung"
                    },
                    phPackSize: {
                        "default": "",
                        "type": "Number",
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.phPackSize' ),
                        "-en": "Package size",
                        "-de": "Packungsgröße",
                        "-de-ch": "Packungsgrösse"
                    },
                    phUnit: {
                        "complex": "eq",
                        "type": "phUnit_E",
                        "lib": types,
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.phUnit' ),
                        "-en": "Einheit",
                        "-de": "Unit"
                    },
                    isDivisible: {
                        type: "Boolean",
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.isDivisible' ),
                        default: false,
                        required: true,
                        "-en": "Is divisible",
                        "-de": "Teilbar"
                    },
                    automaticReorder: {
                        type: "Boolean",
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.automaticReorder' ),
                        default: false,
                        required: true,
                        "-en": "Automatic reordering",
                        "-de": "automatische Nachbestellung"
                    },
                    divisibleCount: {
                        type: "Number",
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.divisibleCount' ),
                        required: false,
                        "-en": "Divisible count",
                        "-de": "Kleinste Abgabemenge"
                    },
                    prdNo: {
                        "type": "String",
                        "-en": "Product number",
                        "-de": "Produktnummer",
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.prdNo' )
                    },
                    supplyCategory: {
                        "type": "String",
                        "-en": "Dispense category",
                        "-de": "Abgabekategorie",
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.supplyCategory' )
                    },
                    articleCategory: {
                        "type": "String",
                        "-en": "Type",
                        "-de": "Typ",
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.articleCategory' )
                    },
                    ingredients: {
                        "type": ["String"],
                        "-en": "Ingredient",
                        "-de": "Wirkstoff",
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.ingredients' )
                    },
                    editorId: {
                        "type": "ObjectId",
                        "-en": "Editor",
                        "-de": "Bearbeiter",
                        i18n: i18n( 'InStockMojit.instock_schema.Stocks_T.editorId' ),
                        default: null
                    },
                    dateCreated: {
                        "type": "Date",
                        "-en": "Date created",
                        "-de": "Datum",
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.dateCreated' ),
                        default: null
                    },
                    dateUpdated: {
                        "type": "Date",
                        "-en": "Date updated",
                        "-de": "Zuletzt geändert",
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.dateUpdated' ),
                        default: null
                    },
                    isDeleted: {
                        type: "Boolean",
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.isDeleted' )
                    },
                    phSalesStatus: {
                        "complex": "eq",
                        "type": "phSalesStatus_E",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'activity-schema.Medication_T.PhSalesStatus.i18n' ),
                        "lib": types
                    }
                },
                phSalesStatus_E: {
                    // Maps values from MMI phSaleStatus and MedIndex SALECD into a unified value.
                    // Values from MMI acted as a base. Two values are added from MedIndex Catalog.
                    // These are PREVIEW (Medindex: SALECD - R) and PROVISIONAL (Medindex SALECD - P).
                    // The CH-translation of OFFMARKET, ONMARKET equate the MedIndex wording.
                    "type": "String",
                    "default": "UNKNOWN",
                    i18n: i18n( 'activity-schema.Medication_T.PhSalesStatus.i18n' ),
                    "-en": i18n( 'activity-schema.Medication_T.PhSalesStatus.i18n' ),
                    "-de": i18n( 'activity-schema.Medication_T.PhSalesStatus.i18n' ),
                    "list": [
                        {
                            "val": "UNKNOWN", // DEFAULT NO MMI CODE
                            i18n: i18n( 'activity-schema.PhSalesStatus_E.UNKNOWN.i18n' ),
                            "-en": "unknown",
                            "-de": "Unbekannt"
                        }, {
                            "val": "DISCONTINUE", // MMI CODE: D
                            i18n: i18n( 'activity-schema.PhSalesStatus_E.DISCONTINUE.i18n' ),
                            "-en": "discontinue",
                            "-de": "Wegfall"
                        },
                        {
                            "val": "OFFMARKET", // MMI CODE: F // in Medindex SALECD - H
                            i18n: i18n( 'activity-schema.PhSalesStatus_E.OFFMARKET.i18n' ),
                            "-en": "offmarket",
                            "-de": "Außer Vertrieb"
                        },
                        {
                            "val": "ONMARKET", // MMI CODE: N // Medindex SALECD - N
                            i18n: i18n( 'activity-schema.PhSalesStatus_E.ONMARKET.i18n' ),
                            "-en": "onmarket",
                            "-de": "Im Vertrieb"
                        },
                        {
                            "val": "RECALL", // MMI CODE: R
                            i18n: i18n( 'activity-schema.PhSalesStatus_E.RECALL.i18n' ),
                            "-en": "recall",
                            "-de": "Rückruf"
                        },
                        {
                            "val": "OFFTAKE", // MMI CODE: Z
                            i18n: i18n( 'activity-schema.PhSalesStatus_E.OFFTAKE.i18n' ),
                            "-en": "offtake",
                            "-de": "Zurückgezogen"
                        },
                        {
                            "val": "PROVISIONAL", // Medindex SALECD - P
                            i18n: i18n( 'activity-schema.phSalesStatus_E.PROVISIONAL.i18n' ),
                            "-en": "provisional",
                            "-de": "Provisorisch"
                        },
                        {
                            "val": "PREVIEW", // Medindex SALECD - R
                            i18n: i18n( 'activity-schema.phSalesStatus_E.PREVIEW.i18n' ),
                            "-en": "not yet distributed Preview",
                            "-de": "noch nicht im Handel"
                        }
                    ]
                },
                phUnit_E: {
                    type: "String",
                    list: [
                        {
                            val: "",
                            i18n: ""
                        },
                        {
                            val: "ml",
                            i18n: i18n( 'InStockMojit.instock_schema.phUnit_E.milliliter' )
                        },
                        {
                            val: "Stk",
                            i18n: i18n( 'InStockMojit.instock_schema.phUnit_E.piece' )
                        },
                        {
                            val: "g",
                            i18n: i18n( 'InStockMojit.instock_schema.phUnit_E.grams' )
                        },
                        {
                            val: "kg",
                            i18n: i18n( 'InStockMojit.instock_schema.phUnit_E.kilogram' )
                        },
                        {
                            val: "lt",
                            i18n: i18n( 'InStockMojit.instock_schema.phUnit_E.liter' )
                        },
                        {
                            val: "Btl",
                            i18n: i18n( 'InStockMojit.instock_schema.phUnit_E.bag' )
                        },
                        {
                            val: "dl",
                            i18n: i18n( 'InStockMojit.instock_schema.phUnit_E.deciliter' )
                        },
                        {
                            val: "Dos",
                            i18n: i18n( 'InStockMojit.instock_schema.phUnit_E.dose' )
                        },
                        {
                            val: "Meter",
                            i18n: i18n( 'InStockMojit.instock_schema.phUnit_E.meter' )
                        },
                        {
                            val: "Blatt",
                            i18n: i18n( 'InStockMojit.instock_schema.phUnit_E.sheet' )
                        },
                        {
                            val: "MBq",
                            i18n: i18n( 'InStockMojit.instock_schema.phUnit_E.megabecquerel' )
                        },
                        {
                            val: "cl",
                            i18n: i18n( 'InStockMojit.instock_schema.phUnit_E.centilitre' )
                        },
                        {
                            val: "mg",
                            i18n: i18n( 'InStockMojit.instock_schema.phUnit_E.milligram' )
                        }
                    ]

                }
            }
        );
        //150,32567  => 150,35
        //150,32467 => 150,3
        function calculateReduceCount( ware, count ) {
            if( count ) {
                return unwrap( ware.isDivisible ) ? count / Number( unwrap( ware.phPackSize ) ) : count === undefined ? 1 : count;
            } else {
                return count === undefined ? 1 : count;
            }
        }

        function getSwissPriceString( price, currency ) {
            if( isNaN( price ) ) {
                price = 0;
            }
            if( typeof price === 'string' ) {
                price = parseFloat( price );
            }

            if( currency || currency === undefined ) {
                currency = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ? "CHF" : "";
            }
            return Number( price ).toFixed( 2 ) + (currency ? " " + currency : "");
        }

        function getVatByVatType( vatType ) {
            return (!vatType || vatType === 0) ? 1003 : parseFloat( '100' + vatType.toString() );
        }

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
                        "phPZN": 1,
                        "stockLocationId": 1
                    },
                    indexType: {sparse: true, unique: true}
                },
                {
                    key: {
                        "phPZN": 1

                    },
                    indexType: {sparse: true, unique: false}
                },
                {
                    key: {
                        "stockLocationId": 1
                    },
                    indexType: {sparse: true, unique: false}
                },
                {
                    key: {
                        "phPZN": 1,
                        "locationId": 1
                    },
                    indexType: {sparse: true, unique: false}
                }
            ],
            calculateReduceCount: calculateReduceCount,
            getSwissPriceString: getSwissPriceString,
            getVatByVatType: getVatByVatType
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'doccirrus',
            'dcvalidations',
            'countrymode-schema'
        ]
    }
);
