/**
 * User: oliversieweke
 * Date: 23.11.18  15:34
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'tarmedlog-schema', function( Y, NAME ) {
        /**
         * The TarmedLog entry schema,
         *
         * @module tarmedlog-schema.
         */

        var
            i18n = Y.doccirrus.i18n,
            types = {};

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "TarmedLog_T",
                        "lib": types
                    }
                },
                "TarmedLog_T": {
                    "invoiceLog": {
                        "complex": "ext",
                        "type": 'InvoiceLog_T',
                        "lib": "invoicelog"
                    },
                    //  only considered if useStartDate is true
                    "startDate": {
                        "type": "Date",
                        i18n: i18n( 'pvslog-schema.PVSLog_T.startDate.i18n' ),
                        "-en": "Start Date",
                        "-de": "Anfangsdatum"
                    },
                    "useStartDate": {
                        "type": "Boolean",
                        "default": true,
                        i18n: i18n( 'pvslog-schema.PVSLog_T.useStartDate.i18n' ),
                        "-en": "Use Start Date",
                        "-de": "Verwenden Anfangsdatum"
                    },
                    //  only considered if useEndDate is true
                    "endDate": {
                        "type": "Date",
                        i18n: i18n( 'pvslog-schema.PVSLog_T.endDate.i18n' ),
                        "-en": "End Date",
                        "-de": "Enddatum"
                    },
                    "useEndDate": {
                        "type": "Boolean",
                        "default": true,
                        i18n: i18n( 'pvslog-schema.PVSLog_T.useEndDate.i18n' ),
                        "-en": "Use End Date",
                        "-de": "Verwenden Enddatum"
                    },
                    //  If missing or empty this will be treated as matching all private insurance types
                    "insuranceTypes": {
                        "type": ["String"],
                        i18n: i18n( 'pvslog-schema.PVSLog_T.insuranceTypes.i18n' ),
                        "-en": "Insurance Types",
                        "-de": "Versicherungsarten"
                    },
                    "minTotal": {
                        "type": "Number",
                        i18n: i18n( 'pvslog-schema.PVSLog_T.minTotal.i18n' ),
                        "-en": i18n( 'pvslog-schema.PVSLog_T.minTotal.i18n' ),
                        "-de": i18n( 'pvslog-schema.PVSLog_T.minTotal.i18n' )
                    },
                    "kvgSettingTitle": {
                        "type": "String",
                        "required": true,
                        i18n: i18n( 'invoiceconfiguration-schema.KvgSetting_T.kvgSettingTitle' )
                    },
                    "law": {
                        "type": "String",
                        "default": "KVG",
                        "required": true
                    },
                    "employees": {
                        "complex": "inc",
                        "type": "EmployeeShort_KVG_T",
                        i18n: i18n( 'invoiceconfiguration-schema.KvgSetting_T.physicians' ),
                        "lib": 'invoiceconfiguration'
                    },
                    "billerEqualToProvider": {
                        "type": "Boolean",
                        "default": true,
                        i18n: i18n( 'invoiceconfiguration-schema.KvgSetting_T.billerEqualToProvider' )
                    },
                    "biller": {
                        "complex": "eq",
                        "type": "EmployeeOrLocationShort_KVG_T",
                        i18n: i18n( 'invoiceconfiguration-schema.KvgSetting_T.biller' ),
                        "lib": 'invoiceconfiguration'
                    },
                    "output": {
                        "complex": "inc",
                        "type": "SumexError_T",
                        "lib": types,
                        i18n: i18n( 'kbvlog-schema.KBVLog_T.output.i18n' ),
                        "-en": "Errors",
                        "-de": "Errors"
                    },
                    "warnings": {
                        "complex": "inc",
                        "type": "SumexError_T",
                        "lib": types,
                        i18n: i18n( 'kbvlog-schema.KBVLog_T.warnings.i18n' ),
                        "-en": "Warnings",
                        "-de": "Warnungen"
                    },
                    "invoiceDocs": {
                        "type": ["object"],
                        "default": []
                    },
                    "deliveryType": {
                        "type": "String",
                        "default": ""
                    },
                    "isTiersGarant": {
                        "type": "Boolean",
                        "default": false
                    },
                    "isTiersPayant": {
                        "type": "Boolean",
                        "default": true
                    },
                    "pdfFile": {
                        "type": "String",
                        "default": ""
                    },
                    "collectMedidataRejected": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'tarmedlog-schema.TarmedLog_T.collectMedidataRejected.i18n' ),
                        "-en": "Rejected invoices",
                        "-de": "Abgelehnte Abrechnungen"
                    },
                    "firstCollecting": {
                        "type": "Boolean",
                        "default": true,
                        i18n: i18n( 'tarmedlog-schema.TarmedLog_T.firstCollecting.i18n' ),
                        "-en": "Fist collecting",
                        "-de": "Erste sammeln"
                    }
                },
                "SumexError_T": {
                    "text": {
                        "type": "String",
                        i18n: i18n( 'kbvlog-schema.KBVError_T.text.i18n' ),
                        "-en": "Text",
                        "-de": "Text"
                    }
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,
            /* OPTIONAL default items to be written to the DB on startup */
            defaultItems: [],
            name: NAME
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'doccirrus',
            'dcvalidations',
            'invoiceconfiguration-schema'
        ]
    }
);
