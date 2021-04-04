/**
 * User: do
 * Date: 28/04/17  09:28
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'crlog-schema', function( Y, NAME ) {

        /**
         * @module Cardreader
         * @submodule models
         * @namespace doccirrus.schemas
         * @class CRLog_T
         */

        'use strict';

        var
            // ------- private 'constants'  -------
            types = {},
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
                        "type": "CRLog_T",
                        "lib": types
                    }
                },
                CRLog_T: {
                    status: {
                        required: true,
                        complex: "eq",
                        type: "Status_E",
                        lib: types,
                        i18n: i18n( 'crlog.CRLog_T.status.i18n' )
                    },
                    validationStatus: {
                        required: true,
                        complex: "eq",
                        type: "ValidationStatus_E",
                        lib: types,
                        i18n: i18n( 'crlog.CRLog_T.validationStatus.i18n' )
                    },
                    eventStatus: {
                        required: true,
                        complex: "eq",
                        type: "EventStatus_E",
                        lib: types,
                        i18n: i18n( 'crlog.CRLog_T.eventStatus.i18n' )
                    },
                    initiatorId: {
                        required: true,
                        type: 'String',
                        i18n: i18n( 'InvoiceMojit.crlog-schema.CRLog_T.initiatorId.i18n' )
                    },
                    initiator: {
                        required: true,
                        type: 'String',
                        i18n: i18n( 'InvoiceMojit.crlog-schema.CRLog_T.initiator.i18n' )
                    },
                    initiatedAt: {
                        required: true,
                        type: 'Date',
                        i18n: i18n( 'InvoiceMojit.crlog-schema.CRLog_T.initiatedAt.i18n' )
                    },
                    parsedPatient: {
                        type: "any",
                        i18n: i18n( 'InvoiceMojit.crlog-schema.CRLog_T.parsedPatient.i18n' )
                    },
                    cardSwipe: {
                        type: "Date",
                        i18n: i18n( 'InvoiceMojit.crlog-schema.CRLog_T.cardSwipe.i18n' )
                    },
                    matchedPatientId: {
                        type: "String",
                        i18n: i18n( 'InvoiceMojit.crlog-schema.CRLog_T.matchedPatientId.i18n' )
                    },
                    askForCreationOfAdditionalInsurancesAfterCardread: {
                        type: "Boolean",
                        i18n: i18n( 'InvoiceMojit.crlog-schema.CRLog_T.askForCreationOfAdditionalInsurancesAfterCardread.i18n' )
                    },
                    copyPublicInsuranceDataToAdditionalInsurance: {
                        type: "Boolean",
                        i18n: i18n( 'InvoiceMojit.crlog-schema.CRLog_T.copyPublicInsuranceDataToAdditionalInsurance.i18n' )
                    },
                    matchedPatients: {
                        type: 'any',
                        i18n: i18n( 'InvoiceMojit.crlog-schema.CRLog_T.matchedPatients.i18n' )
                    },
                    mergedPatient: {
                        type: "any",
                        i18n: i18n( 'InvoiceMojit.crlog-schema.CRLog_T.mergedPatient.i18n' )
                    },
                    diff: {
                        type: "any",
                        i18n: i18n( 'InvoiceMojit.crlog-schema.CRLog_T.diff.i18n' )
                    },
                    rawData: {
                        type: "any",
                        required: true,
                        i18n: i18n( 'InvoiceMojit.crlog-schema.CRLog_T.rawData.i18n' )
                    },
                    feedback: {
                        complex: "inc",
                        type: "Feedback_T",
                        lib: types,
                        i18n: i18n( 'InvoiceMojit.crlog-schema.CRLog_T.feedback.i18n' )
                    },
                    deviceName: {
                        type: "String",
                        i18n: i18n( 'InvoiceMojit.crlog-schema.CRLog_T.deviceName.i18n' )
                    }
                },
                Status_E: {
                    type: "String",
                    list: [
                        {
                            val: "READ",
                            i18n: i18n( 'InvoiceMojit.crlog-schema.Status_E.READ' )
                        },
                        {
                            val: "PARSED",
                            i18n: i18n( 'InvoiceMojit.crlog-schema.Status_E.PARSED' )
                        },
                        {
                            val: "MATCHING",
                            i18n: i18n( 'InvoiceMojit.crlog-schema.Status_E.MATCHING' )
                        },
                        {
                            val: "MATCHED",
                            i18n: i18n( 'InvoiceMojit.crlog-schema.Status_E.MATCHED' )
                        },
                        {
                            val: "MERGED",
                            i18n: i18n( 'InvoiceMojit.crlog-schema.Status_E.MERGED' )
                        },
                        {
                            val: "APPLIED",
                            i18n: i18n( 'InvoiceMojit.crlog-schema.Status_E.APPLIED' )
                        },
                        {
                            val: "CANCELLED",
                            i18n: i18n( 'InvoiceMojit.crlog-schema.Status_E.CANCELLED' )
                        }
                    ]
                },
                FeedbackLevel_E: {
                    type: "String",
                    list: [
                        {
                            val: "INFO",
                            i18n: i18n( 'InvoiceMojit.crlog-schema.FeedbackLevel_E.INFO' )
                        },
                        {
                            val: "WARNING",
                            i18n: i18n( 'InvoiceMojit.crlog-schema.FeedbackLevel_E.WARNING' )
                        },
                        {
                            val: "ERROR",
                            i18n: i18n( 'InvoiceMojit.crlog-schema.FeedbackLevel_E.ERROR' )
                        }
                    ]
                },
                ValidationStatus_E: {
                    type: "String",
                    list: [
                        {
                            val: "NONE",
                            i18n: i18n( 'InvoiceMojit.crlog-schema.ValidationStatus_E.NONE' )
                        },
                        {
                            val: "OK",
                            i18n: i18n( 'InvoiceMojit.crlog-schema.ValidationStatus_E.OK' )
                        },
                        {
                            val: "ONLY_ALLOW_REPLACEMENT_WITHOUT_INSURANCE",
                            i18n: i18n( 'InvoiceMojit.crlog-schema.ValidationStatus_E.ONLY_ALLOW_REPLACEMENT_WITHOUT_INSURANCE' )
                        },
                        {
                            val: "ONLY_ALLOW_REPLACEMENT_WITHOUT_CARDSWIPE",
                            i18n: i18n( 'InvoiceMojit.crlog-schema.ValidationStatus_E.ONLY_ALLOW_REPLACEMENT_WITHOUT_CARDSWIPE' )
                        },
                        {
                            val: "ONLY_ALLOW_COPYING_DATA",
                            i18n: i18n( 'InvoiceMojit.crlog-schema.ValidationStatus_E.ONLY_ALLOW_COPYING_DATA' )
                        },
                        {
                            val: "INVALID_CARD",
                            i18n: i18n( 'InvoiceMojit.crlog-schema.ValidationStatus_E.INVALID_CARD' )
                        }
                    ]
                },
                EventStatus_E: {
                    type: "String",
                    list: [
                        {
                            val: "NONE",
                            i18n: i18n( 'InvoiceMojit.crlog-schema.EventStatus_E.NONE' )
                        },
                        {
                            val: "NEEDS_EVENT",
                            i18n: i18n( 'InvoiceMojit.crlog-schema.EventStatus_E.NEEDS_EVENT' )
                        },
                        {
                            val: "UPDATED_EVENT_ARRIVED",
                            i18n: i18n( 'InvoiceMojit.crlog-schema.EventStatus_E.UPDATED_EVENT_ARRIVED' )
                        }
                    ]
                },
                Feedback_T: {
                    code: {
                        type: 'String',
                        i18n: i18n( 'crlog.Feedback_T.code.i18n' )
                    },
                    message: {
                        type: 'String',
                        i18n: i18n( 'crlog.Feedback_T.message.i18n' )
                    },
                    level: {
                        complex: "eq",
                        type: "FeedbackLevel_E",
                        lib: types,
                        i18n: i18n( 'crlog.Feedback_T.level.i18n' )
                    }
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
            types: types
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {requires: ['dcschemaloader']}
);
