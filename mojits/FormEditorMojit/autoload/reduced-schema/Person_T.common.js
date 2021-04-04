/*
 *  Copyright DocCirrus GmbH 2015
 *
 *  Defines flat list of properties bound into forms
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-schema-Person-T',

    /* Module code */
    function(Y) {
        'use strict';

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.schema)  { Y.dcforms.schema = {}; }

        Y.dcforms.schema.Person_T = {
            "version": 1.0,
            "_lib": "person",
            "talk": {
                "required": true,
                "type": "String",
                "label": {
                    "en": "Talk",
                    "de": "Anrede"
                }
            },
            "title": {
                "type": "String",
                "label": {
                    "en": "Title",
                    "de": "Titel"
                }
            },
            "firstname": {
                "required": true,
                "type": "String",
                "label": {
                    "en": "First Name",
                    "de": "Vorname"
                }
            },
            "middlename": {
                "type": "String",
                "label": {
                    "en": "Middle Name",
                    "de": "Zweiter Vorname"
                }
            },
            "lastname": {
                "required": true,
                "type": "String",
                "label": {
                    "en": "Surname",
                    "de": "Nachname"
                }

            },
            "civilStatus": {
                "complex": "eq",
                "type": "CivilStatus_E",
                "lib": "reduced",
                "label": {
                    "en": "Civil Status",
                    "de": "Zivilstand"
                }
            },
            "comment": {
                "type": "String",
                "label": {
                    "en": "Comment",
                    "de": "Kommentar"
                }
            },
            "gender": {
                "complex": "eq",
                "type": "Gender_E",
                "lib": "reduced",
                "label": {
                    "en": "Sex",
                    "de": "Geschlecht"
                }
            },
            "lang": {
                "complex": "eq",
                "type": "Language_E",
                "lib": "reduced",
                "label": {
                    "en": "Language",
                    "de": "Sprache"
                }
            },
            "dob": {
                "type": "Date",
                "label": {
                    "en": "Date of Birth",
                    "de": "Geburtsdatum"
                }
            },
            "jobTitle": {
                "type": "String",
                "label": {
                    "en": "Job Title",
                    "de": "Beruf"
                }
            },
            "communications": {
                "type": "Communication_T",
                "label": {
                    "en": "Contact details",
                    "de": "Kontaktdaten"
                }
            },
            "events": {
                "type": "Event_T",
                "label": {
                    "en": "appointments",
                    "de": "Termine"
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