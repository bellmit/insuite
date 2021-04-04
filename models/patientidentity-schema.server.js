/**
 * User: rrrw
 * Date: 16/11/2012  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'patientidentitity-schema', function( Y, NAME ) {

        /**
         *
         * Contains the security information regarding a patient's access to the patient
         * portal for this PRC, and for the patients access  rights to the PRC information.
         *
         * This sensitive security info is kept on a per tenant / PRC basis.
         *
         */


        var
        // ------- private 'constants'  -------

        // ------- Schema definitions  -------
            types = {
                "root": {
                    "hashPbkdf2Pin": {
                        "type": "string",
                        "-en": "hashPbkdf2Pin",
                        "-de": "hashPbkdf2Pin"
                    },
                    "hashPrcPin": {
                        "type": "string",
                        "-en": "hashPrcPin",
                        "-de": "hashPrcPin"
                    },
                    "hashCPin": {
                        "type": "string",
                        "-en": "hashCPin",
                        "-de": "hashCPin"
                    },
                    "specifiedBy": {
                        "type": "string",
                        "-en": "specifiedBy",
                        "-de": "specifiedBy"
                    }
                }
            };

        // -------- Our Schema Methods and Hooks are defined here -------

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        // -------- Static Helper Functions defined here -------

        /**
         * Class Auth Schemas -- gathers all the schemas that the Authorization Service works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,

            name: NAME

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {requires: ['dcschemaloader','mojito']}
);
