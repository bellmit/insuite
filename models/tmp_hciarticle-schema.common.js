/**
 * User: dcdev
 * Date: 3/21/19  8:26 AM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


/*global YUI*/
YUI.add( 'tmp_hciarticle-schema', function( Y, NAME ) {

        /**
         * @module tmp_hciarticle-schema
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
                        "type": "tmp_hciarticle_T",
                        "lib": types
                    }
                },
                tmp_hciarticle_T: {
                    code: {
                        "default": "",
                        "type": "String"
                    },
                    phGTIN: {
                        "default": null,
                        "type": "String"
                    },
                    phPZN: {
                        "default": "",
                        "type": "String"
                    },
                    prdNo: {
                        "default": "",
                        "type": "String"
                    },
                    phUnit: {
                      "default": "",
                      "type": "String"
                    },
                    phUnitDescription: {
                        "default": "",
                        "type": "String"
                    },
                    phCompany: {
                        "default": "",
                        "type": "String"
                    },
                    phPackSize: {
                        "default": "",
                        "type": "String"
                    },
                    phDescription: {
                        "default": "",
                        "type": "String"
                    },
                    phPriceSale: {
                        "default": 0,
                        "type": "Number"
                    },
                    phPriceCost: {
                        "default": "",
                        "type": "String"
                    },
                    u_extra: {
                        "default": "",
                        "type": "any"
                    },
                    insuranceCode: {
                        "default": "",
                        "type": "String"
                    },
                    paidByInsurance: {
                        "default": false,
                        "type": "Boolean"
                    },
                    supplyCategory: {
                        "default": "",
                        "type": "String"
                    },
                    del: {
                        "default": false,
                        type: "Boolean"
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
                        "phPZN": 1
                    },
                    indexType: {sparse: true, unique: true}
                },
                {
                    key: {
                        "code": 1
                    },
                    indexType: {sparse: true}
                },
                {
                    key: {
                        "phForm": 1
                    },
                    indexType: {sparse: true}
                },
                {
                    key: {
                        "phPackSize": 1
                    },
                    indexType: {sparse: true}
                },
                {
                    key: {
                        "phDescription": 1
                    },
                    indexType: {sparse: true}
                },
                {
                    key: {
                        "prdNo": 1
                    },
                    indexType: {sparse: true}
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
