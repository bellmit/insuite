/**
 * User: rrrw
 * Date: 18/3/2018  10:55
 * (c) 2018, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'labdevice-schema', function( Y, NAME ) {
        /**
         * The labdevice entry schema,
         *
         * @module labdevice-schema, keep track of own lab devices.  make them available to the invoicing process (gkv).
         */

        var
            i18n = Y.doccirrus.i18n,
            types = {};

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "LabDevice_T",
                        "lib": types
                    }
                },
                "LabDevice_T": {
                    "locationId": {
                        "required": true,
                        "type": "String",
                        "apiv": { v: 2, queryParam: true },
                        "ref": "location",
                        "refType": "ObjectId",
                        "future": "foreignkey.Location_T",
                        i18n: i18n( 'activity-schema.Activity_T.locationId.i18n' ),
                        "-en": "locationId",
                        "-de": "locationId"
                    },
                    "isUnitUse": {
                        "apiv": { v: 2, queryParam: true },
                        "complex": "eq",
                        "required": true,
                        "type": "IsUnitUse_E",
                        "lib": types
                    },
                    "deviceType": {
                        "type": "String",
                        "required": true,
                        "validate": "LabDevice_T_deviceType",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'labdevice-schema.LabDevice_T.deviceType' ),
                        "-en": "Device Type",
                        "-de": "Gerätetyp"
                    },
                    "manufacturer": {
                        "type": "String",
                        "required": true,
                        "validate": "LabDevice_T_manufacturer",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'labdevice-schema.LabDevice_T.manufacturer' ),
                        "-en": "Manufacturer",
                        "-de": "Hersteller"
                    }
                },
                "IsUnitUse_E": {
                    "type": "String",
                    "apiv": { v: 2, queryParam: true },
                    i18n: i18n( 'labdevice-schema.isUnitUse_E.isUnitUse' ),
                    "-en": "Is Unit-Use",
                    "-de": "psND/UU",
                    "list": [
                        {
                            val: "0",
                            i18n: i18n( 'labdevice-schema.isUnitUse_E.no' ),
                            "-en": "N",
                            "-de": "Nein"
                        },
                        {
                            val: "1",
                            i18n: i18n( 'labdevice-schema.isUnitUse_E.yes' ),
                            "-en": "Y",
                            "-de": "Ja - ausschliesslich"
                        },
                        {
                            val: "2",
                            i18n: i18n( 'labdevice-schema.isUnitUse_E.partial' ),
                            "-en": "Partial",
                            "-de": "Ja - teilweise"
                        }
                    ]
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
            'doccirrus',
            'dcvalidations'
        ]
    }
);
