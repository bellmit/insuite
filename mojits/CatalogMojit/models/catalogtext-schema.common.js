/**
 * User: pi
 * Date: 22/03/2017  13:125
 * (c) 2017, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'catalogtext-schema', function( Y, NAME ) {
        /**
         *
         * @module catalogtext
         */

        var

            // ------- Schema definitions  -------

            types = {},
            i18n = Y.doccirrus.i18n;

        types = Y.mix( types, {
                root: {
                    base: {
                        complex: "ext",
                        type: "CatalogText_T",
                        lib: types
                    }
                },
                CatalogText_T: {
                    locationId: {
                        type: "String",
                        i18n: i18n( 'catalogtext-schema.CatalogText_T.locationId.i18n' )
                    },
                    catalogShort: {
                        type: "String",
                        i18n: i18n( 'catalogtext-schema.CatalogText_T.catalogShort.i18n' )
                    },
                    code: {
                        type: "String",
                        i18n: i18n( 'catalogtext-schema.CatalogText_T.code.i18n' )
                    },
                    items: {
                        complex: "inc",
                        type: "Item_base_T",
                        lib: types,
                        i18n: i18n( 'catalogtext-schema.CatalogText_T.items.i18n' )
                    }
                },
                Item_base_T: {
                    text: {
                        type: "String",
                        i18n: i18n( 'catalogtext-schema.Item_base_T.text.i18n' )
                    }
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        Y.namespace( 'doccirrus.schemas' )[ NAME ] = {
            types: types,
            name: NAME
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[ NAME ], true );
    },
    '0.0.1', { requires: [ 'dcvalidations', 'dcschemaloader' ] }
);
