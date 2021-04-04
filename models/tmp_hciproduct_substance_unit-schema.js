/**
 * User: dcdev
 * Date: 3/21/19  8:26 AM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


/*global YUI*/
YUI.add( 'tmp_hciproduct_substance_unit-schema', function( Y, NAME ) {

        /**
         * @module tmp_hciproductSubstanceQuantity-schema'
         */
        'use strict';

        var
            types = {};

        /**
         * Schema definitions
         * @property types
         * @type {YUI}
         */
        types = Y.mix( types, {
                root: {
                    "base": {
                        "complex": "ext",
                        "type": "tmp_hciproductSubstanceUnit_T",
                        "lib": types
                    }
                },
                tmp_hciproductSubstanceUnit_T: {
                    prdNo: {
                        "default": "",
                        "type": "String"
                    },
                    quantityUnit: {
                        "default": "",
                        "type": "String"
                    },
                    NSFLAG: {
                        "default": true,
                        "type": "Boolean"
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
            indexes: [
                {
                    key: {
                        "prdNo": 1
                    }
                }
            ]
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'doccirrus',
            'dcvalidations'
        ]
    }
);
