/*global YUI */
YUI.add( 'syncreporting-schema', function( Y, NAME ) {

        'use strict';

        /**
         * The syncreporting entry schema,
         *
         * @module 'syncreporting-schema'
         */

        var
            i18n = Y.doccirrus.i18n,
            types = {};

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "syncreporting_T",
                        "lib": types
                    }
                },

                "EntityName_E": {
                    "type": "String",
                    "required": true,
                    "list": [
                        {
                            "val": "ACTIVITY",
                            i18n: i18n( 'syncreporting-schema.EntityName_E.ACTIVITY' )
                        },
                        {
                            "val": "LABDATA",
                            i18n: i18n( 'syncreporting-schema.EntityName_E.LABDATA' )
                        },
                        {
                            "val": "DOCUMENT",
                            i18n: i18n( 'syncreporting-schema.EntityName_E.DOCUMENT' )
                        },
                        {
                            "val": "SCHEDULE",
                            i18n: i18n( 'syncreporting-schema.EntityName_E.SCHEDULE' )
                        },
                        {
                            "val": "TASK",
                            i18n: i18n( 'syncreporting-schema.EntityName_E.TASK' )
                        },
                        {
                            "val": "MEDDATA",
                            i18n: i18n( 'syncreporting-schema.EntityName_E.MEDDATA' )
                        }
                    ],
                    i18n: i18n( 'syncreporting-schema.EntityName_E.i18n' ),
                    "-en": "Reporting Type",
                    "-de": "Berichtstyp"
                },

                "syncreporting_T": {
                    "entryId": {
                       "type": "String"
                    },
                    "entityName": {
                        "complex": "eq",
                        "type": "EntityName_E",
                        "lib": types
                    },
                    "timestamp": {
                        "type": "Date"
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
                        "entityName": 1,
                        "entryId": 1
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
