/**
 * @module callauditSchema
 */

/**
 * @typedef {Object} module:callauditSchema.calleeObj
 * @property {string} customerNo - 
 * @property {string} dcCustomerNo - 
 * @property {string} identityId - 
 * @property {string} tenantId - 
 * @property {String} firstname - 
 * @property {String} lastname - 
 * @property {String} type - 
 * @property {String} email - 
 * @property {String} locationName - 
 * @property {string} host - 
 * @property {string} prcId - 
 * @property {boolean} rejected - 
 * @property {boolean} picked - 
 */


/**
 * @typedef {Object} module:callauditSchema.callerObj
 * @property {string} customerNo - 
 * @property {string} dcCustomerNo - 
 * @property {string} identityId - 
 * @property {string} tenantId - 
 * @property {String} firstname - 
 * @property {String} lastname - 
 * @property {String} type - 
 * @property {String} email - 
 * @property {String} locationName - 
 * @property {string} host - 
 * @property {string} prcId - 
 * @property {boolean} rejected - 
 * @property {boolean} picked - 
 */


/**
 * @typedef {Object} module:callauditSchema.callaudit
 * @property {string} customerNo - 
 * @property {string} dcCustomerNo - 
 * @property {string} identityId - 
 * @property {string} tenantId - 
 * @property {String} firstname - 
 * @property {String} lastname - 
 * @property {String} type - 
 * @property {String} email - 
 * @property {String} locationName - 
 * @property {string} employeeId - 
 * @property {Date} callTime - 
 * @property {string} callId - 
 * @property {string} reason - 
 * @property {string} consultNote - 
 * @property {Array.<module:callauditSchema.callerObj>} caller - 
 * @property {Array.<module:callauditSchema.calleeObj>} callee - 
 * @property {boolean} picked - 
 * @property {boolean} cancelled - 
 * @property {Date} joinedAt - 
 * @property {Date} lastJoin - 
 * @property {Date} leftAt - 
 * @property {number} duration - 
 * @property {boolean} isTeleconsult - 
 * @property {string} status - 
 */