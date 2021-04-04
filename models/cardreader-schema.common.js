/**
 * User: do
 * Date: 01/06/15  18:06
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
'use strict';


YUI.add( 'v_cardreader-schema', function( Y, NAME ) {
        /**
         * The DC Cardreader data schema definition
         *
         * @module DCCardreader
         */

        var
            // ------- Schema definitions  -------
            types = {},

            ramlConfig = {
                // REST API v2. parameters
                "2": {
                    description: "The cardreader collection."
                }
            },
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
                        "apiv": {v: 2, queryParam: true},
                        i18n: i18n( 'v_cardreader-schema.Cardreader_T.name' ),
                        "-en": "Cardreader Name",
                        "-de": "Kartenleser Name"
                    },
                    "ti": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: true},
                        i18n: i18n( 'v_cardreader-schema.Cardreader_T.name' ),
                        "-en": "TI dummy param",
                        "-de": "TI dummy param"
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

            ramlConfig: ramlConfig,

            name: NAME

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: ['dcschemaloader','doccirrus', 'patient-schema']
    }
);