
/*global YUI*/
YUI.add( 'v_stockdispense-schema', function( Y, NAME ) {

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
                        "type": "VStockDispense_T",
                        "lib": types
                    }
                },
                "StockDispenseActType_E": {
                    "type": "String",
                    "default": "STOCKDISPENSE",
                    "apiv": { v:2, queryParam: true },
                    "list": [
                        {
                            "val": "STOCKDISPENSE",
                            "-de": "Abgabe",
                            i18n: i18n( 'activity-schema.Activity_E.STOCKDISPENSE' ),
                            "-en": "Dispense"
                        }
                    ]
                },
                "VStockDispense_T": {
                    "actType": {
                        "complex": "eq",
                        "type": "StockDispenseActType_E",
                        "lib": types,
                        "apiv": { v:2, queryParam: false },
                        "required": true
                    },
                    "activityBase": {
                        "complex": "ext",
                        "type": "Activity_T",
                        "lib": "activity"
                    },
                    "Base": {
                        "complex": "ext",
                        "type": "StockDispense_T",
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
/**
 * User: dcdev
 * Date: 4/10/19  2:39 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
