/**
 * User: pi
 * Date: 17/02/16  16:10
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'v_quotation-schema', function( Y, NAME ) {

        'use strict';

        var
        // ------- Schema definitions  -------
            i18n = Y.doccirrus.i18n,
            types = {};

        Y.log( 'Loading Schema ' + NAME, 'debug', NAME );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        types = Y.mix( types,
            {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "VQuotation_T",
                        "lib": types
                    }
                },
                "QuotationActType_E": {
                    "type": "String",
                    "default": "QUOTATION",
                    "apiv": { v:2, queryParam: true },
                    "list": [
                        {
                            "val": "QUOTATION",
                            "-de": "Kostenplan",
                            i18n: i18n( 'activity-schema.Activity_E.QUOTATION' ),
                            "-en": "Cost estimate"
                        }
                    ]
                },
                "VQuotation_T": {
                    "actType": {
                        "complex": "eq",
                        "type": "QuotationActType_E",
                        "lib": types,
                        "apiv": { v:2, queryParam: false },
                        "required": true
                    },
                    "priceBase": {
                        "complex": "ext",
                        "type": "Price_T",
                        "lib": "activity"
                    },
                    "quotationBase": {
                        "complex": "ext",
                        "type": "Quotation_T",
                        "lib": "activity"
                    },
                    status: {
                        "type": "string",
                        "apiv": { v:2, queryParam: true },
                        "-en": "The status of an activity is read-only. Using this parameter in POST / PUT has no effect."
                    },
                    "activityBase": {
                        "complex": "ext",
                        "type": "Activity_T",
                        "lib": "activity"
                    },
                    "hasDiagnosisBase": {
                        "complex": "ext",
                        "type": "HasDiagnosis_T",
                        "lib": "activity"
                    }
                }
            }
        );

        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            /* MANDATORY */
            name: NAME,

            /* MANDATORY */
            types: types

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'activity-schema'
        ]
    }
);
