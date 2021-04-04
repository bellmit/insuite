/**
 * User: do
 * Date: 09.12.19  16:55
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
'use strict';

YUI.add( 'changelog-schema', function( Y, NAME ) {
        /**
         * The DC case data schema definition
         *
         * @module changelog
         */

        var

            // ------- Schema definitions  -------

            types = {},
            i18n = Y.doccirrus.i18n;

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "ChangeLog_T",
                        "lib": types
                    }
                },
                "ChangeLog_T": {
                    "title": {
                        "default": "n/a",
                        "type": "String",
                        i18n: i18n( 'changelog-schema.title' ),
                        "-en": "title",
                        "-de": "title"
                    },
                    "comment": {
                        "type": "String",
                        i18n: i18n( 'changelog-schema.comment' ),
                        "-en": "comment",
                        "-de": "comment"
                    },
                    "version": {
                        "type": "String",
                        i18n: i18n( 'changelog-schema.version' ),
                        "-en": "version",
                        "-de": "version"
                    },
                    "catalogShort": {
                        "type": "String",
                        i18n: i18n( 'changelog-schema.catalogShort' ),
                        "-en": "catalogShort",
                        "-de": "catalogShort"
                    },
                    "diff": {
                        "type": "any",
                        i18n: i18n( 'changelog-schema.diff' ),
                        "-en": "diff",
                        "-de": "diff"
                    },
                    "locationId": {
                        "type": "String",
                        i18n: i18n( 'changelog-schema.locationId' ),
                        "-en": "locationId",
                        "-de": "locationId"
                    },
                    "commercialNo": {
                        "type": "String",
                        i18n: i18n( 'changelog-schema.commercialNo' ),
                        "-en": "commercialNo",
                        "-de": "commercialNo"
                    },
                    "locname": {
                        "type": "String",
                        i18n: i18n( 'changelog-schema.locname' ),
                        "-en": "locname",
                        "-de": "locname"
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
                    key: {
                        "version": 1
                    }
                }
            ],

            name: NAME
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {requires: ['dcvalidations', 'dcschemaloader']}
);
