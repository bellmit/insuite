/**
 * @module auditSchema
 */

/**
 * @typedef {Object} module:auditSchema.relatedActivitiesObj
 * @property {String} id - 
 * @property {String} text - 
 */


/**
 * @typedef {Object} module:auditSchema.audit
 * @property {String} user - 
 * @property {String} userId - 
 * @property {String} model - 
 * @property {String} objId - 
 * @property {String} action - 
 * @property {String} attempt - 
 * @property {String} descr - 
 * @property {Date} timestamp - 
 * @property {Array.<module:auditSchema.relatedActivitiesObj>} relatedActivities - 
 * @property {string} sessionId - 
 * @property {String} ip - 
 * @property {String} deviceName - 
 * @property {String} actType - 
 * @property {Object} diff - 
 */