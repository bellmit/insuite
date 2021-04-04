/**
 * @module drugSchema
 */

/**
 * @typedef {Object} module:drugSchema.identaImagesObj
 * @property {String} weight - 
 * @property {String} diameter - 
 * @property {String} height - 
 * @property {String} src - 
 */


/**
 * @typedef {Object} module:drugSchema.signetIconsObj
 * @property {String} title - 
 * @property {String} src - 
 */


/**
 * @typedef {Object} module:drugSchema.SPCObj
 * @property {String} title - 
 * @property {String} content - 
 */


/**
 * @typedef {Object} module:drugSchema.BIObj
 * @property {String} title - 
 * @property {String} content - 
 */


/**
 * @typedef {Object} module:drugSchema.documentsObj
 * @property {Array.<module:drugSchema.BIObj>} BI - 
 * @property {Array.<module:drugSchema.SPCObj>} SPC - 
 */


/**
 * @typedef {Object} module:drugSchema.apivObj
 * @property {Object} v - 
 */


/**
 * @typedef {Object} module:drugSchema.originalObj
 * @property {module:drugSchema.apivObj} apiv - 
 */


/**
 * @typedef {Object} module:drugSchema.apivObj
 * @property {Object} v - 
 */


/**
 * @typedef {Object} module:drugSchema.priceObj
 * @property {AVP} i18n - 
 * @property {module:drugSchema.apivObj} apiv - 
 */


/**
 * @typedef {Object} module:drugSchema.apivObj
 * @property {Object} v - 
 */


/**
 * @typedef {Object} module:drugSchema.dateObj
 * @property {InBackupMojit.InBackupViewModel.label.DATE.i18n} i18n - 
 * @property {module:drugSchema.apivObj} apiv - 
 */


/**
 * @typedef {Object} module:drugSchema.priceHistoryObj
 * @property {module:drugSchema.dateObj} date - 
 * @property {module:drugSchema.priceObj} price - 
 */


/**
 * @typedef {Object} module:drugSchema.packageListObj
 * @property {String} pzn - 
 * @property {String} pznOriginal - 
 * @property {String} name - 
 * @property {Number} quantity - 
 * @property {Number} pricePatientPayment - 
 * @property {Number} pricePharmacyBuy - 
 * @property {Number} pricePharmacySale - 
 * @property {Number} priceFixed - 
 * @property {Array.<module:drugSchema.priceHistoryObj>} priceHistory - 
 * @property {module:drugSchema.originalObj} original - 
 */


/**
 * @typedef {Object} module:drugSchema.childrenObj
 * @property {String} name - 
 * @property {String} atcCode - 
 * @property {String} upperCode - 
 */


/**
 * @typedef {Object} module:drugSchema.childrenObj
 * @property {String} name - 
 * @property {String} atcCode - 
 * @property {String} upperCode - 
 * @property {Array.<module:drugSchema.childrenObj>} children - 
 */


/**
 * @typedef {Object} module:drugSchema.childrenObj
 * @property {String} name - 
 * @property {String} atcCode - 
 * @property {String} upperCode - 
 * @property {Array.<module:drugSchema.childrenObj>} children - 
 */


/**
 * @typedef {Object} module:drugSchema.childrenObj
 * @property {String} name - 
 * @property {String} atcCode - 
 * @property {String} upperCode - 
 * @property {Array.<module:drugSchema.childrenObj>} children - 
 */


/**
 * @typedef {Object} module:drugSchema.atcCodeListObj
 * @property {String} name - 
 * @property {String} atcCode - 
 * @property {String} upperCode - 
 * @property {Array.<module:drugSchema.childrenObj>} children - 
 * @property {String} level - 
 */


/**
 * @typedef {Object} module:drugSchema.icd10CodeListObj
 * @property {String} name - 
 * @property {String} icd10Code - 
 * @property {String} upperCode - 
 * @property {String} level - 
 */


/**
 * @typedef {Object} module:drugSchema.ingredientCodeObj
 * @property {String} type - 
 * @property {Number} value - 
 * @property {Number} strengthValue - 
 * @property {String} strengthUnitCode - 
 * @property {String} moleculeTypeCode - 
 */


/**
 * @typedef {Object} module:drugSchema.moleculeListObj
 * @property {String} name - 
 * @property {String} moleculeTypeCode - 
 * @property {Array.<module:drugSchema.ingredientCodeObj>} ingredientCode - 
 */


/**
 * @typedef {Object} module:drugSchema.drug
 * @property {String} catalogShort - 
 * @property {String} atc - 
 * @property {String} productName - 
 * @property {String} pzn - 
 * @property {String} moleculeName - 
 * @property {Boolean} fetchProductInfo - 
 * @property {Boolean} fetchPackageDetails - 
 * @property {String} icd10 - 
 * @property {String} maxResult - 
 * @property {String} originalResult - 
 * @property {String} parents - 
 * @property {String} children - 
 * @property {String} name - 
 * @property {Object} original - 
 * @property {Array.<module:drugSchema.moleculeListObj>} moleculeList - 
 * @property {Array.<module:drugSchema.icd10CodeListObj>} icd10CodeList - 
 * @property {Array.<module:drugSchema.atcCodeListObj>} atcCodeList - 
 * @property {Array.<module:drugSchema.packageListObj>} packageList - 
 * @property {Array.<module:drugSchema.documentsObj>} documents - 
 * @property {String} divisibility - 
 * @property {String} company - 
 * @property {String} atcCode - 
 * @property {Boolean} isTeratogen - 
 * @property {Boolean} isTransfusion - 
 * @property {Boolean} isReImport - 
 * @property {Boolean} isInNegative - 
 * @property {Boolean} isLifestyleDrug - 
 * @property {Boolean} isConditionalLifeStyleDrug - 
 * @property {Boolean} isGBATherapyAdvice - 
 * @property {Boolean} isDiscountAgreement - 
 * @property {Boolean} isAltDiscountAgreement - 
 * @property {Boolean} isMedProduct - 
 * @property {Boolean} isPrescMed - 
 * @property {Boolean} isOTC - 
 * @property {Boolean} isPharmacyOnly - 
 * @property {Boolean} isRecipeOnly - 
 * @property {Boolean} isBTM - 
 * @property {Boolean} isContraceptive - 
 * @property {String} GBATherapyHintName - 
 * @property {String} formAbbreviation - 
 * @property {Array.<module:drugSchema.signetIconsObj>} signetIcons - 
 * @property {Array.<module:drugSchema.identaImagesObj>} identaImages - 
 */