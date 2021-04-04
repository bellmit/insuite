/*
 *  Copyright DocCirrus GmbH 2015
 *
 *  Defines flat list of properties bound into forms
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-schema-Document-T',

    /* Module code */
    function(Y) {
        'use strict';

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.schema)  { Y.dcforms.schema = {}; }

        Y.dcforms.schema.Document_T = {
            "version": 1.0,
            "_lib": "document",
            "type": {
                "required": true,
                "type": "DocType_E",
                "label": {
                    "en": "Document type",
                    "de": "Dokumentenart"
                }
            },
            "url": {
                "type": "String",
                "label": {
                    "en": "URL",
                    "de": "URL"
                }
            },
            "publisher": {
                "required": true,
                "type": "String",
                "label": {
                    "en": "Publisher",
                    "de": "Quelle"
                }
            },
            "content": {
                "type": "String",
                "label": {
                    "en": "Content",
                    "de": "Inhalt"
                }
            },
            "docId": {
                "required": true,
                "type": "String",
                "label": {
                    "en": "Document Id",
                    "de": "Dokument-ID"
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