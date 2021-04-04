/**
 * @module activitySchema
 */

/**
 * @typedef {Object} module:activitySchema.linkedTreatmentsObj
 * @property {String} activityId - 
 * @property {String} code - 
 * @property {Array.<String>} opsCodes - 
 * @property {Number} quantity - 
 * @property {String} userContent - 
 * @property {String} explanations - 
 * @property {String} catalogRef - 
 */


/**
 * @typedef {Object} module:activitySchema.eTSAdditionalQualificationsObj
 * @property {String} code - 
 * @property {String} display - 
 * @property {String} system - 
 */


/**
 * @typedef {Object} module:activitySchema.medDataObj
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
 * @typedef {Object} module:activitySchema.participantsObj
 * @property {string} identityId - 
 * @property {String} title - 
 * @property {String} firstname - 
 * @property {String} lastname - 
 * @property {String} locationName - 
 * @property {Boolean} isInitiator - 
 * @property {String} customerNo - 
 * @property {String} dcCustomerNo - 
 */


/**
 * @typedef {Object} module:activitySchema.ut2ConductionSymptomsObj
 * @property {String} code - 
 * @property {String} name - 
 */


/**
 * @typedef {Object} module:activitySchema.ut2AgreementObj
 * @property {String} type - 
 * @property {String} advice - 
 * @property {Date} acuteEventDate - 
 * @property {Number} acuteEvent - 
 */


/**
 * @typedef {Object} module:activitySchema.ut2Remedy2ListObj
 * @property {String} name - 
 * @property {String} type - 
 * @property {String} text - 
 * @property {Number} units - 
 * @property {Number} price - 
 * @property {String} requiredConductionSymptom - 
 * @property {Boolean} massage - 
 */


/**
 * @typedef {Object} module:activitySchema.ut2Remedy1ListObj
 * @property {String} name - 
 * @property {String} type - 
 * @property {String} text - 
 * @property {Number} units - 
 * @property {Number} price - 
 * @property {String} requiredConductionSymptom - 
 * @property {Boolean} massage - 
 */


/**
 * @typedef {Object} module:activitySchema.utRemedy2ListObj
 * @property {String} name - 
 * @property {String} type - 
 * @property {Boolean} groupTherapyAble - 
 * @property {Number} seasons - 
 * @property {Number} price - 
 */


/**
 * @typedef {Object} module:activitySchema.utRemedy1ListObj
 * @property {String} name - 
 * @property {String} type - 
 * @property {Boolean} groupTherapyAble - 
 * @property {Number} seasons - 
 * @property {Number} price - 
 */


/**
 * @typedef {Object} module:activitySchema.utAgreementApprovedForInsuranceObj
 * @property {String} insuranceNo - 
 * @property {String} kvkHistoricalNo - 
 * @property {String} insuranceId - 
 * @property {String} daleUvInsuranceId - 
 * @property {String} insuranceName - 
 * @property {String} daleUvInsuranceName - 
 * @property {String} insurancePrintName - 
 * @property {String} insuranceCountry - 
 * @property {String} insuranceGrpId - 
 * @property {Date} paidFreeTo - 
 * @property {String} type - 
 * @property {String} billingFactor - 
 * @property {String} mobileEgkId - 
 * @property {String} cdmVersion - 
 * @property {String} cardTypeGeneration - 
 * @property {String} cardType - 
 * @property {String} terminalType - 
 * @property {String} fk4108 - 
 * @property {Date} cardSwipe - 
 * @property {Date} cardValidTo - 
 * @property {Date} fk4133 - 
 * @property {Date} fk4110 - 
 * @property {String} policyHolder - 
 * @property {Date} policyDob - 
 * @property {String} insuranceKind - 
 * @property {String} persGroup - 
 * @property {String} dmp - 
 * @property {String} costCarrierBillingSection - 
 * @property {String} costCarrierBillingGroup - 
 * @property {Boolean} paidFree - 
 * @property {String} locationFeatures - 
 * @property {String} notes - 
 * @property {String} feeSchedule - 
 * @property {String} kv - 
 * @property {String} locationId - 
 * @property {String} employeeId - 
 * @property {Boolean} fused - 
 * @property {String} fusedFrom - 
 * @property {String} fusedToInsuranceId - 
 * @property {Array.<String>} unzkv - 
 * @property {String} bgNumber - 
 * @property {String} address1 - 
 * @property {String} address2 - 
 * @property {String} zipcode - 
 * @property {String} city - 
 * @property {String} phone - 
 * @property {String} insuranceLink - 
 * @property {String} email - 
 * @property {String} insuranceGLN - 
 * @property {String} recipientGLN - 
 * @property {Boolean} changebillingtypedesc - 
 * @property {String} department - 
 * @property {Boolean} mediport - 
 * @property {String} originalInsuranceId - 
 * @property {String} originalInsuranceGrpId - 
 * @property {String} originalCostCarrierBillingSection - 
 * @property {String} fk3010 - 
 * @property {String} fk3011 - 
 * @property {String} fk3012 - 
 * @property {String} fk3013 - 
 * @property {Boolean} createUniqCaseIdentNoOnInvoice - 
 * @property {Boolean} doNotShowInsuranceInGadget - 
 * @property {Boolean} unknownInsurance - 
 * @property {Boolean} isTiersGarant - 
 * @property {Boolean} isTiersPayant - 
 * @property {String} vekaCardNo - 
 * @property {Date} cardExpiryDate - 
 * @property {Date} cardValidationDate - 
 */


/**
 * @typedef {Object} module:activitySchema.otAppliedSetObj
 * @property {Date} otAppliedAtL - 
 * @property {Date} otAppliedAtR - 
 * @property {String} otAppliedContentL - 
 * @property {String} otAppliedContentR - 
 */


/**
 * @typedef {Object} module:activitySchema.dispensedItemsObj
 * @property {ObjectId} stockItemId - 
 * @property {String} stockLocationId - 
 * @property {String} phPZN - 
 * @property {String} reason - 
 * @property {String} description - 
 */


/**
 * @typedef {Object} module:activitySchema.phAMRContentObj
 * @property {String} title - 
 * @property {String} text - 
 * @property {String} regulationTypeCode - 
 * @property {String} limitation - 
 * @property {String} fileName - 
 */


/**
 * @typedef {Object} module:activitySchema.phARVContentObj
 * @property {String} title - 
 * @property {String} hint - 
 * @property {String} datesInfo - 
 * @property {Boolean} hasAlternatives - 
 */


/**
 * @typedef {Object} module:activitySchema.phIngrObj
 * @property {Number} code - 
 * @property {String} name - 
 * @property {String} shortName - 
 * @property {String} strength - 
 */


/**
 * @typedef {Object} module:activitySchema.omimCodesObj
 * @property {String} fk5070 - 
 * @property {Date} fk5070ValidAt - 
 * @property {String} fk5071 - 
 * @property {Date} fk5071ValidAt - 
 * @property {String} fk5072 - 
 * @property {String} fk5073 - 
 */


/**
 * @typedef {Object} module:activitySchema.hierarchyRulesObj
 * @property {Boolean} checked - 
 * @property {Boolean} disabled - 
 * @property {String} title - 
 * @property {String} seq - 
 * @property {String} validFrom - 
 * @property {String} validUntil - 
 */


/**
 * @typedef {Object} module:activitySchema.fk5042SetObj
 * @property {String} fk5042 - 
 * @property {String} fk5043 - 
 */


/**
 * @typedef {Object} module:activitySchema.fk5036SetObj
 * @property {String} fk5036 - 
 */


/**
 * @typedef {Object} module:activitySchema.fk5035SetObj
 * @property {String} fk5035 - 
 * @property {String} fk5041 - 
 * @property {Object} catalogEntry - 
 * @property {Array.<String>} seqs - 
 */


/**
 * @typedef {Object} module:activitySchema.fk5020SetObj
 * @property {Boolean} fk5020 - 
 * @property {String} fk5021 - 
 */


/**
 * @typedef {Object} module:activitySchema.fk5011SetObj
 * @property {String} fk5011 - 
 */


/**
 * @typedef {Object} module:activitySchema.fk5012SetObj
 * @property {String} fk5012 - 
 * @property {String} fk5074 - 
 * @property {String} fk5075 - 
 * @property {Array.<module:activitySchema.fk5011SetObj>} fk5011Set - 
 */


/**
 * @typedef {Object} module:activitySchema.invoiceDataObj
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
 * @typedef {Object} module:activitySchema.fk4256SetObj
 * @property {String} fk4244 - 
 * @property {String} fk4246 - 
 * @property {String} fk4246Offset - 
 * @property {String} fk4245 - 
 */


/**
 * @typedef {Object} module:activitySchema.fk4244SetObj
 * @property {String} fk4244 - 
 * @property {String} fk4246 - 
 * @property {String} fk4246Offset - 
 * @property {String} fk4245 - 
 */


/**
 * @typedef {Object} module:activitySchema.fk4251SetObj
 * @property {String} fk4251 - 
 */


/**
 * @typedef {Object} module:activitySchema.fk4235SetObj
 * @property {Date} fk4235 - 
 * @property {Date} fk4247 - 
 * @property {Boolean} fk4250 - 
 * @property {Array.<module:activitySchema.fk4251SetObj>} fk4251Set - 
 * @property {Number} fk4252 - 
 * @property {Number} fk4255 - 
 * @property {String} fk4299 - 
 * @property {Array.<module:activitySchema.fk4244SetObj>} fk4244Set - 
 * @property {Array.<module:activitySchema.fk4256SetObj>} fk4256Set - 
 * @property {Boolean} finishedWithoutPseudoCode - 
 * @property {String} pseudoGop - 
 * @property {String} pseudoGopId - 
 */


/**
 * @typedef {Object} module:activitySchema.linkedContentsObj
 * @property {String} receiptId - 
 * @property {String} content - 
 * @property {String} caseFolderId - 
 * @property {String} patientId - 
 * @property {String} actType - 
 * @property {Number} amount - 
 */


/**
 * @typedef {Object} module:activitySchema.linkedTimestampsObj
 * @property {String} receiptId - 
 * @property {Date} timestamp - 
 */


/**
 * @typedef {Object} module:activitySchema.linkedEmployeesObj
 * @property {String} receiptId - 
 * @property {String} name - 
 * @property {String} employeeNo - 
 * @property {String} initials - 
 */


/**
 * @typedef {Object} module:activitySchema.kimSignedByObj
 * @property {Date} timestamp - 
 * @property {String} name - 
 * @property {String} employeeId - 
 */


/**
 * @typedef {Object} module:activitySchema.relatedCodesObj
 * @property {Boolean} checked - 
 * @property {String} title - 
 * @property {String} seq - 
 * @property {Boolean} F - 
 * @property {Boolean} I - 
 * @property {Boolean} N - 
 * @property {Boolean} B - 
 */


/**
 * @typedef {Object} module:activitySchema.editorObj
 * @property {String} name - 
 * @property {String} employeeNo - 
 * @property {String} initials - 
 */


/**
 * @typedef {Object} module:activitySchema.attachedMediaObj
 * @property {String} mediaId - 
 * @property {String} contentType - 
 * @property {String} caption - 
 * @property {String} title - 
 * @property {String} malwareWarning - 
 */


/**
 * @typedef {Object} module:activitySchema.activity
 * @property {Array.<String>} attachments - 
 * @property {Array.<module:activitySchema.attachedMediaObj>} attachedMedia - 
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
 * @property {Array.<module:activitySchema.editorObj>} editor - 
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
 * @property {String} diagnosisCert - 
 * @property {String} diagnosisType - 
 * @property {String} diagnosisTreatmentRelevance - 
 * @property {String} diagnosisSite - 
 * @property {String} diagnosisDerogation - 
 * @property {Date} diagnosisInvalidationDate - 
 * @property {String} diagnosisPeriod - 
 * @property {String} diagnosisLaterality - 
 * @property {Boolean} diagnosisInfectious - 
 * @property {Boolean} diagnosisFunctional - 
 * @property {Boolean} diagnosisNeoplasia - 
 * @property {Boolean} diagnosisOcupationally - 
 * @property {Array.<module:activitySchema.relatedCodesObj>} relatedCodes - 
 * @property {Array.<String>} icds - 
 * @property {Array.<String>} icdsExtra - 
 * @property {String} kimState - 
 * @property {Array.<module:activitySchema.kimSignedByObj>} kimSignedBy - 
 * @property {String} xmlSetId - 
 * @property {String} flatFeeTreatmentId - 
 * @property {string} uvGoaeType - 
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
 * @property {String} invoiceNo - 
 * @property {Date} autoGenerated - 
 * @property {String} ruleStatus - 
 * @property {Object} ruleErrors - 
 * @property {Array.<String>} receipts - 
 * @property {String} scheinOrder - 
 * @property {String} scheinDiagnosis - 
 * @property {String} treatmentType - 
 * @property {String} reasonType - 
 * @property {Boolean} includesBSK - 
 * @property {Boolean} isChiefPhysician - 
 * @property {String} debtCollection - 
 * @property {String} orderAccounting - 
 * @property {Number} agencyCost - 
 * @property {Number} totalReceipts - 
 * @property {Number} totalPenalties - 
 * @property {Number} totalReceiptsOutstanding - 
 * @property {Array.<module:activitySchema.linkedEmployeesObj>} linkedEmployees - 
 * @property {Array.<module:activitySchema.linkedTimestampsObj>} linkedTimestamps - 
 * @property {Date} invoiceDate - 
 * @property {Date} invoiceBilledDate - 
 * @property {Date} reminderDate - 
 * @property {Date} warning1Date - 
 * @property {Date} warning2Date - 
 * @property {String} billingAddress - 
 * @property {Array.<String>} continuousIcds - 
 * @property {Array.<module:activitySchema.linkedContentsObj>} linkedContents - 
 * @property {String} insuranceName - 
 * @property {String} referenceNo - 
 * @property {String} scheinNotes - 
 * @property {String} invoiceLogId - 
 * @property {String} invoiceLogType - 
 * @property {String} locationFeatures - 
 * @property {Date} scheinSettledDate - 
 * @property {String} scheinRemittor - 
 * @property {String} scheinEstablishment - 
 * @property {String} scheinSpecialisation - 
 * @property {String} scheinFinding - 
 * @property {String} scheinClinicID - 
 * @property {Date} scheinClinicalTreatmentFrom - 
 * @property {Date} scheinClinicalTreatmentTo - 
 * @property {String} scheinNextTherapist - 
 * @property {Boolean} fk4234 - 
 * @property {Array.<module:activitySchema.fk4235SetObj>} fk4235Set - 
 * @property {String} fk4219 - 
 * @property {Array.<String>} continuousMedications - 
 * @property {String} patientVersionId - 
 * @property {Array.<module:activitySchema.invoiceDataObj>} invoiceData - 
 * @property {Boolean} createContinuousDiagnosisOnSave - 
 * @property {Boolean} createContinuousMedicationsOnSave - 
 * @property {String} caseNumber - 
 * @property {Date} dayOfAccident - 
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
 * @property {Number} scheinBillingFactorValue - 
 * @property {Boolean} isTiersGarant - 
 * @property {Boolean} isTiersPayant - 
 * @property {Boolean} docPrinted - 
 * @property {String} scheinSlipMedicalTreatment - 
 * @property {String} requestId - 
 * @property {String} insuranceType - 
 * @property {String} ageGroup - 
 * @property {String} surveySex - 
 * @property {Boolean} repeatedExam - 
 * @property {String} hypertonia - 
 * @property {String} coronalHeartDisease - 
 * @property {String} otherArterialClosure - 
 * @property {String} diabetesMellitus - 
 * @property {String} hyperlipidemia - 
 * @property {String} kidneyDiseases - 
 * @property {String} lungDiseases - 
 * @property {Boolean} nicotineAbuse - 
 * @property {Boolean} chronicEmotionalStressFactor - 
 * @property {Boolean} sedentaryLifestyle - 
 * @property {Boolean} adipositas - 
 * @property {Boolean} alcoholAbuse - 
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
 * @property {Array.<module:activitySchema.fk5012SetObj>} fk5012Set - 
 * @property {String} fk5015 - 
 * @property {String} fk5016 - 
 * @property {String} tsvDoctorNo - 
 * @property {String} fk5018 - 
 * @property {Array.<module:activitySchema.fk5020SetObj>} fk5020Set - 
 * @property {Array.<module:activitySchema.fk5035SetObj>} fk5035Set - 
 * @property {Array.<module:activitySchema.fk5036SetObj>} fk5036Set - 
 * @property {String} fk5038 - 
 * @property {String} fk5010BatchNumber - 
 * @property {Array.<module:activitySchema.fk5042SetObj>} fk5042Set - 
 * @property {String} treatmentCategory - 
 * @property {Array.<module:activitySchema.hierarchyRulesObj>} hierarchyRules - 
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
 * @property {String} displayPrice - 
 * @property {String} bstrReferenceCode - 
 * @property {String} tariffType - 
 * @property {Number} materialCosts - 
 * @property {String} invoiceId - 
 * @property {Number} generalCosts - 
 * @property {Number} specialCosts - 
 * @property {String} areTreatmentDiagnosesBillable - 
 * @property {String} billingFactorValue - 
 * @property {String} billingFactorType - 
 * @property {Array.<module:activitySchema.omimCodesObj>} omimCodes - 
 * @property {string} gebuehType - 
 * @property {string} costType - 
 * @property {Number} linkedPercentage - 
 * @property {Boolean} noASV - 
 * @property {Array.<String>} gnrAdditionalInfo - 
 * @property {String} gnrAdditionalInfoType - 
 * @property {String} labRequestRef - 
 * @property {Object} d_extra - 
 * @property {String} vendorId - 
 * @property {String} eventMessage - 
 * @property {Date} eventDate - 
 * @property {Boolean} specialDOQUVIDE - 
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
 * @property {Array.<module:activitySchema.phIngrObj>} phIngr - 
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
 * @property {Array.<module:activitySchema.phARVContentObj>} phARVContent - 
 * @property {Array.<module:activitySchema.phAMRContentObj>} phAMRContent - 
 * @property {Boolean} phCheaperPkg - 
 * @property {Boolean} phContinuousMed - 
 * @property {Date} phContinuousMedDate - 
 * @property {Date} phContinuousMedStart - 
 * @property {Date} phContinuousMedEnd - 
 * @property {Boolean} phSampleMed - 
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
 * @property {Array.<module:activitySchema.dispensedItemsObj>} dispensedItems - 
 * @property {String} observationTherapyStatus - 
 * @property {String} observationValuation - 
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
 * @property {Array.<module:activitySchema.otAppliedSetObj>} otAppliedSet - 
 * @property {String} orType - 
 * @property {Date} orRead - 
 * @property {Number} orSphL - 
 * @property {Number} orSphR - 
 * @property {Number} orCylL - 
 * @property {Number} orCylR - 
 * @property {Number} orAxsL - 
 * @property {Number} orAxsR - 
 * @property {Number} orAddL - 
 * @property {Number} orAddR - 
 * @property {Number} orPsmL - 
 * @property {Number} orPsmR - 
 * @property {String} orBasL - 
 * @property {String} orBasR - 
 * @property {Number} orAdd2L - 
 * @property {Number} orAdd2R - 
 * @property {String} orVisAcuTyp - 
 * @property {Number} orFarL - 
 * @property {Number} orFarR - 
 * @property {Number} orFarB - 
 * @property {Number} orNearL - 
 * @property {Number} orNearR - 
 * @property {Number} orNearB - 
 * @property {Number} orPD - 
 * @property {Number} orHSA - 
 * @property {String} utDiagnosisName - 
 * @property {String} utRemedy1Name - 
 * @property {String} utRemedy1Item - 
 * @property {Number} utRemedy1ItemPrice - 
 * @property {String} utRemedy1Explanation - 
 * @property {Number} utRemedy1Seasons - 
 * @property {Number} utRemedy1ParentsSeasons - 
 * @property {String} utRemedy1PerWeek - 
 * @property {String} utRemedy2Name - 
 * @property {String} utRemedy2Item - 
 * @property {Number} utRemedy2ItemPrice - 
 * @property {String} utRemedy2Explanation - 
 * @property {Number} utRemedy2Seasons - 
 * @property {Number} utRemedy2ParentsSeasons - 
 * @property {String} utRemedy2PerWeek - 
 * @property {Boolean} utVocalTherapy - 
 * @property {Boolean} utSpeakTherapy - 
 * @property {Boolean} utSpeechTherapy - 
 * @property {String} utPrescriptionType - 
 * @property {Boolean} utNoNormalCase - 
 * @property {Boolean} utHomeVisit - 
 * @property {Boolean} utTherapyReport - 
 * @property {Boolean} utGroupTherapy - 
 * @property {Number} utDurationOfSeason - 
 * @property {Date} utLatestStartOfTreatment - 
 * @property {String} utMedicalJustification - 
 * @property {String} utTherapyGoals - 
 * @property {Array.<String>} utTherapyGoalsList - 
 * @property {Boolean} utBvg - 
 * @property {String} utNeuroFinding - 
 * @property {Date} utAudioDiagDate - 
 * @property {Boolean} utAudioDiagReact - 
 * @property {Boolean} utAudioDiagCond - 
 * @property {Boolean} utAudioDiagOwn - 
 * @property {String} utLupenlaryngoskopie - 
 * @property {String} utLupenstroboskopieRight - 
 * @property {String} utLupenstroboskopieLeft - 
 * @property {String} utAmplitudeRight - 
 * @property {String} utAmplitudeLeft - 
 * @property {String} utRandkantenverschiebungRight - 
 * @property {String} utRandkantenverschiebungLeft - 
 * @property {Boolean} utRegular - 
 * @property {Boolean} utGlottisschluss - 
 * @property {String} utEarDrumFindingRight - 
 * @property {String} utEarDrumFindingLeft - 
 * @property {String} utIndicationCode - 
 * @property {String} utIcdCode - 
 * @property {String} utIcdText - 
 * @property {String} utIcdRef - 
 * @property {String} utSecondIcdCode - 
 * @property {String} utSecondIcdText - 
 * @property {String} utSecondIcdRef - 
 * @property {String} utAgreement - 
 * @property {Date} utAgreementApprovedTill - 
 * @property {Array.<module:activitySchema.utAgreementApprovedForInsuranceObj>} utAgreementApprovedForInsurance - 
 * @property {String} utAgreementApprovedText - 
 * @property {String} utAgreementApprovedCode - 
 * @property {Boolean} utAgreementApprovedCodeUseDiagnosisGroup - 
 * @property {Array.<module:activitySchema.utRemedy1ListObj>} utRemedy1List - 
 * @property {Array.<module:activitySchema.utRemedy2ListObj>} utRemedy2List - 
 * @property {Date} utAcuteEvent - 
 * @property {String} restTicketNumber - 
 * @property {String} ut2Chapter - 
 * @property {String} ut2DiagnosisGroupCode - 
 * @property {String} ut2DiagnosisGroupName - 
 * @property {Array.<module:activitySchema.ut2Remedy1ListObj>} ut2Remedy1List - 
 * @property {Array.<module:activitySchema.ut2Remedy2ListObj>} ut2Remedy2List - 
 * @property {String} ut2TreatmentRelevantDiagnosisText - 
 * @property {String} ut2AgreementType - 
 * @property {Array.<module:activitySchema.ut2AgreementObj>} ut2Agreement - 
 * @property {Array.<String>} ut2ApprovalRefs - 
 * @property {Boolean} ut2PatientSpecificConductionSymptoms - 
 * @property {String} ut2PatientSpecificConductionSymptomsFreeText - 
 * @property {Array.<module:activitySchema.ut2ConductionSymptomsObj>} ut2ConductionSymptoms - 
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
 * @property {Date} approvalValidTo - 
 * @property {Boolean} unlimitedApproval - 
 * @property {String} insuranceId - 
 * @property {String} teleConsultNote - 
 * @property {Date} start - 
 * @property {Date} end - 
 * @property {Array.<module:activitySchema.participantsObj>} participants - 
 * @property {String} labRequestId - 
 * @property {String} labRequestType - 
 * @property {String} sonstigesText - 
 * @property {String} knappschaftskennzeichen - 
 * @property {Boolean} befEiltTelBool - 
 * @property {Boolean} befEiltFaxBool - 
 * @property {String} befEiltNr - 
 * @property {String} ssw - 
 * @property {String} zuAngaben - 
 * @property {String} befEiltFax - 
 * @property {String} befEiltTel - 
 * @property {boolean} befEilt - 
 * @property {boolean} kontrollunters - 
 * @property {String} ggfKennziffer - 
 * @property {boolean} edtaGrBlutbild - 
 * @property {boolean} edtaKlBlutbild - 
 * @property {boolean} edtaHbA1c - 
 * @property {boolean} edtaReti - 
 * @property {boolean} edtaBlutsenkung - 
 * @property {boolean} edtaDiffBlutbild - 
 * @property {boolean} citratQu - 
 * @property {boolean} citratQuMarcumar - 
 * @property {boolean} citratThrombin - 
 * @property {boolean} citratPTT - 
 * @property {boolean} citratFibri - 
 * @property {boolean} svbAlkPhos - 
 * @property {boolean} svbAmylase - 
 * @property {boolean} svbASL - 
 * @property {boolean} svbBiliD - 
 * @property {boolean} svbBiliG - 
 * @property {boolean} svbCalc - 
 * @property {boolean} svbCholesterin - 
 * @property {boolean} svbCholin - 
 * @property {boolean} svbCK - 
 * @property {boolean} svbCKMB - 
 * @property {boolean} svbCRP - 
 * @property {boolean} svbEisen - 
 * @property {boolean} svbEiwE - 
 * @property {boolean} svbEiwG - 
 * @property {boolean} svbGammaGT - 
 * @property {boolean} svbGlukose - 
 * @property {boolean} svbGOT - 
 * @property {boolean} svbGPT - 
 * @property {boolean} svbHarnsäure - 
 * @property {boolean} svbHarnstoff - 
 * @property {boolean} svbHBDH - 
 * @property {boolean} svbHDL - 
 * @property {boolean} svbLgA - 
 * @property {boolean} svbLgG - 
 * @property {boolean} svbLgM - 
 * @property {boolean} svbKali - 
 * @property {boolean} svbKrea - 
 * @property {boolean} svbKreaC - 
 * @property {boolean} svbLDH - 
 * @property {boolean} svbLDL - 
 * @property {boolean} svbLipase - 
 * @property {boolean} svbNatrium - 
 * @property {boolean} svbOPVorb - 
 * @property {boolean} svbPhos - 
 * @property {boolean} svbTransf - 
 * @property {boolean} svbTrigl - 
 * @property {boolean} svbTSHBasal - 
 * @property {boolean} svbTSHTRH - 
 * @property {boolean} glu1 - 
 * @property {boolean} glu2 - 
 * @property {boolean} glu3 - 
 * @property {boolean} glu4 - 
 * @property {boolean} urinStatus - 
 * @property {boolean} urinMikroalb - 
 * @property {boolean} urinSchwTest - 
 * @property {boolean} urinGlukose - 
 * @property {boolean} urinAmylase - 
 * @property {boolean} urinSediment - 
 * @property {boolean} sonstiges - 
 * @property {boolean} harnStreifenTest - 
 * @property {boolean} nuechternPlasmaGlukose - 
 * @property {boolean} lipidprofil - 
 * @property {Boolean} asvTeamReferral - 
 * @property {String} testDescriptions - 
 * @property {String} labText - 
 * @property {Object} labEntries - 
 * @property {Object} l_extra - 
 * @property {Object} l_version - 
 * @property {Date} labLogTimestamp - 
 * @property {boolean} belegarztBeh - 
 * @property {boolean} notfall - 
 * @property {boolean} unfall - 
 * @property {boolean} bvg - 
 * @property {boolean} notwendig - 
 * @property {Date} betreuungVon - 
 * @property {Date} betreuungBis - 
 * @property {Boolean} ambulantePsychotherapeutischeAkutbehandlung - 
 * @property {Boolean} ambulantePsychoTherapie - 
 * @property {Boolean} zeitnahErforderlich - 
 * @property {Boolean} analytischePsychotherapie - 
 * @property {Boolean} tiefenpsychologischFundiertePsychotherapie - 
 * @property {Boolean} verhaltenstherapie - 
 * @property {String} naehereAngabenZuDenEmpfehlungen - 
 * @property {Array.<module:activitySchema.medDataObj>} medData - 
 * @property {String} medDataType - 
 * @property {String} eTSArrangementCode - 
 * @property {String} eTSArrangementCodeRequestMessageId - 
 * @property {String} eTSAErrorMessage - 
 * @property {string} fk8401 - 
 * @property {Date} datumOP - 
 * @property {String} ueberwAn - 
 * @property {String} ueberwAnCodeSystem - 
 * @property {String} diagnosesText - 
 * @property {String} medicationsText - 
 * @property {String} findingsText - 
 * @property {String} urgency - 
 * @property {Array.<module:activitySchema.eTSAdditionalQualificationsObj>} eTSAdditionalQualifications - 
 * @property {String} auType - 
 * @property {boolean} erstBesch - 
 * @property {boolean} folgeBesc - 
 * @property {boolean} arbeitsunfall - 
 * @property {boolean} durchgangsarzt - 
 * @property {Date} auVon - 
 * @property {Date} auVorraussichtlichBis - 
 * @property {Date} festgestelltAm - 
 * @property {boolean} sonstigerUnf - 
 * @property {boolean} rehab - 
 * @property {boolean} reintegration - 
 * @property {String} massnahmen - 
 * @property {String} diagnosesAdd - 
 * @property {boolean} krankengeld - 
 * @property {boolean} endBesch - 
 * @property {String} dmpPulsStatus - 
 * @property {String} dmpSensitivityTesting - 
 * @property {String} dmpFootStatusText - 
 * @property {String} dmpFootStatusWagnerValue - 
 * @property {String} dmpFootStatusArmstrongValue - 
 * @property {Array.<String>} dmpFurtherRiskUlcus - 
 * @property {String} dmpUlkus - 
 * @property {String} dmpWoundInfection - 
 * @property {Number} dmpHbA1cValue - 
 * @property {String} dmpHbA1cUnit - 
 * @property {String} dmpPathoUrinAlbAus - 
 * @property {Array.<String>} dmpSequelae - 
 * @property {Array.<String>} dmpEvents - 
 * @property {Number} dmpEGFR - 
 * @property {Boolean} dmpEGFRNotDetermined - 
 * @property {String} dmpInjectionSites - 
 * @property {String} dmpIntervalFutureFootInspections - 
 * @property {Number} dmpHadHypoglycaemic - 
 * @property {Number} dmpHadStationaryTreatment - 
 * @property {Array.<String>} dmpTHIA - 
 * @property {Array.<String>} dmpRecommendedDmTrainings - 
 * @property {Array.<String>} dmpDmTrainingsBeforeSubscription - 
 * @property {String} dmpHbA1cTargetValue - 
 * @property {Array.<String>} dmpTreatmentAtDiabeticFootInstitution - 
 * @property {Array.<String>} dmpDiabetesRelatedHospitalization - 
 * @property {Array.<String>} dmpOpthRetinalExam - 
 * @property {Number} dmpHadHospitalStayHbA1c - 
 * @property {String} dmpInsulin - 
 * @property {Array.<String>} dmpGlibenclamide - 
 * @property {Array.<String>} dmpMetformin - 
 * @property {String} dmpOtherOralAntiDiabetic - 
 * @property {Boolean} dmpShowOptionalFields - 
 * @property {String} dmpRegistrationFor - 
 * @property {Date} dmpInitialManifestationOfPrimaryTumor - 
 * @property {Date} dmpManifestationOfContralateralBreastCancer - 
 * @property {Date} dmpLocoregionalRecurrence - 
 * @property {Date} dmpFirstConfirmationOfRemoteMetastases - 
 * @property {Array.<String>} dmpAffectedBreast - 
 * @property {String} dmpCurrentTreatmentStatus - 
 * @property {Array.<String>} dmpPerformedSurgicalTherapy - 
 * @property {Array.<String>} dmpPerformedSurgicalTherapy_4_23 - 
 * @property {String} dmpPreoperativeNeoadjuvantTherapy - 
 * @property {String} dmpTnmClassification_4_23 - 
 * @property {Array.<String>} dmpPT - 
 * @property {String} dmpPT_4_23 - 
 * @property {Array.<String>} dmpPN - 
 * @property {String} dmpPN_4_23 - 
 * @property {String} dmpM - 
 * @property {String} dmpM_4_23 - 
 * @property {String} dmpGrading - 
 * @property {Array.<String>} dmpResection - 
 * @property {String} dmpImmunohistochemicalHormoneReceptor - 
 * @property {String} dmpImmunohistochemicalHormoneReceptor_4_23 - 
 * @property {Array.<String>} dmpCurrentAdjuvantEndocrineTherapy_4_23 - 
 * @property {String} dmpSideEffectsOfCurrentAdjuvantEndocrineTherapy_4_23 - 
 * @property {String} dmpContinuationOfCurrentEndocrineTherapy_4_23 - 
 * @property {String} dmpDxaFindings_4_23 - 
 * @property {String} dmpHER2Neu - 
 * @property {String} dmpRadiotherapy - 
 * @property {String} dmpChemotherapy - 
 * @property {String} dmpEndocrineTherapy - 
 * @property {String} dmpAntibodyTherapy - 
 * @property {Array.<String>} dmpOngoingOrCompletedTherapy_locoregionalRecurrence - 
 * @property {Array.<String>} dmpLocalisation - 
 * @property {Array.<String>} dmpLocalisation_4_23 - 
 * @property {Array.<String>} dmpOngoingOrCompletedTherapy_remoteMetastases - 
 * @property {Array.<String>} dmpBisphosphonateTherapy - 
 * @property {Array.<String>} dmpDenosumab_4_23 - 
 * @property {String} dmpRegularPhysicalTrainingRecommended_4_23 - 
 * @property {Array.<String>} dmpConditionAfterParticularlyCardiotoxicTumorTherapy_4_23 - 
 * @property {String} dmpLymphedemaPresent - 
 * @property {String} dmpSymptomaticLymphedema_4_23 - 
 * @property {Date} dmpPlannedDateForNextDocumentation - 
 * @property {Array.<String>} dmpCurrentTreatmentStatus_following - 
 * @property {Array.<String>} dmpTherapyOfLocoregionalRecurrence - 
 * @property {Array.<String>} dmpTherapyOfRemoteMetastases - 
 * @property {Array.<String>} dmpBisphosphonateTherapy_following - 
 * @property {Date} dmpManifestationOfLocoregionalRecurrence_following_date - 
 * @property {Array.<String>} dmpManifestationOfLocoregionalRecurrence_following_text - 
 * @property {Date} dmpManifestationOfContralateralBreastCancer_following_date - 
 * @property {Array.<String>} dmpManifestationOfContralateralBreastCancer_following_text - 
 * @property {Date} dmpManifestationOfRemoteMetastases_following_date - 
 * @property {Array.<String>} dmpManifestationOfRemoteMetastases_following_text - 
 * @property {Array.<String>} dmpManifestationOfRemoteMetastases_following_text_4_23 - 
 * @property {String} dmpBiopticConfirmationOfVisceralMetastases_4_23 - 
 * @property {String} dmpLymphedema_following - 
 * @property {String} dmpAge - 
 * @property {Date} dmpExaminationDate - 
 * @property {String} dmpHearingAidFirstMedication - 
 * @property {Date} dmpFirstMedicationDate - 
 * @property {Array.<String>} dmpHearingAidType - 
 * @property {String} dmpHearingAidTypeOther - 
 * @property {String} dmpSpeechDevelopmentDisturbance - 
 * @property {String} dmpSpeechDevelopmentDisturbanceOther - 
 * @property {String} dmpCentralAuditoryDefectExcluded - 
 * @property {String} dmpSpeakingTestPossible - 
 * @property {Number} dmpSpeechComprehensionDB - 
 * @property {Number} dmpSpeechComprehensionEZ - 
 * @property {Number} dmpSpeechComprehensionSVS - 
 * @property {Array.<String>} dmpSpeechComprehensionMaterial - 
 * @property {String} dmpSpeechComprehensionMaterialOther - 
 * @property {Array.<String>} dmpNoiseReceptionAmblyacousia - 
 * @property {Array.<String>} dmpNoiseFlowAmblyacousia - 
 * @property {Array.<String>} dmpCombinedAmblyacousia - 
 * @property {String} dmpAmblyacousiaSeverityLeft - 
 * @property {String} dmpAmblyacousiaSeverityRight - 
 * @property {String} dmpAmblyacousiaSeverityChildLeft - 
 * @property {String} dmpAmblyacousiaSeverityChildRight - 
 * @property {Array.<String>} dmpAmblyacousiaSeverityWHO - 
 * @property {Array.<String>} dmpFurtherDiagnosis - 
 * @property {String} dmpFurtherDiagnosisOther - 
 * @property {Array.<String>} dmpAirLine - 
 * @property {String} dmpAirLineOther - 
 * @property {Array.<String>} dmpBoneLine - 
 * @property {Array.<String>} dmpSpecialMedication - 
 * @property {String} dmpSpecialMedicationOther - 
 * @property {Date} dmpExaminationDate_following - 
 * @property {String} dmpMedicationConform - 
 * @property {Array.<String>} dmpAirLineAnomaly - 
 * @property {String} dmpAirLineAnomalyOther - 
 * @property {Array.<String>} dmpBoneLineAnomaly - 
 * @property {Array.<String>} dmpSpecialMedicationAnomaly - 
 * @property {String} dmpSpecialMedicationAnomalyOther - 
 * @property {String} dmpSpeakingTestPossible_following - 
 * @property {Number} dmpSpeechComprehensionFreeFieldEZ - 
 * @property {Number} dmpSpeechComprehensionFreeFieldSVS - 
 * @property {Number} dmpListeningRangeWithoutHG - 
 * @property {Number} dmpListeningRangeWithHG - 
 * @property {Number} dmpAdvantageWithHG - 
 * @property {String} dmpMedicationForFixedAmount - 
 * @property {String} dmpHearingAidSuccessDetectable - 
 * @property {Array.<String>} dmpHearingAidSuccessMeasurementThrough - 
 * @property {String} dmpMedicationForFree - 
 * @property {Array.<String>} dmpCooperation - 
 * @property {String} dmpPhysicianName - 
 * @property {String} dmpPhysicianCommercialNumber - 
 * @property {Boolean} dmpPrimaryFinding - 
 * @property {String} dmpZytologicalFinding - 
 * @property {String} dmpZytologicalFindingSelection - 
 * @property {Boolean} dmpHistologicalClarification - 
 * @property {String} dmpHistologicalClarificationSelection - 
 * @property {String} dmpMedicalPracticeSpecialty - 
 * @property {String} dmpAnginaPectoris - 
 * @property {String} dmpSerumElectrolytes - 
 * @property {Number} dmpLdlCholesterolValue - 
 * @property {String} dmpLdlCholesterolUnit - 
 * @property {Boolean} dmpLdlCholesterolNotDetermined - 
 * @property {Array.<String>} dmpKhkRelevantEvents - 
 * @property {Array.<String>} dmpDiagnosticCoronaryTherapeuticIntervention - 
 * @property {Number} dmpHadStationaryKhkTreatment - 
 * @property {String} dmpKhkOtherMedication - 
 * @property {Array.<String>} dmpRecommendedKhkTrainings - 
 * @property {String} dmpKhkRelatedTransferArranged - 
 * @property {String} dmpKhkRelatedConfinementArranged - 
 * @property {Array.<String>} dmpRegularWeightControlRecommended - 
 * @property {String} dmpFrequencyOfAsthmaSymptoms - 
 * @property {String} dmpFrequencyOfAsthmaSymptoms_4_44 - 
 * @property {String} dmpFrequencyOfUseOfNeedMedication_4_44 - 
 * @property {String} dmpLimitationOfEverydayActivitiesDueToBronchialAsthma_4_44 - 
 * @property {String} dmpAsthmaRelatedNightSleepDisorder_4_44 - 
 * @property {Number} dmpCurrentPeakFlowValue - 
 * @property {Boolean} dmpCurrentPeakFlowValueNotDone - 
 * @property {Number} dmpCurrentFEV1Value_4_44 - 
 * @property {Boolean} dmpCurrentFEV1ValueNotDone_4_44 - 
 * @property {Number} dmpHadStationaryAsthmaTreatment - 
 * @property {Number} dmpHadUnplannedAsthmaTreatment_4_44 - 
 * @property {Array.<String>} dmpInhaledGlucocorticosteroids - 
 * @property {Array.<String>} dmpInhaledLongActingBeta2AdrenergicAgonist - 
 * @property {Array.<String>} dmpInhaledRapidActingBeta2AdrenergicAgonist - 
 * @property {Array.<String>} dmpSystemicGlucocorticosteroids - 
 * @property {Array.<String>} dmpOtherAsthmaSpecificMedication - 
 * @property {Array.<String>} dmpRecommendedAsthmaTrainings - 
 * @property {Array.<String>} dmpAsthmaTrainingAlreadyDoneBeforeDMP_4_44 - 
 * @property {String} dmpPerceivedAsthmaTraining - 
 * @property {String} dmpWrittenSelfManagementPlan - 
 * @property {Array.<String>} dmpTherapyAdjustment_4_44 - 
 * @property {String} dmpAsthmaRelatedTransferOrConfinementArranged - 
 * @property {Number} dmpCurrentFev1 - 
 * @property {Boolean} dmpCurrentFev1NotDone - 
 * @property {Array.<String>} dmpClinicalAssessmentOfOsteoporosisRisk - 
 * @property {Number} dmpFrequencyExacerbationsSinceLast - 
 * @property {Number} dmpHadStationaryCopdTreatment - 
 * @property {Array.<String>} dmpShortActingBeta2AdrenergicAgonistAnticholinergics - 
 * @property {Array.<String>} dmpLongActingBeta2AdrenergicAgonist - 
 * @property {Array.<String>} dmpLongActingAnticholinergics - 
 * @property {Array.<String>} dmpOtherDiseaseSpecificMedication - 
 * @property {Array.<String>} dmpRecommendedCopdTrainings - 
 * @property {Array.<String>} dmpAttendedTrainingBeforeSubscription - 
 * @property {String} dmpPerceivedCopdTraining - 
 * @property {String} dmpCopdRelatedTransferOrConfinementArranged - 
 * @property {String} dmpRecommendedTobaccoAbstinence - 
 * @property {String} dmpRecommendedTobaccoRehabProgram - 
 * @property {String} dmpAttendedTobaccoRehabProgramSinceLastRecommendation - 
 * @property {String} dmpRecommendedPhysicalTraining - 
 * @property {Date} dmpHeadDate - 
 * @property {Date} dmpSignatureDate - 
 * @property {String} dmpScheinRef - 
 * @property {Number} dmpQuarter - 
 * @property {Number} dmpYear - 
 * @property {Number} dmpDocVersion - 
 * @property {String} dmpType - 
 * @property {Boolean} dmpCreatedInRepresentation - 
 * @property {Boolean} dmpPhsicianChanged - 
 * @property {Boolean} dmpModuleHeartInsufficiency - 
 * @property {String} dmpSmoker - 
 * @property {String} dmpGender - 
 * @property {Number} dmpHeight - 
 * @property {Number} dmpWeight - 
 * @property {Number} dmpBloodPressureSystolic - 
 * @property {Number} dmpBloodPressureDiastolic - 
 * @property {Array.<String>} dmpConcomitantDisease - 
 * @property {Array.<String>} dmpPatientWantsInfos - 
 * @property {String} dmpDocumentationInterval - 
 * @property {Array.<String>} dmpAntiplatelet - 
 * @property {Array.<String>} dmpBetaBlocker - 
 * @property {Array.<String>} dmpACE - 
 * @property {Array.<String>} dmpHMG - 
 * @property {String} dmpCheckedInhalationTechnique - 
 * @property {String} dmpPerceivedDiabetesTraining - 
 * @property {String} dmpPerceivedHypertensionTraining - 
 * @property {String} dmpPrintStatus - 
 * @property {Boolean} dmpNeedsMergeAcknowledgment - 
 * @property {String} dmpDocSetId - 
 * @property {Array.<String>} hksSuspectedDiagnosisND - 
 * @property {Array.<String>} hksMalignesMelanom - 
 * @property {Array.<String>} hksBasalzellkarzinom - 
 * @property {Array.<String>} hksSpinozelluläresKarzinom - 
 * @property {Array.<String>} hksOtherSkinCancer - 
 * @property {Array.<String>} hksOtherDermatologicalClarificationFindings - 
 * @property {Array.<String>} hksScreeningParticipantIsReferredToDermatologistTransferred - 
 * @property {Array.<String>} hksHealthExaminationAtSameTime - 
 * @property {Array.<String>} hksHasReferral - 
 * @property {Array.<String>} hksReferralPhysicianPerformedHKS - 
 * @property {Array.<String>} hksHasSuspectedDiag - 
 * @property {Array.<String>} hksSuspectedDiagnosisD - 
 * @property {Array.<String>} hksMalignesMelanomDermatologists - 
 * @property {Array.<String>} hksBasalzellkarzinomDermatologists - 
 * @property {Array.<String>} hksSpinozelluläresKarzinomDermatologists - 
 * @property {Array.<String>} hksOtherSkinCancerD - 
 * @property {Array.<String>} hksOthersWithBiopsyInNeedOfClarificationFindings - 
 * @property {Array.<String>} hksBiopsieOrExzision - 
 * @property {Number} hksNumberOfBiopsiesTaken - 
 * @property {Array.<String>} hksOtherwiseInitiatedOrInitiatedTherapyOrDiagnostics - 
 * @property {Array.<String>} hksCurrentlyNoFurtherTherapyOrDiagnostics - 
 * @property {Array.<String>} hksMalignesMelanomHistopathologie - 
 * @property {Array.<String>} hksMalignesMelanomClassification - 
 * @property {Array.<String>} hksMalignesMelanomTumorThickness - 
 * @property {Array.<String>} hksBasalzellkarzinomHistopathologie - 
 * @property {String} hksBasalzellkarzinomHorizontalTumorDiameterClinical - 
 * @property {String} hksBasalzellkarzinomVerticalTumorDiameterHistological - 
 * @property {Array.<String>} hksSpinozelluläresKarzinomHistopathologie - 
 * @property {Array.<String>} hksSpinozelluläresKarzinomClassification - 
 * @property {Array.<String>} hksSpinozelluläresKarzinomGrading - 
 * @property {Array.<String>} hksOtherSkinCancerHistopathologie - 
 * @property {Array.<String>} hksAtypicalNevusCellNevus - 
 * @property {Array.<String>} hksJunctionalCompoundDermalAtypicalNevusCellNevus - 
 * @property {Array.<String>} hksActinicKeratosis - 
 * @property {Array.<String>} hksOtherSkinChangeNotRelevantHere - 
 * @property {String} hasAdditionalContract - 
 * @property {Object} dmpErrors - 
 * @property {Object} dmpDeliveryInfo - 
 * @property {Object} dmpAddressee - 
 * @property {String} dmpDeliveryRef - 
 * @property {Date} dmpSentDate - 
 * @property {String} dmpFileId - 
 * @property {String} assDescription - 
 * @property {String} assManufacturer - 
 * @property {String} assCharacteristics - 
 * @property {Date} assDateAdded - 
 * @property {Date} assDateChanged - 
 * @property {String} assDose - 
 * @property {String} assPrescPeriod - 
 * @property {String} assId - 
 * @property {String} assManArticleId - 
 * @property {Number} assPrice - 
 * @property {Number} assVat - 
 * @property {String} studyId - 
 * @property {Object} g_extra - 
 * @property {Boolean} behandlungGemaess - 
 * @property {Date} abnDatumZeit - 
 * @property {String} auftrag - 
 * @property {Number} amount - 
 * @property {String} receiptNo - 
 * @property {String} paymentMethod - 
 * @property {String} invoiceText - 
 * @property {String} cashbook - 
 * @property {String} cashbookId - 
 * @property {String} incashNo - 
 * @property {String} severity - 
 * @property {Array.<module:activitySchema.linkedTreatmentsObj>} linkedTreatments - 
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
 * @property {Array.<String>} medicationPlanCarrierSegments - 
 * @property {String} pvslogId - 
 * @property {String} invoiceentryId - 
 * @property {String} kbvlogId - 
 * @property {String} invoiceRefNo - 
 * @property {String} kvglogId - 
 * @property {Boolean} medidataRejected - 
 * @property {String} module - 
 * @property {String} programmzk - 
 * @property {String} kasseiknr - 
 * @property {String} versichertenstatusgkv - 
 * @property {String} versichertenidneu - 
 * @property {String} bsnrambulant - 
 * @property {String} nbsnrambulant - 
 * @property {String} lanr - 
 * @property {String} idnrpat - 
 * @property {Date} gebdatum - 
 * @property {Date} datumunt - 
 * @property {String} zytbefundvorunt - 
 * @property {String} zytbefundvorunt01 - 
 * @property {String} zytbefundvoruntii - 
 * @property {String} zytbefundvoruntiii - 
 * @property {String} zytbefundvoruntiiid - 
 * @property {String} zytbefundvoruntiv - 
 * @property {String} zytbefundvoruntv - 
 * @property {String} hpvtvoruntvorhand - 
 * @property {String} hpvtvorbefund - 
 * @property {String} hpvvirustypvorbefund - 
 * @property {String} zervixeinstellbar - 
 * @property {String} kolposkbefund - 
 * @property {String} pzgsichtbar - 
 * @property {String} tztyp - 
 * @property {String} normalbefund - 
 * @property {String} gradabnbefunde - 
 * @property {String} verdachtais - 
 * @property {String} lokalabnbefunde - 
 * @property {String} groesselaesion - 
 * @property {String} verdachtinvasion - 
 * @property {String} weiterebefunde - 
 * @property {String} kongenanomalie - 
 * @property {String} kondylome - 
 * @property {String} endometriose - 
 * @property {String} ektoendopolypen - 
 * @property {String} entzuendung - 
 * @property {String} stenose - 
 * @property {String} postopveraend - 
 * @property {String} sonstweitbefunde - 
 * @property {String} sonstbefunde - 
 * @property {String} sonstbef - 
 * @property {String} anzahlbiopsien - 
 * @property {String} befundbiopskueret - 
 * @property {String} histobef - 
 * @property {String} metaplasievorgaenge - 
 * @property {String} adenocarcinomainsitu - 
 * @property {String} invasivplattenepithelkarz - 
 * @property {String} invasivadenokarz - 
 * @property {String} sonstmetaplasiebefunde - 
 * @property {String} sonstbefbiopskueret - 
 * @property {String} empfohlenemassnahmebiops - 
 * @property {String} empfohlenekontrabkl - 
 * @property {String} zeithorizontkontrabkl - 
 * @property {String} zeithorizont - 
 * @property {String} therapieempfehlung - 
 * @property {String} op - 
 * @property {String} opeingriff - 
 * @property {String} sonstopeingr - 
 * @property {String} weiteretherapieempf - 
 * @property {Date} opdatum - 
 * @property {String} artopeingriff - 
 * @property {String} methokonisation - 
 * @property {String} tiefekonus - 
 * @property {String} methoexzision - 
 * @property {String} umfangexzision - 
 * @property {String} sonstopeingr2 - 
 * @property {String} endhistolbefundvorh - 
 * @property {String} grading - 
 * @property {String} stagingfigo - 
 * @property {String} residualstatus - 
 * @property {String} tnmpt - 
 * @property {String} tnmpn - 
 * @property {String} tnmpm - 
 * @property {String} untersuchungsnummer - 
 * @property {String} untersuchung - 
 * @property {String} pznvorhanden - 
 * @property {String} pzn - 
 * @property {String} produkt - 
 * @property {String} hpvtergebnis - 
 * @property {String} hpvvirustyp - 
 * @property {String} welchhpvtyp - 
 * @property {String} plz3stellig - 
 * @property {String} hpvimpfung - 
 * @property {String} herkunftimpfstatus - 
 * @property {String} artuanlunt - 
 * @property {String} befundevoruntvorh - 
 * @property {String} herkunftergebvoru - 
 * @property {String} voruntdatum - 
 * @property {String} zytbefundvoruntvorh - 
 * @property {String} karzinomtyp - 
 * @property {String} karzinomtyp2 - 
 * @property {String} anamabweichvorunt - 
 * @property {String} ausflusspathblutung - 
 * @property {String} iup - 
 * @property {String} hormonanwendungen - 
 * @property {String} gynopradiatio - 
 * @property {String} graviditaet - 
 * @property {String} klinischerbefund - 
 * @property {String} zytbefund - 
 * @property {String} zytbefund01 - 
 * @property {String} zytbefundii - 
 * @property {String} zytbefundiii - 
 * @property {String} zytbefundiiid - 
 * @property {String} zytbefundiv - 
 * @property {String} zytbefundv - 
 * @property {String} hpvtest - 
 * @property {String} histologvorbefundvorunt - 
 * @property {String} empfohlenemassnahme - 
 * @property {String} methoabstrentnahme - 
 * @property {Boolean} onHold - 
 * @property {String} onHoldNotes - 
 * @property {String} statusBeforeHold - 
 */