/**
 * User: do
 * Date: 08.01.21  12:43
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */

YUI.add( 'okfe_export-schema', function( Y, NAME ) {
        /**
         * The OkfeExport entry schema,
         *
         * @module kbvlog-schema, log schema to keep track quarterly
         * of all the changes and status.
         */

        var
            ramlConfig = {
                // REST API v2. parameters
                "2": {
                    description: "The okfe_export collection stores the results of an ASV CON file splitting."
                }
            },
            i18n = Y.doccirrus.i18n,
            types = {};

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "OkfeExport_T",
                        "lib": types
                    }
                },
                "OkfeExport_T": {
                    "exportDate": {
                        "type": "Date",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'OkfeExport-schema.OkfeExport_T.exportDate.i18n' )
                    },
                    "content": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'OkfeExport-schema.OkfeExport_T.content.i18n' )
                    },
                    "nDocs": {
                        "type": "Number",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'OkfeExport-schema.OkfeExport_T.nDocs.i18n' )
                    },
                    "fileNames": {
                        "type": "any",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'OkfeExport-schema.OkfeExport_T.fileNames.i18n' )
                    },
                    "htmlFiles": {
                        "type": "any",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'OkfeExport-schema.OkfeExport_T.htmlFiles.i18n' )
                    },
                    "exportZipId": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'OkfeExport-schema.OkfeExport_T.exportZipId.i18n' )
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
            ramlConfig: ramlConfig,
            name: NAME
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'doccirrus'
        ]
    }
);
