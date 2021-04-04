/*global YUI */
YUI.add( 'processingqueue-schema', function( Y, NAME ) {

        'use strict';

        /**
         * The processingqueue entry schema,
         *
         * @module 'processingqueue-schema'
         */

        var
            //i18n = Y.doccirrus.i18n,
            types = {};

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "processingqueue_T",
                        "lib": types
                    }
                },
                "processingqueue_T": {
                    "operation": {
                       "type": "String"
                    },
                    "operationKey": {
                        "type": "String"
                    },
                    "tenant": {
                        "type": "String"
                    },
                    "data": {
                        "type": "Object"
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
                        "operation": 1,
                        "operationKey": 1
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
