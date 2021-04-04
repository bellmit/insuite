/**
 * @module v_presassistiveSchema
 */

/**
 * @typedef {Object} module:v_presassistiveSchema.editorObj
 * @property {String} name - 
 * @property {String} employeeNo - 
 * @property {String} initials - 
 */


/**
 * @typedef {Object} module:v_presassistiveSchema.attachedMediaObj
 * @property {String} mediaId - 
 * @property {String} contentType - 
 * @property {String} caption - 
 * @property {String} title - 
 * @property {String} malwareWarning - 
 */


/**
 * @typedef {Object} module:v_presassistiveSchema.v_presassistive
 * @property {String} actType - 
 * @property {string} status - 
 * @property {Array.<String>} attachments - 
 * @property {Array.<module:v_presassistiveSchema.attachedMediaObj>} attachedMedia - 
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
 * @property {Array.<module:v_presassistiveSchema.editorObj>} editor - 
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
 * @property {Number} noOfRepetitions - 
 * @property {String} parentPrescriptionId - 
 * @property {String} rootPrescriptionId - 
 * @property {String} paidFreeStatus - 
 * @property {String} restRequestId - 
 * @property {String} recommendationId - 
 * @property {Boolean} nightTime - 
 * @property {Boolean} otherInsurance - 
 * @property {Boolean} utUnfall - 
 * @property {Boolean} workAccident - 
 * @property {Boolean} isPatientBVG - 
 * @property {Boolean} assistive - 
 * @property {Boolean} vaccination - 
 * @property {Boolean} practiceAssistive - 
 * @property {Boolean} dentist - 
 * @property {Boolean} substitutePrescription - 
 * @property {Boolean} employeeSpecialities - 
 * @property {Boolean} fk4202 - 
 * @property {Boolean} correctUsage - 
 * @property {Boolean} patientInformed - 
 * @property {Boolean} inLabel - 
 * @property {Boolean} offLabel - 
 * @property {Boolean} exactMed1 - 
 * @property {Boolean} exactMed2 - 
 * @property {Boolean} exactMed3 - 
 * @property {Array.<String>} icds - 
 * @property {Array.<String>} icdsExtra - 
 */