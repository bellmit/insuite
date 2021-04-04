/**
 * @module v_healthsurveySchema
 */

/**
 * @typedef {Object} module:v_healthsurveySchema.editorObj
 * @property {String} name - 
 * @property {String} employeeNo - 
 * @property {String} initials - 
 */


/**
 * @typedef {Object} module:v_healthsurveySchema.attachedMediaObj
 * @property {String} mediaId - 
 * @property {String} contentType - 
 * @property {String} caption - 
 * @property {String} title - 
 * @property {String} malwareWarning - 
 */


/**
 * @typedef {Object} module:v_healthsurveySchema.v_healthsurvey
 * @property {String} actType - 
 * @property {String} status - 
 * @property {Array.<String>} attachments - 
 * @property {Array.<module:v_healthsurveySchema.attachedMediaObj>} attachedMedia - 
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
 * @property {Array.<module:v_healthsurveySchema.editorObj>} editor - 
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
 * @property {String} requestId - 
 * @property {String} insuranceType - 
 * @property {String} ageGroup - 
 * @property {String} surveySex - 
 * @property {Boolean} repeatedExam - 
 * @property {String} hypertonia - 
 * @property {String} coronalHeartDisease - 
 * @property {String} otherArterialClosure - 
 * @property {String} diabetesMellitus - 
 * @property {String} hyperlipidemia - 
 * @property {String} kidneyDiseases - 
 * @property {String} lungDiseases - 
 * @property {Boolean} nicotineAbuse - 
 * @property {Boolean} chronicEmotionalStressFactor - 
 * @property {Boolean} sedentaryLifestyle - 
 * @property {Boolean} adipositas - 
 * @property {Boolean} alcoholAbuse - 
 */