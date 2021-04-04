/**
 * User: ma
 * Date: 26/06/2014  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'KoSubSubBatmanViewModelTest-schema', function( Y, NAME ) {

        var
            types = {};

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "Batman_T",
                        "lib": types
                    }
                },
                "Batman_T": {
                    "name": {
                        "default": "",
                        "type": "String",
                        i18n: 'field i18n'
                    },
                    "age": {
                        "default": "",
                        "type": "Number",
                        i18n: 'field i18n'
                    },
                    "superpower": {
                        "default": false,
                        "type": "Boolean",
                        i18n: 'field i18n'
                    },
                    __polytype: {
                        type: 'String'
                    }

                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,

            name: NAME,

            getReadOnlyFields: function() {
                var
                    paths = [];
                return paths;
            }

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader'
        ]
    }
);
