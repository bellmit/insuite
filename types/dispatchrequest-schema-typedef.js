/**
 * @module dispatchrequestSchema
 */

/**
 * @typedef {Object} module:dispatchrequestSchema.notifiedActivitiesObj
 * @property {Array.<String>} activityId - 
 * @property {String} actType - 
 * @property {String} codePZN - 
 * @property {String} codeHMV - 
 * @property {String} note - 
 * @property {String} dose - 
 * @property {Number} quantity - 
 * @property {String} prescPeriod - 
 * @property {Boolean} valid - 
 */


/**
 * @typedef {Object} module:dispatchrequestSchema.activitiesObj
 * @property {Array.<String>} activityId - 
 * @property {String} actType - 
 * @property {String} codePZN - 
 * @property {String} codeHMV - 
 * @property {String} note - 
 * @property {String} dose - 
 * @property {Number} quantity - 
 * @property {String} prescPeriod - 
 * @property {Boolean} valid - 
 */


/**
 * @typedef {Object} module:dispatchrequestSchema.dispatchActivitiesObj
 * @property {String} activityId - 
 * @property {String} actType - 
 * @property {Date} prescriptionDate - 
 * @property {String} fileName - 
 * @property {String} fileContentBase64 - 
 * @property {String} fileDocumentId - 
 * @property {Array.<module:dispatchrequestSchema.activitiesObj>} activities - 
 * @property {Array.<module:dispatchrequestSchema.notifiedActivitiesObj>} notifiedActivities - 
 */


/**
 * @typedef {Object} module:dispatchrequestSchema.dispatchrequest
 * @property {String} bsnr - 
 * @property {String} lanr - 
 * @property {String} employeeId - 
 * @property {String} patientId - 
 * @property {Array.<module:dispatchrequestSchema.dispatchActivitiesObj>} dispatchActivities - 
 * @property {Date} createdDate - 
 * @property {Date} dateConfirmed - 
 * @property {Number} status - 
 * @property {String} comment - 
 * @property {String} careTitle - 
 * @property {String} carePhone - 
 */