/**
 * User: pi
 * Date: 17/02/16  16:10
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'v_docletter-schema', function( Y, NAME ) {

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
                        "type": "VDocLetter_T",
                        "lib": types
                    }
                },
                "DocLetterActType_E": {
                    "type": "String",
                    "default": "DOCLETTER",
                    "apiv": { v:2, queryParam: true },
                    "list": [
                        {
                            "val": "DOCLETTER",
                            "-de": "Arztbrief",
                            i18n: i18n( 'activity-schema.Activity_E.DOCLETTER' ),
                            "-en": "Doctors' letter"
                        }
                    ]
                },
                "VDocLetter_T": {
                    "actType": {
                        "complex": "eq",
                        "type": "DocLetterActType_E",
                        "lib": types,
                        "apiv": { v:2, queryParam: false },
                        "required": true
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
                    "Base": {
                        "complex": "ext",
                        "type": "Invoice_T",
                        "lib": "activity"
                    },
                    "EDocLetter_TBase": {
                        "complex": "ext",
                        "type": "EDocLetter_T",
                        "lib": "activity"
                    },
                    "KimBase_TBase": {
                        "complex": "ext",
                        "type": "KimBase_T",
                        "lib": "activity"
                    },
                    "priceBase": {
                        "complex": "ext",
                        "type": "Price_T",
                        "lib": "activity"
                    },
                    "hasDiagnosisBase": {
                        "complex": "ext",
                        "type": "HasDiagnosis_T",
                        "lib": "activity"
                    },
                    "formExtraContact": {
                        "complex": "ext",
                        "type": "FormExtraContact_T",
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
