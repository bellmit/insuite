/*
 *  Copyright DocCirrus GmbH 2019
 *
 *  Properties for a table of cardiac episodes, MOJ-10966
 *
 *  Properties from XML are a repeating series like:
 *
 *      MDC_IDC_EPISODE_ID
 *      MDC_IDC_EPISODE_DTM
 *      MDC_IDC_EPISODE_TYPE
 *      MDC_IDC_EPISODE_TYPE_INDUCED
 *      MDC_IDC_EPISODE_VENDOR_TYPE
 *      MDC_IDC_EPISODE_ATRIAL_INTERVAL_AT_DETECTION
 *      MDC_IDC_EPISODE_ATRIAL_INTERVAL_AT_TERMINATION
 *      MDC_IDC_EPISODE_VENTRICULAR_INTERVAL_AT_DETECTION
 *      MDC_IDC_EPISODE_VENTRICULAR_INTERVAL_AT_TERMINATION
 *      MDC_IDC_EPISODE_DETECTION_THERAPY_DETAILS
 *      MDC_IDC_EPISODE_THERAPY_RESULT
 *      MDC_IDC_EPISODE_DURATION
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-schema-MdcIdcEpisode-T',

    /* Module code */
    function( Y ) {
        'use strict';

        if( !Y.dcforms ) {
            Y.dcforms = {};
        }
        if( !Y.dcforms.schema ) {
            Y.dcforms.schema = {};
        }

        Y.dcforms.schema.MdcIdcEpisode_T = {
            "version": 1.0,
            "ID": {
                "type": "String",
                "label": {
                    "en": "episodeId",
                    "de": "episodeId"
                }
            },
            "DTM": {
                "type": "String",
                "label": {
                    "en": "DTM",
                    "de": "DTM"
                }
            },
            "DTM_date": {
                "type": "String",
                "label": {
                    "en": "DTM (date, formatted)",
                    "de": "DTM (datum)"
                }
            },
            "DTM_time": {
                "type": "String",
                "label": {
                    "en": "DTM (time, formatted)",
                    "de": "DTM (zeit)"
                }
            },
            "TYPE": {
                "type": "String",
                "label": {
                    "en": "TYPE",
                    "de": "TYPE"
                }
            },
            "TYPE_INDUCED": {
                "type": "String",
                "label": {
                    "en": "TYPE_INDUCED",
                    "de": "TYPE_INDUCED"
                }
            },
            "VENDOR_TYPE": {
                "type": "String",
                "label": {
                    "en": "VENDOR_TYPE",
                    "de": "VENDOR_TYPE"
                }
            },
            "ATRIAL_INTERVAL_AT_DETECTION": {
                "type": "String",
                "label": {
                    "en": "ATRIAL_INTERVAL_AT_DETECTION",
                    "de": "ATRIAL_INTERVAL_AT_DETECTION"
                }
            },
            "ATRIAL_INTERVAL_AT_TERMINATION": {
                "type": "String",
                "label": {
                    "en": "ATRIAL_INTERVAL_AT_TERMINATION",
                    "de": "ATRIAL_INTERVAL_AT_TERMINATION"
                }
            },
            "VENTRICULAR_INTERVAL_AT_DETECTION": {
                "type": "String",
                "label": {
                    "en": "VENTRICULAR_INTERVAL_AT_DETECTION",
                    "de": "VENTRICULAR_INTERVAL_AT_DETECTION"
                }
            },
            "VENTRICULAR_INTERVAL_AT_TERMINATION": {
                "type": "String",
                "label": {
                    "en": "VENTRICULAR_INTERVAL_AT_TERMINATION",
                    "de": "VENTRICULAR_INTERVAL_AT_TERMINATION"
                }
            },
            "DETECTION_THERAPY_DETAILS": {
                "type": "String",
                "label": {
                    "en": "DETECTION_THERAPY_DETAILS",
                    "de": "DETECTION_THERAPY_DETAILS"
                }
            },
            "THERAPY_RESULT": {
                "type": "String",
                "label": {
                    "en": "THERAPY_RESULT",
                    "de": "THERAPY_RESULT"
                }
            },
            "DURATION": {
                "type": "String",
                "label": {
                    "en": "DURATION",
                    "de": "DURATION"
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