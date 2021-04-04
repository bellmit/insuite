/**
 * @module appregSchema
 */

/**
 * @typedef {Object} module:appregSchema.routeOverrideConfigurationObj
 * @property {String} pathMatch - 
 * @property {String} hashMatch - 
 * @property {String} pathReplace - 
 * @property {String} hashReplace - 
 * @property {String} pathStringMatchType - 
 * @property {String} hashStringMatchType - 
 * @property {String} appName - 
 * @property {String} description - 
 * @property {String} appIcon - 
 */


/**
 * @typedef {Object} module:appregSchema.webHooksConfigurationObj
 * @property {String} type - 
 * @property {String} targetUrl - 
 */


/**
 * @typedef {Object} module:appregSchema.buttonTextObj
 * @property {String} en - 
 * @property {String} de - 
 */


/**
 * @typedef {Object} module:appregSchema.tabTitleObj
 * @property {String} en - 
 * @property {String} de - 
 */


/**
 * @typedef {Object} module:appregSchema.uiConfigurationObj
 * @property {String} type - 
 * @property {String} targetUrl - 
 * @property {String} tabName - 
 * @property {module:appregSchema.tabTitleObj} tabTitle - 
 * @property {Array.<String>} tabActiveActTypes - 
 * @property {module:appregSchema.buttonTextObj} buttonText - 
 * @property {Boolean} activeTab - 
 * @property {Array.<String>} hiddenTabs - 
 */


/**
 * @typedef {Object} module:appregSchema.appreg
 * @property {String} appName - 
 * @property {String} title - 
 * @property {String} description - 
 * @property {String} appVersion - 
 * @property {String} storeVersion - 
 * @property {Boolean} versionIsOutdated - 
 * @property {String} appCurrentPort - 
 * @property {String} appHost - 
 * @property {String} appHostType - 
 * @property {String} dbPassword - 
 * @property {Boolean} hasAccess - 
 * @property {Array.<module:appregSchema.uiConfigurationObj>} uiConfiguration - 
 * @property {Array.<module:appregSchema.webHooksConfigurationObj>} webHooksConfiguration - 
 * @property {Array.<module:appregSchema.routeOverrideConfigurationObj>} routeOverrideConfiguration - 
 * @property {String} inSuiteToken - 
 * @property {String} solToken - 
 */