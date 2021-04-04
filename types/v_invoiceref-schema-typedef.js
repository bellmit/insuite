/**
 * @module v_invoicerefSchema
 */

/**
 * @typedef {Object} module:v_invoicerefSchema.linkedContentsObj
 * @property {String} receiptId - 
 * @property {String} content - 
 * @property {String} caseFolderId - 
 * @property {String} patientId - 
 * @property {String} actType - 
 * @property {Number} amount - 
 */


/**
 * @typedef {Object} module:v_invoicerefSchema.linkedTimestampsObj
 * @property {String} receiptId - 
 * @property {Date} timestamp - 
 */


/**
 * @typedef {Object} module:v_invoicerefSchema.linkedEmployeesObj
 * @property {String} receiptId - 
 * @property {String} name - 
 * @property {String} employeeNo - 
 * @property {String} initials - 
 */


/**
 * @typedef {Object} module:v_invoicerefSchema.editorObj
 * @property {String} name - 
 * @property {String} employeeNo - 
 * @property {String} initials - 
 */


/**
 * @typedef {Object} module:v_invoicerefSchema.attachedMediaObj
 * @property {String} mediaId - 
 * @property {String} contentType - 
 * @property {String} caption - 
 * @property {String} title - 
 * @property {String} malwareWarning - 
 */


/**
 * @typedef {Object} module:v_invoicerefSchema.v_invoiceref
 * @property {String} actType - 
 * @property {Array.<String>} attachments - 
 * @property {Array.<module:v_invoicerefSchema.attachedMediaObj>} attachedMedia - 
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
 * @property {Array.<module:v_invoicerefSchema.editorObj>} editor - 
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
 * @property {Number} total - 
 * @property {Number} price - 
 * @property {Array.<String>} receipts - 
 * @property {Number} totalReceiptsOutstanding - 
 * @property {Number} totalReceipts - 
 * @property {String} invoiceNo - 
 * @property {String} invoiceRefNo - 
 * @property {Array.<module:v_invoicerefSchema.linkedEmployeesObj>} linkedEmployees - 
 * @property {Array.<module:v_invoicerefSchema.linkedTimestampsObj>} linkedTimestamps - 
 * @property {Date} invoiceDate - 
 * @property {Date} invoiceBilledDate - 
 * @property {Array.<module:v_invoicerefSchema.linkedContentsObj>} linkedContents - 
 * @property {String} kvglogId - 
 * @property {String} invoiceLogId - 
 * @property {String} invoiceLogType - 
 * @property {String} scheinNotes - 
 * @property {Boolean} medidataRejected - 
 * @property {String} referenceNo - 
 * @property {Array.<String>} icds - 
 * @property {Array.<String>} icdsExtra - 
 */