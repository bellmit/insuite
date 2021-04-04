/**
 * @module invoicelogSchema
 */

/**
 * @typedef {Object} module:invoicelogSchema.userObj
 * @property {String} name - 
 * @property {String} employeeNo - 
 * @property {String} initials - 
 */


/**
 * @typedef {Object} module:invoicelogSchema.invoicelog
 * @property {String} mainLocationId - 
 * @property {String} commercialNo - 
 * @property {String} locname - 
 * @property {String} countryCode - 
 * @property {String} totalItems - 
 * @property {Array.<module:invoicelogSchema.userObj>} user - 
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
 */