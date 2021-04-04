/**
 * @module contactSchema
 */

/**
 * @typedef {Object} module:contactSchema.partnerIdsObj
 * @property {String} partnerId - 
 */


/**
 * @typedef {Object} module:contactSchema.addressesObj
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
 * @typedef {Object} module:contactSchema.communicationsObj
 * @property {String} type - 
 * @property {Boolean} preferred - 
 * @property {String} value - 
 * @property {String} note - 
 * @property {Boolean} signaling - 
 * @property {Boolean} confirmed - 
 * @property {Boolean} confirmNeeded - 
 */


/**
 * @typedef {Object} module:contactSchema.accountsObj
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
 * @typedef {Object} module:contactSchema.contact
 * @property {string} optIn - 
 * @property {boolean} confirmed - 
 * @property {boolean} patient - 
 * @property {String} firstname - 
 * @property {Date} dob - 
 * @property {String} centralContact - 
 * @property {String} title - 
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
 * @property {Array.<module:contactSchema.accountsObj>} accounts - 
 * @property {Boolean} activeState - 
 * @property {Array.<module:contactSchema.communicationsObj>} communications - 
 * @property {Array.<module:contactSchema.addressesObj>} addresses - 
 * @property {String} talk - 
 * @property {Date} from - 
 * @property {Date} to - 
 * @property {string} persService - 
 * @property {String} attribute - 
 * @property {Array.<module:contactSchema.partnerIdsObj>} partnerIds - 
 */