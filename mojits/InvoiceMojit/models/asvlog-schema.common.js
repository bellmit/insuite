/**
 * User: pi
 * Date: 16/08/16  10:55
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'asvlog-schema', function( Y, NAME ) {
        /**
         * The ASVLog entry schema,
         *
         * @module kbvlog-schema, log schema to keep track quarterly
         * of all the changes and status.
         */

        var
            ramlConfig = {
                // REST API v2. parameters
                "2": {
                    description: "The asvlog collection stores the results of an ASV CON file splitting."
                }
            },
            i18n = Y.doccirrus.i18n,
            types = {};

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "ASVLog_T",
                        "lib": types
                    }
                },
                "ASVLog_T": {
                    "invoiceLog": {
                        "complex": "ext",
                        "type": 'InvoiceLog_T',
                        "lib": "invoicelog"
                    },
                    "receiver": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'asvlog-schema.ASVLog_T.receiver.i18n' ),
                        "-en": i18n( 'asvlog-schema.ASVLog_T.receiver.i18n' ),
                        "-de": i18n( 'asvlog-schema.ASVLog_T.receiver.i18n' )
                    },
                    "insuranceId": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'asvlog-schema.ASVLog_T.insuranceId.i18n' ),
                        "-en": i18n( 'asvlog-schema.ASVLog_T.insuranceId.i18n' ),
                        "-de": i18n( 'asvlog-schema.ASVLog_T.insuranceId.i18n' )
                    },
                    "insuranceName": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'asvlog-schema.ASVLog_T.insuranceName.i18n' ),
                        "-en": i18n( 'asvlog-schema.ASVLog_T.insuranceName.i18n' ),
                        "-de": i18n( 'asvlog-schema.ASVLog_T.insuranceName.i18n' )
                    },
                    "receivingOrg": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'asvlog-schema.ASVLog_T.receivingOrg.i18n' ),
                        "-en": i18n( 'asvlog-schema.ASVLog_T.receivingOrg.i18n' ),
                        "-de": i18n( 'asvlog-schema.ASVLog_T.collectingPoint.i18n' )
                    },
                    "transferDate": {
                        "type": "Date",
                        "apiv": {v: 2, queryParam: true},
                        i18n: i18n( 'asvlog-schema.ASVLog_T.transferDate.i18n' ),
                        "-en": i18n( 'asvlog-schema.ASVLog_T.transferDate.i18n' ),
                        "-de": i18n( 'asvlog-schema.ASVLog_T.transferDate.i18n' )
                    },
                    "conFileName": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'kbvlog-schema.KBVLog_T.conFileName.i18n' ),
                        "-en": "conFileName",
                        "-de": "conFileName"
                    },
                    "conFileId": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: true},
                        i18n: i18n( 'kbvlog-schema.KBVLog_T.conFileId.i18n' ),
                        "-en": "conFileId",
                        "-de": "conFileId"
                    },
                    "pdfFileName": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'kbvlog-schema.KBVLog_T.conFileName.i18n' ),
                        "-en": "conFileName",
                        "-de": "conFileName"
                    },
                    "pdfFileId": {
                        "type": "String",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'kbvlog-schema.KBVLog_T.conFileId.i18n' ),
                        "-en": "conFileId",
                        "-de": "conFileId"
                    },
                    "asvTotal": {
                        "type": "Number",
                        "apiv": {v: 2, queryParam: false},
                        i18n: i18n( 'asvlog-schema.ASVLog_T.asvTotal.i18n' ),
                        "-en": i18n( 'asvlog-schema.ASVLog_T.asvTotal.i18n' ),
                        "-de": i18n( 'asvlog-schema.ASVLog_T.asvTotal.i18n' )
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
            ramlConfig: ramlConfig,
            name: NAME
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
