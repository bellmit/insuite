/*global YUI*/
YUI.add( 'v_splitDeliveryItem-schema', function( Y, NAME ) {

        /**
         * @module InStock
         * @submodule models
         * @namespace doccirrus.schemas
         * @class SplitDelivery_T
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
                        "type": "SplitDelivery_T",
                        "lib": types
                    }
                },
                SplitDelivery_T: {
                    quantityDelivered: {
                        type: "Number",
                        required: true,
                        i18n: i18n( 'InStockMojit.instock_schema.Stocks_T.quantityDelivered' )
                    },
                    stockLocation: {
                        type: "any",
                        required: true,
                        i18n: i18n( 'InStockMojit.instock_schema.InStock_T.stockLocationId' )
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
            types: types,
            indexes: []
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {requires: [
        'dcschemaloader',
        'doccirrus',
        'dcvalidations'
    ]}
);
