/*global YUI, YUI_config*/
'use strict';

YUI.add( 'v_insight2-schema', function( Y, NAME ) {
        var types = {};
        var countryMode = Y.doccirrus.commonutils.isClientSide() ? YUI_config.doccirrus.Env.countryMode : undefined;

        types = Y.mix( types,
            {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "root",
                        "lib": "insight2"
                    }
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        Y.namespace( 'doccirrus.schemas' )[NAME] = {
            name: NAME,
            types: types
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true, countryMode );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'insight2-schema'
        ]
    }
);