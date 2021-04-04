/**
 * User: pi
 * Date: 21/01/2016  13:35
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'v_referral-schema', function( Y, NAME ) {

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
                        "type": "VReferral_T",
                        "lib": types
                    }
                },
                "ReferralActType_E": {
                    "type": "String",
                    "default": "REFERRAL",
                    "apiv": { v:2, queryParam: true },
                    "list": [
                        {
                            "val": "REFERRAL",
                            "-de": "Überweisung",
                            i18n: i18n( 'activity-schema.Activity_E.REFERRAL' ),
                            "-en": "Referral"
                        }
                    ]
                },
                "VReferral_T": {
                    "actType": {
                        "complex": "eq",
                        "type": "ReferralActType_E",
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
                        "type": "Referral_T",
                        "lib": "activity"
                    },
                    "ETSBase": {
                        "complex": "ext",
                        "type": "BaseETS_T",
                        "lib": "activity"
                    },
                    "eTSReferralBase": {
                        "complex": "ext",
                        "type": "ETSReferral_T",
                        "lib": "activity"
                    },
                    "laborBase":{
                        "complex": "ext",
                        "type": "Labor_T",
                        "lib": "activity"
                    },
                    "labRequestReferralBase":{
                        "complex": "ext",
                        "type": "LabRequestReferral_T",
                        "lib": "activity"
                    },
                    "scheinFlagsBase": {
                        "complex": "ext",
                        "type": "ScheinFlags_T",
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
