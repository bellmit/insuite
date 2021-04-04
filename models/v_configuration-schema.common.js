/*global YUI */
YUI.add( 'v_configuration-schema', function( Y, NAME ) {

        'use strict';

        /**
         *
         * @module 'configuration-schema'
         */

        var types = {},
            i18n = Y.doccirrus.i18n,
            ramlConfig = {
                // REST API v2. parameters
                "2": {
                    description: "Datasafe configuration. For v.2. we only allow get"
                }
            };

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "Configuration_T",
                        "lib": types
                    }
                },
                "Configuration_T": {
                    "inSuite": {
                        "type": "object",
                        "apiv": { v:2, queryParam: false },
                        "network": {
                            "type": "object",
                            "apiv": { v:2, queryParam: false },
                            "externalURL": {
                                "apiv": { v:2, queryParam: false },
                                "type": "String",
                                i18n: i18n( 'configuration-schema.Configuration_T.externalURL.i18n' )
                            },
                            "sn": {
                                "apiv": { v:2, queryParam: false },
                                "type": "String",
                                i18n: i18n( 'configuration-schema.Configuration_T.sn.i18n' )
                            }
                        },
                        language: {
                            apiv: { v:2, queryParam: false },
                            type: "String"
                        },
                        licenseScope: {
                            apiv: { v:2, queryParam: false },
                            type: Y.doccirrus.schemas.company.getLicenseT()
                        }
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
            'dcschemaloader',
            'company-schema'
        ]
    }
);

