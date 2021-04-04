/*global YUI */

'use strict';

YUI.add( 'settings-schema', function( Y, NAME ) {

        /**
         * The Settings_T entry schema.
         *
         * These are general settings that are kept for each tenant.  I.e. per tenant settings, or
         * settings that are related to user data and not to the functioning of the server as a whole.
         *
         * PRC is single tenant, so the distinction to admins collection is maybe not clear. On VPRC it is clear.
         *
         * Similar conceptually to an InsuiteConfiguration Schema ( could be refactored into InvoiceConfiguration, IntimeConfiguration, etc.)
         *
         * @module 'settings-schema'
         */

        var types = {},
            i18n = Y.doccirrus.i18n,
            template = {
                "_id": "000000000000000000000001",
                "avwgNo": '',
                "useExternalPrescriptionSoftware": false,
                "externalPrescriptionSoftwareUrl": '',
                "autoLogout": true,
                "warnInadvance": 1,
                "timeoutDelay": 15,
                "accountBan": false,
                "accountBanDelay": 10,
                "remoteAccess": true,
                "dynamsoft": [   // the default dynamsoft scheme
                    {
                        "_id": "000000000000000000000001",
                        "productKey": "2551C4A5EF4E8766B3D070B8DA2B8B8B180BAB7D49A2278F45B11AB4764C22503E604A51F845B18AF556B2EA73035A933A827F0E926AA048CB34FBBFF18B48B6452AD732B83154BFFBE712C89F49D4434CA7C18F1F46DAD53526EC92835C4127BDC780F48637500F4512B181237C8542094E5B8831A77539A1C3ADDC0408AB3942ED1DF523D42CFBE26F402962167C95CA",
                        "useWebTwain": false
                    }
                ],
                "inOutActivated": false,
                "smtpHost": "",
                "smtpPort": "",
                "smtpSsl": false,
                "smtpUserName": "",
                "noCrossLocationAccess": false,
                "noCrossLocationPatientAccess": false,
                "crossLocationPatientEditingAllowed": false,
                "noCrossLocationCalendarAccess": false,
                "smtpPassword": ""
            };

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "Settings_T",
                        "lib": types
                    }
                },
                "Settings_T": {
                    "avwgNo": {
                        "default": "",
                        "type": "String",
                        i18n: i18n( 'settings-schema.Settings_T.avwgNo.i18n' ),
                        "-en": "avs number",
                        "-de": "AVS Nummer",
                        "validate": "Settings_T_avwgNo"
                    },
                    "useExternalPrescriptionSoftware": {
                        "type": "Boolean",
                        i18n: i18n( 'settings-schema.Settings_T.useExternalPrescriptionSoftware.i18n' ),
                        "-en": "Use external prescription software",
                        "-de": "Externe Verordnungssoftware verwenden"
                    },
                    "externalPrescriptionSoftwareUrl": {
                        "type": "String",
                        i18n: i18n( 'settings-schema.Settings_T.externalPrescriptionSoftwareUrl.i18n' ),
                        "-en": "External prescription software URL",
                        "-de": "URL für externe Verordnungssoftware",
                        "validate": "Settings_T_externalPrescriptionSoftwareUrl"
                    },
                    "accountBan": {
                        "type": "boolean",
                        i18n: i18n( 'settings-schema.Settings_T.accountBan.i18n' ),
                        "-en": "Account banned",
                        "-de": "Account gesperrt"
                    },
                    "accountBanDelay": {
                        "type": "Number",
                        i18n: i18n( 'settings-schema.Settings_T.accountBanDelay.i18n' ),
                        "-en": "failed logins till ban",
                        "-de": "Loginversuche bis zur Accountsperrung",
                        "validate": "Settings_T_accountBanDelay"
                    },
                    "autoLogout": {
                        "type": "boolean",
                        i18n: i18n( 'settings-schema.Settings_T.autoLogout.i18n' ),
                        "-en": "Auto logout",
                        "-de": "Auto logout"
                    },
                    "timeoutDelay": {
                        "type": "Number",
                        i18n: i18n( 'settings-schema.Settings_T.timeoutDelay.i18n' ),
                        "-en": "Idle Time-out",
                        "-de": "Idle Time-out",
                        "validate": "Settings_T_timeoutDelay"
                    },
                    "warnInadvance": {
                        "type": "Number",
                        i18n: i18n( 'settings-schema.Settings_T.warnInadvance.i18n' ),
                        "-en": "Warn in advance",
                        "-de": "Warn in advance"
                    },
                    "insightRegenerationFlag": {
                        "type": "boolean",
                        i18n: i18n( 'settings-schema.Settings_T.insightRegenerationFlag.i18n' ),
                        "-en": "insightRegenerationFlag",
                        "-de": "insightRegenerationFlag"
                    },
                    "insightCancelRegenerationFlag": {
                        "type": "boolean",
                        "-en": "insightCancelRegenerationFlag",
                        "-de": "insightCancelRegenerationFlag"
                    },
                    "remoteAccess": {
                        "type": "boolean",
                        "-en": "remoteAccess",
                        "-de": "remoteAccess",
                        i18n: i18n( 'InSuiteAdminMojit.remote_access_settings.GENERAL_SWITCH' )
                    },
                    "loginWithTAN": {
                        "type": "boolean",
                        "-en": "loginWithTAN",
                        "-de": "loginWithTAN",
                        i18n: i18n( 'InSuiteAdminMojit.remote_access_settings.LOGIN_TAN' )
                    },
                    "blockMalware": {
                        "type": "boolean",
                        "-en": "blockMalware",
                        "-de": "blockMalware",
                        i18n: i18n( 'InSuiteAdminMojit.malware_settings.BLOCK_MALWARE' )
                    },
                    "noCrossLocationAccess": {
                        "type": "boolean",
                        "-en": "noCrossLocationAccess",
                        "-de": "noCrossLocationAccess",
                        i18n: i18n( 'InSuiteAdminMojit.cross_location_settings.CHECKBOX' )
                    },
                    "noCrossLocationPatientAccess": {
                        "type": "boolean",
                        "-en": "noCrossLocationPatientAccess",
                        "-de": "noCrossLocationPatientAccess",
                        i18n: i18n( 'InSuiteAdminMojit.cross_location_settings.PATIENT_ACCESS_CHECKBOX' )
                    },
                    "crossLocationPatientEditingAllowed": {
                        "type": "boolean",
                        "-en": "crossLocationPatientEditingAllowed",
                        "-de": "crossLocationPatientEditingAllowed",
                        i18n: i18n( 'InSuiteAdminMojit.cross_location_settings.PATIENT_EDITING_ALLOWED_CHECKBOX' )
                    },
                    "noCrossLocationCalendarAccess": {
                        "type": "boolean",
                        "-en": "noCrossLocationCalendarAccess",
                        "-de": "noCrossLocationCalendarAccess",
                        i18n: i18n( 'InSuiteAdminMojit.cross_location_settings.CALENDAR_ACCESS_CHECKBOX' )
                    },
                    "isRestoreFromISCD": {
                        "type": "boolean",
                        "-en": "isRestoreFromISCD",
                        "-de": "isRestoreFromISCD",
                        i18n: i18n( 'InCareMojit.restore_settings.CHECKBOX' )
                    },
                    "blankoforms": {
                        "default": false,
                        "type": "boolean",
                        "-en": "blankoforms",
                        "-de": "blankoforms",
                        i18n: i18n( 'InSuiteAdminMojit.bfb_settings.CHECKBOX' )
                    },
                    "dynamsoft": {
                        "complex": "inc",
                        "type": "Dynamsoft_T",
                        "lib": types,
                        i18n: i18n( 'settings-schema.Settings_T.dynamsoft.i18n' ),
                        "-en": i18n( 'settings-schema.Settings_T.dynamsoft.i18n' ),
                        "-de": i18n( 'settings-schema.Settings_T.dynamsoft.i18n' )
                    },
                    "inPort": {
                        "complex": "ext",
                        "type": "inPort_T",
                        "lib": types
                    },
                    "SmtpSettings": {
                        "complex": "ext",
                        "type": "SmtpSettings_T",
                        "lib": types
                    },
                    "preset": {
                        "complex": "ext",
                        "type": "Preset_T",
                        "lib": types
                    },
                    "upgradedGroups": {
                        type: [ 'Number' ],
                        i18n: i18n( 'settings-schema.Settings_T.upgradedGroups.i18n' ),
                        "-en": i18n( 'settings-schema.Settings_T.upgradedGroups.i18n' ),
                        "-de": i18n( 'settings-schema.Settings_T.upgradedGroups.i18n' )
                    },
                    "upgrade": {
                        "type": "String",
                        "i18n": i18n( 'licenseManager.upgrade.i18n' )
                    },
                    "currentVersion": {
                        "type": "string",
                        i18n: i18n( 'CRMMojit.crm_release_group_tab.table.VERSION' ),
                        "-en": i18n( 'CRMMojit.crm_release_group_tab.table.VERSION' ),
                        "-de": i18n( 'CRMMojit.crm_release_group_tab.table.VERSION' )
                    },
                    "conames": {
                        type: [ 'String' ],
                        i18n: i18n( 'CRMMojit.crm_release_group_tab.table.CONAMES' ),
                        "-en": i18n( 'CRMMojit.crm_release_group_tab.table.CONAMES' ),
                        "-de": i18n( 'CRMMojit.crm_release_group_tab.table.CONAMES' )
                    },
                    "emailText": {
                        "type": "string",
                        i18n: i18n( 'CRMMojit.crm_release_group_tab.table.EMAIL_TEXT' ),
                        "-en": i18n( 'CRMMojit.crm_release_group_tab.table.EMAIL_TEXT' ),
                        "-de": i18n( 'CRMMojit.crm_release_group_tab.table.EMAIL_TEXT' )
                    },
                    "patientPortalUrl": {
                        "type": "String",
                        "i18n": i18n( 'settings-schema.Settings_T.patientPortalUrl.i18n' )
                    },
                    "useAddInfoForId": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'settings-schema.Settings_T.useAddInfoForId.i18n' ),
                        "-en": i18n( 'settings-schema.Settings_T.useAddInfoForId.i18n' ),
                        "-de": i18n( 'settings-schema.Settings_T.useAddInfoForId.i18n' )
                    },
                    "enablePublicVC": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'settings-schema.Settings_T.enablePublicVC' )
                    },
                    "useAddInfoForIdFK": {
                        "type": "String",
                        "default": '8310',
                        i18n: i18n( 'settings-schema.Settings_T.useAddInfoForIdFK.i18n' ),
                        "-en": i18n( 'settings-schema.Settings_T.useAddInfoForIdFK.i18n' ),
                        "-de": i18n( 'settings-schema.Settings_T.useAddInfoForIdFK.i18n' )
                    },
                    "checkFilesWithLdkPm": {
                        "type": "Boolean",
                        "default": true,
                        i18n: i18n( 'settings-schema.Settings_T.checkFilesWithLdkPm' ),
                        "-en": i18n( 'settings-schema.Settings_T.checkFilesWithLdkPm' ),
                        "-de": i18n( 'settings-schema.Settings_T.checkFilesWithLdkPm' )
                    },
                    "ldtBillingFlag": {
                        "type": "Boolean",
                        "default": true,
                        i18n: i18n( 'settings-schema.Settings_T.ldtBillingFlag' ),
                        "-en": i18n( 'settings-schema.Settings_T.ldtBillingFlag' ),
                        "-de": i18n( 'settings-schema.Settings_T.ldtBillingFlag' )
                    },
                    "ldtDisallowGkvBilling": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'settings-schema.Settings_T.ldtDisallowGkvBilling' ),
                        "-en": i18n( 'settings-schema.Settings_T.ldtDisallowGkvBilling' ),
                        "-de": i18n( 'settings-schema.Settings_T.ldtDisallowGkvBilling' )
                    },
                    "ldtAllowGkvBilling": {
                        "type": "Boolean",
                        "default": true,
                        i18n: i18n( 'settings-schema.Settings_T.ldtAllowGkvBilling' ),
                        "-en": i18n( 'settings-schema.Settings_T.ldtAllowGkvBilling' ),
                        "-de": i18n( 'settings-schema.Settings_T.ldtAllowGkvBilling' )
                    },
                    "useDataFromLabrequestIfPresent": {
                        "type": "Boolean",
                        "default": true,
                        i18n: i18n( 'flow-schema.Transformer_T.useDataFromLabrequestIfPresent' ),
                        "-en": i18n( 'flow-schema.Transformer_T.useDataFromLabrequestIfPresent' ),
                        "-de": i18n( 'flow-schema.Transformer_T.useDataFromLabrequestIfPresent' )
                    },
                    "booksAccessOnlyForAdmins": {
                        type: Boolean,
                        default: false,
                        i18n: i18n( 'InSuiteAdminMojit.cross_location_settings.booksAccess' )
                    },
                    "settings_extra": {
                        "type": "any",
                        "-en": "settings_extra",
                        "-de": "settings_extra"
                    },
                    "hl7CreateTreatments": {
                        "type": "Boolean",
                        i18n: i18n( 'flow-schema.Transformer_T.hl7CreateTreatments' ),
                        "default": false
                    },
                    "allowSameCommercialNo": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'settings-schema.Settings_T.allowSameCommercialNo' )
                    }
                },
                "Dynamsoft_T": {
                    "productKey": {
                        "default": template.dynamsoft[ 0 ].productKey,
                        "type": "String",
                        i18n: i18n( 'settings-schema.Dynamsoft_T.productKey.i18n' ),
                        "-en": i18n( 'settings-schema.Dynamsoft_T.productKey.i18n' ),
                        "-de": i18n( 'settings-schema.Dynamsoft_T.productKey.i18n' )
                    },
                    "useWebTwain": {
                        "default": template.dynamsoft[ 0 ].useWebTwain,
                        "type": "boolean",
                        i18n: i18n( 'settings-schema.Dynamsoft_T.useWebTwain.i18n' ),
                        "-en": i18n( 'settings-schema.Dynamsoft_T.useWebTwain.i18n' ),
                        "-de": i18n( 'settings-schema.Dynamsoft_T.useWebTwain.i18n' )
                    }
                },
                "SmtpSettings_T": {
                    "smtpPassword": {
                        "default": "",
                        "type": "String",
                        i18n: i18n( 'settings-schema.Settings_T.smtpPassword.i18n' ),
                        "-en": i18n( 'settings-schema.Settings_T.smtpPassword.i18n' ),
                        "-de": i18n( 'settings-schema.Settings_T.smtpPassword.i18n' )
                    },
                    "smtpUserName": {
                        "default": "",
                        "type": "String",
                        "apiv": { v: 2, queryParam: false, readOnly: true  },
                        i18n: i18n( 'settings-schema.Settings_T.smtpUserName.i18n' ),
                        "-en": i18n( 'settings-schema.Settings_T.smtpUserName.i18n' ),
                        "-de": i18n( 'settings-schema.Settings_T.smtpUserName.i18n' )
                    },
                    "smtpSsl": {
                        "type": "boolean",
                        i18n: i18n( 'settings-schema.Settings_T.smtpSsl.i18n' ),
                        "-en": i18n( 'settings-schema.Settings_T.smtpSsl.i18n' ),
                        "-de": i18n( 'settings-schema.Settings_T.smtpSsl.i18n' )
                    },
                    "smtpHost": {
                        "default": "",
                        "type": "String",
                        "apiv": { v: 2, queryParam: false, readOnly: true },
                        i18n: i18n( 'settings-schema.Settings_T.smtpHost.i18n' ),
                        "-en": i18n( 'settings-schema.Settings_T.smtpHost.i18n' ),
                        "-de": i18n( 'settings-schema.Settings_T.smtpHost.i18n' )
                    },
                    "smtpPort": {
                        "type": "Number",
                        "apiv": { v: 2, queryParam: false, readOnly: true },
                        i18n: i18n( 'settings-schema.Settings_T.smtpPort.i18n' ),
                        "-en": i18n( 'settings-schema.Settings_T.smtpPort.i18n' ),
                        "-de": i18n( 'settings-schema.Settings_T.smtpPort.i18n' )
                    },
                    "smtpEmailFrom": {
                        "default": "",
                        "type": "String",
                        "apiv": { v: 2, queryParam: false, readOnly: true },
                        "validate": "Settings_T_smtpEmailFrom",
                        i18n: i18n( 'settings-schema.Settings_T.smtpEmailFrom.i18n' )
                    }
                },
                "inPort_T": {
                    "inOutActivated": {
                        "default": template.inOutActivated,
                        "type": "boolean",
                        i18n: i18n( 'settings-schema.inOutActivated.i18n' ),
                        "-en": i18n( 'settings-schema.inOutActivated.i18n' ),
                        "-de": i18n( 'settings-schema.inOutActivated.i18n' )
                    }
                },
                "Preset_T": {
                    "kotableconfigurationPresetOwnerId": {
                        "default": "",
                        "type": "String",
                        i18n: i18n( 'settings-schema.Preset_T.kotableconfigurationPresetOwnerId.i18n' ),
                        "-en": i18n( 'settings-schema.Preset_T.kotableconfigurationPresetOwnerId.i18n' ),
                        "-de": i18n( 'settings-schema.Preset_T.kotableconfigurationPresetOwnerId.i18n' )
                    },
                    "kotableconfigurationPresetCreated": {
                        "type": "Date",
                        i18n: i18n( 'settings-schema.Preset_T.kotableconfigurationPresetCreated.i18n' ),
                        "-en": i18n( 'settings-schema.Preset_T.kotableconfigurationPresetCreated.i18n' ),
                        "-de": i18n( 'settings-schema.Preset_T.kotableconfigurationPresetCreated.i18n' )
                    }
                }
            }
        );

        //internal license schema

        var licenseLimitConfig = Object.freeze( { //base system level limits
            //entry      : { bsnr: 1 , lanr: 1, mfa: 2 }, <-- how to limit non-doctor users
            entry: { bsnr: 1, lanr: 1 },
            small: { bsnr: 1, lanr: 3 },
            medium: { bsnr: 2, lanr: 6 },
            large: { bsnr: 5, lanr: 10 },
            enterprise: {}
        } );

        var licCategories = Object.freeze( {
            TELEMATIK_SERVICES: 'telematikServices',
            SPECIAL_MODULES: 'specialModules',
            BASE_SYSTEM_LEVEL: 'baseSystemLevel',
            DOCTORS_AMOUNT: 'doctorsAmount',
            BASE_SERVICES: 'baseServices',
            ADDITIONAL_SERVICES: 'additionalServices',
            SUPPORT_LEVEL: 'supportLevel',
            SOLUTIONS: 'solutions'
        } );

        var licCategoryTypes = Object.freeze( {
            TELEMATIK_SERVICES: [String ],
            SPECIAL_MODULES: [ String ],
            BASE_SYSTEM_LEVEL: "String",
            DOCTORS_AMOUNT: "String",
            ADDITIONAL_SERVICES: [ String ],
            BASE_SERVICES: [ String ],
            SUPPORT_LEVEL: String,
            SOLUTIONS: [ String ]
        } );

        var licElements = Object.freeze( {
            TELEMATIK_SERVICES: {
                VSDM: "VSDM",
                KIM: "KIM",
                QES: "QES",
                EDOCLETTER: "eDocletter"
                //EPA: "ePA",                   // un comment when feature available
                //NFDM: "NFDM",
                //EMP: "eMP",
                //EAU: "eAU",
                //RERECEPT: "eRezept"
            },
            SPECIAL_MODULES: {
                CARE: 'care',
                DOQUVIDE: 'doquvide',
                DQS: 'dqs',
                CARDIO: 'cardio',
                OCULUS: 'oculus',
                ASV: 'asv',
                EDMP: 'edmp',
                EHKS: 'ehks',
                HGV: 'hgv',
                GYN: 'gyn',
                PEDIA: 'pedia',
                QDOCU: 'qdocu'
            },
            BASE_SYSTEM_LEVEL: {
                ENTRY: 'entry',
                SMALL: 'small',
                MEDIUM: 'medium',
                LARGE: 'large',
                ENTERPRISE: 'enterprise'
            },
            BASE_SERVICES: {
                INCASE: 'inCase',
                INTIME: 'inTime',
                INFORM: 'inForm',
                INVOICE: 'inVoice',
                INPORT: 'inPort'
            },
            ADDITIONAL_SERVICES: {
                INPORTPLUS: 'inPortPlus',
                INTOUCH: 'inTouch',
                INTOUCHPLUS: 'inTouchPlus',
                INSCRIBE: 'inScribe',
                INSCAN: 'inScan',
                INSIGHT: 'inSight',
                INOUT: 'inOut',
                INBACKUP: 'inBackup',
                INPACS: 'inPacs',
                INTI: 'inTi',
                INSTOCK: 'inStock',
                INCASH: 'inCash',
                INSPECTOR_LEARNING_SYSTEM: 'inSpectorLearningSystem',
                INSPECTOR_EXPERT_SYSTEM: 'inSpectorExpertSystem',
                INSPECTOR_SELECTIVECARE_SYSTEM: 'inSpectorSelectiveCareSystem',
                INSPECTORAPO: 'inSpectorApo',
                INSPECTORDOC: 'inSpectorDoc',
                INSPECTORDOCSOLUI: 'inSpectorDocSolUI'
            },
            SUPPORT_LEVEL: {
                TEST: 'test',
                STANDARD: 'standard',
                PREMIUM: 'premium'
            }
        } );

        var defaultLic = {};
        defaultLic[ licCategories.TELEMATIK_SERVICES ] = [ 'VSDM', 'KIM', 'QES'];
        defaultLic[ licCategories.SPECIAL_MODULES ] = [];
        defaultLic[ licCategories.BASE_SYSTEM_LEVEL ] = licElements.BASE_SYSTEM_LEVEL.ENTRY;
        defaultLic[ licCategories.DOCTORS_AMOUNT ] = '1';
        defaultLic[ licCategories.BASE_SERVICES ] = [
            licElements.BASE_SERVICES.INCASE,
            licElements.BASE_SERVICES.INTIME,
            licElements.BASE_SERVICES.INFORM,
            licElements.BASE_SERVICES.INVOICE,
            licElements.BASE_SERVICES.INPORT
        ];
        defaultLic[ licCategories.ADDITIONAL_SERVICES ] = [
        ];
        defaultLic[ licCategories.SUPPORT_LEVEL ] = licElements.SUPPORT_LEVEL.STANDARD;
        defaultLic[ licCategories.SOLUTIONS ] = [];

        var schemaData = {};

        schemaData.LicenseScope_T = {
            trialExpire: {
                "type": "Date",
                i18n: i18n( 'licenseManager.trialExpire.i18n' )
            },
            "trialBegin": {
                "type": "Date",
                "i18n": i18n( 'licenseManager.trialBegin.i18n' )
            },
            "upgrade": {
                "type": "String",
                "i18n": i18n( 'licenseManager.upgrade.i18n' )
            }
        };

        Object.keys( licCategories ).forEach( function( category ) {
            var catName = licCategories[ category ];
            if( 'SOLUTIONS' === category ) {
                schemaData.LicenseScope_T[ catName ] = {
                    "type": licCategoryTypes[ category ],
                    i18n: i18n( 'licenseManager.' + catName + '.i18n' )
                };
                return;
            }
            if( 'DOCTORS_AMOUNT' === category ) {
                schemaData.LicenseScope_T[ catName ] = {
                    "type": licCategoryTypes[ category ],
                    "validate": "numOrEmpty",
                    i18n: i18n( 'licenseManager.' + catName + '.i18n' )
                };
                return;
            }
            schemaData.LicenseScope_T[ catName ] = {
                "default": defaultLic[ catName ],
                "complex": "eq",
                "type": catName + "_E"
            };
        } );

        Object.keys( licElements ).forEach( function( category ) {
            var catName = licCategories[ category ];
            var catELements = licElements[ category ];
            schemaData[ catName + "_E" ] = {
                "type": licCategoryTypes[ category ],
                "default": defaultLic[ catName ],
                "list": [],
                i18n: i18n( 'licenseManager.' + catName + '.i18n' )
            };
            Object.keys( catELements ).forEach( function( element ) {
                var elementName = catELements[ element ];
                schemaData[ catName + "_E" ].list.push( {
                    "val": elementName,
                    i18n: i18n( 'licenseManager.' + catName + '.' + elementName )
                } );
            } );
        } );

        var cardreader = {
            "drivers": [ "CardStar Medic_Memo", "germantelematics", "MedCompact", "MedMobile", "Orga", "SCM eHealth500", "ST-1503_G87-1504", "ST-2000", "Zemo-VML" ]
        };

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        function getDefaultSettings() {
            return template;
        }

        function getCleanLicenseData( licenseData ) {
            licenseData = licenseData || {};
            var licenseSchema = schemaData.LicenseScope_T;
            var newLicenseData = {};
            Object.keys( licenseSchema ).forEach( function( key ) {
                newLicenseData[ key ] = licenseData[ key ] || licenseSchema[ key ].default;
            } );
            return newLicenseData;
        }

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        Y.namespace( 'doccirrus.schemas' )[ NAME ] = {

            types: types,
            /* OPTIONAL default items to be written to the DB on startup */
            defaultItems: [ template ],
            name: NAME,
            getDefaultSettings: getDefaultSettings,
            getCleanLicenseData: getCleanLicenseData,

            defaultLic: defaultLic,
            licenseLimitConfig: licenseLimitConfig,
            licenseSchema: schemaData,
            licenseCategories: licCategories,
            specialModuleKinds: licElements.SPECIAL_MODULES,
            baseSystemLevels: licElements.BASE_SYSTEM_LEVEL,
            baseServices: licElements.BASE_SERVICES,
            additionalServiceKinds: licElements.ADDITIONAL_SERVICES,
            supportLevels: licElements.SUPPORT_LEVEL,
            cacheQuery: true,
            cardreader: cardreader
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[ NAME ], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'doccirrus',
            'dcvalidations'
        ]
    }
);
