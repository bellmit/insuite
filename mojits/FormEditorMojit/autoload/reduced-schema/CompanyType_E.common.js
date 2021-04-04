/*
 *  Copyright DocCirrus GmbH 2015
 *
 *  Defines flat list of properties bound into forms
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */
'use strict';
YUI.add(
    /* YUI module name */
    'dcforms-schema-CompanyType-E',

    /* Module code */
    function(Y) {

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.schema)  { Y.dcforms.schema = {}; }

        Y.dcforms.schema.CompanyType_E = {
            "version": 1.1,
            "type": "string",

            "import": {
                "lib": "company",
                "type": "CompanyType_E"
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