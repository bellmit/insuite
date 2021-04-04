/**
 * User: ma
 * Date: 26/06/2014  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'KoSubViewModelTest-schema', function( Y, NAME ) {

        var
            types = {};

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "Sub_T",
                        "lib": types
                    }
                },
                "Sub_T": {
                    "field": {
                        "default": "",
                        "type": "String",
                        "required": true,
                        i18n: 'field i18n'
                    },
                    "subsub": {
                        "complex": "inc",
                        "type": "Subsub_T",
                        "lib": types,
                        i18n: 'Subsub_T i18n'
                    },
                    "subsubBatman": {
                        "complex": "ext",
                        "type": "Batman_T",
                        "lib": "KoSubSubBatmanViewModelTest",
                        i18n: 'Subsub_T i18n'
                    }
                },
                "Subsub_T": {
                    "entry": {
                        "default": "",
                        "type": "String",
                        "required": true,
                        i18n: 'entry i18n'
                    },
                    "subsubsub": {
                        "complex": "inc",
                        "type": "Subsubsub_T",
                        "lib": types,
                        i18n: 'Subsubsub_T i18n'
                    }
                },
                "Subsubsub_T": {
                    "value": {
                        "default": "",
                        "type": "String",
                        "required": true,
                        i18n: 'value i18n'
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
            'dcschemaloader',
            'KoSubSubBatmanViewModelTest-schema'
        ]
    }
);
