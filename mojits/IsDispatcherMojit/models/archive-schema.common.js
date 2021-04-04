/*global YUI */
YUI.add( 'archive-schema', function( Y, NAME ) {

        'use strict';

        var
            types = {};

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "Archive_T",
                        "lib": types
                    }
                },
                "Archive_T": {
                    "identityId": {
                        "required": true,
                        "type": "String",
                        "-en": "identityId",
                        "-de": "identityId"
                    },
                    "timestamp": {
                        "required": true,
                        "type": "Date",
                        "-en": "timestamp",
                        "-de": "timestamp"
                    },
                    "reason": {
                        "required": true,
                        "type": "String",
                        "-en": "identityId",
                        "-de": "identityId"
                    },
                    "payload": {
                        "type": "any",
                        "-en": "payload",
                        "-de": "payload"
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
            indexes: [],
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
