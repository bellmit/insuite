/**
 * @module kbvlogSchema
 */

/**
 * @typedef {Object} module:kbvlogSchema.attachmentsObj
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
 * @typedef {Object} module:kbvlogSchema._errorsObj
 * @property {Number} code - 
 * @property {String} message - 
 * @property {Boolean} technical - 
 * @property {String} type - 
 */


/**
 * @typedef {Object} module:kbvlogSchema.messagesObj
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
 * @property {Array.<module:kbvlogSchema._errorsObj>} _errors - 
 * @property {Object} rawData - 
 * @property {Object} rawDataEncrypted - 
 * @property {String} messageType - 
 * @property {String} messageStatus - 
 * @property {String} kbvlogId - 
 * @property {String} lablogId - 
 * @property {Array.<module:kbvlogSchema.attachmentsObj>} attachments - 
 * @property {String} serverStatus - 
 * @property {Boolean} confirmed - 
 * @property {Object} extra - 
 */


/**
 * @typedef {Object} module:kbvlogSchema.kvcaEntryObj
 * @property {String} kv - 
 * @property {String} kvName - 
 * @property {String} kvcaType - 
 * @property {String} kvcaAddress - 
 * @property {String} version - 
 * @property {Object} functions - 
 */


/**
 * @typedef {Object} module:kbvlogSchema.userObj
 * @property {String} name - 
 * @property {String} employeeNo - 
 * @property {String} initials - 
 */


/**
 * @typedef {Object} module:kbvlogSchema.kbvlog
 * @property {String} mainLocationId - 
 * @property {String} commercialNo - 
 * @property {String} locname - 
 * @property {String} countryCode - 
 * @property {String} totalItems - 
 * @property {Array.<module:kbvlogSchema.userObj>} user - 
 * @property {Date} lastUpdate - 
 * @property {String} status - 
 * @property {String} _log_version - 
 * @property {Date} created - 
 * @property {Boolean} isPreValidated - 
 * @property {Boolean} isContentOutdated - 
 * @property {Array} notApproved - 
 * @property {String} pid - 
 * @property {Number} priceTotal - 
 * @property {Number} pointsTotal - 
 * @property {Number} pricePerPatient - 
 * @property {Number} pointsPerPatient - 
 * @property {String} replacedLogId - 
 * @property {Boolean} replacement - 
 * @property {Number} version - 
 * @property {Array.<String>} excludedPatientIds - 
 * @property {Array.<String>} mediportNotAllowedPatientIds - 
 * @property {Array.<String>} excludedScheinIds - 
 * @property {Array.<String>} unknownInsuranceScheinIds - 
 * @property {String} guid - 
 * @property {Number} number - 
 * @property {Boolean} complete - 
 * @property {Boolean} test - 
 * @property {Number} quarter - 
 * @property {Number} year - 
 * @property {String} destination - 
 * @property {String} conFileName - 
 * @property {String} conFileId - 
 * @property {String} xkmFileName - 
 * @property {String} xkmFileId - 
 * @property {String} pdfMediaId - 
 * @property {Array.<module:kbvlogSchema.kvcaEntryObj>} kvcaEntry - 
 * @property {String} addressee - 
 * @property {String} sender - 
 * @property {String} from - 
 * @property {String} sentId - 
 * @property {Date} delivered - 
 * @property {Date} responded - 
 * @property {Object} QPZ - 
 * @property {Object} statFiles - 
 * @property {Object} sourceConFiles - 
 * @property {Object} scanProtocolId - 
 * @property {Array.<module:kbvlogSchema.messagesObj>} messages - 
 */