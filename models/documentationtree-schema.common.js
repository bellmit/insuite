YUI.add( 'documentationtree-schema', function( Y, NAME ) {

        'use strict';

        var
            i18n = Y.doccirrus.i18n,
            types = {};

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "DocumentationTree_T",
                        "lib": types
                    }
                },
                "DocumentationTree_T": {
                    "actType": {
                        "complex": "eq",
                        "type": "Activity_E",
                        "lib": "activity"
                    },
                    "entries": {
                        "type": "Mixed",
                        i18n: i18n( 'documentationtree-schema.DocumentationTree_T.entries.i18n' ),
                        "-en": "base-entries",
                        "-de": "base-entries"
                    }
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /*function getDefaultSettings() {
         return template;
         }*/

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,
            /* OPTIONAL default items to be written to the DB on startup */
            //  defaultItems: [template],
            name: NAME//,
            // getDefaultSettings: getDefaultSettings
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'doccirrus',
            'activity-schema',
            'dcschemaloader'
        ]
    }
);

