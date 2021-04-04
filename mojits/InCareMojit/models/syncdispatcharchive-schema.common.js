/*global YUI */
YUI.add( 'syncdispatcharchive-schema', function( Y, NAME ) {

        'use strict';

        /**
         * The syncdispatch entry schema,
         *
         * @module 'syncdispatch-schema'
         */

        var
            //i18n = Y.doccirrus.i18n,
            types = {};

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "syncdispatch_T",
                        "lib": "syncdispatch"
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
            /* OPTIONAL default items to be written to the DB on startup */
            name: NAME
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'doccirrus',
            'dcvalidations',
            'dcauth',
            'syncdispatch-schema'
        ]
    }
);
