/*
 *  Copyright DocCirrus GmbH 2016
 *
 *  Definition for mapping casefolder tables into PDF
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-schema-CaseFolderTableRow-T',

    /* Module code */
    function(Y) {
        'use strict';

        /**
         *  Used for tables of activities as shown in inCase (see table in CaseFileViewModel.client.js)
         */

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.schema)  { Y.dcforms.schema = {}; }

        Y.dcforms.schema.CaseFolderTableRow_T = {
            "version": 1.0,
            "_lib": "activity",

            "timestamp": {
                "type": "String",
                "label": {
                    "en": "timestamp",
                    "de": "timestamp"
                }
            },
            "actType": {
                "type": "String",
                "label": {
                    "en": "actType",
                    "de": "actType"
                }
            },
            "actTypeName": {
                "type": "String",
                "label": {
                    "en": "actType Name",
                    "de": "actType Name"
                }
            },
            "catalogShort": {
                "type": "String",
                "label": {
                    "en": "catalogShort",
                    "de": "catalogShort"
                }
            },
            "code": {
                "type": "String",
                "label": {
                    "en": "Code display",
                    "de": "Kode Anzeige"
                }
            },
            "content": {
                "type": "String",
                "label": {
                    "en": "content",
                    "de": "content"
                }
            },
            "caseFolderId": {
                "type": "String",
                "label": {
                    "en": "caseFolderId",
                    "de": "caseFolderId"
                }
            },
            "status": {
                "type": "String",
                "label": {
                    "en": "status",
                    "de": "status"
                }
            },
            "editorName": {
                "type": "String",
                "label": {
                    "en": "editorName",
                    "de": "editorName"
                }
            },
            "employeeName": {
                "type": "String",
                "label": {
                    "en": "employeeName",
                    "de": "employeeName"
                }
            },
            "locationId": {
                "type": "String",
                "label": {
                    "en": "locationId",
                    "de": "locationId"
                }
            },
            "locationName": {
                "type": "String",
                "label": {
                    "en": "locationName",
                    "de": "locationName"
                }
            },
            "price": {
                "type": "String",
                "label": {
                    "en": "price",
                    "de": "price"
                }
            },
            "billingFactorValue": {
                "type": "String",
                "label": {
                    "en": "billingFactorValue",
                    "de": "billingFactorValue"
                }
            },
            "quarterColumn": {
                "type": "String",
                "label": {
                    "en": "quarterColumn",
                    "de": "quarterColumn"
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