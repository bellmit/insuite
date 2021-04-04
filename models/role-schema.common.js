/*global YUI */
YUI.add( 'role-schema', function( Y, NAME ) {

        'use strict';

        /**
         * The Role_T entry schema,
         *
         * @module 'role-schema'
         */

        var types = {},
            i18n = Y.doccirrus.i18n,
            DEFAULT_ROLE = Object.freeze({
                EMPFANG: 'Empfang',
                INSTOCK: 'Bestellung'
            }),
            ROLES = Object.freeze({
                CARDIO: 'Telecardio',
                CARE: 'INCARE',
                INVOICE: i18n('activity-schema.Activity_E.INVOICE')
            }),
            templates = [
                {
                    "_id": "000000000000000000000001",
                    "value": DEFAULT_ROLE.EMPFANG,
                    "descripton":""
                },
                {
                    "_id": "000000000000000000000002",
                    "value": DEFAULT_ROLE.INSTOCK,
                    "descripton":""
                }
            ],
            ramlConfig = {
                // REST API v2. parameters
                "2": {
                    description: "Roles available for the Praxis. For v.2. we only allow get"
                }
            };

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "Role_T",
                        "lib": types
                    }
                },
                "Role_T": {
                    "value": {
                        "apiv": { v:2, queryParam: false },
                        "type": "String",
                        "required": true,
                        i18n: i18n( 'role-schema.Role_T.value.i18n' ),
                        "-en": "value",
                        "-de": "value"
                    },
                    "description": {
                        "type": "String",
                        "default": "",
                        i18n: i18n( 'role-schema.Role_T.description.i18n' ),
                        "-en": "description",
                        "-de": "description"
                    }
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        function getDefaultRole() {
            return templates[0];
        }

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,
            /* OPTIONAL default items to be written to the DB on startup */
            defaultItems: templates,
            name: NAME,
            ramlConfig: ramlConfig,
            getDefaultRole: getDefaultRole,
            ROLES: ROLES,
            DEFAULT_ROLE: DEFAULT_ROLE
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

