/**
 * User: rrrw
 * Date: 16/11/2012  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
'use strict';
YUI.add( 'company-schema', function( Y, NAME ) {
        var
            // ------- Schema definitions  -------
            companyHelper = Y.doccirrus.companyLib,
            types = {},
            i18n = Y.doccirrus.i18n,
            serverTypes = Object.freeze( {
                PRC: 'PRC',
                VPRC: 'MTS',
                ISD: 'ISD'
            } );

        function getLicenseT() {
            var
                result = Y.mix( {}, Y.doccirrus.schemas.settings.licenseSchema.LicenseScope_T );
            Object.keys( result ).forEach( function( licenseCategory ) {
                if( result[ licenseCategory ].complex ) {
                    result[ licenseCategory ].lib = types;
                }
            } );
            return result;
        }

        function createSchemaServerTypeList() {
            var
                result = [];
            Object.keys( serverTypes ).forEach( function( type ) {
                result.push( {
                    val: serverTypes[ type ],
                    i18n: i18n( 'customer-schema.serverType_E.' + serverTypes[ type ] + '.i18n' ),
                    '-en': i18n( 'customer-schema.serverType_E.' + serverTypes[ type ] + '.i18n' ),
                    '-de': i18n( 'customer-schema.serverType_E.' + serverTypes[ type ] + '.i18n' )
                } );
            } );

            return result;
        }

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        types = Y.mix( types, {
                "root": {
                    base: {
                        "complex": "ext",
                        "type": "Company_T",
                        "lib": types
                    }
                },
                "base_Company_T": {
                    communications: {
                        "complex": "inc",
                        "type": "Communication_T",
                        "apiv": { v: 2, queryParam: false },
                        "lib": 'person',
                        i18n: i18n( 'person-schema.JuristicPerson_T.communications' ),
                        "-en": "communications",
                        "-de": "communications"
                    },
                    "inTimeID": {
                        "type": "String",
                        i18n: i18n( 'person-schema.Company_T.inTimeID' ),
                        "-en": "inTimeID",
                        "-de": "inTimeID"
                    },
                    "coname": {
                        "type": "String",
                        "required": "true",
                        i18n: i18n( 'person-schema.Company_T.coname' ),
                        "apiv": { v: 2, queryParam: false },
                        "-en": "coname",
                        "-de": "coname"
                    },
                    "cotype": {
                        "complex": "eq",
                        "type": "CompanyType_E",
                        "lib": types,
                        i18n: i18n( 'person-schema.Company_T.cotype' ),
                        "apiv": { v: 2, queryParam: true },
                        "-en": "cotype",
                        "-de": "cotype"
                    },
                    "addresses": {
                        "complex": "inc",
                        "type": "Address_T",
                        "lib": 'person',
                        "validate": "Company_T_addresses",
                        i18n: i18n( 'person-schema.JuristicPerson_T.addresses' ),
                        "apiv": { v: 2, queryParam: false },
                        "-en": "Addresses",
                        "-de": "Adressen"
                    },
                    "deleted": {
                        "type": "boolean",
                        i18n: i18n( 'person-schema.Company_T.deleted' ),
                        "-en": "deleted",
                        "-de": "deleted"
                    },
                    "deletedName": {
                        "type": "String",
                        i18n: i18n( 'person-schema.Company_T.deletedName' ),
                        "apiv": { v: 2, queryParam: true },
                        "-en": "Deleted Contact Lastname",
                        "-de": "Name des Kontakts"
                    },
                    "customerNo": {
                        "type": "String",
                        "unique": true,
                        "key": true,
                        "validate": "Company_T_customerNo",
                        i18n: i18n( 'customer-schema.base.customerNo.i18n' ),
                        "-en": "customerNo",
                        "-de": "customerNo"
                    },
                    "dcCustomerNo": {
                        "type": "String",
                        "unique": true,
                        "key": true,
                        i18n: i18n( 'customer-schema.base.dcCustomerNo.i18n' ),
                        "-en": "customerNo",
                        "-de": "customerNo"
                    },
                    "vprcFQHostName": {
                        "type": "String",
                        "validate": "Company_T_vprcFQHostName",
                        i18n: i18n( 'customer-schema.base.vprcFQHostName.i18n' ),
                        "-en": "vprcHost",
                        "-de": "vprcHost"
                    },
                    "vprcFQHostnameOverrideFlag": {
                        "type": "Boolean",
                        i18n: i18n( 'customer-schema.base.vprcFQHostnameOverrideFlag.i18n' ),
                        "-en": "vprcFQHostnameOverrideFlag",
                        "-de": "vprcFQHostnameOverrideFlag"
                    },
                    "systemId": {
                        "type": "String",
                        "validate": "Company_T_systemId",
                        i18n: i18n( 'customer-schema.base.systemId.i18n' ),
                        "-en": "systemId",
                        "-de": "systemId"
                    },
                    "encryptedSystemId": {
                        "type": "String",
                        i18n: i18n( 'customer-schema.base.encryptedSystemId.i18n' ),
                        "-en": "encryptedSystemId",
                        "-de": "encryptedSystemId"
                    },
                    "commissionKey": {
                        "type": "String",
                        i18n: i18n( 'customer-schema.base.commissionKey.i18n' ),
                        "-en": "Commission Key",
                        "-de": "Commission Key"
                    },
                    "commissionKeyCreatedAt": {
                        "type": "Date",
                        i18n: i18n( 'customer-schema.base.commissionKeyCreatedAt.i18n' ),
                        "-en": "Commission Key created at",
                        "-de": "Commission Key erzeugt am"
                    },
                    "ticketLabel": {
                        "type": "String",
                        i18n: i18n( 'customer-schema.base.ticketLabel.i18n' ),
                        "-en": "Customer Label",
                        "-de": "Ticket Label"
                    },
                    "tenantId": {
                        "type": "String",
                        i18n: i18n( 'customer-schema.base.tenantId.i18n' ),
                        "apiv": { v: 2, queryParam: false },
                        "-en": "tenantId",
                        "-de": "tenantId"
                    },
                    "activeState": {
                        "type": "Boolean",
                        i18n: i18n( 'customer-schema.base.activeState.i18n' ),
                        "apiv": { v: 2, queryParam: true },
                        "-en": "activeState",
                        "-de": "activeState"
                    },
                    "prodServices": {
                        "complex": "inc",
                        "type": "ProdService_T",
                        "lib": types,
                        i18n: i18n( 'customer-schema.base.prodServices.i18n' ),
                        "-en": "prodServices",
                        "-de": "prodServices"
                    },
                    "centralContact": {
                        "type": "String",
                        "future": "foreignkey.Contact_T",
                        i18n: i18n( 'customer-schema.base.centralContact.i18n' ),
                        "-en": "centralContact",
                        "-de": "centralContact"
                    },
                    "supportContact": {
                        "type": "ObjectId",
                        i18n: i18n( 'customer-schema.base.supportContact.i18n' )
                    },
                    "systemType": {
                        complex: 'eq',
                        type: 'systemType_E',
                        lib: types
                    },
                    "serverType": {
                        complex: 'eq',
                        type: 'serverType_E',
                        lib: types
                    },
                    "licenseScope": {
                        "complex": "inc",
                        "type": "LicenseScope_T",
                        "lib": types
                    },
                    "releaseGroup": {
                        "type": "Number",
                        i18n: i18n( 'customer-schema.base.releaseGroup.i18n' ),
                        "-en": "releaseGroup",
                        "-de": "releaseGroup"
                    },
                    "countryMode": {
                        "complex": "eq",
                        "type": "CountryMode_E",
                        "validate": "Company_T_countryMode",
                        "lib": types
                    },
                    "version": {
                        "type": "String",
                        i18n: i18n( 'customer-schema.base.version.i18n' ),
                        "-en": "version",
                        "-de": "version"
                    },
                    "appsMetaData": {
                        "complex": "inc",
                        "type": "AppsMetaData_T",
                        "lib": types
                    }
                },
                "Company_T": {
                    base_Company: {
                        "complex": "ext",
                        "type": "base_Company_T",
                        "lib": types
                    },
                    "tenants": {
                        "complex": "inc",
                        "type": "Tenants_T",
                        "lib": types
                    }
                },
                "Tenants_T": {
                    base_Company: {
                        "complex": "ext",
                        "type": "base_Company_T",
                        "lib": types
                    },
                    "customerNo": {
                        "type": "String",
                        override: true,
                        i18n: i18n( 'customer-schema.Tenants_T.customerNo.i18n' ),
                        "-en": i18n( 'customer-schema.Tenants_T.customerNo.i18n' ),
                        "-de": i18n( 'customer-schema.Tenants_T.customerNo.i18n' )
                    },
                    "dcCustomerNo": {
                        required: true,
                        override: true,
                        "type": "String",
                        i18n: i18n( 'customer-schema.Tenants_T.dcCustomerNo.i18n' ),
                        "-en": i18n( 'customer-schema.Tenants_T.dcCustomerNo.i18n' ),
                        "-de": i18n( 'customer-schema.Tenants_T.dcCustomerNo.i18n' )
                    },
                    "tenantId": {
                        required: true,
                        override: true,
                        "type": "String",
                        i18n: i18n( 'customer-schema.Tenants_T.tenantId.i18n' ),
                        "-en": i18n( 'customer-schema.Tenants_T.tenantId.i18n' ),
                        "-de": i18n( 'customer-schema.Tenants_T.tenantId.i18n' )
                    },
                    "centralContact": {
                        "type": "any",
                        i18n: i18n( 'customer-schema.base.centralContact.i18n' ),
                        "override": true,
                        "lib": types
                    },
                    "supportContact": {
                        "type": "any",
                        i18n: i18n( 'customer-schema.base.supportContact.i18n' ),
                        "override": true,
                        "lib": types
                    }
                },
                "systemType_E": {
                    type: 'String',
                    list: companyHelper.createSchemaSystemTypeList(),
                    required: true,
                    i18n: i18n( 'customer-schema.systemType_E.i18n' ),
                    '-en': i18n( 'customer-schema.systemType_E.i18n' ),
                    '-de': i18n( 'customer-schema.systemType_E.i18n' )
                },
                "serverType_E": {
                    type: 'String',
                    required: true,
                    list: createSchemaServerTypeList(),
                    i18n: i18n( 'customer-schema.serverType_E.i18n' ),
                    '-en': i18n( 'customer-schema.serverType_E.i18n' ),
                    '-de': i18n( 'customer-schema.serverType_E.i18n' )
                },
                "LicenseScope_T": getLicenseT(),
                "ProdService_T": {
                    "from": {
                        "type": "Date",
                        i18n: i18n( 'customer-schema.ProdService_T.from.i18n' ),
                        "-en": "from",
                        "-de": "from"
                    },
                    "to": {
                        "type": "Date",
                        i18n: i18n( 'customer-schema.ProdService_T.to.i18n' ),
                        "-en": "to",
                        "-de": "to"
                    },
                    "ps": {
                        "complex": "eq",
                        "type": "ProdService_E",
                        "lib": types,
                        i18n: i18n( 'customer-schema.ProdService_T.ps.i18n' ),
                        "-en": "ps",
                        "-de": "ps"
                    },
                    "config": {
                        "complex": "ext",
                        "type": "ProdConfig_T",
                        "lib": types
                    }
                },
                "ProdService_E": {
                    "type": "string",
                    "list": [
                        {
                            "val": "MISCORE",
                            i18n: i18n( 'customer-schema.ProdService_E.MISCORE' ),
                            "-en": "miscore",
                            "-de": "miscore"
                        },
                        {
                            "val": "NEWSLETTER",
                            i18n: i18n( 'customer-schema.ProdService_E.NEWSLETTER' ),
                            "-en": "newsletter",
                            "-de": "newsletter"
                        },
                        {
                            "val": "VPRC",
                            i18n: i18n( 'customer-schema.ProdService_E.VPRC' ),
                            "-en": "vprc",
                            "-de": "vprc"
                        },
                        {
                            "val": "NETKPI",
                            i18n: i18n( 'customer-schema.ProdService_E.NETKPI' ),
                            "-en": "netkpi",
                            "-de": "netkpi"
                        },
                        {
                            "val": "DRGCOCKPIT",
                            i18n: i18n( 'customer-schema.ProdService_E.DRGCOCKPIT' ),
                            "-en": "drgcockpit",
                            "-de": "drgcockpit"
                        },
                        {
                            "val": "QUESTIONAIRE",
                            i18n: i18n( 'customer-schema.ProdService_E.QUESTIONAIRE' ),
                            "-en": "questionaire",
                            "-de": "questionaire"
                        },
                        {
                            "val": "INTIME",
                            i18n: i18n( 'customer-schema.ProdService_E.INTIME' ),
                            "-en": "intime",
                            "-de": "intime"
                        },
                        {
                            "val": "INTIME+",
                            i18n: i18n( 'customer-schema.ProdService_E.INTIME+' ),
                            "-en": "intime+",
                            "-de": "intime+"
                        },
                        {
                            "val": "INTIMECONNECT",
                            i18n: i18n( 'customer-schema.ProdService_E.INTIMECONNECT' ),
                            "-en": "intimeconnect",
                            "-de": "intimeconnect"
                        },
                        {
                            "val": "COMMUNITY",
                            i18n: i18n( 'customer-schema.ProdService_E.COMMUNITY' ),
                            "-en": "community",
                            "-de": "community"
                        },
                        {
                            "val": "SMS",
                            i18n: i18n( 'customer-schema.ProdService_E.SMS' ),
                            "-en": "sms",
                            "-de": "sms"
                        },
                        {
                            "val": "PTI",
                            i18n: i18n( 'customer-schema.ProdService_E.PTI' ),
                            "-en": "pti",
                            "-de": "pti"
                        },
                        {
                            "val": "other",
                            i18n: i18n( 'customer-schema.ProdService_E.other' ),
                            "-en": "other",
                            "-de": "other"
                        },
                        {
                            "val": "PPRC",
                            i18n: i18n( 'customer-schema.ProdService_E.PPRC' ),
                            "-en": "pprc",
                            "-de": "pprc"
                        }
                    ]
                },
                "ProdConfig_T": {
                    "config": {
                        "complex": "inc",
                        "type": "ConfigKeyValue_T",
                        "lib": types,
                        i18n: i18n( 'customer-schema.ProdConfig_T.config.i18n' ),
                        "-en": "config",
                        "-de": "config"
                    }
                },
                "ConfigKeyValue_T": {
                    "key": {
                        "type": "String",
                        i18n: i18n( 'customer-schema.ConfigKeyValue_T.key.i18n' ),
                        "-en": "key",
                        "-de": "key"
                    },
                    "value": {
                        "type": "String",
                        i18n: i18n( 'customer-schema.ConfigKeyValue_T.value.i18n' ),
                        "-en": "value",
                        "-de": "value"
                    }
                },
                "AppsMetaData_T": {
                    "appName": {
                        "type": "String",
                        i18n: i18n( '' ),
                        "-en": "appName",
                        "-de": "appName"
                    },
                    "version": {
                        "type": "String",
                        i18n: i18n( '' ),
                        "-en": "version",
                        "-de": "version"
                    },
                    "vendor": {
                        "type": "String",
                        i18n: i18n( '' ),
                        "-en": "solVendor",
                        "-de": "solVendor"
                    },
                    "latestReleaseDate": {
                        "type": "Date",
                        i18n: i18n( '' ),
                        "-en": "latestReleaseDate",
                        "-de": "latestReleaseDate"
                    }
                },
                "CompanyType_E": {
                    "required": true,
                    "type": "string",
                    "version": 1,
                    "list": [
                        {
                            "val": "ARZTPRAXIS",
                            i18n: i18n( 'person-schema.CompanyType_E.ARZTPRAXIS' ),
                            "-en": "Physician Practice",
                            "-de": "Arztpraxis"
                        },
                        {
                            "val": "MVZ",
                            i18n: i18n( 'person-schema.CompanyType_E.MVZ' ),
                            "-en": "MVZ",
                            "-de": "MVZ"
                        },
                        {
                            "val": "KLINIK",
                            i18n: i18n( 'person-schema.CompanyType_E.KLINIK' ),
                            "-en": "Clinic",
                            "-de": "Klink"
                        },
                        {
                            "val": "ARZTNETZWERK",
                            i18n: i18n( 'person-schema.CompanyType_E.ARZTNETZWERK' ),
                            "-en": "Medical Network",
                            "-de": "Arztnetzwerk"
                        },
                        {
                            "val": "BEHOERDE",
                            i18n: i18n( 'person-schema.CompanyType_E.BEHOERDE' ),
                            "-en": "Authority",
                            "-de": "Behörde"
                        },
                        {
                            "val": "SONSTIGE",
                            i18n: i18n( 'person-schema.CompanyType_E.SONSTIGE' ),
                            "-en": "Other",
                            "-de": "Sonstige"
                        }
                    ],
                    i18n: i18n( 'person-schema.CompanyType_E.i18n' )
                },
                "telematikServices_E": Y.doccirrus.schemas.settings.licenseSchema.telematikServices_E,
                "specialModules_E": Y.doccirrus.schemas.settings.licenseSchema.specialModules_E,
                "baseSystemLevel_E": Y.doccirrus.schemas.settings.licenseSchema.baseSystemLevel_E,
                "baseServices_E": Y.doccirrus.schemas.settings.licenseSchema.baseServices_E,
                "additionalServices_E": Y.doccirrus.schemas.settings.licenseSchema.additionalServices_E,
                "supportLevel_E": Y.doccirrus.schemas.settings.licenseSchema.supportLevel_E,
                "CountryMode_E": {
                    "type": ["String"],
                    i18n: i18n( 'customer-schema.base.countryMode.i18n' ),
                    "-en": "Länder Modus",
                    "-de": "Country Mode",
                    "list": [
                        {
                            "val": "D",
                            i18n: i18n( 'customer-schema.CountryMode_E.D' )
                        },
                        {
                            "val": "CH",
                            i18n: i18n( 'customer-schema.CountryMode_E.CH' )
                        }
                    ]
                }
            }
        );

        /**
         * Checks if current service has isTemplate flag in config
         * @param {Object} service
         * @returns {boolean}
         */
        function isTemplate( service ) {

            if( !service || !service.config ) {
                return false;
            }

            return service.config.some( function( config ) {
                if( 'isTemplate' === config.key && 'true' === config.value ) {
                    return true;
                }
                return false;
            } );
        }

        /**
         * Gets licenseScope which contains trial dates for service.
         * @param {Object} companyData company data
         * @param {String} [serviceName] service name, default trial dates of (v)prc(licenseScope[0])
         * @returns {Object}
         */
        function getTrialService( companyData, serviceName ) {
            var
                licenseScope;
            if( !serviceName ) {
                licenseScope = companyData && companyData.licenseScope && companyData.licenseScope[ 0 ];
                return licenseScope;
            }
        }

        /**
         * Gets object with trial dates for prc
         * @param {Object} companyData
         * @returns {Object}
         */
        function getTrialDates( companyData ) {
            var
                licenseScope,
                dates = {
                    trialExpire: null,
                    trialBegin: null
                };
            licenseScope = companyData && companyData.licenseScope && companyData.licenseScope[ 0 ];
            if( licenseScope && licenseScope.trialExpire ) {
                dates.trialExpire = licenseScope.trialExpire;
                dates.trialBegin = licenseScope.trialBegin;
            } else {
                companyData.prodServices.some( function( service ) {
                    if( 'INTIMECONNECT' === service.ps ) {
                        dates.trialExpire = service.to;
                        dates.trialBegin = service.from;
                        return true;
                    }
                    return false;
                } );
            }
            return dates;
        }

        /**
         * Class REST Schemas
         */
        Y.namespace( 'doccirrus.schemas' )[ NAME ] = {

            /* MANDATORY */
            name: NAME,

            /* MANDATORY */
            types: types,
            getTrialService: getTrialService,
            getTrialDates: getTrialDates,
            getLicenseT: getLicenseT,
            //
            //
            /*   Custom Functions     */
            isTemplate: isTemplate,
            systemTypes: companyHelper.systemTypes,
            serverTypes: serverTypes

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[ NAME ], true );
    },
    '0.0.1', { requires: [ 'company-lib', 'dcvalidations', 'dcschemaloader', 'person-schema', 'settings-schema' ] }
);
