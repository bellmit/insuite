/**
 * @module settingsSchema
 */

/**
 * @typedef {Object} module:settingsSchema.dynamsoftObj
 * @property {String} productKey - 
 * @property {boolean} useWebTwain - 
 */


/**
 * @typedef {Object} module:settingsSchema.settings
 * @property {String} avwgNo - 
 * @property {Boolean} useExternalPrescriptionSoftware - 
 * @property {String} externalPrescriptionSoftwareUrl - 
 * @property {boolean} accountBan - 
 * @property {Number} accountBanDelay - 
 * @property {boolean} autoLogout - 
 * @property {Number} timeoutDelay - 
 * @property {Number} warnInadvance - 
 * @property {boolean} insightRegenerationFlag - 
 * @property {boolean} insightCancelRegenerationFlag - 
 * @property {boolean} remoteAccess - 
 * @property {boolean} loginWithTAN - 
 * @property {boolean} blockMalware - 
 * @property {boolean} noCrossLocationAccess - 
 * @property {boolean} noCrossLocationPatientAccess - 
 * @property {boolean} crossLocationPatientEditingAllowed - 
 * @property {boolean} noCrossLocationCalendarAccess - 
 * @property {boolean} isRestoreFromISCD - 
 * @property {boolean} blankoforms - 
 * @property {Array.<module:settingsSchema.dynamsoftObj>} dynamsoft - 
 * @property {boolean} inOutActivated - 
 * @property {String} smtpPassword - 
 * @property {String} smtpUserName - 
 * @property {boolean} smtpSsl - 
 * @property {String} smtpHost - 
 * @property {Number} smtpPort - 
 * @property {String} smtpEmailFrom - 
 * @property {String} kotableconfigurationPresetOwnerId - 
 * @property {Date} kotableconfigurationPresetCreated - 
 * @property {Array.<Number>} upgradedGroups - 
 * @property {String} upgrade - 
 * @property {string} currentVersion - 
 * @property {Array.<String>} conames - 
 * @property {string} emailText - 
 * @property {String} patientPortalUrl - 
 * @property {Boolean} useAddInfoForId - 
 * @property {Boolean} enablePublicVC - 
 * @property {String} useAddInfoForIdFK - 
 * @property {Boolean} checkFilesWithLdkPm - 
 * @property {Boolean} ldtBillingFlag - 
 * @property {Boolean} ldtDisallowGkvBilling - 
 * @property {Boolean} ldtAllowGkvBilling - 
 * @property {Boolean} useDataFromLabrequestIfPresent - 
 * @property {Boolean} booksAccessOnlyForAdmins - 
 * @property {Object} settings_extra - 
 * @property {Boolean} hl7CreateTreatments - 
 * @property {Boolean} allowSameCommercialNo - 
 */