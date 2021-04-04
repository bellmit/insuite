/**
 * User: do
 * Date: 02/05/14  13:28
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'cardioconfiguration-schema', function( Y, NAME ) {
        /**
         * The InvoiceConfiguration_T entry schema,
         *
         * @module invoiceconfiguration-schema, invoice configuration schema.
         */

        var
            types = {},
            i18n = Y.doccirrus.i18n,
            CONFIG_ID = '000000000000000000000001',
            template = {
                _id: CONFIG_ID,
                cert: "",
                certPass: "",
                serviceType: Y.doccirrus.schemas.settings.specialModuleKinds.CARDIO,
                userId: "",
                userSecret: ""
            };

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "CardioConfiguration_T",
                        "lib": types
                    }
                },
                "CardioConfiguration_T": {
                    "name": {
                        "required": true,
                        "type": "String",
                        i18n: i18n( 'cardioconfiguration-schema.CardioConfiguration_T.name' ),
                        "-en": "Export-Client name",
                        "-de": "Export-Client Name"
                    },
                    "host": {
                        "required": true,
                        "type": "String",
                        i18n: i18n( 'cardioconfiguration-schema.CardioConfiguration_T.host' ),
                        "-en": "Export-Client host",
                        "-de": "Export-Client Host"
                    },
                    "port": {
                        "required": true,
                        "type": "Number",
                        i18n: i18n( 'cardioconfiguration-schema.CardioConfiguration_T.port' ),
                        "-en": "Export-Client port",
                        "-de": "Export-Client Port"
                    },
                    "serviceType": {
                        "type": "String",
                        i18n: i18n( 'cardioconfiguration-schema.CardioConfiguration_T.serviceType' ),
                        "-en": "serviceType",
                        "-de": "serviceType"
                    },
                    "cert": {
                        "required": true,
                        "type": "String",
                        i18n: i18n( 'cardioconfiguration-schema.CardioConfiguration_T.cert' ),
                        "-en": "Export-Client certificate",
                        "-de": "Export-Client Zertifikat"
                    },
                    "certPass": {
                        "required": true,
                        "type": "String",
                        i18n: i18n( 'cardioconfiguration-schema.CardioConfiguration_T.certPass' ),
                        "-en": "Export-Client certificate password",
                        "-de": "Export-Client Zertifikatspasswort"
                    },
                    "userId": {
                        "required": true,
                        "type": "String",
                        i18n: i18n( 'cardioconfiguration-schema.CardioConfiguration_T.userId' ),
                        "-en": "user login",
                        "-de": "Benutzer Id"
                    },
                    "userSecret": {
                        "required": true,
                        "type": "String",
                        i18n: i18n( 'cardioconfiguration-schema.CardioConfiguration_T.userSecret' ),
                        "-en": "user password",
                        "-de": "Benutzer Passwort"
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
            /* OPTIONAL default items to be written to the DB on startup */
            name: NAME,
            getConfigId: function() {
                return CONFIG_ID;
            },
            getDefaultData: function() {
                return template;
            },
            cacheQuery: true
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'doccirrus',
            'dcvalidations',
            'location-schema'
        ]
    }
);
