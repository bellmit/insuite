/**
 * User: rrrw
 * Date: 19.09.13  12:11
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */



YUI.add( 'admin-schema', function( Y, NAME ) {

        /**
         * The DC admin data schema / mongoose Schemas.
         *
         * @module DCAdmin
         */

        var
            DBVERSION_ID = '000000000000000000000001',
            BACKUP_ID = '000000000000000000000002',
            CLOSEDAY_ID = '000000000000000000000003',
            JREPORT_ID = '000000000000000000000004',
            KEY_PAIR_ID = '000000000000000000000005',
            UPDATE_ID = '000000000000000000000006',
            LICENSE_ID = '000000000000000000000007',
            REPORTING_PRESETS_ID = '000000000000000000000008',
            IP_ADDRESS_ID = '000000000000000000000010',
            // BACKUP_KEY_ID = '000000000000000000000011', for inBackup product, readable by borg
            PATCH_ID = '000000000000000000000099',
            LUASCRIPTS_PRESETS_ID = '000000000000000000000012',
            QUARTER_TRANSITION_ID = '000000000000000000000013',
            CLOUD_BACKUP_TIME_ID = '000000000000000000000014',
            DATASAFE_BACKUP_JOB_ID = '000000000000000000000015',
            DEFAULT_FORMS_ID = '000000000000000000000020',
            LANGUAGE_ID = '000000000000000000000025',
            MMI_VERSION_ID = '000000000000000000000030',
            DCPRC_APP_LICENSE_SERIALS_ID = '000000000000000000000033',
            datasafeJobDetails = {
                _id: DATASAFE_BACKUP_JOB_ID,
                cronJobName: "datasafeBackup",
                cronTimeHoursInDay: [6, 9, 12, 15, 19]
            },
            template = [
                {
                    _id: DBVERSION_ID
                },
                {
                    _id: BACKUP_ID,
                    status: 0,
                    initializeDevice: '',
                    backupedDevice: '',
                    error: '',
                    imagesReadOnly: false
                },
                {
                    _id: CLOSEDAY_ID
                },
                {
                    _id: JREPORT_ID
                },
                {
                    _id: DEFAULT_FORMS_ID,
                    defaultForms: []
                },
                {
                    _id: LANGUAGE_ID,
                    language: 'DE'
                },
                datasafeJobDetails
            ],

            // ------- Schema definitions  -------
            types = {},
            i18n = Y.doccirrus.i18n;

        /*types = Y.mix( types, {
         root: {
         dbVersion: { type: 'string',
         "-en": "dbVersion",
         "-de": "dbVersion"
         },
         backupStatus:{
         default:"",
         type: 'String',
         "-en": "Backup status",
         "-de": "Backup status"
         },
         backupInitializeDevice:{
         default:"",
         type: 'String',
         "-en": "initialized Device",
         "-de": "initialisiertes Gerät"
         },
         backupedDevice:{
         default:"",
         type: 'String',
         "-en": "backuped Device",
         "-de": "initialisiertes Gerät"
         }
         }
         } ); */

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "Admin_T",
                        "lib": types
                    }
                },
                "Backup_T": {
                    status: {
                        default: "",
                        type: 'String',
                        i18n: i18n( 'admin-schema.Backup_T.status' ),
                        "-en": "Backup status",
                        "-de": "Backup status"
                    },
                    initializeDevice: {
                        default: "",
                        type: 'String',
                        i18n: i18n( 'admin-schema.Backup_T.initializeDevice' ),
                        "-en": "initialized Device",
                        "-de": "initialisiertes Gerät"
                    },
                    backupedDevice: {
                        default: "",
                        type: 'String',
                        i18n: i18n( 'admin-schema.Backup_T.backupedDevice' ),
                        "-en": "backuped Device",
                        "-de": "initialisiertes Gerät"
                    },
                    error: {
                        default: "",
                        type: 'String',
                        i18n: i18n( 'admin-schema.Backup_T.error' ),
                        "-en": "Error",
                        "-de": "Fehler"
                    },
                    backupSmbHost: {
                        type: 'String',
                        i18n: i18n( 'admin-schema.Backup_T.smbHost' ),
                        '-en': 'Hostname',
                        '-de': 'Hostname'
                    },
                    backupSmbPort: {
                        type: 'String',
                        i18n: i18n( 'admin-schema.Backup_T.smbPort' ),
                        '-en': 'Port',
                        '-de': 'Port'
                    },
                    backupSmbPath: {
                        type: 'String',
                        i18n: i18n( 'admin-schema.Backup_T.smbPath' ),
                        '-en': 'Path',
                        '-de': 'Pfad'
                    },
                    backupSmbLogin: {
                        type: 'String',
                        i18n: i18n( 'admin-schema.Backup_T.smbLogin' ),
                        '-en': 'Login',
                        '-de': 'Login'
                    },
                    backupSmbPassword: {
                        type: 'String',
                        i18n: i18n( 'admin-schema.Backup_T.smbPassword' ),
                        '-en': 'Password',
                        '-de': 'Password'
                    },
                    backupSmbDomain: {
                        type: 'String',
                        i18n: i18n( 'admin-schema.Backup_T.smbDomain' ),
                        '-en': 'Domain',
                        '-de': 'Domain'
                    },
                    //  temporary for 2.15, to be removed or reviewed by 20-05-2016
                    imagesReadOnly: {
                        default: false,
                        type: 'Boolean',
                        i18n: i18n( 'admin-schema.Backup_T.imagesReadOnly' ),
                        "-en": "Form Images ReadOnly Patch",
                        "-de": "Form Images ReadOnly Patch"
                    }
                },
                "KeyPair_T": {
                    publicKey: {
                        type: 'String',
                        "-en": "publicKey",
                        "-de": "publicKey"
                    },
                    privateKey: {
                        type: 'String',
                        "-en": "privateKey",
                        "-de": "privateKey"
                    },
                    "expireDate": {
                        "type": "Date",
                        "-en": "expireDate",
                        "-de": "expireDate"
                    }
                },
                "FileHash_T": {
                    filename: {
                        type: 'String',
                        "-en": "filename",
                        "-de": "filename"
                    },
                    hash: {
                        type: 'String',
                        "-en": "hash",
                        "-de": "hash"
                    }
                },
                "Admin_T": {
                    "dbVersion": {
                        type: 'string',
                        i18n: i18n( 'admin-schema.Admin_T.dbVersion' ),
                        "-en": "dbVersion",
                        "-de": "dbVersion"
                    },
                    "backup": {
                        "complex": "ext",
                        "type": "Backup_T",
                        "lib": types
                    },
                    "licenseScope": {
                        "type": "any",
                        "lib": types
                    },
                    "cardSwipeResetDate": {
                        "type": Date,
                        i18n: i18n( 'admin-schema.Admin_T.cardSwipeResetDate' ),
                        "-en": "cardSwipeResetDate",
                        "-de": "cardSwipeResetDate"
                    },
                    "catalogsVersion": {
                        "type": "Number",
                        i18n: i18n( 'admin-schema.Admin_T.catalogsVersion' ),
                        "-en": "catalogsVersion",
                        "-de": "catalogsVersion"
                    },
                    "mmiVersion": {
                        "type": "String",
                        i18n: i18n( 'admin-schema.Admin_T.mmiVersion' ),
                        "-en": "mmiVersion",
                        "-de": "mmiVersion"
                    },
                    "lastCloseday": {
                        "type": "Date",
                        i18n: i18n( 'admin-schema.Admin_T.lastCloseday' ),
                        "-en": "lastCloseday",
                        "-de": "lastCloseday"
                    },
                    "lastBillingReport": {
                        "type": "Date",
                        "-en": "lastBillingReport",
                        "-de": "lastBillingReport"
                    },
                    "report_checksum": {
                        "type": "string",
                        i18n: i18n( 'admin-schema.Admin_T.report_checksum' ),
                        "-en": "report_checksum",
                        "-de": "report_checksum"
                    },
                    "currentVersion": {
                        "type": "string",
                        i18n: i18n( 'admin-schema.Admin_T.current_version' ),
                        "-en": "current version",
                        "-de": "current version"
                    },
                    "keyPair": {
                        "complex": "ext",
                        "type": "KeyPair_T",
                        "lib": types
                    },
                    "updatePID": {
                        "type": "string",
                        "-en": "updatePID",
                        "-de": "updatePID"
                    },
                    "updateEmail": {
                        "type": "string",
                        "-en": "updateEmail",
                        "-de": "updateEmail"
                    },
                    "localIp": {
                        "type": "string",
                        "-en": "localIp",
                        "-de": "localIp"
                    },
                    "language": {
                        "type": "string",
                        "-en": "language",
                        "-de": "language"
                    },
                    "presetsVersion": {
                        "type": "string",
                        "-en": "presetsVersion",
                        "-de": "presetsVersion"
                    },
                    "proxy": {
                        "default": "",
                        validate: "Admin_T_proxy",
                        "type": "String",
                        i18n: i18n( 'settings-schema.Admin_T.proxy.i18n' ),
                        "-en": "Proxy",
                        "-de": "Proxy"
                    },
                    "rulesImportHash": {
                        "type": "String",
                        i18n: i18n( 'settings-schema.Admin_T.rulesImportHash.i18n' ),
                        "-en": "rulesImportHash",
                        "-de": "rulesImportHash"
                    },
                    "allPrintersShared": {
                        "default": false,
                        "type": "Boolean",
                        "-en": "allPrintersShared",
                        "-de": "allPrintersShared"
                    },
                    "lastCloudBackupTimeInMs": {
                        "type": "Number",
                        i18n: "lastCloudBackupTimeInMs",
                        "-en": "lastCloudBackupTimeInMs",
                        "-de": "lastCloudBackupTimeInMs"
                    },
                    "cronTimeHoursInDay": {
                        "type": [Number],
                        i18n: "cronTimeHoursInDay",
                        "-en": "cronTimeHoursInDay",
                        "-de": "cronTimeHoursInDay"
                    },
                    "cronJobName": {
                        "type": "String",
                        "-en": "cronJobName",
                        "-de": "cronJobName"
                    },
                    "defaultCommonProfile": {
                        "type": "String",
                        "-en": "defaultCommonProfile",
                        "-de": "defaultCommonProfile"
                    },
                    "defaultCommonProfileDate": {
                        "type": "Date",
                        "-en": "defaultCommonProfileDate",
                        "-de": "defaultCommonProfileDate"
                    },
                    "defaultForms": {
                        "complex": "inc",
                        "type": "FileHash_T",
                        "lib": types
                    },
                    "lastHCICatalogUpdatingDate": {
                        "type": Date,
                        "-en": "lastHCICatalogUpdatingDate",
                        "-de": "lastHCICatalogUpdatingDate"
                    },
                    "hciCatalogHash": {
                        "type": "String",
                        i18n: i18n( 'settings-schema.Admin_T.rulesImportHash.i18n' ),
                        "-en": "rulesImportHash",
                        "-de": "rulesImportHash"
                    },
                    "appLicenseSerialsToken": {
                        "type": "String",
                        i18n: i18n( 'admin-schema.Admin_T.appLicenseSerialsToken' ),
                        "-en": "Token to access app license serials",
                        "-de": "Token für den Zugriff auf die App-Lizenzserien"
                    }
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        // -------- Our Schema Methods and Hooks are defined here -------

        /**
         * Class admin Schemas -- gathers all the schemas that the admin Service works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,

            name: NAME,

            defaultItems: template,

            getId: function() {
                return DBVERSION_ID;
            },
            getBackupId: function() {
                return BACKUP_ID;
            },
            getClosedayId: function() {
                return CLOSEDAY_ID;
            },
            getJReportId: function() {
                return JREPORT_ID;
            },
            getKeyPairId: function() {
                return KEY_PAIR_ID;
            },
            getUpdateId: function() {
                return UPDATE_ID;
            },
            getLicenseId: function() {
                return LICENSE_ID;
            },
            getIpAddressId: function() {
                return IP_ADDRESS_ID;
            },
            getReportingPresetsId: function() {
                return REPORTING_PRESETS_ID;
            },
            getPatchId: function() {
                return PATCH_ID;
            },
            getLuaScriptPresetsId() {
                return LUASCRIPTS_PRESETS_ID;
            },
            getQuarterTransitionId() {
                return QUARTER_TRANSITION_ID;
            },
            getCloudBackupTimeId() {
                return CLOUD_BACKUP_TIME_ID;
            },
            getDatasafeBackupJobId() {
                return DATASAFE_BACKUP_JOB_ID;
            },
            getDefaultFormId() {
                return DEFAULT_FORMS_ID;
            },
            getLanguageId() {
                return LANGUAGE_ID;
            },
            getMmiId() {
                return MMI_VERSION_ID;
            },
            getDatasafeDefaultBackupJobDetails() {
                return datasafeJobDetails;
            },
            getDCPRCAppLicenseSerialsId() {
                return DCPRC_APP_LICENSE_SERIALS_ID;
            },
            cacheQuery: true

        };
        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', { requires: ['dcschemaloader', 'dcvalidations', 'mojito'] }
);
