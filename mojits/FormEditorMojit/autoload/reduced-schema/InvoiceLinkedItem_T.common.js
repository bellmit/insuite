/*
 *  Copyright DocCirrus GmbH 2015
 *
 *  Defines flat list of properties bound into forms
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-schema-InvoiceLinkedItem-T',

    /* Module code */
    function( Y ) {
        'use strict';

        if( !Y.dcforms ) {
            Y.dcforms = {};
        }
        if( !Y.dcforms.schema ) {
            Y.dcforms.schema = {};
        }

        Y.dcforms.schema.InvoiceLinkedItem_T = {
            "version": 1.0,
            "activityId": {
                "required": true,
                "type": "String",
                "label": {
                    "en": "activityId",
                    "de": "activityId"
                }
            },
            "date": {
                "type": "String",
                "label": {
                    "en": "date",
                    "de": "Datum"
                }
            },
            "timestamp": {
                "type": "String",
                "label": {
                    "en": "Timestamp",
                    "de": "Datumzeit"
                }
            },
            "amount": {
                "type": "String",
                "label": {
                    "en": "Ammount (number)",
                    "de": "Betrag (nummer)"
                }
            },
            "amountFormatted": {
                "type": "String",
                "label": {
                    "en": "Ammount (formatted, currency)",
                    "de": "Betrag"
                }
            },
            "amountPlain": {
                "type": "String",
                "label": {
                    "en": "Ammount (formatted, plain)",
                    "de": "Betrag (ohne Währung)"
                }
            },
            "actType": {
                "type": "String",
                "label": {
                    "en": "Activity Type",
                    "de": "Eintragstyp"
                }
            },
            "content": {
                "type": "String",
                "label": {
                    "en": "Description",
                    "de": "Beschreibung"
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