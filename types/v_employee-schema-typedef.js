/**
 * @module v_employeeSchema
 */

/**
 * @typedef {Object} module:v_employeeSchema.memberOfObj
 * @property {String} group - 
 */


/**
 * @typedef {Object} module:v_employeeSchema.notificationsObj
 * @property {String} type - 
 * @property {Boolean} active - 
 */


/**
 * @typedef {Object} module:v_employeeSchema.locationsObj
 * @property {String} _id - 
 * @property {String} locname - 
 */


/**
 * @typedef {Object} module:v_employeeSchema.addressesObj
 * @property {String} street - 
 * @property {String} houseno - 
 * @property {String} zip - 
 * @property {String} city - 
 * @property {String} postbox - 
 * @property {String} kind - 
 * @property {String} country - 
 * @property {String} countryCode - 
 * @property {String} receiver - 
 * @property {String} payerType - 
 * @property {String} addon - 
 * @property {String} talk - 
 * @property {String} title - 
 * @property {String} firstname - 
 * @property {String} nameaffix - 
 * @property {String} middlename - 
 * @property {String} lastname - 
 * @property {String} cantonCode - 
 */


/**
 * @typedef {Object} module:v_employeeSchema.communicationsObj
 * @property {String} type - 
 * @property {Boolean} preferred - 
 * @property {String} value - 
 * @property {String} note - 
 * @property {Boolean} signaling - 
 * @property {Boolean} confirmed - 
 * @property {Boolean} confirmNeeded - 
 */


/**
 * @typedef {Object} module:v_employeeSchema.accountsObj
 * @property {String} cardType - 
 * @property {String} bankName - 
 * @property {Number} trial - 
 * @property {String} bankIBAN - 
 * @property {String} bankBIC - 
 * @property {String} accountOwner - 
 * @property {String} cardNo - 
 * @property {String} cardCheckCode - 
 * @property {Number} cardValidToMonth - 
 * @property {Number} cardValidToYear - 
 * @property {Boolean} debitAllowed - 
 * @property {Boolean} isOptional - 
 */


/**
 * @typedef {Object} module:v_employeeSchema.v_employee
 * @property {String} title - 
 * @property {String} firstname - 
 * @property {String} nameaffix - 
 * @property {String} middlename - 
 * @property {String} fk3120 - 
 * @property {String} lastname - 
 * @property {String} civilStatus - 
 * @property {String} comment - 
 * @property {String} lang - 
 * @property {String} jobTitle - 
 * @property {String} jobStatus - 
 * @property {Boolean} isPensioner - 
 * @property {String} workingAt - 
 * @property {String} preferLanguage - 
 * @property {String} workingAtRef - 
 * @property {Array.<module:v_employeeSchema.accountsObj>} accounts - 
 * @property {Boolean} activeState - 
 * @property {Array.<module:v_employeeSchema.communicationsObj>} communications - 
 * @property {Array.<module:v_employeeSchema.addressesObj>} addresses - 
 * @property {String} type - 
 * @property {Date} from - 
 * @property {Date} to - 
 * @property {String} department - 
 * @property {String} employeeNo - 
 * @property {Array.<String>} specialities - 
 * @property {String} specialisationText - 
 * @property {Array.<module:v_employeeSchema.locationsObj>} locations - 
 * @property {String} talk - 
 * @property {Date} dob - 
 * @property {String} gender - 
 * @property {boolean} isSupport - 
 * @property {boolean} physicianInQualification - 
 * @property {Number} rlvCapacity - 
 * @property {String} rlvPhysician - 
 * @property {String} workDescription - 
 * @property {String} physicianIknr - 
 * @property {String} physicianType - 
 * @property {Array.<String>} asvTeamNumbers - 
 * @property {Array.<String>} asvSpecializations - 
 * @property {Array.<module:v_employeeSchema.notificationsObj>} notifications - 
 * @property {String} asvMembershipType - 
 * @property {String} arztstempel - 
 * @property {String} pvsCustomerNo - 
 * @property {Boolean} fromLDAP - 
 * @property {Array.<String>} countryMode - 
 * @property {Boolean} activeActive - 
 * @property {Array.<String>} qualiDignities - 
 * @property {Array.<String>} quantiDignities - 
 * @property {String} username - 
 * @property {String} initials - 
 * @property {Array.<module:v_employeeSchema.memberOfObj>} memberOf - 
 * @property {Array.<String>} roles - 
 * @property {String} preferredLanguage - 
 * @property {String} currentLocation - 
 * @property {String} labdataSortOrder - 
 * @property {Array.<String>} bsnrs - 
 * @property {Array.<String>} expertise - 
 * @property {String} officialNo - 
 * @property {Boolean} nonStandardOfficialNo - 
 * @property {Boolean} ownZsrNumber - 
 * @property {String} glnNumber - 
 * @property {String} zsrNumber - 
 * @property {String} kNumber - 
 * @property {String} status - 
 */