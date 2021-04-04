'use strict';
/*global YUI */
YUI.add( 'lockedactivity-schema', function( Y, NAME ) {
        /**
         * The DC case data schema definition
         *
         * @module lockedactivity-schema
         */

        /* jshint unused: false */
        // ------- Schema definitions  -------
        var
            types = {};

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );


        types = Y.mix( types, {
                "root": {
                    "base": {"complex": "ext",

                        "type": "base_T",
                        "lib": types
                    }
                },
                "base_T": {
                    "data": {
                        "type": "any"
                    },
                    "logs": {
                        "type": ["any"]
                    },
                    "employeeId": {
                        "type": "String"
                    }
                }
            }
        );

        /**
         * Class REST Schemas
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            /* MANDATORY */
            name: NAME,

            /* MANDATORY */
            types: types

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1',
    {
        requires: [
            'dcschemaloader',
            'doccirrus'
        ]
    }
);
