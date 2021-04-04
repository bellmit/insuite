/**
 * User: pi
 * Date: 18/01/2016  13:45
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'v_prcsynchro-schema', function( Y, NAME ) {

        'use strict';

        var
        // ------- Schema definitions  -------

            i18n = Y.doccirrus.i18n,
            types = {};

        Y.log( 'Loading Schema ' + NAME, 'debug', NAME );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        types = Y.mix( types,
            {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "VPrcSynchro_T",
                        "lib": types
                    }
                },
                "VPrcSynchro_T": {
                    prcdispatch: {
                        "complex": "ext",
                        "type": "PRCDispatch_T",
                        "lib": "prcdispatch"
                    },
                    payload: {
                        "complex": "inc",
                        "type": "VPrcSynchroPayload_T",
                        "lib": types
                    }
                },
                "VPrcSynchroPayload_T": {
                    type: {
                        type: 'String',
                        i18n: i18n( 'v_prcsynchro-schema.VPrcSynchroPayload_T.type' )

                    },
                    obj: {
                        type: 'String',
                        i18n: i18n( 'v_prcsynchro-schema.VPrcSynchroPayload_T.obj' )
                    }
                }
            }
        );

        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            /* MANDATORY */
            name: NAME,

            /* MANDATORY */
            types: types

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: ['dcvalidations', 'dcschemaloader', 'prcdispatch-schema']
    }
);
