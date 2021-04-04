/**
 * User: do
 * Date: 13/07/16  09:00
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'v_kbvutility2approval-schema', function( Y, NAME ) {

        'use strict';

        var
            // ------- Schema definitions  -------
            i18n = Y.doccirrus.i18n,
            types = {};

        Y.log( 'Loading Schema ' + NAME, 'debug', NAME );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * MOJ-5065 this is a virtual schema and
         * does not actually have a collection related
         * to it in the DB.
         */
        types = Y.mix( types,
            {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "VKBVUtility2Approval_T",
                        "lib": types
                    }
                },
                "KBVUtility2ApprovalActType_E": {
                    "type": "String",
                    "default": "KBVUTILITY2APPROVAL",
                    "apiv": {v: 2, queryParam: false},
                    "list": [
                        {
                            "val": "KBVUTILITY2APPROVAL",
                            "-de": "HM Genehmigung",
                            i18n: i18n( 'activity-schema.Activity_E.KBVUTILITY2APPROVAL' ),
                            "-en": "HM Approval"
                        }
                    ]
                },
                "VKBVUtility2Approval_T": {
                    "activityBase": {
                        "complex": "ext",
                        "type": "Activity_T",
                        "lib": "activity"
                    },
                    "Base": {
                        "complex": "ext",
                        "type": "KBVUtility2Approval_T",
                        "lib": "activity"
                    },
                    "BaseKBVUtility2Base_T": {
                        "complex": "ext",
                        "type": "KBVUtility2Base_T",
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
