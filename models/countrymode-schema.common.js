/**
 * User: oliversieweke
 * Date: 15.01.19  09:51
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI*/
'use strict';

YUI.add( 'countrymode-schema', function( Y, NAME ) {
        var types = {};
        var i18n = Y.doccirrus.i18n;

        types = Y.mix( types, {
                "root": {
                    "countryMode": {
                        "complex": "eq",
                        "type": "CountryMode_E",
                        "lib": types
                    }
                },
                "CountryMode_E": {
                    "type": ["String"],
                    "validate": "CountryMode_E",
                    "list": [
                        {
                            "val": "D",
                            i18n: i18n( 'countrymode-schema.CountryMode_E.D' )
                        },
                        {
                            "val": "CH",
                            i18n: i18n( 'countrymode-schema.CountryMode_E.CH' )
                        }
                    ],
                    i18n: i18n( 'countrymode-schema.countryMode' )
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        Y.namespace( 'doccirrus.schemas' )[NAME] = {
            name: NAME,
            types: types
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcvalidations',
            'dcschemaloader'
        ]
    }
);
