/**
 * User: dcdev
 * Date: 7/23/19  3:34 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'tmp_hcicatalog-schema', function( Y, NAME ) {

        /**
         * @class tmp_hcicatalog_T
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
                        "type": "tmp_hcicatalog_T",
                        "lib": types
                    }
                },
                tmp_hcicatalog_T: {
                    code: {
                        "default": "",
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
                    phGTIN: {
                        "default": null,
                        "type": "String"
                    },
                    phUnit: {
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
                    phAtc: {
                        "defauolt": "",
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
                    u_extra: {
                        "default": "",
                        "type": "any"
                    },
                    insuranceDescription: {
                        "default": "",
                        "type": "String"
                    },
                    catalogShort: {
                        "default": "",
                        "type": "String"
                    },
                    phIngr: {
                        "complex": "inc",
                        "type": "PhIngr_T",
                        "lib": types,
                        "default": []
                    },
                    phForm: {
                        "default": "",
                        "type": "String"
                    },
                    del: {
                        "default": false,
                        type: "Boolean"
                    },
                    phUnitDescription: {
                        "default": "",
                        "type": "String"
                    },
                    units: {
                        "default": [],
                        "type": "any"
                    }
                },
                "PhIngr_T": {
                    "code": {
                        "type": "String"
                    },
                    "name": {
                        "type": "String",
                        "default": ""
                    },
                    "strength": {
                        "type": "String"
                    },
                    "type": {
                        "type": "String"
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
                        "phCompany": 1
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