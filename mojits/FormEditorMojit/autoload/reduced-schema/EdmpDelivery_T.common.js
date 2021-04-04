/**
 * User: do
 * Date: 28/09/16  16:47
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-schema-EdmpDelivery-T',

    /* Module code */
    function( Y /* , NAME */ ) {
        'use strict';

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.schema)  { Y.dcforms.schema = {}; }

        //  copy subset of properties from InCase_T
        Y.dcforms.schema.EdmpDelivery_T = {
            'edocTypeHeadline': {
                "type": "String",
                "label": {
                    "en": "eDokumentationstyp",
                    "de": "eDocumentationtype"
                }
            },
            'addresseeIk': {
                "type": "String",
                "label": {
                    "en": "Addressee",
                    "de": "Empfänger"
                }
            },
            'senderIk': {
                "type": "String",
                "label": {
                    "en": "Sender",
                    "de": "Absender"
                }
            },
            'creationDate': {
                "type": "String",
                "label": {
                    "en": "Date of Creation",
                    "de": "Erstellungsdatum"
                }
            },
            'number': {
                "type": "String",
                "label": {
                    "en": "Number",
                    "de": "Nummer"
                }
            },
            'content': {
                "type": "String",
                "label": {
                    "en": "Content",
                    "de": "Content"
                }
            }
        };

        //  replace mapper
        Y.dcforms.schema.EdmpDelivery_T.mapper = 'edmpdelivery';
    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: []
    }
);
