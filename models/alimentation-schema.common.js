/*global YUI */
'use strict';

YUI.add( 'alimentation-schema', function( Y, NAME ) {
        /**
         * The DC case data schema definition
         *
         * @module DCAlimentation - collection of alimentations
         */

        var

        // ------- Schema definitions  -------
            i18n = Y.doccirrus.i18n,
            ramlConfig = {
                "2": {
                    description: "The alimentation collection holds all data relevant to a possible patient food habits."
                }
            },
            defaultItems = [
                { "name":"COFFEIN", "_id": "000000000000000000000011" },
                { "name":"FASTFOOD", "_id": "000000000000000000000012" },
                { "name":"MEAT", "_id": "000000000000000000000013" }
            ],
            types = {};

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "Alimentation_T",
                        "lib": types
                    }
                },
                "AlimentationName_E": {
                    "type": "String",
                    "list": [
                        {
                            "val": "COFFEIN",
                            i18n: i18n( 'alimentation-schema.AlimentationName_E.COFFEIN' )
                        },
                        {
                            "val": "FASTFOOD",
                            i18n: i18n( 'alimentation-schema.AlimentationName_E.FASTFOOD' )
                        },
                        {
                            "val": "MEAT",
                            i18n: i18n( 'alimentation-schema.AlimentationName_E.MEAT' )
                        }
                    ],
                    i18n: i18n( 'alimentation-schema.AlimentationName_E.i18n' )
                },
                "Alimentation_T": {
                    "name": {
                        "complex": "eq",
                        "type": "AlimentationName_E",
                        "apiv": { v: 2, queryParam: true },
                        "lib": types
                    }
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {
            ramlConfig: ramlConfig,
            defaultItems: defaultItems,
            types: types,
            name: NAME
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: ['dcschemaloader', 'doccirrus']
    }
);
