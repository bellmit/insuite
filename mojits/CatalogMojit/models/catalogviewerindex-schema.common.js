/**
 * User: do
 * Date: 11/12/17  18:34
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
'use strict';
YUI.add( 'catalogviewerindex-schema', function( Y, NAME ) {
        /**
         * The DC case data schema definition
         *
         * @module CatalogViewerIndex_T
         */

        var

            // ------- Schema definitions  -------

            types = {},
            i18n = Y.doccirrus.i18n;

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "CatalogViewerIndex_T",
                        "lib": types
                    }
                },
                "CatalogViewerIndex_T": {
                    "catalogShort": {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.Catalog_T.catalog' )
                    },
                    "catalog": {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.Catalog_T.catalog' )
                    },
                    "name": {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.Catalog_T.catalog' )
                    },
                    "isDirectory": {
                        "type": "Boolean",
                        i18n: i18n( 'catalog-schema.Catalog_T.catalog' )
                    },
                    "parent": {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.Catalog_T.catalog' )
                    },
                    "sortIndex": {
                        "type": "Number",
                        i18n: i18n( 'catalog-schema.Catalog_T.catalog' )
                    },
                    "data": {
                        "type": "any",
                        i18n: i18n( 'catalog-schema.Catalog_T.catalog' )
                    },
                    "breadcrump": { // TODO: MOJ-1270 fix typo also in catalog tool index creation (must be released together with new catalog release)
                        "type": ["String"],
                        i18n: i18n( 'catalog-schema.Catalog_T.catalog' )
                    },
                    "path": {
                        "type": ["String"],
                        i18n: i18n( 'catalog-schema.Catalog_T.catalog' )
                    }
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */

        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,

            indexes: [
                {
                    key: {
                        "parent": 1
                    }
                }],

            name: NAME
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {requires: ['dcvalidations', 'dcschemaloader']}
);
