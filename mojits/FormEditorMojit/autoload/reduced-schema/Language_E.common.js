/*
 *  Copyright DocCirrus GmbH 2015
 *
 *  Defines flat list of properties bound into forms
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-schema-Language-E',

    /* Module code */
    function(Y) {
        'use strict';

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.schema)  { Y.dcforms.schema = {}; }

        Y.dcforms.schema.Language_E = {
            "version": 1.0,
            "type": "string",
            "_lib": "person",
            "enum": [
                "DE",
                "EN",
                "FR",
                "IT"
            ],
            "translate": {
                "DE": {
                    "en": "German",
                    "de": "Deutsch"
                },
                "EN": {
                    "en": "English",
                    "de": "Englisch"
                },
                "FR": {
                    "en": "French",
                    "de": "Französisch"
                },
                "IT": {
                    "en": "Italian",
                    "de": "Italienisch"
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