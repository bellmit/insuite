/**
 * @module intimeSchema
 */

/**
 * @typedef {Object} module:intimeSchema.carouselObj
 * @property {String} name - 
 * @property {String} descr - 
 * @property {String} source - 
 * @property {String} origFilename - 
 * @property {string} mime - 
 * @property {String} ownerCollection - 
 * @property {String} ownerId - 
 * @property {String} label - 
 * @property {String} transform - 
 * @property {Number} weight - 
 * @property {Number} widthPx - 
 * @property {Number} heightPx - 
 * @property {String} deleteAfter - 
 * @property {string} docType - 
 * @property {boolean} gridfs - 
 * @property {boolean} binary - 
 * @property {Number} filesize - 
 * @property {Date} lastChanged - 
 * @property {string} malwareWarning - 
 * @property {boolean} malwareFalsePositive - 
 */


/**
 * @typedef {Object} module:intimeSchema.logoObj
 * @property {String} name - 
 * @property {String} descr - 
 * @property {String} source - 
 * @property {String} origFilename - 
 * @property {string} mime - 
 * @property {String} ownerCollection - 
 * @property {String} ownerId - 
 * @property {String} label - 
 * @property {String} transform - 
 * @property {Number} weight - 
 * @property {Number} widthPx - 
 * @property {Number} heightPx - 
 * @property {String} deleteAfter - 
 * @property {string} docType - 
 * @property {boolean} gridfs - 
 * @property {boolean} binary - 
 * @property {Number} filesize - 
 * @property {Date} lastChanged - 
 * @property {string} malwareWarning - 
 * @property {boolean} malwareFalsePositive - 
 */


/**
 * @typedef {Object} module:intimeSchema.intime
 * @property {Array.<module:intimeSchema.logoObj>} logo - 
 * @property {Boolean} active - 
 * @property {Array.<module:intimeSchema.carouselObj>} carousel - 
 * @property {String} headline - 
 * @property {String} subheadline - 
 */