/*
 *  Copyright DocCirrus GmbH 2017
 *
 *  Properties for a single line of a Gravidogramm table mapping, each corresponding to one checkup / Untersuchung.
 *  Requires inGyn licence to use.
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-schema-GravidogrammItem-T',

    /* Module code */
    function(Y) {

        'use strict';

        /**
         *  Used for tables of linked activities such as medicationsTable, treatmentsTable, etc
         */

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.schema)  { Y.dcforms.schema = {}; }

        Y.dcforms.schema.GravidogrammItem_T = {
            "version": 1.0,
            "_lib": "activity",

            "date": {
                "type": "String",
                "label": {
                    "en": "Checkup. date",
                    "de": "Untersuchungsdatum"
                }
            },
            "time": {
                "type": "String",
                "label": {
                    "en": "Treat. time",
                    "de": "Leistungszeit"
                }
            },


            "WEEK_AND_DAY_OF_PREGNANCY": {
                "type": "String",
                "label": {
                    "en": "Week and day of pregnancy",
                    "de": "Schwangerschaftswoche und Tag"
                }
            },

            "WEEK_AND_DAY_CORRECTION": {
                "type": "String",
                "label": {
                    "en": "Week and day correction",
                    "de": "SSW ggf. Korr und Tag"
                }
            },
            "UTERINE_DISTANCE": {
                "type": "String",
                "label": {
                    "en": "Uterine distance",
                    "de": "Fundusstand"
                }
            },
            "FOETAL_POSITION": {
                "type": "String",
                "label": {
                    "en": "Fetal position",
                    "de": "Kindslage"
                }
            },
            "HEARTBEAT_PRESENT": {
                "type": "String",
                "label": {
                    "en": "Heartbeat present",
                    "de": "Herztöne"
                }
            },
            "MOVEMENT_PRESENT": {
                "type": "String",
                "label": {
                    "en": "Movement present",
                    "de": "Kindbewegung"
                }
            },
            "EDEMA": {
                "type": "String",
                "label": {
                    "en": "Edema",
                    "de": "Ödeme"
                }
            },
            "VARICOSIS": {
                "type": "String",
                "label": {
                    "en": "Varocosis",
                    "de": "Varikosis"
                }
            },
            "CHECKUP_WEIGHT": {
                "type": "String",
                "label": {
                    "en": "Weight",
                    "de": "Gewicht"
                }
            },
            "BLOODPRESSURE": {
                "type": "String",
                "label": {
                    "en": "Blood pressure",
                    "de": "Blutdruck"
                }
            },
            "HAEMOGLOBIN": {
                "type": "String",
                "label": {
                    "en": "Hb",
                    "de": "Hb"
                }
            },
            "US_PROTEIN": {
                "type": "String",
                "label": {
                    "en": "Protein (in urine)",
                    "de": "Eiweiß (Urin)"
                }
            },
            "US_SUGAR": {
                "type": "String",
                "label": {
                    "en": "Sugar (in urine)",
                    "de": "Zucker (Urin)"
                }
            },
            "US_NITRITE": {
                "type": "String",
                "label": {
                    "en": "Nitrate (in urine)",
                    "de": "Nitrit (Urin)"
                }
            },
            "US_BLOOD": {
                "type": "String",
                "label": {
                    "en": "Blood (in urine)",
                    "de": "Blut (Urin)"
                }
            },
            "PH_URINE": {
                "type": "String",
                "label": {
                    "en": "pH (urine)",
                    "de": "pH (Urin)"
                }
            },
            "PH_VAGINAL": {
                "type": "String",
                "label": {
                    "en": "pH (vaginal)",
                    "de": "pH (Vaginale)"
                }
            },
            "CX_VAGINAL": {
                "type": "String",
                "label": {
                    "en": "Cx (cervical length)",
                    "de": "Cx"
                }
            },
            "VAGINAL_EXAM": {
                "type": "String",
                "label": {
                    "en": "Vaginal exam",
                    "de": "vaginale Untersuchung"
                }
            },
            "RISK_CATEGORY": {
                "type": "String",
                "label": {
                    "en": "Risk category",
                    "de": "Risiko-Nr."
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