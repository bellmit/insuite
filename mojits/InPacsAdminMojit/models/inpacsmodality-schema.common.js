/*global YUI*/
'use strict';
YUI.add( 'inpacsmodality-schema', function( Y, NAME ) {
        /**
         * The inpacsmodality entry schema,
         *
         * @module inpacsmodality-schema.
         */


        var
            INPACS_DEFAULT_AET_NAME = 'INPACS',

            // ------- Schema definitions  -------
            types = {},
            i18n = Y.doccirrus.i18n,
            template = {
                "_id": "000000000000000000000001",
                "title": 'InPacsAdminMojit.inpacsmodality_T.label.main_title',
                "name": INPACS_DEFAULT_AET_NAME,
                "ip": "127.0.0.1",
                "port": "104"
            };

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "inpacsmodality_T",
                        "lib": types
                    }
                },
                "inpacsmodality_T": {
                    "name": {
                        "type": "String",
                        "required": true,
                        "unique": true,
                        "key": true,
                        "validate": "inpacsmodality_T_name",
                        "i18n": i18n( 'InPacsAdminMojit.inpacsmodality_T.name' ),
                        "-en": "Name",
                        "-de": "Name"
                    },
                    "title": {
                        "type": "String",
                        "required": true,
                        "default": i18n( 'InPacsAdminMojit.inpacsmodality_T.label.title' ),
                        "i18n": i18n( 'InPacsAdminMojit.inpacsmodality_T.config_label.title' ),
                        "-en": "Title",
                        "-de": "Title"
                    },
                    "ip": {
                        "type": "String",
                        "required": true,
                        "i18n": i18n( 'InPacsAdminMojit.inpacsmodality_T.ip' ),
                        "-de": "IP",
                        "-en": "IP"
                    },
                    "port": {
                        "type": "Number",
                        "validate": "num",
                        "required": true,
                        "i18n": i18n( 'InPacsAdminMojit.inpacsmodality_T.port' ),
                        "-en": "Port",
                        "-de": "Port"
                    }
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        function getDefaultData() {
            return template;
        }

        /**
         * Class REST Schemas
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,
            defaultItems: [template],
            name: NAME,
            defaultAetName: INPACS_DEFAULT_AET_NAME,
            getDefaultData: getDefaultData

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', { requires: ['dcschemaloader', 'dcvalidations', 'dcschemaloader'] }
);
