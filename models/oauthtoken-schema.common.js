/**
 * User: abhijit.baldawa
 * Date: 2019-01-25  15:57
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'oauthtoken-schema', function( Y, NAME ) {

        'use strict';

        var
            // ------- Schema definitions  -------
            types = {},
            i18n = Y.doccirrus.i18n; // eslint-disable-line

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        types = Y.mix( types, {
                'root': {
                    base: {
                        complex: 'ext',
                        type: 'OauthToken_T',
                        lib: types
                    }
                },
                'OauthToken_T': {
                    accessToken: {
                        type: 'String',
                        i18n: 'accessToken', //TODO: localise
                        '-en': 'accessToken',
                        '-de': 'accessToken'
                    },

                    accessTokenExpiresAt: {
                        'type': 'Date',
                        '-en': 'accessTokenExpiresAt',
                        '-de': 'accessTokenExpiresAt', //TODO: localize
                        i18n: 'accessTokenExpiresAt'
                    },

                    client: {
                        "type": "any",
                        i18n: 'client',
                        "-en": 'client', //todo: localise
                        "-de": 'client'
                    }
                }
            }
        );

        /**
         * Class REST Schemas
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            /* MANDATORY */
            name: NAME,

            /* MANDATORY */
            types: types

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {requires: ['dcvalidations', 'dcschemaloader']}
);