/**
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'pvslog-schema', function( Y, NAME ) {
        /**
         * The PVSLog entry schema,
         *
         * @module PVSLog-schema, log schema to keep track quarterly
         * of all the changes and status.
         */

        var types = {},
            i18n = Y.doccirrus.i18n;

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "PVSLog_T",
                        "lib": types
                    }
                },
                "PVSError_T": {
                    "text": {
                        "type": "String",
                        i18n: i18n( 'kbvlog-schema.KBVError_T.text.i18n' ),
                        "-en": "Text",
                        "-de": "Text"
                    },
                    "link": {
                        "type": "String",
                        i18n: i18n( 'kbvlog-schema.KBVError_T.link.i18n' ),
                        "-en": "link",
                        "-de": "Link"
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
                    }
                },
                "PVSLog_T": {
                    "invoiceLog": {
                        "complex": "ext",
                        "type": 'InvoiceLog_T',
                        "lib": "invoicelog"
                    },
                    "padnextFileName": {
                        "type": "String",
                        i18n: i18n( 'pvslog-schema.PVSLog_T.padnextFileName.i18n' ),
                        "-en": "padnextFileName",
                        "-de": "padnextFileName"
                    },
                    "padnextFileId": {
                        "type": "String",
                        i18n: i18n( 'pvslog-schema.PVSLog_T.padnextFileId.i18n' ),
                        "-en": "padnextFileId",
                        "-de": "padnextFileId"
                    },
                    "padnextSettingId": {
                        "type": "String",
                        i18n: i18n( 'pvslog-schema.PVSLog_T.padnextSettingId.i18n' ),
                        "-en": "padnextSettingId",
                        "-de": "padnextSettingId"
                    },
                    "padnextSettingTitle": {
                        "type": "String",
                        i18n: i18n( 'pvslog-schema.PVSLog_T.padnextSettingTitle.i18n' ),
                        "-en": "padnextSettingTitle",
                        "-de": "padnextSettingTitle"
                    },
                    "padnextSettingCustomerNo": {
                        "type": "String",
                        i18n: i18n( 'pvslog-schema.PVSLog_T.padnextSettingCustomerNo.i18n' ),
                        "-en": "padnextSettingCustomerNo",
                        "-de": "padnextSettingCustomerNo"
                    },
                    "encryptedPadnextFileName": {
                        "type": "String",
                        i18n: i18n( 'pvslog-schema.PVSLog_T.encryptedPadnextFileName.i18n' ),
                        "-en": "encryptedPadnextFileName",
                        "-de": "encryptedPadnextFileName"
                    },
                    "encryptedPadnextFileId": {
                        "type": "String",
                        i18n: i18n( 'pvslog-schema.PVSLog_T.encryptedPadnextFileId.i18n' ),
                        "-en": "encryptedPadnextFileId",
                        "-de": "encryptedPadnextFileId"
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
                    //  If true then patients/cases will be filtered by a list of specific insurance providers
                    "useInsuranceStatus": {
                        "type": "Boolean",
                        i18n: i18n( 'pvslog-schema.PVSLog_T.useInsuranceStatus.i18n' ),
                        "-en": "Use Insurance Liste",
                        "-de": "Verwenden Kostenträger Liste"
                    },
                    "insuranceStatus": {
                        "complex": "inc",
                        "type": "InsuranceDescriptor_T",
                        "lib": types,
                        i18n: i18n( 'pvslog-schema.PVSLog_T.insuranceStatus.i18n' ),
                        "-en": "Insurance Companies",
                        "-de": "Kostenträger"
                    },
                    "withEmptyInsurance": {
                        "type": "Boolean",
                        i18n: i18n( 'pvslog-schema.PVSLog_T.withEmptyInsurance.i18n' ),
                        "-en": "Include unspecified PVS insurance",
                        "-de": "Include unspecified PVS insurance"
                    },
                    "minTotal": {
                        "type": "Number",
                        i18n: i18n( 'pvslog-schema.PVSLog_T.minTotal.i18n' ),
                        "-en": i18n( 'pvslog-schema.PVSLog_T.minTotal.i18n' ),
                        "-de": i18n( 'pvslog-schema.PVSLog_T.minTotal.i18n' )
                    },
                    "doNotcheckCatalog": {
                        "type": 'Boolean',
                        "default": true,
                        i18n: i18n( 'invoiceentry-schema.PVSLog_T.doNotcheckCatalog.i18n' ),
                        "-en": i18n( 'invoiceentry-schema.PVSLog_T.doNotcheckCatalog.i18n' ),
                        "-de": i18n( 'invoiceentry-schema.PVSLog_T.doNotcheckCatalog.i18n' )
                    },
                    "employeeFilterEnabled": {
                        "type": 'Boolean',
                        "default": true,
                        i18n: i18n( 'invoiceentry-schema.PVSLog_T.employeeFilterEnabled.i18n' ),
                        "-en": i18n( 'invoiceentry-schema.PVSLog_T.employeeFilterEnabled.i18n' ),
                        "-de": i18n( 'invoiceentry-schema.PVSLog_T.employeeFilterEnabled.i18n' )
                    },
                    "employees": {
                        "complex": "inc",
                        "type": "PVSEmployee_T",
                        "lib": types,
                        i18n: i18n( 'pvslog-schema.PVSEmployee_T.employees.i18n' ),
                        "-en": "employees",
                        "-de": "employees"
                    }

                },
                "InsuranceDescriptor_T": {
                    "_id": {
                        "type": "String",
                        "i18n": i18n('pvslog-schema.InsuranceDescriptor_T._id.i18n'),
                        "-en": "Insurance ID",
                        "-de": "Insurance ID"
                    },
                    "name": {
                        "type": "String",
                        "i18n": i18n('pvslog-schema.InsuranceDescriptor_T.name.i18n'),
                        "-en": "Insurance name",
                        "-de": "Versicherungsname"
                    },
                    "type": {
                        "type": "String",
                        "i18n": i18n('pvslog-schema.InsuranceDescriptor_T.type.i18n'),
                        "-en": "Insurance category",
                        "-de": "Insurance category"
                    }
                },
                "PVSEmployee_T": {
                    "_id": {
                        "type": "String",
                        "i18n": i18n('pvslog-schema.PVSEmployee_T._id.i18n'),
                        "-en": "_id",
                        "-de": "_id"
                    },
                    "firstname": {
                        "type": "String",
                        "i18n": i18n('pvslog-schema.PVSEmployee_T.firstname.i18n'),
                        "-en": "firstname",
                        "-de": "firstname"
                    },
                    "lastname": {
                        "type": "String",
                        "i18n": i18n('pvslog-schema.PVSEmployee_T.lastname.i18n'),
                        "-en": "lastname",
                        "-de": "lastname"
                    }
                }
            }
        );

        /**
         *  Insurance / casefolder types which may be added to log
         *  @return {string[]}
         */

        function getInsuranceTypes() { return [ 'BG', 'PRIVATE', 'SELFPAYER' ]; }

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */

        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,
            /* OPTIONAL default items to be written to the DB on startup */
            defaultItems: [],
            getInsuranceTypes: getInsuranceTypes,
            name: NAME
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
