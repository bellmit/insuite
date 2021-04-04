/**
 * @module taskSchema
 */

/**
 * @typedef {Object} module:taskSchema.linksObj
 * @property {String} url - 
 * @property {String} text - 
 */


/**
 * @typedef {Object} module:taskSchema.budgetsObj
 * @property {string} type - 
 * @property {Array.<String>} specialities - 
 * @property {Number} startBudget - 
 * @property {Date} startDate - 
 * @property {Number} patientAgeRange1 - 
 * @property {Number} patientAgeRange2 - 
 * @property {Number} patientAgeRange3 - 
 * @property {Number} patientAgeRange4 - 
 */


/**
 * @typedef {Object} module:taskSchema.repetitionSettingsObj
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
 * @typedef {Object} module:taskSchema.openTimesObj
 * @property {Array.<Number>} days - 
 * @property {String} colorOfConsults - 
 * @property {Array.<Number>} start - 
 * @property {Array.<Number>} end - 
 * @property {boolean} publicInsurance - 
 * @property {boolean} privateInsurance - 
 * @property {Array.<String>} scheduleTypes - 
 * @property {Array.<module:taskSchema.repetitionSettingsObj>} repetitionSettings - 
 */


/**
 * @typedef {Object} module:taskSchema.locationObj
 * @property {String} locname - 
 * @property {String} institutionCode - 
 * @property {String} department - 
 * @property {String} region - 
 * @property {String} emailFaxGateway - 
 * @property {String} emailFooter - 
 * @property {String} smtpPassword - 
 * @property {String} smtpUserName - 
 * @property {boolean} smtpSsl - 
 * @property {String} smtpHost - 
 * @property {Number} smtpPort - 
 * @property {String} smtpEmailFrom - 
 * @property {String} commercialNo - 
 * @property {Boolean} nonStandardCommercialNo - 
 * @property {String} kind - 
 * @property {String} street - 
 * @property {String} houseno - 
 * @property {String} zip - 
 * @property {String} city - 
 * @property {String} postbox - 
 * @property {String} country - 
 * @property {String} countryCode - 
 * @property {String} receiver - 
 * @property {String} payerType - 
 * @property {String} addon - 
 * @property {String} talk - 
 * @property {String} title - 
 * @property {String} firstname - 
 * @property {String} nameaffix - 
 * @property {String} middlename - 
 * @property {String} lastname - 
 * @property {String} cantonCode - 
 * @property {String} cardType - 
 * @property {String} bankName - 
 * @property {Number} trial - 
 * @property {String} bankIBAN - 
 * @property {String} bankBIC - 
 * @property {String} accountOwner - 
 * @property {String} cardNo - 
 * @property {String} cardCheckCode - 
 * @property {Number} cardValidToMonth - 
 * @property {Number} cardValidToYear - 
 * @property {Boolean} debitAllowed - 
 * @property {Boolean} isOptional - 
 * @property {String} esrNumber - 
 * @property {String} phone - 
 * @property {String} fax - 
 * @property {String} email - 
 * @property {String} website - 
 * @property {Array.<module:taskSchema.openTimesObj>} openTimes - 
 * @property {Boolean} isAdditionalLocation - 
 * @property {String} mainLocationId - 
 * @property {String} kbvZip - 
 * @property {String} kv - 
 * @property {string} gkvInvoiceReceiver - 
 * @property {Array.<module:taskSchema.budgetsObj>} budgets - 
 * @property {String} defaultPrinter - 
 * @property {Array.<String>} enabledPrinters - 
 * @property {string} imapUrl - 
 * @property {number} imapPort - 
 * @property {string} imapUserName - 
 * @property {string} imapPassword - 
 * @property {boolean} isImapUseSSL - 
 * @property {Array.<ObjectId>} stockLocations - 
 * @property {Array.<String>} countryMode - 
 * @property {Date} lastChanged - 
 * @property {String} konnektorProductVersion - 
 * @property {String} slName - 
 * @property {Boolean} slMain - 
 * @property {Array.<String>} slMembers - 
 * @property {String} glnNumber - 
 * @property {String} zsrNumber - 
 * @property {String} vatNumber - 
 */


/**
 * @typedef {Object} module:taskSchema.activitiesObj
 * @property {String} actType - 
 * @property {ObjectId} _id - 
 */


/**
 * @typedef {Object} module:taskSchema.locationsObj
 * @property {String} _id - 
 * @property {String} locname - 
 */


/**
 * @typedef {Object} module:taskSchema.task
 * @property {String} employeeId - 
 * @property {String} employeeName - 
 * @property {Array.<module:taskSchema.locationsObj>} locations - 
 * @property {String} patientId - 
 * @property {String} patientName - 
 * @property {String} patientPartnerId - 
 * @property {String} activityId - 
 * @property {Array.<module:taskSchema.activitiesObj>} activities - 
 * @property {String} activityType - 
 * @property {String} dispatchRequestId - 
 * @property {String} transferEntryId - 
 * @property {String} deviceLogEntryId - 
 * @property {String} formActivityId - 
 * @property {ObjectId} conferenceId - 
 * @property {String} cardioSerialNumber - 
 * @property {Boolean} allDay - 
 * @property {Date} callTime - 
 * @property {Date} alertTime - 
 * @property {Number} templateAlertTimeAbsolute - 
 * @property {String} templateAlertTimeInterval - 
 * @property {String} title - 
 * @property {Number} urgency - 
 * @property {String} status - 
 * @property {String} details - 
 * @property {Boolean} group - 
 * @property {Array.<String>} roles - 
 * @property {Array.<String>} candidates - 
 * @property {Array.<String>} candidatesNames - 
 * @property {String} creatorId - 
 * @property {String} creatorName - 
 * @property {Date} dateCreated - 
 * @property {Date} dateDone - 
 * @property {Array.<module:taskSchema.locationObj>} location - 
 * @property {String} type - 
 * @property {String} taskType - 
 * @property {String} scheduleId - 
 * @property {Boolean} sessionWide - 
 * @property {String} linkedSchedule - 
 * @property {String} autoGenID - 
 * @property {Array.<module:taskSchema.linksObj>} links - 
 * @property {String} mediaId - 
 * @property {String} columnId - 
 * @property {String} columnName - 
 * @property {Number} orderInColumn - 
 * @property {Object} d_extra - 
 * @property {String} vendorId - 
 * @property {String} eventMessage - 
 * @property {Date} eventDate - 
 * @property {Boolean} specialDOQUVIDE - 
 */