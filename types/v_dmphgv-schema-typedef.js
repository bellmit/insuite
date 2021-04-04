/**
 * @module v_dmphgvSchema
 */

/**
 * @typedef {Object} module:v_dmphgvSchema.editorObj
 * @property {String} name - 
 * @property {String} employeeNo - 
 * @property {String} initials - 
 */


/**
 * @typedef {Object} module:v_dmphgvSchema.attachedMediaObj
 * @property {String} mediaId - 
 * @property {String} contentType - 
 * @property {String} caption - 
 * @property {String} title - 
 * @property {String} malwareWarning - 
 */


/**
 * @typedef {Object} module:v_dmphgvSchema.v_dmphgv
 * @property {String} actType - 
 * @property {string} status - 
 * @property {Array.<String>} attachments - 
 * @property {Array.<module:v_dmphgvSchema.attachedMediaObj>} attachedMedia - 
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
 * @property {Array.<module:v_dmphgvSchema.editorObj>} editor - 
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
 * @property {Object} dmpErrors - 
 * @property {Object} dmpDeliveryInfo - 
 * @property {Object} dmpAddressee - 
 * @property {String} dmpDeliveryRef - 
 * @property {Date} dmpSentDate - 
 * @property {String} dmpFileId - 
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
 */