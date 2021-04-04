/*global YUI */


YUI.add( 'stockorders-process', function( Y, NAME ) {

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );
        const {formatPromiseResult} = require( 'dc-core' ).utils;

        /**
         * Updates make values of some fiealds equal for identical phPZNs
         * @param {Object} user
         * @param {Object} inStockItem
         * @param {Function} callback
         */
        async function updateActivities( user, inStockItem, callback ) {
            let [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                action: 'update',
                model: 'activity',
                query: {orderId: inStockItem._id},
                fields: ['orderId'],
                user,
                data: {orderId: null},
                options: {
                    multi: true
                }
            } ) );

            if( err ) {
                Y.log( `updateActivities: failed to remove orderId from linked activities ${err.stack || err}`, 'error', 'NAME' );
                return callback( err );
            }

            return callback( null, inStockItem );
        }

         async function updateStockLocationsActivities (user, order, callback) {
             const orderItem = order.toObject ? order.toObject() : order;
             const stockItems = orderItem.stocks;
             if( stockItems ) {
                let activitiesToUpdateStock,
                    activitiesToUpdate = [];
                for(let stockItem of stockItems) {
                    if(stockItem.activities) {
                        activitiesToUpdateStock = stockItem.activities.map( a => {
                                return {
                                    _id: a._id,
                                    stockLocationId: stockItem.stockLocationId
                                };
                            }
                        );
                        activitiesToUpdate.push(...activitiesToUpdateStock);
                    }
                }


                if(activitiesToUpdate) {
                    for(let activity of activitiesToUpdate) {
                        let [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                            action: 'update',
                            model: 'activity',
                            query: {_id: activity._id },
                            user,
                            data: {$set: {s_extra: {stockLocationId: activity.stockLocationId } }}
                        } ) );


                        if( err ) {
                            Y.log( `updateStockLocationsActivities: failed to update StocklocationIds in linked activities ${err.stack || err}`, 'error', 'NAME' );
                            return callback( err );
                        }
                    }
                }

                return callback( null, order );

            }
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
                        updateActivities
                    ], forAction: 'delete'
                },
                 {
                    run: [
                        updateStockLocationsActivities
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
                descrFn: function( data ) {
                    return 'StockOrder item _id=' + data._id;
                }

            },

            name: NAME
        };

    },
    '0.0.1', {requires: ['stockorders-schema']}
);

