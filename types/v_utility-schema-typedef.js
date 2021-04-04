/**
 * @module v_utilitySchema
 */

/**
 * @typedef {Object} module:v_utilitySchema.utRemedy2ListObj
 * @property {String} name - 
 * @property {String} type - 
 * @property {Boolean} groupTherapyAble - 
 * @property {Number} seasons - 
 * @property {Number} price - 
 */


/**
 * @typedef {Object} module:v_utilitySchema.utRemedy1ListObj
 * @property {String} name - 
 * @property {String} type - 
 * @property {Boolean} groupTherapyAble - 
 * @property {Number} seasons - 
 * @property {Number} price - 
 */


/**
 * @typedef {Object} module:v_utilitySchema.utAgreementApprovedForInsuranceObj
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
 * @typedef {Object} module:v_utilitySchema.editorObj
 * @property {String} name - 
 * @property {String} employeeNo - 
 * @property {String} initials - 
 */


/**
 * @typedef {Object} module:v_utilitySchema.attachedMediaObj
 * @property {String} mediaId - 
 * @property {String} contentType - 
 * @property {String} caption - 
 * @property {String} title - 
 * @property {String} malwareWarning - 
 */


/**
 * @typedef {Object} module:v_utilitySchema.v_utility
 * @property {String} actType - 
 * @property {String} catalogShort - 
 * @property {String} subType - 
 * @property {Array.<String>} attachments - 
 * @property {Array.<module:v_utilitySchema.attachedMediaObj>} attachedMedia - 
 * @property {Array.<String>} attachedMediaTags - 
 * @property {String} pressButton - 
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
 * @property {Array.<module:v_utilitySchema.editorObj>} editor - 
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
 * @property {Boolean} utUnfall - 
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
 * @property {Array.<module:v_utilitySchema.utAgreementApprovedForInsuranceObj>} utAgreementApprovedForInsurance - 
 * @property {String} utAgreementApprovedText - 
 * @property {String} utAgreementApprovedCode - 
 * @property {Boolean} utAgreementApprovedCodeUseDiagnosisGroup - 
 * @property {Array.<module:v_utilitySchema.utRemedy1ListObj>} utRemedy1List - 
 * @property {Array.<module:v_utilitySchema.utRemedy2ListObj>} utRemedy2List - 
 * @property {Date} utAcuteEvent - 
 * @property {String} restTicketNumber - 
 * @property {Array.<String>} icds - 
 * @property {Array.<String>} icdsExtra - 
 * @property {boolean} catalog - 
 * @property {String} catalogRef - 
 * @property {String} code - 
 * @property {String} forInsuranceType - 
 * @property {boolean} modifyHomeCat - 
 * @property {boolean} deleteEntryHomeCat - 
 */