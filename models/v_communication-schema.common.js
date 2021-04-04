/**
 * User: bhagyashributada
 * Date: 2019-08-02  08:59
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI*/
'use strict';

YUI.add( 'v_communication-schema', function( Y, NAME ) {

        let
            types = {},
            ramlConfig = {
                // REST API v2. parameters
                "2": {
                    description: "Send Email via /rest/2"
                }
            };

        types = Y.mix( types, {
            "root": {
                "base": {
                    "complex": "ext",
                    "type": "communication_T",
                    "lib": types
                }
            },
            "communication_T": {
                "emailTo": {
                    "type": "string",
                    "apiv": {v: 2, queryParam: false}
                },
                "text": {
                    "type": "Mixed",
                    "apiv": {v: 2, queryParam: false}
                },
                "subject": {
                    "type": "string",
                    "apiv": {v: 2, queryParam: false}
                },
                "emailFrom": {
                    "type": "string",
                    "apiv": {v: 2, queryParam: false}
                }
            }
        } );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * Class REST Schemas
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {
            name: NAME,
            types: types,
            ramlConfig: ramlConfig
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'doccirrus',
            'dcvalidations',
            'dcschemaloader'
        ]
    }
);
