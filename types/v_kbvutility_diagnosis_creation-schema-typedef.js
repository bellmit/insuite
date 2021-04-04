/**
 * @module v_kbvutility_diagnosis_creationSchema
 */

/**
 * @typedef {Object} module:v_kbvutility_diagnosis_creationSchema.relatedCodesObj
 * @property {Boolean} checked - 
 * @property {String} title - 
 * @property {String} seq - 
 * @property {Boolean} F - 
 * @property {Boolean} I - 
 * @property {Boolean} N - 
 * @property {Boolean} B - 
 */


/**
 * @typedef {Object} module:v_kbvutility_diagnosis_creationSchema.editorObj
 * @property {String} name - 
 * @property {String} employeeNo - 
 * @property {String} initials - 
 */


/**
 * @typedef {Object} module:v_kbvutility_diagnosis_creationSchema.attachedMediaObj
 * @property {String} mediaId - 
 * @property {String} contentType - 
 * @property {String} caption - 
 * @property {String} title - 
 * @property {String} malwareWarning - 
 */


/**
 * @typedef {Object} module:v_kbvutility_diagnosis_creationSchema.v_kbvutility_diagnosis_creation
 * @property {String} actType - 
 * @property {string} status - 
 * @property {Boolean} isSecond - 
 * @property {Array.<String>} attachments - 
 * @property {Array.<module:v_kbvutility_diagnosis_creationSchema.attachedMediaObj>} attachedMedia - 
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
 * @property {Array.<module:v_kbvutility_diagnosis_creationSchema.editorObj>} editor - 
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
 * @property {String} diagnosisCert - 
 * @property {String} diagnosisType - 
 * @property {String} diagnosisTreatmentRelevance - 
 * @property {String} diagnosisSite - 
 * @property {String} diagnosisDerogation - 
 * @property {Date} diagnosisInvalidationDate - 
 * @property {String} diagnosisPeriod - 
 * @property {String} diagnosisLaterality - 
 * @property {Boolean} diagnosisInfectious - 
 * @property {Boolean} diagnosisFunctional - 
 * @property {Boolean} diagnosisNeoplasia - 
 * @property {Boolean} diagnosisOcupationally - 
 * @property {Array.<module:v_kbvutility_diagnosis_creationSchema.relatedCodesObj>} relatedCodes - 
 * @property {boolean} catalog - 
 * @property {String} catalogShort - 
 * @property {String} catalogRef - 
 * @property {String} code - 
 * @property {String} forInsuranceType - 
 * @property {boolean} modifyHomeCat - 
 * @property {boolean} deleteEntryHomeCat - 
 */