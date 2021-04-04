/*
 *  Copyright DocCirrus GmbH 2015
 *
 *  Defines flat list of properties bound into forms
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-schema-Event-T',

    /* Module code */
    function(Y) {
        'use strict';

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.schema)  { Y.dcforms.schema = {}; }

        Y.dcforms.schema.Event_T = {
            "version": 1.0,
            "_lib": "calendar",
            "start": {
                "type": "Date",
                "label": {
                    "en": "Start Date",
                    "de": "Begin"
                }
            },
            "day": {
                "type": "String",
                "label": {
                    "en": "Day of week",
                    "de": "Tag"
                }
            },
            "dateOnly": {
                "type": "String",
                "label": {
                    "en": "Date of appointment (no time)",
                    "de": "Datum"
                }
            },
            "timeOnly": {
                "type": "String",
                "label": {
                    "en": "Time of appointment (no date)",
                    "de": "Zeit"
                }
            },
            "title": {
                "required": true,
                "key": true,
                "type": "String",
                "label": {
                    "en": "Title",
                    "de": "Titel"
                }
            },
            "calendarName": {
                "type": "String",
                "label": {
                    "en": "calendarName",
                    "de": "Kalendername"
                }
            },
            "duration": {
                "type": "number",
                "future": "Integer",
                "label": {
                    "en": "duration",
                    "de": "Dauer"
                }
            },
            "locname": {
                "type": "String",
                "label": {
                    "en": "Location",
                    "de": "Betriebsstätte"
                }
            },
            "locaddress": {
                "type": "String",
                "label": {
                    "en": "Location Address",
                    "de": "Betriebsstättenadresse"
                }
            },
            "userDescr": {
                "type": "String",
                "label": {
                    "en": "Appointment description",
                    "de": "Bezeichnung"
                }
            },
            "details": {
                "type": "String",
                "label": {
                    "en": "Details",
                    "de": "Details"
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