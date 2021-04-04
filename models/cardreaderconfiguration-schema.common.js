/**
 * User: do
 * Date: 01/06/15  18:06
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
'use strict';


YUI.add( 'cardreaderconfiguration-schema', function( Y, NAME ) {
        /**
         * The DC Cardreader data schema definition
         *
         * @module DCCardreader
         */

        var
            // ------- Schema definitions  -------
            types = {},
            i18n = Y.doccirrus.i18n;

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "Cardreader_T",
                        "apiv": {v: 2, queryParam: false},
                        "lib": types
                    }
                },
                "Cardreader_T": {
                    "name": {
                        "type": "String",
                        "validate": "Cardreader_T_name",
                        i18n: i18n('cardreaderconfiguration-schema.cardreaderconf.name.i18n')
                    },
                    "driver": {
                        "type": "String",
                        i18n: i18n('cardreaderconfiguration-schema.cardreaderconf.driver.i18n')
                    },
                    "port": {
                        "type": "Number",
                        "validate": "Cardreader_T_port",
                        i18n: i18n('cardreaderconfiguration-schema.cardreaderconf.port.i18n')
                    },
                    "mobile": {
                        "type": "Boolean",
                        i18n: i18n('cardreaderconfiguration-schema.cardreaderconf.mobile.i18n')
                    },
                    "ds": {
                        "type": "String",
                        i18n: i18n('cardreaderconfiguration-schema.cardreaderconf.deviceServer.i18n')
                    },
                    "deviceId": {
                        "type": "String",
                        i18n: i18n('cardreaderconfiguration-schema.cardreaderconf.deviceId.i18n')
                    }
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );



        /**
         * Class Patient Schemas -- gathers all the schemas that the Patient Schema works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,

            name: NAME

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: ['dcschemaloader','doccirrus']
    }
);