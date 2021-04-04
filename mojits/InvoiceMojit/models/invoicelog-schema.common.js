/**
 * User: do
 * Date: 26/05/15  11:25
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/**
 * (c) 2014, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'invoicelog-schema', function( Y, NAME ) {
        /**
         * The InvoiceLog entry schema,
         *
         * @module invoice-schema, log schema to keep track quarterly
         * of all the changes and status.
         */

        var
            LATEST_LOG_VERSION = '3',
            FEATURES = {
                SEE_CONTENT: {
                    fromVersion: 2,
                    allowedInvoiceTypes: ['PVS', 'KBV', 'KVG']
                },
                GKV_DELIVERY_SETTINGS_COLUMN: {
                    fromVersion: 3,
                    allowedInvoiceTypes: ['KBV']
                }
            },
            URL_CASEFILE = '/incase',
            URL_ADMIN_INSUITE = '/admin/insuite',
            schemaPathsMap = {
                location: {
                    path: URL_ADMIN_INSUITE,
                    hashPath: '/location/'
                },
                patient: {
                    path: URL_CASEFILE,
                    hashPath: '/patient/',
                    section: '/tab/casefile_browser',
                    caseFolder: '/casefolder/'
                },
                patient_browser: {
                    path: URL_CASEFILE
                },
                admin: {
                    path: URL_ADMIN_INSUITE
                },
                insuranceStatus: {
                    path: URL_CASEFILE,
                    hashPath: '/insurance/'
                },
                activity: {
                    path: URL_CASEFILE,
                    hashPath: '/activity/'
                },
                employee: {
                    path: URL_ADMIN_INSUITE,
                    hashPath: '/employee/'
                }
            },
            i18n = Y.doccirrus.i18n,
            types = {};

        function makeFeatureEnum() {
            var result = {};
            Object.keys( FEATURES ).forEach( function( key ) {
                result[key] = key;
            } );
            return result;
        }

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "InvoiceLog_T",
                        "lib": types
                    }
                },
                "Status_E": {
                    "type": "String",
                    "list": [
                        {
                            "val": "CREATED",
                            i18n: i18n( 'invoicelog-schema.Status_E.CREATED' ),
                            "-en": "created",
                            "-de": "erstellt"
                        },
                        {
                            "val": "REPLACING",
                            i18n: i18n( 'invoicelog-schema.Status_E.REPLACING' ),
                            "-en": "replacing",
                            "-de": "wird ersetzt"
                        },
                        {
                            "val": "REPLACED",
                            i18n: i18n( 'invoicelog-schema.Status_E.REPLACED' ),
                            "-en": "replaced",
                            "-de": "ersetzt"
                        },
                        {
                            "val": "REPLACE_ERR",
                            i18n: i18n( 'invoicelog-schema.Status_E.REPLACE_ERR' ),
                            "-en": "Replace error",
                            "-de": "Fehler beim Ersetzen"
                        },
                        {
                            "val": "INVALID",
                            i18n: i18n( 'invoicelog-schema.Status_E.INVALID' ),
                            "-en": "invalid",
                            "-de": "ungültig"
                        },
                        {
                            "val": "VALID",
                            i18n: i18n( 'invoicelog-schema.Status_E.VALID' ),
                            "-en": "valid",
                            "-de": "gültig"
                        },
                        {
                            "val": "MERGED",
                            i18n: i18n( 'invoicelog-schema.Status_E.MERGED' ),
                            "-en": "valid (MG)",
                            "-de": "gültig (ZG)"
                        },
                        {
                            "val": "VALIDATION_ERR",
                            i18n: i18n( 'invoicelog-schema.Status_E.VALIDATION_ERR' ),
                            "-en": "validation error",
                            "-de": "Validierungsfehler"
                        },
                        {
                            "val": "VALIDATING",
                            i18n: i18n( 'invoicelog-schema.Status_E.VALIDATING' ),
                            "-en": "validating",
                            "-de": "wird geprüft"
                        },
                        {
                            "val": "MERGING",
                            i18n: i18n( 'invoicelog-schema.Status_E.MERGING' ),
                            "-en": "merging",
                            "-de": "zusammenführen"
                        },
                        {
                            "val": "MERGING_ERR",
                            i18n: i18n( 'invoicelog-schema.Status_E.MERGING_ERR' ),
                            "-en": "merging error",
                            "-de": "Fehler zusammenführen"
                        },
                        {
                            "val": "APPROVING",
                            i18n: i18n( 'invoicelog-schema.Status_E.APPROVING' ),
                            "-en": "approving activities",
                            "-de": "wird freigegeben"
                        },
                        {
                            "val": "CRYPT_ERR",
                            i18n: i18n( 'invoicelog-schema.Status_E.CRYPT_ERR' ),
                            "-en": "encryption error",
                            "-de": "Verschüsselungsfehler"
                        },
                        {
                            "val": "ENCRYPTED",
                            i18n: i18n( 'invoicelog-schema.Status_E.ENCRYPTED' ),
                            "-en": "encrypted",
                            "-de": "verschlüsselt"
                        },
                        {
                            "val": "SENT_ERR",
                            i18n: i18n( 'invoicelog-schema.Status_E.SENT_ERR' ),
                            "-en": "send error",
                            "-de": "Sendefehler"
                        },
                        {
                            "val": "SENT",
                            i18n: i18n( 'invoicelog-schema.Status_E.SENT' ),
                            "-en": "sent",
                            "-de": "gesendet"
                        },
                        {
                            "val": "ACCEPTED",
                            i18n: i18n( 'invoicelog-schema.Status_E.ACCEPTED' ),
                            "-en": "accepted",
                            "-de": "akzeptiert"
                        },
                        {
                            "val": "REJECTED",
                            i18n: i18n( 'invoicelog-schema.Status_E.REJECTED' ),
                            "-en": "Rejected",
                            "-de": "abgewiesen"
                        },
                        {
                            "val": "ARCHIVED",
                            i18n: i18n( 'invoicelog-schema.Status_E.ARCHIVED' ),
                            "-en": "Archived",
                            "-de": "archiviert"
                        },
                        {
                            "val": "TIMEOUT",
                            i18n: i18n( 'invoicelog-schema.Status_E.TIMEOUT' ),
                            "-en": "timeout",
                            "-de": "time-out"
                        },
                        {
                            "val": "CANCELED",
                            i18n: i18n( 'invoicelog-schema.Status_E.CANCELED' ),
                            "-en": "canceled",
                            "-de": "abgebrochen"
                        },
                        {
                            "val": "SENDING",
                            i18n: i18n( 'invoicelog-schema.Status_E.SENDING' ),
                            "-en": "sending",
                            "-de": "wird gesendet"
                        },
                        {
                            "val": "INVOICING",
                            i18n: i18n( 'invoicelog-schema.Status_E.INVOICING' ),
                            "-en": "Invoicing",
                            "-de": "werden erzeugt"
                        },
                        {
                            "val": "INVOICED",
                            i18n: i18n( 'invoicelog-schema.Status_E.INVOICED' ),
                            "-en": "Invoice generated",
                            "-de": "Rechnungen erzeugt"
                        },
                        {
                            "val": "INVOICED_APPROVED",
                            i18n: i18n( 'invoicelog-schema.Status_E.INVOICED_APPROVED' ),
                            "-en": "Invoice approved",
                            "-de": "Rechnungen freigegeben"
                        }
                    ]
                },
                "InvoiceLog_T": {
                    "mainLocationId": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'invoicelog-schema.InvoiceLog_T._ERR.i18n' ),
                        "-en": "mainLocationId",
                        "-de": "mainLocationId"
                    },
                    "commercialNo": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'invoicelog-schema.InvoiceLog_T.commercialNo.i18n' ),
                        "-en": "Comercial No",
                        "-de": "BSNR"
                    },
                    "locname": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'invoicelog-schema.InvoiceLog_T.locname.i18n' ),
                        "-en": "locname",
                        "-de": "locname"
                    },
                    "countryCode": {
                        "type": "String",
                        i18n: i18n( 'person-schema.Address_T.countryCode' ),
                        "-en": "Country code",
                        "-de": "Ländercode"
                    },
                    "totalItems": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'invoicelog-schema.InvoiceLog_T.totalItems.i18n' ),
                        "-en": "Total Items",
                        "-de": "Scheine"
                    },
                    "user": {
                        "complex": "inc",
                        "type": "EmployeeShort_T",
                        "lib": "employee",
                        i18n: i18n( 'invoicelog-schema.InvoiceLog_T.user.i18n' ),
                        "-en": "editor",
                        "-de": "editor"
                    },
                    "lastUpdate": {
                        "type": "Date",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'invoicelog-schema.InvoiceLog_T.lastUpdate.i18n' ),
                        "-en": "Date",
                        "-de": "Datum"
                    },
                    "status": {
                        "complex": "eq",
                        "type": "Status_E",
                        "lib": types,
                        i18n: i18n( 'invoicelog-schema.InvoiceLog_T.status.i18n' ),
                        "-en": "Status",
                        "-de": "Status"
                    },
                    "_log_version": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'invoicelog-schema.InvoiceLog_T._log_version.i18n' ),
                        "-en": "_log_version",
                        "-de": "_log_version"
                    },
                    "created": {
                        "type": "Date",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'invoicelog-schema.InvoiceLog_T.created.i18n' ),
                        "-en": "valid from",
                        "-de": "gültig ab"
                    },
                    "isPreValidated": {
                        "default": false,
                        "type": Boolean,
                        i18n: i18n( 'invoicelog-schema.InvoiceLog_T.isPreValidated.i18n' ),
                        "-en": "isPreValidated",
                        "-de": "isPreValidated"
                    },
                    "isContentOutdated": {
                        "type": Boolean,
                        i18n: i18n( 'invoicelog-schema.InvoiceLog_T.isContentOutdated.i18n' ),
                        "-en": "Content outdated",
                        "-de": "Inhalt veraltet"
                    },
                    "notApproved": {
                        "default": [0, 0, 0],
                        "type": Array,
                        i18n: i18n( 'invoicelog-schema.InvoiceLog_T.notApproved.i18n' ),
                        "-en": "notApproved",
                        "-de": "notApproved"
                    },
                    "pid": { // used to determine which worker started invoice/approve process
                        "type": 'String',
                        i18n: i18n( 'invoicelog-schema.InvoiceLog_T.pid.i18n' ),
                        "-en": "pid",
                        "-de": "pid"
                    },
                    "priceTotal": {
                        "type": 'Number',
                        i18n: i18n( 'invoicelog-schema.InvoiceLog_T.priceTotal.i18n' ),
                        "-en": "Preis",
                        "-de": "Preis"
                    },
                    "pointsTotal": {
                        "type": 'Number',
                        i18n: i18n( 'invoicelog-schema.InvoiceLog_T.pointsTotal.i18n' ),
                        "-en": "Preis",
                        "-de": "Preis"
                    },
                    "pricePerPatient": {
                        "type": 'Number',
                        i18n: i18n( 'invoicelog-schema.InvoiceLog_T.pricePerPatient.i18n' ),
                        "-en": "Preis",
                        "-de": "Preis"
                    },
                    "pointsPerPatient": {
                        "type": 'Number',
                        i18n: i18n( 'invoicelog-schema.InvoiceLog_T.pointsPerPatient.i18n' ),
                        "-en": "Preis",
                        "-de": "Preis"
                    },
                    "replacedLogId": { // references a replacement invoice log ("Ersatzlieferung"))
                        "type": 'String',
                        i18n: i18n( 'invoicelog-schema.InvoiceLog_T.replacedLogId.i18n' ),
                        "-en": "replacedLogId",
                        "-de": "replacedLogId"
                    },
                    "replacement": {
                        "default": false,
                        "type": Boolean,
                        i18n: i18n( 'kbvlog-schema.KBVLog_T.replacement.i18n' ),
                        "-en": "replacement",
                        "-de": "Ersatz"
                    },
                    "version": {
                        "type": Number,
                        i18n: i18n( 'kbvlog-schema.KBVLog_T.version.i18n' ),
                        "-en": "version",
                        "-de": "Version"
                    },
                    "excludedPatientIds": {
                        "type": ["String"],
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'invoicelog-schema.InvoiceLog_T.excludedPatientIds.i18n' ),
                        "-en": i18n( 'invoicelog-schema.InvoiceLog_T.excludedPatientIds.i18n' ),
                        "-de": i18n( 'invoicelog-schema.InvoiceLog_T.excludedPatientIds.i18n' )
                    },
                    "mediportNotAllowedPatientIds": {
                        "type": ["String"],
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'invoicelog-schema.InvoiceLog_T.mediportNotAllowedPatientIds.i18n' ),
                        "-en": i18n( 'invoicelog-schema.InvoiceLog_T.mediportNotAllowedPatientIds.i18n' ),
                        "-de": i18n( 'invoicelog-schema.InvoiceLog_T.mediportNotAllowedPatientIds.i18n' )
                    },
                    "excludedScheinIds": {
                        "type": ["String"],
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'invoicelog-schema.InvoiceLog_T.excludedScheinIds.i18n' ),
                        "-en": i18n( 'invoicelog-schema.InvoiceLog_T.excludedScheinIds.i18n' ),
                        "-de": i18n( 'invoicelog-schema.InvoiceLog_T.excludedScheinIds.i18n' )
                    },
                    "unknownInsuranceScheinIds": {
                        "type": ["String"],
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'invoicelog-schema.InvoiceLog_T.unknownInsuranceScheinIds.i18n' ),
                        "-en": i18n( 'invoicelog-schema.InvoiceLog_T.unknownInsuranceScheinIds.i18n' ),
                        "-de": i18n( 'invoicelog-schema.InvoiceLog_T.unknownInsuranceScheinIds.i18n' )
                    }
                }
            }
        );

        function hasFeature( featureName, version, invoiceType ) {
            var feature;
            version = +('object' === typeof version ? version._log_version : version);

            if( !featureName || !version || !invoiceType ) {
                return false;
            }

            feature = FEATURES[featureName];

            if( !feature ) {
                throw Error( 'feature not found' );
            }

            if( -1 === feature.allowedInvoiceTypes.indexOf( invoiceType ) ) {
                return false;
            }

            return version >= feature.fromVersion;
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
            LATEST_LOG_VERSION: LATEST_LOG_VERSION,
            schemaPathsMap: schemaPathsMap,
            hasFeature: hasFeature,
            FEATURES: makeFeatureEnum()
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'doccirrus',
            'dcvalidations'
        ]
    }
);
