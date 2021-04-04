/**
 * @module v_institutioncontactSchema
 */

/**
 * @typedef {Object} module:v_institutioncontactSchema.communicationsObj
 * @property {String} type - 
 * @property {Boolean} preferred - 
 * @property {String} value - 
 * @property {String} note - 
 * @property {Boolean} signaling - 
 * @property {Boolean} confirmed - 
 * @property {Boolean} confirmNeeded - 
 */


/**
 * @typedef {Object} module:v_institutioncontactSchema.addressesObj
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
 * @typedef {Object} module:v_institutioncontactSchema.v_institutioncontact
 * @property {String} baseContactType - 
 * @property {String} institutionType - 
 * @property {String} content - 
 * @property {Array.<module:v_institutioncontactSchema.addressesObj>} addresses - 
 * @property {Array.<module:v_institutioncontactSchema.communicationsObj>} communications - 
 * @property {String} talk - 
 * @property {String} title - 
 * @property {String} nameaffix - 
 * @property {String} firstname - 
 * @property {String} lastname - 
 * @property {Date} lastChanged - 
 * @property {String} status - 
 * @property {String} institutionName - 
 * @property {String} supplierCustomerId - 
 * @property {ObjectId} defaultFormId - 
 * @property {Boolean} sendElectronicOrder - 
 * @property {Boolean} isMainSupplier - 
 * @property {Array.<ObjectId>} contacts - 
 */