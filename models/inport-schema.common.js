/**
 * User: jm
 * Date: 16/12/14  12:03
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'inport-schema', function( Y, NAME ) {

        'use strict';

        var
        // ------- Schema definitions  -------
            i18n = Y.doccirrus.i18n,
            types = {};

        types = Y.mix( types, {
                "root": {
                    base: {
                        "complex": "ext",
                        "type": "serialport_T",
                        "lib": types
                    }
                },
                "serialport_T": {
                    "path": {
                        "type": "String",
                        validate: "serialport_T_path",
                        i18n: i18n( 'inport-schema.serialport_T.path.i18n' ),
                        "-en": "Pfad",
                        "-de": "Pfad"
                    },
                    "configured": {
                        "default": false,
                        "type": "Boolean",
                        i18n: i18n( 'inport-schema.serialport_T.configured.i18n' ),
                        "-en": "configured",
                        "-de": "konfiguriert"
                    },
                    "baudrate": {
                        "type": "Number",
                        i18n: i18n( 'inport-schema.serialport_T.baudrate.i18n' ),
                        "-en": "Baud Rate",
                        "-de": "Baud Rate"
                    },
                    "parity": {
                        "type": "String",
                        i18n: i18n( 'inport-schema.serialport_T.parity.i18n' ),
                        "-en": "Parity",
                        "-de": "Parität"
                    },
                    "databits": {
                        "type": "Number",
                        i18n: i18n( 'inport-schema.serialport_T.databits.i18n' ),
                        "-en": "Data Bits",
                        "-de": "Data Bits"
                    },
                    "stopbits": {
                        "type": "Number",
                        i18n: i18n( 'inport-schema.serialport_T.stopbits.i18n' ),
                        "-en": "Stop Bits",
                        "-de": "Stop Bits"
                    },
                    "fc_xon": {
                        "default": false,
                        "type": "Boolean",
                        i18n: i18n( 'inport-schema.serialport_T.fc_xon.i18n' ),
                        "-en": "XON",
                        "-de": "XON"
                    },
                    "fc_xoff": {
                        "default": false,
                        "type": "Boolean",
                        i18n: i18n( 'inport-schema.serialport_T.fc_xoff.i18n' ),
                        "-en": "XOFF",
                        "-de": "XOFF"
                    },
                    "fc_xany": {
                        "default": false,
                        "type": "Boolean",
                        i18n: i18n( 'inport-schema.serialport_T.fc_xany.i18n' ),
                        "-en": "XANY",
                        "-de": "XANY"
                    },
                    "fc_rtscts": {
                        "default": false,
                        "type": "Boolean",
                        i18n: i18n( 'inport-schema.serialport_T.fc_rtscts.i18n' ),
                        "-en": "RTS/CTS",
                        "-de": "RTS/CTS"
                    }

                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        Y.namespace( 'doccirrus.schemas' )[NAME] = {
            types: types,
            defaultItems: [],
            name: NAME
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
