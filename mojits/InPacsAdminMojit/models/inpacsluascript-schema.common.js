/*global YUI*/
'use strict';
YUI.add( 'inpacsluascript-schema', function( Y, NAME ) {

        var
            types = {},
            i18n = Y.doccirrus.i18n;

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "InPacsLuaScript_T",
                        "lib": types
                    }
                },
                "InPacsLuaScript_T": {
                    description: {
                        "type": "String",
                        "i18n": i18n( 'InPacsAdminMojit.InPacsLuaScript_T.description' ),
                        "-en": "description",
                        "-de": "description"
                    },
                    content: {
                        "type": "String",
                        "required": true,
                        "i18n": i18n( 'InPacsAdminMojit.InPacsLuaScript_T.content' ),
                        "-en": "content",
                        "-de": "content"
                    },
                    predefined: {
                        "required": true,
                        "type": "Boolean",
                        "i18n": i18n( 'InPacsAdminMojit.InPacsLuaScript_T.predefined' ),
                        "-en": "predefined",
                        "-de": "predefined"
                    }
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * Class REST Schemas
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,
            name: NAME
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', { requires: ['dcschemaloader', 'dcvalidations', 'dcschemaloader'] }
);
