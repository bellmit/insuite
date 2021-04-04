/**
 * @module v_contractSchema
 */

/**
 * @typedef {Object} module:v_contractSchema.invoiceDataObj
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
 */


/**
 * @typedef {Object} module:v_contractSchema.fk4256SetObj
 * @property {String} fk4244 - 
 * @property {String} fk4246 - 
 * @property {String} fk4246Offset - 
 * @property {String} fk4245 - 
 */


/**
 * @typedef {Object} module:v_contractSchema.fk4244SetObj
 * @property {String} fk4244 - 
 * @property {String} fk4246 - 
 * @property {String} fk4246Offset - 
 * @property {String} fk4245 - 
 */


/**
 * @typedef {Object} module:v_contractSchema.fk4251SetObj
 * @property {String} fk4251 - 
 */


/**
 * @typedef {Object} module:v_contractSchema.fk4235SetObj
 * @property {Date} fk4235 - 
 * @property {Date} fk4247 - 
 * @property {Boolean} fk4250 - 
 * @property {Array.<module:v_contractSchema.fk4251SetObj>} fk4251Set - 
 * @property {Number} fk4252 - 
 * @property {Number} fk4255 - 
 * @property {String} fk4299 - 
 * @property {Array.<module:v_contractSchema.fk4244SetObj>} fk4244Set - 
 * @property {Array.<module:v_contractSchema.fk4256SetObj>} fk4256Set - 
 * @property {Boolean} finishedWithoutPseudoCode - 
 * @property {String} pseudoGop - 
 * @property {String} pseudoGopId - 
 */


/**
 * @typedef {Object} module:v_contractSchema.editorObj
 * @property {String} name - 
 * @property {String} employeeNo - 
 * @property {String} initials - 
 */


/**
 * @typedef {Object} module:v_contractSchema.attachedMediaObj
 * @property {String} mediaId - 
 * @property {String} contentType - 
 * @property {String} caption - 
 * @property {String} title - 
 * @property {String} malwareWarning - 
 */


/**
 * @typedef {Object} module:v_contractSchema.v_contract
 * @property {String} actType - 
 * @property {string} status - 
 * @property {string} activityId - 
 * @property {Array.<String>} attachments - 
 * @property {Array.<module:v_contractSchema.attachedMediaObj>} attachedMedia - 
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
 * @property {Array.<module:v_contractSchema.editorObj>} editor - 
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
 * @property {String} scheinOrder - 
 * @property {String} scheinDiagnosis - 
 * @property {String} treatmentType - 
 * @property {String} reasonType - 
 * @property {Boolean} includesBSK - 
 * @property {Boolean} isChiefPhysician - 
 * @property {String} debtCollection - 
 * @property {String} orderAccounting - 
 * @property {Number} agencyCost - 
 * @property {String} invoiceLogId - 
 * @property {String} invoiceLogType - 
 * @property {String} forInsuranceType - 
 * @property {String} locationFeatures - 
 * @property {Date} scheinSettledDate - 
 * @property {String} scheinRemittor - 
 * @property {String} scheinEstablishment - 
 * @property {String} scheinSpecialisation - 
 * @property {String} scheinFinding - 
 * @property {String} scheinClinicID - 
 * @property {String} scheinNotes - 
 * @property {Date} scheinClinicalTreatmentFrom - 
 * @property {Date} scheinClinicalTreatmentTo - 
 * @property {String} scheinNextTherapist - 
 * @property {Boolean} fk4234 - 
 * @property {Array.<module:v_contractSchema.fk4235SetObj>} fk4235Set - 
 * @property {String} fk4219 - 
 * @property {Array.<String>} continuousIcds - 
 * @property {Array.<String>} continuousMedications - 
 * @property {String} patientVersionId - 
 * @property {Array.<module:v_contractSchema.invoiceDataObj>} invoiceData - 
 * @property {Boolean} createContinuousDiagnosisOnSave - 
 * @property {Boolean} createContinuousMedicationsOnSave - 
 * @property {String} caseNumber - 
 * @property {Date} dayOfAccident - 
 * @property {String} assignedBgScheinRef - 
 * @property {Date} timeOfAccident - 
 * @property {Date} workingHoursStart - 
 * @property {Date} workingHoursEnd - 
 * @property {Date} dayOfArrival - 
 * @property {Date} timeOfArrival - 
 * @property {Date} dayOfFristTreat - 
 * @property {String} fristTreatPhysician - 
 * @property {String} accidentCompany - 
 * @property {String} accidentCompanyStreet - 
 * @property {String} accidentCompanyHouseno - 
 * @property {String} accidentCompanyPLZ - 
 * @property {String} accidentCompanyCity - 
 * @property {String} scheinQuarter - 
 * @property {String} scheinDate - 
 * @property {String} scheinYear - 
 * @property {String} fk4229 - 
 * @property {String} scheinBillingArea - 
 * @property {String} scheinType - 
 * @property {String} scheinSubgroup - 
 * @property {String} scheinInputTemplate - 
 * @property {String} scheinTransferType - 
 * @property {String} scheinTransferArrangementCode - 
 * @property {Date} scheinTransferDateOfContact - 
 * @property {String} scheinTransferTypeInfo - 
 * @property {String} fk4124 - 
 * @property {String} fk4126 - 
 * @property {Date} fk4125from - 
 * @property {Date} fk4125to - 
 * @property {String} fk4123 - 
 * @property {Date} fk4206 - 
 * @property {Boolean} fk4236 - 
 * @property {Boolean} fk4204 - 
 * @property {String} fk4241 - 
 * @property {String} fk5098 - 
 * @property {String} fk5099 - 
 * @property {String} fk4217 - 
 * @property {String} ÜberwAn - 
 * @property {String} auBis - 
 * @property {String} untersArt - 
 * @property {Boolean} asvReferrer - 
 * @property {Boolean} asvInitiator - 
 * @property {String} initiatorPhysicianName - 
 * @property {Array.<String>} icds - 
 * @property {Array.<String>} icdsExtra - 
 * @property {string} uvGoaeType - 
 * @property {Boolean} isPaid - 
 * @property {Number} healthStatusRatingBeforeCheck - 
 * @property {Number} healthStatusRatingOnFollowUp - 
 * @property {Number} amtsStatus - 
 * @property {string} checkProcessId - 
 * @property {string} amtsBubbleCollectionImage - 
 * @property {string} checkProcessJsonString - 
 * @property {Boolean} caseOfSpecialCare - 
 * @property {string} caseOfSpecialCareReason - 
 * @property {string} amtsSelectiveContractInsuranceId - 
 */