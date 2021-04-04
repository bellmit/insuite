/*global YUI*/
YUI.add( 'stocksuppliers-schema', function( Y, NAME ) {

        /**
         * @module InStock
         * @submodule models
         * @namespace doccirrus.schemas
         * @class StockSuppliers_T
         */

        'use strict';

        var
            types = {},
            i18n = Y.doccirrus.i18n;

        /**
         * Schema definitions
         * @property types
         * @type {YUI}
         */
        types = Y.mix( types, {
                root: {
                    "base": {
                        "complex": "ext",
                        "type": "StockSuppliers_T",
                        "lib": types
                    }
                },
                StockSuppliers_T: {
                    stockSupplier: {
                        "type": "String",
                        i18n: i18n( 'InStockMojit.instock_schema.StockSuppliers_T.supplier' ),
                        "-en": "Suppliers",
                        "-de": "Lieferant"
                    }
                }

            }
        );
        Y.log( 'Loading Schema ' + NAME, 'debug', NAME );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * Class REST Schemas
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            /* MANDATORY */
            name: NAME,

            /* MANDATORY */
            types: types
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {requires: ['dcschemaloader']}
);
