/*
 *  Copyright DocCirrus GmbH 2015
 *
 *  Defines flat list of properties bound into forms
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-schema-Communication-T',

    /* Module code */
    function(Y) {
        'use strict';

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.schema)  { Y.dcforms.schema = {}; }

        Y.dcforms.schema.Communication_T = {
            "version": 1.0,
            "_lib": "person",
            "type": {
                "required": true,
                "type": "Communication_E",
                "label": {
                    "en": "Contact Type",
                    "de": "Kontakttyp"
                }
            },
            "preferred": {
                "type": "Boolean",
                "label": {
                    "en": "Preferred",
                    "de": "bevorzugt"
                }
            },
            "value": {
                "required": true,
                "type": "String",
                "label": {
                    "en": "Value",
                    "de": "Inhalt"
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