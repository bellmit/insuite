/**
 * User: bhagyashributada
 * Date: 6/7/18  10:21 AM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
'use strict';

YUI.add( 'v_blob-schema', function( Y, NAME ) {

        let
            types = {};

        types = Y.mix( types, {
            "root": {
                "base": {
                    "complex": "ext",
                    "type": "Blob_T",
                    "lib": types
                }
            },
            "Blob_T": {
                "media": {
                    "complex": "ext",
                    "type": "Media_T",
                    "apiv": {v: 2, queryParam: false},
                    "lib": "media"
                },
                "document": {
                    "complex": "ext",
                    "type": "Document_T",
                    "apiv": {v: 2, queryParam: false},
                    "lib": "document"
                },
                "dataURI": {
                    "type": "string",
                    "apiv": {v: 2, queryParam: true}
                },
                "mimeType": {
                    "type": "string",
                    "apiv": {v: 2, queryParam: true}
                },
                "studyId": {
                    "type": "string",
                    "apiv": {v: 2, queryParam: false}
                },
                "userContent": {
                    "type": "string",
                    "apiv": {v: 2, queryParam: false}
                }
            }
        } );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * Class REST Schemas
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {
            name: NAME,
            types: types
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'doccirrus',
            'dcvalidations',
            'dcschemaloader',
            'document-schema',
            'media-schema'
        ]
    }
);
