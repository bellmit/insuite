/*
 *  Copyright DocCirrus GmbH 2019
 *
 *  Extensions to Prescription-T schema for Swiss country mode
 */

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-schema-Prescription-CH-T',

    /* Module code */
    function(Y) {
        'use strict';

        /**
         *  If using Swiss mode, extend Prescription_T reduced schema with fields for swiss country mode.
         */

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.schema)  { Y.dcforms.schema = {}; }

        var
            swissModeFields = {
                'prescribedUntil1': {
                    "type": "Date",
                    "insuite_t": true,
                    "label": {
                        "en": 'Prescribed until 1',
                        "de": "Gültig bis 1"
                    }
                },
                'prescribedUntil2': {
                    "type": "Date",
                    "insuite_t": true,
                    "label": {
                        "en": 'Prescribed until 2',
                        "de": "Gültig bis 2"
                    }
                },
                'prescribedUntil3': {
                    "type": "Date",
                    "insuite_t": true,
                    "label": {
                        "en": 'Prescribed until 3',
                        "de": "Gültig bis 3"
                    }
                }
            },

            k;

        //  on the server, these fields cannot be defined immediately, we need to wait for the config to be loaded
        //  called by formtemplate-api runOnStart

        function init() {
            var hasSwissMode = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland();

            if ( !hasSwissMode ) { return; }

            //  Add to Prescription_T, already defined

            for ( k in swissModeFields ) {
                if ( swissModeFields.hasOwnProperty( k ) ) {
                    Y.dcforms.schema.Prescription_T[k] = swissModeFields[k];
                }
            }
        }

        Y.dcforms.initPrescription_CH_T = init;
        if ( Y.doccirrus.commonutils.isClientSide() ) {
            init();
        }
    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: [ 'dcforms-schema-Prescription-T', 'dcforms-utils' ]
    }
);