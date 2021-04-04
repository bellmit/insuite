/**
 * User: do
 * Date: 03/08/17  18:31
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'kvcmessage-schema', function( Y, NAME ) {
        /**
         * The kvcmessage entry schema,
         *
         * @module kvcmessage-schema,
         */

        const
            FEEDBACK_ATTACHMENT_FILENAME = 'begleitdatei.xml',

            i18n = Y.doccirrus.i18n,
            oneClickServiceName = '1ClickAbrechnung',
            oneClickServiceType = '1CLICK_INVOICE',
            oneClickServiceIdMessageTypeMap = {
                'Eingangsbestaetigung': 'MDN',
                'Rueckmeldung': 'FEEDBACK',
                'Pruefprotokoll': 'INSPECTION_PROTOCOL'
            },
            ldtFindingServiceName = 'LDT-Befund',
            ldtFindingServiceType = 'LDT_FINDING',
            ldtFindingServiceIdMessageTypeMap = {
                // TODO: check if needed:
                'Eingangsbestaetigung': 'MDN',

                'Lieferung': 'DELIVERY',
                'Status': 'STATUS',
                'Pruefprotokoll': 'INSPECTION_PROTOCOL'
            },
            eTSServiceName = 'eTS',
            eTSServiceType = 'ETS',
            eTSServiceIdMessageTypeMap = {
                'Fehlernachricht': 'ETS_ARRANGEMENT_CODE_ERROR_MESSAGE',
                'Vermittlungscode-Anforderung-Muster06': 'ETS_ARRANGEMENT_CODE_REQUEST',
                'Vermittlungscode-Lieferung-Muster06': 'ETS_ARRANGEMENT_CODE_DELIVERY',
                'Vermittlungscode-Anforderung-PTV11': 'ETS_ARRANGEMENT_CODE_REQUEST',
                'Vermittlungscode-Lieferung-PTV11': 'ETS_ARRANGEMENT_CODE_DELIVERY'
            };
        let types = {};

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "KVCMessage_T",
                        "lib": types
                    }
                },
                KVCMessage_T: {
                    // message fields
                    from: {
                        "type": "String",
                        i18n: i18n( 'kvcmessage-schema.KVCMessage_T.from.i18n' ),
                        "-en": "Absender",
                        "-de": "Absender"
                    },
                    to: {
                        "type": "String",
                        i18n: i18n( 'kvcmessage-schema.KVCMessage_T.to.i18n' ),
                        "-en": "Empfänger",
                        "-de": "Empfänger"
                    },
                    subject: {
                        "type": "String",
                        i18n: i18n( 'kvcmessage-schema.KVCMessage_T.subject.i18n' ),
                        "-en": "Subject",
                        "-de": "Betreff"
                    },
                    kvcServiceId: {
                        "type": "String",
                        i18n: i18n( 'kvcmessage-schema.KVCMessage_T.kvcServiceId.i18n' ),
                        "-en": "Service ID",
                        "-de": "Dienstkennung"
                    },
                    kvcServiceType: {
                        "default": "1CLICK_INVOICE",
                        "complex": "eq",
                        i18n: i18n( 'kvcmessage-schema.KVCMessage_T.kvcServiceType.i18n' ),
                        "type": "KVCServiceType_E",
                        "lib": types

                    },
                    contentType: {
                        "type": "String",
                        i18n: i18n( 'kvcmessage-schema.KVCMessage_T.contentType.i18n' ),
                        "-en": "Content Type",
                        "-de": "Inhaltstyp"
                    },
                    kvcTransmitterSystem: {
                        "type": "String",
                        i18n: i18n( 'kvcmessage-schema.KVCMessage_T.kvcTransmitterSystem.i18n' ),
                        "-en": "Transmitter System",
                        "-de": "Sendersystem"
                    },
                    messageId: {
                        "type": "String",
                        i18n: i18n( 'kvcmessage-schema.KVCMessage_T.messageId.i18n' ),
                        "-en": "messageId",
                        "-de": "messageId"
                    },
                    originalMessageId: {
                        "type": "String",
                        i18n: i18n( 'kvcmessage-schema.KVCMessage_T.originalMessageId.i18n' ),
                        "-en": "originalMessageId",
                        "-de": "originalMessageId"
                    },
                    dispositionNotificationTo: {
                        "type": "String",
                        i18n: i18n( 'kvcmessage-schema.KVCMessage_T.dispositionNotificationTo.i18n' ),
                        "-en": "dispositionNotificationTo",
                        "-de": "dispositionNotificationTo"
                    },
                    returnPath: {
                        "type": "String",
                        i18n: i18n( 'kvcmessage-schema.KVCMessage_T.returnPath.i18n' ),
                        "-en": "returnPath",
                        "-de": "returnPath"
                    },
                    text: {
                        "type": "String",
                        i18n: i18n( 'kvcmessage-schema.KVCMessage_T.text.i18n' ),
                        "-en": "text",
                        "-de": "text"
                    },
                    sentAt: {
                        "type": "Date",
                        i18n: i18n( 'kvcmessage-schema.KVCMessage_T.date.i18n' ),
                        "-en": "Gesendet am",
                        "-de": "Gesendet am"
                    },
                    receivedAt: {
                        "type": "Date",
                        i18n: i18n( 'kvcmessage-schema.KVCMessage_T.date.i18n' ),
                        "-en": "Empfangen am",
                        "-de": "Empfangen am"
                    },
                    _errors: {
                        "complex": "inc",
                        i18n: i18n( 'kvcmessage-schema.KVCMessage_T._errors.i18n' ),
                        "type": "KVCMessageError_T",
                        "lib": types
                    },
                    rawData: {
                        "type": "any",
                        i18n: i18n( 'kvcmessage-schema.KVCMessage_T.rawData.i18n' ),
                        "-en": "rawData",
                        "-de": "rawData"
                    },
                    rawDataEncrypted: {
                        "type": "any",
                        i18n: i18n( 'kvcmessage-schema.KVCMessage_T.rawDataEncrypted.i18n' ),
                        "-en": "rawDataEncrypted",
                        "-de": "rawDataEncrypted"
                    },
                    messageType: {
                        "complex": "eq",
                        i18n: i18n( 'kvcmessage-schema.KVCMessage_T.messageType.i18n' ),
                        "type": "KVCMessageType_E",
                        "lib": types
                    },
                    messageStatus: {
                        "complex": "eq",
                        i18n: i18n( 'kvcmessage-schema.KVCMessage_T.messageStatus.i18n' ),
                        "type": "KVCMessageStatus_E",
                        "lib": types
                    },
                    kbvlogId: {
                        "type": "String",
                        i18n: i18n( 'kvcmessage-schema.KVCMessage_T.kbvlogId.i18n' ),
                        "-en": "kbvlogId",
                        "-de": "kbvlogId"
                    },
                    lablogId: {
                        "type": "String",
                        i18n: i18n( 'kvcmessage-schema.KVCMessage_T.lablogId.i18n' ),
                        "-en": "lablogId",
                        "-de": "lablogId"
                    },
                    attachments: {
                        "complex": "inc",
                        "type": "KVCMessageAttachment_T",
                        "lib": types,
                        i18n: i18n( 'kvcmessage-schema.KVCMessage_T.kbvlogId.i18n' ),
                        "-en": "kbvlogId",
                        "-de": "kbvlogId"
                    },
                    // reflects state of message on kvc server
                    serverStatus: {
                        "complex": "eq",
                        "type": "KVCServerStatus_E",
                        "lib": types,
                        i18n: i18n( 'kvcmessage-schema.KVCMessage_T.serverStatus.i18n' ),
                        "-en": "Server Status",
                        "-de": "Server Status"
                    },
                    confirmed: { // KBV requirement for MDNs (6.4 Anforderungen an die Systeme zum Empfang von MDNs und 1-Click-Abrechnungen "Rückmeldung" (Spezifikation KV-Connect Anwendungsdienst _1-Click-Abrechnung_V2.1.1))
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'kvcmessage-schema.KVCMessage_T.confirmed.i18n' ),
                        "-en": "Confirmed",
                        "-de": "Bestätigt"
                    },
                    extra: {
                        "type": "any",
                        i18n: i18n( 'kvcmessage-schema.KVCMessage_T.extra.i18n' ),
                        "-en": "extra",
                        "-de": "extra"
                    }
                },
                KVCMessageType_E: {
                    "type": "String",
                    "list": [
                        {
                            "val": "UNKNOWN",
                            i18n: i18n( 'kvcmessage-schema.KVCMessageType_E.UNKNOWN' ),
                            "-de": "Unbekannt",
                            "-en": "Unknown"
                        },
                        {
                            "val": "MDN",
                            i18n: i18n( 'kvcmessage-schema.KVCMessageType_E.MDN' ),
                            "-de": "Technische Rückmeldung",
                            "-en": "Technical Feedback"
                        },
                        {
                            "val": "LDT_FINDING_TRIGGER",
                            i18n: i18n( 'kvcmessage-schema.KVCMessageType_E.LDT_FINDING_TRIGGER' ),
                            "-de": "LDT-Befund Trigger",
                            "-en": "LDT Finding Trigger"
                        },
                        {
                            "val": "ETS_ARRANGEMENT_CODE_REQUEST",
                            i18n: i18n( 'kvcmessage-schema.KVCMessageType_E.ETS_ARRANGEMENT_CODE_REQUEST' ),
                            "-de": "eTerminservice Vermittlungscode-Anforderung",
                            "-en": "eTerminservice Vermittlungscode-Anforderung"
                        },
                        {
                            "val": "ETS_ARRANGEMENT_CODE_DELIVERY",
                            i18n: i18n( 'kvcmessage-schema.KVCMessageType_E.ETS_ARRANGEMENT_CODE_DELIVERY' ),
                            "-de": "eTerminservice Vermittlungscode-Lieferung",
                            "-en": "eTerminservice Vermittlungscode-Lieferung"
                        },
                        {
                            "val": "ETS_ARRANGEMENT_CODE_ERROR_MESSAGE",
                            i18n: i18n( 'kvcmessage-schema.KVCMessageType_E.ETS_ARRANGEMENT_CODE_ERROR_MESSAGE' ),
                            "-de": "eTerminservice Fehlernachricht",
                            "-en": "eTerminservice Fehlernachricht"
                        },
                        {
                            "val": "FEEDBACK",
                            i18n: i18n( 'kvcmessage-schema.KVCMessageType_E.FEEDBACK' ),
                            "-de": "Fachliche Rückmeldung",
                            "-en": "Professional Feedback"
                        },
                        {
                            "val": "INSPECTION_PROTOCOL",
                            i18n: i18n( 'kvcmessage-schema.KVCMessageType_E.INSPECTION_PROTOCOL' ),
                            "-de": "Prüfprotokoll",
                            "-en": "Inspection Protocol"
                        },
                        {
                            "val": "INVOICE",
                            i18n: i18n( 'kvcmessage-schema.KVCMessageType_E.INVOICE' ),
                            "-de": "Abrechnung",
                            "-en": "Invoice"
                        },
                        {
                            "val": "PARTIAL_INVOICE",
                            i18n: i18n( 'kvcmessage-schema.KVCMessageType_E.PARTIAL_INVOICE' ),
                            "-de": "Teilabrechnung",
                            "-en": "Partial Invoice"
                        },
                        {
                            "val": "REPLACEMENT",
                            i18n: i18n( 'kvcmessage-schema.KVCMessageType_E.REPLACEMENT' ),
                            "-de": "Ersatzlieferung",
                            "-en": "Replacement"
                        },
                        {
                            "val": "TEST_INVOICE",
                            i18n: i18n( 'kvcmessage-schema.KVCMessageType_E.TEST_INVOICE' ),
                            "-de": "Testabrechnung",
                            "-en": "Test Invoice"
                        },
                        {
                            "val": "TEST_PARTIAL_INVOICE",
                            i18n: i18n( 'kvcmessage-schema.KVCMessageType_E.TEST_PARTIAL_INVOICE' ),
                            "-de": "Testteilabrechnung",
                            "-en": "Test Partial Invoice"
                        },
                        {
                            "val": "DELIVERY",
                            i18n: i18n( 'kvcmessage-schema.KVCMessageType_E.DELIVERY' ),
                            "-de": "Lieferung",
                            "-en": "Delivery"
                        },
                        {
                            "val": "STATUS",
                            i18n: i18n( 'kvcmessage-schema.KVCMessageType_E.STATUS' ),
                            "-de": "Status",
                            "-en": "Status"
                        }
                    ]
                },
                KVCMessageStatus_E: {
                    "type": "String",
                    "list": [
                        // applies only to received messages
                        {
                            "val": "RECEIVED",
                            i18n: i18n( 'kvcmessage-schema.KVCMessageStatus_E.RECEIVED' ),
                            "-de": i18n( 'kvcmessage-schema.KVCMessageStatus_E.RECEIVED' ),
                            "-en": i18n( 'kvcmessage-schema.KVCMessageStatus_E.RECEIVED' )
                        },
                        {
                            "val": "PARSED",
                            i18n: i18n( 'kvcmessage-schema.KVCMessageStatus_E.PARSED' ),
                            "-de": i18n( 'kvcmessage-schema.KVCMessageStatus_E.PARSED' ),
                            "-en": i18n( 'kvcmessage-schema.KVCMessageStatus_E.PARSED' )
                        },
                        {
                            "val": "PROCESSED",
                            i18n: i18n( 'kvcmessage-schema.KVCMessageStatus_E.PROCESSED' ),
                            "-de": i18n( 'kvcmessage-schema.KVCMessageStatus_E.PROCESSED' ),
                            "-en": i18n( 'kvcmessage-schema.KVCMessageStatus_E.PROCESSED' )
                        },
                        // only state for sent messages
                        {
                            "val": "SENT",
                            i18n: i18n( 'kvcmessage-schema.KVCMessageStatus_E.SENT' ),
                            "-de": i18n( 'kvcmessage-schema.KVCMessageStatus_E.SENT' ),
                            "-en": i18n( 'kvcmessage-schema.KVCMessageStatus_E.SENT' )
                        }
                    ]
                },
                KVCServerStatus_E: {
                    "type": "String",
                    "list": [
                        // applies only to received messages
                        {
                            "val": "OK",
                            i18n: i18n( 'kvcmessage-schema.KVCServerStatus_E.OK' ),
                            "-de": i18n( 'kvcmessage-schema.KVCServerStatus_E.OK' ),
                            "-en": i18n( 'kvcmessage-schema.KVCServerStatus_E.OK' )
                        },
                        {
                            "val": "MARKED_FOR_DELETION",
                            i18n: i18n( 'kvcmessage-schema.KVCServerStatus_E.MARKED_FOR_DELETION' ),
                            "-de": i18n( 'kvcmessage-schema.KVCServerStatus_E.MARKED_FOR_DELETION' ),
                            "-en": i18n( 'kvcmessage-schema.KVCServerStatus_E.MARKED_FOR_DELETION' )
                        },
                        {
                            "val": "DELETED",
                            i18n: i18n( 'kvcmessage-schema.KVCServerStatus_E.DELETED' ),
                            "-de": i18n( 'kvcmessage-schema.KVCServerStatus_E.DELETED' ),
                            "-en": i18n( 'kvcmessage-schema.KVCServerStatus_E.DELETED' )
                        }
                    ]
                },
                KVCServiceType_E: {
                    "type": "String",
                    "list": [
                        {
                            "val": "UNKNOWN",
                            i18n: i18n( 'kvcmessage-schema.KVCServiceType_E.UNKNOWN' ),
                            "-de": "Unbekannt",
                            "-en": "Unknown"
                        },
                        {
                            "val": "1CLICK_INVOICE",
                            i18n: i18n( 'kvcmessage-schema.KVCServiceType_E.1CLICK_INVOICE' ),
                            "-de": i18n( 'kvcmessage-schema.KVCServiceType_E.1CLICK_INVOICE' ),
                            "-en": i18n( 'kvcmessage-schema.KVCServiceType_E.1CLICK_INVOICE' )
                        },
                        {
                            "val": "LDT_FINDING",
                            i18n: i18n( 'kvcmessage-schema.KVCServiceType_E.LDT_FINDING' ),
                            "-de": i18n( 'kvcmessage-schema.KVCServiceType_E.LDT_FINDING' ),
                            "-en": i18n( 'kvcmessage-schema.KVCServiceType_E.LDT_FINDING' )
                        },
                        {
                            "val": "ETS",
                            i18n: i18n( 'kvcmessage-schema.KVCServiceType_E.ETS' ),
                            "-de": i18n( 'kvcmessage-schema.KVCServiceType_E.ETS' ),
                            "-en": i18n( 'kvcmessage-schema.KVCServiceType_E.ETS' )
                        }
                    ]
                },
                KVCMessageAttachment_T: {
                    contentType: {
                        "type": "String",
                        i18n: i18n( 'kvcmessage-schema.KVCMessageAttachment_T.contentType.i18n' ),
                        "-en": i18n( 'kvcmessage-schema.KVCMessageAttachment_T.contentType.i18n' ),
                        "-de": i18n( 'kvcmessage-schema.KVCMessageAttachment_T.contentType.i18n' )
                    },
                    filename: {
                        "type": "String",
                        i18n: i18n( 'kvcmessage-schema.KVCMessageAttachment_T.filename.i18n' ),
                        "-en": i18n( 'kvcmessage-schema.KVCMessageAttachment_T.filename.i18n' ),
                        "-de": i18n( 'kvcmessage-schema.KVCMessageAttachment_T.filename.i18n' )
                    },
                    generatedFileName: {
                        "type": "String",
                        i18n: i18n( 'kvcmessage-schema.KVCMessageAttachment_T.generatedFileName.i18n' ),
                        "-en": i18n( 'kvcmessage-schema.KVCMessageAttachment_T.generatedFileName.i18n' ),
                        "-de": i18n( 'kvcmessage-schema.KVCMessageAttachment_T.generatedFileName.i18n' )
                    },
                    contentId: {
                        "type": "String",
                        i18n: i18n( 'kvcmessage-schema.KVCMessageAttachment_T.contentId.i18n' ),
                        "-en": i18n( 'kvcmessage-schema.KVCMessageAttachment_T.contentId.i18n' ),
                        "-de": i18n( 'kvcmessage-schema.KVCMessageAttachment_T.contentId.i18n' )
                    },
                    contentDisposition: { // TODOOO kvc translation
                        "type": "String",
                        i18n: i18n( 'kvcmessage-schema.KVCMessageAttachment_T.contentDisposition.i18n' ),
                        "-en": i18n( 'kvcmessage-schema.KVCMessageAttachment_T.contentDisposition.i18n' ),
                        "-de": i18n( 'kvcmessage-schema.KVCMessageAttachment_T.contentDisposition.i18n' )
                    },
                    charset: { // TODOOO kvc translation
                        "type": "String",
                        i18n: i18n( 'kvcmessage-schema.KVCMessageAttachment_T.charset.i18n' ),
                        "-en": i18n( 'kvcmessage-schema.KVCMessageAttachment_T.charset.i18n' ),
                        "-de": i18n( 'kvcmessage-schema.KVCMessageAttachment_T.charset.i18n' )
                    },
                    content: {
                        "type": "any",
                        i18n: i18n( 'kvcmessage-schema.KVCMessageAttachment_T.content.i18n' ),
                        "-en": i18n( 'kvcmessage-schema.KVCMessageAttachment_T.content.i18n' ),
                        "-de": i18n( 'kvcmessage-schema.KVCMessageAttachment_T.content.i18n' )
                    },
                    contentFileId: {
                        "type": "String",
                        i18n: i18n( 'kvcmessage-schema.KVCMessageAttachment_T.contentFileId.i18n' ),
                        "-en": i18n( 'kvcmessage-schema.KVCMessageAttachment_T.contentFileId.i18n' ),
                        "-de": i18n( 'kvcmessage-schema.KVCMessageAttachment_T.contentFileId.i18n' )
                    },
                    size: { // TODOOO kvc translation
                        "type": "Number",
                        i18n: i18n( 'kvcmessage-schema.KVCMessageAttachment_T.size.i18n' ),
                        "-en": i18n( 'kvcmessage-schema.KVCMessageAttachment_T.size.i18n' ),
                        "-de": i18n( 'kvcmessage-schema.KVCMessageAttachment_T.size.i18n' )
                    }
                },
                KVCMessageError_T: {
                    code: {
                        "type": "Number",
                        i18n: i18n( 'kvcmessage-schema.KVCMessageError_T.code.i18n' )
                    },
                    message: {
                        "type": "String",
                        i18n: i18n( 'kvcmessage-schema.KVCMessageError_T.message.i18n' )
                    },
                    technical: {
                        'default': true,
                        "type": "Boolean",
                        i18n: i18n( 'kvcmessage-schema.KVCMessageError_T.technical.i18n' )
                    },
                    type: {
                        "type": "String",
                        i18n: i18n( 'kvcmessage-schema.KVCMessageError_T.type.i18n' )
                    }
                }
            }
        );

        /**
         * Maps serviceId (from header 'x-kvc-dienstkennung') to kvcmessage messageType
         *
         * @example '1ClickAbrechnung;Eingangsbestaetigung;V2.0'
         * @param serviceID
         * @returns {String|undefined}
         */
        function getMessageTypeByServiceId( serviceID ) {
            const unknownType = 'UNKNOWN';
            if( 'string' !== typeof serviceID ) {
                return unknownType;
            }

            const
                parts = serviceID.split( ';' );

            if( oneClickServiceName === parts[0] ) {
                return oneClickServiceIdMessageTypeMap[parts[1]] || unknownType;
            }
            if( ldtFindingServiceName === parts[0] ) {
                return ldtFindingServiceIdMessageTypeMap[parts[1]] || unknownType;
            }
            if( eTSServiceName === parts[0] ) {
                return eTSServiceIdMessageTypeMap[parts[1]] || unknownType;
            }

            return unknownType;
        }

        function getkvcServiceTypeByServiceId( serviceID ) {
            const unknownType = 'UNKNOWN';
            if( 'string' !== typeof serviceID ) {
                return unknownType;
            }

            const
                parts = serviceID.split( ';' );

            if( oneClickServiceName === parts[0] ) {
                return oneClickServiceType;
            }
            if( ldtFindingServiceName === parts[0] ) {
                return ldtFindingServiceType;
            }
            if( eTSServiceName === parts[0] ) {
                return eTSServiceType;
            }

            return unknownType;
        }

        function getGUIDAnVersionFromFeedbackAttachments( kvcmessage ) {
            let attachment;
            if( kvcmessage && Array.isArray( kvcmessage.attachments ) && kvcmessage.attachments.length ) {
                attachment = kvcmessage.attachments.find( function(_attachment){return FEEDBACK_ATTACHMENT_FILENAME === _attachment.filename;} );
            }

            if( !attachment || !attachment.content ) {
                return;
            }
            const
                attachmentString = attachment.content.toString(),
                extractGuid = /<guid V="([a-zA-Z0-9_-]*)"/gm,
                extractVersion = /<version V="([\d]*)"/gm;

            let match, guid, version;

            match = attachmentString && extractGuid.exec( attachmentString );
            guid = match && match[1];

            match = attachmentString && extractVersion.exec( attachmentString );
            version = match && match[1];

            return (version && guid) ? {
                guid: guid,
                version: version
            } : null;
        }

        function getGkvInvoiceMessageTypes() {
            var gkvInvoiceMessageTypeValues = ["INVOICE", "PARTIAL_INVOICE", "REPLACEMENT", "TEST_INVOICE", "TEST_PARTIAL_INVOICE"];
            return Y.doccirrus.schemas.kvcmessage.types.KVCMessageType_E.list.filter( function( entry ) {
                return gkvInvoiceMessageTypeValues.indexOf( entry.val ) >= 0;
            } );
        }

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,
            defaultItems: [],
            name: NAME,
            getMessageTypeByServiceId: getMessageTypeByServiceId,
            getkvcServiceTypeByServiceId: getkvcServiceTypeByServiceId,
            getGUIDAnVersionFromFeedbackAttachments: getGUIDAnVersionFromFeedbackAttachments,
            getGkvInvoiceMessageTypes: getGkvInvoiceMessageTypes
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'doccirrus',
            'invoicelog-schema',
            'dcvalidations'
        ]
    }
);
