/**
 * User: pi
 * Date: 15/01/2015  15:05
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'v_medicationItem-schema', function( Y, NAME ) {

        'use strict';

        var
            // ------- Schema definitions  -------
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
                root: {
                    base: {
                        complex: 'ext',
                        type: 'VMedicationItem_T',
                        lib: types
                    }
                },
                VMedicationItem_T: {
                    Base: {
                        complex: 'ext',
                        type: 'VMedication_T',
                        lib: 'v_medication'
                    },
                    positionIndex: {
                        type: 'Number',
                        i18n: 'positionIndex'
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
            'v_medication-schema'
        ]
    }
);
