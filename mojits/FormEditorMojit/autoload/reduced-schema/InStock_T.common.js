/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-schema-InStock-T',

    /* Module code */
    function( Y /* , NAME */ ) {
        'use strict';


        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.schema)  { Y.dcforms.schema = {}; }

        Y.dcforms.schema.InStock_T = {
            phPZN: {
                type: "String",
                required: true,
                label: {
                    "en": "Code",
                    "de": "Code"
                }
            },
            gtinCode: {
                type: "String",
                required: false,
                label: {
                    "en": "GTIN code",
                    "de": "GTIN code"
                }
            },
            description: {
                type: "String",
                required: true,
                label: {
                    "en": "Description",
                    "de": "Beschreibung"
                }

            },
            phPriceSale: {
                type: "Number",
                default: 0,
                label: {
                    'en': 'Selling price',
                    'de': 'Verkaufspreis'
                }
            },
            vat: {
                type: "Number",
                default: 0,
                label: {
                    'en': 'VAT',
                    'de': 'VAT'
                }
            },
            quantity: {
                type: 'Number',
                default: 0,
                label: {
                    'en': 'Quantity',
                    'de': 'Menge'
                }

            },
            quantityOrdered: {
                type: 'Number',
                default: 0,
                label: {
                    'en': 'Quantity ordered',
                    'de': 'Bestelltemenge'
                }
            },
            minimumQuantity: {
                type: "Number",
                default: 0,
                label: {
                    "en": "Minimum quantity",
                    "de": "Mindestmenge"
                }
            },
            m_extra: {
                type: "any",
                label: {
                    "en": "extra",
                    "de": "extra"
                }
            },
            supplierId: {
                type: "ObjectId",
                default: null,
                required: true,
                label: {
                    "en": "Suppliers",
                    "de": "Lieferant"
                }
            },
            stockLocationName: {
                type: "String",
                label: {
                    "en": "Stock location name",
                    "de": "Lagerort"
                }
            },
            stockLocationDescription: {
                type: "String",
                label: {
                    "en": "Stock location description",
                    "de": "Lagerortbeschreibung"
                }
            }
        };

        //  replace mapper
        Y.dcforms.schema.InStock_T.mapper = 'instock';

    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: [ ]
    }
);