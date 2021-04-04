/**
 * @module conferenceSchema
 */

/**
 * @typedef {Object} module:conferenceSchema.participantsObj
 * @property {String} firstname - 
 * @property {String} lastname - 
 * @property {String} email - 
 * @property {String} copyEmailCreate - 
 * @property {String} copyEmailUpdate - 
 * @property {String} copyEmailDelete - 
 * @property {String} talk - 
 */


/**
 * @typedef {Object} module:conferenceSchema.conference
 * @property {ObjectId} callerId - 
 * @property {Array.<module:conferenceSchema.participantsObj>} participants - 
 * @property {Array.<ObjectId>} employees - 
 * @property {Array.<ObjectId>} patients - 
 * @property {Date} startDate - 
 * @property {String} status - 
 * @property {String} conferenceType - 
 * @property {Boolean} isForUnregistered - 
 */