/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-schema-InStockOrder-T',

    /* Module code */
    function( Y /* , NAME */ ) {
        'use strict';


        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.schema)  { Y.dcforms.schema = {}; }

        Y.dcforms.schema.InStockOrder_T = {
            dateCreated: {
                type: "Date",
                required: true,
                label: {
                    "en": "Date created",
                    "de": "Datum erstellt"
                }
            },
            dateSent: {
                type: "Date",
                label: {
                    "en": "Date sent",
                    "de": "Datum gesendet"
                }
            },
            dateArchived: {
                type: "Date",
                label: {
                    "en": "Date archived",
                    "de": "Datum archiviert"
                }
            },
            dateArrived: {
                type: "Date",
                label: {
                    "en": "Date arrived",
                    "de": "Datum angekommen"
                }
            },
            orderNo: {
                type: "Number",
                label: {
                    'en': 'Order number',
                    'de': 'Bestellnummer'
                }
            },
            basecontactId: {
                type: "String",
                required: true,
                label: {
                    'en': 'Contact',
                    'de': 'Kontakt'
                }
            },
            notes: {
                type: 'String',
                label: {
                    'en': 'Notes',
                    'de': 'Anmerkungen'
                }
            },
            documentId: {
                type: 'String',
                label: {
                    'en': 'Document',
                    'de': 'Dokumentieren'
                }
            },
            mediaId: {
                type: "String",
                label: {
                    "en": "Media",
                    "de": "Medien"
                }
            },
            orderFulfilled: {
                type: "Boolean",
                label: {
                    "en": "Fulfilled",
                    "de": "Erfüllt"
                }
            },
            stockItems: {
                type: "InStock_T",
                lib: "types",
                complex: "inc",
                label: {
                    "en": "Stock items",
                    "de": "Artikel auf Lager"
                }
            },
            totalOrderedQuantity: {
                type: "Number",
                label: {
                    "en" : "Total ordered quantity",
                    "de": "Gesamt Bestellmenge"
                }
            },
            supplierCustomerId: {
                type: "String",
                label: {
                    "en": "Customer Id",
                    "de": "Kundennummer"
                }
            },
            supplierAddress: {
                type: "Address_T",
                label: {
                    "en": "Supplier address",
                    "de": "Lieferant Adresse"
                }
            },
            supplierReference: {
                type: "Address_T",
                label: {
                    "en": "Supplier reference",
                    "de": "Lieferantbestellnr"
                }
            }
        };

        //  replace mapper
        Y.dcforms.schema.InStockOrder_T.mapper = 'instock';

    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: [  'dcforms-schema-InStock-T' ]
    }
);