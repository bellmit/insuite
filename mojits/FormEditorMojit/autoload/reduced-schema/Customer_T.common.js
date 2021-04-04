/*
 *  Copyright DocCirrus GmbH 2015
 *
 *  Defines flat list of properties bound into forms
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-schema-Customer-T',

    /* Module code */
    function(Y) {
        'use strict';

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.schema)  { Y.dcforms.schema = {}; }

        Y.dcforms.schema.Customer_T = {
            "version": 1.0,
            "_lib": "person",
            "customerNo": {
                "type": "String",
                "label": {
                    "en": "Customer Number",
                    "de": "Kunden-Nr"
                }
            },
            "dcCustomerNo": {
                "type": "String",
                "label": {
                    "en": "Customer Number",
                    "de": "Kunden-Nr"
                }
            },
            "tenantId": {
                "type": "String",
                "label": {
                    "en": "Tenant ID",
                    "de": "Tenant ID"
                }
            },
            "activeState": {
                "type": "String",
                "label": {
                    "en": "Active",
                    "de": "Tätig"
                }
            },
            "coname": {
                "type": "String",
                "label": {
                    "en": "Company Name",
                    "de": "Firmennamen"
                }
            },
            "cotype": {
                "type": "CompanyType_E",
                "label": {
                    "en": "Company Type",
                    "de": "Unternehmensart"
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