/**
 * (c) 2018, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'cashlog-schema', function( Y, NAME ) {
        /**
         * The CashLog entry schema,
         *
         * @module CashLog-schema
         */

        var types = {};

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "PVSLog_T",
                        "lib": "pvslog"
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
        requires: [
            'dcschemaloader',
            'doccirrus',
            'dcvalidations',
            'pvslog-schema'
        ]
    }
);
