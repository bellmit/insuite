/*global YUI */
YUI.add( 'receivedispatch-schema', function( Y, NAME ) {

        'use strict';

        /**
         * The syncdispatch entry schema,
         *
         * @module 'syncdispatch-schema'
         */

        var
            //i18n = Y.doccirrus.i18n,
            types = {};

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "receivedispatch_T",
                        "lib": types
                    }
                },
                "receivedispatch_T": {
                    "entryId": {
                        "type": "String"
                    },
                    "entityName": {
                        "type": "String"
                    },
                    "timestamp": {
                        "type": "Date"
                    },
                    "dcCustomerNo": {
                        "type": "String"
                    },
                    "sequenceNo": {
                       "type": "Number"
                    },
                    "status": {
                        "default": 0,
                        "complex": "eq",
                        "type": "Status_E",
                        "lib": types
                    },
                    "onDelete": {
                        "type": "Boolean"
                    },
                    "doc": {
                        "type": "Object"
                    },
                    "lastChanged": {
                        "type": "Date"
                    },
                    "errorMessage": {
                        "type": "String"
                    },
                    "diff": {
                        "type": "any"
                    }
                },
                "Status_E": {
                    "type": "Number",
                    "list": [
                        {
                            "val": 0,
                            "-en": "Received",
                            "-de": "Empfangen"
                        },
                        {
                            "val": 1,
                            "-en": "Processed",
                            "-de": "Bearbeitet"
                        },
                        {
                            "val": 2,
                            "-en": "NotProcessedTime",
                            "-de": "NichtBearbeitetZeit"
                        },
                        {
                            "val": 3,
                            "-en": "NotProcessedError",
                            "-de": "NichtBearbeitetFehler"
                        }
                    ]
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
                {"key": {"dcCustomerNo": 1, "sequenceNo": 1}}
            ],
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
