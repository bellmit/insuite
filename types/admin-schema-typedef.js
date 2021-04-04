/**
 * @module adminSchema
 */

/**
 * @typedef {Object} module:adminSchema.defaultFormsObj
 * @property {String} filename - 
 * @property {String} hash - 
 */


/**
 * @typedef {Object} module:adminSchema.admin
 * @property {string} dbVersion - 
 * @property {String} status - 
 * @property {String} initializeDevice - 
 * @property {String} backupedDevice - 
 * @property {String} error - 
 * @property {String} backupSmbHost - 
 * @property {String} backupSmbPort - 
 * @property {String} backupSmbPath - 
 * @property {String} backupSmbLogin - 
 * @property {String} backupSmbPassword - 
 * @property {String} backupSmbDomain - 
 * @property {Boolean} imagesReadOnly - 
 * @property {Object} licenseScope - 
 * @property {Date} cardSwipeResetDate - 
 * @property {Number} catalogsVersion - 
 * @property {String} mmiVersion - 
 * @property {Date} lastCloseday - 
 * @property {Date} lastBillingReport - 
 * @property {string} report_checksum - 
 * @property {string} currentVersion - 
 * @property {String} publicKey - 
 * @property {String} privateKey - 
 * @property {Date} expireDate - 
 * @property {string} updatePID - 
 * @property {string} updateEmail - 
 * @property {string} localIp - 
 * @property {string} language - 
 * @property {string} presetsVersion - 
 * @property {String} proxy - 
 * @property {String} rulesImportHash - 
 * @property {Boolean} allPrintersShared - 
 * @property {Number} lastCloudBackupTimeInMs - 
 * @property {Array.<Number>} cronTimeHoursInDay - 
 * @property {String} cronJobName - 
 * @property {String} defaultCommonProfile - 
 * @property {Date} defaultCommonProfileDate - 
 * @property {Array.<module:adminSchema.defaultFormsObj>} defaultForms - 
 * @property {Date} lastHCICatalogUpdatingDate - 
 * @property {String} hciCatalogHash - 
 * @property {String} appLicenseSerialsToken - 
 */