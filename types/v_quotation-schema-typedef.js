/**
 * @module v_quotationSchema
 */

/**
 * @typedef {Object} module:v_quotationSchema.editorObj
 * @property {String} name - 
 * @property {String} employeeNo - 
 * @property {String} initials - 
 */


/**
 * @typedef {Object} module:v_quotationSchema.attachedMediaObj
 * @property {String} mediaId - 
 * @property {String} contentType - 
 * @property {String} caption - 
 * @property {String} title - 
 * @property {String} malwareWarning - 
 */


/**
 * @typedef {Object} module:v_quotationSchema.v_quotation
 * @property {String} actType - 
 * @property {Boolean} hasOP - 
 * @property {Number} totalASK - 
 * @property {Number} totalBSK - 
 * @property {Number} totalDoc - 
 * @property {Number} totalWithoutExpenses - 
 * @property {Number} total75 - 
 * @property {Number} total25 - 
 * @property {Number} total15 - 
 * @property {Number} totalOwing - 
 * @property {Number} beforetax - 
 * @property {Number} totalExpense - 
 * @property {Number} totalAHB - 
 * @property {Number} totalBHB - 
 * @property {Number} total - 
 * @property {Number} totalVat - 
 * @property {Number} vatAmount - 
 * @property {Number} BSK - 
 * @property {Number} ASK - 
 * @property {Number} AHB - 
 * @property {Number} BHB - 
 * @property {Number} price - 
 * @property {Number} actualPrice - 
 * @property {String} unit - 
 * @property {String} actualUnit - 
 * @property {Boolean} hasVat - 
 * @property {Number} vat - 
 * @property {Object} _modifiedQuotationTreatments - 
 * @property {string} status - 
 * @property {Array.<String>} attachments - 
 * @property {Array.<module:v_quotationSchema.attachedMediaObj>} attachedMedia - 
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
 * @property {Array.<module:v_quotationSchema.editorObj>} editor - 
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
 * @property {Array.<String>} icds - 
 * @property {Array.<String>} icdsExtra - 
 */