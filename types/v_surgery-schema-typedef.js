/**
 * @module v_surgerySchema
 */

/**
 * @typedef {Object} module:v_surgerySchema.linkedTreatmentsObj
 * @property {String} activityId - 
 * @property {String} code - 
 * @property {Array.<String>} opsCodes - 
 * @property {Number} quantity - 
 * @property {String} userContent - 
 * @property {String} explanations - 
 * @property {String} catalogRef - 
 */


/**
 * @typedef {Object} module:v_surgerySchema.fk5036SetObj
 * @property {String} fk5036 - 
 */


/**
 * @typedef {Object} module:v_surgerySchema.fk5035SetObj
 * @property {String} fk5035 - 
 * @property {String} fk5041 - 
 * @property {Object} catalogEntry - 
 * @property {Array.<String>} seqs - 
 */


/**
 * @typedef {Object} module:v_surgerySchema.editorObj
 * @property {String} name - 
 * @property {String} employeeNo - 
 * @property {String} initials - 
 */


/**
 * @typedef {Object} module:v_surgerySchema.attachedMediaObj
 * @property {String} mediaId - 
 * @property {String} contentType - 
 * @property {String} caption - 
 * @property {String} title - 
 * @property {String} malwareWarning - 
 */


/**
 * @typedef {Object} module:v_surgerySchema.v_surgery
 * @property {String} actType - 
 * @property {Array.<String>} attachments - 
 * @property {Array.<module:v_surgerySchema.attachedMediaObj>} attachedMedia - 
 * @property {Array.<String>} attachedMediaTags - 
 * @property {String} pressButton - 
 * @property {String} subType - 
 * @property {Date} timestamp - 
 * @property {String} daySeparation - 
 * @property {String} time - 
 * @property {String} patientId - 
 * @property {String} employeeId - 
 * @property {Array.<String>} backupEmployeeIds - 
 * @property {String} employeeName - 
 * @property {String} employeeInitials - 
 * @property {ObjectId} locationId - 
 * @property {boolean} external - 
 * @property {String} externalRef - 
 * @property {String} copyRef - 
 * @property {String} content - 
 * @property {String} mirrorActivityId - 
 * @property {String} mirrorCaseFolderType - 
 * @property {String} userContent - 
 * @property {Mixed} mediaImportError - 
 * @property {String} partnerInfo - 
 * @property {Object} patientShort - 
 * @property {String} comment - 
 * @property {String} explanations - 
 * @property {String} status - 
 * @property {Array.<module:v_surgerySchema.editorObj>} editor - 
 * @property {Array.<String>} activities - 
 * @property {Array.<String>} referencedBy - 
 * @property {String} formId - 
 * @property {String} formVersion - 
 * @property {String} formPdf - 
 * @property {String} formLang - 
 * @property {String} formGender - 
 * @property {Object} u_extra - 
 * @property {String} caseFolderId - 
 * @property {String} patientName - 
 * @property {String} patientLastName - 
 * @property {String} patientFirstName - 
 * @property {String} patientNo - 
 * @property {String} patientKbvDob - 
 * @property {String} apkState - 
 * @property {Boolean} sentToMediport - 
 * @property {String} asvTeamnumber - 
 * @property {String} careComment - 
 * @property {Boolean} caseFolderDisabled - 
 * @property {Boolean} notDeletable - 
 * @property {String} cancelReason - 
 * @property {String} autoGenID - 
 * @property {String} locationName - 
 * @property {Date} lastChanged - 
 * @property {Array.<String>} unlinkedMirrorIds - 
 * @property {Number} printCount - 
 * @property {Array.<ObjectId>} savedEmails - 
 * @property {String} fk5023 - 
 * @property {String} fk5024 - 
 * @property {Date} fk5025 - 
 * @property {Date} fk5026 - 
 * @property {Date} fk5034 - 
 * @property {Array.<module:v_surgerySchema.fk5035SetObj>} fk5035Set - 
 * @property {Array.<module:v_surgerySchema.fk5036SetObj>} fk5036Set - 
 * @property {String} fk5037 - 
 * @property {String} fk5038 - 
 * @property {Array.<module:v_surgerySchema.linkedTreatmentsObj>} linkedTreatments - 
 */