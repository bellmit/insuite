
/*global YUI*/
'use strict';
YUI.add( 'v_tenant-schema', function( Y, NAME ) {

        var
            // ------- Schema definitions  -------
            ramlConfig = {
                // REST API v2. parameters
                "2": {
                    description: "Tenants can only be added in REST by addressing the master tenant.  " +
                                 "Regular Datasafes will ignore requests to this endpoint.  " +
                                 "MongoDB takes a while to add or remove databases, depending on the amount of data and overall system load. " +
                                 "Do not expect changes to be made immediately and allow enough time for background processes to complete."
                }
            },
            types = {};

        Y.log( 'Loading Schema ' + NAME, 'debug', NAME );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * MOJ-5065 this is a virtual schema and
         * does not actually have a collection related
         * to it in the DB.
         */
        types = Y.mix( types,
            {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "VTenant_T",
                        "lib": types
                    }
                },
                "VTenant_T": {
                    /*
                    Direct embed objects - currently we cannot do this, only indirectly.
                    "company": Y.doccirrus.schemas.company.schema,
                    "contact": Y.doccirrus.schemas.contact.schema,
                    "supportContact": Y.doccirrus.schemas.v_supportcontact.schema,
                    */
                    "automaticCustomerNo": {
                        "type": "Boolean",
                        "apiv": { v:2, queryParam: false },
                        "default": false
                    },
                    "updateNew": {
                        "type": "Boolean",
                        "apiv": { v:2, queryParam: false },
                        "default": false
                    }
                }
            }
        );

        Y.namespace( 'doccirrus.schemas' )[ NAME ] = {
            ramlConfig: ramlConfig,

            /* MANDATORY */
            name: NAME,

            /* MANDATORY */
            types: types

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[ NAME ], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader','dcdb'
        ]
    }
);
