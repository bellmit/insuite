/**
 * User: md
 * Date: 18/12/2017  12:50
 * (c) 2017, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'profile-schema', function( Y, NAME ) {
        /**
         * @module profile-schema
         */

        var
            i18n = Y.doccirrus.i18n,
            types = {};

        types = Y.mix( types, {
                root: {
                    base: {
                        complex: 'ext',
                        type: 'Profile_T',
                        lib: types
                    }
                },
                Profile_T: {
                    userId: {
                        "type": "String",
                        i18n: i18n( 'profile-schema.KoTableConfiguration_T.userId.i18n' )

                    },
                    workStation: {
                        type: "ObjectId",
                        apiv: {v: 2, queryParam: false},
                        i18n: i18n( 'profile-schema.Profile_T.workStation.i18n' )
                    },
                    tiCardReaders: {
                        type: ["ObjectId"],
                        apiv: {v: 2, queryParam: false},
                        i18n: i18n( 'profile-schema.Profile_T.tiCardReaders.i18n' )
                    },
                    profileLabel: {
                        "type": "String"
                    },
                    timestamp: {
                        type: 'Date'
                    },
                    commonProfile: {
                        "type": "Boolean"
                    },
                    config: {
                        "type": "any",
                        i18n: i18n( 'profile-schema.KoTableConfiguration_T.config.i18n' )
                    }
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * @class profile
         * @namespace doccirrus.schemas
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {
            types: types,
            name: NAME,
            cacheQuery: true
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1',
    {
        requires: [
            'dcschemaloader',
            'doccirrus'
        ]
    }
);
