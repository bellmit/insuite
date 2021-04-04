/*
 *  Copyright DocCirrus GmbH 2016
 *
 *  Properties for labdata tables
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-schema-Labdata-T',

    /* Module code */
    function(Y) {
        'use strict';

        /**
         *  Used for tables of linked activities such as medicationsTable, treatmentsTable, etc
         */

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.schema)  { Y.dcforms.schema = {}; }

        Y.dcforms.schema.Labdata_T = {
            "version": 1.0,
            "head": {
                "type": "String",
                "label": {
                    "en": "Type (head)",
                    "de": "Typ (head)"
                }
            },
            "min": {
                "type": "String",
                "label": {
                    "en": "Min",
                    "de": "Min"
                }
            },
            "max": {
                "type": "String",
                "label": {
                    "en": "Max",
                    "de": "Max"
                }
            },
            "unit": {
                "type": "String",
                "label": {
                    "en": "Unit",
                    "de": "Einheit"
                }
            },
            "content": {
                "type": "String",
                "label": {
                    "en": "Description",
                    "de": "Beschreibung"
                }
            },
            "labTestLabel": {
                "type": "String",
                "label": {
                    "en": "Test Label",
                    "de": "Bezeichnung"
                }
            },
            "labNormalText": {
                "type": "String",
                "label": {
                    "en": "Normal",
                    "de": "Normal"
                }
            },
            labName: {
                type: "String",
                label: {
                    en: "Laboratory",
                    de: "Labor"
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