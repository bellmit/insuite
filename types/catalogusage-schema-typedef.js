/**
 * @module catalogusageSchema
 */

/**
 * @typedef {Object} module:catalogusageSchema.omimCodesObj
 * @property {String} fk5070 - 
 * @property {Date} fk5070ValidAt - 
 * @property {String} fk5071 - 
 * @property {Date} fk5071ValidAt - 
 * @property {String} fk5072 - 
 * @property {String} fk5073 - 
 */


/**
 * @typedef {Object} module:catalogusageSchema.hierarchyRulesObj
 * @property {Boolean} checked - 
 * @property {Boolean} disabled - 
 * @property {String} title - 
 * @property {String} seq - 
 * @property {String} validFrom - 
 * @property {String} validUntil - 
 */


/**
 * @typedef {Object} module:catalogusageSchema.fk5042SetObj
 * @property {String} fk5042 - 
 * @property {String} fk5043 - 
 */


/**
 * @typedef {Object} module:catalogusageSchema.fk5036SetObj
 * @property {String} fk5036 - 
 */


/**
 * @typedef {Object} module:catalogusageSchema.fk5035SetObj
 * @property {String} fk5035 - 
 * @property {String} fk5041 - 
 * @property {Object} catalogEntry - 
 * @property {Array.<String>} seqs - 
 */


/**
 * @typedef {Object} module:catalogusageSchema.fk5020SetObj
 * @property {Boolean} fk5020 - 
 * @property {String} fk5021 - 
 */


/**
 * @typedef {Object} module:catalogusageSchema.fk5011SetObj
 * @property {String} fk5011 - 
 */


/**
 * @typedef {Object} module:catalogusageSchema.fk5012SetObj
 * @property {String} fk5012 - 
 * @property {String} fk5074 - 
 * @property {String} fk5075 - 
 * @property {Array.<module:catalogusageSchema.fk5011SetObj>} fk5011Set - 
 */


/**
 * @typedef {Object} module:catalogusageSchema.phAMRContentObj
 * @property {String} title - 
 * @property {String} text - 
 * @property {String} regulationTypeCode - 
 * @property {String} limitation - 
 * @property {String} fileName - 
 */


/**
 * @typedef {Object} module:catalogusageSchema.phARVContentObj
 * @property {String} title - 
 * @property {String} hint - 
 * @property {String} datesInfo - 
 * @property {Boolean} hasAlternatives - 
 */


/**
 * @typedef {Object} module:catalogusageSchema.phIngrObj
 * @property {Number} code - 
 * @property {String} name - 
 * @property {String} shortName - 
 * @property {String} strength - 
 */


/**
 * @typedef {Object} module:catalogusageSchema.seqIdObj
 * @property {String} actType - 
 * @property {String} seq - 
 */


/**
 * @typedef {Object} module:catalogusageSchema.catalogusage
 * @property {String} locationId - 
 * @property {module:catalogusageSchema.seqIdObj} seqId - 
 * @property {String} level - 
 * @property {String} l1 - 
 * @property {String} seq - 
 * @property {String} chapter - 
 * @property {String} chapterPart - 
 * @property {String} chapterText - 
 * @property {String} unifiedSeq - 
 * @property {String} title - 
 * @property {String} infos - 
 * @property {String} unit - 
 * @property {String} value - 
 * @property {Number} count - 
 * @property {Mixed} u_extra - 
 * @property {String} explanations - 
 * @property {String} catalogShort - 
 * @property {boolean} catalog - 
 * @property {String} catalogRef - 
 * @property {String} billingFactorValue - 
 * @property {String} billingFactorType - 
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
 * @property {Array.<module:catalogusageSchema.phIngrObj>} phIngr - 
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
 * @property {Array.<module:catalogusageSchema.phARVContentObj>} phARVContent - 
 * @property {Array.<module:catalogusageSchema.phAMRContentObj>} phAMRContent - 
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
 * @property {String} orgianizationId - 
 * @property {String} orgianizationName - 
 * @property {String} ukv - 
 * @property {String} kv_connect - 
 * @property {Object} constraints - 
 * @property {String} vknr - 
 * @property {String} iknr - 
 * @property {Boolean} abrechnungs_ik - 
 * @property {String} ktab - 
 * @property {String} name - 
 * @property {String} sortierungsname - 
 * @property {String} kurzname - 
 * @property {String} suchname - 
 * @property {Array.<String>} ortssuchnamen - 
 * @property {String} gebuehrenordnung - 
 * @property {String} kostentraegergruppe - 
 * @property {String} kostentraegergruppeId - 
 * @property {String} abrechnungsstelle - 
 * @property {String} abrechnungsbereich - 
 * @property {Mixed} abrechnungsbereiche - 
 * @property {String} kv - 
 * @property {Date} kt_gueltigkeit_start - 
 * @property {Date} kt_gueltigkeit_end - 
 * @property {Date} ik_gueltigkeit_start - 
 * @property {Date} ik_gueltigkeit_end - 
 * @property {Date} ktab_gueltigkeit_start - 
 * @property {Date} ktab_gueltigkeit_end - 
 * @property {Date} gueltigkeit_start - 
 * @property {Date} gueltigkeit_end - 
 * @property {String} existenzbeendigung_vk - 
 * @property {String} existenzbeendigung_q - 
 * @property {Array.<String>} unzkv - 
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
 * @property {Array.<module:catalogusageSchema.fk5012SetObj>} fk5012Set - 
 * @property {String} fk5015 - 
 * @property {String} fk5016 - 
 * @property {String} tsvDoctorNo - 
 * @property {String} fk5018 - 
 * @property {Array.<module:catalogusageSchema.fk5020SetObj>} fk5020Set - 
 * @property {Array.<module:catalogusageSchema.fk5035SetObj>} fk5035Set - 
 * @property {Array.<module:catalogusageSchema.fk5036SetObj>} fk5036Set - 
 * @property {String} fk5038 - 
 * @property {String} fk5010BatchNumber - 
 * @property {Array.<module:catalogusageSchema.fk5042SetObj>} fk5042Set - 
 * @property {String} treatmentCategory - 
 * @property {Array.<module:catalogusageSchema.hierarchyRulesObj>} hierarchyRules - 
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
 * @property {Array.<module:catalogusageSchema.omimCodesObj>} omimCodes - 
 * @property {string} gebuehType - 
 * @property {string} costType - 
 * @property {Number} linkedPercentage - 
 * @property {Boolean} noASV - 
 * @property {Array.<String>} gnrAdditionalInfo - 
 * @property {String} gnrAdditionalInfoType - 
 * @property {String} labRequestRef - 
 * @property {Array.<String>} tags - 
 */