/**
 * @module medicationscatalogSchema
 */

/**
 * @typedef {Object} module:medicationscatalogSchema.phIngrObj
 * @property {String} code - 
 * @property {String} name - 
 * @property {String} shortName - 
 * @property {String} strength - 
 * @property {String} type - 
 */


/**
 * @typedef {Object} module:medicationscatalogSchema.SPCObj
 * @property {String} title - 
 * @property {String} content - 
 */


/**
 * @typedef {Object} module:medicationscatalogSchema.BIObj
 * @property {String} title - 
 * @property {String} content - 
 */


/**
 * @typedef {Object} module:medicationscatalogSchema.documentsObj
 * @property {Array.<module:medicationscatalogSchema.BIObj>} BI - 
 * @property {Array.<module:medicationscatalogSchema.SPCObj>} SPC - 
 */


/**
 * @typedef {Object} module:medicationscatalogSchema.packageListObj
 * @property {String} pzn - 
 * @property {String} name - 
 * @property {Number} quantity - 
 * @property {Number} PRICE_PATIENTPAYMENT - 
 * @property {Number} PRICE_PHARMACYBUY - 
 * @property {Number} PRICE_PHARMACYSALE - 
 * @property {Number} PRICE_FIXED - 
 */


/**
 * @typedef {Object} module:medicationscatalogSchema.childrenObj
 * @property {String} name - 
 * @property {String} atcCode - 
 * @property {String} upperCode - 
 */


/**
 * @typedef {Object} module:medicationscatalogSchema.childrenObj
 * @property {String} name - 
 * @property {String} atcCode - 
 * @property {String} upperCode - 
 * @property {Array.<module:medicationscatalogSchema.childrenObj>} children - 
 */


/**
 * @typedef {Object} module:medicationscatalogSchema.childrenObj
 * @property {String} name - 
 * @property {String} atcCode - 
 * @property {String} upperCode - 
 * @property {Array.<module:medicationscatalogSchema.childrenObj>} children - 
 */


/**
 * @typedef {Object} module:medicationscatalogSchema.childrenObj
 * @property {String} name - 
 * @property {String} atcCode - 
 * @property {String} upperCode - 
 * @property {Array.<module:medicationscatalogSchema.childrenObj>} children - 
 */


/**
 * @typedef {Object} module:medicationscatalogSchema.atcCodeListObj
 * @property {String} name - 
 * @property {String} atcCode - 
 * @property {String} upperCode - 
 * @property {Array.<module:medicationscatalogSchema.childrenObj>} children - 
 * @property {Number} level - 
 */


/**
 * @typedef {Object} module:medicationscatalogSchema.icd10CodeListObj
 * @property {String} name - 
 * @property {String} icd10Code - 
 * @property {String} upperCode - 
 * @property {Number} level - 
 */


/**
 * @typedef {Object} module:medicationscatalogSchema.ingredientCodeObj
 * @property {String} type - 
 * @property {Number} value - 
 * @property {Number} strengthValue - 
 * @property {String} strengthUnitCode - 
 * @property {String} moleculeTypeCode - 
 */


/**
 * @typedef {Object} module:medicationscatalogSchema.moleculeListObj
 * @property {String} name - 
 * @property {String} moleculeTypeCode - 
 * @property {Array.<module:medicationscatalogSchema.ingredientCodeObj>} ingredientCode - 
 */


/**
 * @typedef {Object} module:medicationscatalogSchema.medicationscatalog
 * @property {String} name - 
 * @property {String} catalogShort - 
 * @property {String} atc - 
 * @property {String} productName - 
 * @property {String} pzn - 
 * @property {String} moleculeName - 
 * @property {Array.<module:medicationscatalogSchema.moleculeListObj>} moleculeList - 
 * @property {String} maxResult - 
 * @property {Boolean} fetchProductInfo - 
 * @property {String} parents - 
 * @property {String} children - 
 * @property {String} icd10 - 
 * @property {Array.<module:medicationscatalogSchema.icd10CodeListObj>} icd10CodeList - 
 * @property {Array.<module:medicationscatalogSchema.atcCodeListObj>} atcCodeList - 
 * @property {Array.<module:medicationscatalogSchema.packageListObj>} packageList - 
 * @property {Array.<module:medicationscatalogSchema.documentsObj>} documents - 
 * @property {String} divisibility - 
 * @property {String} code - 
 * @property {String} company - 
 * @property {String} phPZN - 
 * @property {String} phUnit - 
 * @property {String} phUnitDescription - 
 * @property {String} phCompany - 
 * @property {String} phForm - 
 * @property {String} phPackSize - 
 * @property {Array.<module:medicationscatalogSchema.phIngrObj>} phIngr - 
 * @property {String} phAtc - 
 * @property {String} phDescription - 
 * @property {String} phGTIN - 
 * @property {String} prdNo - 
 * @property {Number} phPriceSale - 
 * @property {number} phPriceCost - 
 * @property {String} articleType - 
 * @property {Object} u_extra - 
 * @property {Object} units - 
 * @property {String} insuranceCode - 
 * @property {Boolean} paidByInsurance - 
 * @property {String} insuranceDescription - 
 * @property {String} supplyCategory - 
 */