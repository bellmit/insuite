/**
 * @module lablogSchema
 */

/**
 * @typedef {Object} module:lablogSchema.patientDiffsObj
 * @property {String} patientId - 
 * @property {Number} nDiffs - 
 * @property {Object} values - 
 */


/**
 * @typedef {Object} module:lablogSchema.userObj
 * @property {String} name - 
 * @property {String} employeeNo - 
 * @property {String} initials - 
 */


/**
 * @typedef {Object} module:lablogSchema.lablog
 * @property {Object} l_data - 
 * @property {Date} timestamp - 
 * @property {Date} created - 
 * @property {String} source - 
 * @property {String} status - 
 * @property {Array.<module:lablogSchema.userObj>} user - 
 * @property {String} fileName - 
 * @property {String} fileHash - 
 * @property {String} fileDatabaseId - 
 * @property {Object} configuration - 
 * @property {Object} pmResults - 
 * @property {String} type - 
 * @property {String} description - 
 * @property {Object} assignedPatient - 
 * @property {Array.<String>} linkedActivities - 
 * @property {String} flow - 
 * @property {Array.<String>} flags - 
 * @property {Array.<String>} associatedPatients - 
 * @property {Number} patientEntriesTotal - 
 * @property {Number} patientEntriesNoMatch - 
 * @property {Boolean} billingFlag - 
 * @property {Boolean} allowGkvBilling - 
 * @property {Boolean} disallowGkvBilling - 
 * @property {Boolean} checkFileWithLdkPm - 
 * @property {Boolean} useAddInfoForId - 
 * @property {String} useAddInfoForIdFK - 
 * @property {Array.<module:lablogSchema.patientDiffsObj>} patientDiffs - 
 * @property {String} sourceFileType - 
 * @property {Object} u_extra - 
 * @property {Array.<Object>} errs - 
 */