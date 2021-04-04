/**
 * @module dashboardSchema
 */

/**
 * @typedef {Object} module:dashboardSchema.gadgetsObj
 * @property {Number} gadgetConst - 
 * @property {Object} config - 
 */


/**
 * @typedef {Object} module:dashboardSchema.collectionsObj
 * @property {Array.<module:dashboardSchema.gadgetsObj>} gadgets - 
 */


/**
 * @typedef {Object} module:dashboardSchema.dashboardsObj
 * @property {String} name - 
 * @property {Number} layout - 
 * @property {String} maximized - 
 * @property {Array.<module:dashboardSchema.collectionsObj>} collections - 
 */


/**
 * @typedef {Object} module:dashboardSchema.dashboard
 * @property {String} userId - 
 * @property {String} environment - 
 * @property {String} activeDashboardId - 
 * @property {Array.<module:dashboardSchema.dashboardsObj>} dashboards - 
 */