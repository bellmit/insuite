/**
 * User: rrrw
 * Date: 16/11/2012  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
'use strict';
YUI.add( 'customer-schema', function( Y, NAME ) {
        var
            // ------- Schema definitions  -------
            i18n = Y.doccirrus.i18n,
            types = {};

        Y.log( 'Loading Schema ' + NAME, 'debug', NAME );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );


        /**
         * Class REST Schemas
         */
        types = Y.mix( types,
            {
                "base": {
                    "activeState": {
                        "type": "Boolean",
                        i18n: i18n( 'customer-schema.base.activeState.i18n' ),
                        "apiv": {v: 2, queryParam: true},
                        "-en": "activeState",
                        "-de": "activeState"
                    }
                }
            }
        );

        types.root = {};

        // Customer_T may not be instantiated directly, use either Contact_T or Company_T
        types.Customer_T = types.base;

        Y.namespace( 'doccirrus.schemas' )[NAME] = {
            /* MANDATORY */
            name: NAME,
            /* MANDATORY */
            types: types
        };

    },
    '0.0.1', {
        requires: [
            'doccirrus',
            'dcschemaloader'
        ]
    }
);
