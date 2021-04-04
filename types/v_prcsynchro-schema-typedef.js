/**
 * @module v_prcsynchroSchema
 */

/**
 * @typedef {Object} module:v_prcsynchroSchema.payloadObj
 * @property {String} type - 
 * @property {String} obj - 
 */


/**
 * @typedef {Object} module:v_prcsynchroSchema.communicationsObj
 * @property {String} type - 
 * @property {Boolean} preferred - 
 * @property {String} value - 
 * @property {String} note - 
 * @property {Boolean} signaling - 
 * @property {Boolean} confirmed - 
 * @property {Boolean} confirmNeeded - 
 */


/**
 * @typedef {Object} module:v_prcsynchroSchema.addressesObj
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
 * @typedef {Object} module:v_prcsynchroSchema.v_prcsynchro
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
 * @property {Array.<module:v_prcsynchroSchema.addressesObj>} addresses - 
 * @property {Array.<module:v_prcsynchroSchema.communicationsObj>} communications - 
 * @property {String} mainLocation - 
 * @property {Array.<String>} locationId - 
 * @property {Array.<String>} commercialNo - 
 * @property {Array.<String>} employeeId - 
 * @property {Array.<String>} officialNo - 
 * @property {Array.<String>} patientId - 
 * @property {String} restoreStatus - 
 * @property {Object} centralContact - 
 * @property {Array.<module:v_prcsynchroSchema.payloadObj>} payload - 
 */