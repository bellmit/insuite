/**
 * @module authSchema
 */

/**
 * @typedef {Object} module:authSchema.TOKENSObj
 * @property {string} CL - 
 * @property {string} CLS - 
 * @property {string} URI - 
 * @property {string} CODE - 
 * @property {string} TOK - 
 * @property {string} RTOK - 
 * @property {boolean} V - 
 * @property {Date} D - 
 */


/**
 * @typedef {Object} module:authSchema.auth
 * @property {string} id - 
 * @property {Date} checkinTime - 
 * @property {string} U - 
 * @property {string} P - 
 * @property {string} tenantId - 
 * @property {string} identityId - 
 * @property {boolean} V - 
 * @property {Date} D - 
 * @property {Array.<module:authSchema.TOKENSObj>} TOKENS - 
 * @property {String} country - 
 * @property {String} host - 
 * @property {string} sessionId - 
 * @property {String} ip - 
 * @property {String} deviceName - 
 * @property {string} accessCode - 
 * @property {number} failureCounter - 
 */