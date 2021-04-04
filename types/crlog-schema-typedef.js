/**
 * @module crlogSchema
 */

/**
 * @typedef {Object} module:crlogSchema.feedbackObj
 * @property {String} code - 
 * @property {String} message - 
 * @property {String} level - 
 */


/**
 * @typedef {Object} module:crlogSchema.crlog
 * @property {String} status - 
 * @property {String} validationStatus - 
 * @property {String} eventStatus - 
 * @property {String} initiatorId - 
 * @property {String} initiator - 
 * @property {Date} initiatedAt - 
 * @property {Object} parsedPatient - 
 * @property {Date} cardSwipe - 
 * @property {String} matchedPatientId - 
 * @property {Boolean} askForCreationOfAdditionalInsurancesAfterCardread - 
 * @property {Boolean} copyPublicInsuranceDataToAdditionalInsurance - 
 * @property {Object} matchedPatients - 
 * @property {Object} mergedPatient - 
 * @property {Object} diff - 
 * @property {Object} rawData - 
 * @property {Array.<module:crlogSchema.feedbackObj>} feedback - 
 * @property {String} deviceName - 
 */