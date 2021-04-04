/**
 * User: rrrw
 * Date: 27/12/2012  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

// NBB:  the file name and the schema name are linked by Mojito and must match!

YUI.add( 'severity-schema', function( Y, NAME ) {
        /**
         * The DC case data schema definition
         *
         * @module severity_schema
         */

        var

        // ------- Schema definitions  -------
            i18n = Y.doccirrus.i18n,
            types = {},
            template = [
                {"severity": "LOW", "color": "#000000", "_id": "000000000000000000000001" },
                {"severity": "NORMAL", "color": "#03D60D", "_id": "000000000000000000000002"},
                {"severity": "IMPORTANT", "color": "#FFC403", "_id": "000000000000000000000003"},
                {"severity": "VERYIMPORTANT", "color": "#FF9A03", "_id": "000000000000000000000004"},
                {"severity": "CRITICAL", "color": "#D60303", "_id": "000000000000000000000005"}
            ];

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "SeverityColor_T",
                        "lib": types
                    }
                },
                "Severity_E": {
                    "type": "String",
                    "default": "NONE",
                    "list": [
                        {
                            "val": "NONE",
                            i18n: i18n( 'severity-schema.Severity_E.NONE' ),
                            "-en": "None",
                            "-de": "Keine"
                        },
                        {
                            "val": "LOW",
                            i18n: i18n( 'severity-schema.Severity_E.LOW' ),
                            "-en": "Low",
                            "-de": "Niedrig"
                        },
                        {
                            "val": "NORMAL",
                            i18n: i18n( 'severity-schema.Severity_E.NORMAL' ),
                            "-en": "Normal",
                            "-de": "Normal"
                        },
                        {
                            "val": "IMPORTANT",
                            i18n: i18n( 'severity-schema.Severity_E.IMPORTANT' ),
                            "-en": "Important",
                            "-de": "Wichtig"
                        },
                        {
                            "val": "VERYIMPORTANT",
                            i18n: i18n( 'severity-schema.Severity_E.VERYIMPORTANT' ),
                            "-en": "Very Important",
                            "-de": "Sehr Wichtig"
                        },
                        {
                            "val": "CRITICAL",
                            i18n: i18n( 'severity-schema.Severity_E.CRITICAL' ),
                            "-en": "Critical",
                            "-de": "Kritisch"
                        }
                    ],
                    i18n: i18n( 'severity-schema.Severity_E.i18n' ),
                    "-en": "Severity",
                    "-de": "Wichtigkeit"
                },
                "SeverityColor_T": {
                    "severity": {
                        "complex": "eq",
                        "type": "Severity_E",
                        "lib": types
                    },
                    "color": {
                        "type": "String",
                        "future": "I18E",
                        i18n: i18n( 'severity-schema.SeverityColor_T.color.i18n' ),
                        "-en": "Color",
                        "-de": "Farbe"
                    },
                    "lastChanged": {
                        "type": "Date",
                        i18n: i18n( 'UserMgmtMojit.lastChanged.i18n' ),
                        "-en": "last changed",
                        "-de": "zuletzt geändert"
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
            defaultItems: template,
            name: NAME
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', { requires: [
        'dcschemaloader',
        'doccirrus'
    ] }
);
