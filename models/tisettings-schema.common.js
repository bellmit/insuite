/**
 * User: oliversieweke
 * Date: 27.04.18  17:58
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */

YUI.add( 'tisettings-schema', function( Y, NAME ) {
        /**
         * @module 'tisettings-schema'
         */
        const
            TI_SETTINGS_ID = '000000000000000000000001',
            DEFAULT_CONNECTOR_FQDN = 'http://localhost/connector.sds',
            DEFAULT_CONNECTION_PROTOCOL = 'HTTPS',
            DEFAULT_CLIENT_CERTIFICATE = '',
            DEFAULT_MODE_ONLINE_CHECK = 'ALWAYS';

        var
            types = {},
            template = {
                _id: TI_SETTINGS_ID,
                connectorFQDN: DEFAULT_CONNECTOR_FQDN,
                connectionProtocol: DEFAULT_CONNECTION_PROTOCOL,
                clientCertificateBase64String: DEFAULT_CLIENT_CERTIFICATE,
                modeOnlineCheck: DEFAULT_MODE_ONLINE_CHECK
            };

        types = Y.mix( types, {
                root: {
                    base: {
                        complex: "ext",
                        type: "TiSettings_T",
                        lib: types
                    }
                },
                TiSettings_T: {
                    connectorFQDN: {
                        type: "String",
                        apiv: {v: 2, queryParam: false}
                    },
                    connectionProtocol: {
                        type: "String",
                        apiv: {v: 2, queryParam: false}
                    },
                    clientCertificateName: {
                        type: "String",
                        apiv: {v: 2, queryParam: false}
                    },
                    clientCertificateBase64String: {
                        type: "String",
                        apiv: {v: 2, queryParam: false}
                    },
                    modeOnlineCheck: {
                        type: "String",
                        apiv: {v: 2, queryParam: false}
                    },
                    konnektorProductVersion: {
                        type: "String",
                        apiv: {v: 2, queryParam: false}
                    },
                    ldapFQDN: {
                        type: "String",
                        apiv: {v: 2, queryParam: false}
                    }
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        function getDefaultData() {
            return template;
        }

        /**
         * @class tisettings
         * @namespace doccirrus.schemas
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {
            types: types,
            defaultItems: [template],
            name: NAME,
            getDefaultData: getDefaultData
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'doccirrus',
            'dcschemaloader'
        ]
    }
);