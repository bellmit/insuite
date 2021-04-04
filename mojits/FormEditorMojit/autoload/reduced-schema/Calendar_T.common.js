/*
 *  Copyright DocCirrus GmbH 2015
 *
 *  Defines flat list of properties bound into forms
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-schema-Calendar-T',

    /* Module code */
    function(Y) {
        'use strict';

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.schema)  { Y.dcforms.schema = {}; }

        Y.dcforms.schema.Calendar_T = {
            "version": 1.0,
            "_lib": "calendar",

            "name": {
                "type": "String",
                "label": {
                    "en": "Name",
                    "de": "Name"
                }
            },

            "descr": {
                "type": "String",
                "label": {
                    "en": "Description",
                    "de": "Beschreibung"
                }
            },

            "isPublic": {
                "type": "Boolean",
                "label": {
                    "en": "Is Public",
                    "de": "Ist öffentlich"
                }
            },

            "type": {
                "type": "CalType_E",
                "label": {
                    "en": "Type",
                    "de": "Typ"
                }
            },

            "employee": {
                "type": "String",
                "label": {
                    "en": "Employee",
                    "de": "Mitarbeiter"
                }
            },

            "locationId": {
                "type": "String",
                "label": {
                    "en": "Location",
                    "de": "Betriebsstätte"
                }
            },

            "consultTimes": {
                "type": "WeeklyTime_T",
                "label": {
                    "en": "Consultation Times",
                    "de": "Sprechzeiten"
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