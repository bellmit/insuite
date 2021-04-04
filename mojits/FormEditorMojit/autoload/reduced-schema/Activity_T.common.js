/*
 *  Copyright DocCirrus GmbH 2015
 *
 *  Defines flat list of properties bound into forms
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-schema-Activity-T',

    /* Module code */
    function(Y) {
        'use strict';

        /**
         *  Used for tables of linked activities such as medicationsTable, treatmentsTable, etc
         */

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.schema)  { Y.dcforms.schema = {}; }

        Y.dcforms.schema.Activity_T = {
            "version": 1.0,
            "_lib": "activity",

            "actType": {
                "type": "String",
                "label": {
                    "en": "Type",
                    "de": "Typ"
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
            "content": {
                "type": "String",
                "label": {
                    "en": "Description",
                    "de": "Kurzbeschreibung"
                }
            },
            "codePlain": {
                "type": "String",
                "label": {
                    "en": "Code simple",
                    "de": "Kode einfach"
                }
            },
            "codeDisplay": {
                "type": "String",
                "label": {
                    "en": "Code display",
                    "de": "Kode Anzeige"
                }
            },
            "diagnosisSite": {
                "type": "String",
                "label": {
                    "en": "Diagnosis Site",
                    "de": "Seitenlokalisation"
                }
            },
            "dosis": {
                "type": "String",
                "label": {
                    "en": "Dosage (medications)",
                    "de": "Dosis"
                }
            },
            "pzn": {
                "type": "String",
                "label": {
                    "en": "phPZN (medications)",
                    "de": "phPZN (medikamente)"
                }
            },
            "subType": {
                "type": "String",
                "label": {
                    "en": "subType",
                    "de": "Subtype"
                }
            },
            "phNote": {
                "type": "String",
                "label": {
                    "en": "Note",
                    "de": "Hinweis"
                }
            },
            "phAtc": {
                "type": "String",
                "label": {
                    "en": "ATC",
                    "de": "ATC"
                }
            },
            "phIngr": {
                "type": "String",
                "label": {
                    "en": "Active ingredient",
                    "de": "Wirkstoffe"
                }
            },
            'quantityUnit': {
                "type": "String",
                "label": {
                    "en": 'Count',
                    "de": "Anzahl"
                }
            },
            "phDosisMorning": {
                "type": "String",
                "label": {
                    "en": "Morning",
                    "de": "Morgens"
                }
            },
            "phDosisAfternoon": {
                "type": "String",
                "label": {
                    "en": "Afternoon",
                    "de": "Mittags"
                }
            },
            "phDosisEvening": {
                "type": "String",
                "label": {
                    "en": "Evening",
                    "de": "Abends"
                }
            },
            "phDosisNight": {
                "type": "String",
                "label": {
                    "en": "Night",
                    "de": "Nacht"
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