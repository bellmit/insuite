/**
 * @module v_invoiceconfigurationSchema
 */

/**
 * @typedef {Object} module:v_invoiceconfigurationSchema.tarmedInvoiceFactorValuesObj
 * @property {String} qualiDignity - 
 * @property {Array.<String>} caseTypes - 
 * @property {Number} factor - 
 */


/**
 * @typedef {Object} module:v_invoiceconfigurationSchema.tarmedTaxPointValuesObj
 * @property {String} law - 
 * @property {String} cantonCode - 
 * @property {String} cantonShort - 
 * @property {Number} value - 
 * @property {Number} specialValue - 
 * @property {Array.<String>} specialInsurances - 
 * @property {Date} validFrom - 
 * @property {Date} validUntil - 
 */


/**
 * @typedef {Object} module:v_invoiceconfigurationSchema.mediportDeliverySettingsObj
 * @property {String} mediportBasePath - 
 * @property {String} sendFlowId - 
 * @property {String} receiveFlowId - 
 * @property {String} deviceServer - 
 */


/**
 * @typedef {Object} module:v_invoiceconfigurationSchema.billerObj
 * @property {String} name - 
 * @property {String} glnNumber - 
 */


/**
 * @typedef {Object} module:v_invoiceconfigurationSchema.employeesObj
 * @property {String} firstname - 
 * @property {String} lastname - 
 * @property {Array.<String>} billingRole - 
 */


/**
 * @typedef {Object} module:v_invoiceconfigurationSchema.locationsObj
 * @property {String} locname - 
 * @property {String} commercialNo - 
 * @property {String} countryCode - 
 */


/**
 * @typedef {Object} module:v_invoiceconfigurationSchema.kvgSettingsObj
 * @property {String} kvgSettingTitle - 
 * @property {String} law - 
 * @property {Array.<module:v_invoiceconfigurationSchema.locationsObj>} locations - 
 * @property {Array.<module:v_invoiceconfigurationSchema.employeesObj>} employees - 
 * @property {Boolean} billerEqualToProvider - 
 * @property {module:v_invoiceconfigurationSchema.billerObj} biller - 
 */


/**
 * @typedef {Object} module:v_invoiceconfigurationSchema.employeesObj
 * @property {String} firstname - 
 * @property {String} lastname - 
 */


/**
 * @typedef {Object} module:v_invoiceconfigurationSchema.locationsObj
 * @property {String} locname - 
 * @property {String} commercialNo - 
 * @property {String} countryCode - 
 */


/**
 * @typedef {Object} module:v_invoiceconfigurationSchema.gkvExclusionListObj
 * @property {String} title - 
 * @property {Array.<String>} excludeFrom - 
 * @property {Array.<module:v_invoiceconfigurationSchema.locationsObj>} locations - 
 * @property {Array.<module:v_invoiceconfigurationSchema.employeesObj>} employees - 
 * @property {Array.<String>} codes - 
 */


/**
 * @typedef {Object} module:v_invoiceconfigurationSchema.employeesObj
 * @property {String} firstname - 
 * @property {String} lastname - 
 */


/**
 * @typedef {Object} module:v_invoiceconfigurationSchema.locationsObj
 * @property {String} locname - 
 * @property {String} commercialNo - 
 * @property {String} countryCode - 
 */


/**
 * @typedef {Object} module:v_invoiceconfigurationSchema.cashSettingsObj
 * @property {String} cashSettingTitle - 
 * @property {Array.<module:v_invoiceconfigurationSchema.locationsObj>} locations - 
 * @property {Array.<module:v_invoiceconfigurationSchema.employeesObj>} employees - 
 */


/**
 * @typedef {Object} module:v_invoiceconfigurationSchema.contactsObj
 * @property {String} type - 
 * @property {Boolean} preferred - 
 * @property {String} value - 
 * @property {String} note - 
 * @property {Boolean} signaling - 
 * @property {Boolean} confirmed - 
 * @property {Boolean} confirmNeeded - 
 */


/**
 * @typedef {Object} module:v_invoiceconfigurationSchema.senderNameAddObj
 * @property {String} name - 
 */


/**
 * @typedef {Object} module:v_invoiceconfigurationSchema.employeesObj
 * @property {String} firstname - 
 * @property {String} lastname - 
 */


/**
 * @typedef {Object} module:v_invoiceconfigurationSchema.locationsObj
 * @property {String} locname - 
 * @property {String} commercialNo - 
 * @property {String} countryCode - 
 */


/**
 * @typedef {Object} module:v_invoiceconfigurationSchema.padxSettingsObj
 * @property {String} padxSettingTitle - 
 * @property {Array.<module:v_invoiceconfigurationSchema.locationsObj>} locations - 
 * @property {Array.<module:v_invoiceconfigurationSchema.employeesObj>} employees - 
 * @property {String} padxSettingTitleRef - 
 * @property {String} recipientName - 
 * @property {String} recipientCustomerNo - 
 * @property {Number} recipientIKNR - 
 * @property {String} recipientRZID - 
 * @property {String} proxyRecipientName - 
 * @property {String} proxyRecipientCustomerNo - 
 * @property {Number} proxyRecipientIKNR - 
 * @property {Number} proxyRecipientRZID - 
 * @property {String} senderName - 
 * @property {String} senderCustomerNo - 
 * @property {Number} senderIKNR - 
 * @property {Number} senderRZID - 
 * @property {Array.<module:v_invoiceconfigurationSchema.senderNameAddObj>} senderNameAdd - 
 * @property {String} senderUstidnr - 
 * @property {String} senderCreditorId - 
 * @property {Boolean} encryption - 
 * @property {String} receiptAddress - 
 * @property {String} invoiceNotice - 
 * @property {Array.<module:v_invoiceconfigurationSchema.contactsObj>} contacts - 
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
 * @property {String} oneClickServer - 
 * @property {String} oneClickName - 
 * @property {String} oneClickPass - 
 * @property {String} participantName - 
 * @property {String} participantCustomerNumber - 
 * @property {String} participantValueType - 
 * @property {Number} participantValue - 
 * @property {Boolean} AISInvoiceNumber - 
 * @property {Boolean} AISAmount - 
 */


/**
 * @typedef {Object} module:v_invoiceconfigurationSchema.receiptsSchemesObj
 * @property {String} locationId - 
 * @property {String} name - 
 * @property {String} year - 
 * @property {Number} nextNumber - 
 * @property {Number} digits - 
 */


/**
 * @typedef {Object} module:v_invoiceconfigurationSchema.dunningSchemesObj
 * @property {String} locationId - 
 * @property {Number} warning1Value - 
 * @property {Number} warning2Value - 
 * @property {Number} invoiceDays - 
 * @property {Number} reminderDays - 
 * @property {Number} warning1Days - 
 * @property {Number} warning2Days - 
 * @property {String} invoiceText - 
 * @property {String} reminderText - 
 * @property {String} warning1Text - 
 * @property {String} warning2Text - 
 */


/**
 * @typedef {Object} module:v_invoiceconfigurationSchema.bgNumberSchemesObj
 * @property {String} locationId - 
 * @property {String} year - 
 * @property {Number} nextNumber - 
 * @property {Number} digits - 
 */


/**
 * @typedef {Object} module:v_invoiceconfigurationSchema.receiptNumberSchemesObj
 * @property {String} locationId - 
 * @property {String} year - 
 * @property {Number} nextNumber - 
 * @property {Number} digits - 
 */


/**
 * @typedef {Object} module:v_invoiceconfigurationSchema.invoiceNumberSchemesObj
 * @property {String} locationId - 
 * @property {String} year - 
 * @property {Number} nextNumber - 
 * @property {Number} digits - 
 */


/**
 * @typedef {Object} module:v_invoiceconfigurationSchema.invoicefactorsObj
 * @property {String} year - 
 * @property {String} quarter - 
 * @property {Number} factor - 
 * @property {Boolean} isDefault - 
 */


/**
 * @typedef {Object} module:v_invoiceconfigurationSchema.v_invoiceconfiguration
 * @property {Boolean} addVat - 
 * @property {Number} vat - 
 * @property {Boolean} conFileSplicing - 
 * @property {Array.<module:v_invoiceconfigurationSchema.invoicefactorsObj>} invoicefactors - 
 * @property {Number} empiricalvalue - 
 * @property {Boolean} kbvFocusFunctionalityKRW - 
 * @property {Boolean} autoAssignmentOfDiagnosis - 
 * @property {Boolean} kbvFocusFunctionalityContinuousDiagnosis - 
 * @property {Array.<module:v_invoiceconfigurationSchema.invoiceNumberSchemesObj>} invoiceNumberSchemes - 
 * @property {Array.<module:v_invoiceconfigurationSchema.receiptNumberSchemesObj>} receiptNumberSchemes - 
 * @property {Array.<module:v_invoiceconfigurationSchema.bgNumberSchemesObj>} bgNumberSchemes - 
 * @property {Array.<module:v_invoiceconfigurationSchema.dunningSchemesObj>} dunningSchemes - 
 * @property {Array.<module:v_invoiceconfigurationSchema.receiptsSchemesObj>} receiptsSchemes - 
 * @property {Array.<module:v_invoiceconfigurationSchema.padxSettingsObj>} padxSettings - 
 * @property {Array.<module:v_invoiceconfigurationSchema.cashSettingsObj>} cashSettings - 
 * @property {String} tPackerUsername - 
 * @property {String} tPackerPassword - 
 * @property {String} qsDataKey - 
 * @property {String} patientKey - 
 * @property {Boolean} isMedneoCustomer - 
 * @property {Boolean} askForCreationOfAdditionalInsurancesAfterCardread - 
 * @property {Boolean} copyPublicInsuranceDataToAdditionalInsurance - 
 * @property {Date} gkvAutoValidationAt - 
 * @property {Date} pvsAutoValidationAt - 
 * @property {Boolean} pvsNeedsApproval - 
 * @property {Boolean} createUniqCaseIdentNoOnInvoice - 
 * @property {Array.<module:v_invoiceconfigurationSchema.gkvExclusionListObj>} gkvExclusionList - 
 * @property {Boolean} gkvCombineCaseFolders - 
 * @property {Boolean} gkvCombineScheins - 
 * @property {Array.<module:v_invoiceconfigurationSchema.kvgSettingsObj>} kvgSettings - 
 * @property {Array.<module:v_invoiceconfigurationSchema.mediportDeliverySettingsObj>} mediportDeliverySettings - 
 * @property {Array.<module:v_invoiceconfigurationSchema.tarmedTaxPointValuesObj>} tarmedTaxPointValues - 
 * @property {Array.<module:v_invoiceconfigurationSchema.tarmedInvoiceFactorValuesObj>} tarmedInvoiceFactorValues - 
 * @property {Boolean} isMocking - 
 * @property {Boolean} hasImagingDevice - 
 */