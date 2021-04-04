/*global YUI */
YUI.add( 'syncauxreporting-schema', function( Y, NAME ) {

        'use strict';

        /**
         * The syncauxreporting entry schema,
         *
         * @module 'syncauxreporting-schema'
         */

        var
            //i18n = Y.doccirrus.i18n,
            types = {};

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "syncauxreporting_T",
                        "lib": types
                    }
                },
                "syncauxreporting_T": {
                    "entryId": {
                       "type": "String"
                    },
                    "entityName": {
                        "type": "String"
                    },
                    "timestamp": {
                        "type": "Date"
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
                    "key": {
                        "entityName": 1,
                        "entryId": 1
                    }
                }],
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
            'dcauth'
        ]
    }
);
