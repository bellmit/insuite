/**
 * @module patienttransferSchema
 */

/**
 * @typedef {Object} module:patienttransferSchema.receiverKimAccountsObj
 * @property {String} id - 
 * @property {String} displayName - 
 * @property {String} mail - 
 * @property {String} accountType - 
 */


/**
 * @typedef {Object} module:patienttransferSchema.senderKimAccountsObj
 * @property {String} id - 
 * @property {String} username - 
 * @property {Array.<String>} authorisedUsers - 
 */


/**
 * @typedef {Object} module:patienttransferSchema.kimRecipientObj
 * @property {String} id - 
 * @property {String} displayName - 
 * @property {Array.<String>} mail - 
 * @property {String} accountType - 
 */


/**
 * @typedef {Object} module:patienttransferSchema.partnersObj
 * @property {String} name - 
 * @property {String} dcId - 
 * @property {String} partnerType - 
 * @property {String} comment - 
 */


/**
 * @typedef {Object} module:patienttransferSchema.attachedMediaObj
 * @property {String} mediaId - 
 * @property {String} contentType - 
 * @property {String} caption - 
 * @property {String} title - 
 * @property {String} malwareWarning - 
 */


/**
 * @typedef {Object} module:patienttransferSchema.userObj
 * @property {String} name - 
 * @property {String} employeeNo - 
 * @property {String} initials - 
 */


/**
 * @typedef {Object} module:patienttransferSchema.patienttransfer
 * @property {Date} timestamp - 
 * @property {Date} created - 
 * @property {Array.<String>} mirrorActivitiesIds - 
 * @property {Array.<String>} mirrorActivitiesActTypes - 
 * @property {String} practiceName - 
 * @property {String} practiceCity - 
 * @property {String} doctorName - 
 * @property {String} patientId - 
 * @property {String} mirrorPatientName - 
 * @property {String} mirrorPatientId - 
 * @property {String} patientName - 
 * @property {String} patientPseudonym - 
 * @property {String} status - 
 * @property {Array.<module:patienttransferSchema.userObj>} user - 
 * @property {String} textContent - 
 * @property {String} subject - 
 * @property {Array.<module:patienttransferSchema.attachedMediaObj>} attachedMedia - 
 * @property {Array.<module:patienttransferSchema.partnersObj>} partners - 
 * @property {Boolean} preservedCaseFolders - 
 * @property {Boolean} unlock - 
 * @property {String} requestId - 
 * @property {Array.<module:patienttransferSchema.kimRecipientObj>} kimRecipient - 
 * @property {String} kimSender - 
 * @property {Array.<module:patienttransferSchema.senderKimAccountsObj>} senderKimAccounts - 
 * @property {Array.<module:patienttransferSchema.receiverKimAccountsObj>} receiverKimAccounts - 
 * @property {String} emailType - 
 * @property {String} messageID - 
 * @property {String} kimReceiverEmail - 
 * @property {String} kimAccount - 
 * @property {Object} parsedKIMPatient - 
 * @property {Array.<String>} activityIds - 
 */