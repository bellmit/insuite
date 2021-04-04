/*globals YUI */

'use strict';
YUI.add( 'stocklocation-schema', function( Y, NAME ) {
    var types = {},
        i18n = Y.doccirrus.i18n;

    NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );
    types = Y.mix( types, {
            root: {
                "base": {
                    "complex": "ext",
                    "type": "StockLocation_T",
                    "lib": types
                }
            },
            StockLocation_T: {
                "title": {
                    "type": "String",
                    required: true,
                    i18n: i18n( 'location-schema.Location_T.StockLocation_T.title' ),
                    "-en": "Title",
                    "-de": "Titel"
                },
                "description": {
                    "type": "String",
                    required: true,
                    i18n: i18n( 'location-schema.Location_T.StockLocation_T.description' ),
                    "-en": "Description",
                    "-de": "Beschreibung"
                }
            }
        }
    );
    Y.log( 'Loading Schema ' + NAME, 'debug', NAME );

        Y.namespace( 'doccirrus.schemas' )[NAME] = {
            name: NAME,
            types: types,
            cacheQuery: true
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
}, '0.0.1', {requires: ['dcschemaloader']});