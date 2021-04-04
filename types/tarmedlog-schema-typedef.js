/**
 * @module tarmedlogSchema
 */

/**
 * @typedef {Object} module:tarmedlogSchema.warningsObj
 * @property {String} text - 
 */


/**
 * @typedef {Object} module:tarmedlogSchema.outputObj
 * @property {String} text - 
 */


/**
 * @typedef {Object} module:tarmedlogSchema.billerObj
 * @property {String} name - 
 * @property {String} glnNumber - 
 */


/**
 * @typedef {Object} module:tarmedlogSchema.employeesObj
 * @property {String} firstname - 
 * @property {String} lastname - 
 * @property {Array.<String>} billingRole - 
 */


/**
 * @typedef {Object} module:tarmedlogSchema.userObj
 * @property {String} name - 
 * @property {String} employeeNo - 
 * @property {String} initials - 
 */


/**
 * @typedef {Object} module:tarmedlogSchema.tarmedlog
 * @property {String} mainLocationId - 
 * @property {String} commercialNo - 
 * @property {String} locname - 
 * @property {String} countryCode - 
 * @property {String} totalItems - 
 * @property {Array.<module:tarmedlogSchema.userObj>} user - 
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
 * @property {Date} startDate - 
 * @property {Boolean} useStartDate - 
 * @property {Date} endDate - 
 * @property {Boolean} useEndDate - 
 * @property {Array.<String>} insuranceTypes - 
 * @property {Number} minTotal - 
 * @property {String} kvgSettingTitle - 
 * @property {String} law - 
 * @property {Array.<module:tarmedlogSchema.employeesObj>} employees - 
 * @property {Boolean} billerEqualToProvider - 
 * @property {module:tarmedlogSchema.billerObj} biller - 
 * @property {Array.<module:tarmedlogSchema.outputObj>} output - 
 * @property {Array.<module:tarmedlogSchema.warningsObj>} warnings - 
 * @property {Array.<object>} invoiceDocs - 
 * @property {String} deliveryType - 
 * @property {Boolean} isTiersGarant - 
 * @property {Boolean} isTiersPayant - 
 * @property {String} pdfFile - 
 * @property {Boolean} collectMedidataRejected - 
 * @property {Boolean} firstCollecting - 
 */