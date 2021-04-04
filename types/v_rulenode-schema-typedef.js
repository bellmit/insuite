/**
 * @module v_rulenodeSchema
 */

/**
 * @typedef {Object} module:v_rulenodeSchema.actionsObj
 * @property {String} type - 
 */


/**
 * @typedef {Object} module:v_rulenodeSchema.rulesObj
 * @property {Boolean} isActive - 
 * @property {String} description - 
 * @property {Object} validations - 
 * @property {Array.<module:v_rulenodeSchema.actionsObj>} actions - 
 */


/**
 * @typedef {Object} module:v_rulenodeSchema.v_rulenode
 * @property {Array.<module:v_rulenodeSchema.rulesObj>} rules - 
 */