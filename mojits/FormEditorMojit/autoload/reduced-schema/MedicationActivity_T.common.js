/*
 *  Copyright DocCirrus GmbH 2015
 *
 *  Defines flat list of properties bound into forms
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-schema-MedicationActivity-T',

    /* Module code */
    function(Y) {
        'use strict';

        /**
         *  Used for tables of linked medications similar to MedicationsPlan (medicationsTable binding)
         *
         *  Tidying up extra medication columns fopr MOJ-10758, where they were previously accumulating in the generic
         *  Activity_T reduced schema.
         */

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.schema)  { Y.dcforms.schema = {}; }

        Y.dcforms.schema.MedicationActivity_T = {
            "version": 1.0,
            "_lib": "activity",

            "date": {
                "type": "String",
                "label": {
                    "en": "MMI date",
                    "de": "Datum"
                }
            },
            "time": {
                "type": "String",
                "label": {
                    "en": "MMI time",
                    "de": "Zeit"
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
                    "en": "Catalog Code",
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
            "dosis": {
                "type": "String",
                "label": {
                    "en": "Dosage (medications)",
                    "de": "Dosis"
                }
            },
            "phPZN": {
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
                    "en": "Active ingredient and strength",
                    "de": "Wirkstoff m. Stärke"
                }
            },
            "phForm": {
                "type": "String",
                "label": {
                    "en": "Form of medication",
                    "de": "DRF"
                }
            },
            "phName": {
                "type": "String",
                "label": {
                    "en": "Active ingrediant",
                    "de": "Wirkstoff"
                }
            },
            "phShortName": {
                "type": "String",
                "label": {
                    "en": "Active ingrediant (short)",
                    "de": "Wirkstoff (kurz)"
                }
            },
            "phStrength": {
                "type": "String",
                "label": {
                    "en": "Strength",
                    "de": "Stärke"
                }
            },
            "phReason": {
                "type": "String",
                "label": {
                    "en": "Reason",
                    "de": "Grund"
                }
            },
            "phUnit": {
                "type": "String",
                "label": {
                    "en": "Unit",
                    "de": "Einheit"
                }
            },
            "phCompany": {
                "type": "String",
                "label": {
                    "en": "Manufactory",
                    "de": "Hersteller"
                }
            },
            "phNLabel": {
                "type": "String",
                "label": {
                    "en": "N-labeling",
                    "de": "N-Kennzeichnung"
                }
            },
            "phPriceSale": {
                "type": "String",
                "label": {
                    "en": "Sale Price",
                    "de": "Preis"
                }
            },
            "phContinuousMedDate": {
                "type": "String",
                "label": {
                    "en": "Prescribed until",
                    "de": "Gültig bis"
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