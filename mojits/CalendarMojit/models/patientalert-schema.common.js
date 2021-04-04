/**
 * User: rrrw
 * Date: 16/11/2012  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'patientalert-schema', function( Y, NAME ) {

        /**
         * The Patient Alert acts on the one hand as a validation.
         *
         * @class PatientAlertSchema
         */

        'use strict';

        var
        // ------- Schema definitions  -------
            i18n = Y.doccirrus.i18n,
            types = {
                PatientAlert_T: {
                    email: {
                        "type": 'String',
                        "validate": "PatientAlert_T_email",
                        i18n: i18n( 'patientalert-schema.PatientAlert_T.email' ),
                        "-en": "email",
                        "-de": "email"
                    },
                    mobile: {
                        'type': 'String',
                        validate: 'PatientAlert_T_phone',
                        i18n: i18n( 'patientalert-schema.Schedule_T.mobile' ),
                        "-en": "mobile",
                        "-de": "mobile"
                    },
                    "timeinadvance": {
                        "type": "Number",
                        i18n: i18n( 'patientalert-schema.Schedule_T.timeinadvance' ),
                        "-en": "timeinadvance",
                        "-de": "timeinadvance"
                    },
                    "wantsAlert": {
                        "type": "Boolean",
                        i18n: i18n( 'patientalert-schema.Schedule_T.wantsAlert' ),
                        "-en": "wantsAlert",
                        "-de": "wantsAlert"
                    }
                },
                PatientAlertInput_T: {
                    waitno: {
                        'type': 'String', 'required': true, validate: 'PatientAlert_T_waitno',
                        i18n: i18n( 'patientalert-schema.PatientAlertInput_T.waitno' ),
                        "-en": "waitno",
                        "-de": "waitno"
                    },
                    praxid: {
                        'type': 'String', required: true, validate: 'PatientAlert_T_praxid',
                        i18n: i18n( 'patientalert-schema.PatientAlertInput_T.praxid' ),
                        "-en": "praxid",
                        "-de": "praxid"
                    }
                }
            };

        types.root = types.PatientAlert_T;

        Y.log( 'Loading Schema ' + NAME, 'debug', NAME );
        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * Class REST Schemas
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            // Given the following parameters, the DB Layer set up
            // the schema with default methods (get, put, post, delete, count)
            // and populates these with standard code.

            /* MANDATORY */
            name: NAME,

            /* MANDATORY */
            types: types

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {requires: ['dcschemaloader']}
);
