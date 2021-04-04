/**
 * User: rrrw
 * Date: 16/11/2012  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'callaudit-schema', function( Y, NAME ) {

        var
        // ------- private 'constants'  -------

        // ------- Schema definitions  -------
        //            i18n = Y.doccirrus.i18n,
            types = {};

        types = Y.mix( types, {
            "root": {
                "titleFields": {
                    "complex": "ext",
                    "type": "OnlineUserData_T",
                    "lib": "partnerreg"
                },
                "employeeId": {
                    "type": "string",
                    "-en": "employeeId",
                    "-de": "employeeId"
                },
                "callTime": {
                    "type": "Date",
                    "-en": "callTime",
                    "-de": "callTime"
                },
                "callId": {
                    "type": "string",
                    "-en": "callId",
                    "-de": "callId"
                },
                "reason": {
                    "type": "string",
                    "-en": "reason",
                    "-de": "reason"
                },
                "consultNote": {
                    "type": "string",
                    "-en": "reason",
                    "-de": "reason"
                },
                "caller": {
                    "complex": "inc",
                    "type": "Participant_T",
                    "lib": types,
                    "-en": "caller",
                    "-de": "caller"
                },
                "callee": {
                    "complex": "inc",
                    "type": "Participant_T",
                    "lib": types,
                    "-en": "callee",
                    "-de": "callee"
                },
                "picked": {
                    "type": "boolean",
                    "-en": "picked",
                    "-de": "picked"
                },
                "cancelled": {
                    "type": "boolean",
                    "-en": "cancelled",
                    "-de": "cancelled"
                },
                "joinedAt": {
                    "type": "Date",
                    "-en": "joinedAt",
                    "-de": "joinedAt"
                },
                "lastJoin": {
                    "type": "Date",
                    "-en": "joinedAt",
                    "-de": "joinedAt"
                },
                "leftAt": {
                    "type": "Date",
                    "-en": "leftAt",
                    "-de": "leftAt"
                },
                "duration": {
                    "type": "number",
                    "-en": "duration",
                    "-de": "duration"
                },
                "isTeleconsult": {
                    "type": "boolean",
                    "-en": "isTeleconsult",
                    "-de": "isTeleconsult"

                },
                "status": {
                    "type": "string",
                    "-en": "status",
                    "-de": "status"
                }
            },
            "Participant_T": {
                "personalFields": {
                    "complex": "ext",
                    "type": "OnlineUserData_T",
                    "lib": "partnerreg"
                },
                "host": {
                    "type": "string",
                    "-en": "host",
                    "-de": "host"
                },
                "prcId": {
                    "type": "string",
                    "-en": "prcId",
                    "-de": "prcId"
                },
                "rejected": {
                    "type": "boolean",
                    "-en": "rejected",
                    "-de": "rejected"
                },
                "picked": {
                    "type": "boolean",
                    "-en": "picked",
                    "-de": "picked"
                }
            }
        } );

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
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'partnerreg-schema',
            'doccirrus',
            'mojito'
        ]
    }
);
