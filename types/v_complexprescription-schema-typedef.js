/**
 * @module v_complexprescriptionSchema
 */

/**
 * @typedef {Object} module:v_complexprescriptionSchema.activitiesObj
 * @property {Array.<String>} activityId - 
 * @property {String} actType - 
 * @property {String} codePZN - 
 * @property {String} codeHMV - 
 * @property {String} note - 
 * @property {String} dose - 
 * @property {Number} quantity - 
 * @property {String} prescPeriod - 
 */


/**
 * @typedef {Object} module:v_complexprescriptionSchema.dispatchActivitiesObj
 * @property {String} activityId - 
 * @property {String} actType - 
 * @property {Date} prescriptionDate - 
 * @property {Array.<module:v_complexprescriptionSchema.activitiesObj>} activities - 
 */


/**
 * @typedef {Object} module:v_complexprescriptionSchema.v_complexprescription
 * @property {String} requestId - 
 * @property {String} bsnr - 
 * @property {String} lanr - 
 * @property {String} locationId - 
 * @property {String} employeeId - 
 * @property {String} patientId - 
 * @property {String} caseFolderId - 
 * @property {String} comment - 
 * @property {Array.<module:v_complexprescriptionSchema.dispatchActivitiesObj>} dispatchActivities - 
 */