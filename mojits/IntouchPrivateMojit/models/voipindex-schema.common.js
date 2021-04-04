

/*global YUI */
'use strict';

YUI.add( 'voipindex-schema', function( Y, NAME ) {

        var types = {},
            i18n = Y.doccirrus.i18n;

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "VoipIndex_T",
                        "lib": types
                    }
                },
                "VoipIndex_T": {
                    "personId": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'IntouchPrivateMojit.voipindex-schema."VoipIndex_T".personId.i18n' ),
                        "-en": "personId",
                        "-de": "personId"
                    },
                    "model": {
                        "complex": "eq",
                        "type": "CallerType_E",
                        "apiv": { v: 2, queryParam: false },
                        "lib": "inphone"
                    },
                    "homogenisednumber": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: true },
                        i18n: i18n( 'IntouchPrivateMojit.voipindex-schema."VoipIndex_T".homogenisednumber.i18n' ),
                        "-en": "homogenisednumber",
                        "-de": "homogenisednumber"
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
            defaultItems: [],
            name: NAME
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: ['dcschemaloader','dcvalidations', 'inphone-schema']
    }
);
