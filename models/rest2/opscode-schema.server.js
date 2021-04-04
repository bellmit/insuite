/**
 * User: oliversieweke
 * Date: 13.06.18  17:58
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */

YUI.add( 'opscode-schema', function( Y, NAME ) {
        /**
         * @module 'opscode-schema'
         */
        var
            types = {};

        types = Y.mix( types, {
                root: {
                    base: {
                        complex: "ext",
                        type: "OpsCode_T",
                        lib: types
                    }
                },
                OpsCode_T: {
                    code: {
                        type: "String",
                        apiv: {v: 2, queryParam: false}
                    },
                    name: {
                        type: "String",
                        apiv: {v: 2, queryParam: false}
                    },
                    seqs: {
                        type: ["String"],
                        apiv: {v: 2, queryParam: false}
                    }
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * @class opscode
         * @namespace doccirrus.schemas
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {
            types: types,
            name: NAME,

            indexes: [
                {
                    key: {"code": 1}
                },
                {
                    key: {"name": 1}
                }
            ]
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'doccirrus',
            'dcschemaloader'
        ]
    }
);