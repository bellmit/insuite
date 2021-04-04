/*
 *  Copyright DocCirrus GmbH 2015
 *
 *  Defines flat list of properties bound into forms
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-schema-InvoiceItem-T',

    /* Module code */
    function( Y ) {
        'use strict';

        if( !Y.dcforms ) {
            Y.dcforms = {};
        }
        if( !Y.dcforms.schema ) {
            Y.dcforms.schema = {};
        }

        Y.dcforms.schema.InvoiceItem_T = {
            "version": 1.0,
            "activityId": {
                "required": true,
                "type": "String",
                "label": {
                    "en": "activityId",
                    "de": "activityId"
                }
            },
            "date": {
                "type": "String",
                "label": {
                    "en": "Treat. date",
                    "de": "Leistungsdatum"
                }
            },
            "time": {
                "type": "String",
                "label": {
                    "en": "Treat. time",
                    "de": "Leistungszeit"
                }
            },
            "dateTime": {
                "type": "String",
                "label": {
                    "en": "Treat. datetime",
                    "de": "Leistungsdatumzeit"
                }
            },
            "code": {
                "type": "String",
                "label": {
                    "en": "Code",
                    "de": "Ziffer"
                }
            },
            "tariffCode": {
                "type": "String",
                "label": {
                    "en": "Tariff code",
                    "de": "Tarifziffer"
                }
            },
            "item": {
                "type": "String",
                "label": {
                    "en": "Item",
                    "de": "Beschreibung"
                }
            },
            "quantity": {
                "type": "Number",
                "label": {
                    "en": "Quantity",
                    "de": "Anzahl"
                }
            },
            "factor": {
                "type": "Factor",
                "label": {
                    "en": "Factor",
                    "de": "Steigerungssatz"
                }
            },
            "costperitem": {
                "type": "Number",
                "label": {
                    "en": "Item Cost",
                    "de": "Kosten einzeln"
                }
            },
            "costperitemPlain": {
                "type": "String",
                "label": {
                    "en": "Item Cost (plain)",
                    "de": "Kosten einzeln (ohne Währung)"
                }
            },
            "cost": {
                "type": "Number",
                "label": {
                    "en": "Cost",
                    "de": "Betrag"
                }
            },
            "costPlain": {
                "type": "String",
                "label": {
                    "en": "Cost (plain)",
                    "de": "Betrag (ohne Währung)"
                }
            },
            "vat": {
                "type": "Number",
                "label": {
                    "en": "VAT",
                    "de": "USt"
                }
            },
            "vatPlain": {
                "type": "String",
                "label": {
                    "en": "VAT (plain)",
                    "de": "USt (ohne Währung)"
                }
            },
            "vatPerc": {
                "type": "String",
                "label": {
                    "en": "VAT %",
                    "de": "USt %"
                }
            },
            "extraBSK": {
                "type": "Number",
                "label": {
                    "en": "Extra specific costs",
                    "de": "Besondere Sachkosten"
                }
            },
            "extraBSKPlain": {
                "type": "String",
                "label": {
                    "en": "Extra specific costs (plain)",
                    "de": "Besondere Sachkosten (ohne Währung)"
                }
            },
            "extraASK": {
                "type": "Number",
                "label": {
                    "en": "Extra general costs",
                    "de": "Allgemeine Sachkosten"
                }
            },
            "extraASKPlain": {
                "type": "String",
                "label": {
                    "en": "Extra general costs (plain)",
                    "de": "Allgemeine Sachkosten (ohne Währung)"
                }
            },
            "extraAHB": {
                "type": "Number",
                "label": {
                    "en": "General medical costs",
                    "de": "Allgemeine Heilbehandlung"
                }
            },
            "extraAHBPlain": {
                "type": "String",
                "label": {
                    "en": "General medical costs (plain)",
                    "de": "Allgemeine Heilbehandlung (ohne Währung)"
                }
            },
            "extraBHB": {
                "type": "Number",
                "label": {
                    "en": "Specific medical costs",
                    "de": "Besondere Heilbehandlung"
                }
            },
            "extraBHBPlain": {
                "type": "String",
                "label": {
                    "en": "Specific medical costs (plain)",
                    "de": "Besondere Heilbehandlung (ohne Währung)"
                }
            },
            "docName": {
                "type": "String",
                "label": {
                    "en": "Doctor Name",
                    "de": "Arzt Name"
                }
            },
            "practiceName": {
                "type": "String",
                "label": {
                    "en": "Practice Name",
                    "de": "Arztpraxis Name"
                }
            },
            "explanations": {
                "type": "String",
                "label": {
                    "en": "explanations",
                    "de": "Begründung"
                }
            },
            "longDescription": {
                "type": "String",
                "label": {
                    "en": "description and explanations",
                    "de": "Beschreibung, Begründung"
                }
            },
            "materialCostId": {
                "type": "String",
                "label": {
                    "en": "materialCostId",
                    "de": "materialCostId"
                }
            },
            "markExpenses": {
                "type": "String",
                "label": {
                    "en": "Is Expense?",
                    "de": "Auslagen"
                }
            }
        };

    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: []
    }
);