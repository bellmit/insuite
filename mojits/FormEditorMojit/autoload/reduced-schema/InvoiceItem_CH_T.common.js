/*
 *  Copyright DocCirrus GmbH 2019
 *
 *  Swiss country mode extensions for tables of treatments in invoices and quotations
 */

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-schema-InvoiceItem-CH-T',

    /* Module code */
    function(Y) {
        'use strict';

        /**
         *  If using Swiss mode, extend InCase_T reduced schema with fields for swiss country mode.
         */

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.schema)  { Y.dcforms.schema = {}; }

        //  on the server, these fields cannot be defined immediately, we need to wait for the config to be loaded
        //  called by formtemplate-api runOnStart

        function init() {

            var
                Treatment_CH_T = Y.doccirrus.schemas.activity.types.Treatment_CH_T,
                hasSwissMode = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland(),
                k;

            if ( !hasSwissMode ) { return; }

            //  Add to InvoiceItem_T

            for ( k in Treatment_CH_T ) {
                if ( Treatment_CH_T.hasOwnProperty( k ) ) {
                    Y.dcforms.schema.InvoiceItem_T[k] = {
                        'label': {
                            'de': Treatment_CH_T[k]['-de'],
                            'en': Treatment_CH_T[k]['-en']
                        },
                        'type': Treatment_CH_T[k].type,
                        "model": "activity"
                    };
                }
            }
        }

        Y.dcforms.initInvoiceItem_CH_T = init;

        if ( Y.doccirrus.commonutils.isClientSide() ) { init(); }
    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: [ 'dcforms-schema-InvoiceItem-T', 'dcforms-utils' ]
    }
);