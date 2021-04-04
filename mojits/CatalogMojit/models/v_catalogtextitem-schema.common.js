/**
 * User: pi
 * Date: 22/03/2017  13:125
 * (c) 2017, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'v_catalogTextItem-schema', function( Y, NAME ) {
        /**
         *
         * @module catalogTextItem
         */

        var

            // ------- Schema definitions  -------
            types = {};

        types = Y.mix( types, {
                root: {
                    base: {
                        complex: "ext",
                        type: "CatalogTextItem_T",
                        lib: types
                    }
                },
                CatalogTextItem_T: {
                    "Base": {
                        "complex": "ext",
                        "type": "Item_base_T",
                        "lib": "catalogtext"
                    },
                    active: {
                        "default": false,
                        type: 'Boolean'
                    },
                    title: {
                        type: 'String'
                    },
                    usedInUserContent: {
                        "default": false,
                        type: 'Boolean'
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
    '0.0.1', { requires: [ 'dcvalidations', 'dcschemaloader', 'catalogtext-schema' ] }
);
