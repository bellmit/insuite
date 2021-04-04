/**
 * @module tasktemplateSchema
 */

/**
 * @typedef {Object} module:tasktemplateSchema.locationsObj
 * @property {String} _id - 
 * @property {String} locname - 
 */


/**
 * @typedef {Object} module:tasktemplateSchema.tasktemplate
 * @property {String} title - 
 * @property {Number} urgency - 
 * @property {String} details - 
 * @property {Array.<String>} roles - 
 * @property {Array.<String>} candidates - 
 * @property {Array.<module:tasktemplateSchema.locationsObj>} locations - 
 * @property {String} creatorId - 
 * @property {String} creatorName - 
 * @property {Date} dateCreated - 
 * @property {String} formId - 
 * @property {String} caseFolder - 
 * @property {Number} days - 
 * @property {Number} hours - 
 * @property {Number} minutes - 
 * @property {String} actType - 
 * @property {String} caseFolderType - 
 * @property {String} catalogShort - 
 * @property {String} code - 
 * @property {String} diagnosisCert - 
 * @property {Number} toCreate - 
 * @property {String} explanations - 
 * @property {String} comment - 
 * @property {Boolean} linkActivities - 
 * @property {Boolean} autoCreate - 
 * @property {Boolean} notDeletable - 
 * @property {String} tempateID - 
 * @property {Array.<String>} markers - 
 * @property {String} type - 
 * @property {String} taskType - 
 * @property {String} filenameRegexp - 
 * @property {String} arrayFieldPath - 
 */