/**
 * User: bhagyashributada
 * Date: 5/7/18  12:43 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
'use strict';
YUI.add( 'datasafe-schema', function( Y, NAME ) {
        /**
         * @module datasafe-schema
         */

        var
            i18n = Y.doccirrus.i18n,
            types = {};

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                root: {
                    base: {
                        complex: 'ext',
                        type: 'Datasafe_T',
                        lib: types
                    }
                },
                Datasafe_T: {
                    'practice': {
                        "type": "any",
                        "apiv": { v:2, queryParam: false },
                        i18n: i18n('datasafe-schema.Datasafe_T.PRACTICE')
                    },
                    'collections': {
                        type: 'any',
                        "apiv": { v:2, queryParam: false },
                        i18n: i18n('datasafe-schema.Datasafe_T.COLLECTIONS')
                    },
                    'activities': {
                        type: 'any',
                        "apiv": { v:2, queryParam: false },
                        i18n: i18n('datasafe-schema.Datasafe_T.ACTIVITIES')
                    },
                    'errors': {
                        type: 'any',
                        "apiv": { v:2, queryParam: false },
                        i18n: i18n('datasafe-schema.Datasafe_T.ERRORS')
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
            name: NAME
        };
        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: ['doccirrus', 'dcschemaloader', 'dcvalidations']
    }
);
