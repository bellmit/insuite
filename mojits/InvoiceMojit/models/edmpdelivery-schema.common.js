/**
 * User: do
 * Date: 16/08/16  17:37
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
'use strict';

YUI.add( 'edmpdelivery-schema', function( Y, NAME ) {
        /**
         * The EdmpDelivery entry schema,
         *
         * @module invoice-schema, log schema to keep track quarterly
         * of all the changes and status.
         *
         * We need to get the right addressee from the sdda catalog by following criteria:
         * 1. KV (kv)of the Physician/Location
         * 2. Documentation kind (docKind, eDMP actTypes: DM1, DM2, KHk etc.)
         * 3. "Kostengrägergruppe" (costCarrierBillingGroup) of the patients' public insurance
         *
         * Note: User can always "override" or ignore these criteria!
         *
         */

        var
            i18n = Y.doccirrus.i18n,
            types = {};

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "EdmpDelivery_T",
                        "lib": types
                    }
                },
                "EdmpDeliveryStatus_E": { // TODOOO OPEN PACKING PACKED SENDING SENT ACCEPTED/REJECTED
                    "type": "String",
                    "list": [
                        {
                            "val": "OPEN",
                            i18n: i18n( 'edmpdelivery-schema.EdmpDeliveryStatus_E.OPEN' ),
                            "-en": "open",
                            "-de": "offen"
                        },
                        {
                            "val": "PACKING",
                            i18n: i18n( 'edmpdelivery-schema.EdmpDeliveryStatus_E.PACKING' ),
                            "-en": "packing",
                            "-de": "verpacken"
                        },
                        {
                            "val": "PACKED",
                            i18n: i18n( 'edmpdelivery-schema.EdmpDeliveryStatus_E.PACKED' ),
                            "-en": "packing",
                            "-de": "verpackt"
                        },
                        {
                            "val": "PACK_ERR",
                            i18n: i18n( 'edmpdelivery-schema.EdmpDeliveryStatus_E.PACK_ERR' ),
                            "-en": "pack error",
                            "-de": "Fehler beim Verpacken"
                        },
                        {
                            "val": "SENDING",
                            i18n: i18n( 'edmpdelivery-schema.EdmpDeliveryStatus_E.SENDING' ),
                            "-en": "sending",
                            "-de": "versenden"
                        },
                        {
                            "val": "SENT",
                            i18n: i18n( 'edmpdelivery-schema.EdmpDeliveryStatus_E.SENT' ),
                            "-en": "sent",
                            "-de": "versendet"
                        },
                        {
                            "val": "SENT_ERR",
                            i18n: i18n( 'edmpdelivery-schema.EdmpDeliveryStatus_E.SENT_ERR' ),
                            "-en": "send error",
                            "-de": "Sendefehler"
                        },
                        {
                            "val": "ACCEPTED",
                            i18n: i18n( 'edmpdelivery-schema.EdmpDeliveryStatus_E.ACCEPTED' ),
                            "-en": "accepted",
                            "-de": "akzeptiert"
                        },
                        {
                            "val": "REJECTED",
                            i18n: i18n( 'edmpdelivery-schema.EdmpDeliveryStatus_E.REJECTED' ),
                            "-en": "Rejected",
                            "-de": "abgewiesen"
                        },
                        {
                            "val": "TIMEOUT",
                            i18n: i18n( 'edmpdelivery-schema.EdmpDeliveryStatus_E.TIMEOUT' ),
                            "-en": "timeout",
                            "-de": "time-out"
                        },
                        {
                            "val": "CANCELED",
                            i18n: i18n( 'edmpdelivery-schema.EdmpDeliveryStatus_E.CANCELED' ),
                            "-en": "canceled",
                            "-de": "abgebrochen"
                        },
                        {
                            "val": "ARCHIVED",
                            i18n: i18n( 'edmpdelivery-schema.EdmpDeliveryStatus_E.ARCHIVED' ),
                            "-en": "archived",
                            "-de": "archiviert"
                        }
                    ]
                },
                "EdmpDelivery_T": {
                    "locationId": {
                        required: true,
                        "type": "String",
                        i18n: i18n( 'invoicelog-schema.InvoiceLog_T.mainLocationId.i18n' ),
                        "-en": "mainLocationId",
                        "-de": "mainLocationId"
                    },
                    "commercialNo": {
                        "type": "String",
                        i18n: i18n( 'invoicelog-schema.InvoiceLog_T.commercialNo.i18n' ),
                        "-en": "Comercial No",
                        "-de": "BSNR"
                    },
                    "institutionCode": {
                        "type": "String",
                        i18n: i18n( 'invoicelog-schema.InvoiceLog_T.institutionCode.i18n' ),
                        "-en": "IKNR",
                        "-de": "IKNR"
                    },
                    "locname": {
                        required: true,
                        "type": "String",
                        i18n: i18n( 'invoicelog-schema.InvoiceLog_T.locname.i18n' ),
                        "-en": "locname",
                        "-de": "locname"
                    },
                    "kv": {
                        required: true,
                        "type": "String",
                        i18n: i18n( 'edmpdelivery-schema.EdmpDelivery_T.kv.i18n' ),
                        "-en": "kv",
                        "-de": "kv"
                    },
                    // "costCarrierBillingGroup": {
                    //     "type": "String",
                    //     i18n: i18n( 'edmpdelivery-schema.EdmpDelivery_T.costCarrierBillingGroup.i18n' ),
                    //     "-en": "Kostenträgergruppe",
                    //     "-de": "Kostenträgergruppe"
                    // },
                    // "costCarrierBillingGroupName": {
                    //     "type": "String",
                    //     i18n: i18n( 'edmpdelivery-schema.EdmpDelivery_T.costCarrierBillingGroupName.i18n' ),
                    //     "-en": "costCarrierBillingGroupName",
                    //     "-de": "costCarrierBillingGroupName"
                    // },
                    "quarter": {
                        required: true,
                        "type": "Number",
                        i18n: i18n( 'edmpdelivery-schema.EdmpDelivery_T.quarter.i18n' ),
                        "-en": "Quarter",
                        "-de": "Quarter"
                    },
                    "year": {
                        required: true,
                        "type": "Number",
                        i18n: i18n( 'edmpdelivery-schema.EdmpDelivery_T.year.i18n' ),
                        "-en": "Year",
                        "-de": "Year"
                    },
                    "editor": {
                        "complex": "inc",
                        "type": "EmployeeShort_T",
                        "lib": "employee",
                        i18n: i18n( 'edmpdelivery-schema.EdmpDelivery_T.user.i18n' ),
                        "-en": "Editor",
                        "-de": "Editor"
                    },
                    "addressee": {
                        "type": "String",
                        i18n: i18n( 'edmpdelivery-schema.EdmpDelivery_T.addressee.i18n' ),
                        "-en": "Addressee",
                        "-de": "Adressat"
                    },
                    "addresseeId": {
                        required: true,
                        "type": "String",
                        i18n: i18n( 'edmpdelivery-schema.EdmpDelivery_T.addresseeId.i18n' ),
                        "-en": "addresseeId",
                        "-de": "addresseeId"
                    },
                    // since 4.4 this can be either IKNR with 9 digits or UKV with 2 digits
                    "addresseeIk": {
                        required: true,
                        "type": "String",
                        i18n: i18n( 'edmpdelivery-schema.EdmpDelivery_T.addresseeId.i18n' ),
                        "-en": "addressee ik",
                        "-de": "Empfänger IK"
                    },
                    "addresseeCollection": {
                        required: true,
                        "type": "String",
                        i18n: i18n( 'edmpdelivery-schema.EdmpDelivery_T.addresseeCollection.i18n' ),
                        "-en": "addresseeCollection",
                        "-de": "addresseeCollection"
                    },
                    "addresseeName": {
                        required: true,
                        "type": "String",
                        i18n: i18n( 'edmpdelivery-schema.EdmpDelivery_T.addressee.i18n' ),
                        "-en": "Addressee",
                        "-de": "Adressat"
                    },
                    "addresseeKv": {
                        "type": "String",
                        i18n: i18n( 'edmpdelivery-schema.EdmpDelivery_T.addresseeKv.i18n' ),
                        "-en": "Addressee KV",
                        "-de": "Adressat KV"
                    },
                    "sender": {
                        "type": "String",
                        i18n: i18n( 'edmpdelivery-schema.EdmpDelivery_T.sender.i18n' ),
                        "-en": "sender",
                        "-de": "sender"
                    },
                    "sentId": {
                        "type": "String",
                        i18n: i18n( 'edmpdelivery-schema.EdmpDelivery_T.sentId.i18n' ),
                        "-en": "from",
                        "-de": "from"
                    },
                    "lastUpdate": {
                        "type": "Date",
                        i18n: i18n( 'edmpdelivery-schema.EdmpDelivery_T.lastUpdate.i18n' ),
                        "-en": "Date",
                        "-de": "Datum"
                    },
                    "edmpDeliveryStatus": {
                        "complex": "eq",
                        "type": "EdmpDeliveryStatus_E",
                        "lib": types,
                        i18n: i18n( 'edmpdelivery-schema.EdmpDelivery_T.edmpDeliveryStatus.i18n' ),
                        "-en": "Status",
                        "-de": "Status"
                    },
                    "pid": { // used to determine which worker started invoice/approve process
                        "type": 'String',
                        i18n: i18n( 'edmpdelivery-schema.EdmpDelivery_T.pid.i18n' ),
                        "-en": "pid",
                        "-de": "pid"
                    },
                    "nDocs": { // number of all included eDMP documentations
                        "type": "Number",
                        i18n: i18n( 'edmpdelivery-schema.EdmpDelivery_T.pid.i18n' ),
                        "-en": "number of documenations",
                        "-de": "Anzahl der Dokumentationen"
                    },
                    "content": {
                        "type": "any",
                        i18n: i18n( 'edmpdelivery-schema.EdmpDelivery_T.content.i18n' ),
                        "-en": "content",
                        "-de": "Inhalt"
                    },
                    "version": {
                        "type": "Number",
                        i18n: i18n( 'edmpdelivery-schema.EdmpDelivery_T.version.i18n' ),
                        "-en": "version",
                        "-de": "Version"
                    },
                    "dateOfPacking": {
                        "type": "Date",
                        i18n: i18n( 'edmpdelivery-schema.EdmpDelivery_T.dateOfPacking.i18n' ),
                        "-en": "dateOfPacking",
                        "-de": "dateOfPacking"
                    },
                    "labelFormId": {
                        "type": "String",
                        i18n: i18n( 'edmpdelivery-schema.EdmpDelivery_T.labelFormId.i18n' ),
                        "-en": "labelFormId",
                        "-de": "labelFormId"
                    },
                    "contentFormId": {
                        "type": "String",
                        i18n: i18n( 'edmpdelivery-schema.EdmpDelivery_T.contentFormId.i18n' ),
                        "-en": "contentFormId",
                        "-de": "contentFormId"
                    },
                    "sentDate": {
                        "type": "Date",
                        i18n: i18n( 'edmpdelivery-schema.EdmpDelivery_T.sentDate.i18n' ),
                        "-en": "sentDate",
                        "-de": "sentDate"
                    },
                    "createEvl": {
                        "default": false,
                        "type": "Boolean",
                        i18n: i18n( 'edmpdelivery-schema.EdmpDelivery_T.createEvl.i18n' ),
                        "-en": "Erzeuge eVersandliste und Bestätigungsschreiben",
                        "-de": "Erzeuge eVersandliste und Bestätigungsschreiben"
                    },
                    "evlEmployeeId": {
                        "type": "String",
                        i18n: i18n( 'edmpdelivery-schema.EdmpDelivery_T.evlEmployeeId.i18n' ),
                        "-en": "Absender",
                        "-de": "Absender"
                    },
                    "evlAckFileId": {
                        "type": "String",
                        i18n: i18n( 'edmpdelivery-schema.EdmpDelivery_T.evlAckFileId.i18n' ),
                        "-en": "Bestätigungsschreiben",
                        "-de": "Bestätigungsschreiben"
                    },
                    "includedEdocTypes": {
                        i18n: i18n( 'edmpdelivery-schema.EdmpDelivery_T.includedEdocTypes.i18n' ),
                        "complex": "eq",
                        "type": "EdocTypes_E",
                        "lib": types
                    },
                    "error": {
                        "type": "Errors_E",
                        i18n: i18n( 'DCWindow.notice.title.error' ),
                        "complex": "eq",
                        "lib": types,
                        "default": ""
                    },
                    "errorDetails": {
                        "type": "String",
                        i18n: i18n( 'DCWindow.notice.title.error' ),
                        "-en": "Error",
                        "-de": "Fehler",
                        "default": ""
                    }
                },
                "EdocTypes_E": {
                    "type": ["String"],
                    "apiv": {v: 2, queryParam: false},
                    "list": [
                        {
                            "val": "EDMP",
                            "-de": "eDMP",
                            i18n: i18n( 'edmpdelivery-schema.EdocTypes_E.EDMP.i18n' ),
                            "-en": "eDMP"
                        },
                        {
                            "val": "EHKS",
                            "-de": "eHKS",
                            i18n: i18n( 'edmpdelivery-schema.EdocTypes_E.EHKS.i18n' ),
                            "-en": "eHKS"
                        }
                    ]
                },
                "Errors_E": {
                    "type": "String",
                    "list": [
                        {
                            "val": "",
                            "-de": "Bitte wählen",
                            i18n: i18n( 'edmpdelivery-schema.Errors_E' ),
                            "-en": "Please select"
                        },
                        {
                            "val": "1",
                            "-de": "Fehlende Schlüssel für XPacker",
                            i18n: i18n( 'edmpdelivery-schema.Errors_E.1.i18n' ),
                            "-en": "Missing Keys for XPacker"
                        },
                        {
                            "val": "2",
                            "-de": "Fehlende Konfigurationen für TPacker",
                            i18n: i18n( 'edmpdelivery-schema.Errors_E.2.i18n' ),
                            "-en": "Missing Configurations for XPacker"
                        }
                    ]
                }
            }
        );

        /**
         * Addressee can by either a IKNR number with 9 digits or UKV with 2 digits;
         *
         * @param addresseeIk
         * @return addresseeSchema
         */
        function getAddresseeSchema( addresseeIk ) {
            var addresseeSchema = '';
            if( addresseeIk && addresseeIk.length === 2 ) {
                addresseeSchema = 'UKV';
            } else if( addresseeIk && addresseeIk.length === 9 ) {
                addresseeSchema = 'IK';
            }
            return addresseeSchema;
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
            getAddresseeSchema: getAddresseeSchema
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'doccirrus',
            'dcvalidations',
            'employee-schema'
        ]
    }
);
