/**
 * User: maximilian.kramp
 * Date: 30.09.19  09:44
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'tismcb-schema', function( Y, NAME ) {
        /**
         * @module tismcb-schema
         */

        var
            i18n = Y.doccirrus.i18n,
            types = {};

        types = Y.mix( types, {
                root: {
                    base: {
                        complex: 'ext',
                        type: 'TiSMCB_T',
                        lib: types
                    }
                },
                TiSMCB_T: {
                    iccsn: {
                        type: 'String',
                        required: true,
                        unique: true,
                        key: true,
                        index: 'unique',
                        apiv: {v: 2, queryParam: false},
                        validate: 'TiSMCB_T_iccsn',
                        i18n: i18n( 'tismcb-schema.TiSMCB_T.iccsn' )
                    },
                    name: {
                        type: 'String',
                        required: true,
                        apiv: {v: 2, queryParam: false},
                        i18n: i18n( 'tismcb-schema.TiSMCB_T.name' )
                    },
                    organisationalUnits: {
                        type: ['ObjectId'],
                        apiv: {v: 2, queryParam: false},
                        i18n: i18n( 'tismcb-schema.TiSMCB_T.organisationalUnits' )
                    }
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * @class tismcb
         * @namespace doccirrus.schemas
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {
            types: types,

            indexes: [
                {
                    key: {
                        'iccsn': 1
                    },
                    indexType: {unique: true}
                }
            ],

            name: NAME
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'doccirrus',
            'dcschemaloader',
            'dcvalidations'
        ]
    }
);
