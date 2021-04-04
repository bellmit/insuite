/**
 * User: rrrw
 * Date: 16/11/2012  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'patientreg-schema', function( Y, NAME ) {

        /**
         *
         * meta information about all PRC initiated patient registrations in the DC cloud.
         *
         * Contains the Practice-Patient info ;like access allowed to PRC.
         *
         */


        var
        // ------- private 'constants'  -------

        // ------- Schema definitions  -------
            i18n = Y.doccirrus.i18n,
            types = {
                "root": {
                    "patientId": {
                        "type": "string",
                        i18n: i18n( 'patientreg-schema.root.patientId' ),
                        "-en": "patientId",
                        "-de": "patientId"
                    },
                    "noPRC": {
                        "type": "boolean",
                        i18n: i18n( 'patientreg-schema.root.noPRC' ),
                        "-en": "noPRC",
                        "-de": "noPRC"
                    },
                    "customerIdPrac": {
                        "type": "string",
                        "ref": "metaprac",
                        "refType": "string",
                        i18n: i18n( 'patientreg-schema.root.customerIdPrac' ),
                        "-en": "customerIdPrac",
                        "-de": "customerIdPrac"
                    },
                    "customerIdPat": {
                        "type": "string",
                        i18n: i18n( 'patientreg-schema.root.customerIdPat' ),
                        "-en": "customerIdPat",
                        "-de": "customerIdPat"
                    },
                    "identityId": {
                        "type": "string",
                        i18n: i18n( 'patientreg-schema.root.identityId' ),
                        "-en": "identityId",
                        "-de": "identityId"
                    },
                    "optIn": {
                        "type": "string",
                        i18n: i18n( 'patientreg-schema.root.optIn' ),
                        "-en": "optIn",
                        "-de": "optIn"
                    },
                    "confirmed": {
                        "type": "boolean",
                        i18n: i18n( 'patientreg-schema.root.confirmed' ),
                        "-en": "confirmed",
                        "-de": "confirmed"
                    },
                    "createPlanned": {
                        "type": "boolean",
                        i18n: i18n( 'patientreg-schema.root.createPlanned' ),
                        "-en": "createPlanned",
                        "-de": "createPlanned"
                    },
                    "accessPRC": {
                        "type": "boolean",
                        i18n: i18n( 'patientreg-schema.root.accessPRC' ),
                        "-en": "accessPRC",
                        "-de": "accessPRC"
                    },
                    "ppToken": {
                        "type": "string",
                        "-en": "ppToken",
                        "-de": "ppToken"
                    },
                    "prcKey": {
                        "type": "string",
                        "-en": "prcKey",
                        "-de": "prcKey"
                    },
                    "tags": {
                        "type": [String],
                        i18n: i18n( 'patientreg-schema.root.tags' ),
                        "-en": "tags",
                        "-de": "Schlüsselwörter"
                    },
                    "transfer": {
                        "eTAN": {
                            "type": "String",
                            i18n: i18n( 'patientreg-schema.transfer.eTAN' ),
                            "-en": "ETAN",
                            "-de": "ETAN"
                        },
                        "source": {
                            "type": "String",
                            i18n: i18n( 'patientreg-schema.transfer.source' ),
                            "-en": "Source Practice",
                            "-de": "Quelle Praxis"
                        },
                        "target": {
                            "type": "String",
                            i18n: i18n( 'patientreg-schema.transfer.target' ),
                            "-en": "Target Practice",
                            "-de": "Ziel Praxis"
                        },
                        "date": {
                            "type": "String",
                            i18n: i18n( 'patientreg-schema.transfer.date' ),
                            "-en": "Request Date",
                            "-de": "Datum Anfrage"
                        }
                    },

                    // temporary fields, should be nulled after opt-in (only private data) TODO: MOJ-415
                    "pw": {
                        "type": "String",
                        i18n: i18n( 'patientreg-schema.pw' ),
                        "-en": "pw",
                        "-de": "pw"
                    },
                    "dob": {
                        "type": "String",
                        i18n: i18n( 'patientreg-schema.dob' ),
                        "-en": "dob",
                        "-de": "dob"
                    },
                    "email": {
                        "type": "String",
                        i18n: i18n( 'patientreg-schema.email' ),
                        "-en": "email",
                        "-de": "email"
                    },
                    "firstname": {
                        "type": "String",
                        i18n: i18n( 'patientreg-schema.firstname' ),
                        "-en": "First Name",
                        "-de": "firstname"
                    },
                    "lastname": {
                        "type": "String",
                        i18n: i18n( 'patientreg-schema.lastname' ),
                        "-en": "lastname",
                        "-de": "lastname"
                    },
                    "talk": {
                        "type": "String",
                        i18n: i18n( 'patientreg-schema.talk' ),
                        "-en": "talk",
                        "-de": "talk"
                    },
                    "phone": {
                        "type": "String",
                        i18n: i18n( 'patientreg-schema.phone' ),
                        "-en": "phone",
                        "-de": "phone"
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

            indexes: [
                {
                    "key": {
                        "patientId": 1
                    }
                },
                {
                    "key": {
                        "identityId": 1
                    }
                }],

            name: NAME

            //
            //
            /*   Custom Functions     */

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'doccirrus',
            'mojito'
        ]
    }
);
