/**
 * @module stockordersSchema
 */

/**
 * @typedef {Object} module:stockordersSchema.activitiesObj
 * @property {ObjectId} patientId - 
 * @property {ObjectId} activities - 
 */


/**
 * @typedef {Object} module:stockordersSchema.stocksObj
 * @property {String} stockType - 
 * @property {ObjectId} references - 
 * @property {Number} quantity - 
 * @property {Boolean} checked - 
 * @property {ObjectId} stockLocationId - 
 * @property {Number} quantityDelivered - 
 * @property {Number} phPriceSale - 
 * @property {Number} phPriceSaleCatalog - 
 * @property {Number} phPriceCost - 
 * @property {Number} phPriceCostCatalog - 
 * @property {String} nota - 
 * @property {String} phPZN - 
 * @property {Array.<ObjectId>} patients - 
 * @property {Boolean} isDivisible - 
 * @property {Number} dividedQuantity - 
 * @property {Array.<module:stockordersSchema.activitiesObj>} activities - 
 */


/**
 * @typedef {Object} module:stockordersSchema.stockorders
 * @property {Date} dateCreated - 
 * @property {Date} dateSent - 
 * @property {Date} dateArchived - 
 * @property {Date} dateArrived - 
 * @property {Date} dateClosed - 
 * @property {String} orderNo - 
 * @property {String} basecontactId - 
 * @property {String} notes - 
 * @property {String} documentId - 
 * @property {String} mediaId - 
 * @property {Boolean} orderFulfilled - 
 * @property {Array.<module:stockordersSchema.stocksObj>} stocks - 
 * @property {String} status - 
 * @property {ObjectId} formId - 
 * @property {ObjectId} locationId - 
 * @property {Object} electronicData - 
 * @property {ObjectId} editorId - 
 */