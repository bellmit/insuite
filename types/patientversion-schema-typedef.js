/**
 * @module patientversionSchema
 */

/**
 * @typedef {Object} module:patientversionSchema.latestLabDataObj
 * @property {String} labTestResultText - 
 * @property {String} labResultDisplay - 
 * @property {String} labHead - 
 * @property {Date} labReqReceived - 
 * @property {String} labTestNotes - 
 * @property {String} labTestLabel - 
 * @property {String} labFullText - 
 * @property {String} limitIndicator - 
 * @property {Boolean} isPathological - 
 * @property {Number} previousVersions - 
 * @property {Number} labMin - 
 * @property {Number} labMax - 
 * @property {Number} labTestResultVal - 
 * @property {String} labTestResultUnit - 
 * @property {String} labNormalText - 
 */


/**
 * @typedef {Object} module:patientversionSchema.latestMedDataObj
 * @property {String} category - 
 * @property {String} type - 
 * @property {Number} value - 
 * @property {String} textValue - 
 * @property {String} unit - 
 * @property {Date} measurementDate - 
 * @property {String} activityId - 
 * @property {object} additionalData - 
 * @property {Number} cchKey - 
 * @property {Date} dateValue - 
 * @property {Boolean} boolValue - 
 */


/**
 * @typedef {Object} module:patientversionSchema.crmTreatmentsObj
 * @property {String} title - 
 * @property {Number} price - 
 * @property {String} probability - 
 */


/**
 * @typedef {Object} module:patientversionSchema.patientTransferObj
 * @property {string} eTAN - 
 * @property {string} targetCustNo - 
 * @property {string} activityIds - 
 * @property {Date} date - 
 */


/**
 * @typedef {Object} module:patientversionSchema.partnerIdsObj
 * @property {String} partnerId - 
 * @property {String} patientId - 
 * @property {String} patientNotes - 
 * @property {String} insuranceType - 
 * @property {String} careType - 
 * @property {String} selectedType - 
 * @property {String} extra - 
 * @property {Boolean} isDisabled - 
 * @property {Array.<String>} asvTeamNumbers - 
 * @property {String} licenseModifier - 
 */


/**
 * @typedef {Object} module:patientversionSchema.devicesObj
 * @property {String} key - 
 * @property {String} browser - 
 * @property {Date} timestamp - 
 */


/**
 * @typedef {Object} module:patientversionSchema.imagesObj
 * @property {String} name - 
 * @property {String} descr - 
 * @property {String} source - 
 * @property {String} origFilename - 
 * @property {string} mime - 
 * @property {String} ownerCollection - 
 * @property {String} ownerId - 
 * @property {String} label - 
 * @property {String} transform - 
 * @property {Number} weight - 
 * @property {Number} widthPx - 
 * @property {Number} heightPx - 
 * @property {String} deleteAfter - 
 * @property {string} docType - 
 * @property {boolean} gridfs - 
 * @property {boolean} binary - 
 * @property {Number} filesize - 
 * @property {Date} lastChanged - 
 * @property {string} malwareWarning - 
 * @property {boolean} malwareFalsePositive - 
 */


/**
 * @typedef {Object} module:patientversionSchema.affiliatesObj
 * @property {String} relType - 
 * @property {String} relByLaw - 
 * @property {String} affiliate - 
 */


/**
 * @typedef {Object} module:patientversionSchema.insuranceStatusObj
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
 * @typedef {Object} module:patientversionSchema.addressesObj
 * @property {String} street - 
 * @property {String} houseno - 
 * @property {String} zip - 
 * @property {String} city - 
 * @property {String} postbox - 
 * @property {String} kind - 
 * @property {String} country - 
 * @property {String} countryCode - 
 * @property {String} receiver - 
 * @property {String} payerType - 
 * @property {String} addon - 
 * @property {String} talk - 
 * @property {String} title - 
 * @property {String} firstname - 
 * @property {String} nameaffix - 
 * @property {String} middlename - 
 * @property {String} lastname - 
 * @property {String} cantonCode - 
 */


/**
 * @typedef {Object} module:patientversionSchema.communicationsObj
 * @property {String} type - 
 * @property {Boolean} preferred - 
 * @property {String} value - 
 * @property {String} note - 
 * @property {Boolean} signaling - 
 * @property {Boolean} confirmed - 
 * @property {Boolean} confirmNeeded - 
 */


/**
 * @typedef {Object} module:patientversionSchema.accountsObj
 * @property {String} cardType - 
 * @property {String} bankName - 
 * @property {Number} trial - 
 * @property {String} bankIBAN - 
 * @property {String} bankBIC - 
 * @property {String} accountOwner - 
 * @property {String} cardNo - 
 * @property {String} cardCheckCode - 
 * @property {Number} cardValidToMonth - 
 * @property {Number} cardValidToYear - 
 * @property {Boolean} debitAllowed - 
 * @property {Boolean} isOptional - 
 */


/**
 * @typedef {Object} module:patientversionSchema.patientversion
 * @property {String} prcCustomerNo - 
 * @property {String} prcCoName - 
 * @property {String} mirrorPatientId - 
 * @property {Array.<String>} additionalMirrorPatientIds - 
 * @property {String} title - 
 * @property {String} firstname - 
 * @property {String} nameaffix - 
 * @property {String} middlename - 
 * @property {String} fk3120 - 
 * @property {String} lastname - 
 * @property {String} civilStatus - 
 * @property {String} comment - 
 * @property {String} lang - 
 * @property {String} jobTitle - 
 * @property {String} jobStatus - 
 * @property {Boolean} isPensioner - 
 * @property {String} workingAt - 
 * @property {String} preferLanguage - 
 * @property {String} workingAtRef - 
 * @property {Array.<module:patientversionSchema.accountsObj>} accounts - 
 * @property {Boolean} activeState - 
 * @property {Array.<module:patientversionSchema.communicationsObj>} communications - 
 * @property {Array.<module:patientversionSchema.addressesObj>} addresses - 
 * @property {String} kbvDob - 
 * @property {Array.<module:patientversionSchema.insuranceStatusObj>} insuranceStatus - 
 * @property {Boolean} dataTransmissionToPVSApproved - 
 * @property {String} GDPRFormApprovedVersion - 
 * @property {String} medicalConfidentialityReleaseFormApprovedVersion - 
 * @property {Boolean} dataTransmissionToMediportApproved - 
 * @property {Array.<module:patientversionSchema.affiliatesObj>} affiliates - 
 * @property {Array.<module:patientversionSchema.imagesObj>} images - 
 * @property {String} primaryDoc - 
 * @property {Array.<String>} physicians - 
 * @property {Array.<ObjectId>} employees - 
 * @property {Array.<String>} markers - 
 * @property {String} pin - 
 * @property {Date} generatedAt - 
 * @property {Array.<module:patientversionSchema.devicesObj>} devices - 
 * @property {Boolean} createPlanned - 
 * @property {Boolean} accessPRC - 
 * @property {String} alternativeId - 
 * @property {String} socialInsuranceNumber - 
 * @property {Object} partner_extra - 
 * @property {Array.<module:patientversionSchema.partnerIdsObj>} partnerIds - 
 * @property {String} insuranceNotes - 
 * @property {String} careDegree - 
 * @property {Date} dob - 
 * @property {Date} dateOfDeath - 
 * @property {Date} dateOfInActive - 
 * @property {Boolean} isDeceased - 
 * @property {Boolean} inActive - 
 * @property {string} reason - 
 * @property {String} dob_MM - 
 * @property {String} dob_DD - 
 * @property {Date} patientSince - 
 * @property {String} talk - 
 * @property {String} gender - 
 * @property {Boolean} sendPatientReceipt - 
 * @property {Boolean} noMailing - 
 * @property {String} patientNo - 
 * @property {String} socialSecurityNo - 
 * @property {Boolean} familyDoctorModel - 
 * @property {Number} patientNumber - 
 * @property {Number} noShowCount - 
 * @property {Date} nextAppointment - 
 * @property {String} attachedActivity - 
 * @property {String} attachedContent - 
 * @property {String} attachedSeverity - 
 * @property {module:patientversionSchema.patientTransferObj} patientTransfer - 
 * @property {String} importId - 
 * @property {Array.<String>} crmTags - 
 * @property {Array.<module:patientversionSchema.crmTreatmentsObj>} crmTreatments - 
 * @property {Date} crmAppointmentRangeStart - 
 * @property {Date} crmAppointmentRangeEnd - 
 * @property {String} crmAppointmentMonth - 
 * @property {String} crmAppointmentQuarter - 
 * @property {String} crmAppointmentYear - 
 * @property {String} crmComment - 
 * @property {Date} crmReminder - 
 * @property {String} crmReminderCalRef - 
 * @property {String} crmCatalogShort - 
 * @property {String} activeCaseFolderId - 
 * @property {String} institution - 
 * @property {String} familyDoctor - 
 * @property {Array.<String>} edmpTypes - 
 * @property {Array.<String>} edmpNotifiedAboutStatementOfParticipationTypes - 
 * @property {String} edmpCaseNo - 
 * @property {String} ehksPatientNo - 
 * @property {Boolean} ehksActivated - 
 * @property {String} ehksDocType - 
 * @property {String} HGVPatientNo - 
 * @property {Boolean} HGVActivated - 
 * @property {Boolean} zervixZytologieActivated - 
 * @property {Boolean} edmpParticipationChronicHeartFailure - 
 * @property {Boolean} cardioHeartFailure - 
 * @property {Boolean} cardioCryptogenicStroke - 
 * @property {Boolean} cardioCHD - 
 * @property {Boolean} amtsActivated - 
 * @property {Boolean} amtsApprovalForDataEvaluation - 
 * @property {Boolean} amtsApprovalForReleaseFromConfidentiality - 
 * @property {Boolean} amtsParticipationInSelectiveContract - 
 * @property {String} amtsSelectiveContractInsuranceId - 
 * @property {String} invoiceRecipient - 
 * @property {Array.<module:patientversionSchema.latestMedDataObj>} latestMedData - 
 * @property {Array.<module:patientversionSchema.latestLabDataObj>} latestLabData - 
 * @property {String} localPracticeId - 
 * @property {String} locationId - 
 * @property {Array.<String>} scheinEmployeeIds - 
 * @property {Boolean} confirmedViewFromOtherLocations - 
 * @property {Array.<String>} confirmedViewFromLocationIds - 
 * @property {Array.<String>} additionalContacts - 
 * @property {Array.<object>} patientsFamilyMembers - 
 * @property {Array.<object>} additionalFamilyMembers - 
 * @property {String} pseudonym - 
 * @property {Array.<String>} countryMode - 
 * @property {Date} lastChanged - 
 * @property {String} vekaCardNo - 
 * @property {Object} ofacRawData - 
 * @property {Date} insuranceWOCard - 
 * @property {String} cardStatus - 
 * @property {Boolean} isStub - 
 * @property {Boolean} treatmentNeeds - 
 * @property {Date} timestamp - 
 * @property {String} patientId - 
 */