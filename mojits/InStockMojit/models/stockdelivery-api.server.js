/*jshint esnext:true */
/*global YUI */


YUI.add( 'stockdelivery-api', function( Y, NAME ) {
        const
            {formatPromiseResult, promisifyArgsCallback, handleResult} = require( 'dc-core' ).utils,
            ObjectId = require( 'mongoose' ).Types.ObjectId,
            orderStatuses = Y.doccirrus.schemas.stockorders.stockStatuses,
            arriveOrder = Y.doccirrus.api.stockordersrequest.arriveOrder,
            defineStatus = Y.doccirrus.api.stockordersrequest.defineStatus;

        /**
         * @module stockdelivery-api
         */
        /**
         * returns list of orders from stockdelivery document with list of stock items for each order
         * @method getOrders
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Function} args.callback is called with 2 args:
         *  {Object} err
         *  {Object || null} result
         */
        async function getDeliveries( args ) {
            Y.log( 'Entering Y.doccirrus.api.stockdelivery.getDeliveries', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.stockdelivery.getDeliveries' );
            }
            const
                {options = {}, query = {}, callback, user} = args;

            if( query._id ) {
                query._id = new ObjectId( query._id );
            }

            if( query.orderId ) {
                query.orderId = new ObjectId( query.orderId );
            }

            let
                err,
                result,
                orders,
                count,
                pipeline = [
                    {
                        $match: query
                    },
                    {
                        $lookup: {
                            from: 'instocks',
                            localField: 'stocks.references',
                            foreignField: '_id',
                            as: 'stockItems'
                        }
                    },
                    {
                        $lookup: {
                            from: 'identities',
                            localField: 'stocks.editorId',
                            foreignField: '_id',
                            as: 'editors'
                        }
                    },
                    {
                        $lookup: {
                            from: 'formtemplates',
                            localField: 'formId',
                            foreignField: '_id',
                            as: 'form'
                        }
                    },
                    {
                        $unwind: {
                            path: "$form",
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $lookup: {
                            from: 'locations',
                            localField: 'locationId',
                            foreignField: '_id',
                            as: 'location'
                        }
                    },
                    {
                        $unwind: "$location"
                    },
                    {
                        $lookup: {
                            from: 'stocklocations',
                            let: {stockLocs: '$location.stockLocations'},
                            pipeline: [
                                {$match: {
                                        $expr: {
                                            $in: [
                                                "$_id",
                                                "$$stockLocs"
                                            ]
                                        }
                                    }
                                }
                            ],
                            as: 'stockLocations'
                        }
                    },
                    {
                        $lookup: {
                            from: 'basecontacts',
                            localField: 'basecontactId',
                            foreignField: "_id",
                            as: 'supplier'
                        }
                    },
                    {
                        $unwind: "$supplier"
                    },
                    // {$unwind: "$stocks"}, {
                    //     $lookup: {
                    //         from: "patients",
                    //         let: {ids: "$stocks.patients"},
                    //         pipeline: [
                    //             {
                    //                 $match: {
                    //                     $expr: {$in: ["$_id", "$$ids"]}
                    //                 }
                    //
                    //             },
                    //             {$project: {firstname: 1, lastname: 1, _id: 1}}
                    //         ],
                    //         as: "stocks.patients"
                    //     }
                    //
                    // },
                    // {
                    //     $lookup: {
                    //         from: 'activities',
                    //         localField: 'orderId',
                    //         foreignField: 'orderId',
                    //         as: 'activities'
                    //     }
                    // },
                    // {"$group": {"_id": "$_id", newStocks: {$push: '$stocks'}, "doc": {"$first": "$$ROOT"}}},
                    // {
                    //     $addFields: {
                    //         "doc.stocks": "$newStocks"
                    //
                    //     }
                    // },
                    // {"$replaceRoot": {"newRoot": "$doc"}},
                    {
                        $project: {
                            _id: 1,
                            basecontactId: 1,
                            dateCreated: 1,
                            dateSent: 1,
                            dateArchived: 1,
                            dateArrived: 1,
                            dateClosed: 1,
                            editors: 1,
                            formId: 1,
                            locname: "$location.locname",
                            stockLocations: "$stockLocations",
                            form: {
                                _id: "$form._id",
                                title: "$form.title",
                                version: "$form.version"
                            },
                            locationId: 1,
                            mediaId: 1,
                            orderNo: 1,
                            status: 1,
                            stockItems: 1,
                            stocks: {
                                $map: {
                                    input: "$stocks",
                                    as: 'stock',
                                    in: {
                                        checked: '$$stock.checked',
                                        phPZN: '$$stock.phPZN',
                                        quantity: '$$stock.quantity',
                                        references: '$$stock.references',
                                        stockLocationId: '$$stock.stockLocationId',
                                        stockType: '$$stock.stockType',
                                        quantityDelivered: '$$stock.quantityDelivered',
                                        editorId: '$$stock.editorId',
                                        phPriceSale: '$$stock.phPriceSale',
                                        phPriceSaleCatalog: '$$stock.phPriceSaleCatalog',
                                        phPriceCost: '$$stock.phPriceCost',
                                        phPriceCostCatalog: '$$stock.phPriceCostCatalog',
                                        _id: '$$stock._id',
                                        isProcessed: '$$stock.isProcessed',
                                        patients: '$$stock.patients',
                                        activities: '$$stock.activities',
                                        stockItem: {
                                            $arrayElemAt: [
                                                {
                                                    $filter: {
                                                        input: "$stockItems",
                                                        as: "si",
                                                        cond: {
                                                            $eq: ['$$si._id', '$$stock.references']
                                                        }
                                                    }
                                                },
                                                0
                                            ]
                                        },
                                        stockLocation: {
                                            $arrayElemAt: [
                                                {
                                                    $filter: {
                                                        input: "$stockLocations",
                                                        as: "sl",
                                                        cond: {
                                                            $eq: ['$$sl._id', '$$stock.stockLocationId']
                                                        }
                                                    }
                                                },
                                                0
                                            ]
                                        }
                                    }
                                }
                            },
                            supplier: 1,
                            totalOrderedQuantity: {$sum: "$stocks.quantity"}
                        }
                    }
                ];

            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'aggregate',
                    pipeline: pipeline.slice(),
                    model: 'stockdelivery',
                    options
                } ) );

            if( err ) {
                Y.log( `getDeliveries: Could not get stockdeliveries error ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            orders = result.result ? result.result : result;
            count = result.count;

            let patientIds = [];
            orders.forEach( order => {
                (order.stocks || []).forEach( stock => {
                    patientIds = [...patientIds, ...(stock.patients || [])];
                } );
            } );

            if( patientIds.length ) {
                let stockPatients;
                [err, stockPatients] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'patient',
                        action: 'get',
                        query: {_id: {$in: patientIds}},
                        options: {select: {firstname: 1, lastname: 1}}
                    } )
                );

                if( err ) {
                    Y.log( `getDeliveries: Could not get stockdeliveries error ${err.stack || err}`, 'error', NAME );
                    return handleResult( err, null, callback );
                }

                if( stockPatients.length ) {
                    orders.forEach( order => {
                        (order.stocks || []).forEach( stock => {
                            if( stock.patients.length ) {
                                let ids = stock.patients.map( el => el.toString() );
                                stock.patients = stockPatients.filter( patient => ids.includes( patient._id.toString() ) );
                            }
                        } );
                    } );
                }
            }

            orders.forEach( order => {
                order.stocks.forEach( stock => {
                    if( stock.stockItem && stock.stockItem.isDivisible && stock.activities ) {
                        stock.dispensedQuantity = stock.activities.length;
                    }
                } );
            } );

            return handleResult( null, {count, query: {}, result: orders}, callback );
        }

        async function createDeliveryFromOrder( args ) {
            Y.log( 'Entering Y.doccirrus.api.stockdelivery.createDeliveryFromOrder', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.stockdelivery.createDeliveryFromOrder' );
            }
            const {user, callback, data} = args,
                orderId = data.orderId,
                _arriveOrder = promisifyArgsCallback( arriveOrder );
            let err, order, result;

            [err] = await formatPromiseResult( _arriveOrder( {
                user: user,
                data: data
            } ) );

            if( err ) {
                Y.log( `Could not set order status to arrived ${err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            [err, order] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: args.user,
                model: 'stockorders',
                action: 'get',
                query: {_id: new ObjectId( orderId )}
            } ) );

            if( err ) {
                Y.log( `Could not get order: ${err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            if( order.length === 0 ) {
                return handleResult(
                    new Y.doccirrus.commonerrors.DCError( 400, {message: Y.doccirrus.errorTable.getMessage( {code: 'instockMojit_14'} )} ),
                    null,
                    callback
                );

            }

            order = order[0];
            order.orderId = order._id;
            delete order._id;

            order = Y.doccirrus.filters.cleanDbObject( order );
            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    action: 'post',
                    model: 'stockdelivery',
                    user,
                    data: order
                } )
            );

            if( err ) {
                Y.log( `Could not create stockdelivery: ${err}`, 'error', NAME );
            }

            _emitEventForAll( 'stockDeliveryAction', 'created' );

            return handleResult( err, result, callback );
        }

        /**
         * Update checked, quantityDelivered in each order item and update editorId for changed items
         * Update items quantity  based on quantityDelivered,
         * Insert new item to instock if item with given phPZN and stockLocationId is not exited
         * @method approveOrderItems
         * @param {Object} args
         * @param {Object} args.data._id  order id
         * @param {Function} args.callback is called with 2 args:
         *  {Object} err
         *  {Object || null} result
         */
        async function approveOrderItems( args ) {
            Y.log( 'Entering Y.doccirrus.api.stockdelivery.approveOrderItems', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.stockdelivery.approveOrderItems' );
            }
            const
                {user, data: {order = {}}, callback} = args;
            let
                error, result, currentOrder, actualOrder, stockResult, inStockResult;

            try {
                [error] = await formatPromiseResult( _getStockDeliveryLock() );

                if( error ) {
                    Y.log( `approveOrderItems: Failed to approve Order Items ${error.stack || error}`, 'warn', NAME );
                    return handleResult( error, null, callback );
                }

                [error] = await formatPromiseResult( _getInStockLock() );

                if( error ) {
                    Y.doccirrus.schemas.sysnum.releaseStockDeliveryLock( user, () => {
                    } );
                    Y.log( `approveOrderItems: Failed to approve Order Items ${error.stack || error}`, 'warn', NAME );
                    return handleResult( error, null, callback );
                }

                try {
                    result = await _approveOrderItems();
                } catch( err ) {
                    Y.log( `Failed to approve order items ${err.stack || err}`, 'error', NAME );
                    return handleResult( err, null, callback );
                }
                let stockDeliveries;
                [error, stockDeliveries] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        action: 'get',
                        model: 'stockdelivery',
                        query: {
                            _id: order._id
                        },
                        user
                    } )
                );

                if( error ) {
                    Y.log( `Failed to get stockdelivery ${error.stack || error}`, 'error', NAME );
                    return handleResult( error, null, callback );
                }

                args.data = stockDeliveries[0] || {};
                const
                    areAllItemsProcessed = ( args.data.stocks || [] ).every( i => i.checked && i.isProcessed );
                if( args.data.status !== orderStatuses.closed ) {
                    if( areAllItemsProcessed ) {
                        args.data.status = orderStatuses.closed;
                    } else {
                        args.data.status = orderStatuses.partiallybooked;
                    }
                    try {
                        result = await _updateStatus( args );
                    } catch( err ) {
                        Y.log( `Failed to close delivery ${err.stack || err}`, 'error', NAME );
                        return handleResult( err, null, callback );
                    }
                }
                _emitEventForAll( 'stockDeliveryAction', 'update' );
                _emitEventForAll( 'instockAction', 'update' );
                return handleResult( null, result, callback );
            } catch( error ) {
                Y.log( `approveOrderItems: Failed to approve Order Items ${error.stack || error}`, 'warn', NAME );
                return handleResult( error, null, callback );
            } finally {
                Y.doccirrus.schemas.sysnum.releaseStockDeliveryLock( user, () => {
                } );
                Y.doccirrus.schemas.sysnum.releaseInstockLock( user, () => {
                } );
            }

            async function _approveOrderItems() {
                /*Get order in current state*/
                [error, currentOrder] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        action: 'get',
                        model: 'stockdelivery',
                        query: {
                            $and: [
                                {_id: order._id}
                            ]
                        },
                        user
                    } ) );

                if( error ) {
                    Y.log( `_approveOrderItems: Failed to get stockdelivery items ${error.stack || error}`, 'error', NAME );
                    throw  error;
                }
                // Order how it was before
                currentOrder = currentOrder.result ? currentOrder.result : currentOrder;

                if( currentOrder.length > -1 ) {
                    currentOrder = currentOrder[0];
                } else {
                    throw new Y.doccirrus.commonerrors.DCError( 400, {message: Y.doccirrus.errorTable.getMessage( {code: 'instockMojit_09'} )} );
                }

                /*Apply changes to stocks/ order items*/
                currentOrder.stocks.forEach( ( currentItem ) => {
                    if( !currentItem.isProcessed ) {
                        let orderItem = order.stocks.find( s => s._id.toString() === currentItem._id.toString() );

                        if( orderItem && orderItem.checked ) {
                            currentItem.editorId = user.identityId;
                            currentItem.quantityDelivered = orderItem.quantityDelivered;
                            currentItem.stockLocationId = orderItem.stockLocationId;
                            currentItem.phPriceSale = parseFloat( orderItem.phPriceSale );
                            currentItem.phPriceCost = parseFloat( orderItem.phPriceCost );
                            currentItem.checked = true;
                            currentItem.isProcessed = true;
                        }
                    }
                } );

                [error, result] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        action: 'update',
                        model: 'stockdelivery',
                        query: {
                            $and: [
                                {_id: order._id},
                                {
                                    stocks: {
                                        $elemMatch: {
                                            isProcessed: false
                                        }
                                    }
                                }
                            ]
                        },
                        fields: [
                            'stocks.isProcessed', 'stocks.checked', 'stocks.quantityDelivered', 'stocks.editorId',
                            'stocks.phPriceSale', 'stocks.phPriceCost', 'stocks.stockLocationId'],
                        user,
                        data: currentOrder
                    } ) );

                if( error ) {
                    Y.log( `_approveOrderItems: Failed to update stockdelivery items ${error.stack || error}`, 'error', NAME );
                    throw error;
                }

                let stockIds = order.stocks.map( ( os ) => ObjectId( os._id ) );

                [error, actualOrder] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        action: 'aggregate',
                        model: 'stockdelivery',
                        pipeline: [
                            {
                                $match: {
                                    _id: new ObjectId( order._id )
                                }
                            },
                            {
                                $project: {
                                    _id: 1,
                                    orderNo: 1,
                                    basecontactId: 1,
                                    locationId: 1,
                                    orderId: 1,
                                    stocks: {
                                        $filter: {
                                            input: "$stocks",
                                            as: "st",
                                            cond: {
                                                $setIsSubset: [['$$st._id'], stockIds]
                                            }
                                        }
                                    }
                                }
                            },
                            {
                                $lookup: {
                                    from: 'instocks',
                                    localField: 'stocks.references',
                                    foreignField: "_id",
                                    as: 'stockItems'
                                }
                            },
                            {
                                $lookup: {
                                    from: 'activities',
                                    localField: 'orderId',
                                    foreignField: 'orderId',
                                    as: 'activities'
                                }
                            },
                            {
                                $project: {
                                    _id: 1,
                                    orderId: 1,
                                    orderNo: 1,
                                    stocks: {
                                        $map: {
                                            input: "$stocks",
                                            as: 'stock',
                                            in: {
                                                stockLocationId: '$$stock.stockLocationId',
                                                _id: '$$stock._id',
                                                quantityDelivered: '$$stock.quantityDelivered',
                                                basecontactId: '$basecontactId',
                                                locationId: '$locationId',
                                                editorId: '$$stock.editorId',
                                                phPriceSale: '$$stock.phPriceSale',
                                                phPriceCost: '$$stock.phPriceCost',
                                                references: '$$stock.references',
                                                activities: '$$stock.activities',
                                                stockItem: {
                                                    $arrayElemAt: [
                                                        {
                                                            $filter: {
                                                                input: "$stockItems",
                                                                as: "si",
                                                                cond: {
                                                                    $eq: ['$$si._id', '$$stock.references']
                                                                }
                                                            }
                                                        },
                                                        0
                                                    ]
                                                }
                                            }
                                        }
                                    },
                                    activities: {
                                        $map: {
                                            input: '$activities',
                                            as: 'activity',
                                            in: {
                                                _id: '$$activity._id',
                                                actType: '$$activity.actType',
                                                patientId: '$$activity.patientId',
                                                phPZN: '$$activity.phPZN',
                                                patientLastName: '$$activity.patientLastName',
                                                patientFirstName: '$$activity.patientFirstName',
                                                employeeName: '$$activity.employeeName',
                                                employeeId: '$$activity.employeeId'
                                            }
                                        }
                                    }
                                }
                            }
                        ],
                        user
                    } )
                );

                actualOrder = actualOrder.result || actualOrder;
                actualOrder = actualOrder[0];

                /* actual order.stocks.stockItem has instock items with the original stockLocation Id */
                /* Build query for getting items from instock with the stockLocationId from the order */
                let inStockQuery = actualOrder.stocks.map( actualOrderItem => {
                    return {
                        $and: [
                            {'phPZN': {$eq: actualOrderItem.stockItem.phPZN}},
                            {stockLocationId: ObjectId( actualOrderItem.stockLocationId )}
                        ]
                    };
                } );

                [error, stockResult] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        action: 'get',
                        model: 'instock',
                        query: {$or: inStockQuery},
                        user
                    } )
                );

                if( error ) {
                    Y.log( `_approveOrderItems: Failed to get instock items ${error || error}`, 'error', NAME );
                    throw error;
                }

                stockResult = stockResult.result || stockResult;

                /*Update instock items with new quantity,
                 or insert new one if item with current code and stocklocation did not exist*/
                for( const deliveryItem of actualOrder.stocks ) {
                    let stockItem = stockResult.find( stock => {
                        return stock.phPZN === deliveryItem.stockItem.phPZN && stock.stockLocationId.toString() === deliveryItem.stockLocationId.toString();
                    } );

                    // Array of activities to update the stockLocation and arrivedStatus on activities in the delivery
                    let activityIds;
                    if( deliveryItem.activities ) {
                        let activities = deliveryItem.activities;
                        activityIds = activities.map( act => act._id );
                    }

                    // If the stockLocationId on the stockItem is different from the stockLocationId on deliveryItem,
                    // the stockLocationId was updated in the deliveryModal
                    let previousStockLocationId;
                    if( deliveryItem.stockLocationId.toString() !== deliveryItem.stockItem.stockLocationId.toString() ) {
                        previousStockLocationId = deliveryItem.stockItem.stockLocationId;
                    }
                    // If there is a previousStockLocation - we update instock at NEW StockLocationId without changing the quantityOrdered
                    // We also need to get the previousItem and update the quantityOrdered on the previousItem
                    // If there is no previousStockLocationId - we also update quantityOrdered normally
                    if( previousStockLocationId ) {
                        let previousStockItem;
                        [error, previousStockItem] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                action: 'get',
                                model: 'instock',
                                query: {
                                    'phPZN': {$eq: deliveryItem.stockItem.phPZN},
                                    'stockLocationId': ObjectId( previousStockLocationId )
                                },
                                options: {
                                    select: {
                                        _id: 1,
                                        quantityOrdered: 1
                                    }
                                },
                                user
                            } )
                        );

                        if( error ) {
                            Y.log( `_approveOrderItems: Failed to get instock items at previous stockLocationId ${error || error}`, 'error', NAME );
                            throw error;
                        }

                        previousStockItem = previousStockItem.result || previousStockItem;
                        if( previousStockItem ) {
                            let quantityOrdered = (previousStockItem[0].quantityOrdered || 0) - (deliveryItem.quantityDelivered || 0);
                            await updateInStock( {
                                user: user,
                                query: {_id: ObjectId( previousStockItem[0]._id ) },
                                data: {
                                    'quantityOrdered': quantityOrdered
                                },
                                fields: ['quantityOrdered']
                            } );
                        }
                    }

                    if( activityIds && activityIds.length ) {
                        await updateOrderedActivities( {
                            user: user,
                            data: {
                                activityIds,
                                stockLocationId: deliveryItem.stockLocationId,
                                phPriceSale: deliveryItem.phPriceSale,
                                phPriceCost: deliveryItem.phPriceCost
                            }
                        } );
                    }

                    if( stockItem ) {
                        stockItem.quantity = stockItem.quantity + deliveryItem.quantityDelivered;
                        stockItem.phPriceSale = deliveryItem.phPriceSale || stockItem.phPriceSale;
                        stockItem.phPriceCost = deliveryItem.phPriceCost || stockItem.phPriceCost;
                        stockItem.quantityOrdered = !previousStockLocationId ? stockItem.quantityOrdered - deliveryItem.quantityDelivered : stockItem.quantityOrdered;

                        if( stockItem.isDivisible ) {
                            const activities = actualOrder.activities.filter( act => act.phPZN === stockItem.phPZN );
                            deliveryItem.dispensedQuantity = activities.length;
                        }

                        await updateInStock( {
                            user: user,
                            query: {_id: stockItem._id},
                            data: {
                                'quantity': stockItem.quantity,
                                'quantityOrdered': stockItem.quantityOrdered,
                                'phPriceSale': stockItem.phPriceSale,
                                'phPriceCost': stockItem.phPriceCost,
                                'supplierId': deliveryItem.basecontactId,
                                'isDeleted': false
                            },
                            fields: ['quantity', 'quantityOrdered', 'phPriceSale', 'phPriceCost', 'supplierId', 'isDeleted']
                        } );

                        // We also need to update the references since we had changed to different stocklocation and therefore item with different id
                        deliveryItem.references = ObjectId( stockItem._id );

                    } else {
                        /* Insert new item to instock */
                        let newStockItem = {
                            ...deliveryItem.stockItem,
                            supplierId: deliveryItem.basecontactId,
                            locationId: deliveryItem.locationId,
                            stockLocationId: deliveryItem.stockLocationId,
                            quantity: deliveryItem.quantityDelivered,
                            phPriceSale: deliveryItem.phPriceSale,
                            phPriceCost: deliveryItem.phPriceCost,
                            phPriceSaleCatalog: deliveryItem.phPriceSaleCatalog,
                            phPriceCostCatalog: deliveryItem.phPriceCostCatalog,
                            quantityOrdered: 0,
                            isDeleted: false
                        };

                        delete newStockItem._id;

                        newStockItem = Y.doccirrus.filters.cleanDbObject( newStockItem );
                        [error, result] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                action: 'post',
                                model: 'instock',
                                user,
                                data: newStockItem
                            } )
                        );

                        if( error ) {
                            Y.log( `_approveOrderItemsFailed to update instock(insert new item) ${error.stack || error}`, 'error', NAME );
                            throw  error;
                        }

                        /*Push new stockItem to stockResult*/
                        if( result.length ) {
                            newStockItem._id = ObjectId( result[0] );
                            stockResult.push( newStockItem );
                            deliveryItem.references = ObjectId( result[0] );
                        }

                        if( deliveryItem.stockItem && deliveryItem.stockItem.isDivisible ) {
                            const activities = actualOrder.activities.filter( act => act.phPZN === deliveryItem.stockItem.phPZN );
                            deliveryItem.dispensedQuantity = activities.length;
                        }
                    }

                    // We also need to update the references in the delivery to reference the changed StockLocationId
                    if( previousStockLocationId && deliveryItem.references ) {
                        [error, result] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                action: 'update',
                                model: 'stockdelivery',
                                query: {
                                    $and: [
                                        {_id: ObjectId( actualOrder._id )},
                                        {
                                            stocks: {
                                                $elemMatch: {
                                                    _id: ObjectId( deliveryItem._id )
                                                }
                                            }
                                        }
                                    ]
                                },
                                fields: ['stocks.references'],
                                user,
                                data: {
                                    $set: {
                                        'stocks.$.references': deliveryItem.references
                                    }
                                }
                            } ) );

                        if( error ) {
                            Y.log( `_approveOrderItems: Failed to update references in stockdelivery items ${error.stack || error}`, 'error', NAME );
                            throw error;
                        }
                    }
                }

                /* Update instock items at other StockLocations with new prices */
                // Build query for getting items from instock
                // Get the phPZN of each item in the order
                let inStockQueryPrices = actualOrder.stocks.map( orderItem => orderItem.stockItem.phPZN );
                // Find instocks with same phPZN
                [error, inStockResult] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        action: 'get',
                        model: 'instock',
                        query: {phPZN: {$in: inStockQueryPrices}},
                        user
                    } )
                );

                if( error ) {
                    Y.log( `_approveOrderItems: Failed to get instock items for price change ${error || error}`, 'error', NAME );
                    throw error;
                }

                inStockResult = inStockResult.result || inStockResult;

                for( const stockItem of inStockResult ) {
                    // Check the actual order for an item matching the items in Instock
                    let actualOrderItem = actualOrder.stocks.find( item => {
                        return item.stockItem.phPZN === stockItem.phPZN;
                    } );

                    if( actualOrderItem ) {
                        stockItem.phPriceSale = actualOrderItem.phPriceSale;
                        stockItem.phPriceCost = actualOrderItem.phPriceCost;
                    }

                    [error, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        action: 'update',
                        model: 'instock',
                        query: {_id: stockItem._id},
                        fields: ['phPriceSale', 'phPriceCost'],
                        user,
                        data: {'phPriceSale': stockItem.phPriceSale, 'phPriceCost': stockItem.phPriceCost}
                    } ) );

                    if( error ) {
                        Y.log( `_approveOrderItems: Failed to update instock ${error.stack || error}`, 'error', NAME );
                        throw error;
                    }
                }
                await _notifyDispensingDoctor();

                return {};

                async function _notifyDispensingDoctor() {
                    const activities = actualOrder.activities || [],
                        createTaskPromise = promisifyArgsCallback( Y.doccirrus.api.task.createTasksForActivities );

                    if( activities.length < 1 ) {
                        return;
                    }

                    const patients = activities.reduce( function( storage, activity ) {
                        const patient = storage.find( p => p._id === activity.patientId );
                        if( !patient ) {
                            storage.push( {
                                _id: activity.patientId,
                                employeeId: activity.employeeId,
                                employeeName: activity.employeeName,
                                name: `${activity.patientFirstName} ${activity.patientLastName}`,
                                activities: [
                                    {
                                        _id: new ObjectId( activity._id ),
                                        actType: activity.actType
                                    }]
                            } );
                        } else {
                            patient.activities.push( {
                                _id: new ObjectId( activity._id ),
                                actType: activity.actType
                            } );
                        }
                        return storage;
                    }, [] );
                    for( const patient of patients ) {
                        const taskDescription = Y.Lang.sub( Y.doccirrus.i18n( 'InStockMojit.messages.dispensedArticlesArrived' ), {
                                patientName: patient.name,
                                orderNo: actualOrder.orderNo
                            } ),
                            title = Y.doccirrus.i18n( 'InStockMojit.title.articlesArrived' );

                        [error] = await formatPromiseResult( createTaskPromise( {
                            user,
                            data: {
                                tasksCount: 'SINGLE',
                                taskData: {
                                    roles: [Y.doccirrus.schemas.role.DEFAULT_ROLE.INSTOCK],
                                    alertTime: new Date().toISOString(),
                                    title: title,
                                    patientId: patient._id,
                                    employeeId: patient.employeeId,
                                    patientName: patient.name,
                                    employeeName: patient.employeeName,
                                    urgency: 1,
                                    details: taskDescription,
                                    activities: patient.activities
                                }
                            }
                        } ) );
                        if( error ) {
                            Y.log( `approveOrderItems: Failed to create task after approving delivery items. Error:\n${error.stack || error}`, 'error', NAME );
                        }
                    }
                }
            }

            function _getStockDeliveryLock() {
                return new Promise( ( resolve, reject ) => {
                    Y.doccirrus.schemas.sysnum.getStockDeliveryLock( user, ( err, getLock ) => {
                        if( err ) {
                            Y.log( `Error getting Stock Delivery lock ${err.message}`, 'error', NAME );
                            return reject( err );
                        }

                        if( true !== getLock ) {
                            return reject( Y.doccirrus.errorTable.getMessage( {code: 'instockMojit_15'} ) );
                        }

                        resolve( null );
                    } );
                } );
            }

            function _getInStockLock() {
                return new Promise( ( resolve, reject ) => {
                    Y.doccirrus.schemas.sysnum.getInstockLock( user, ( err, getLock ) => {
                        if( err ) {
                            Y.log( `Error getting InStock lock ${err.message}`, 'error', NAME );
                            return reject( err );
                        }

                        if( true !== getLock ) {
                            return reject( Y.doccirrus.errorTable.getMessage( {code: 'instockMojit_01'} ) );
                        }

                        resolve( null );
                    } );
                } );
            }
        }

        /**
         * Update isArrived property for arrived medications
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Array} args.fields
         * @param {Object} args.data
         * @returns {Promise.<{}>}
         * @private
         */
        async function updateInStock( args ) {
            Y.log( 'Entering Y.doccirrus.api.stockdelivery.updateInStock', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.stockdelivery.updateInStock' );
            }
            const {user, query, fields, data} = args;
            let error;

            [error] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                action: 'update',
                model: 'instock',
                query,
                fields,
                user,
                data
            } ) );

            if( error ) {
                Y.log( `_approveOrderItems: Failed to update instock ${error.stack || error}`, 'error', NAME );
                return handleResult( error, null, args.callback );
            }

            return handleResult( null, {}, args.callback );
        }

        /**
         * Update isArrived property for arrived medications
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @returns {Promise.<{}>}
         * @private
         */
        async function updateOrderedActivities( args ) {
            Y.log( 'Entering Y.doccirrus.api.stockdelivery._updateOrderedActivities', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.stockdelivery.updateOrderedActivities' );
            }
            const {user, data: {activityIds, stockLocationId, phPriceSale, phPriceCost}} = args;
            let error;

            [error] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                action: 'update',
                model: 'activity',
                query: {_id: {$in: activityIds}},
                fields: ['isArrived', 's_extra', 'phPriceCost', 'phPriceSale'],
                user,
                data: {
                    isArrived: true,
                    s_extra: {
                        stockLocationId
                    },
                    phPriceCost,
                    phPriceSale
                },
                options: {
                    multi: true
                }
            } ) );

            if( error ) {
                Y.log( `_approveOrderItems: Failed to get  activites ${error.stack || error}`, 'error', NAME );
                return handleResult( error, null, args.callback );
            }

            [error] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                action: 'update',
                model: 'activity',
                query: {_id: {$in: activityIds}},
                fields: ['isArrived'],
                user,
                data: {isArrived: true},
                options: {
                    multi: true
                }
            } ) );

            if( error ) {
                Y.log( `_approveOrderItems: Failed to update activity isOrdered  ${error.stack || error}`, 'error', NAME );
                return handleResult( error, null, args.callback );
            }

            return handleResult( null, {}, args.callback );
        }

        /**
         * Change delivery status to archived
         * @method archiveOrder
         * @param {Object} args
         * @param {Function} args.callback is called with 2 args:
         *  {Object} err
         *  {Object || null} result
         */
        async function archiveOrder( args ) {
            Y.log( 'Entering Y.doccirrus.api.stockdelivery.archiveOrder', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.stockdelivery.archiveOrder' );
            }
            let {callback, data, user} = args,
                error, result, stockDelivery, notProcessedStock;

            [error, stockDelivery] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    action: 'get',
                    model: 'stockdelivery',
                    query: {
                        $and: [
                            {_id: data._id},
                            {status: orderStatuses.closed}
                        ]
                    },
                    user
                } )
            );

            if( error ) {
                Y.log( `Failed to get stockdelivery ${error.stack || error}`, 'error', NAME );
                return handleResult( error, null, callback );
            }

            stockDelivery = stockDelivery.result || stockDelivery;

            if( stockDelivery.length ) {
                stockDelivery = stockDelivery[0];
            }

            notProcessedStock = stockDelivery.stocks.find( s => !s.isProcessed );

            if( notProcessedStock ) {
                return handleResult(
                    Y.doccirrus.errors.rest( 'instockMojit_18' ),
                    null,
                    callback
                );
            }

            if( error ) {
                Y.log( `Failed to get  stock deliveries ${error.stack || error}`, 'error', NAME );
                return handleResult( error, null, callback );
            }

            args.data = stockDelivery;
            args.data.status = orderStatuses.archived;
            try {
                result = await _updateStatus( args );
            } catch( err ) {
                Y.log( `Failed to archive delivery ${err.stack || err}`, 'error', NAME );
                return handleResult( error, null, callback );
            }

            _emitEventForAll( 'statusChangeOrdersAction', 'update' );
            _emitEventForAll( 'statusChangeDeliveryAction', 'update' );
            _emitEventForAll( 'stockDeliveryAction', 'update' );
            return handleResult( error, result, callback );
        }

        function _emitEventForAll( event, action ) {
            Y.doccirrus.communication.emitEventForAll( {
                event: event,
                msg: {
                    data: {
                        action: action
                    }
                }
            } );
        }

        /**
         * Updates status and set one of :dateSent,dateArchived,dateArrived field can set status only for one stockDelivery object
         * @method _updateStatus
         * @param {Object} args
         * @param {Object} args.data._id
         * @param {Function} args.callback is called with 2 args:
         *  {Object} err
         *  {Object || null} result
         */
        async function _updateStatus( args ) {
            Y.log( 'Entering Y.doccirrus.api.stockdelivery._updateStatus', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.stockdelivery._updateStatus' );
            }
            let
                {user, data = {}} = args,
                error, statusError, previousState, dateField, delivery, result;

            [statusError, delivery, previousState, dateField] = defineStatus( data );

            if( statusError ) {
                throw statusError;
            }

            if( !previousState ) {
                throw new Y.doccirrus.commonerrors.DCError( 400, {message: Y.doccirrus.errorTable.getMessage( {code: 'instockMojit_16'} )} );
            }

            delivery = Y.doccirrus.filters.cleanDbObject( delivery );
            let
                fields = ['status'];

            if( dateField ) {
                fields.push( dateField );
            }

            [error, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    action: 'put',
                    model: 'stockdelivery',
                    query: {
                        $and: [
                            {_id: delivery._id},
                            {status: previousState}
                        ]
                    },
                    fields,
                    user,
                    data: delivery
                } ) );

            result = result.result ? result.result : result;

            if( error ) {
                throw  error;
            }

            if( result.length === 0 ) {
                throw new Y.doccirrus.commonerrors.DCError( 400, {message: Y.doccirrus.errorTable.getMessage( {code: 'instockMojit_17'} )} );
            }

            return result;
        }

        /**
         * Insert delivery items (stocks), only if delivery is in 'arrived' status
         * @method updateOrder
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data._id - delivery id
         * @param {Object} args.stocks - array of Stocks_T items
         * @param {Function} args.callback is called with 2 args:
         *  {Object} err
         *  {Object || null} result
         */
        async function addDeliveryItems( args ) {
            Y.log( 'Entering Y.doccirrus.api.stockdelivery.addDeliveryItems', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.stockdelivery.addDeliveryItems' );
            }
            const
                {user, callback, options = {}} = args;
            let error, result, {data = {}} = args;

            data = Y.doccirrus.filters.cleanDbObject( data );

            [error, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                action: 'put',
                model: 'stockdelivery',
                query: {
                    $and: [
                        {_id: data._id},
                        {status: orderStatuses.arrived}
                    ]
                },
                fields: ['stocks'],
                user,
                data,
                options
            } ) );

            if( error ) {
                Y.log( `Failed to add delivery item ${error.stack || error}`, 'error', NAME );
                return handleResult( error, null, callback );
            }

            if( result.length === 0 ) {
                return handleResult(
                    new Y.doccirrus.commonerrors.DCError( 400, {
                        message: Y.doccirrus.errorTable.getMessage( {code: 'instockMojit_19'} )
                    } ),
                    null,
                    callback
                );
            }

            _emitEventForAll( 'stockDeliveryAction', 'update' );
            return handleResult( error, result, callback );
        }

        /**
         * @class stockdelivery
         * @namespace doccirrus.api
         * @main
         */
        Y.namespace( 'doccirrus.api' ).stockdelivery = {
            /**
             * @property name
             * @type {String}
             * @default stockdelivery-api
             * @protected
             */
            name: NAME,
            getDeliveries,
            createDeliveryFromOrder,
            approveOrderItems,
            archiveOrder,
            addDeliveryItems,
            updateOrderedActivities
        };

    },
    '0.0.1', {
        requires: [
            'doccirrus',
            'dccommunication',
            'stockdelivery-schema',
            'stockorders-schema',
            'stockorders-api',
            'stockorders-schema'
        ]
    }
);

