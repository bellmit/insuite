/**
 * @module inpacsconfigurationSchema
 */

/**
 * @typedef {Object} module:inpacsconfigurationSchema.modalitiesObj
 * @property {String} type - 
 * @property {Boolean} isActive - 
 * @property {String} workListId - 
 * @property {Number} numberOfImages - 
 */


/**
 * @typedef {Object} module:inpacsconfigurationSchema.inpacsconfiguration
 * @property {Number} lastLogLine - 
 * @property {String} logLevel - 
 * @property {String} luaScript - 
 * @property {Array.<module:inpacsconfigurationSchema.modalitiesObj>} modalities - 
 * @property {Boolean} isMocking - 
 * @property {String} defaultEncoding - 
 */