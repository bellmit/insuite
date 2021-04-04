/**
 * @module kvcmessageSchema
 */

/**
 * @typedef {Object} module:kvcmessageSchema.attachmentsObj
 * @property {String} contentType - 
 * @property {String} filename - 
 * @property {String} generatedFileName - 
 * @property {String} contentId - 
 * @property {String} contentDisposition - 
 * @property {String} charset - 
 * @property {Object} content - 
 * @property {String} contentFileId - 
 * @property {Number} size - 
 */


/**
 * @typedef {Object} module:kvcmessageSchema._errorsObj
 * @property {Number} code - 
 * @property {String} message - 
 * @property {Boolean} technical - 
 * @property {String} type - 
 */


/**
 * @typedef {Object} module:kvcmessageSchema.kvcmessage
 * @property {String} from - 
 * @property {String} to - 
 * @property {String} subject - 
 * @property {String} kvcServiceId - 
 * @property {String} kvcServiceType - 
 * @property {String} contentType - 
 * @property {String} kvcTransmitterSystem - 
 * @property {String} messageId - 
 * @property {String} originalMessageId - 
 * @property {String} dispositionNotificationTo - 
 * @property {String} returnPath - 
 * @property {String} text - 
 * @property {Date} sentAt - 
 * @property {Date} receivedAt - 
 * @property {Array.<module:kvcmessageSchema._errorsObj>} _errors - 
 * @property {Object} rawData - 
 * @property {Object} rawDataEncrypted - 
 * @property {String} messageType - 
 * @property {String} messageStatus - 
 * @property {String} kbvlogId - 
 * @property {String} lablogId - 
 * @property {Array.<module:kvcmessageSchema.attachmentsObj>} attachments - 
 * @property {String} serverStatus - 
 * @property {Boolean} confirmed - 
 * @property {Object} extra - 
 */