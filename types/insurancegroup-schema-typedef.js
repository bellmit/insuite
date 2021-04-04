/**
 * @module insurancegroupSchema
 */

/**
 * @typedef {Object} module:insurancegroupSchema.contentObj
 * @property {String} name - 
 * @property {String} vknr - 
 */


/**
 * @typedef {Object} module:insurancegroupSchema.itemsObj
 * @property {String} serialNo - 
 * @property {Array.<module:insurancegroupSchema.contentObj>} content - 
 */


/**
 * @typedef {Object} module:insurancegroupSchema.insurancegroup
 * @property {String} name - 
 * @property {Array.<module:insurancegroupSchema.itemsObj>} items - 
 */