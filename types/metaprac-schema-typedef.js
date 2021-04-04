/**
 * @module metapracSchema
 */

/**
 * @typedef {Object} module:metapracSchema.pseudonymObj
 * @property {String} pseudonymType - 
 * @property {String} pseudonymIdentifier - 
 */


/**
 * @typedef {Object} module:metapracSchema.configurationObj
 * @property {Array.<String>} actTypes - 
 * @property {Array.<String>} actStatuses - 
 * @property {Array.<String>} caseFolders - 
 * @property {Array.<String>} subTypes - 
 * @property {String} condition - 
 * @property {Boolean} automaticProcessing - 
 */


/**
 * @typedef {Object} module:metapracSchema.invitationsObj
 * @property {string} pin - 
 * @property {Date} expireDate - 
 * @property {Boolean} anonymizing - 
 * @property {Boolean} preserveCaseFolder - 
 * @property {Array.<module:metapracSchema.configurationObj>} configuration - 
 * @property {Boolean} bidirectional - 
 * @property {Array.<String>} anonymizeKeepFields - 
 * @property {Array.<module:metapracSchema.pseudonymObj>} pseudonym - 
 * @property {Boolean} unlock - 
 */


/**
 * @typedef {Object} module:metapracSchema.metaprac
 * @property {string} customerIdPrac - 
 * @property {string} host - 
 * @property {string} pubKey - 
 * @property {string} secret - 
 * @property {string} systemId - 
 * @property {string} systemType - 
 * @property {Array.<module:metapracSchema.invitationsObj>} invitations - 
 * @property {Boolean} onlyPracticesPatientsCanBook - 
 */