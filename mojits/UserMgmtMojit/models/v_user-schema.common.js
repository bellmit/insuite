/*global YUI*/
'use strict';

YUI.add( 'v_user-schema', function( Y, NAME ) {

        var
            // ------- Schema definitions  -------
            i18n = Y.doccirrus.i18n,
            ramlConfig = {
                // REST API v2. parameters
                "2": {
                    description: "The user API allows one to manipulate employees, including all functions on the Employee Settings page. Use the username field to set the login username, set groups for access rights, as well as any other information for an employee."
                }
            },
            types = {};


        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        types = Y.mix( types, {
            "root": {
                "base": {
                    "complex": "ext",
                    "type": "User_T",
                    "lib": types
                }
            },
            "User_T":{
                "employee": {
                    "complex": "ext",
                    "type": "Employee_T",
                    "apiv": {v: 2, queryParam: true},
                    "lib": "employee"
                },
                "person": {
                    "complex": "ext",
                    "type": "Person_T",
                    "apiv": {v: 2, queryParam: true},
                    "lib": "person"
                },
                "physician": {
                    "complex": "ext",
                    "type": "PhysicianContact_T",
                    "lib": "basecontact"
                },
                "username": {
                    "type": "String",
                    "apiv": {v: 2, queryParam: true},
                    "-en": "username",
                    "-de": "username"
                },
                "memberOf": {
                    "complex": "inc",
                    "type": "Group_T",
                    "apiv": {v: 2, queryParam: true},
                    "lib": "employee",
                    i18n: i18n( 'identity-schema.Identity_T.memberOf' ),
                    "-en": "memberOf",
                    "-de": "memberOf"
                },
                "roles": {
                    "type": [String],
                    "apiv": { v: 2, queryParam: false },
                    i18n: i18n( 'employee-schema.Employee_T.roles' ),
                    "-en": "Roles",
                    "-de": "Roles"
                },
                "initials": {
                    "apiv": { v: 2, queryParam: true },
                    "type": "String",
                    "validate": "Employee_T_initials",
                    i18n: i18n( 'employee-schema.Employee_T.initials.i18n' ),
                    "lib": "employee"
                },
                "accountInfo": {
                    "complex": "ext",
                    "type": "AccountEmployee_T",
                    "lib": "employee"
                }
            }
        });

        /**
         * Class REST Schemas
         */
        Y.namespace( 'doccirrus.schemas' )[ NAME ] = {

            /* MANDATORY */
            name: NAME,

            /* MANDATORY */
            types: types,

            ramlConfig: ramlConfig


        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[ NAME ], true );
    },
    '0.0.1', {
        requires: [
            'doccirrus',
            'dcvalidations',
            'dcschemaloader',
            'employee-schema',
            'identity-schema' ]
    }
);
