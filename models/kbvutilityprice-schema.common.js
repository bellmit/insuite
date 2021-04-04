/**
 * User: do
 * Date: 30/03/17  15:57
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
YUI.add( 'kbvutilityprice-schema', function( Y, NAME ) {

        'use strict';

        /**
         * The KbvUtilityPrice_T entry schema,
         *
         * @module 'kbvutilityprice-schema'
         */

        var
            i18n = Y.doccirrus.i18n,
            types = {};

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "KbvUtilityPrice_T",
                        "lib": types
                    }
                },
                "KbvUtilityPrice_T": {
                    "utilityName": {
                        "required": true,
                        "type": "String",
                        "i18n": i18n( 'kbvutilityprice-schema.KbvUtilityPrice_T.utilityName' ),
                        "-en": "Heilmittel",
                        "-de": "Heilmittel"
                    },
                    "utilityPositionNo": {
                        "type": "String",
                        "i18n": i18n( 'kbvutilityprice-schema.KbvUtilityPrice_T.utilityPositionNo' ),
                        "-en": "Position No.",
                        "-de": "Positionsnr."
                    },
                    "kv": {
                        "required": true,
                        "type": "String",
                        "i18n": i18n( 'kbvutilityprice-schema.KbvUtilityPrice_T.kv' ),
                        "-en": "KV",
                        "-de": "KV"
                    },
                    "active": {
                        "required": true,
                        "default": true,
                        "type": "Boolean",
                        "i18n": i18n( 'kbvutilityprice-schema.KbvUtilityPrice_T.active' ),
                        "-en": "Aktiv",
                        "-de": "Aktiv"
                    },
                    "official": {
                        "default": false,
                        "type": "Boolean",
                        "i18n": i18n( 'kbvutilityprice-schema.KbvUtilityPrice_T.official' ),
                        "-en": "Official Price",
                        "-de": "Offizieller Preis"
                    },
                    "confirmOfficial": {
                        "default": false,
                        "type": "Boolean",
                        "i18n": i18n( 'kbvutilityprice-schema.KbvUtilityPrice_T.confirmOfficial' ),
                        "-en": "confirmOfficial",
                        "-de": "confirmOfficial"
                    },
                    "officialPrice": {
                        "type": "Number",
                        "i18n": i18n( 'kbvutilityprice-schema.KbvUtilityPrice_T.officialPrice' ),
                        "-en": "Official Price",
                        "-de": "Offizieller Preis."
                    },
                    "officialUtilityPositionNo": {
                        "type": "String",
                        "i18n": i18n( 'kbvutilityprice-schema.KbvUtilityPrice_T.officialUtilityPositionNo' ),
                        "-en": "Official Position No.",
                        "-de": "Offizieller Positionsnr."
                    },
                    "insuranceType": {
                        "required": true,
                        "complex": "eq",
                        "type": "Insurance_E",
                        "lib": "person",
                        "apiv": {v: 2, queryParam: false},
                        "i18n": i18n( 'kbvutilityprice-schema.KbvUtilityPrice_T.insuranceType' ),
                        "-en": "Health insurance type",
                        "-de": "Krankenkassentyp"
                    },
                    "careProvider": {
                        "complex": "eq",
                        "type": "CareProvider_E",
                        "lib": types,
                        "apiv": {v: 2, queryParam: false},
                        "i18n": i18n( 'kbvutilityprice-schema.KbvUtilityPrice_T.careProvider' ),
                        "-en": "Care Provider",
                        "-de": "Leistungserbringer"
                    },
                    "price": {
                        "type": "Number",
                        "validate": "kbv.KBVUtilityPrices_price",
                        "i18n": i18n( 'kbvutilityprice-schema.KbvUtilityPrice_T.price' ),
                        "-en": "Preis",
                        "-de": "Preis"
                    },
                    "prices": {
                        "complex": "inc",
                        "type": "InsuranceGroupPrice_T",
                        "lib": types,
                        "validate": "kbv.KBVUtilityPrices_prices",
                        i18n: i18n( 'kbvutilityprice-schema.KbvUtilityPrice_T.prices' ),
                        "-en": "Prices",
                        "-de": "Preise"
                    }
                },
                "InsuranceGroupPrice_T": {
                    "insuranceGroupId": {
                        "required": true,
                        "type": "String",
                        "i18n": i18n( 'kbvutilityprice-schema.InsuranceGroupPrice_T.insuranceGroupId' ),
                        "-en": "Insurance Group",
                        "-de": "Versicherungsgruppe"
                    },
                    "price": {
                        "required": true,
                        "type": "Number",
                        "validate": "validNumber",
                        "i18n": i18n( 'kbvutilityprice-schema.InsuranceGroupPrice_T.price' ),
                        "-en": "Preis",
                        "-de": "Preis"
                    }
                },
                "CareProvider_E": {
                    "type": "String",
                    "default": "",
                    "list": [
                        {
                            "val": "",
                            i18n: i18n( 'kbvutilityprice-schema.CareProvider_E.NO' ),
                            "-en": "No specific",
                            "-de": "Kein Bestimmter"
                        }, {
                            "val": "1",
                            i18n: i18n( 'kbvutilityprice-schema.CareProvider_E.1' ),
                            "-en": "Masseur, Masseur und med. Bademeister (1)",
                            "-de": "Masseur, Masseur und med. Bademeister (1)"
                        }, {
                            "val": "2",
                            i18n: i18n( 'kbvutilityprice-schema.CareProvider_E.2' ),
                            "-en": "Krankengymnast/ Physiotherapeut (2)",
                            "-de": "Krankengymnast/ Physiotherapeut (2)"
                        }, {
                            "val": "3",
                            i18n: i18n( 'kbvutilityprice-schema.CareProvider_E.3' ),
                            "-en": "Logopäde/ Sprachtherapeut/ Atem-, SprechundStimmlehrer (Schule Schlaffhorst-Andersen) (3)",
                            "-de": "Logopäde/ Sprachtherapeut/ Atem-, SprechundStimmlehrer (Schule Schlaffhorst-Andersen) (3)"
                        }, {
                            "val": "4",
                            i18n: i18n( 'kbvutilityprice-schema.CareProvider_E.4' ),
                            "-en": "Sonst. Sprachtherapeut (Verwendung soweit abweichende landesrechtl. Vergütungsregelungenbestehen) (4)",
                            "-de": "Sonst. Sprachtherapeut (Verwendung soweit abweichende landesrechtl. Vergütungsregelungenbestehen) (4)"
                        }, {
                            "val": "5",
                            i18n: i18n( 'kbvutilityprice-schema.CareProvider_E.5' ),
                            "-en": "Ergotherapeut (5)",
                            "-de": "Ergotherapeut (5)"
                        }, {
                            "val": "6",
                            i18n: i18n( 'kbvutilityprice-schema.CareProvider_E.6' ),
                            "-en": "Krankenhaus (6)",
                            "-de": "Krankenhaus (6)"
                        }, {
                            "val": "7",
                            i18n: i18n( 'kbvutilityprice-schema.CareProvider_E.7' ),
                            "-en": "Podologe (7)",
                            "-de": "Podologe (7)"
                        }, {
                            "val": "8",
                            i18n: i18n( 'kbvutilityprice-schema.CareProvider_E.8' ),
                            "-en": "Leistungserbringer von ambulanten Vorsorgeleistungen in anerkannten Kurorten (8)",
                            "-de": "Leistungserbringer von ambulanten Vorsorgeleistungen in anerkannten Kurorten (8)"
                        }, {
                            "val": "9",
                            i18n: i18n( 'kbvutilityprice-schema.CareProvider_E.9' ),
                            "-en": "Sonstige (9)",
                            "-de": "Sonstige (9)"
                        }, {
                            "val": "A",
                            i18n: i18n( 'kbvutilityprice-schema.CareProvider_E.A' ),
                            "-en": "Leistungserbringer von Ernährungstherapie (A)",
                            "-de": "Leistungserbringer von Ernährungstherapie (A)"
                        }
                    ],
                    i18n: i18n( 'kbvutilityprice-schema.KbvUtilityPrice_T.careProvider' ),
                    "-en": "Invoice",
                    "-de": "Abrechnung"
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
            name: NAME
        };
        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: ['dcschemaloader']
    }
);
