/**
 * @module tagSchema
 */

/**
 * @typedef {Object} module:tagSchema.valueFormulaScopeObj
 * @property {String} id - 
 * @property {String} scopeName - 
 * @property {String} testValue - 
 */


/**
 * @typedef {Object} module:tagSchema.medDataItemConfigObj
 * @property {Date} validFromIncl - 
 * @property {string} validForUnit - 
 * @property {String} dataType - 
 * @property {Number} valueRoundingMethod - 
 * @property {Number} valueLeadingZeros - 
 * @property {Number} valueDigits - 
 * @property {Number} valueMinValue - 
 * @property {Number} valueMaxValue - 
 * @property {Number} textValueMinLength - 
 * @property {Number} textValueMaxLength - 
 * @property {String} textValueValidationRegExp - 
 * @property {Array.<String>} enumValueCollection - 
 * @property {String} dateValueFormat - 
 * @property {Date} dateValueMinDate - 
 * @property {Date} dateValueMaxDate - 
 * @property {String} valueFormulaExpression - 
 * @property {Array.<module:tagSchema.valueFormulaScopeObj>} valueFormulaScope - 
 * @property {Boolean} manualCalculation - 
 * @property {Boolean} isOptional - 
 */


/**
 * @typedef {Object} module:tagSchema.tag
 * @property {Array.<String>} category - 
 * @property {String} type - 
 * @property {String} title - 
 * @property {String} catalogShort - 
 * @property {String} unit - 
 * @property {String} testLabel - 
 * @property {Array.<String>} sampleNormalValueText - 
 * @property {Array.<String>} mapping - 
 * @property {object} additionalData - 
 * @property {Array.<module:tagSchema.medDataItemConfigObj>} medDataItemConfig - 
 */