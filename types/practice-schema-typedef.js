/**
 * @module practiceSchema
 */

/**
 * @typedef {Object} module:practiceSchema.reminderAlert3Obj
 * @property {String} type - 
 * @property {String} receiver - 
 * @property {Number} minutesinadvance - 
 * @property {Boolean} active - 
 */


/**
 * @typedef {Object} module:practiceSchema.reminderAlert2Obj
 * @property {String} type - 
 * @property {String} receiver - 
 * @property {Number} minutesinadvance - 
 * @property {Boolean} active - 
 */


/**
 * @typedef {Object} module:practiceSchema.reminderAlert1Obj
 * @property {String} type - 
 * @property {String} receiver - 
 * @property {Number} minutesinadvance - 
 * @property {Boolean} active - 
 */


/**
 * @typedef {Object} module:practiceSchema.deleteAlertObj
 * @property {String} type - 
 * @property {String} receiver - 
 * @property {Number} minutesinadvance - 
 * @property {Boolean} active - 
 */


/**
 * @typedef {Object} module:practiceSchema.updateAlertObj
 * @property {String} type - 
 * @property {String} receiver - 
 * @property {Number} minutesinadvance - 
 * @property {Boolean} active - 
 */


/**
 * @typedef {Object} module:practiceSchema.createAlertObj
 * @property {String} type - 
 * @property {String} receiver - 
 * @property {Number} minutesinadvance - 
 * @property {Boolean} active - 
 */


/**
 * @typedef {Object} module:practiceSchema.appsMetaDataObj
 * @property {String} appName - 
 * @property {String} version - 
 * @property {String} vendor - 
 * @property {Date} latestReleaseDate - 
 */


/**
 * @typedef {Object} module:practiceSchema.licenseScopeObj
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
 * @typedef {Object} module:practiceSchema.configObj
 * @property {String} key - 
 * @property {String} value - 
 */


/**
 * @typedef {Object} module:practiceSchema.prodServicesObj
 * @property {Date} from - 
 * @property {Date} to - 
 * @property {string} ps - 
 * @property {Array.<module:practiceSchema.configObj>} config - 
 */


/**
 * @typedef {Object} module:practiceSchema.addressesObj
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
 * @typedef {Object} module:practiceSchema.communicationsObj
 * @property {String} type - 
 * @property {Boolean} preferred - 
 * @property {String} value - 
 * @property {String} note - 
 * @property {Boolean} signaling - 
 * @property {Boolean} confirmed - 
 * @property {Boolean} confirmNeeded - 
 */


/**
 * @typedef {Object} module:practiceSchema.tenantsObj
 * @property {Array.<module:practiceSchema.communicationsObj>} communications - 
 * @property {String} inTimeID - 
 * @property {String} coname - 
 * @property {string} cotype - 
 * @property {Array.<module:practiceSchema.addressesObj>} addresses - 
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
 * @property {Array.<module:practiceSchema.prodServicesObj>} prodServices - 
 * @property {Object} centralContact - 
 * @property {Object} supportContact - 
 * @property {String} systemType - 
 * @property {String} serverType - 
 * @property {Array.<module:practiceSchema.licenseScopeObj>} licenseScope - 
 * @property {Number} releaseGroup - 
 * @property {Array.<String>} countryMode - 
 * @property {String} version - 
 * @property {Array.<module:practiceSchema.appsMetaDataObj>} appsMetaData - 
 */


/**
 * @typedef {Object} module:practiceSchema.appsMetaDataObj
 * @property {String} appName - 
 * @property {String} version - 
 * @property {String} vendor - 
 * @property {Date} latestReleaseDate - 
 */


/**
 * @typedef {Object} module:practiceSchema.licenseScopeObj
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
 * @typedef {Object} module:practiceSchema.configObj
 * @property {String} key - 
 * @property {String} value - 
 */


/**
 * @typedef {Object} module:practiceSchema.prodServicesObj
 * @property {Date} from - 
 * @property {Date} to - 
 * @property {string} ps - 
 * @property {Array.<module:practiceSchema.configObj>} config - 
 */


/**
 * @typedef {Object} module:practiceSchema.addressesObj
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
 * @typedef {Object} module:practiceSchema.communicationsObj
 * @property {String} type - 
 * @property {Boolean} preferred - 
 * @property {String} value - 
 * @property {String} note - 
 * @property {Boolean} signaling - 
 * @property {Boolean} confirmed - 
 * @property {Boolean} confirmNeeded - 
 */


/**
 * @typedef {Object} module:practiceSchema.practice
 * @property {String} commercialNo - 
 * @property {Array.<module:practiceSchema.communicationsObj>} communications - 
 * @property {String} inTimeID - 
 * @property {String} coname - 
 * @property {string} cotype - 
 * @property {Array.<module:practiceSchema.addressesObj>} addresses - 
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
 * @property {Array.<module:practiceSchema.prodServicesObj>} prodServices - 
 * @property {Object} centralContact - 
 * @property {Object} supportContact - 
 * @property {String} systemType - 
 * @property {String} serverType - 
 * @property {Array.<module:practiceSchema.licenseScopeObj>} licenseScope - 
 * @property {Number} releaseGroup - 
 * @property {Array.<String>} countryMode - 
 * @property {String} version - 
 * @property {Array.<module:practiceSchema.appsMetaDataObj>} appsMetaData - 
 * @property {Array.<module:practiceSchema.tenantsObj>} tenants - 
 * @property {Array.<module:practiceSchema.createAlertObj>} createAlert - 
 * @property {Array.<module:practiceSchema.updateAlertObj>} updateAlert - 
 * @property {Array.<module:practiceSchema.deleteAlertObj>} deleteAlert - 
 * @property {Array.<module:practiceSchema.reminderAlert1Obj>} reminderAlert1 - 
 * @property {Array.<module:practiceSchema.reminderAlert2Obj>} reminderAlert2 - 
 * @property {Array.<module:practiceSchema.reminderAlert3Obj>} reminderAlert3 - 
 * @property {Boolean} allowAdhoc - 
 * @property {Boolean} allowPRCAdhoc - 
 * @property {Boolean} autoShift - 
 * @property {Boolean} autoEnd - 
 * @property {Boolean} updateNoShowAtEod - 
 * @property {Boolean} autoMutateOff - 
 * @property {Boolean} allowBookingsOutsideOpeningHours - 
 * @property {Array} hiddenDays - 
 * @property {Boolean} onlyPracticesPatientsCanBook - 
 * @property {String} calendarViewDayStart - 
 * @property {String} calendarViewDayEnd - 
 * @property {String} colorMode - 
 * @property {Boolean} activateOverview - 
 */