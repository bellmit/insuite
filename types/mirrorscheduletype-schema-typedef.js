/**
 * @module mirrorscheduletypeSchema
 */

/**
 * @typedef {Object} module:mirrorscheduletypeSchema.requiredResourcesObj
 * @property {String} resourceType - 
 */


/**
 * @typedef {Object} module:mirrorscheduletypeSchema.calendarRefsObj
 * @property {String} calendarId - 
 */


/**
 * @typedef {Object} module:mirrorscheduletypeSchema.mirrorscheduletype
 * @property {String} name - 
 * @property {Number} duration - 
 * @property {String} durationUnit - 
 * @property {String} type - 
 * @property {Array.<module:mirrorscheduletypeSchema.calendarRefsObj>} calendarRefs - 
 * @property {Boolean} isPublic - 
 * @property {String} info - 
 * @property {Boolean} isPreconfigured - 
 * @property {Boolean} noPatientMessage - 
 * @property {Number} capacity - 
 * @property {Number} numberOfSuggestedAppointments - 
 * @property {String} color - 
 * @property {Date} lastChanged - 
 * @property {Array.<module:mirrorscheduletypeSchema.requiredResourcesObj>} requiredResources - 
 * @property {String} prcCustomerNo - 
 * @property {ObjectId} originalId - 
 */