/*global YUI*/
YUI.add( 'banklog-schema', function( Y, NAME ) {

        'use strict';

        var
            // ------- Schema definitions  -------
            types = {},
            i18n = Y.doccirrus.i18n;

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        types = Y.mix( types, {
                'root': {
                    abstractBase: {
                        complex: 'ext',
                        type: 'AbstractLog_T',
                        lib: 'inpacslog'
                    },
                    base: {
                        complex: 'ext',
                        type: 'BankLog_T',
                        lib: types
                    }
                },
                'BankLog_T': {
                    'Amount': {
                        "type": "String",
                        i18n: i18n( 'banklog-schema.BankLog_T.amount.i18n' ),
                        "-en": "Amount",
                        "-de": "Betrag"
                    },
                    'ESR participant number': {
                        "type": "String",
                        i18n: i18n( 'banklog-schema.BankLog_T.ESRParticipantNumber.i18n' ),
                        "-en": "ESR participant number",
                        "-de": "ESR-Teilnehmer Nummer"
                    },
                    'Reference number': {
                        "type": "String",
                        i18n: i18n( 'banklog-schema.BankLog_T.referenceNumber.i18n' ),
                        "-en": "Reference number",
                        "-de": "Referenznummer"
                    },
                    'Transaction type': {
                        "type": "String",
                        i18n: i18n( 'banklog-schema.BankLog_T.transactionType.i18n' ),
                        "-en": "Transaction type",
                        "-de": "Transaktionsart"
                    },
                    'Payment date': {
                        "type": "Date",
                        i18n: i18n( 'banklog-schema.BankLog_T.paymentDate.i18n' ),
                        "-en": "Payment date",
                        "-de": "Aufgabedatum"
                    },
                    'Credit date': {
                        "type": "Date",
                        i18n: i18n( 'banklog-schema.BankLog_T.creditDate.i18n' ),
                        "-en": "Credit date",
                        "-de": "Gutschrifsdatum"
                    },
                    'MediaObj': {
                        "type": ["any"],
                        i18n: i18n( 'banklog-schema.BankLog_T.mediaObj.i18n' ),
                        "-en": "MediaObj",
                        "-de": "MediaObj"
                    },
                    'patientName': {
                        "type": "String",
                        i18n: i18n( 'banklog-schema.BankLog_T.patientName.i18n' ),
                        "-en": "Patient",
                        "-de": "Patient"
                    },
                    caseFolderId: {
                        type: 'String',
                        i18n: i18n( 'banklog-schema.BankLog_T.caseFolderId.i18n' ),
                        '-en': 'caseFolderId',
                        '-de': 'caseFolderId'
                    },
                    fileHash: {
                        required: true,
                        type: 'String',
                        i18n: i18n( 'lablog-schema.Lablog_T.fileHash' )
                    },
                    invoiceNo: {
                        required: true,
                        type: 'String',
                        i18n: i18n( 'banklog-schema.BankLog_T.invoiceNo' )
                    }
                }
            }
        );

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
    '0.0.1', {requires: ['dcvalidations', 'dcschemaloader', 'activity-schema', 'employee-schema', 'inpacslog-schema']}
);