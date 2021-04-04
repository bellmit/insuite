/**
 * @module pvslogSchema
 */

/**
 * @typedef {Object} module:pvslogSchema.employeesObj
 * @property {String} _id - 
 * @property {String} firstname - 
 * @property {String} lastname - 
 */


/**
 * @typedef {Object} module:pvslogSchema.insuranceStatusObj
 * @property {String} _id - 
 * @property {String} name - 
 * @property {String} type - 
 */


/**
 * @typedef {Object} module:pvslogSchema.userObj
 * @property {String} name - 
 * @property {String} employeeNo - 
 * @property {String} initials - 
 */


/**
 * @typedef {Object} module:pvslogSchema.pvslog
 * @property {String} mainLocationId - 
 * @property {String} commercialNo - 
 * @property {String} locname - 
 * @property {String} countryCode - 
 * @property {String} totalItems - 
 * @property {Array.<module:pvslogSchema.userObj>} user - 
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
 * @property {String} padnextFileName - 
 * @property {String} padnextFileId - 
 * @property {String} padnextSettingId - 
 * @property {String} padnextSettingTitle - 
 * @property {String} padnextSettingCustomerNo - 
 * @property {String} encryptedPadnextFileName - 
 * @property {String} encryptedPadnextFileId - 
 * @property {Date} startDate - 
 * @property {Boolean} useStartDate - 
 * @property {Date} endDate - 
 * @property {Boolean} useEndDate - 
 * @property {Array.<String>} insuranceTypes - 
 * @property {Boolean} useInsuranceStatus - 
 * @property {Array.<module:pvslogSchema.insuranceStatusObj>} insuranceStatus - 
 * @property {Boolean} withEmptyInsurance - 
 * @property {Number} minTotal - 
 * @property {Boolean} doNotcheckCatalog - 
 * @property {Boolean} employeeFilterEnabled - 
 * @property {Array.<module:pvslogSchema.employeesObj>} employees - 
 */