/**
 * @module v_conferenceAppointmentSchema
 */

/**
 * @typedef {Object} module:v_conferenceAppointmentSchema.participantsObj
 * @property {String} firstname - 
 * @property {String} lastname - 
 * @property {String} email - 
 * @property {String} copyEmailCreate - 
 * @property {String} copyEmailUpdate - 
 * @property {String} copyEmailDelete - 
 * @property {String} talk - 
 */


/**
 * @typedef {Object} module:v_conferenceAppointmentSchema.partnerObj
 * @property {String} dcCustomerNo - 
 * @property {String} name - 
 * @property {ObjectId} scheduleId - 
 * @property {ObjectId} patientId - 
 */


/**
 * @typedef {Object} module:v_conferenceAppointmentSchema.v_conferenceAppointment
 * @property {String} linkSeries - 
 * @property {Boolean} isCustomised - 
 * @property {Date} start - 
 * @property {Date} end - 
 * @property {Date} doctorStart - 
 * @property {Date} doctorEnd - 
 * @property {string} type - 
 * @property {String} title - 
 * @property {String} userDescr - 
 * @property {Number} urgency - 
 * @property {String} severity - 
 * @property {String} details - 
 * @property {Date} eta - 
 * @property {Date} pushtime - 
 * @property {Date} calltime - 
 * @property {Date} alertTime - 
 * @property {Boolean} adhoc - 
 * @property {Boolean} group - 
 * @property {Boolean} closeTime - 
 * @property {string} closeDayType - 
 * @property {String} closeTimeId - 
 * @property {String} calendar - 
 * @property {String} scheduletype - 
 * @property {String} scheduletypePopulated - 
 * @property {Boolean} allDay - 
 * @property {number} duration - 
 * @property {number} plannedDuration - 
 * @property {number} number - 
 * @property {String} employee - 
 * @property {String} patient - 
 * @property {String} externalResource - 
 * @property {string} repetition - 
 * @property {Date} dtstart - 
 * @property {Number} interval - 
 * @property {Date} until - 
 * @property {Number} bysetpos - 
 * @property {Number} bymonth - 
 * @property {Number} bymonthday - 
 * @property {Number} byyearday - 
 * @property {Number} byweekno - 
 * @property {Array.<String>} byweekday - 
 * @property {String} author - 
 * @property {Number} scheduled - 
 * @property {Boolean} wasInTreatment - 
 * @property {String} url - 
 * @property {String} email - 
 * @property {String} mobile - 
 * @property {Number} timeinadvance - 
 * @property {Boolean} wantsAlert - 
 * @property {Date} arrivalTime - 
 * @property {String} groupId - 
 * @property {number} capacityOfGroup - 
 * @property {string} lastEditor - 
 * @property {Date} lastEditedDate - 
 * @property {Boolean} isFromPortal - 
 * @property {module:v_conferenceAppointmentSchema.partnerObj} partner - 
 * @property {Number} actualWaitingTimeMinutes - 
 * @property {ObjectId} conferenceId - 
 * @property {Date} lastChanged - 
 * @property {Boolean} isReadOnly - 
 * @property {ObjectId} roomId - 
 * @property {Number} orderInRoom - 
 * @property {Boolean} resourceBased - 
 * @property {String} resource - 
 * @property {String} linkByResource - 
 * @property {ObjectId} callerId - 
 * @property {Array.<module:v_conferenceAppointmentSchema.participantsObj>} participants - 
 * @property {Array.<ObjectId>} employees - 
 * @property {Array.<ObjectId>} patients - 
 * @property {Date} startDate - 
 * @property {String} status - 
 * @property {String} conferenceType - 
 * @property {Boolean} isForUnregistered - 
 */