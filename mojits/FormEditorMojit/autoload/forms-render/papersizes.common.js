/*
 *  Copyright DocCirrus GmbH 2013
 *
 *  Simple YUI module, central place to store paper size data
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-papersizes',

    /* Module code */
    function(Y) {
        'use strict';

        /**
         *  Extend YUI object with a method to instantiate these
         *
         *  The paper name is that used in the forms dialogs, the hpdf property is the paper geometry name used by the
         *  libharu PDF library
         */

        if (!Y.dcforms) { Y.dcforms = {}; }

        Y.dcforms.paperSizes =  [
            { name: 'A3', width: 297, height: 420, hpdf: 'a3' },
            { name: 'A4', width: 210, height: 297, hpdf: 'a4' },
            { name: 'A5', width: 148, height: 210, hpdf: 'a5' },
            { name: 'A6', width: 105, height: 148, hpdf: 'a6' },
            { name: 'USLetter', width: 216, height: 279, hpdf: 'letter' },
            { name: 'USLegal', width: 216, height: 356, hpdf: 'legal' },
            { name: 'Header', width: 210, height: 50, hpdf: '' },
            { name: 'C4', width: 324, height: 229, hpdf: '' },
            { name: 'C5', width: 229, height: 162, hpdf: '' },
            { name: 'C6', width: 162, height: 114, hpdf: '' },
            { name: 'DL', width: 220, height: 110, hpdf: '' }
        ];

        Y.dcforms.getPaperSizeHPDF = function(width, height) {
            var ps = Y.dcforms.paperSizes,
                i;

            for (i = 0; i < ps.length; i++) {
                if ((ps[i].width === width) && (ps[i].height === height)) {
                    return ps[i].hpdf;
                }
                if ((ps[i].height === width) && (ps[i].width === height)) {
                    return ps[i].hpdf;
                }
            }

            //  default
            return 'a4';
        };

        Y.dcforms.getPaperSizeName = function(width, height) {
            var ps = Y.dcforms.paperSizes,
                i;

            for (i = 0; i < ps.length; i++) {
                if ((ps[i].width === width) && (ps[i].height === height)) {
                    return ps[i].name;
                }
                if ((ps[i].height === width) && (ps[i].width === height)) {
                    return ps[i].name;
                }
            }

            //  default
            return 'Custom';
        };

    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: []
    }
);