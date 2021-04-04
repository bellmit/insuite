/*global YUI*/
'use strict';
YUI.add( 'resource-schema', function( Y, NAME ) {

        /**
         * @module calendar
         * @submodule models
         * @namespace doccirrus.schemas
         * @class ResourceSchema
         */

        var
            // ------- private 'constants'  -------
            ramlConfig = {
                // REST API v2. parameters
                "2": {
                    description: "Resources are some specific items ( humans, devices ) which are required for some types of appointments."
                }
            },
            types = {},
            i18n = Y.doccirrus.i18n;

        /**
         * Schema definitions
         * @property types
         * @type {YUI}
         */
        types = Y.mix( types, {
                root: {
                    "base": {
                        "complex": "ext",
                        "type": "Resource_T",
                        "lib": types
                    }
                },
                Resource_T: {
                    "name": {
                        "type": "String",
                        "required": true,
                        i18n: i18n( 'resource-schema.Resource_T.name' ),
                        "-en": "Name",
                        "-de": "Name"
                    },
                    "type": {
                        "type": "String",
                        "required": true,
                        i18n: i18n( 'resource-schema.Resource_T.type' ),
                        "-en": "Resource type",
                        "-de": "Ressourcentyp"
                    },
                    "capacity": {
                        "type": "Number",
                        "required": true,
                        "default": 1,
                        i18n: i18n( 'resource-schema.Resource_T.capacity' ),
                        "-en": "Capacity",
                        "-de": "Kapazität"
                    }
                }
            }
        );
        Y.log( 'Loading Schema ' + NAME, 'debug', NAME );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

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
    '0.0.1', { requires: [ 'dcschemaloader' ] }
);
