/*global YUI */
'use strict';

// NBB:  the file name and the schema name are linked by Mojito and must match!

YUI.add( 'catalogreference-schema', function( Y, NAME ) {
        /**
         * The DC case data schema definition
         *
         * @module catalogreference-schema
         */

        var

        // ------- Schema definitions  -------

            types = {},
            i18n = Y.doccirrus.i18n,
            codes = require( '../assets/json/codes-reference.json' );

        types = Y.mix( types, {
                'root': {
                    'base': {
                        'complex': 'ext',
                        'type': 'CatalogReference_T',
                        'lib': types
                    }
                },

                'CatalogReference_T': {
                    'code': {
                        "type": "String",
                        i18n: i18n( 'actionbutton-schema.CatalogReference_T.code.i18n' ),
                        "-en": "code",
                        "-de": "code"
                    },
                    'codes': {
                        "type": ["String"],
                        i18n: i18n( 'actionbutton-schema.CatalogReference_T.codes.i18n' ),
                        "-en": "codes",
                        "-de": "codes"
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

            name: NAME,
            defaultItems: codes
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1',
    {
        requires: [
            'dcschemaloader',
            'doccirrus'
        ]
    }
);
