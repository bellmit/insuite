/**
 * @module patientregSchema
 */

/**
 * @typedef {Object} module:patientregSchema.transferObj
 * @property {String} eTAN - 
 * @property {String} source - 
 * @property {String} target - 
 * @property {String} date - 
 */


/**
 * @typedef {Object} module:patientregSchema.patientreg
 * @property {string} patientId - 
 * @property {boolean} noPRC - 
 * @property {string} customerIdPrac - 
 * @property {string} customerIdPat - 
 * @property {string} identityId - 
 * @property {string} optIn - 
 * @property {boolean} confirmed - 
 * @property {boolean} createPlanned - 
 * @property {boolean} accessPRC - 
 * @property {string} ppToken - 
 * @property {string} prcKey - 
 * @property {Array.<String>} tags - 
 * @property {module:patientregSchema.transferObj} transfer - 
 * @property {String} pw - 
 * @property {String} dob - 
 * @property {String} email - 
 * @property {String} firstname - 
 * @property {String} lastname - 
 * @property {String} talk - 
 * @property {String} phone - 
 */