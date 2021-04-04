/**
 * @module basecontactSchema
 */

/**
 * @typedef {Object} module:basecontactSchema.communicationsObj
 * @property {String} type - 
 * @property {Boolean} preferred - 
 * @property {String} value - 
 * @property {String} note - 
 * @property {Boolean} signaling - 
 * @property {Boolean} confirmed - 
 * @property {Boolean} confirmNeeded - 
 */


/**
 * @typedef {Object} module:basecontactSchema.addressesObj
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
 * @typedef {Object} module:basecontactSchema.basecontact
 * @property {String} baseContactType - 
 * @property {String} content - 
 * @property {Array.<module:basecontactSchema.addressesObj>} addresses - 
 * @property {Array.<module:basecontactSchema.communicationsObj>} communications - 
 * @property {String} talk - 
 * @property {String} title - 
 * @property {String} nameaffix - 
 * @property {String} firstname - 
 * @property {String} lastname - 
 * @property {String} institutionType - 
 * @property {Date} lastChanged - 
 * @property {String} status - 
 * @property {Array.<String>} bsnrs - 
 * @property {Array.<String>} expertise - 
 * @property {String} workDescription - 
 * @property {String} officialNo - 
 * @property {Boolean} nonStandardOfficialNo - 
 * @property {Array.<String>} asvTeamNumbers - 
 * @property {Boolean} ownZsrNumber - 
 * @property {String} glnNumber - 
 * @property {String} zsrNumber - 
 * @property {String} kNumber - 
 * @property {String} institutionName - 
 * @property {String} supplierCustomerId - 
 * @property {ObjectId} defaultFormId - 
 * @property {Boolean} sendElectronicOrder - 
 * @property {Boolean} isMainSupplier - 
 * @property {String} companyName - 
 * @property {Array.<ObjectId>} contacts - 
 */