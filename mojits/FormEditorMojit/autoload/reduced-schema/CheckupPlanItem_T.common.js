/**
 *  Defines the columns of the table from CHECKUPPLAN activities, as mapped into their own forms
 *
 *  Copyright DocCirrus GmbH 2018
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-schema-CheckupPlanItem-T',

    /* Module code */
    function(Y) {
        'use strict';

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.schema) { Y.dcforms.schema = {}; }

        Y.dcforms.schema.CheckupPlanItem_T = {
            "version": 1.0,

            "stage": {
                "type": "String",
                "label": {
                    "en": "Stage",
                    "de": "Stage"
                }
            },

            "plannedFrom": {
                "type": "Date",
                "label": {
                    "en": "From (full)",
                    "de": "Von (voll)"
                }
            },
            "plannedTo": {
                "type": "Date",
                "label": {
                    "en": "To (full)",
                    "de": "Bis (voll)"
                }
            },
            "toleranceFrom": {
                "type": "Date",
                "label": {
                    "en": "Tolerance From (full)",
                    "de": "Toleranz Von (voll)"
                }
            },
            "toleranceTo": {
                "type": "Date",
                "label": {
                    "en": "Tolerance To (full)",
                    "de": "Toleranz Bis (voll)"
                }
            },
            "completed": {
                "type": "Date",
                "label": {
                    "en": "Completed (full)",
                    "de": "Erledight am (voll)"
                }
            },


            "plannedFromShort": {
                "type": "String",
                "label": {
                    "en": "From DD.MM.YYY",
                    "de": "Von DD.MM.YYY"
                }
            },
            "plannedToShort": {
                "type": "String",
                "label": {
                    "en": "To DD.MM.YYY",
                    "de": "Bis DD.MM.YYY"
                }
            },
            "toleranceFromShort": {
                "type": "String",
                "label": {
                    "en": "Tolerance From DD.MM.YYY",
                    "de": "Toleranz Von DD.MM.YYY"
                }
            },
            "toleranceToShort": {
                "type": "String",
                "label": {
                    "en": "Tolerance To DD.MM.YYY",
                    "de": "Toleranz Bis DD.MM.YYY"
                }
            },
            "completedShort": {
                "type": "String",
                "label": {
                    "en": "Completed DD.MM.YYY",
                    "de": "Erledight am DD.MM.YYY"
                }
            },


            "plannedDates": {
                "type": "String",
                "label": {
                    "en": "Ideal date range",
                    "de": "Untersuchungszeitraum"
                }
            },
            "toleranceDates": {
                "type": "String",
                "label": {
                    "en": "Acceptable date range",
                    "de": "Toleranzbereich"
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