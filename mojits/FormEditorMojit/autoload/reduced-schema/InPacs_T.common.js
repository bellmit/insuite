/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

'use strict';
YUI.add(
    /* YUI module name */
    'dcforms-schema-InPacs-T',

    /* Module code */
    function( Y ) {

        var
            inCase_T = Y.dcforms.schema.InCase_T,
            k;

        if( !Y.dcforms ) {
            Y.dcforms = {};
        }
        if( !Y.dcforms.schema ) {
            Y.dcforms.schema = {};
        }

        Y.dcforms.schema.InPacs_T = {
            "version": 1,
            "eingabe": {
                "type": "String",
                "label": {
                    "en": "Eingabe",
                    "de": "Eingabe"
                }
            }
        };

        for( k in inCase_T ) {
            if( inCase_T.hasOwnProperty( k ) ) {
                if( inCase_T[k].hasOwnProperty( 'inpacs' ) && inCase_T[k].inpacs && !Y.dcforms.schema.InPacs_T[k] ) {
                    Y.dcforms.schema.InPacs_T[k] = inCase_T[k];
                }
            }
        }

        //  replace mapper
        Y.dcforms.schema.InSuite_T.mapper = 'inpacs';
    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: []
    }
);