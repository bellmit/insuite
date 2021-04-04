/**
 * @module v_dmpcopdSchema
 */

/**
 * @typedef {Object} module:v_dmpcopdSchema.editorObj
 * @property {String} name - 
 * @property {String} employeeNo - 
 * @property {String} initials - 
 */


/**
 * @typedef {Object} module:v_dmpcopdSchema.attachedMediaObj
 * @property {String} mediaId - 
 * @property {String} contentType - 
 * @property {String} caption - 
 * @property {String} title - 
 * @property {String} malwareWarning - 
 */


/**
 * @typedef {Object} module:v_dmpcopdSchema.v_dmpcopd
 * @property {String} actType - 
 * @property {string} status - 
 * @property {Array.<String>} attachments - 
 * @property {Array.<module:v_dmpcopdSchema.attachedMediaObj>} attachedMedia - 
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
 * @property {Array.<module:v_dmpcopdSchema.editorObj>} editor - 
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
 */