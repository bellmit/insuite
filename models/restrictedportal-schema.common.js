/**
 * User: pi
 * Date: 19/08/16  16:45
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'restrictedportal-schema', function( Y, NAME ) {
        /**
         * The restricted portal entry schema,
         *
         * @module restrictedportal-schema, log schema to keep track quarterly
         * of all the changes and status.
         */

        var
            i18n = Y.doccirrus.i18n,
            types = {};

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "RestrictedPortal_T",
                        "lib": types
                    }
                },
                "RestrictedPortal_T": {
                    "remoteAddress": {
                        "type": "String",
                        i18n: i18n( 'restrictedportal-schema.RestrictedPortal_T.remoteAddress.i18n' ),
                        "-en": i18n( 'restrictedportal-schema.RestrictedPortal_T.remoteAddress.i18n' ),
                        "-de": i18n( 'restrictedportal-schema.RestrictedPortal_T.remoteAddress.i18n' )
                    },
                    "token": {
                        "type": "String",
                        i18n: i18n( 'restrictedportal-schema.RestrictedPortal_T.token.i18n' ),
                        "-en": i18n( 'restrictedportal-schema.RestrictedPortal_T.token.i18n' ),
                        "-de": i18n( 'restrictedportal-schema.RestrictedPortal_T.token.i18n' )
                    },
                    "portalId": {
                        "type": "String",
                        i18n: i18n( 'restrictedportal-schema.RestrictedPortal_T.portalId.i18n' ),
                        "-en": i18n( 'restrictedportal-schema.RestrictedPortal_T.portalId.i18n' ),
                        "-de": i18n( 'restrictedportal-schema.RestrictedPortal_T.portalId.i18n' )
                    },
                    "activeItem": {
                        "type": "String",
                        i18n: i18n( 'restrictedportal-schema.RestrictedPortal_T.activeItem.i18n' ),
                        "-en": i18n( 'restrictedportal-schema.RestrictedPortal_T.activeItem.i18n' ),
                        "-de": i18n( 'restrictedportal-schema.RestrictedPortal_T.activeItem.i18n' )
                    },
                    "activeUrl": {
                        "type": "String",
                        i18n: i18n( 'restrictedportal-schema.RestrictedPortal_T.activeUrl.i18n' ),
                        "-en": i18n( 'restrictedportal-schema.RestrictedPortal_T.activeUrl.i18n' ),
                        "-de": i18n( 'restrictedportal-schema.RestrictedPortal_T.activeUrl.i18n' )
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
