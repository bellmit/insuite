/**
 * @module syncdispatchSchema
 */

/**
 * @typedef {Object} module:syncdispatchSchema.pseudonymObj
 * @property {String} pseudonymType - 
 * @property {String} pseudonymIdentifier - 
 */


/**
 * @typedef {Object} module:syncdispatchSchema.configurationObj
 * @property {Array.<String>} actTypes - 
 * @property {Array.<String>} actStatuses - 
 * @property {Array.<String>} caseFolders - 
 * @property {Array.<String>} subTypes - 
 * @property {String} condition - 
 * @property {Boolean} automaticProcessing - 
 */


/**
 * @typedef {Object} module:syncdispatchSchema.partnersObj
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
 * @property {Array.<module:syncdispatchSchema.configurationObj>} configuration - 
 * @property {Boolean} bidirectional - 
 * @property {Array.<String>} anonymizeKeepFields - 
 * @property {Array.<module:syncdispatchSchema.pseudonymObj>} pseudonym - 
 * @property {Boolean} unlock - 
 * @property {Boolean} activeActive - 
 */


/**
 * @typedef {Object} module:syncdispatchSchema.syncdispatch
 * @property {String} entryId - 
 * @property {String} entityName - 
 * @property {String} systemType - 
 * @property {Date} timestamp - 
 * @property {Object} addedFrom - 
 * @property {Number} sequenceNo - 
 * @property {Boolean} onDelete - 
 * @property {Date} lastChanged - 
 * @property {Array.<module:syncdispatchSchema.partnersObj>} partners - 
 */