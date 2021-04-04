/**
 * @module prcdispatchSchema
 */

/**
 * @typedef {Object} module:prcdispatchSchema.communicationsObj
 * @property {String} type - 
 * @property {Boolean} preferred - 
 * @property {String} value - 
 * @property {String} note - 
 * @property {Boolean} signaling - 
 * @property {Boolean} confirmed - 
 * @property {Boolean} confirmNeeded - 
 */


/**
 * @typedef {Object} module:prcdispatchSchema.addressesObj
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
 * @typedef {Object} module:prcdispatchSchema.prcdispatch
 * @property {String} publicKey - 
 * @property {String} prcCustomerNo - 
 * @property {String} customerNo - 
 * @property {String} customerId - 
 * @property {String} coname - 
 * @property {String} cotype - 
 * @property {Boolean} activeState - 
 * @property {Date} lastOnline - 
 * @property {String} version - 
 * @property {String} hostname - 
 * @property {Array.<module:prcdispatchSchema.addressesObj>} addresses - 
 * @property {Array.<module:prcdispatchSchema.communicationsObj>} communications - 
 * @property {String} mainLocation - 
 * @property {Array.<String>} locationId - 
 * @property {Array.<String>} commercialNo - 
 * @property {Array.<String>} employeeId - 
 * @property {Array.<String>} officialNo - 
 * @property {Array.<String>} patientId - 
 * @property {String} restoreStatus - 
 * @property {Object} centralContact - 
 */