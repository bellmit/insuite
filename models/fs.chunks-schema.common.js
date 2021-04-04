/*global YUI */
YUI.add( 'fs-chunks-schema', function( Y, NAME ) {

        'use strict';

        /**
         * The FsChunks_T entry schema,
         *
         * @module 'fs-chunks-schema'
         */

        var
            i18n = Y.doccirrus.i18n,
            types = {};

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "FsChunks_T",
                        "lib": types
                    }
                },
                "FsChunks_T": {
                    "files_id": {
                        "required": true,
                        "type": "Object",
                        "refType": "ObjectId",
                        i18n: i18n( 'fs-chunks-schema.FsChunks_T.files_id' )
                    },
                    "n": {
                        "type": "Number",
                        i18n: i18n( 'fs-chunks-schema.FsChunks_T.n' )
                    },
                    "data": {
                        "type": "Object",
                        i18n: i18n( 'fs-chunks-schema.FSChunks_T.data' )
                    }
                }
            }
        );

        NAME = 'fs.chunks'; //Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,
            /* OPTIONAL default items to be written to the DB on startup */
            name: NAME,
            creationAllowed: true,
            movementAllowed: true
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
