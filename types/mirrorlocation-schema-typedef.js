/**
 * @module mirrorlocationSchema
 */

/**
 * @typedef {Object} module:mirrorlocationSchema.budgetsObj
 * @property {string} type - 
 * @property {Array.<String>} specialities - 
 * @property {Number} startBudget - 
 * @property {Date} startDate - 
 * @property {Number} patientAgeRange1 - 
 * @property {Number} patientAgeRange2 - 
 * @property {Number} patientAgeRange3 - 
 * @property {Number} patientAgeRange4 - 
 */


/**
 * @typedef {Object} module:mirrorlocationSchema.openTimesObj
 * @property {Array.<Number>} days - 
 * @property {Array.<Number>} start - 
 * @property {Array.<Number>} end - 
 * @property {boolean} publicInsurance - 
 * @property {boolean} privateInsurance - 
 */


/**
 * @typedef {Object} module:mirrorlocationSchema.mirrorlocation
 * @property {String} locname - 
 * @property {String} commercialNo - 
 * @property {String} prcCustomerNo - 
 * @property {String} kind - 
 * @property {String} street - 
 * @property {String} houseno - 
 * @property {String} zip - 
 * @property {String} city - 
 * @property {String} postbox - 
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
 * @property {String} cardType - 
 * @property {String} bankName - 
 * @property {Number} trial - 
 * @property {String} bankIBAN - 
 * @property {String} bankBIC - 
 * @property {String} accountOwner - 
 * @property {String} cardNo - 
 * @property {String} cardCheckCode - 
 * @property {Number} cardValidToMonth - 
 * @property {Number} cardValidToYear - 
 * @property {Boolean} debitAllowed - 
 * @property {Boolean} isOptional - 
 * @property {String} phone - 
 * @property {String} fax - 
 * @property {String} email - 
 * @property {String} website - 
 * @property {Array.<module:mirrorlocationSchema.openTimesObj>} openTimes - 
 * @property {Boolean} isMainLocation - 
 * @property {Boolean} isAdditionalLocation - 
 * @property {String} mainLocationId - 
 * @property {String} kbvZip - 
 * @property {String} kv - 
 * @property {Array.<module:mirrorlocationSchema.budgetsObj>} budgets - 
 * @property {String} defaultPrinter - 
 * @property {Array.<String>} enabledPrinters - 
 */