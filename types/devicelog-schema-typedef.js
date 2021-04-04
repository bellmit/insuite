/**
 * @module devicelogSchema
 */

/**
 * @typedef {Object} module:devicelogSchema.userObj
 * @property {String} name - 
 * @property {String} employeeNo - 
 * @property {String} initials - 
 */


/**
 * @typedef {Object} module:devicelogSchema.attachedMediaObj
 * @property {String} mediaId - 
 * @property {String} contentType - 
 * @property {String} caption - 
 * @property {String} title - 
 * @property {String} malwareWarning - 
 */


/**
 * @typedef {Object} module:devicelogSchema.devicelog
 * @property {Date} timestamp - 
 * @property {Date} created - 
 * @property {String} patientId - 
 * @property {String} patientName - 
 * @property {String} activityId - 
 * @property {String} status - 
 * @property {String} deviceId - 
 * @property {Array.<module:devicelogSchema.attachedMediaObj>} attachedMedia - 
 * @property {Array.<String>} attachments - 
 * @property {Array.<module:devicelogSchema.userObj>} user - 
 * @property {String} fileName - 
 * @property {String} fileHash - 
 */