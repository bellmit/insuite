/**
 * @module inpacsworklistSchema
 */

/**
 * @typedef {Object} module:inpacsworklistSchema.valuesObj
 * @property {String} id - 
 * @property {String} value - 
 * @property {string} comment - 
 */


/**
 * @typedef {Object} module:inpacsworklistSchema.dicomTagValuesObj
 * @property {String} dicomTag - 
 * @property {String} dicomCommentTag - 
 * @property {Array.<module:inpacsworklistSchema.valuesObj>} values - 
 * @property {String} fileDownloadId - 
 */


/**
 * @typedef {Object} module:inpacsworklistSchema.workListDataObj
 * @property {String} dicomTag - 
 * @property {String} name - 
 * @property {Object} content - 
 * @property {String} comment - 
 * @property {String} template - 
 * @property {Number} contentType - 
 * @property {Number} order - 
 */


/**
 * @typedef {Object} module:inpacsworklistSchema.inpacsworklist
 * @property {Array.<module:inpacsworklistSchema.workListDataObj>} workListData - 
 * @property {Array.<module:inpacsworklistSchema.dicomTagValuesObj>} dicomTagValues - 
 */