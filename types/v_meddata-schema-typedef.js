/**
 * @module v_meddataSchema
 */

/**
 * @typedef {Object} module:v_meddataSchema.medDataObj
 * @property {String} category - 
 * @property {String} type - 
 * @property {Number} value - 
 * @property {String} textValue - 
 * @property {Date} dateValue - 
 * @property {Boolean} boolValue - 
 * @property {String} unit - 
 * @property {Array.<String>} sampleNormalValueText - 
 * @property {object} additionalData - 
 * @property {Number} cchKey - 
 * @property {Boolean} noTagCreation - 
 */


/**
 * @typedef {Object} module:v_meddataSchema.editorObj
 * @property {String} name - 
 * @property {String} employeeNo - 
 * @property {String} initials - 
 */


/**
 * @typedef {Object} module:v_meddataSchema.attachedMediaObj
 * @property {String} mediaId - 
 * @property {String} contentType - 
 * @property {String} caption - 
 * @property {String} title - 
 * @property {String} malwareWarning - 
 */


/**
 * @typedef {Object} module:v_meddataSchema.v_meddata
 * @property {String} actType - 
 * @property {Array.<String>} attachments - 
 * @property {Array.<module:v_meddataSchema.attachedMediaObj>} attachedMedia - 
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
 * @property {Array.<module:v_meddataSchema.editorObj>} editor - 
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
 * @property {Array.<module:v_meddataSchema.medDataObj>} medData - 
 * @property {Object} labEntries - 
 * @property {String} medDataType - 
 * @property {Number} fetuses - 
 * @property {Number} initialWeight - 
 * @property {Number} pelvicMeasurementSP25 - 
 * @property {Number} pelvicMeasurementCR28 - 
 * @property {Number} pelvicMeasurementTR31 - 
 * @property {Number} pelvicMeasurementC20 - 
 * @property {Boolean} rubellaTiter - 
 * @property {Boolean} antibody1 - 
 * @property {Boolean} antibody2 - 
 * @property {Boolean} HBsAg - 
 * @property {Boolean} syphillis - 
 * @property {Boolean} toxoplasmosis - 
 * @property {Boolean} HIV - 
 * @property {Boolean} chlamidia - 
 * @property {String} glucoseTolerance - 
 */