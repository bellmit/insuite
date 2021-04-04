/*
 *  Copyright DocCirrus GmbH 2015
 *
 *  Defines flat list of properties bound into forms
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-schema-SelectedActivity-T',

    /* Module code */
    function(Y) {
        'use strict';

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.schema)  { Y.dcforms.schema = {}; }

        Y.dcforms.schema.SelectedActivity_T = {
            "version": 1.0,
            "activityId": {
                "required": true,
                "type": "String",
                "label": {
                    "en": "activityId",
                    "de": "activityId"
                }
            },
            "date": {
                "type": "String",
                "label": {
                    "en": "Treat. date",
                    "de": "Leistungsdatum"
                }
            },
            "code":{
                "type": "String",
                "label": {
                    "en": "Code",
                    "de": "Ziffer"
                }
            },
            "content": {
                "type": "String",
                "label": {
                    "en": "Content",
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