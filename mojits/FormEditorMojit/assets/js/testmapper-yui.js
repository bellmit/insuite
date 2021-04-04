/*
 *  Copyright DocCirrus GmbH 2013
 *
 *  Simple YUI module, central place to store paper size data
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-testmapper',

    /* Module code */
    function(Y) {
        'use strict';

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if (!Y.dcforms) { Y.dcforms = {}; }

        Y.dcforms.testMapper = function() {

        };

    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: []
    }
);