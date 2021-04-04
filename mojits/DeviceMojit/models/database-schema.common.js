/**
 * User: pi
 * Date: 13/08/2015  10:30
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'database-schema', function( Y, NAME ) {
        /**
         * The DC case data schema definition
         *
         * @module database-schema
         */

        var

        // ------- Schema definitions  -------

            types = {},
            i18n = Y.doccirrus.i18n;

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        types = Y.mix( types, {
                root: {
                    base: {
                        complex: 'ext',
                        type: 'Database_T',
                        lib: types
                    }
                },
                Database_T: {
                    base_Source_T: {
                        complex: 'ext',
                        type: 'base_Source_T',
                        lib: 'v_flowsource'
                    },
                    base_Database_T: {
                        complex: 'ext',
                        type: 'base_Database_T',
                        lib: types
                    }
                },
                base_Database_T: {
                    __polytype: {
                        type: 'String'
                    },
                    collectionName: {
                        type: 'String',
                        validate: 'base_Database_T_collectionName',
                        i18n: i18n( 'database-schema.base_Database_T.collectionName.i18n' ),
                        '-en': 'Name',
                        '-de': 'Name'
                    },
                    apiMethod: {
                        type: 'String',
                        validate: 'base_Database_T_apiMethod',
                        i18n: i18n( 'database-schema.base_Database_T.apiMethod.i18n' ),
                        '-en': 'Method',
                        '-de': 'Method'
                    }
                }
            }
        );


        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */

        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,

            name: NAME
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1',
    {
        requires: [
            'dcschemaloader',
            'doccirrus',
            'dcvalidations',
            'v_flowsource-schema'
        ]
    }
);
