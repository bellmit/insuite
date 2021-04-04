/**
 * User: pi
 * Date: 13/08/2015  10:30
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'gdtConfig-schema', function( Y, NAME ) {
        /**
         * The DC case data schema definition
         *
         * @module gdtConfig-schema
         */

        var types = {},
            i18n = Y.doccirrus.i18n;
        
        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        types = Y.mix( types, {
                root: {
                    base: {
                        complex: 'ext',
                        type: 'GdtConfig_T',
                        lib: types
                    }
                },
                GdtConfig_T: {
                    base_Source_T: {
                        complex: 'ext',
                        type: 'base_Source_T',
                        lib: 'v_flowsource'
                    },
                    base_GdtConfig_T: {
                        complex: 'ext',
                        type: 'base_GdtConfig_T',
                        lib: types
                    }
                },
                base_GdtConfig_T: {
                    __polytype: {
                        type: 'String'
                    },
                    sender: {
                        type: 'String',
                        i18n: i18n( 'gdt-api.SENDER' ),
                        '-en': 'Sender ID',
                        '-de': 'Absender ID'
                    },
                    receiver: {
                        type: 'String',
                        i18n: i18n( 'gdt-api.RECEIVER' ),
                        '-en': 'Receiver ID',
                        '-de': 'Empfänger ID'
                    }
                }
            }
        );

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */

        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,
            name: NAME
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1',
    {
        requires: [
            'dcschemaloader',
            'doccirrus',
            'dcvalidations',
            'v_flowsource-schema'
        ]
    }
);
