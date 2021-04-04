/**
 * @module v_kbvutility2approvalSchema
 */

/**
 * @typedef {Object} module:v_kbvutility2approvalSchema.ut2Remedy2ListObj
 * @property {String} name - 
 * @property {String} type - 
 * @property {String} text - 
 * @property {Number} units - 
 * @property {Number} price - 
 * @property {String} requiredConductionSymptom - 
 * @property {Boolean} massage - 
 */


/**
 * @typedef {Object} module:v_kbvutility2approvalSchema.ut2Remedy1ListObj
 * @property {String} name - 
 * @property {String} type - 
 * @property {String} text - 
 * @property {Number} units - 
 * @property {Number} price - 
 * @property {String} requiredConductionSymptom - 
 * @property {Boolean} massage - 
 */


/**
 * @typedef {Object} module:v_kbvutility2approvalSchema.editorObj
 * @property {String} name - 
 * @property {String} employeeNo - 
 * @property {String} initials - 
 */


/**
 * @typedef {Object} module:v_kbvutility2approvalSchema.attachedMediaObj
 * @property {String} mediaId - 
 * @property {String} contentType - 
 * @property {String} caption - 
 * @property {String} title - 
 * @property {String} malwareWarning - 
 */


/**
 * @typedef {Object} module:v_kbvutility2approvalSchema.v_kbvutility2approval
 * @property {Array.<String>} attachments - 
 * @property {Array.<module:v_kbvutility2approvalSchema.attachedMediaObj>} attachedMedia - 
 * @property {Array.<String>} attachedMediaTags - 
 * @property {String} actType - 
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
 * @property {Array.<module:v_kbvutility2approvalSchema.editorObj>} editor - 
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
 * @property {Date} approvalValidTo - 
 * @property {Boolean} unlimitedApproval - 
 * @property {String} insuranceId - 
 * @property {String} ut2Chapter - 
 * @property {String} utIcdCode - 
 * @property {String} utIcdText - 
 * @property {String} utIcdRef - 
 * @property {String} utSecondIcdCode - 
 * @property {String} utSecondIcdText - 
 * @property {String} utSecondIcdRef - 
 * @property {String} ut2DiagnosisGroupCode - 
 * @property {String} ut2DiagnosisGroupName - 
 * @property {Array.<module:v_kbvutility2approvalSchema.ut2Remedy1ListObj>} ut2Remedy1List - 
 * @property {Array.<module:v_kbvutility2approvalSchema.ut2Remedy2ListObj>} ut2Remedy2List - 
 */