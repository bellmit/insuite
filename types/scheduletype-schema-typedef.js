/**
 * @module scheduletypeSchema
 */

/**
 * @typedef {Object} module:scheduletypeSchema.requiredResourcesObj
 * @property {String} resourceType - 
 */


/**
 * @typedef {Object} module:scheduletypeSchema.calendarRefsObj
 * @property {String} calendarId - 
 */


/**
 * @typedef {Object} module:scheduletypeSchema.scheduletype
 * @property {String} name - 
 * @property {Number} duration - 
 * @property {String} durationUnit - 
 * @property {String} type - 
 * @property {Array.<module:scheduletypeSchema.calendarRefsObj>} calendarRefs - 
 * @property {Boolean} isPublic - 
 * @property {String} info - 
 * @property {Boolean} isPreconfigured - 
 * @property {Boolean} noPatientMessage - 
 * @property {Number} capacity - 
 * @property {Number} numberOfSuggestedAppointments - 
 * @property {String} color - 
 * @property {Date} lastChanged - 
 * @property {Array.<module:scheduletypeSchema.requiredResourcesObj>} requiredResources - 
 */