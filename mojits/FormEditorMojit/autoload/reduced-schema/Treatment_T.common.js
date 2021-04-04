/*
 *  Copyright DocCirrus GmbH 2015
 *
 *  Defines flat list of properties bound into forms
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-schema-Treatment-T',

    /* Module code */
    function(Y) {
        'use strict';

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.schema)  { Y.dcforms.schema = {}; }

        Y.dcforms.schema.Treatment_T = {
            "version": 1.0,
            "_lib": "activity",
            // SDEBM FIELDS
            // * GNR - Gebührennummer laut sdebm (tag ‚quittungstext' zu finden sind. Beachten Sie auch die Vorgaben zum Einsatz der GO-Stammdatei (sdebm))
            // * Kurzbeschreibung aus sdebm
            // * Punktewert aus sdebm

            "timestamp": {
                "type": "String",
                "label": {
                    "en": "Treat. date",
                    "de": "Leistungsdatum"
                }
            },
            "content": {
                "type": "String",
                "label": {
                    "en": "Description",
                    "de": "Kurzbeschreibung"
                }
            },
            "code": {
                "type": "String",
                "label": {
                    "en": "Code",
                    "de": "GNR"
                }
            },
            "actualPrice": {
                "type": "String",
                "label": {
                    "en": "Points",
                    "de": "Punkte"
                }
            },
            "price": {
                "type": "String",
                "label": {
                    "en": "Fee",
                    "de": "Honorar"
                }
            },
            "opAdditional": {
                "type": "String",
                "label": {
                    "en": "GO numbers addition",
                    "de": "GO-Nummern-Zusatz"
                }
            },
            "opPostOpCodes": {
                "type": "String",
                "label": {
                    "en": "GNR Additional Identifier",
                    "de": "GNR-Zusatzkennzeichen"   //  für poststationär erbrachte Leistungen:
                }
            },
            "opAdmissionDate": {
                "type": "String",
                "label": {
                    "en": "Admission date",
                    "de": "Aufnahmedatum"
                }
            },
            "opDischargeDate": {
                "type": "String",
                "label": {
                    "en": "Release date",
                    "de": "Entlassungsdatum"
                }
            },
            "opDate": {
                "type": "String",
                "label": {
                    "en": "OP date",
                    "de": "OP-Datum"
                }
            },
            "opCodes": {
                "type": "String",
                "label": {
                    "en": "OP key",
                    "de": "OP-Schlüssel"
                }
            },
            "opJustificationTreatment": {
                "type": "String",
                "label": {
                    "en": "GNR as justification",
                    "de": "GNR als Begründung"
                }
            },
            "opDuration": {
                "type": "String",
                "label": {
                    "en": "Total incision-suture time",
                    "de": "Gesamt Schnitt-Naht-Zeit"
                }
            },
            "opComplications": { //fk5038
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Complication",
                    "de": "Komplikation"
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