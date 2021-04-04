/*
 *  Copyright DocCirrus GmbH 2015
 *
 *  Defines flat list of properties bound into forms
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-schema-Medication-T',

    /* Module code */
    function(Y) {
        'use strict';

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.schema)  { Y.dcforms.schema = {}; }

        Y.dcforms.schema.Medication_T = {
            "version": 1.0,
            "code": {
                "schema": "activity",
                "path": "code"
            },
            "pharmaId": {
                "schema": "activity",
                "path": "pharmaId"
            },
            "pharmaCompany": {
                "schema": "activity",
                "path": "pharmaCompany"
            },
            "format": {
                "schema": "activity",
                "path": "format"
            },
            "packSize": {
                "schema": "activity",
                "path": "packSize"
            },
            "comment": {
                "schema": "activity",
                "path": "comment"
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