/**
 * User: pi
 * Date: 13/08/2015  10:30
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'serialdevice-schema', function( Y, NAME ) {
        /**
         * The DC case data schema definition
         *
         * @module serialdevice-schema
         */

        var

        // ------- Schema definitions  -------

            types = {},
            i18n = Y.doccirrus.i18n;

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        types = Y.mix( types, {
                root: {
                    base: {
                        complex: 'ext',
                        type: 'SerialDevice_T',
                        lib: types
                    }
                },
                SerialDevice_T: {
                    base_Source_T: {
                        complex: 'ext',
                        type: 'base_Source_T',
                        lib: 'v_flowsource'
                    },
                    base_SerialDevice_T: {
                        complex: 'ext',
                        type: 'base_SerialDevice_T',
                        lib: types
                    }
                },
                base_SerialDevice_T: {
                    __polytype: {
                        type: 'String'
                    },
                    serialPath: {
                        type: 'String',
                        validate: 'base_SerialDevice_T_serialPath',
                        i18n: i18n( 'serialdevice-schema.base_SerialDevice_T.serialPath.i18n' ),
                        '-en': 'Pfad',
                        '-de': 'Pfad'
                    }
//                    ack: {
//                        type: 'String',
//                        i18n: i18n( 'serialdevice-schema.base_SerialDevice_T.ack.i18n' ),
//                        '-en': 'Acknowledgement character',
//                        '-de': 'Acknowledgement character'
//                    },
//                    eot: {
//                        type: 'String',
//                        i18n: i18n( 'serialdevice-schema.base_SerialDevice_T.eot.i18n' ),
//                        '-en': 'End-of-transmission character',
//                        '-de': 'End-of-transmission character'
//                    }
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
