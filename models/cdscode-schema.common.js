/**
 * User: dcdev
 * Date: 4/15/20  12:56 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI*/
YUI.add( 'cdscode-schema', function( Y, NAME ) {

        /**
         * @module InStock
         * @submodule models
         * @namespace doccirrus.schemas
         * @class medicationsCatalog_T
         */

        'use strict';

        var
            types = {};
           // i18n = Y.doccirrus.i18n;

        /**
         * Schema definitions
         * @property types
         * @type {YUI}
         */
        types = Y.mix( types, {
                root: {
                    "base": {
                        "complex": "ext",
                        "type": "cdsCodes_T",
                        "lib": types
                    }
                },
                cdsCodes_T: {
                    cchKey: {
                        type: "Number"
                    },
                    cchType: {
                        type: "String"
                    },
                    isCode: {
                        type: "Boolean"
                    },
                    title: {
                        type: "String"
                    },
                    gender: {
                        type: "String"
                    },
                    genderCode: {
                        type: "String"
                    },
                    remark: {
                        type: "String"
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
                        "title": 1
                    },
                    indexType: {sparse: true}
                },
                {
                    key: {
                        "cchKey": 1
                    },
                    indexType: {sparse: true}
                },
                {
                    key: {
                        "cchType": 1
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
            'doccirrus'
        ]
    }
);
/**
 * User: dcdev
 * Date: 3/21/19  8:26 AM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
