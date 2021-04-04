/**
 * @module companySchema
 */

/**
 * @typedef {Object} module:companySchema.appsMetaDataObj
 * @property {String} appName - 
 * @property {String} version - 
 * @property {String} vendor - 
 * @property {Date} latestReleaseDate - 
 */


/**
 * @typedef {Object} module:companySchema.licenseScopeObj
 * @property {Date} trialExpire - 
 * @property {Date} trialBegin - 
 * @property {String} upgrade - 
 * @property {Array.<String>} telematikServices - 
 * @property {Array.<String>} specialModules - 
 * @property {String} baseSystemLevel - 
 * @property {String} doctorsAmount - 
 * @property {Array.<String>} baseServices - 
 * @property {Array.<String>} additionalServices - 
 * @property {String} supportLevel - 
 * @property {Array.<String>} solutions - 
 */


/**
 * @typedef {Object} module:companySchema.configObj
 * @property {String} key - 
 * @property {String} value - 
 */


/**
 * @typedef {Object} module:companySchema.prodServicesObj
 * @property {Date} from - 
 * @property {Date} to - 
 * @property {string} ps - 
 * @property {Array.<module:companySchema.configObj>} config - 
 */


/**
 * @typedef {Object} module:companySchema.addressesObj
 * @property {String} street - 
 * @property {String} houseno - 
 * @property {String} zip - 
 * @property {String} city - 
 * @property {String} postbox - 
 * @property {String} kind - 
 * @property {String} country - 
 * @property {String} countryCode - 
 * @property {String} receiver - 
 * @property {String} payerType - 
 * @property {String} addon - 
 * @property {String} talk - 
 * @property {String} title - 
 * @property {String} firstname - 
 * @property {String} nameaffix - 
 * @property {String} middlename - 
 * @property {String} lastname - 
 * @property {String} cantonCode - 
 */


/**
 * @typedef {Object} module:companySchema.communicationsObj
 * @property {String} type - 
 * @property {Boolean} preferred - 
 * @property {String} value - 
 * @property {String} note - 
 * @property {Boolean} signaling - 
 * @property {Boolean} confirmed - 
 * @property {Boolean} confirmNeeded - 
 */


/**
 * @typedef {Object} module:companySchema.tenantsObj
 * @property {Array.<module:companySchema.communicationsObj>} communications - 
 * @property {String} inTimeID - 
 * @property {String} coname - 
 * @property {string} cotype - 
 * @property {Array.<module:companySchema.addressesObj>} addresses - 
 * @property {boolean} deleted - 
 * @property {String} deletedName - 
 * @property {String} customerNo - 
 * @property {String} dcCustomerNo - 
 * @property {String} vprcFQHostName - 
 * @property {Boolean} vprcFQHostnameOverrideFlag - 
 * @property {String} systemId - 
 * @property {String} encryptedSystemId - 
 * @property {String} commissionKey - 
 * @property {Date} commissionKeyCreatedAt - 
 * @property {String} ticketLabel - 
 * @property {String} tenantId - 
 * @property {Boolean} activeState - 
 * @property {Array.<module:companySchema.prodServicesObj>} prodServices - 
 * @property {Object} centralContact - 
 * @property {Object} supportContact - 
 * @property {String} systemType - 
 * @property {String} serverType - 
 * @property {Array.<module:companySchema.licenseScopeObj>} licenseScope - 
 * @property {Number} releaseGroup - 
 * @property {Array.<String>} countryMode - 
 * @property {String} version - 
 * @property {Array.<module:companySchema.appsMetaDataObj>} appsMetaData - 
 */


/**
 * @typedef {Object} module:companySchema.appsMetaDataObj
 * @property {String} appName - 
 * @property {String} version - 
 * @property {String} vendor - 
 * @property {Date} latestReleaseDate - 
 */


/**
 * @typedef {Object} module:companySchema.licenseScopeObj
 * @property {Date} trialExpire - 
 * @property {Date} trialBegin - 
 * @property {String} upgrade - 
 * @property {Array.<String>} telematikServices - 
 * @property {Array.<String>} specialModules - 
 * @property {String} baseSystemLevel - 
 * @property {String} doctorsAmount - 
 * @property {Array.<String>} baseServices - 
 * @property {Array.<String>} additionalServices - 
 * @property {String} supportLevel - 
 * @property {Array.<String>} solutions - 
 */


/**
 * @typedef {Object} module:companySchema.configObj
 * @property {String} key - 
 * @property {String} value - 
 */


/**
 * @typedef {Object} module:companySchema.prodServicesObj
 * @property {Date} from - 
 * @property {Date} to - 
 * @property {string} ps - 
 * @property {Array.<module:companySchema.configObj>} config - 
 */


/**
 * @typedef {Object} module:companySchema.addressesObj
 * @property {String} street - 
 * @property {String} houseno - 
 * @property {String} zip - 
 * @property {String} city - 
 * @property {String} postbox - 
 * @property {String} kind - 
 * @property {String} country - 
 * @property {String} countryCode - 
 * @property {String} receiver - 
 * @property {String} payerType - 
 * @property {String} addon - 
 * @property {String} talk - 
 * @property {String} title - 
 * @property {String} firstname - 
 * @property {String} nameaffix - 
 * @property {String} middlename - 
 * @property {String} lastname - 
 * @property {String} cantonCode - 
 */


/**
 * @typedef {Object} module:companySchema.communicationsObj
 * @property {String} type - 
 * @property {Boolean} preferred - 
 * @property {String} value - 
 * @property {String} note - 
 * @property {Boolean} signaling - 
 * @property {Boolean} confirmed - 
 * @property {Boolean} confirmNeeded - 
 */


/**
 * @typedef {Object} module:companySchema.company
 * @property {Array.<module:companySchema.communicationsObj>} communications - 
 * @property {String} inTimeID - 
 * @property {String} coname - 
 * @property {string} cotype - 
 * @property {Array.<module:companySchema.addressesObj>} addresses - 
 * @property {boolean} deleted - 
 * @property {String} deletedName - 
 * @property {String} customerNo - 
 * @property {String} dcCustomerNo - 
 * @property {String} vprcFQHostName - 
 * @property {Boolean} vprcFQHostnameOverrideFlag - 
 * @property {String} systemId - 
 * @property {String} encryptedSystemId - 
 * @property {String} commissionKey - 
 * @property {Date} commissionKeyCreatedAt - 
 * @property {String} ticketLabel - 
 * @property {String} tenantId - 
 * @property {Boolean} activeState - 
 * @property {Array.<module:companySchema.prodServicesObj>} prodServices - 
 * @property {String} centralContact - 
 * @property {ObjectId} supportContact - 
 * @property {String} systemType - 
 * @property {String} serverType - 
 * @property {Array.<module:companySchema.licenseScopeObj>} licenseScope - 
 * @property {Number} releaseGroup - 
 * @property {Array.<String>} countryMode - 
 * @property {String} version - 
 * @property {Array.<module:companySchema.appsMetaDataObj>} appsMetaData - 
 * @property {Array.<module:companySchema.tenantsObj>} tenants - 
 */