/**
 * @module calendarSchema
 */

/**
 * @typedef {Object} module:calendarSchema.resourcesObj
 * @property {String} resourceType - 
 * @property {String} resource - 
 */


/**
 * @typedef {Object} module:calendarSchema.repetitionSettingsObj
 * @property {string} freq - 
 * @property {Date} dtstart - 
 * @property {Number} interval - 
 * @property {Number} count - 
 * @property {Date} until - 
 * @property {Number} bymonth - 
 * @property {Number} bymonthday - 
 * @property {Array.<String>} byweekday - 
 * @property {string} endCondition - 
 */


/**
 * @typedef {Object} module:calendarSchema.specificConsultTimesObj
 * @property {Array.<Number>} days - 
 * @property {String} colorOfConsults - 
 * @property {Array.<Number>} start - 
 * @property {Array.<Number>} end - 
 * @property {boolean} publicInsurance - 
 * @property {boolean} privateInsurance - 
 * @property {Array.<String>} scheduleTypes - 
 * @property {Array.<module:calendarSchema.repetitionSettingsObj>} repetitionSettings - 
 * @property {Array.<String>} range - 
 */


/**
 * @typedef {Object} module:calendarSchema.repetitionSettingsObj
 * @property {string} freq - 
 * @property {Date} dtstart - 
 * @property {Number} interval - 
 * @property {Number} count - 
 * @property {Date} until - 
 * @property {Number} bymonth - 
 * @property {Number} bymonthday - 
 * @property {Array.<String>} byweekday - 
 * @property {string} endCondition - 
 */


/**
 * @typedef {Object} module:calendarSchema.consultTimesObj
 * @property {Array.<Number>} days - 
 * @property {String} colorOfConsults - 
 * @property {Array.<Number>} start - 
 * @property {Array.<Number>} end - 
 * @property {boolean} publicInsurance - 
 * @property {boolean} privateInsurance - 
 * @property {Array.<String>} scheduleTypes - 
 * @property {Array.<module:calendarSchema.repetitionSettingsObj>} repetitionSettings - 
 */


/**
 * @typedef {Object} module:calendarSchema.calendar
 * @property {String} name - 
 * @property {String} descr - 
 * @property {Boolean} isPublic - 
 * @property {Boolean} isShared - 
 * @property {Array.<string>} calGroup - 
 * @property {Boolean} isRandomMode - 
 * @property {string} type - 
 * @property {String} employee - 
 * @property {String} locationId - 
 * @property {Array.<module:calendarSchema.consultTimesObj>} consultTimes - 
 * @property {Array.<module:calendarSchema.specificConsultTimesObj>} specificConsultTimes - 
 * @property {String} color - 
 * @property {number} zIndex - 
 * @property {number} xIndex - 
 * @property {ObjectId} mirrorCalendarId - 
 * @property {Array.<module:calendarSchema.resourcesObj>} resources - 
 */