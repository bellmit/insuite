/**
 * User: do
 * Date: 31.01.20  10:41
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


/**
 * User: do
 * Date: 22.01.20  14:29
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'v_kbvmedicationplanviewmodel-schema', function( Y, NAME ) {

        'use strict';

        var
            // ------- Schema definitions  -------
            ramlConfig = {
                // REST API v2. parameters
                "2": {
                    description: "Medicationplan activity"
                }
            },
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
                        "type": "VKBVMedicationPlan_T",
                        "lib": types
                    }
                },
                "VKBVMedicationPlan_T": {
                    "Base": {
                        "complex": "ext",
                        "type": "KBVMedicationPlan_T",
                        "lib": "activity"
                    }
                }
            }
        );

        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            /* MANDATORY */
            name: NAME,

            ramlConfig: ramlConfig,

            /* MANDATORY */
            types: types

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'activity-schema'
        ]
    }
);
