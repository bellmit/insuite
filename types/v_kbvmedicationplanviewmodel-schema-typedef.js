/**
 * @module v_kbvmedicationplanviewmodelSchema
 */

/**
 * @typedef {Object} module:v_kbvmedicationplanviewmodelSchema.phAMRContentObj
 * @property {String} title - 
 * @property {String} text - 
 * @property {String} regulationTypeCode - 
 * @property {String} limitation - 
 * @property {String} fileName - 
 */


/**
 * @typedef {Object} module:v_kbvmedicationplanviewmodelSchema.phARVContentObj
 * @property {String} title - 
 * @property {String} hint - 
 * @property {String} datesInfo - 
 * @property {Boolean} hasAlternatives - 
 */


/**
 * @typedef {Object} module:v_kbvmedicationplanviewmodelSchema.phIngrObj
 * @property {Number} code - 
 * @property {String} name - 
 * @property {String} shortName - 
 * @property {String} strength - 
 */


/**
 * @typedef {Object} module:v_kbvmedicationplanviewmodelSchema.medicationPlanEntriesObj
 * @property {String} type - 
 * @property {String} freeText - 
 * @property {String} bindText - 
 * @property {String} medicationRecipeText - 
 * @property {String} subHeadingCode - 
 * @property {String} subHeadingText - 
 * @property {String} medicationRef - 
 * @property {Date} timestamp - 
 * @property {String} phNLabel - 
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
 * @property {Array.<module:v_kbvmedicationplanviewmodelSchema.phIngrObj>} phIngr - 
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
 * @property {Boolean} phOTC - 
 * @property {Boolean} phOTX - 
 * @property {Boolean} phARV - 
 * @property {Array.<module:v_kbvmedicationplanviewmodelSchema.phARVContentObj>} phARVContent - 
 * @property {Array.<module:v_kbvmedicationplanviewmodelSchema.phAMRContentObj>} phAMRContent - 
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
 * @property {String} explanations - 
 * @property {Boolean} adherence - 
 * @property {String} source - 
 * @property {Boolean} noLongerValid - 
 * @property {String} sourceType - 
 * @property {Boolean} phContraceptive - 
 * @property {Object} s_extra - 
 */


/**
 * @typedef {Object} module:v_kbvmedicationplanviewmodelSchema.v_kbvmedicationplanviewmodel
 * @property {String} identificationName - 
 * @property {String} medicationPlanVersion - 
 * @property {String} patientWeight - 
 * @property {String} patientHeight - 
 * @property {String} patientCreatinineValue - 
 * @property {String} patientGender - 
 * @property {String} patientAllergiesAndIntolerances - 
 * @property {Boolean} patientLactation - 
 * @property {Boolean} patientPregnant - 
 * @property {String} patientParameter1 - 
 * @property {String} patientParameter2 - 
 * @property {String} patientParameter3 - 
 * @property {Array.<module:v_kbvmedicationplanviewmodelSchema.medicationPlanEntriesObj>} medicationPlanEntries - 
 * @property {String} comment - 
 */