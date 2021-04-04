/**
 * User: do
 * Date: 01/06/15  18:06
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
'use strict';


YUI.add( 'v_cardreaderconfiguration-schema', function( Y, NAME ) {

        var
            // ------- Schema definitions  -------
            types = {};


        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "v_cardreaderconf",
                        "apiv": {v: 2, queryParam: false},
                        "lib": types
                    }
                },
                "v_cardreaderconf": {
                    "Base": {
                        "complex": "ext",
                        "type": "Cardreader_T",
                        "lib": "cardreaderconfiguration"
                    },
                    "connectionStatus": {
                        "type": "String"
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

            name: NAME

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: ['dcschemaloader', 'doccirrus', 'cardreaderconfiguration-schema']
    }
);
/**
 * User: as
 * Date: 05.02.18  15:06
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
