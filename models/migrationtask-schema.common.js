/**
 *  Used to construct general lists of work to be done by 3LS and one-off scripts
 *
 *  Tasks such as correcting broken invoices, initialize missing forms, (re)create PDFs, etc
 *
 * User: strix
 * Date: 20/03/2020
 * (c) 2020, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
YUI.add( 'migrationtask-schema', function( Y, NAME ) {

        'use strict';

        /**
         * The migrationtasks entry schema,
         *
         * @module 'migrationtask-schema'
         */

        var
            types = {};

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "migrationtask_T",
                        "lib": types
                    }
                },

                "migrationtask_T": {
                    "objId": {
                        "type": "String"
                    },
                    "taskname": {
                        "type": "String"
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
            indexes: [
                {
                    "key": {
                        "objId": 1,
                        "taskname": 1
                    }
                }],
            /* OPTIONAL default items to be written to the DB on startup */
            name: NAME
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'doccirrus',
            'dcvalidations',
            'dcauth'
        ]
    }
);
