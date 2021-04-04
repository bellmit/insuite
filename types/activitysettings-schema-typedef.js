/**
 * @module activitysettingsSchema
 */

/**
 * @typedef {Object} module:activitysettingsSchema.settingsObj
 * @property {String} actType - 
 * @property {String} color - 
 * @property {Boolean} isVisible - 
 * @property {String} functionality - 
 * @property {String} userContent - 
 * @property {Number} maxMedicationAmount - 
 * @property {Boolean} schein - 
 * @property {Boolean} showPrintCount - 
 * @property {Array.<String>} subTypes - 
 * @property {Boolean} useWYSWYG - 
 * @property {Boolean} quickPrintInvoice - 
 * @property {Boolean} quickPrintInvoiceBill - 
 * @property {Boolean} quickPrintPrescription - 
 */


/**
 * @typedef {Object} module:activitysettingsSchema.activitysettings
 * @property {Array.<module:activitysettingsSchema.settingsObj>} settings - 
 */