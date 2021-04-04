/**
 * @module v_treatment_chSchema
 */

/**
 * @typedef {Object} module:v_treatment_chSchema.editorObj
 * @property {String} name - 
 * @property {String} employeeNo - 
 * @property {String} initials - 
 */


/**
 * @typedef {Object} module:v_treatment_chSchema.attachedMediaObj
 * @property {String} mediaId - 
 * @property {String} contentType - 
 * @property {String} caption - 
 * @property {String} title - 
 * @property {String} malwareWarning - 
 */


/**
 * @typedef {Object} module:v_treatment_chSchema.omimCodesObj
 * @property {String} fk5070 - 
 * @property {Date} fk5070ValidAt - 
 * @property {String} fk5071 - 
 * @property {Date} fk5071ValidAt - 
 * @property {String} fk5072 - 
 * @property {String} fk5073 - 
 */


/**
 * @typedef {Object} module:v_treatment_chSchema.hierarchyRulesObj
 * @property {Boolean} checked - 
 * @property {Boolean} disabled - 
 * @property {String} title - 
 * @property {String} seq - 
 * @property {String} validFrom - 
 * @property {String} validUntil - 
 */


/**
 * @typedef {Object} module:v_treatment_chSchema.fk5042SetObj
 * @property {String} fk5042 - 
 * @property {String} fk5043 - 
 */


/**
 * @typedef {Object} module:v_treatment_chSchema.fk5036SetObj
 * @property {String} fk5036 - 
 */


/**
 * @typedef {Object} module:v_treatment_chSchema.fk5035SetObj
 * @property {String} fk5035 - 
 * @property {String} fk5041 - 
 * @property {Object} catalogEntry - 
 * @property {Array.<String>} seqs - 
 */


/**
 * @typedef {Object} module:v_treatment_chSchema.fk5020SetObj
 * @property {Boolean} fk5020 - 
 * @property {String} fk5021 - 
 */


/**
 * @typedef {Object} module:v_treatment_chSchema.fk5011SetObj
 * @property {String} fk5011 - 
 */


/**
 * @typedef {Object} module:v_treatment_chSchema.fk5012SetObj
 * @property {String} fk5012 - 
 * @property {String} fk5074 - 
 * @property {String} fk5075 - 
 * @property {Array.<module:v_treatment_chSchema.fk5011SetObj>} fk5011Set - 
 */


/**
 * @typedef {Object} module:v_treatment_chSchema.v_treatment_ch
 * @property {String} scheinOrder - 
 * @property {String} scheinDiagnosis - 
 * @property {String} treatmentType - 
 * @property {String} reasonType - 
 * @property {Boolean} includesBSK - 
 * @property {Boolean} isChiefPhysician - 
 * @property {String} debtCollection - 
 * @property {String} orderAccounting - 
 * @property {Number} agencyCost - 
 * @property {Array.<String>} countryMode - 
 * @property {String} chapter - 
 * @property {String} fk5002 - 
 * @property {String} fk5005 - 
 * @property {String} fk5008 - 
 * @property {String} fk5013 - 
 * @property {String} fk5017 - 
 * @property {String} fk5019 - 
 * @property {String} fk5023 - 
 * @property {String} fk5024 - 
 * @property {Date} fk5025 - 
 * @property {Date} fk5026 - 
 * @property {Date} fk5034 - 
 * @property {String} fk5037 - 
 * @property {String} fk5040 - 
 * @property {String} fk5044 - 
 * @property {Array.<module:v_treatment_chSchema.fk5012SetObj>} fk5012Set - 
 * @property {String} fk5015 - 
 * @property {String} fk5016 - 
 * @property {String} tsvDoctorNo - 
 * @property {String} fk5018 - 
 * @property {Array.<module:v_treatment_chSchema.fk5020SetObj>} fk5020Set - 
 * @property {Array.<module:v_treatment_chSchema.fk5035SetObj>} fk5035Set - 
 * @property {Array.<module:v_treatment_chSchema.fk5036SetObj>} fk5036Set - 
 * @property {String} fk5038 - 
 * @property {String} fk5010BatchNumber - 
 * @property {Array.<module:v_treatment_chSchema.fk5042SetObj>} fk5042Set - 
 * @property {String} treatmentCategory - 
 * @property {Array.<module:v_treatment_chSchema.hierarchyRulesObj>} hierarchyRules - 
 * @property {Number} divisionCode - 
 * @property {String} divisionText - 
 * @property {Number} anaesthesiaCode - 
 * @property {String} anaesthesiaText - 
 * @property {String} medicalText - 
 * @property {String} technicalText - 
 * @property {Number} taxPoints - 
 * @property {Number} medicalTaxPoints - 
 * @property {Number} technicalTaxPoints - 
 * @property {Number} assistanceTaxPoints - 
 * @property {Number} taxPointValue - 
 * @property {Number} medicalScalingFactor - 
 * @property {Number} technicalScalingFactor - 
 * @property {Number} treatmentTime - 
 * @property {Number} preparationAndFollowUpTime - 
 * @property {Number} reportTime - 
 * @property {Number} roomOccupancyTime - 
 * @property {Number} rotationTime - 
 * @property {Number} assistanceQuantity - 
 * @property {String} benefitsCode - 
 * @property {String} benefitsText - 
 * @property {Array.<String>} billingRole - 
 * @property {String} treatmentTypeCh - 
 * @property {String} side - 
 * @property {Boolean} sideMandatory - 
 * @property {Number} price - 
 * @property {String} displayPrice - 
 * @property {String} bstrReferenceCode - 
 * @property {String} tariffType - 
 * @property {Number} materialCosts - 
 * @property {String} invoiceLogId - 
 * @property {String} invoiceLogType - 
 * @property {String} invoiceId - 
 * @property {Number} generalCosts - 
 * @property {Number} specialCosts - 
 * @property {String} areTreatmentDiagnosesBillable - 
 * @property {String} billingFactorValue - 
 * @property {String} billingFactorType - 
 * @property {Array.<module:v_treatment_chSchema.omimCodesObj>} omimCodes - 
 * @property {string} gebuehType - 
 * @property {string} costType - 
 * @property {Number} linkedPercentage - 
 * @property {Boolean} noASV - 
 * @property {Array.<String>} gnrAdditionalInfo - 
 * @property {String} gnrAdditionalInfoType - 
 * @property {String} labRequestRef - 
 * @property {Number} vat - 
 * @property {String} actType - 
 * @property {Array.<String>} attachments - 
 * @property {Array.<module:v_treatment_chSchema.attachedMediaObj>} attachedMedia - 
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
 * @property {Array.<module:v_treatment_chSchema.editorObj>} editor - 
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
 * @property {boolean} catalog - 
 * @property {String} catalogShort - 
 * @property {String} catalogRef - 
 * @property {String} code - 
 * @property {String} forInsuranceType - 
 * @property {boolean} modifyHomeCat - 
 * @property {boolean} deleteEntryHomeCat - 
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
 * @property {Number} actualPrice - 
 * @property {String} unit - 
 * @property {String} actualUnit - 
 * @property {Boolean} hasVat - 
 * @property {Number} numberOfCopies - 
 */