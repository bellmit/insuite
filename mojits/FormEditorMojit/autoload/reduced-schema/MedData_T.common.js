/*
 *  Copyright DocCirrus GmbH 2015
 *
 *  Defines flat list of properties bound into forms
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-schema-MedData-T',

    /* Module code */
    function(Y) {
        'use strict';

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.schema)  { Y.dcforms.schema = {}; }

        Y.dcforms.schema.MedData_T = {
            "version": 1.0,
            "category": {
                "type": "String",
                "label": {
                    "en": "Category",
                    "de": "Kategorie"
                }
            },
            "categoryTranslated": {
                "type": "String",
                "label": {
                    "en": "Category (translated)",
                    "de": "Kategorie (übersetzt)"
                }
            },
            "type": {
                "type": "String",
                "label": {
                    "en": "Type",
                    "de": "Typ"
                }
            },
            "head": {
                "type": "String",
                "label": {
                    "en": "type (translated)",
                    "de": "Typ (übersetzt)"
                }
            },
            "value": {
                "type": "String",
                "label": {
                    "en": "Numeric Value",
                    "de": "Ergebnis-Wert"
                }
            },
            "textValue": {
                "type": "String",
                "label": {
                    "en": "Text Value",
                    "de": "Ergebnis-Text"
                }
            },
            "boolValue": {
                "type": "String",
                "label": {
                    "en": "Boolean Value",
                    "de": "Ergebnis-Ja/Nein"
                }
            },
            "dateValue": {
                "type": "String",
                "label": {
                    "en": "Date Value",
                    "de": "Ergebnis-Datum"
                }
            },
            "formatted": {
                "type": "String",
                "label": {
                    "en": "Formatted value",
                    "de": "Formatierter Wert"
                }
            },
            "display": {
                "type": "String",
                "label": {
                    "en": "Numeric and Text Value",
                    "de": "Ergebnis (Wert + Text)"
                }
            },
            "unit": {
                "type": "String",
                "label": {
                    "en": "Unit",
                    "de": "Einheit"
                }
            },
            "measurementDate": {
                "type": "String",
                "label": {
                    "en": "Date",
                    "de": "Datum"
                }
            },
            "additionalData": {
                "type": "String",
                "label": {
                    "en": "Additional Data",
                    "de": "Weitere Daten"
                }
            },
            "_id": {
                "type": "String",
                "label": {
                    "en": "ID",
                    "de": "ID"
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
