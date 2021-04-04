/*
 *  Copyright DocCirrus GmbH 2019
 *
 *  Properties for a table of cardiac device electrodes / leads, MOJ-10966
 *
 *  Properties from XML are a repeating series like:
 *
 *      MDC_IDC_LEAD
 *      MDC_IDC_LEAD_MODEL
 *      MDC_IDC_LEAD_SERIAL
 *      MDC_IDC_LEAD_MFG
 *      MDC_IDC_LEAD_IMPLANT_DT
 *      MDC_IDC_LEAD_POLARITY_TYPE
 *      MDC_IDC_LEAD_LOCATION
 *      MDC_IDC_LEAD_LOCATION_DETAIL_1
 *      MDC_IDC_LEAD_LOCATION_DETAIL_2
 *      MDC_IDC_LEAD_LOCATION_DETAIL_3
 *      MDC_IDC_LEAD_CONNECTION_STATUS
 *      MDC_IDC_LEAD_SPECIAL_FUNCTION
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-schema-MdcIdcLead-T',

    /* Module code */
    function( Y ) {
        'use strict';

        if( !Y.dcforms ) {
            Y.dcforms = {};
        }
        if( !Y.dcforms.schema ) {
            Y.dcforms.schema = {};
        }

        Y.dcforms.schema.MdcIdcLead_T = {
            "version": 1.0,
            "MODEL": {
                "type": "String",
                "label": {
                    "en": "MODEL",
                    "de": "MODEL"
                }
            },
            "SERIAL": {
                "type": "String",
                "label": {
                    "en": "SERIAL",
                    "de": "SERIAL"
                }
            },
            "MFG": {
                "type": "String",
                "label": {
                    "en": "MFG",
                    "de": "MFG"
                }
            },
            "IMPLANT_DT": {
                "type": "String",
                "label": {
                    "en": "IMPLANT_DT",
                    "de": "IMPLANT_DT"
                }
            },
            "POLARITY_TYPE": {
                "type": "String",
                "label": {
                    "en": "POLARITY_TYPE",
                    "de": "POLARITY_TYPE"
                }
            },
            "LOCATION": {
                "type": "String",
                "label": {
                    "en": "LOCATION",
                    "de": "LOCATION"
                }
            },
            "LOCATION_DETAIL_1": {
                "type": "String",
                "label": {
                    "en": "LOCATION_DETAIL_1",
                    "de": "LOCATION_DETAIL_1"
                }
            },
            "LOCATION_DETAIL_2": {
                "type": "String",
                "label": {
                    "en": "LOCATION_DETAIL_2",
                    "de": "LOCATION_DETAIL_2"
                }
            },
            "LOCATION_DETAIL_3": {
                "type": "String",
                "label": {
                    "en": "LOCATION_DETAIL_3",
                    "de": "LOCATION_DETAIL_3"
                }
            },
            "CONNECTION_STATUS": {
                "type": "String",
                "label": {
                    "en": "CONNECTION_STATUS",
                    "de": "CONNECTION_STATUS"
                }
            },
            "SPECIAL_FUNCTION": {
                "type": "String",
                "label": {
                    "en": "SPECIAL_FUNCTION",
                    "de": "SPECIAL_FUNCTION"
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