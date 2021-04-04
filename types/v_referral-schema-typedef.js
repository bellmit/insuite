/**
 * @module v_referralSchema
 */

/**
 * @typedef {Object} module:v_referralSchema.eTSAdditionalQualificationsObj
 * @property {String} code - 
 * @property {String} display - 
 * @property {String} system - 
 */


/**
 * @typedef {Object} module:v_referralSchema.editorObj
 * @property {String} name - 
 * @property {String} employeeNo - 
 * @property {String} initials - 
 */


/**
 * @typedef {Object} module:v_referralSchema.attachedMediaObj
 * @property {String} mediaId - 
 * @property {String} contentType - 
 * @property {String} caption - 
 * @property {String} title - 
 * @property {String} malwareWarning - 
 */


/**
 * @typedef {Object} module:v_referralSchema.v_referral
 * @property {String} actType - 
 * @property {string} status - 
 * @property {Array.<String>} attachments - 
 * @property {Array.<module:v_referralSchema.attachedMediaObj>} attachedMedia - 
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
 * @property {Array.<module:v_referralSchema.editorObj>} editor - 
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
 * @property {string} fk8401 - 
 * @property {String} untersArt - 
 * @property {Date} auBis - 
 * @property {Date} datumOP - 
 * @property {String} ueberwAn - 
 * @property {String} ueberwAnCodeSystem - 
 * @property {Boolean} asvTeamReferral - 
 * @property {String} diagnosesText - 
 * @property {String} medicationsText - 
 * @property {String} findingsText - 
 * @property {String} eTSArrangementCode - 
 * @property {String} eTSArrangementCodeRequestMessageId - 
 * @property {String} eTSAErrorMessage - 
 * @property {String} urgency - 
 * @property {Array.<module:v_referralSchema.eTSAdditionalQualificationsObj>} eTSAdditionalQualifications - 
 * @property {String} labRequestId - 
 * @property {Boolean} fk4204 - 
 * @property {Boolean} behandlungGemaess - 
 * @property {Date} abnDatumZeit - 
 * @property {String} auftrag - 
 * @property {String} scheinSlipMedicalTreatment - 
 * @property {Boolean} fk4202 - 
 * @property {Array.<String>} icds - 
 * @property {Array.<String>} icdsExtra - 
 * @property {String} selectedContact - 
 */