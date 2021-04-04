
/*global YUI */


YUI.add( 'instock-process', function( Y, NAME ) {

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );
        const{ formatPromiseResult } = require( 'dc-core' ).utils;
        /**
         * Updates make values of some fiealds equal for identical phPZNs
         * @param {Object} user
         * @param {Object} inStockItem
         * @param {Function} callback
         */
        async function updateSamePhPZNS( user, inStockItem, callback ) {
            const fields = [
                'phPZN',
                'gtinCode',
                'prdNo',
                'description',
                'phPriceSale',
                'phPriceCost',
                'phPriceSaleCatalog',
                'phPriceCostCatalog',
                'vatTypeCatalog',
                "vat",
                "phPackSize",
                "isDivisible",
                "phUnit",
                "divisibleCount"
            ];
            let data = {
                phPZN: inStockItem.phPZN,
                gtinCode: inStockItem.gtinCode,
                prdNo: inStockItem.prdNo,
                phPriceSale: inStockItem.phPriceSale,
                phPriceCost: inStockItem.phPriceCost,
                phPriceSaleCatalog: inStockItem.phPriceSaleCatalog,
                phPriceCostCatalog: inStockItem.phPriceCostCatalog,
                vatTypeCatalog: inStockItem.vatTypeCatalog,
                vat: inStockItem.vat,
                phPackSize: inStockItem.phPackSize,
                isDivisible: inStockItem.isDivisible,
                phUnit: inStockItem.phUnit,
                divisibleCount: inStockItem.divisibleCount,
                description: inStockItem.description
            };

            let [error] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    action: 'update',
                    model: 'instock',
                    query: {$and: [{phPZN: inStockItem.phPZN}, {_id: {$ne: inStockItem._id}}]},
                    fields: fields,
                    user,
                    data: Y.doccirrus.filters.cleanDbObject( data ),
                    options: {
                        multi: true
                    }
                } )
            );

            if( error ) {
                Y.log( `updateSamePhPZNS: Failed to update instock items: ${error.stack || error}`, 'error', NAME );
                return callback( error );
            }

            return callback();
        }
        /**
         *
         * v.0. presents an array of pre process functions &
         *      an array of post-process functions.
         *
         * @Class AuthProcess
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {
            post: [
                {
                    run: [
                        updateSamePhPZNS
                    ], forAction: 'write'
                }
            ],
            audit: {
                     /**
                 * optional:  true = in addition to regular auditing note down actions
                 * on this model that were attempted as well as ones that failed.
                 * Descr. in this case will always be "Versuch".
                 *
                 * false = note down only things that actually took place,
                 * not attempts that failed
                 */
                noteAttempt: false,

                /**
                 * optional: here we can override what is shown in the audit log description
                 * only used when the action succeeds (see noteAttempt)
                 *
                 * @param {Object} data
                 * @returns {*|string|string}
                 */
                descrFn: function(data) {
                  return 'inStock item _id=' + data._id;
                }

            },

            name: NAME
        };

    },
    '0.0.1', {requires: ['instock-schema']}
);

