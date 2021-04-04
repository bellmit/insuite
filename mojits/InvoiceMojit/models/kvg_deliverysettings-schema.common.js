/**
 * User: Nazar Krania
 * Date: 4/12/19  10:26 AM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/* global YUI */
YUI.add( 'kvg_deliverysettings-schema', function( Y, NAME ) {
    'use strict';

    /**
     * The KVGDeliverySettings_T entry schema,
     *
     *
     * @module 'kvg_deliverysettings-schema'
     */

    let types = {};

    const i18n = Y.doccirrus.i18n;

    types = Y.mix( types, {
        "root": {
            "base": {
                "complex": "ext",
                "type": "KVGDeliverySettings_T",
                "lib": types
            }
        },
        "KVGDeliveryType_E": {
            "type": "String",
            "required": true,
            "list": [
                {
                    "val": "MANUAL",
                    "-de": i18n( 'deliverysettings-schema.DeliveryType_E.MANUAL' ),
                    i18n: i18n( 'deliverysettings-schema.DeliveryType_E.MANUAL' ),
                    "-en": i18n( 'deliverysettings-schema.DeliveryType_E.MANUAL' )
                },
                {
                    "val": "MEDIPORT",
                    "-de": i18n( 'deliverysettings-schema.DeliveryType_E.MEDIPORT' ),
                    i18n: i18n( 'deliverysettings-schema.DeliveryType_E.MEDIPORT' ),
                    "-en": i18n( 'deliverysettings-schema.DeliveryType_E.MEDIPORT' )
                }
            ],
            i18n: i18n( 'deliverysettings-schema.DeliveryType_E.i18n' ),
            "-en": "Delivery Type",
            "-de": "Versandart"
        },
        "KVGDeliverySettings_T": {
            "mainLocationId": {
                "type": "String",
                "validate": "DeliverySettings_T_mainLocationId",
                "apiv": {v: 2, queryParam: false},
                i18n: i18n( 'deliverysettings-schema.DeliverySettings_T.mainLocationId.i18n' ),
                "-en": "mainLocationId",
                "-de": "mainLocationId"
            },
            "zsrNumber": {
                "type": "String",
                "apiv": {v: 2, queryParam: false},
                i18n: i18n( 'deliverysettings-schema.DeliverySettings_T.zsrNumber.i18n' ),
                "-en": "Comercial No",
                "-de": "BSNR"
            },
            "locname": {
                "type": "String",
                "apiv": {v: 2, queryParam: false},
                i18n: i18n( 'deliverysettings-schema.DeliverySettings_T.locname.i18n' ),
                "-en": "locname",
                "-de": "locname"
            },
            "deliveryType": {
                "default": "MANUAL",
                "complex": "eq",
                "required": true,
                "type": "KVGDeliveryType_E",
                "lib": types
            },
            "mediportBasePath": {
                "type": "String",
                "apic": {v:2, queryParam: false},
                i18n: "mediportBasePath",
                "-en": "mediportBasePath",
                "-de": "mediportBasePath"
            },
            "sendFlowId": {
                "type": "String",
                i18n: "sendFlowId",
                "-en": "sendFlowId",
                "-de": "sendFlowId"
            },
            "receiveFlowId": {
                "type": "String",
                i18n: "receiveFlowId",
                "-en": "receiveFlowId",
                "-de": "receiveFlowId"
            },
            deviceServers: {
                type: ["String"],
                i18n: i18n( 'file-schema.base_File_T.deviceServer.i18n' ),
                '-en': 'device server',
                '-de': 'device server'
            }
        }
    } );

    NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

    Y.namespace( 'doccirrus.schemas' )[ NAME ] = {
        types: types,
        name: NAME,
        cacheQuery: true
    };

    Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[ NAME ], true );
}, '0.0.1', {
    requires: [
        'dcschemaloader',
        'doccirrus',
        'dcvalidations'
    ]
} );
