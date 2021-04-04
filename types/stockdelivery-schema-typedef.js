/**
 * @module stockdeliverySchema
 */

/**
 * @typedef {Object} module:stockdeliverySchema.activitiesObj
 * @property {ObjectId} patientId - 
 * @property {ObjectId} activities - 
 */


/**
 * @typedef {Object} module:stockdeliverySchema.stocksObj
 * @property {String} stockType - 
 * @property {ObjectId} references - 
 * @property {Number} quantity - 
 * @property {Number} quantityDelivered - 
 * @property {ObjectId} editorId - 
 * @property {Boolean} checked - 
 * @property {ObjectId} stockLocationId - 
 * @property {Boolean} isProcessed - 
 * @property {Number} phPriceSale - 
 * @property {Number} phPriceSaleCatalog - 
 * @property {Number} phPriceCost - 
 * @property {Number} phPriceCostCatalog - 
 * @property {String} nota - 
 * @property {Array.<ObjectId>} patients - 
 * @property {Boolean} isDivisible - 
 * @property {String} phPZN - 
 * @property {Array.<module:stockdeliverySchema.activitiesObj>} activities - 
 */


/**
 * @typedef {Object} module:stockdeliverySchema.stockdelivery
 * @property {Date} dateCreated - 
 * @property {Date} dateSent - 
 * @property {Date} dateArchived - 
 * @property {Date} dateArrived - 
 * @property {Date} dateClosed - 
 * @property {String} orderNo - 
 * @property {ObjectId} basecontactId - 
 * @property {String} notes - 
 * @property {String} documentId - 
 * @property {String} mediaId - 
 * @property {Boolean} orderFulfilled - 
 * @property {Array.<module:stockdeliverySchema.stocksObj>} stocks - 
 * @property {String} status - 
 * @property {ObjectId} formId - 
 * @property {ObjectId} locationId - 
 * @property {ObjectId} orderId - 
 * @property {Object} electronicData - 
 * @property {ObjectId} editorId - 
 */