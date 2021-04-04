/**
 * @module partnerSchema
 */

/**
 * @typedef {Object} module:partnerSchema.pseudonymObj
 * @property {String} pseudonymType - 
 * @property {String} pseudonymIdentifier - 
 */


/**
 * @typedef {Object} module:partnerSchema.configurationObj
 * @property {Array.<String>} actTypes - 
 * @property {Array.<String>} actStatuses - 
 * @property {Array.<String>} caseFolders - 
 * @property {Array.<String>} subTypes - 
 * @property {String} condition - 
 * @property {Boolean} automaticProcessing - 
 */


/**
 * @typedef {Object} module:partnerSchema.partner
 * @property {String} name - 
 * @property {String} city - 
 * @property {String} dcId - 
 * @property {String} pin - 
 * @property {String} publicKey - 
 * @property {String} partnerType - 
 * @property {String} comment - 
 * @property {String} phone - 
 * @property {String} email - 
 * @property {String} fingerprint - 
 * @property {String} status - 
 * @property {String} systemType - 
 * @property {Boolean} anonymizing - 
 * @property {Boolean} noTransferOfLinkedActivities - 
 * @property {Boolean} preserveCaseFolder - 
 * @property {Array.<module:partnerSchema.configurationObj>} configuration - 
 * @property {Boolean} bidirectional - 
 * @property {Array.<String>} anonymizeKeepFields - 
 * @property {Array.<module:partnerSchema.pseudonymObj>} pseudonym - 
 * @property {Boolean} unlock - 
 * @property {Boolean} activeActive - 
 */