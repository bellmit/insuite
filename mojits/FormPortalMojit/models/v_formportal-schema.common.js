/*global YUI */
YUI.add( 'v_formportal-schema', function( Y, NAME ) {

        'use strict';

        /**
         *
         * @module 'formportal-schema'
         */

        var types = {},
            i18n = Y.doccirrus.i18n,
            ramlConfig = {
                // REST API v2. parameters
                "2": {
                    description: "Formportal. For v.2. exposing getActivePortalList and sendUrl methods"
                }
            };

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "Formportal_T",
                        "lib": types
                    }
                },
                "Formportal_T": {
                    "name": {
                        "apiv": { v:2, queryParam: true },
                        "type": "String",
                        i18n: i18n( 'restrictedportal-schema.RestrictedPortal_T.portalId.i18n' )
                    },
                    "remoteAddress": {
                        "apiv": { v:2, queryParam: true },
                        "type": "String",
                        i18n: i18n( 'restrictedportal-schema.RestrictedPortal_T.remoteAddress.i18n' )
                    },
                    "token": {
                        "type": "String",
                        i18n: i18n( 'restrictedportal-schema.RestrictedPortal_T.token.i18n' )
                    },
                    "portalId": {
                        "apiv": { v:2, queryParam: true },
                        "type": "String",
                        i18n: i18n( 'restrictedportal-schema.RestrictedPortal_T.portalId.i18n' )
                    },
                    "activeItem": {
                        "apiv": { v:2, queryParam: true },
                        "type": "String",
                        i18n: i18n( 'restrictedportal-schema.RestrictedPortal_T.activeItem.i18n' )
                    },
                    "activeUrl": {
                        "apiv": { v:2, queryParam: true },
                        "type": "String",
                        i18n: i18n( 'restrictedportal-schema.RestrictedPortal_T.activeUrl.i18n' )
                    },
                    "force": {
                        "apiv": { v:2, queryParam: false },
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'restrictedportal-schema.RestrictedPortal_T.force.i18n' )
                    }
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {
            name: NAME,
            types: types,
            ramlConfig: ramlConfig
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'doccirrus',
            'dcvalidations',
            'dcschemaloader'
        ]
    }
);

