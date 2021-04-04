/*global YUI */
YUI.add( 'syncfolder-schema', function( Y, NAME ) {

        'use strict';

        /**
         * The syncFolder_T entry schema,
         *
         * @module 'syncfolder-schema'
         */

        var types = {};

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "syncFolder_T",
                        "lib": types
                    }
                },
                "syncFolder_T": {
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,
            name: NAME
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: ['dcschemaloader']
    }
);

