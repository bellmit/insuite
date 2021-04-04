/**
 * User: dcdev
 * Date: 10/31/18  8:09 AM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'supportrequest-schema', function( Y, NAME ) {

        /**
         * @module Support
         * @submodule models
         * @namespace doccirrus.schemas
         * @class SupportRequest_T
         */

        'use strict';

        var
            types = {},
            statuses = Object.freeze( {
                ACTIVE: 'ACTIVE',
                ACCEPTED: 'ACCEPTED',
                EXPIRED: 'EXPIRED'
            } ),
            i18n = Y.doccirrus.i18n;

        /**
         * Schema definitions
         * @property types
         * @type {YUI}
         */
        types = Y.mix( types, {
                root: {
                    "base": {
                        "complex": "ext",
                        "type": "SupportRequest_T",
                        "lib": types
                    }
                },
                SupportRequest_T: {
                    timestamp: {
                        type: "Date",
                        "apiv": {v: 2, queryParam: true},
                        i18n: i18n( 'SupportMojit.supportrequest-schema.SupportRequest_T.timestamp' ),
                        required: true,
                        "-en": "Date/Time",
                        "-de": "Datum/Zeit"
                    },
                    coname: {
                        type: "String",
                        required: true,
                        i18n: i18n( 'SupportMojit.supportrequest-schema.SupportRequest_T.coname' ),
                        "apiv": {v: 2, queryParam: false},
                        "-en": "coname",
                        "-de": "coname"
                    },
                    sendingEmployeeName: {
                        type: "String",
                        required: true,
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'SupportMojit.supportrequest-schema.SupportRequest_T.sendingEmployeeName' ),
                        '-en': 'sendingEmployeeName',
                        '-de': 'sendingEmployeeName'
                    },
                    receivingEmployeeName: {
                        type: 'String',
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'SupportMojit.supportrequest-schema.SupportRequest_T.receivingEmployeeName' ),
                        '-en': 'receivingEmployeeName',
                        '-de': 'receivingEmployeeName'
                    },
                    receivingEmployeeId: {
                        type: 'String',
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'SupportMojit.supportrequest-schema.SupportRequest_T.receivingEmployeeId' ),
                        '-en': 'receivingEmployeeId',
                        '-de': 'receivingEmployeeId'
                    },
                    timeReceived: {
                        type: "Date",
                        "apiv": {v: 2, queryParam: true},
                        i18n: i18n( 'SupportMojit.supportrequest-schema.SupportRequest_T.timeReceived' ),
                        "-en": "Date",
                        "-de": "Datum"
                    },
                    supportDuration: {
                        complex: "eq",
                        required: true,
                        type: "SupportDuration_E",
                        lib: types,
                        i18n: i18n( 'SupportMojit.supportrequest-schema.SupportRequest_T.supportDuration' ),
                        "-en": "Support duration",
                        "-de": "Support-Dauer"
                    },
                    status: {
                        required: true,
                        complex: "eq",
                        type: "Status_E",
                        lib: types,
                        i18n: i18n( 'SupportMojit.supportrequest-schema.SupportRequest_T.status' )
                    },
                    loginLink: {
                        type: "String",
                        i18n: i18n( 'SupportMojit.supportrequest-schema.SupportRequest_T.loginLink' ),
                        "-en": "loginLink",
                        "-de": "loginLink"
                    },
                    loginToken: {
                        type: "String",
                        i18n: i18n( 'SupportMojit.supportrequest-schema.SupportRequest_T.loginToken' ),
                        "-en": "loginToken",
                        "-de": "loginToken"
                    },
                    isPartnerRequest: {
                        type: "Boolean",
                        i18n: i18n( 'SupportMojit.supportrequest-schema.SupportRequest_T.isPartnerRequest' ),
                        "-en": "isPartnerRequest",
                        "-de": "isPartnerRequest"
                    }
                },
                Status_E: {
                    type: "String",
                    list: [
                        {
                            val: "ACTIVE",
                            i18n: i18n( 'SupportMojit.supportrequest-schema.Status_E.ACTIVE' )
                        },
                        {
                            val: "ACCEPTED",
                            i18n: i18n( 'SupportMojit.supportrequest-schema.Status_E.ACCEPTED' )
                        },
                        {
                            val: "EXPIRED",
                            i18n: i18n( 'SupportMojit.supportrequest-schema.Status_E.EXPIRED' )
                        }
                    ]
                },
                SupportDuration_E: {
                    "type": "Number",
                    "apiv": {v: 2, queryParam: false},
                    "default": 4,
                    "-en": "supportDuration",
                    "-de": "supportDuration",
                    "list": [
                        {
                            "val": 4,
                            i18n: i18n( 'SupportMojit.supportrequest-schema.SupportDuration_E.4' ),
                            "-de": "4 Stunden",
                            "-en": "4 hrs"
                        },
                        {
                            "val": 6,
                            i18n: i18n( 'SupportMojit.supportrequest-schema.SupportDuration_E.6' ),
                            "-de": "6 Stunden",
                            "-en": "6 hrs"
                        },
                        {
                            "val": 8,
                            i18n: i18n( 'SupportMojit.supportrequest-schema.SupportDuration_E.8' ),
                            "-de": "8 Stunden",
                            "-en": "8 hrs"
                        },
                        {
                            "val": 10,
                            i18n: i18n( 'SupportMojit.supportrequest-schema.SupportDuration_E.10' ),
                            "-de": "10 Stunden",
                            "-en": "10 hrs"
                        },
                        {
                            "val": 12,
                            i18n: i18n( 'SupportMojit.supportrequest-schema.SupportDuration_E.12' ),
                            "-de": "12 Stunden",
                            "-en": "12 hrs"
                        },
                        {
                            "val": 24,
                            i18n: i18n( 'SupportMojit.supportrequest-schema.SupportDuration_E.24' ),
                            "-de": "1 Tag",
                            "-en": "1 day"
                        },
                        {
                            "val": 48,
                            i18n: i18n( 'SupportMojit.supportrequest-schema.SupportDuration_E.48' ),
                            "-de": "2 Tage",
                            "-en": "2 days"
                        },
                        {
                            "val": 72,
                            i18n: i18n( 'SupportMojit.supportrequest-schema.SupportDuration_E.72' ),
                            "-de": "3 Tage",
                            "-en": "3 days"
                        },
                        {
                            "val": 168,
                            i18n: i18n( 'SupportMojit.supportrequest-schema.SupportDuration_E.168' ),
                            "-de": "1 Woche",
                            "-en": "1 week"
                        }
                    ]
                }
            }
        );
        Y.log( 'Loading Schema ' + NAME, 'debug', NAME );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * Class REST Schemas
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            /* MANDATORY */
            name: NAME,

            /* MANDATORY */
            types: types,
            statuses: statuses
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {requires: ['dcschemaloader']}
);
