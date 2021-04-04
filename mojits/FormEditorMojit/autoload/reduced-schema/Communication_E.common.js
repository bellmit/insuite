/*
 *  Copyright DocCirrus GmbH 2015
 *
 *  Defines flat list of properties bound into forms
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-schema-Communication-E',

    /* Module code */
    function(Y) {
        'use strict';

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.schema)  { Y.dcforms.schema = {}; }

        Y.dcforms.schema.Communication_E = {
            "version": 1.1,
            "import": {
                "lib": "person",
                "type": "Communication_E"
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