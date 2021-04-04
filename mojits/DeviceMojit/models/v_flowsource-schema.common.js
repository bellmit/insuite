/*global YUI */
YUI.add( 'v_flowsource-schema', function( Y, NAME ) {
        'use strict';
        /**
         * The DC case data schema definition
         *
         * @module v_flowsource-schema
         */

        var

        // ------- Schema definitions  -------

            types = {},
            i18n = Y.doccirrus.i18n,
            resourceTypes = Object.freeze( {
                XDTSERIAL: 'XDTSERIAL',
                FILE: 'FILE',
                DATABASE: 'DATABASE',
                MEDIPORT: 'MEDIPORT',
                EVENT: 'EVENT'
            } );


        function createSchemaResourceList() {
            var
                result = [];
            Object.keys( resourceTypes ).forEach( function( type ) {
                result.push( {
                    val: resourceTypes[type],
                    i18n: i18n( 'flow-schema.ResourceType_E.' + resourceTypes[type] + '.i18n' ),
                    '-en': type,
                    '-de': type
                } );
            } );

            return result;
        }

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        types = Y.mix( types, {
                root: {
                    base: {
                        complex: 'ext',
                        type: 'base_Source_T',
                        lib: types
                    }
                },
                ResourceType_E: {
                    type: 'String',
                    required: true,
                    list: createSchemaResourceList(),
                    i18n: i18n( 'flow-schema.ResourceType_E.i18n' ),
                    '-en': 'Type',
                    '-de': 'Type'
                },
                base_Source_T: {
                    resourceType: {
                        complex: 'eq',
                        type: 'ResourceType_E',
                        lib: types
                    },
                    name: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.base_Source_T.name.i18n' ),
                        '-en': 'Name',
                        '-de': 'Name'
                    }
                }
            }
        );

        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,
            name: NAME,
            /**
             * @property resourceTypes
             * @type {Object}
             */
            resourceTypes: resourceTypes
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
