/**
 * @module flowSchema
 */

/**
 * @typedef {Object} module:flowSchema.sinksObj
 * @property {String} resourceType - 
 * @property {String} name - 
 * @property {String} __polytype - 
 * @property {String} serialPath - 
 * @property {String} fileType - 
 * @property {String} filePath - 
 * @property {Boolean} overwriteFile - 
 * @property {Boolean} noFile - 
 * @property {String} smbShare - 
 * @property {String} smbUser - 
 * @property {String} smbPw - 
 * @property {String} filter - 
 * @property {Boolean} executeApp - 
 * @property {String} executeClient - 
 * @property {String} executePath - 
 * @property {String} executeArgs - 
 * @property {Array.<String>} deviceServers - 
 * @property {Boolean} triggerManually - 
 * @property {Boolean} keepFiles - 
 * @property {String} collectionName - 
 * @property {String} apiMethod - 
 * @property {String} incomingFileDirPath - 
 * @property {String} outgoingFileDirPath - 
 * @property {String} eventName - 
 */


/**
 * @typedef {Object} module:flowSchema.mappingTmpFileRowsObj
 * @property {Number} rowNumber - 
 * @property {String} label - 
 */


/**
 * @typedef {Object} module:flowSchema.internalExternalLabTreatmentsObj
 * @property {String} labName - 
 * @property {String} type - 
 */


/**
 * @typedef {Object} module:flowSchema.gdtMappingsForUnknownFieldsObj
 * @property {String} gdtFieldNumber - 
 * @property {String} gdtMappingRegexString - 
 * @property {String} gdtMappingAction - 
 */


/**
 * @typedef {Object} module:flowSchema.transformersObj
 * @property {String} transformerType - 
 * @property {String} name - 
 * @property {Boolean} softValidation - 
 * @property {String} gdtVersion - 
 * @property {Boolean} mapSubtype - 
 * @property {String} subtypeToMap - 
 * @property {Boolean} deleteAttachments - 
 * @property {Boolean} forceCreateNewActivity - 
 * @property {Array.<module:flowSchema.gdtMappingsForUnknownFieldsObj>} gdtMappingsForUnknownFields - 
 * @property {Boolean} gdtUseLastChangedActivity - 
 * @property {Boolean} showOriginalId - 
 * @property {String} gdtEncoding - 
 * @property {String} gdtSender - 
 * @property {String} gdtReceiver - 
 * @property {String} procedure - 
 * @property {Boolean} exportMedData - 
 * @property {Boolean} exportDiagnosis - 
 * @property {Boolean} mapBSNR - 
 * @property {String} mapBSNRTo - 
 * @property {Boolean} mapCaseFolderId - 
 * @property {String} mapCaseFolderIdTo - 
 * @property {Boolean} mapEmployeeId - 
 * @property {String} mapEmployeeIdTo - 
 * @property {Boolean} mapResponsibleDoctor - 
 * @property {String} mapResponsibleDoctorTo - 
 * @property {Boolean} mapPatientLocationAddon - 
 * @property {String} mapPatientLocationAddonTo - 
 * @property {Number} hours - 
 * @property {String} subType - 
 * @property {String} fileNameMap - 
 * @property {Boolean} checkFileWithLdkPm - 
 * @property {Boolean} timeRange - 
 * @property {String} timeRangeDays - 
 * @property {Boolean} useAddInfoForId - 
 * @property {String} useAddInfoForIdFK - 
 * @property {Boolean} billingFlag - 
 * @property {Boolean} disallowGkvBilling - 
 * @property {Boolean} allowGkvBilling - 
 * @property {Boolean} useDataFromLabrequestIfPresent - 
 * @property {String} specialMatchSource - 
 * @property {String} specialMatchActivityField - 
 * @property {String} specialMatchDays - 
 * @property {String} specialMatchActivityType - 
 * @property {String} ldtVersion - 
 * @property {String} treatmentType - 
 * @property {Boolean} treatmentTypeSel - 
 * @property {String} treatmentTypeFK - 
 * @property {Boolean} patientHeightInCm - 
 * @property {String} patientHeightInCmFK - 
 * @property {Boolean} patientWeightInKg - 
 * @property {String} patientWeightInKgFK - 
 * @property {Boolean} patientPregnancy - 
 * @property {String} patientPregnancyFK - 
 * @property {Boolean} patientPregnancyGestationLength - 
 * @property {String} patientPregnancyGestationLengthFK - 
 * @property {Boolean} diagnosisSuspected - 
 * @property {String} diagnosisSuspectedFK - 
 * @property {Boolean} ICDCode - 
 * @property {String} ICDCodeFK - 
 * @property {Boolean} diagnosisCertainty - 
 * @property {String} diagnosisCertaintyFK - 
 * @property {Boolean} diagnosisLoc - 
 * @property {String} diagnosisLocFK - 
 * @property {Boolean} diagnosisDesc - 
 * @property {String} diagnosisDescFK - 
 * @property {Boolean} diagnosisExceptionDesc - 
 * @property {String} diagnosisExceptionDescFK - 
 * @property {Boolean} initiatorBSNR - 
 * @property {String} initiatorBSNRFK - 
 * @property {Boolean} initiatorLANR - 
 * @property {String} initiatorLANRFK - 
 * @property {Boolean} refBSNR - 
 * @property {String} refBSNRFK - 
 * @property {String} selectedRefBSNR - 
 * @property {Boolean} refLANR - 
 * @property {String} refLANRFK - 
 * @property {String} selectedRefLANR - 
 * @property {String} modality - 
 * @property {Boolean} hl7CreateTreatments - 
 * @property {Array.<module:flowSchema.internalExternalLabTreatmentsObj>} internalExternalLabTreatments - 
 * @property {Array.<module:flowSchema.mappingTmpFileRowsObj>} mappingTmpFileRows - 
 * @property {String} tmpFileType - 
 * @property {String} tmpFileTypeDescription - 
 */


/**
 * @typedef {Object} module:flowSchema.sourcesObj
 * @property {String} resourceType - 
 * @property {String} name - 
 * @property {String} __polytype - 
 * @property {String} serialPath - 
 * @property {String} fileType - 
 * @property {String} filePath - 
 * @property {Boolean} overwriteFile - 
 * @property {Boolean} noFile - 
 * @property {String} smbShare - 
 * @property {String} smbUser - 
 * @property {String} smbPw - 
 * @property {String} filter - 
 * @property {Boolean} executeApp - 
 * @property {String} executeClient - 
 * @property {String} executePath - 
 * @property {String} executeArgs - 
 * @property {Array.<String>} deviceServers - 
 * @property {Boolean} triggerManually - 
 * @property {Boolean} keepFiles - 
 * @property {String} collectionName - 
 * @property {String} apiMethod - 
 * @property {String} incomingFileDirPath - 
 * @property {String} outgoingFileDirPath - 
 * @property {String} eventName - 
 */


/**
 * @typedef {Object} module:flowSchema.flow
 * @property {String} title - 
 * @property {String} flowType - 
 * @property {Array.<module:flowSchema.sourcesObj>} sources - 
 * @property {Array.<module:flowSchema.transformersObj>} transformers - 
 * @property {Array.<module:flowSchema.sinksObj>} sinks - 
 */