/*global YUI */
YUI.add( 'fs-files-schema', function( Y, NAME ) {

        'use strict';

        /**
         * The FsFiles_T entry schema,
         *
         * @module 'fs-files-schema'
         */

        var
            i18n = Y.doccirrus.i18n,
            types = {};

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "FsFiles_T",
                        "lib": types
                    }
                },
                "FsFiles_T": {
                    "length": {
                        "required": true,
                        "type": "Number",
                        i18n: i18n( 'fs-files-schema.FsFiles_T.length' )
                    },
                    "chunkSize": {
                        "required": true,
                        "type": "Number",
                        i18n: i18n( 'fs-files-schema.FsFiles_T.chunkSize' )
                    },
                    "uploadDate": {
                        "required": true,
                        "type": "Date",
                        i18n: i18n( 'fs-files-schema.FsFiles_T.uploadDate' )
                    },
                    "md5": {
                        "required": true,
                        "type": "String",
                        i18n: i18n( 'fs-chunks-schema.FsFiles_T.md5' )
                    },
                    "filename": {
                        "required": true,
                        "type": "String",
                        i18n: i18n( 'fs-chunks-schema.FsFiles_T.filename' )
                    },
                    "contentType": {
                        "required": true,
                        "type": "String",
                        i18n: i18n( 'fs-chunks-schema.FsFiles_T.contentType' )
                    },
                    "aliases": {
                        "type": [String],
                        i18n: i18n( 'fs-chunks-schema.FsFiles_T.aliases' )
                    },
                    "metadata": {
                        "type": "Object",
                        i18n: i18n( 'fs-chunks-schema.FsFiles_T.metadata' )
                    }
                }
            }
        );

        /*
            from: https://docs.mongodb.com/v3.0/reference/gridfs/

            "_id" : <ObjectId>,
            "length" : <num>,
            "chunkSize" : <num>,
            "uploadDate" : <timestamp>,
            "md5" : <hash>,

            "filename" : <string>,
            "contentType" : <string>,
            "aliases" : <string array>,
            "metadata" : <dataObject>,
        */

        NAME = 'fs.files'; //Y.doccirrus.schemaloader.deriveSchemaName( NAME );

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
