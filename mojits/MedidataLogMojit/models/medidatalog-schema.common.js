/*global YUI*/
YUI.add( 'medidatalog-schema', function( Y, NAME ) {

        'use strict';

        var
            // ------- Schema definitions  -------
            types = {},
            i18n = Y.doccirrus.i18n;

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        types = Y.mix( types, {
                'root': {
                    base: {
                        complex: 'ext',
                        type: 'MedidataLog_T',
                        lib: types
                    }
                },
                'MedidataLog_T': {
                    'type': {
                        complex: 'eq',
                        "type": "Types_E",
                        lib: types
                    },
                    "status": {
                        complex: 'eq',
                        "type": "Status_E",
                        lib: types
                    },
                    "created": {
                        'required': true,
                        'type': 'Date',
                        default: Date.now,
                        '-en': i18n( 'InpacsLogMojit.tabInpacsLogOverview.created' ),
                        '-de': i18n( 'InpacsLogMojit.tabInpacsLogOverview.created' ),
                        i18n: i18n( 'InpacsLogMojit.tabInpacsLogOverview.created' )
                    },
                    'documentReference': {
                        "type": "String",
                        i18n: i18n( 'medidatalog-schema.MedidataLog_T.documentReference' ),
                        "-en": "Document reference",
                        "-de": "Dokumentreferenz"
                    },
                    'correlationReference': {
                        "type": "String",
                        i18n: i18n( 'medidatalog-schema.MedidataLog_T.correlationReference' ),
                        "-en": "Case reference",
                        "-de": "Fallreferenz"
                    },
                    'transmissionReference': {
                        "type": "String",
                        i18n: i18n( 'medidatalog-schema.MedidataLog_T.transmissionReference' ),
                        "-en": "Transmission reference",
                        "-de": "Übermittlungsreferenz"
                    },
                    'patientName': {
                        "type": "String",
                        i18n: i18n( 'medidatalog-schema.MedidataLog_T.patientName.i18n' ),
                        "-en": "Patient",
                        "-de": "Patient"
                    },
                    "invoiceNo": {
                        type: 'String',
                        i18n: i18n( 'activity-schema.Invoice_T.invoiceNo' )
                    },
                    "sender": {
                        "type": "String",
                        i18n: i18n( 'medidatalog-schema.MedidataLog_T.sender' ),
                        "-en": "sender",
                        "-de": "sender"
                    },
                    "receiver": {
                        "type": "String",
                        i18n: i18n( 'medidatalog-schema.MedidataLog_T.receiver' ),
                        "-en": "receiver",
                        "-de": "receiver"
                    },
                    "confirmed": {
                        "type": "Boolean",
                        i18n: i18n( 'medidatalog-schema.MedidataLog_T.confirmed' ),
                        "-en": "Confirmed",
                        "-de": "Bestätigt"
                    },
                    "documentId": {
                        "type": "String",
                        i18n: i18n( 'medidatalog-schema.MedidataLog_T.billingRun' ),
                        "-en": "Document ID",
                        "-de": "Dokument ID"
                    },
                    "billingRun": {
                        "type": "Number",
                        i18n: i18n( 'medidatalog-schema.MedidataLog_T.billingRun' ),
                        "-en": "Billing run",
                        "-de": "Rechnungslauf"
                    },
                    "subject": {
                        "type": "String",
                        i18n: i18n( 'medidatalog-schema.MedidataLog_T.subject' ),
                        "-en": "Subject",
                        "-de": "Subjekt"
                    },
                    "notificationType": {
                        complex: 'eq',
                        "type": "NotificationTypes_E",
                        lib: types
                    },
                    "description": {
                        "type": "String",
                        i18n: i18n( 'medidatalog-schema.MedidataLog_T.description' ),
                        "-en": "Description",
                        "-de": "Nachricht"
                    },
                    "notificationId": {
                        "type": "String",
                        i18n: i18n( 'medidatalog-schema.MedidataLog_T.notificationId' ),
                        "-en": "Notification ID",
                        "-de": "Benachrichtigung ID"
                    },
                    "technicalInfo": {
                        "type": "String",
                        i18n: i18n( 'medidatalog-schema.MedidataLog_T.technicalInfo' ),
                        "-en": "Technical info",
                        "-de": "Technische info"
                    },
                    "errorCode": {
                        "type": "String"
                    },
                    "senderGln": {
                        "type": "String"
                    }
                },
                "Types_E": {
                    "type": "String",
                    i18n: i18n( 'medidatalog-schema.MedidataLog_T.type' ),
                    "-en": "Type",
                    "-de": "Typ",
                    "required": true,
                    "list": [
                        {
                            "val": "RECEIVED",
                            i18n: i18n( 'medidatalog-schema.Types_E.RECEIVED.i18n' ),
                            "-en": "Received",
                            "-de": "Empfang"
                        },
                        {
                            "val": "SENT",
                            i18n: i18n( 'medidatalog-schema.Types_E.SENT.i18n' ),
                            "-en": "Sent",
                            "-de": "Versendet"
                        },
                        {
                            "val": "NOTIFICATION",
                            i18n: i18n( 'medidatalog-schema.Types_E.NOTIFICATION.i18n' ),
                            "-en": "Notification",
                            "-de": "Benachrichtigung"
                        }
                    ]
                },
                "NotificationTypes_E": {
                    "type": "String",
                    i18n: i18n( 'medidatalog-schema.MedidataLog_T.notificationType' ),
                    "-en": "Type",
                    "-de": "Typ",
                    "list": [
                        {
                            "val": "INFO",
                            i18n: i18n( 'medidatalog-schema.NotificationTypes_E.INFO.i18n' ),
                            "-en": "Info",
                            "-de": "Info"
                        },
                        {
                            "val": "CLIENT_ERROR",
                            i18n: i18n( 'medidatalog-schema.NotificationTypes_E.CLIENT_ERROR.i18n' ),
                            "-en": "Client Error",
                            "-de": "Client Error"
                        },
                        {
                            "val": "ERROR",
                            i18n: i18n( 'medidatalog-schema.NotificationTypes_E.CLIENT_ERROR.i18n' ),
                            "-en": "Client Error",
                            "-de": "Client Error"
                        }
                    ]
                },
                "Status_E": {
                    "type": "String",
                    i18n: i18n( 'medidatalog-schema.MedidataLog_T.status' ),
                    "-en": "Type",
                    "-de": "Typ",
                    "list": [
                        {
                            "val": "PROCESSING",
                            i18n: i18n( 'medidatalog-schema.Status_E.PROCESSING.i18n' ),
                            "-en": "Processing",
                            "-de": "In Bearbeitung"
                        },
                        {
                            "val": "DONE",
                            i18n: i18n( 'medidatalog-schema.Status_E.DONE.i18n' ),
                            "-en": "Done",
                            "-de": "Erledigt"
                        },
                        {
                            "val": "ERROR",
                            i18n: i18n( 'medidatalog-schema.Status_E.REJECTED.i18n' ),
                            "-en": "Rejected",
                            "-de": "Abgelehnt"
                        },
                        {
                            "val": "UNCONFIRMED",
                            i18n: i18n( 'medidatalog-schema.Status_E.UNCONFIRMED.i18n' ),
                            "-en": "Unconfirmed",
                            "-de": "Unbestätigt"
                        },
                        {
                            "val": "CONFIRMED",
                            i18n: i18n( 'medidatalog-schema.Status_E.CONFIRMED.i18n' ),
                            "-en": "Confirmed",
                            "-de": "Bestätigt"
                        },
                        {
                            "val": "PENDING",
                            i18n: i18n( 'medidatalog-schema.DocumentStatus_E.READY_TO_UPLOAD.i18n' ),
                            "-en": "Ready to download",
                            "-de": "Bereit zum herunterladen"
                        },
                        {
                            "val": "UPLOAD_ERROR",
                            i18n: i18n( 'medidatalog-schema.DocumentStatus_E.UPLOAD_ERROR.i18n' ),
                            "-en": "Upload error",
                            "-de": "Fehler beim Hochladen"
                        },
                        {
                            "val": "UPLOADED",
                            i18n: i18n( 'medidatalog-schema.DocumentStatus_E.UPLOADED.i18n' ),
                            "-en": "Uploaded",
                            "-de": "Hochgeladen"
                        }
                    ]
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