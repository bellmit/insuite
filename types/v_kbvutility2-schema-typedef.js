/**
 * @module v_kbvutility2Schema
 */

/**
 * @typedef {Object} module:v_kbvutility2Schema.ut2Remedy2ListObj
 * @property {String} name - 
 * @property {String} type - 
 * @property {String} text - 
 * @property {Number} units - 
 * @property {Number} price - 
 * @property {String} requiredConductionSymptom - 
 * @property {Boolean} massage - 
 */


/**
 * @typedef {Object} module:v_kbvutility2Schema.ut2Remedy1ListObj
 * @property {String} name - 
 * @property {String} type - 
 * @property {String} text - 
 * @property {Number} units - 
 * @property {Number} price - 
 * @property {String} requiredConductionSymptom - 
 * @property {Boolean} massage - 
 */


/**
 * @typedef {Object} module:v_kbvutility2Schema.ut2ConductionSymptomsObj
 * @property {String} code - 
 * @property {String} name - 
 */


/**
 * @typedef {Object} module:v_kbvutility2Schema.ut2AgreementObj
 * @property {String} type - 
 * @property {String} advice - 
 * @property {Date} acuteEventDate - 
 * @property {Number} acuteEvent - 
 */


/**
 * @typedef {Object} module:v_kbvutility2Schema.editorObj
 * @property {String} name - 
 * @property {String} employeeNo - 
 * @property {String} initials - 
 */


/**
 * @typedef {Object} module:v_kbvutility2Schema.attachedMediaObj
 * @property {String} mediaId - 
 * @property {String} contentType - 
 * @property {String} caption - 
 * @property {String} title - 
 * @property {String} malwareWarning - 
 */


/**
 * @typedef {Object} module:v_kbvutility2Schema.v_kbvutility2
 * @property {Array.<String>} attachments - 
 * @property {Array.<module:v_kbvutility2Schema.attachedMediaObj>} attachedMedia - 
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
 * @property {Array.<module:v_kbvutility2Schema.editorObj>} editor - 
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
 * @property {String} ut2TreatmentRelevantDiagnosisText - 
 * @property {String} ut2AgreementType - 
 * @property {Array.<module:v_kbvutility2Schema.ut2AgreementObj>} ut2Agreement - 
 * @property {Array.<String>} ut2ApprovalRefs - 
 * @property {Boolean} ut2PatientSpecificConductionSymptoms - 
 * @property {String} ut2PatientSpecificConductionSymptomsFreeText - 
 * @property {Array.<module:v_kbvutility2Schema.ut2ConductionSymptomsObj>} ut2ConductionSymptoms - 
 * @property {Object} ut2BlankRegulation - 
 * @property {Object} ut2BlankRegulationIgnored - 
 * @property {Boolean} ut2BlankRegulationNeedsConfirmationAfterCopy - 
 * @property {String} ut2PrescriptionCaseId - 
 * @property {Number} ut2PrescriptionCaseUnitsSum - 
 * @property {Number} ut2PrescriptionCaseMassageUnitsSum - 
 * @property {Number} ut2PrescriptionCaseStandardizedCombinationUnitsSum - 
 * @property {Number} ut2TherapyFrequencyMin - 
 * @property {Number} ut2TherapyFrequencyMax - 
 * @property {String} ut2TherapyFrequencyType - 
 * @property {Boolean} ut2UrgentNeedForAction - 
 * @property {Boolean} utUnfall - 
 * @property {Boolean} utBvg - 
 * @property {Boolean} utHomeVisit - 
 * @property {Boolean} utTherapyReport - 
 * @property {String} paidFreeStatus - 
 * @property {String} utTherapyGoals - 
 * @property {String} ut2Chapter - 
 * @property {String} utIcdCode - 
 * @property {String} utIcdText - 
 * @property {String} utIcdRef - 
 * @property {String} utSecondIcdCode - 
 * @property {String} utSecondIcdText - 
 * @property {String} utSecondIcdRef - 
 * @property {String} ut2DiagnosisGroupCode - 
 * @property {String} ut2DiagnosisGroupName - 
 * @property {Array.<module:v_kbvutility2Schema.ut2Remedy1ListObj>} ut2Remedy1List - 
 * @property {Array.<module:v_kbvutility2Schema.ut2Remedy2ListObj>} ut2Remedy2List - 
 */