/**
 * User: do
 * Date: 23.10.19  14:49
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */

YUI.add( 'fhir_codesystem-schema', function( Y, NAME ) {
        /**
         * @module 'fhir_codesystem
         */
        var
            types = {};

        types = Y.mix( types, {
                root: {
                    base: {
                        complex: "ext",
                        type: "FHIR_CodeSystem_T",
                        lib: types
                    }
                },
                FHIR_CodeSystem_T: {
                    name: {
                        type: "String"
                    },
                    url: {
                        type: "String"
                    },
                    version: {
                        type: "String"
                    },
                    code: {
                        type: "String"
                    },
                    display: {
                        type: "String"
                    },
                    property: {
                        "complex": "eq",
                        "type": "FHIR_CodeSystemProperty_T",
                        "lib": types

                    }
                },
                FHIR_CodeSystemProperty_T: {
                    code: {
                        type: 'String'
                    },
                    valueCode: {
                        type: 'Boolean'
                    }
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * @class fhir_codesystem
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
                    key: {"display": 1}
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