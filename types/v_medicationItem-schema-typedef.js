/**
 * @module v_medicationItemSchema
 */

/**
 * @typedef {Object} module:v_medicationItemSchema.phAMRContentObj
 * @property {String} title - 
 * @property {String} text - 
 * @property {String} regulationTypeCode - 
 * @property {String} limitation - 
 * @property {String} fileName - 
 */


/**
 * @typedef {Object} module:v_medicationItemSchema.phARVContentObj
 * @property {String} title - 
 * @property {String} hint - 
 * @property {String} datesInfo - 
 * @property {Boolean} hasAlternatives - 
 */


/**
 * @typedef {Object} module:v_medicationItemSchema.phIngrObj
 * @property {Number} code - 
 * @property {String} name - 
 * @property {String} shortName - 
 * @property {String} strength - 
 */


/**
 * @typedef {Object} module:v_medicationItemSchema.editorObj
 * @property {String} name - 
 * @property {String} employeeNo - 
 * @property {String} initials - 
 */


/**
 * @typedef {Object} module:v_medicationItemSchema.attachedMediaObj
 * @property {String} mediaId - 
 * @property {String} contentType - 
 * @property {String} caption - 
 * @property {String} title - 
 * @property {String} malwareWarning - 
 */


/**
 * @typedef {Object} module:v_medicationItemSchema.v_medicationItem
 * @property {String} actType - 
 * @property {Array.<String>} attachments - 
 * @property {Array.<module:v_medicationItemSchema.attachedMediaObj>} attachedMedia - 
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
 * @property {Array.<module:v_medicationItemSchema.editorObj>} editor - 
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
 * @property {String} phPZN - 
 * @property {String} phCompany - 
 * @property {String} phForm - 
 * @property {String} phPackSize - 
 * @property {Number} phPackQuantity - 
 * @property {Number} phPriceSale - 
 * @property {Number} phRefundAmount - 
 * @property {Number} phPriceRecommended - 
 * @property {Number} phPatPay - 
 * @property {String} phPatPayHint - 
 * @property {Number} phFixedPay - 
 * @property {Array.<module:v_medicationItemSchema.phIngrObj>} phIngr - 
 * @property {Array.<String>} phAtc - 
 * @property {Boolean} phOnly - 
 * @property {Boolean} phTer - 
 * @property {Boolean} phTrans - 
 * @property {Boolean} phImport - 
 * @property {Boolean} phNegative - 
 * @property {Boolean} phLifeStyle - 
 * @property {Boolean} phLifeStyleCond - 
 * @property {Array.<String>} phAMR - 
 * @property {Boolean} phGBA - 
 * @property {String} phGBATherapyHintName - 
 * @property {Boolean} phDisAgr - 
 * @property {Boolean} phDisAgrAlt - 
 * @property {Boolean} phMed - 
 * @property {Boolean} phPrescMed - 
 * @property {Boolean} phBTM - 
 * @property {Boolean} phRecipeOnly - 
 * @property {String} phNLabel - 
 * @property {Boolean} phOTC - 
 * @property {Boolean} phOTX - 
 * @property {Boolean} phARV - 
 * @property {Array.<module:v_medicationItemSchema.phARVContentObj>} phARVContent - 
 * @property {Array.<module:v_medicationItemSchema.phAMRContentObj>} phAMRContent - 
 * @property {Boolean} phCheaperPkg - 
 * @property {Boolean} phContinuousMed - 
 * @property {Date} phContinuousMedDate - 
 * @property {Date} phContinuousMedStart - 
 * @property {Date} phContinuousMedEnd - 
 * @property {Boolean} phSampleMed - 
 * @property {Boolean} hasVat - 
 * @property {Number} vat - 
 * @property {String} dosis - 
 * @property {String} phDosisMorning - 
 * @property {String} phDosisAfternoon - 
 * @property {String} phDosisEvening - 
 * @property {String} phDosisNight - 
 * @property {string} phDosisType - 
 * @property {Boolean} phAsNeededMedication - 
 * @property {String} phUnit - 
 * @property {String} phNote - 
 * @property {String} phReason - 
 * @property {Boolean} phSelfMedication - 
 * @property {String} phSalesStatus - 
 * @property {String} phNormSize - 
 * @property {String} phHeader - 
 * @property {Boolean} isPrescribed - 
 * @property {String} restRequestId - 
 * @property {Boolean} isDispensed - 
 * @property {Boolean} isArrived - 
 * @property {ObjectId} orderId - 
 * @property {String} phFormCode - 
 * @property {String} phDosisUnitCode - 
 * @property {String} phGTIN - 
 * @property {String} insuranceDescription - 
 * @property {String} insuranceCode - 
 * @property {Boolean} paidByInsurance - 
 * @property {String} supplyCategory - 
 * @property {String} prdNo - 
 * @property {String} phUnitDescription - 
 * @property {String} phForeignUnit - 
 * @property {Object} units - 
 * @property {Boolean} isDivisible - 
 * @property {Number} divisibleCount - 
 * @property {Boolean} adherence - 
 * @property {String} source - 
 * @property {Boolean} noLongerValid - 
 * @property {String} sourceType - 
 * @property {Boolean} phContraceptive - 
 * @property {Object} s_extra - 
 * @property {boolean} catalog - 
 * @property {String} catalogShort - 
 * @property {String} catalogRef - 
 * @property {String} code - 
 * @property {String} forInsuranceType - 
 * @property {boolean} modifyHomeCat - 
 * @property {boolean} deleteEntryHomeCat - 
 * @property {Number} positionIndex - 
 */