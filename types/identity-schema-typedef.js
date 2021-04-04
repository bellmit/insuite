/**
 * @module identitySchema
 */

/**
 * @typedef {Object} module:identitySchema.locationsObj
 * @property {String} _id - 
 * @property {String} locname - 
 */


/**
 * @typedef {Object} module:identitySchema.memberOfObj
 * @property {String} group - 
 */


/**
 * @typedef {Object} module:identitySchema.partnerIdsObj
 * @property {String} partnerId - 
 */


/**
 * @typedef {Object} module:identitySchema.identity
 * @property {String} specifiedBy - 
 * @property {String} firstname - 
 * @property {String} lastname - 
 * @property {String} country - 
 * @property {String} pw - 
 * @property {String} cardKey - 
 * @property {String} companySecret - 
 * @property {Date} validFrom - 
 * @property {Date} validTo - 
 * @property {Date} expireDate - 
 * @property {String} status - 
 * @property {String} pwResetToken - 
 * @property {String} loginToken - 
 * @property {Date} nextLoginAttempt - 
 * @property {number} failedLoginCount - 
 * @property {object} jawboneData - 
 * @property {Array.<module:identitySchema.partnerIdsObj>} partnerIds - 
 * @property {object} profileLastActivated - 
 * @property {Date} lastChanged - 
 * @property {boolean} onlineEmp - 
 * @property {boolean} onlinePat - 
 * @property {boolean} onlinePartner - 
 * @property {String} username - 
 * @property {String} initials - 
 * @property {Array.<module:identitySchema.memberOfObj>} memberOf - 
 * @property {Array.<String>} roles - 
 * @property {String} preferredLanguage - 
 * @property {String} currentLocation - 
 * @property {String} labdataSortOrder - 
 * @property {Array.<module:identitySchema.locationsObj>} locations - 
 * @property {Boolean} signaling - 
 */