/*
 *  Copyright DocCirrus GmbH 2019
 *
 *  Properties for a table of cardiac event zones, MOJ-10966
 *
 *  Properties from XML are a repeating series like:
 *
 *      MDC_IDC_SET_ZONE_TYPE
 *      MDC_IDC_SET_ZONE_VENDOR_TYPE
 *      MDC_IDC_SET_ZONE_STATUS
 *      MDC_IDC_SET_ZONE_DETECTION_INTERVAL
 *      MDC_IDC_SET_ZONE_DETECTION_BEATS_NUMERATOR
 *      MDC_IDC_SET_ZONE_DETECTION_BEATS_DENOMINATOR
 *      MDC_IDC_SET_ZONE_DETECTION_DETAILS
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-schema-MdcIdcZone-T',

    /* Module code */
    function( Y ) {
        'use strict';

        if( !Y.dcforms ) {
            Y.dcforms = {};
        }
        if( !Y.dcforms.schema ) {
            Y.dcforms.schema = {};
        }

        Y.dcforms.schema.MdcIdcZone_T = {
            "version": 1.0,
            "TYPE": {
                "type": "String",
                "label": {
                    "en": "TYPE",
                    "de": "TYPE"
                }
            },
            "VENDOR_TYPE": {
                "type": "String",
                "label": {
                    "en": "VENDOR_TYPE",
                    "de": "VENDOR_TYPE"
                }
            },
            "STATUS": {
                "type": "String",
                "label": {
                    "en": "STATUS",
                    "de": "STATUS"
                }
            },
            "DETECTION_INTERVAL": {
                "type": "String",
                "label": {
                    "en": "DETECTION_INTERVAL",
                    "de": "DETECTION_INTERVAL"
                }
            },
            "DETECTION_BEATS_NUMERATOR": {
                "type": "String",
                "label": {
                    "en": "DETECTION_BEATS_NUMERATOR",
                    "de": "DETECTION_BEATS_NUMERATOR"
                }
            },
            "DETECTION_BEATS_DENOMINATOR": {
                "type": "String",
                "label": {
                    "en": "DETECTION_BEATS_DENOMINATOR",
                    "de": "DETECTION_BEATS_DENOMINATOR"
                }
            },
            "DETECTION_DETAILS": {
                "type": "String",
                "label": {
                    "en": "DETECTION_DETAILS",
                    "de": "DETECTION_DETAILS"
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