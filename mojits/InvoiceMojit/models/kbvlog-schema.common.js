/**
 * (c) 2014, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'kbvlog-schema', function( Y, NAME ) {
        /**
         * The KBVLog entry schema,
         *
         * @module kbvlog-schema, log schema to keep track quarterly
         * of all the changes and status.
         */

        var
            i18n = Y.doccirrus.i18n,
            types = {};

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "KBVLog_T",
                        "lib": types
                    }
                },
                "KBVError_T": {
                    "code": {
                        "type": "String",
                        i18n: i18n( 'kbvlog-schema.KBVError_T.code.i18n' ),
                        "-en": "Code",
                        "-de": "Kode"
                    },
                    "text": {
                        "type": "String",
                        i18n: i18n( 'kbvlog-schema.KBVError_T.text.i18n' ),
                        "-en": "Text",
                        "-de": "Text"
                    },
                    "originalText": {
                        "type": "String",
                        i18n: i18n( 'kbvlog-schema.KBVError_T.originalText.i18n' ),
                        "-en": "original text",
                        "-de": "original Text"
                    },
                    "fields": {
                        "type": ["String"],
                        i18n: i18n( 'kbvlog-schema.KBVError_T.fields.i18n' ),
                        "-en": "Fields",
                        "-de": "Fields"
                    },
                    "line": {
                        "type": "String",
                        i18n: i18n( 'kbvlog-schema.KBVError_T.line.i18n' ),
                        "-en": "line",
                        "-de": "Zeile"
                    },
                    "value": {
                        "type": "String",
                        i18n: i18n( 'kbvlog-schema.KBVError_T.value.i18n' ),
                        "-en": "value",
                        "-de": "Wert"
                    },
                    "fieldCode": {
                        "type": "String",
                        i18n: i18n( 'kbvlog-schema.KBVError_T.fieldCode.i18n' ),
                        "-en": "fieldcode",
                        "-de": "Feld-Code"
                    },
                    "map": {
                        "complex": "inc",
                        "type": "KBVErrorMap_T",
                        "lib": types,
                        i18n: i18n( 'kbvlog-schema.KBVError_T.map.i18n' ),
                        "-en": "line",
                        "-de": "Zeile"
                    },
                    "link": {
                        "type": "String",
                        i18n: i18n( 'kbvlog-schema.KBVError_T.link.i18n' ),
                        "-en": "link",
                        "-de": "Link"
                    },
                    corrections: {
                        "type": "any",
                        i18n: i18n( 'kbvlog-schema.KBVError_T.corrections.i18n' ),
                        "-en": "corrections",
                        "-de": "Korrekturen"
                    },
                    scheinId: {
                        "type": "String",
                        i18n: i18n( 'kbvlog-schema.KBVError_T.scheinId.i18n' ),
                        "-en": "scheinId",
                        "-de": "scheinId"
                    },
                    "patientId": {
                        "type": "String",
                        i18n: i18n( 'kbvlog-schema.KBVError_T.data.i18n' ),
                        "-en": "data",
                        "-de": "data"
                    },
                    "patientName": {
                        "type": "String",
                        i18n: i18n( 'kbvlog-schema.KBVError_T.patient.i18n' ),
                        "-en": "Patient",
                        "-de": "Patient"
                    },
                    "ruleId": {
                        "type": "String",
                        i18n: i18n( 'kbvlog-schema.KBVError_T.ruleId.i18n' ),
                        "-en": "ruleId",
                        "-de": "ruleId"
                    },
                    "factIdCode": {
                        "type": "String",
                        i18n: i18n( 'kbvlog-schema.KBVError_T.factIdCode.i18n' ),
                        "-en": "factIdCode",
                        "-de": "factIdCode"
                    },
                    "requiredCodes": {
                        "type": "String",
                        i18n: i18n( 'kbvlog-schema.KBVError_T.requiredCodes.i18n' ),
                        "-en": "requiredCodes",
                        "-de": "requiredCodes"
                    },
                    "blPseudoGnrStatus": {
                        complex: "eq",
                        type: "BlPseudoGnrStatus_E",
                        "lib": types,
                        i18n: i18n( 'kbvlog-schema.KBVError_T.blPseudoGnrStatus.i18n' ),
                        "-en": i18n( 'kbvlog-schema.KBVError_T.blPseudoGnrStatus.i18n' ),
                        "-de": i18n( 'kbvlog-schema.KBVError_T.blPseudoGnrStatus.i18n' )
                    }
                },
                "BlPseudoGnrStatus_E": {
                    type: "String",
                    list: [
                        {
                            val: "KP2-965",
                            message: i18n( 'kbvlog-schema.BlPseudoGnrStatus_E.KP2-965.message' ),
                            i18n: i18n( 'kbvlog-schema.BlPseudoGnrStatus_E.KP2-965.i18n' ),
                            '-en': i18n( 'kbvlog-schema.BlPseudoGnrStatus_E.KP2-965.i18n' ),
                            '-de': i18n( 'kbvlog-schema.BlPseudoGnrStatus_E.KP2-965.i18n' )
                        },
                        {
                            val: "KP2-966",
                            message: i18n( 'kbvlog-schema.BlPseudoGnrStatus_E.KP2-966.message' ),
                            i18n: i18n( 'kbvlog-schema.BlPseudoGnrStatus_E.KP2-966.i18n' ),
                            '-en': i18n( 'kbvlog-schema.BlPseudoGnrStatus_E.KP2-966.i18n' ),
                            '-de': i18n( 'kbvlog-schema.BlPseudoGnrStatus_E.KP2-966.i18n' )
                        },
                        {
                            val: "KP2-967",
                            message: i18n( 'kbvlog-schema.BlPseudoGnrStatus_E.KP2-967.message' ),
                            i18n: i18n( 'kbvlog-schema.BlPseudoGnrStatus_E.KP2-967.i18n' ),
                            '-en': i18n( 'kbvlog-schema.BlPseudoGnrStatus_E.KP2-967.i18n' ),
                            '-de': i18n( 'kbvlog-schema.BlPseudoGnrStatus_E.KP2-967.i18n' )
                        }

                    ]
                },
                "KBVErrorMap_T": {
                    "path": {
                        "type": "String",
                        i18n: i18n( 'kbvlog-schema.KBVErrorMap_T.path.i18n' ),
                        "-en": "path",
                        "-de": "Pfad"
                    },
                    "modelIds": {
                        "type": ["String"],
                        i18n: i18n( 'kbvlog-schema.KBVErrorMap_T.modelIds.i18n' ),
                        "-en": "model ids",
                        "-de": "Modell-Ids"
                    },
                    "model": {
                        "type": "String",
                        i18n: i18n( 'kbvlog-schema.KBVErrorMap_T.model.i18n' ),
                        "-en": "model",
                        "-de": "Modell"
                    },
                    // usage of the string schema would break mongoose
                    "schem": {
                        "type": "String",
                        i18n: i18n( 'kbvlog-schema.KBVErrorMap_T.schem.i18n' ),
                        "-en": "schema",
                        "-de": "Schema"
                    },
                    "name": {
                        "type": "String",
                        i18n: i18n( 'kbvlog-schema.KBVErrorMap_T.name.i18n' ),
                        "-en": "name",
                        "-de": "Name"
                    }
                },
                "KBVLog_T": {
                    "invoiceLog": {
                        "complex": "ext",
                        "type": 'InvoiceLog_T',
                        "lib": "invoicelog"
                    },
                    "guid": {
                        "type": "String",
                        i18n: i18n( 'kbvlog-schema.KBVLog_T.guid.i18n' ),
                        "-en": "guid",
                        "-de": "guid"
                    },
                    "number": {
                        "type": Number,
                        i18n: i18n( 'kbvlog-schema.KBVLog_T.number.i18n' ),
                        "-en": "number",
                        "-de": "Nummer"
                    },
                    "complete": {
                        "default": false,
                        "type": Boolean,
                        i18n: i18n( 'kbvlog-schema.KBVLog_T.complete.i18n' ),
                        "-en": "complete",
                        "-de": "komplett"
                    },
                    "test": {
                        "default": false,
                        "type": Boolean,
                        i18n: i18n( 'kbvlog-schema.KBVLog_T.test.i18n' ),
                        "-en": "test",
                        "-de": "Test"
                    },
                    "quarter": {
                        "type": "Number",
                        i18n: i18n( 'kbvlog-schema.KBVLog_T.quarter.i18n' ),
                        "-en": "Quarter",
                        "-de": "Quartel"
                    },
                    "year": {
                        "type": "Number",
                        i18n: i18n( 'kbvlog-schema.KBVLog_T.year.i18n' ),
                        "-en": "Year",
                        "-de": "Jahr"
                    },
                    "destination": {
                        "type": "String",
                        i18n: i18n( 'kbvlog-schema.KBVLog_T.destination.i18n' ),
                        "-en": "UKV/OKV-Kennung",
                        "-de": "UKV/OKV-Kennung"
                    },
                    "conFileName": {
                        "type": "String",
                        i18n: i18n( 'kbvlog-schema.KBVLog_T.conFileName.i18n' ),
                        "-en": "conFileName",
                        "-de": "conFileName"
                    },
                    "conFileId": {
                        "type": "String",
                        i18n: i18n( 'kbvlog-schema.KBVLog_T.conFileId.i18n' ),
                        "-en": "conFileId",
                        "-de": "conFileId"
                    },
                    "xkmFileName": {
                        "type": "String",
                        i18n: i18n( 'kbvlog-schema.KBVLog_T.xkmFileName.i18n' ),
                        "-en": "xkmFileName",
                        "-de": "xkmFileName"
                    },
                    "xkmFileId": {
                        "type": "String",
                        i18n: i18n( 'kbvlog-schema.KBVLog_T.xkmFileId.i18n' ),
                        "-en": "xkmFileId",
                        "-de": "xkmFileId"
                    },
                    "pdfMediaId": {
                        "type": "String",
                        i18n: i18n( 'kbvlog-schema.KBVLog_T.pdfMediaId.i18n' ),
                        "-en": "PDF _id",
                        "-de": "PDF _id"
                    },
                    "kvcaEntry": {
                        "complex": "inc",
                        "type": "KVCA_T",
                        "lib": 'catalog',
                        i18n: i18n( 'kbvlog-schema.KBVLog_T.kvcaEntry.i18n' ),
                        "-en": i18n( 'kbvlog-schema.KBVLog_T.kvcaEntry.i18n' ),
                        "-de": i18n( 'kbvlog-schema.KBVLog_T.kvcaEntry.i18n' )
                    },
                    "addressee": {
                        "type": "String",
                        i18n: i18n( 'kbvlog-schema.KBVLog_T.addressee.i18n' ),
                        "-en": "addressee",
                        "-de": "Adressat"
                    },
                    "sender": {
                        "type": "String",
                        i18n: i18n( 'kbvlog-schema.KBVLog_T.sender.i18n' ),
                        "-en": "sender",
                        "-de": "sender"
                    },
                    "from": {
                        "type": "String",
                        i18n: i18n( 'kbvlog-schema.KBVLog_T.from.i18n' ),
                        "-en": "from",
                        "-de": "from"
                    },
                    "sentId": {
                        "type": "String",
                        i18n: i18n( 'kbvlog-schema.KBVLog_T.sentId.i18n' ),
                        "-en": "from",
                        "-de": "from"
                    },
                    "delivered": {
                        "type": "Date",
                        i18n: i18n( 'kbvlog-schema.KBVLog_T.delivered.i18n' ),
                        "-en": "delivered",
                        "-de": "delivered"
                    },
                    "responded": {
                        "type": "Date",
                        i18n: i18n( 'kbvlog-schema.KBVLog_T.responded.i18n' ),
                        "-en": "responded",
                        "-de": "responded"
                    },
                    "QPZ": {
                        "type": "any",
                        i18n: i18n( 'kbvlog-schema.KBVLog_T.QPZ.i18n' ),
                        "-en": "QPZ",
                        "-de": "QPZ"
                    },
                    "statFiles": {
                        "type": "any",
                        i18n: i18n( 'kbvlog-schema.KBVLog_T.statFiles.i18n' ),
                        "-en": "statFiles",
                        "-de": "statFiles"
                    },
                    "sourceConFiles": {
                        "type": "any",
                        i18n: i18n( 'kbvlog-schema.KBVLog_T.sourceConFiles.i18n' ),
                        "-en": "conFiles",
                        "-de": "conFiles"
                    },
                    "scanProtocolId": {
                        "type": "any",
                        i18n: i18n( 'kbvlog-schema.KBVLog_T.sourceConFiles.i18n' ),
                        "-en": "scanProtocol",
                        "-de": "scanProtocol"
                    },
                    "messages": {
                        "complex": "inc",
                        "type": "KVCMessage_T",
                        "lib": 'kvcmessage',
                        i18n: i18n( 'kbvlog-schema.KBVLog_T.messages.i18n' ),
                        "-en": "respomessagesnded",
                        "-de": "messages"
                    },
                    "slType": {
                        "type": "String",
                        i18n: i18n( 'kbvlog-schema.KBVLog_T.slType' ),
                        "-en": "Super location type",
                        "-de": "Super-Betriebsstätte Art"
                    },
                    "slReferences": {
                        "type": ["String"],
                        i18n: i18n( 'kbvlog-schema.KBVLog_T.slReferences' ),
                        "-en": "Super location references",
                        "-de": "Super-Betriebsstätte Verweise"
                    },
                    "slLogId": {
                        "type": "String",
                        i18n: i18n( 'kbvlog-schema.KBVLog_T.slLogId' ),
                        "-en": "Super location log id",
                        "-de": "Super-Betriebsstätte Log Id"
                    },
                    "slCommercialNo": {
                        "type": "String",
                        i18n: i18n( 'kbvlog-schema.KBVLog_T.slCommercialNo' ),
                        "-en": "Main Commercial No",
                        "-de": "Haupt BSNR"
                    }
                }
            }
        );

        function getBlPseudoGnrStatusMessage( code ) {
            return Y.doccirrus.schemas.kbvlog.types.BlPseudoGnrStatus_E.list.find(function(entry){return entry.val === code;}).message;
        }

        /**
         * @method getSuperLocationName
         * @public
         *
         * build name of super location
         *
         * @param {String} slName   separately defined super location name
         * @param {String} locName  common name of location
         *
         * @returns {String}    new super location name
         */
        function getSuperLocationName( slName, locName ){
            return slName || i18n( 'kbvlog-schema.KBVLog_T.slPrefix' ) + locName;
        }

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,
            /* OPTIONAL default items to be written to the DB on startup */
            defaultItems: [],
            name: NAME,
            sentEnumValues: ['SENT', 'SENT_ERR', 'REPLACED', 'ACCEPTED', 'REJECTED'],
            getBlPseudoGnrStatusMessage: getBlPseudoGnrStatusMessage,
            getSuperLocationName: getSuperLocationName
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'doccirrus',
            'invoicelog-schema',
            'dcvalidations',
            'kvcmessage-schema'
        ]
    }
);
