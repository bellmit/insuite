/**
 * User: md
 * Date: 30/10/2018 14:50
 * (c) 2018, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
'use strict';
YUI.add( 'v_jira-schema', function( Y, NAME ) {
        var
            // ------- Schema definitions  -------
            types = {};

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        types = Y.mix( types, {
                "root": {
                    base: {
                        "complex": "ext",
                        "type": "VJira_T",
                        "lib": types
                    }
                },
                "VJira_T": {
                    "queryType": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: false }
                    },
                    "startAt": {
                        "type": "Number",
                        "apiv": { v: 2, queryParam: false }
                    },
                    "maxResults": {
                        "type": "Number",
                        "apiv": { v: 2, queryParam: false }
                    },
                    "total": {
                        "type": "Number",
                        "apiv": { v: 2, queryParam: false }
                    },
                    "fields": {
                        "type": ["String"],
                        "apiv": { v: 2, queryParam: false }
                    },
                    "expand": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: false }
                    },
                    "issues": {
                        "type": ["Object"],
                        "apiv": { v: 2, queryParam: false }
                    }
                }
            }
        );

        /**
         * Class REST Schemas
         */
        Y.namespace( 'doccirrus.schemas' )[ NAME ] = {

            /* MANDATORY */
            name: NAME,

            /* MANDATORY */
            types: types
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[ NAME ], true );
    },
    '0.0.1', { requires: [] }
);
