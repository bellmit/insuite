/*global YUI */
YUI.add( 'gkv_deliverysettings-schema', function( Y, NAME ) {

        'use strict';

        /**
         * The DeliverySettings_T entry schema,
         *
         * @module 'gkv_deliverysettings-schema'
         */

        var types = {},
            i18n = Y.doccirrus.i18n,
            ONE_CLICK_TEST_ENTRY = [
                {
                    "id": "Fkt 2",
                    "name": "1-Click Abrechnung als Echtabrechnung"
                },
                {
                    "id": "Fkt 8",
                    "name": "technische Rückmeldung (MDN) zu einem Echtpaket"
                },
                {
                    "id": "Fkt 1",
                    "name": "1-Click Abrechnung als Testabrechnung"
                },
                {
                    "id": "Fkt 10",
                    "name": "fachliche Rückmeldung zu einem Echtpaket"
                },
                {
                    "id": "Fkt 7",
                    "name": "technische Rückmeldung (MDN) zu einem Testpaket"
                },
                {
                    "id": "Fkt 9",
                    "name": "fachliche Rückmeldung zu einem Testpaket"
                },
                {
                    "id": "Fkt 3",
                    "name": "Sammelerklärung als Testpaket"
                },
                {
                    "id": "Fkt 4",
                    "name": "Sammelerklärung als Echtpaket"
                },
                {
                    "id": "Fkt 5",
                    "name": "1-Click Abrechnung inkl. Sammelerklärung als Testabrechnung"
                },
                {
                    "id": "Fkt 6",
                    "name": "1-Click Abrechnung inkl. Sammelerklärung als Echtabrechnung"
                }
            ],
            ONE_CLICK_FUNCTIONS_ENUM = {};

        // generate enum from test entry that contains all available 1CLICK functions

        ONE_CLICK_TEST_ENTRY.forEach( function( entry ) {
            var enumVal = entry.id.toUpperCase().replace( ' ', '_' );
            ONE_CLICK_FUNCTIONS_ENUM[enumVal] = entry.id;
        } );

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "DeliverySettings_T",
                        "lib": types
                    }
                },
                "DeliveryType_E": {
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
                            "val": "1CLICK",
                            "-de": i18n( 'deliverysettings-schema.DeliveryType_E.1CLICK' ),
                            i18n: i18n( 'deliverysettings-schema.DeliveryType_E.1CLICK' ),
                            "-en": i18n( 'deliverysettings-schema.DeliveryType_E.1CLICK' )
                        }
                    ],
                    i18n: i18n( 'deliverysettings-schema.DeliveryType_E.i18n' ),
                    "-en": "Delivery Type",
                    "-de": "Versandart"
                },
                "DeliverySettings_T": {
                    "mainLocationId": {
                        "type": "String",
                        "validate": "DeliverySettings_T_mainLocationId",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'deliverysettings-schema.DeliverySettings_T.mainLocationId.i18n' ),
                        "-en": "mainLocationId",
                        "-de": "mainLocationId"
                    },
                    "commercialNo": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'deliverysettings-schema.DeliverySettings_T.commercialNo.i18n' ),
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
                    "kv": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'deliverysettings-schema.DeliverySettings_T.kv.i18n' ),
                        "-en": "locname",
                        "-de": "locname"
                    },
                    "kvPortalUrl": {
                        "type": "String",
                        "validate": "DeliverySettings_T_kvPortalUrl",
                        i18n: i18n( 'deliverysettings-schema.DeliverySettings_T.kvPortalUrl.i18n' ),
                        "-en": "kvPortalUrl",
                        "-de": "kvPortalUrl"
                    },
                    "kvcUsername": {
                        "type": "String",
                        "validate": "DeliverySettings_T_username",
                        i18n: i18n( 'deliverysettings-schema.DeliverySettings_T.kvcUsername.i18n' ),
                        "-en": "Username",
                        "-de": "Nutzername"
                    },
                    "deliveryType": {
                        "default": "MANUAL",
                        "complex": "eq",
                        "required": true,
                        "type": "DeliveryType_E",
                        "lib": types
                    }
                }
            }
        );

        function has1ClickFn( kvcaEntry, fnId ) {
            return kvcaEntry.functions.some( function( fnEntry ) {
                if( fnEntry.id === fnId ) {
                    return true;
                }
            } );
        }

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,
            /* OPTIONAL default items to be written to the DB on startup */
            name: NAME,
            cacheQuery: true,
            has1ClickFn: has1ClickFn,
            ONE_CLICK_TEST_ENTRY: ONE_CLICK_TEST_ENTRY,
            ONE_CLICK_FUNCTIONS_ENUM: ONE_CLICK_FUNCTIONS_ENUM
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
