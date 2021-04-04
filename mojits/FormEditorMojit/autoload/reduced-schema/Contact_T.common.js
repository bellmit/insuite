/*
 *  Copyright DocCirrus GmbH 2019
 *
 *  Defines flat list of properties bound into forms, used to map contacts into a table for serial letters
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-schema-Contact-T',

    /* Module code */
    function(Y) {
        'use strict';

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.schema)  { Y.dcforms.schema = {}; }

        Y.dcforms.schema.Contact_T = {
            "version": 1.0,
            "_lib": "basecontact",
            "card": {
                "type": "String",
                "label": {
                    "en": "Card",
                    "de": "Karte"
                }
            },
            "cardLine": {
                "type": "String",
                "label": {
                    "en": "Card (one line)",
                    "de": "Karte (einzelne Zeile)"
                }
            },
            "address": {
                "type": "String",
                "label": {
                    "en": "Address",
                    "de": "Address"
                }
            },
            "content": {
                "type": "String",
                "label": {
                    "en": "Content",
                    "de": "Name"
                }
            },
            "roleString": {
                "type": "String",
                "label": {
                    "en": "role",
                    "de": "Rolle"
                }
            },
            "title": {
                "type": "String",
                "label": {
                    "en": "title",
                    "de": "Akad. Titel"
                }
            },
            "talk": {
                "type": "String",
                "label": {
                    "en": "talk",
                    "de": "Anrede"
                }
            },
            "firstname": {
                "type": "String",
                "label": {
                    "en": "Firstname",
                    "de": "Vorname"
                }
            },
            "lastname": {
                "type": "String",
                "label": {
                    "en": "Lastname",
                    "de": "Nachname"
                }
            },
            "nameaffix": {
                "type": "String",
                "label": {
                    "en": "Name Affix",
                    "de": "Namenszusatz"
                }
            },
            "basecontactType": {
                "type": "String",
                "label": {
                    "en": "Contact Type",
                    "de": "Kontakt-Typ"
                }
            },
            "institutionType": {
                "type": "String",
                "label": {
                    "en": "Instiotution Type",
                    "de": "Institutionstyp"
                }
            },
            "institutionName": {
                "type": "String",
                "label": {
                    "en": "Name on Institution",
                    "de": "Name der Einrichtung"
                }
            },
            "expertise": {
                "type": "String",
                "label": {
                    "en": "expertise",
                    "de": "Fachkenntnisse"
                }
            },
            "expertiseText": {
                "type": "String",
                "label": {
                    "en": "Expertise (text)",
                    "de": "Fachkenntnisse (Text)"
                }
            },
            "workDescription": {
                "type": "String",
                "label": {
                    "en": "Job description",
                    "de": "Jobbezeichnung"
                }
            },
            "officialNo": {
                "type": "String",
                "label": {
                    "en": "Lifetime Physician No",
                    "de": "Lebenslange Arztnr."
                }
            },
            "nonStandardOfficialNo": {
                "type": "String",
                "label": {
                    "en": "Non-standard professional ID number",
                    "de": "Ausnahmewert"
                }
            },
            "glnNumber": {
                "type": "String",
                "label": {
                    "en": "GLN number",
                    "de": "GLN Nummer"
                }
            },
            "zsrNumber": {
                "type": "String",
                "label": {
                    "en": "ZSR number",
                    "de": "ZSR Nummer"
                }
            },
            "kNumber": {
                "type": "String",
                "label": {
                    "en": "K number",
                    "de": "K Nummer"
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