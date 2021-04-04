/*global YUI*/
'use strict';
YUI.add( 'v_inpacs-schema', function( Y, NAME ) {

        var
            types = {},
            i18n = Y.doccirrus.i18n;

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "VInpacs_T",
                        "lib": types
                    }
                },
                "VInpacs_T": {
                    id: {
                        "type": "String",
                        "i18n": i18n( 'InPacsAdminMojit.VInpacs_T.id' ),
                        "-en": "id",
                        "-de": "id",
                        "apiv": { v: 2, queryParam: true }
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
