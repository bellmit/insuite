/**
 * User: pi
 * Date: 04/10/16  15:20
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'v_supportcontact-schema', function( Y, NAME ) {

        'use strict';

        var
            // ------- Schema definitions  -------
            i18n = Y.doccirrus.i18n,
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
                        "type": "VSupportContact_T",
                        "lib": types
                    }
                },
                "SupportContactType_E": {
                    "type": "String",
                    "default": "SUPPORT",
                    "required": true,
                    "apiv": { v: 2, queryParam: true },
                    "list": [
                        {
                            "val": "SUPPORT",
                            i18n: i18n( 'basecontact-schema.BaseContactType_E.SUPPORT.i18n' )
                        }
                    ]
                },
                "VSupportContact_T": {
                    "baseContactType": {
                        "complex": "eq",
                        "type": "SupportContactType_E",
                        "lib": types
                    },
                    "contactBase": {
                        "complex": "ext",
                        "type": "BaseContact_T",
                        "lib": "basecontact"
                    },
                    "base": {
                        "complex": "ext",
                        "type": "SupportContact_T",
                        "lib": "basecontact"
                    }
                }
            }
        );

        Y.namespace( 'doccirrus.schemas' )[ NAME ] = {

            /* MANDATORY */
            name: NAME,

            /* MANDATORY */
            types: types

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[ NAME ], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'basecontact-schema'
        ]
    }
);
