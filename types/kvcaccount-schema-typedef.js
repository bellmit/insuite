/**
 * @module kvcaccountSchema
 */

/**
 * @typedef {Object} module:kvcaccountSchema.certificatesObj
 * @property {Date} validFrom - 
 * @property {Date} validTo - 
 * @property {String} pin - 
 * @property {String} signedCertificateFileId - 
 * @property {String} csrFileId - 
 * @property {String} csrId - 
 * @property {String} csrStatus - 
 * @property {String} privateKeyFileId - 
 * @property {String} publicKeyFileId - 
 */


/**
 * @typedef {Object} module:kvcaccountSchema.kvcaccount
 * @property {String} uid - 
 * @property {String} status - 
 * @property {String} statusMessage - 
 * @property {String} username - 
 * @property {String} password - 
 * @property {Date} lastKvcLogin - 
 * @property {Boolean} passwordChangeNeeded - 
 * @property {Date} passwordLastChange - 
 * @property {String} certificateStatus - 
 * @property {Array.<module:kvcaccountSchema.certificatesObj>} certificates - 
 * @property {Array.<String>} locationIds - 
 */