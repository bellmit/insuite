/**
 * @module v_ophthalmology_tonometrySchema
 */

/**
 * @typedef {Object} module:v_ophthalmology_tonometrySchema.otAppliedSetObj
 * @property {Date} otAppliedAtL - 
 * @property {Date} otAppliedAtR - 
 * @property {String} otAppliedContentL - 
 * @property {String} otAppliedContentR - 
 */


/**
 * @typedef {Object} module:v_ophthalmology_tonometrySchema.editorObj
 * @property {String} name - 
 * @property {String} employeeNo - 
 * @property {String} initials - 
 */


/**
 * @typedef {Object} module:v_ophthalmology_tonometrySchema.attachedMediaObj
 * @property {String} mediaId - 
 * @property {String} contentType - 
 * @property {String} caption - 
 * @property {String} title - 
 * @property {String} malwareWarning - 
 */


/**
 * @typedef {Object} module:v_ophthalmology_tonometrySchema.v_ophthalmology_tonometry
 * @property {String} actType - 
 * @property {Array.<String>} attachments - 
 * @property {Array.<module:v_ophthalmology_tonometrySchema.attachedMediaObj>} attachedMedia - 
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
 * @property {Array.<module:v_ophthalmology_tonometrySchema.editorObj>} editor - 
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
 * @property {Date} otNRead - 
 * @property {Number} otNR1 - 
 * @property {Number} otNR2 - 
 * @property {Number} otNR3 - 
 * @property {Number} otNR4 - 
 * @property {Number} otNCCTR - 
 * @property {Number} otNFacR - 
 * @property {Number} otNL1 - 
 * @property {Number} otNL2 - 
 * @property {Number} otNL3 - 
 * @property {Number} otNL4 - 
 * @property {Number} otNCCTL - 
 * @property {Number} otNFacL - 
 * @property {Date} otPRead - 
 * @property {Number} otPR1 - 
 * @property {Number} otPR2 - 
 * @property {Number} otPR3 - 
 * @property {Number} otPR4 - 
 * @property {Number} otPL1 - 
 * @property {Number} otPL2 - 
 * @property {Number} otPL3 - 
 * @property {Number} otPL4 - 
 * @property {Date} otGRead - 
 * @property {Number} otGR1 - 
 * @property {Number} otGR2 - 
 * @property {Number} otGL1 - 
 * @property {Number} otGL2 - 
 * @property {Date} otIRead - 
 * @property {Number} otIR1 - 
 * @property {Number} otIR2 - 
 * @property {Number} otIL1 - 
 * @property {Number} otIL2 - 
 * @property {Array.<module:v_ophthalmology_tonometrySchema.otAppliedSetObj>} otAppliedSet - 
 */