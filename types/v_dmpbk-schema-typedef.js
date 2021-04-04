/**
 * @module v_dmpbkSchema
 */

/**
 * @typedef {Object} module:v_dmpbkSchema.editorObj
 * @property {String} name - 
 * @property {String} employeeNo - 
 * @property {String} initials - 
 */


/**
 * @typedef {Object} module:v_dmpbkSchema.attachedMediaObj
 * @property {String} mediaId - 
 * @property {String} contentType - 
 * @property {String} caption - 
 * @property {String} title - 
 * @property {String} malwareWarning - 
 */


/**
 * @typedef {Object} module:v_dmpbkSchema.v_dmpbk
 * @property {String} actType - 
 * @property {string} status - 
 * @property {Array.<String>} attachments - 
 * @property {Array.<module:v_dmpbkSchema.attachedMediaObj>} attachedMedia - 
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
 * @property {Array.<module:v_dmpbkSchema.editorObj>} editor - 
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