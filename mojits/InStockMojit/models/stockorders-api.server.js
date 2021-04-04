/*jshint esnext:true */
/*global YUI */


YUI.add( 'stockorders-api', function( Y, NAME ) {
        const
            {formatPromiseResult, promisifyArgsCallback, handleResult} = require( 'dc-core' ).utils,
            ObjectId = require( 'mongoose' ).Types.ObjectId,
            orderStatuses = Y.doccirrus.schemas.stockorders.stockStatuses,
            http = require( 'https' ),
            parseString = require( 'xml2js' ).parseString,
            moment = require( 'moment' );

        /**
         * @module stockorders-api
         */

        /**
         * returns list of orders with list of stock items for each order
         * @method getOrders
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Function} args.callback is called with 2 args:
         *  {Object} err
         *  {Object || null} result
         */
        async function getOrders( args ) {
            Y.log( 'Entering Y.doccirrus.api.stockorders.getOrders', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.stockorders.getOrders' );
            }

            const {options = {}, query = {}, callback} = args;

            let
                err,
                result,
                orders = [];
            try {
                if( query._id ) {
                    query._id = new ObjectId( query._id );
                }
                /*Convert to ObjectId properties defined by convertToObjectIdConfig*/
                if( query.convertToObjectIdConfig ) {
                    let property = query;
                    (query.convertToObjectIdConfig || []).forEach( propertyConfig => {
                        propertyConfig.forEach( ( selector, index ) => {
                            if( index === propertyConfig.length - 1 ) {
                                property[selector] = new ObjectId( property[selector] );
                            } else {
                                property = property[selector];
                            }
                        } );
                    } );
                }

                if( query.$and ) {
                    query.$and.forEach( (i) => {
                        if( i.dateCreated ) {
                            i.dateCreated.$gte = new Date( i.dateCreated.$gte );
                            i.dateCreated.$lte = new Date( i.dateCreated.$lte );
                        }
                    });
                }

            } catch ( error ) {
                Y.log( `getOrders:Failed to convert _id to Object Id, ${error.stack || error}`, 'error', NAME );
                return handleResult(  Y.doccirrus.errors.rest( 1005 ), null, callback );
            }

            delete query.convertToObjectIdConfig;

            [err, orders] = await formatPromiseResult( _getOrders( query ) );
            if( err ){
                Y.log( `getOrders: error getting orders ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }
            [err, orders] = await formatPromiseResult( _extendByPatients( orders ) );
            if( err ){
                Y.log( `getOrders: error extending patients ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }
            [err, orders] = await formatPromiseResult( _extendByBaseContacts( orders ) );
            if( err ){
                Y.log( `getOrders: error extendinf base contacts ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            return handleResult( null, orders, callback );

            async function _getOrders( query ) {
                let
                    objFieldQuery = {};

                Object.keys( query ).forEach( key => {
                    let keyParts = key.split('.');
                    if( keyParts && keyParts.length > 1 ){
                        objFieldQuery[key] = query[key];
                        delete query[key];
                    }
                });

                let pipeline = [
                    {
                        $match: Object.keys( query ).length ? query : {_id: {$exists: true}}
                    },
                    {
                        $match: { stocks: {$not: {$size: 0 } } }
                    },
                    // {
                    //     "$unwind": {
                    //         "path":"$stocks",
                    //         "preserveNullAndEmptyArrays": false
                    //     }
                    // },
                    // {
                    //     "$addFields": { "stocks.patientsLen": { "$size": "$stocks.patients"}}
                    // },
                    // {
                    //     "$lookup": {
                    //         "from": "patients",
                    //         "let": { "ids": "$stocks.patients", "patientsLen": "$stocks.patientsLen" },
                    //         "pipeline": [{
                    //             "$match": {
                    //                 "$expr": {
                    //                     "$and":
                    //                         [
                    //                             { "$ne": [ "$$patientsLen", 0 ] },
                    //                             { "$in": ["$_id", "$$ids"] },
                    //                         ]
                    //                 }
                    //             }
                    //         }, {
                    //             "$project": {
                    //                 "_id": 1,
                    //                 "firstname": 1,
                    //                 "lastname": 1
                    //
                    //             }
                    //         }
                    //         ],
                    //         "as": "stocks.patients"
                    //     }
                    // },
                    // {
                    //     "$group": {
                    //         "_id": "$_id",
                    //         "newStocks": {
                    //             "$push": "$stocks"
                    //         },
                    //         "doc": {
                    //             "$first": "$$ROOT"
                    //         }
                    //     }
                    // },
                    // {
                    //     "$addFields": {
                    //         "doc.stocks": "$newStocks"
                    //     }
                    // },
                    // {
                    //     "$replaceRoot": {
                    //         "newRoot": "$doc"
                    //     }
                    // },
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
                            from: 'identities',
                            localField: 'editorId',
                            foreignField: '_id',
                            as: 'lastEditor'
                        }
                    },
                    {
                        $unwind: {
                            path: "$lastEditor",
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
                        $project: {
                            _id: 1,
                            basecontactId: 1,
                            dateCreated: 1,
                            dateSent: 1,
                            dateArchived: 1,
                            dateArrived: 1,
                            editors: 1,
                            formId: 1,
                            lastEditor: {
                                _id: '$lastEditor._id',
                                lastname: '$lastEditor.lastname',
                                firstname: '$lastEditor.firstname'
                            },
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
                            electronicData: 1,
                            stocks: {
                                $map: {
                                    input: "$stocks",
                                    as: 'stock',
                                    in: {
                                        checked: '$$stock.checked',
                                        quantity: '$$stock.quantity',
                                        references: '$$stock.references',
                                        stockLocationId: '$$stock.stockLocationId',
                                        quantityDelivered: '$$stock.quantityDelivered',
                                        stockType: '$$stock.stockType',
                                        patients: '$$stock.patients',
                                        phPriceSale: '$$stock.phPriceSale',
                                        phPriceSaleCatalog: '$$stock.phPriceSaleCatalog',
                                        totalStockPrice: {$multiply: ['$$stock.quantity', "$$stock.phPriceSale"]},
                                        phPriceCost: '$$stock.phPriceCost',
                                        phPriceCostCatalog: '$$stock.phPriceCostCatalog',
                                        nota: '$$stock.nota',
                                        phPZN: '$$stock.phPZN',
                                        activities: '$$stock.activities',
                                        dividedQuantity: '$$stock.dividedQuantity',
                                        _id: '$$stock._id',
                                        /*Extend by object from inStock, provide fields from InStocl*/
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
                    },
                    {
                        $addFields: {
                            totalOrderedPrice: {$sum: "$stocks.totalStockPrice"}
                        }
                    }
                ];

                if( Object.keys(objFieldQuery).length ){
                    pipeline.push( {$match: objFieldQuery});
                }
                pipeline.push( { $sort: {_id: -1} } );

                let [err, result] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: args.user,
                        action: 'aggregate',
                        pipeline: pipeline.slice(),
                        model: 'stockorders',
                        options
                    } ) );
                if( err ) {
                    throw err;
                }

                let _orders = result.result ? result.result : result,
                    count = result.count || 0;
                return { count, query:{}, result: _orders };
            }

            /*
             Extends results by supplier contact
             */
            async function _extendByBaseContacts( ordersResult ) {
                let
                    contacts,
                    orders = ordersResult.result;

                if( !orders.length ) {
                    return ordersResult;
                }

                let baseContactsIds = orders.map( order => order.basecontactId );

                [err, result] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: args.user,
                        model: 'basecontact',
                        action: 'get',
                        query: {_id: {$in: baseContactsIds}}
                    } ) );

                if( err ) {
                    throw err;
                }

                contacts = result.result ? result.result : result;

                if( !contacts.length ) {
                    return ordersResult;
                }

                ordersResult.result = orders.map( order => {
                    order.supplier = (contacts.find( contact => contact._id.toString() === order.basecontactId ) || {});
                    return order;
                } );
                return ordersResult;
            }

            async function _extendByPatients( ordersResult ) {
                let
                    orders = ordersResult.result;

                if( !orders.length ) {
                    return ordersResult;
                }

                let patientIds = [];
                orders.forEach( order => {
                    (order.stocks || []).forEach( stock => {
                        patientIds = [...patientIds, ...(stock.patients || []) ];
                    } );
                } );

                if( !patientIds.length ) {
                    return ordersResult;
                }

                let [err, patients] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: args.user,
                        model: 'patient',
                        action: 'get',
                        query: {_id: {$in: patientIds}},
                        options: { select: {firstname: 1, lastname: 1}}
                    } )
                );

                if( err ) {
                    throw err;
                }

                if( !patients.length ) {
                    return ordersResult;
                }

                orders.forEach( order => {
                    (order.stocks || []).forEach( stock => {
                        if( stock.patients.length ){
                            let ids = stock.patients.map( el => el.toString() );
                            stock.patients = patients.filter( patient => ids.includes( patient._id.toString() ) );
                        }
                    } );
                } );
                return ordersResult;
            }
        }

        /**
         * Save order, if order contains stocks where stockType === medicationscatalog, that stocks will be
         * inserted to inStock, if item with same phPZN and stockLocationId are not existed, else stock.reference property
         * will be changed to value from Instock
         * @method saveOrders
         * @param {Object} args
         * @param {Object} args.data - instock order
         * @param {Object} args.data.basecontactId - _id of supplier contact
         * @param {Object} args.data.formId - order form template _id
         * @param {Object} args.data.locationId
         * @param {Object} args.data.stocks - stock items
         * @param {Object} args.data.stocks.references - reference to InStock or medication catalog
         * @param {Object} args.data.stocks.stockType - source of item, values : StockTypes_E
         * @param {Object} args.quantity - ordered quantity
         */
        async function saveOrder( args ) {
            Y.log( 'Entering Y.doccirrus.api.stockorders.saveOrder', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.stockorders.saveOrder' );
            }
            const
                {user, data = {}, callback, options = {}} = args;
            let
                error, order = data, result, orderNo;



            // count dividedQuantity for all divisible items
            order.stocks.forEach(stock => {
                if(stock.isDivisible && !stock.dividedQuantity) {
                    stock.dividedQuantity = stock.quantity * stock.phPackSize;
                }
                delete stock.phPackSize;
            });
            try {
                order = await _insertItemsFromCatalogToInStock( order, user );
            } catch( err ) {
                return handleResult( err, null, callback );
            }

            try {
                order = await _checkInStockReferences( order, user );
            } catch( err ) {
                return handleResult( err, null, callback );
            }

            order.editorId =  user.identityId; //Set last editor

            /*Validate order items and set default value of quantityDelivered*/
            for( let stockItem of order.stocks ) {
                if( stockItem.checked || stockItem.editorId ) {
                    error = new Y.doccirrus.commonerrors.DCError( 400, {message: Y.doccirrus.errorTable.getMessage( {code: 'instockMojit_05'} )} );
                }
                stockItem.quantityDelivered = stockItem.quantity;
            }

            try {
                orderNo = await  Y.doccirrus.api.stockordersrequest.getOrderNo(user);
            } catch (err) {
                Y.log( `Failed to next order number ${error.stack || error}`, 'error', NAME );
                return handleResult( error, null, callback );
            }

            order.orderNo = orderNo;

            [error, order] = _defineStatus( order );

            if( error ) {
                return handleResult( error, null, callback );
            }

            order = Y.doccirrus.filters.cleanDbObject( order );

            [error, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    action: 'post',
                    model: 'stockorders',
                    user,
                    data: order,
                    options
                } ) );

            if( error ) {
                Y.log( `Failed to save order: ${error.stack || error}`, 'warn', NAME );
                return handleResult( error, null, callback );
            }

            _sendStockOrdersUpdateEvent( 'statusChangeOrdersAction', 'create' );
            return handleResult( null, result, callback );
        }

        /**
         * get next order number
         */
        /*Get next order number*/
        async function getOrderNo( user ) {
            let err, nextNumber, dcCustomerNo;

            [err, dcCustomerNo] = await formatPromiseResult(
                Y.doccirrus.api.practice.getDCCustomerNo( user )
            );

            if( err ) {
                Y.log( `orderNumber: Failed to get getDCCustomerNo, user: ${user}`, 'error', NAME );
                throw err;
            }

            [err, nextNumber] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                Y.doccirrus.schemas.sysnum.getNextOrderNo( user, ( err, nextNumber ) => {
                    if( err ) {
                        return reject( err );
                    }

                    return resolve( nextNumber.number );
                } );
            } ) );

            if( err ) {
                Y.log( `orderNumber: Failed to get next order number, user: ${user}`, 'error', NAME );
                throw  err;
            }

            return `${dcCustomerNo}-${nextNumber}`;
        }

        /**
         * Create stock order without stocks
         * @param {Object}  args
         * @param {String} args.locationId
         * @returns {Promise.<*>}
         */
        async  function createEmptyOrder( args ) {
            Y.log( 'Entering Y.doccirrus.api.stockorders.createEmptyOrder', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.stockorders.createEmptyOrder' );
            }
            const {user, callback, data: {locationId}} = args,
                readBaseContactRead = promisifyArgsCallback( Y.doccirrus.api.basecontact.get );
            let err, supplier, formId, emptyOrder;

            [err, supplier] = await formatPromiseResult( readBaseContactRead( {
                user,
                query: {
                    isMainSupplier: true
                },
                options: {
                    lean: true,
                    limit: 1
                }
            } ) );

            if( err ) {
                Y.log( `createEmptyOrder: Failed to get supplier: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            supplier = supplier.results ? supplier.results[0] : supplier[0];

            if( !supplier ) {
                Y.log( `createEmptyOrder: main supplier is not set`, 'warn', NAME );

                return handleResult(   new Y.doccirrus.commonerrors.DCError( 400, {
                    message: Y.doccirrus.errorTable.getMessage( {
                        code: 'instockMojit_31'
                    } )
                } ), null, callback );
            }

            if( !supplier.defaultFormId ) {
                [err, formId] = await  formatPromiseResult( new Promise( ( resolve, reject ) => {
                    Y.dcforms.getConfigVar( '', 'instock-order', false, ( err, formId ) => {
                        if( err ) {
                            reject( err );
                        } else {
                            resolve( formId );
                        }
                    } );

                } ) );

                if( err ) {
                    Y.log( `createEmptyOrder: failed to get formId ${err.stack || err}`, 'error', NAME );
                    handleResult( err, null, callback );
                }
            } else {
                formId = supplier.defaultFormId;
            }

            let newOrder = {
                basecontactId: supplier._id,
                formId,
                locationId,
                stocks: []
            };

            [err, emptyOrder] = await  formatPromiseResult(
                saveOrder( {
                    user: user,
                    data: newOrder
                } )
            );

            if( err ) {
                Y.log( `createEmptyOrder: failed to crete emty order ${err.stack || err}`, 'error', NAME );
               return handleResult( err, null, callback );
            }

            if (emptyOrder && emptyOrder.length) {
                [err, emptyOrder] = await  formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        action: 'get',
                        model: 'stockorders',
                        user,
                        query: {_id: emptyOrder[0]}
                    } )
                );
            }

            if( err ) {
                Y.log( `createEmptyOrder: failed to get new empty order ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            return handleResult(null , emptyOrder, callback);
        }

        /**
         * Checks all items added from medication catalog if it is existed in istock, if yes then set order.stocks.references to instock id,
         * else inserts items into InStock and link order.stocks to them
         * @param {Object} order
         * @param {Object} order.basecontactId - _id of supplier contact
         * @param {Object} order.formId - order form template _id
         * @param {Object} order.locationId
         * @param {Object} order.stocks - stock items
         * @param {Object} order.stocks.references - reference to InStock or medication catalog
         * @param {Object} order.stocks.stockType - source of item, values : StockTypes_E
         * @param {Object} order.quantity - ordered quantity
         * @param {Object} user
         * @returns {Promise.<*>}
         * @private
         */
        async function _insertItemsFromCatalogToInStock( order, user ) {
            Y.log( 'Entering Y.doccirrus.api.stockorders._insertItemsFromCatalogToInStock', 'info', NAME );
            let
                error, locations, location, catalogItems, existedInStockItems,
                indexCatalogRefMap, itemsFromCatalog, newInStockItems;

            /*Get items which added from catalog*/
            indexCatalogRefMap = {};
            itemsFromCatalog = order.stocks.filter( ( s, index ) => {
                if( s.stockType === "medicationscatalog" ) {
                    indexCatalogRefMap[s.references.toString()] = index;
                    return true;
                }
                return false;
            } );

            if( !itemsFromCatalog.length ) {
                return order;
            }

            let catalogReferences = itemsFromCatalog.map( ( s ) => {
                return s.references;
            } );

            /*Get location and set first stockLocation for items from catalog*/
            [error, locations] = await  formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'location',
                    action: 'get',
                    query: {_id: {$eq: order.locationId}},
                    options: {
                        lean: true
                    }
                } ) );

            if( error ) {
                Y.log( `_insertItemsFromCatalogToInStock:Failed to create order. Could not get locations ${error.stack || error}`, 'error', NAME );
                throw  new Y.doccirrus.commonerrors.DCError( 500, Y.doccirrus.errorTable.getMessage( {code: "instockMojit_20"} ) );
            }

            location = locations[0];

            if( location && location.stockLocations && !location.stockLocations.length || (location && !location.stockLocations) ) {
                throw  new Y.doccirrus.commonerrors.DCError( 400, {message: Y.doccirrus.errorTable.getMessage( {code: "instockMojit_21"} )} );
            }

            [error, catalogItems] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: Y.doccirrus.auth.getSUForLocal(),
                model: 'medicationscatalog',
                action: 'get',
                query: {_id: {$in: catalogReferences}},
                options: {
                    lean: true
                }
            } ) );

            if( error ) {
                Y.log( `_insertItemsFromCatalogToInStock: Failed to create order. Could not get data from medicationscatalog ${error.stack || error}`, 'error', NAME );
                throw new Y.doccirrus.commonerrors.DCError( 500, {code: "instockMojit_20 "} );
            }

            catalogItems = catalogItems.result || catalogItems;
            //Map merge catalog item and order to instock format
            catalogItems = catalogItems.map( ci => {
                const orderItem = itemsFromCatalog.find(item => item.references.toString() === ci._id.toString());
                return {
                    phPZN: ci.phPZN,
                    gtinCode: ci.code,
                    prdNo: ci.prdNo,
                    description: ci.phDescription,
                    phPriceSale: ci.phPriceSale,
                    phPriceCost: ci.phPriceCost,
                    phPriceSaleCatalog: ci.phPriceSale,
                    phPriceCostCatalog: ci.phPriceCost,
                    locationId: order.locationId,
                    stockLocationId: location.stockLocations[0],
                    supplierId: order.basecontactId,
                    vatType: ci.vatType,
                    vat: Y.doccirrus.schemas.instock.getVatByVatType( ci.vatType ),
                    quantityOrdered: 0,
                    notes: orderItem.notes || " ",
                    ref: ci._id.toString(),
                    phPackSize: ci.phPackSize,
                    supplyCategory: ci.supplyCategory,
                    phUnit: ci.phUnit,
                    articleCategory: ci.articleCategory,
                    isDivisible: orderItem.isDivisible || ci.isDivisible || false,
                    ingredients: ( ci.phIngr || [] ).map( ( ingredient ) => {
                        return ingredient.name;
                    })
                };
            } );

            for( let catalogItem of catalogItems ) {
                // catalogItem - with stocklocation [0]
                // order which already has a defined stockLocation
                [error, existedInStockItems] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        action: 'get',
                        model: 'instock',
                        user,
                        query: {
                            phPZN: catalogItem.phPZN,
                            stockLocationId: catalogItem.stockLocationId
                        },
                        options: {
                            lean: true
                        }
                    } )
                );

                if( error ) {
                    Y.log( `_insertItemsFromCatalogToInStock: Failed to create order.Could not get data from instock ${error.stack || error}`, 'error', NAME );
                    throw new Y.doccirrus.commonerrors.DCError( 500, {code: "instockMojit_20"} );
                }

                /*Link order item to existed item from instock*/
                if( existedInStockItems.length ) {
                    order.stocks.forEach( ( stock ) => { // eslint-disable-line no-loop-func
                        if( stock.references.toString() === catalogItem.ref ) {
                            stock.references = existedInStockItems[0]._id;
                            stock.stockLocationId = stock.stockLocationId || existedInStockItems[0].stockLocationId;
                            stock.phPriceSale = existedInStockItems[0].phPriceSale;
                            stock.phPriceCost = existedInStockItems[0].phPriceCost;
                            stock.isDivisible = existedInStockItems[0].isDivisible;
                            stock.stockType = "instock";
                        }
                    } );

                } else {
                    /*Insert item from catalog to instock*/
                    catalogItem = Y.doccirrus.filters.cleanDbObject( catalogItem );
                    [error, newInStockItems] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            action: 'post',
                            model: 'instock',
                            user,
                            data: catalogItem
                        } )
                    );

                    if( error ) {
                        Y.log( `_insertItemsFromCatalogToInStock: Failed to create order. Failed to put new items into instock ${error.stack || error}`, 'error', NAME );
                        throw new Y.doccirrus.commonerrors.DCError( 500, {code: "instockMojit_23"} );
                    }

                    order.stocks.forEach( ( stock ) => { // eslint-disable-line no-loop-func
                        if( stock.references.toString() === catalogItem.ref ) {
                            stock.references =  new ObjectId( newInStockItems[0] );
                            stock.stockLocationId = stock.stockLocationId || location.stockLocations[0]._id;
                            stock.stockType = "instock";
                        }
                    } );
                }
            }

            return order;
        }

        /**
         * Checks if stock references of items added from instock have the same stockLocationId as the stockLocationId in the ordered items
         * else correct the reference id or inserts new items to InStock and link order.stocks to them
         * @param {Object} order
         * @param {Object} user
         * @returns {Promise.<*>}
         * @private
         */
        async function _checkInStockReferences( order, user ) {
            Y.log( 'Entering Y.doccirrus.api.stockorders._insertItemsFromCatalogToInStock', 'info', NAME );
            let
                error, newInstockItem, instockResult, indexCatalogRefMap, orderItemsFromInstock;

            /*Get items which added from catalog*/
            indexCatalogRefMap = {};
            orderItemsFromInstock = order.stocks.filter( ( s, index ) => {
                if( s.stockType === "instock" ) {
                    indexCatalogRefMap[s.references.toString()] = index;
                    return true;
                }
                return false;
            } );

            if( !orderItemsFromInstock.length ) {
                return order;
            }

            for( let orderItem of orderItemsFromInstock ) {
                [error, instockResult] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        action: 'get',
                        model: 'instock',
                        query: {
                            phPZN: orderItem.phPZN,
                            stockLocationId: ObjectId( orderItem.stockLocationId )
                        },
                        user,
                        options: {
                            select: {
                                _id: 1
                            },
                            limit: 1
                        }
                    } )
                );

                if( error ) {
                    Y.log( `_checkInStockReferences: Failed to get item from inStock. ${error.stack || error}`, 'error', NAME );
                    throw new Y.doccirrus.commonerrors.DCError( 500, {code: "instockMojit_20 "} );
                }

                instockResult = instockResult.result || instockResult;

                // Compare if the references id is the same as the item id we got from instock with the phPZN and stockLocationId of the orderItem
                // If yes: do nothing, its OK
                // If no: change the reference
                // If there was no instockResult - item does not exist at this stockLocationId;
                // Insert the item to instock, get its id and add this reference to the orderItem

                if( instockResult && instockResult.length ) {
                    if( instockResult[0]._id.toString() !== orderItem.references.toString() ) {
                        orderItem.references = ObjectId( instockResult[0]._id );
                    }
                } else {
                    [error, instockResult] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            action: 'get',
                            model: 'instock',
                            query: {
                                _id: ObjectId( orderItem.references )
                            },
                            user
                        } )
                    );
                    instockResult = instockResult.result || instockResult;
                    newInstockItem = instockResult[0];
                    newInstockItem.stockLocationId = ObjectId( orderItem.stockLocationId );
                    newInstockItem.locationId = ObjectId( order.locationId );
                    newInstockItem.editorId = ObjectId( user.identityId );
                    newInstockItem.supplierId = ObjectId( order.basecontactId );
                    newInstockItem.quantity = 0;
                    newInstockItem.quantityOrdered = 0;
                    delete newInstockItem._id;
                    newInstockItem = Y.doccirrus.filters.cleanDbObject( newInstockItem );
                    let newInStockItemPosted;
                    [error, newInStockItemPosted] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            action: 'post',
                            model: 'instock',
                            user,
                            data: newInstockItem
                        } )
                    );

                    if( error ) {
                        Y.log( `_checkInStockReferences: Failed to create new Instock Item. Failed to put new items into instock ${error.stack || error}`, 'error', NAME );
                    }

                    newInStockItemPosted = newInStockItemPosted.result || newInStockItemPosted;
                    newInStockItemPosted = newInStockItemPosted[0];
                    orderItem.references = ObjectId( newInStockItemPosted );
                }
            }

            return order;
        }

        /**
         * Updates basecontactId and stock items ony for orders in "created" status
         * @method updateOrder
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data - stock order
         * @param {Function} args.callback is called with 2 args:
         *  {Object} err
         *  {Object || null} result
         */
        async function updateOrder( args ) {
            Y.log( 'Entering Y.doccirrus.api.stockorders.updateOrder', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.stockorders.updateOrder' );
            }

            const {user, data = {}, callback, options = {}} = args;
            let err, result, order;

            try {
                order = await  _insertItemsFromCatalogToInStock( data, user );
            } catch( err ) {
                return callback( err );
            }

            order.editorId =  user.identityId; //Set last editor

            [err, order] = await formatPromiseResult(_checkInStockReferences( order, user ));

            if ( err ) {
                return handleResult( err, null, callback );
            }

            order = Y.doccirrus.filters.cleanDbObject( order );

            [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                action: 'put',
                model: 'stockorders',
                query: {
                    $and: [
                        {_id: order._id},
                        {status: orderStatuses.created}
                    ]
                },
                fields: ['stocks', 'basecontactId', 'locationId', 'formId', 'editorId'],
                user,
                data: order,
                options
            } ) );

            if( err ) {
                Y.log( 'Failed to update stockorders' + err.message, 'error', NAME );
                return handleResult( err, null, callback );
            }

            if( result.length === 0 ) {
                return handleResult(
                    new Y.doccirrus.commonerrors.DCError( 400, {message: Y.doccirrus.errorTable.getMessage( {code: 'instockMojit_08'} )} ),
                    null,
                    callback
                );

            }

            _sendStockOrdersUpdateEvent( 'updateOrderAction', 'update' );
            return handleResult( err, result, callback );
        }

        /**
         * Update medication order quantity in instock order or create new order with passed medication
         * @param {Object} args
         * @param {Object} data
         * @param {Array}  args.data.activitiesData - required array of activity phPZN and activityId
         * @param {String} args.data.locationId -required if no orderId, medication locationId
         * @param {String} args.data.basecontactId -required if no orderId, supplier id
         * @param {String} args.data.orderId - not required, order id to update
         * @returns {Promise.<*>}
         */
        async function updateItemInOrderOrCreateNew( args ) {
            Y.log( 'Entering Y.doccirrus.api.stockorders.updateItemInOrderOrCreateNew', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.stockorders.updateItemInOrderOrCreateNew' );
            }

            const {user, callback} = args,
                { orderId, basecontactId, activitiesData = [], caseFolderId } = args.data,
                 doTransitionP = promisifyArgsCallback( Y.doccirrus.api.activity.doTransition );
            let err, result, messageCode, { patientId } = args.data;
            let activitiesToUpdate = [], stockLocation;

            patientId = new ObjectId( patientId );

            if( !orderId && (!activitiesData && !activitiesData.length) ) {
                switch( true ) {
                    case !orderId:
                        messageCode = 'instockMojit_26';
                        break;
                    case  !activitiesData.length:
                        messageCode = 'instockMojit_27';
                        break;
                    case !basecontactId:
                        messageCode = 'instockMojit_28';
                        break;
                    default:
                        messageCode = 'instockMojit_10';
                }

                return handleResult(
                    new Y.doccirrus.commonerrors.DCError( 400, {
                        message: Y.doccirrus.errorTable.getMessage( {
                            code: messageCode
                        } )
                    } )
                    ,
                    null,
                    callback
                );
            }

            let newOrderId = null;

            try {
                await  _updateExistingOrder( orderId );
            } catch( err ) {
                Y.log( `updateItemInOrderOrCreateNew: failed to process activities ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            } finally {
                Y.doccirrus.communication.emitEventForUser( {
                    targetId: user.identityId,
                    event: 'system.UPDATE_ACTIVITIES_TABLES',
                    msg: {
                        data: caseFolderId
                    }
                } );
            }

            for( let actData of activitiesData ) {
                if( actData.activities && actData.addOrderInfo ) {
                    for( let activity of actData.activities ) {
                        let [err, actualActivity] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                            action: 'get',
                            model: 'activity',
                            user,
                            query: {_id: activity._id},
                            options: {limit: 1}
                        } ) );

                        if( err ) {
                            Y.log( `updateItemInOrderOrCreateNew: failed to get actual activity id: ${activity._id} state: ${err}`, 'error', NAME );
                            return;
                        }
                        actualActivity = actualActivity.length ? actualActivity[0] : {};

                        actualActivity.isArrived = false;
                        actualActivity.orderId = orderId || newOrderId;
                        [err, result] = await formatPromiseResult( doTransitionP( {
                            user,
                            data: {
                                activity: actualActivity,
                                transition: "order",
                                _isTest: 'false'
                            }
                        } ) );
                    }
                }
            }


            if( err ) {
                Y.log( `updateItemInOrderOrCreateNew: Error during updating medication activities ${activitiesData}, err: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            _sendStockOrdersUpdateEvent( 'instockAction', 'update' );
            _sendStockOrdersUpdateEvent( 'updateOrderAction', 'update' );
            return handleResult( err, result, callback );

            async function _updateExistingOrder( orderId ) {
                const updateOrderP = promisifyArgsCallback(updateOrder);
                [err, result] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'aggregate',
                        pipeline: [
                            {
                                $lookup: {
                                    from: 'instocks',
                                    localField: 'stocks.references',
                                    foreignField: '_id',
                                    as: 'stockItems'
                                }
                            },
                            {
                                $project: {
                                    _id: 1,
                                    formId: 1,
                                    editorId: 1,
                                    locationId: 1,
                                    basecontactId: 1,
                                    mediaId: 1,
                                    orderNo: 1,
                                    dateCreated: 1,
                                    status: 1,
                                    stocks: {
                                        $map: {
                                            input: "$stocks",
                                            as: 'stock',
                                            in: {
                                                phPackSize: '$$stock.phPackSize',
                                                phPriceSale: '$$stock.phPriceSale',
                                                phPriceSaleCatalog: '$$stock.phPriceSaleCatalog',
                                                phPriceCost: '$$stock.phPriceCost',
                                                phPriceCostCatalog: '$$stock.phPriceCostCatalog',
                                                checked: '$$stock.checked',
                                                quantity: '$$stock.quantity',
                                                references: '$$stock.references',
                                                stockLocationId: '$$stock.stockLocationId',
                                                stockType: '$$stock.stockType',
                                                quantityDelivered: '$$stock.quantityDelivered',
                                                quantityOrdered: '$$stock.quantityOrdered',
                                                minimumQuantity: '$$stock.minimumQuantity',
                                                automaticReorder: '$$stock.automaticReorder',
                                                patients: '$$stock.patients',
                                                nota: '$$stock.nota',
                                                phPZN: '$$stock.phPZN',
                                                activities: '$$stock.activities',
                                                dividedQuantity: '$$stock.dividedQuantity',
                                                isDivisible: '$$stock.isDivisible',
                                                _id: '$$stock._id',
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
                                    }
                                }
                            },
                            {
                                $match: {_id: new ObjectId( orderId )}
                            }

                        ],
                        model: 'stockorders'
                    } ) );

                if( err ) {
                    Y.log( `updateItemInOrderOrCreateNew: Failed to get stockorders  ${err.stack || err}`, 'error', NAME );
                    throw  err;
                }

                result = result.result ? result.result : result;

                if( !result.length ) {
                    return  new Y.doccirrus.commonerrors.DCError( 400, {
                            message: Y.doccirrus.errorTable.getMessage( {
                                code: "instockMojit_26"
                            } )
                        } );
                }

                let order = result[0];

                for( let actData of activitiesData ) {
                    let activityInOrder = false,
                        currentStock = order.stocks.find( stock => {
                            const phPZNEqual = (stock.stockItem || {}).phPZN === actData.phPZN,
                                stockLocationIdEqual = actData.stockLocationId ?
                                    (stock.stockLocationId || {}).toString() === actData.stockLocationId.toString() : true;

                            return phPZNEqual && stockLocationIdEqual;
                        } );

                    // Check if article from activityData is already in order
                    if( currentStock ) {
                        activityInOrder = true;
                        if (patientId && currentStock.patients.indexOf(patientId) === -1) {
                            currentStock.patients.push( patientId );
                        }
                    } else {
                        // Get this medication from catalog and instock (if it is there)
                        [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                            user: Y.doccirrus.auth.getSUForLocal(), //todo ask if getSUForLocal will access correct database
                            model: 'medicationscatalog',
                            action: 'get',
                            query: { "phPZN": actData.phPZN }
                        }));

                        if( err ) {
                            Y.log( `updateItemInOrderOrCreateNew: Failed to get items from medication catalog  ${err.stack || err}`, 'error', NAME );
                            throw  err;
                        }

                        const catalogItem = result.result ? result.result[0] : result[0];

                        if( !catalogItem ) {
                            return new Y.doccirrus.commonerrors.DCError( 400, {
                                message: Y.doccirrus.errorTable.getMessage( {
                                    code: "instockMojit_26"
                                } )
                            } );
                        }

                        [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                            user, //todo ask if getSUForLocal will access correct database
                            model: 'instock',
                            action: 'get',
                            query: {phPZN: catalogItem.phPZN}
                        } ) );

                        if( err ) {
                            Y.log( `updateItemInOrderOrCreateNew: Failed to get items from instock ${err.stack || err}`, 'error', NAME );
                            throw  err;
                        }

                        const stockItems =  result.result ? result.result : result;

                        catalogItem.stockItem = stockItems.find( si => si.stockLocationId.toString() === actData.stockLocationId);

                        const
                            stockItem = catalogItem.stockItem || {};

                        currentStock = {
                            references: stockItem._id || catalogItem._id,
                            stockType: stockItem._id ? "instock" : "medicationscatalog",
                            stockLocationId: actData.stockLocationId || stockItem.stockLocationId,
                            patients: [patientId],
                            phPriceSale: stockItem.phPriceSale || catalogItem.phPriceSale,
                            phPriceCost: stockItem.phPriceCost || catalogItem.phPriceCost,
                            phPriceSaleCatalog: catalogItem.phPriceSale,
                            phPriceCostCatalog: catalogItem.phPriceCost,
                            vatTypeCatalog: catalogItem.vatType,
                            stockItem,
                            quantity: 0,
                            dividedQuantity: 0,
                            isDivisible: actData.isDivisible,
                            phPZN: stockItem.phPZN || actData.phPZN
                        };

                    }

                    /* Calculate new quantity and isDivisible
                    *
                    * There are 4 cases:
                    * 1. Both order item and instock/actData item are divisible
                    * 2. Order item is divisible and instock/actData item is NOT divisible
                    *    -> Then set order item to NOT divisible
                    * 3. Order item is NOT divisible and instock/actData item is divisible
                    *    -> Then set order item to divisible
                    * 4. both order item and instock/actData item are NOT divisible
                    * */

                    // if currentStock is not inInStock - we take data from actData, which later will be saved to inStock
                    const stockItem = currentStock.stockItem._id ? currentStock.stockItem : actData,
                        phPackSize = currentStock.phPackSize || stockItem.phPackSize;


                    if( currentStock.isDivisible && stockItem.isDivisible ) {
                        // Case 1
                        currentStock.dividedQuantity = currentStock.dividedQuantity + actData.count;
                        currentStock.quantity = Math.ceil( currentStock.dividedQuantity / phPackSize );
                        currentStock.isDivisible = true;
                    } else if( currentStock.isDivisible && !stockItem.isDivisible ) {
                        // Case 2
                        currentStock.quantity += actData.count;
                        currentStock.dividedQuantity = 0;
                        currentStock.isDivisible = false;
                    } else if( !currentStock.isDivisible && stockItem.isDivisible ) {
                        // Case 3
                        currentStock.quantity += Math.ceil( actData.count / phPackSize );
                        currentStock.dividedQuantity = currentStock.quantity * phPackSize + actData.count;
                        currentStock.isDivisible = true;
                    } else if( !currentStock.isDivisible && !stockItem.isDivisible ) {
                        // Case 4
                        currentStock.quantity += actData.count;
                        currentStock.isDivisible = false;
                    }

                    // Add all activityIds from actData to currentStock
                    let activities = actData.activities.map( a => {
                        return {
                            _id: a._id,
                            patientId
                        };
                    });

                    let activitiesExistInOrder;
                    order.stocks.filter(stock => {
                        if(stock.phPZN === actData.phPZN) {
                            activitiesExistInOrder = stock.activities;
                        }
                    });

                    if(!activitiesExistInOrder) {
                        currentStock.activities = activities;
                    } else {
                        currentStock.activities = activitiesExistInOrder.concat(activities);
                    }

                    // If no StockLocationId then add it to the activity
                    if( !actData.stockLocationId && currentStock.stockLocationId ) {
                        activitiesToUpdate = actData.activities.map(a => a._id);
                        stockLocation = currentStock.stockLocationId;

                        if( activitiesToUpdate && currentStock.stockLocationId ) {
                            // Update the activities
                            [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                                user,
                                action: 'update',
                                model: 'activity',
                                query: {
                                    _id: {$in: activitiesToUpdate}
                                },
                                data: {$set: {s_extra: {stockLocationId: stockLocation}}},
                                options: {
                                    multi: true
                                }
                            } ) );

                            if( err ) {
                                Y.log( `updateItemInOrderOrCreateNew: Failed to update activity stockLocationId ${err}`, 'error', NAME );
                                throw  err;
                            }
                        }
                    }

                    // remove unnecessary fields
                    delete currentStock.stockItem;
                    delete currentStock.phPackSize;
                    delete currentStock.quantityOrdered;

                    if( !activityInOrder ) {
                        order.stocks.push( currentStock );
                    }
                }

                [err, result] = await formatPromiseResult(
                    updateOrderP({
                        user,
                        data: order
                    })
                );

                if( err ) {
                    Y.log( `updateItemInOrderOrCreateNew: Failed to update order stocks ${err.stack || err}`, 'error', NAME );
                    throw  err;
                }

                return result;
            }
        }

        /**
         * Set order status and change orderedQuantity for stockItems, generate PDF
         * @method sendOrder
         * @param {Object} user
         * @param {Object} data
         * @param {Object} args.stocks
         * @param {Function} args.callback is called with 2 args:
         *  {Object} err
         *  {Object || null} result
         */
        async function sendOrder( args ) {
            Y.log( 'Entering Y.doccirrus.api.stockorders.sendOrder', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.stockorders.sendOrder' );
            }

            const
                {user, callback} = args;

            let
                error, result, stocks = [], stockIds, order = args.data, sendWithNota = args.sendWithNota,
                stockResult, stockError,
                orderNotAcceptedLength = 0;

            let [err, actualOrder] = await  formatPromiseResult( getOrders( {user, query: {_id: order._id}} ) );

            if( err ) {
                Y.log( `sendOrder: failed to get actual order by id: ${order._id}, err: ${err && err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            order = actualOrder.result ? actualOrder.result[0] : actualOrder;

            if( !order || !order.stocks || !order.supplier || !order._id ) {
                Y.log( `sendOrder: Wrong order arguments ${order}`, 'error', NAME );
                return handleResult( new Y.doccirrus.commonerrors.DCError( 400, {message: "Bad request."} ), null, callback );
            }

            Y.doccirrus.communication.emitEventForUser( {
                targetId: user.identityId,
                event: 'INSTOCKORDER',
                msg: {
                    data: 0
                }
            } );

            stockIds = order.stocks.map( stockItem => stockItem.references );

            const galexisProducts = order.stocks.map( productOrder => {
                return {
                    orderQuantity: productOrder.quantity,
                    pharmaCode: productOrder.stockItem.phPZN
                };
            } );

            _emitOrderProgressEvent( user, {progress: 0} );

            if( Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ) {
                try {
                    if( order.supplier && order.supplier.sendElectronicOrder ) {
                        let electronicData = await  _shoppingCardRequest( user, galexisProducts, order.orderNo );

                        orderNotAcceptedLength = electronicData.orderNotAccepted;
                        let notaMessages= [];
                        //Add nota to each instocks
                        if( orderNotAcceptedLength > 0 ) {
                            electronicData.notAcceptedInfo.forEach( nota => {
                                let notAcceptedStock = order.stocks.find( stock => stock.stockItem.gtinCode === nota.gtinCode || ( stock.stockItem.gtinCode === "0" + nota.gtinCode ) || stock.stockItem.phPZN === nota.phPZN );
                                if( notAcceptedStock ) {
                                    notAcceptedStock.nota = nota.message;
                                }

                                notaMessages.push( {
                                    medication: notAcceptedStock.stockItem.description,
                                    nota: nota.message
                                } );
                            } );

                        }
                        _emitOrderProgressEvent( user, {progress: 80, orderNotAcceptedLength, notaMessages} );

                        [error, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                            action: 'update',
                            model: 'stockorders',
                            query: {_id: order._id},
                            fields: ['electronicData','stocks'],
                            user,
                            data: {electronicData, stocks: order.stocks}
                        } ) );

                        if( error ) {
                            Y.log( `sendOrder: failed to update order by electronicData orderId: ${order._id}, ${error.stack || error}`, 'error', NAME );
                            return handleResult( error, null, callback );
                        }
                    }
                } catch( err ) {
                    Y.log(`sendOrder: galexis request issue: ${err.stack || err}`, 'error', NAME);
                    return handleResult( err, null, callback );
                }
            }
            //Do not send order if has not acceptedItems
            if (orderNotAcceptedLength > 0 && !sendWithNota) {
                Y.doccirrus.schemas.sysnum.releaseInstockLock( user, () => {
                } );
                _emitOrderProgressEvent( user, {progress: 100, orderNotAcceptedLength} );
                Y.doccirrus.communication.emitEventForUser( {
                    targetId: user.identityId,
                    event: 'message',
                    msg: {
                        data: Y.doccirrus.i18n( 'InStockMojit.messages.orderIsNotSent' )
                    },
                    meta: {
                        level: 'ERROR'
                    }
                } );
                return handleResult( null, {}, callback );
            }

            [error] = await formatPromiseResult( checkOtherProcesses() );

            if( error ) {
                Y.log( `Failed to save order ${error.stack || error}`, 'error', NAME );
                return handleResult( error, null, callback );
            }

            try {
                result = await updateStatusAndQuantity();
                await _updateCatalogPricesExistinInstockItems(user, order);
                await renderSinglePdf();

                _sendStockOrdersUpdateEvent( 'statusChangeOrdersAction', 'update' );
                _sendStockOrdersUpdateEvent( 'instockAction', 'update' );
                return handleResult( null, result, callback );
            } catch( error ) {
                Y.log( `Send order error: ${error.stack || error}`, 'warn', NAME );
                return handleResult( error, null, callback );
            }
            finally {
                Y.doccirrus.schemas.sysnum.releaseInstockLock( user, () => {
                } );
                _emitOrderProgressEvent( user, {progress: 100, orderNotAcceptedLength} );
            }

            // If item exists in inStock, update order quantity
            async function updateStatusAndQuantity() {
                let _order;
                /*Get current state of stock items */
                [stockError, stockResult] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        action: 'get',
                        model: 'instock',
                        query: {_id: {$in: stockIds}},
                        user
                    } )
                );

                if( stockError ) {
                    Y.log( `updateStatusAndQuantity: Failed to get items from instock ${error.stack || error}`, 'error', NAME );
                    throw stockError;
                }

                /*Extend order stocks by quantity that was alredy ordered*/
                stocks = order.stocks.map( orderedItem => {
                    let stockItemBefore = stockResult.find( sr => sr._id.toString() === orderedItem.references.toString() );

                    if( !stockItemBefore ) {
                        Y.log( 'updateStatusAndQuantity: Item from order is not present on stock', 'error', NAME );
                        error = new Y.doccirrus.commonerrors.DCError( 400, {message: Y.doccirrus.errorTable.getMessage( {code: 'instockMojit_02'} )} );
                        return;
                    }

                    return Y.doccirrus.filters.cleanDbObject( {
                        _id: orderedItem.references,
                        quantityOrdered: orderedItem.quantity,
                        quantityOrderedBefore: stockItemBefore.quantityOrdered,
                        isDeleted: false
                    } );
                } );


                if( error ) {
                    throw error;
                }

                try {
                    await  updateInStockOrderedQuantity();
                } catch( err ) {
                    /*Rollback set quantities*/
                    await _rollBackOrderedQuantity();
                    throw  err;
                }

                /*Get real state of order*/
                try {
                    _order = await  _getOrderById( order._id, user );
                } catch( error ) {
                    throw  error;
                }

                /*Status we want to set*/
                _order.status = orderStatuses.sent;

                /*validate and set status*/
                try {
                    result = await  _updateStatus( {
                        order: _order,
                        user
                    } );
                } catch( error ) {
                    await _rollBackOrderedQuantity();
                    throw (error);
                }

                return result.result ? result.result : result;

                /* Update quantity ordered */
                async function updateInStockOrderedQuantity() {
                    for( const stockItem of stocks ) {
                        [error, result] = await _setOrderedQuantity( stockItem._id, stockItem.quantityOrdered + stockItem.quantityOrderedBefore, stockItem.isDeleted );

                        if( error ) {
                            Y.log( `Could not set ordered quantity ${error.stack || error} `, 'error', NAME );
                        }
                    }
                }
            }


            async function renderSinglePdf() {
                const
                    _getOrder = promisifyArgsCallback( getOrders ),
                    stockOrderToPDF = promisifyArgsCallback( Y.doccirrus.forms.renderOnServer.stockOrderToPDF );
                let
                    order, error, form, query, mediaId;

                /*Get order with instock items*/
                [error, result] = await formatPromiseResult( _getOrder( {
                    user: args.user, query: {_id: args.data._id}
                } ) );

                if( error ) {
                    Y.log( `Could not get order from stock ${error.stack || error}`, 'error', NAME );
                    throw  error;
                }

                result = result.result || result;
                if( !result.length ) {
                    throw new Y.doccirrus.commonerrors.DCError( 404, {message: Y.doccirrus.errorTable.getMessage( {code: 'instockMojit_11'} )} );
                }

                order = result[0];
                /*Get form template*/
                if( !order.formId ) {
                    return;
                }

                query = {_id: order.formId};

                [error, form] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        action: 'get',
                        model: 'formtemplate',
                        query: query,
                        user
                    } ) );

                if( error ) {
                    Y.log( `Could not get form template ${error.stack || error} `, 'error', NAME );
                    throw  error;
                }

                form = form.result ? form.result : form;

                if( !form.length ) {
                    error = new Y.doccirrus.commonerrors.DCError( 400, {message: Y.doccirrus.errorTable.getMessage( {code: 'instockMojit_13'} )} );
                }

                if( error ) {
                    Y.log( `Could not find form template ${error.stack || error} `, 'error', NAME );
                    throw error;
                }

                form = form[0];
                /*Render PDF*/
                [error, mediaId] = await formatPromiseResult( stockOrderToPDF( {
                    'user': user,
                    'formId': form._id.toString(),
                    'formVersionId': form.latestVersionId,
                    'mapperName': 'instock',
                    'mapObject': order,
                    'mapCollection': 'stockorder',
                    'mapFields': null,
                    'saveTo': 'db',
                    'zipId': '',
                    'preferName': ''
                } ) );

                if( error ) {
                    Y.log( `Could not complete PDF:  ${error.stack || error}`, 'error', NAME );
                    _rollbackSendStatus( user, order._id );
                    _rollBackOrderedQuantity();
                    throw error;
                }

                [error, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    action: 'update',
                    model: 'stockorders',
                    query: {_id: order._id},
                    fields: ['mediaId'],
                    user,
                    data: {'mediaId': mediaId.toString()}
                } ) );

                if( error ) {
                    Y.log( `Failed to attach mediaId to stockorder:  ${error.stack || error}`, 'error', NAME );
                    throw ( error );
                }
            }

            async function _rollBackOrderedQuantity() {
                for( const initialStockItems of stockResult ) {
                    [stockError, result] = await _setOrderedQuantity( initialStockItems._id, initialStockItems.quantityOrdered,  initialStockItems.isDeleted);

                    if( stockError ) {
                        Y.log( 'Could not set previous ordered quantity ', 'error', NAME );
                    }
                }
            }

            async function _setOrderedQuantity( _id, quantity, isDeleted ) {
                return await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        action: 'update',
                        model: 'instock',
                        query: {_id: _id},
                        fields: ['quantityOrdered', 'isDeleted'],
                        user,
                        data: {'quantityOrdered': quantity, 'isDeleted': isDeleted}
                    } ) );
            }

            function checkOtherProcesses() {
                return new Promise( ( resolve, reject ) => {
                    Y.doccirrus.schemas.sysnum.getInstockLock( args.user, ( err, getLock ) => {
                        if( err ) {
                            Y.log( 'Error getting instock lock ' + err.message, 'error', NAME );
                            return reject( err );
                        }

                        if( true !== getLock ) {
                            return reject( Y.doccirrus.errors.rest( 'instockMojit_01' ) );
                        }

                        resolve( null );
                    } );
                } );
            }
        }

        // Also update the catalogPrices for item with same phPZN in Instock
        async function _updateCatalogPricesExistinInstockItems (user, order) {
            let inStockQuery = order.stockItems.map( orderItem => orderItem.phPZN );

            // Find instocks with phPZN for Price Update
            let [error, stockResults] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    action: 'get',
                    model: 'instock',
                    query: {phPZN: {$in: inStockQuery}},
                    user
                } )
            );

            if( error ) {
                Y.log( `_updateCatalogPricesExistinInstockItems: Failed to get instock items for catalog price change ${error.stack || error}`, 'error', NAME );
                throw error;
            }

            stockResults = stockResults.result || stockResults;

            for (const stockItem of stockResults) {
                let orderItem = order.stocks.find(item => {
                    return item.stockItem.phPZN === stockItem.phPZN;
                });

                if( orderItem )  {
                    stockItem.phPriceSaleCatalog = orderItem.phPriceSaleCatalog;
                    stockItem.phPriceCostCatalog = orderItem.phPriceCostCatalog;
                }

                [error] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    action: 'update',
                    model: 'instock',
                    query: {_id: stockItem._id},
                    fields: ['phPriceSaleCatalog', 'phPriceCostCatalog'],
                    user,
                    data: {'phPriceSaleCatalog': stockItem.phPriceSaleCatalog, 'phPriceCostCatalog': stockItem.phPriceCostCatalog}
                }));

                if( error ) {
                    Y.log( `_sendOrder: Failed to update instock ${error.stack || error}`, 'error', NAME );
                    throw error;
                }
            }
        }

        /**
         * Set order arriveOrder to 'arrived'
         * @method arriveOrder
         * @param {Object} args
         * @param {Object} args.data.orderId  - orderId
         * @param {Function} args.callback is called with 2 args:
         *  {Object} err
         *  {Object || null} result
         */
        async function arriveOrder( args ) {
            Y.log( 'Entering Y.doccirrus.api.stockorders.arriveOrder', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.stockorders.arriveOrder' );
            }
            const {user, data = {}, callback} = args;
            let order;

            if( !args.data ) {
                return handleResult(
                    new Y.doccirrus.commonerrors.DCError( 400, {message: Y.doccirrus.errorTable.getMessage( {code: 'instockMojit_10'} )} ),
                    null,
                    callback
                );

            }

            /*Get real state of order*/
            try {
                order = await _getOrderById( data.orderId, user );
            } catch( error ) {
                return handleResult( error, null, callback );
            }

            order.status = orderStatuses.arrived;

            try {
                order = await _updateStatus( {
                    order,
                    user
                } );
            } catch( error ) {
                return handleResult( error, null, callback );
            }

            _sendStockOrdersUpdateEvent( 'statusChangeOrdersAction', 'update' );
            return handleResult( null, order, callback );
        }

        async function _getOrderById( id, user ) {
            Y.log( 'Entering Y.doccirrus.api.stockorders._getOrderById', 'info', NAME );
            let error, result;

            [error, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    action: 'get',
                    model: 'stockorders',
                    query: {_id: id},
                    user: user
                } ) );

            if( error ) {
                Y.log( `Failed to get stockorder:  ${error.stack || error}`, 'warn', NAME );
                throw  error;
            }

            if( !result.length ) {
                Y.log( `Could not find order:  ${error.stack || error}`, 'warn', NAME );
                throw new Y.doccirrus.commonerrors.DCError( 404, {message: Y.doccirrus.errorTable.getMessage( {code: 'instockMojit_11'} )} );
            }

            return Y.doccirrus.filters.cleanDbObject( result.result ? result.result[0] : result[0] );
        }

        /**
         * Updates status and set one of :dateSent,dateArchived,dateArrived field can set status only for one order object
         * @method _updateStatus
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.order - stock order object
         * @returns {Object} - stock order object
         * @throws {Object}
         */
        async function _updateStatus( args ) {
            Y.log( 'Entering Y.doccirrus.api.stockorders._updateStatus', 'info', NAME );
            const {user} = args;
            let
                {order = {}} = args,
                error, statusError, previousState, dateField, result;

            [statusError, order, previousState, dateField] = _defineStatus( order );

            if( statusError ) {
                Y.log( `Failed to set order status:  ${statusError.stack || statusError}`, 'warn', NAME );
                throw statusError;
            }

            if( !previousState ) {
                Y.log( `Failed to set order status. Previous status is wrong`, 'warn', NAME );
                throw [new Y.doccirrus.commonerrors.DCError( 400, {message: Y.doccirrus.errorTable.getMessage( {code: 'instockMojit_03'} )} )];
            }

            order = Y.doccirrus.filters.cleanDbObject( order );

            [error, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    action: 'put',
                    model: 'stockorders',
                    query: {
                        $and: [
                            {_id: order._id},
                            {status: previousState}
                        ]
                    },
                    fields: ['status', dateField],
                    user,
                    data: order
                } ) );

            result = result.result ? result.result : result;

            if( error ) {
                Y.log( `Failed to update stockorder:  ${error.stack || error}`, 'warn', NAME );
                throw error;
            }

            if( result.length === 0 ) {
                Y.log( `Failed to update stockorder status:  ${error.stack || error}`, 'warn', NAME );
                throw [new Y.doccirrus.commonerrors.DCError( 400, {message: Y.doccirrus.errorTable.getMessage( {code: 'instockMojit_05'} )} )];
            }

            return result;
        }

        /**
         * Updates status and set on of :dateSent,dateArchived,dateArrived, can sat status only for one order not array
         * @method _updateStatus
         * @param {Object} user
         * @param {Object} orderId
         */
        async function _rollbackSendStatus( user, orderId ) {
            Y.log( 'Entering Y.doccirrus.api.stockorders._rollbackSendStatus', 'info', NAME );
            let
                error, result;

            [error, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    action: 'update',
                    model: 'stockorders',
                    query: {
                        $and: [
                            {_id: orderId},
                            {status: orderStatuses.send}
                        ]
                    },
                    fields: ['status', 'dateSent'],
                    user,
                    data: {status: orderStatuses.created, dateSent: ""}
                } ) );

            if( error ) {
                Y.log( `Failed to update stockorder (rollbackStatus):  ${error.stack || error}`, 'warn', NAME );
                throw  error;
            }

            result = result.result ? result.result : result;

            if( result.length === 0 ) {
                Y.log( `Failed to update stockorder (rollbackStatus):  ${error.stack || error}`, 'warn', NAME );
                throw [new Y.doccirrus.commonerrors.DCError( 400, {message: Y.doccirrus.errorTable.getMessage( {code: 'instockMojit_05'} )} )];
            }

            return result;
        }

        /**
         * Removes order, only if order status is 'created'
         * @method removeOrder
         * @param {Object} args
         * @param {Object} args.data
         * @param {Object} args.data._id
         * @param {Function} args.callback is called with 2 args:
         *  {Object} err
         *  {Object || null} result
         */
        async function removeOrder( args ) {
            Y.log( 'Entering Y.doccirrus.api.stockorders.removeOrder', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.stockorders.removeOrder' );
            }

            let
                {user, data = {}, callback} = args, error, result;

            data = Y.doccirrus.filters.cleanDbObject( data );

            if( data.status !== orderStatuses.created ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 400, {message: Y.doccirrus.errorTable.getMessage( {code: 'instockMojit_06'} )} ) );
            }

            [error, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                action: 'delete',
                model: 'stockorders',
                query: {
                    $and: [{_id: data._id}, {status: orderStatuses.created}]
                }
            } ) );

            if( error ) {
                Y.log( `Failed to delete stock order:  ${error.stack || error}`, 'warn', NAME );
            }

            _sendStockOrdersUpdateEvent( 'statusChangeOrdersAction', 'delete' );
            return handleResult( error, result, callback );
        }

        /**
         * Copy order and save as new withe status 'created'
         * @method removeOrder
         * @param {Object} args
         * @param {Object} args.data
         * @param {Object} args.data._id - order id
         * @param {Function} args.callback is called with 2 args:
         *  {Object} err
         *  {Object || null} result
         */

        async function saveAsNew( args ) {
            Y.log( 'Entering Y.doccirrus.api.stockorders.saveAsNew', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.stockorders.saveAsNew' );
            }

            const {user, data = {}, callback} = args,
                _saveOrder = promisifyArgsCallback( saveOrder );
            let order, newOrder, err, result;

            try {
                order = await _getOrderById( data._id, user );
            } catch( error ) {
                Y.log(`saveAsNew: failed to get order by Id: ${err && err.stack || err}`);
                return handleResult( error, null, callback );
            }

            if( !order ) {
                return handleResult( new Y.doccirrus.commonerrors.DCError( 404, {message: Y.doccirrus.errorTable.getMessage( {code: 'instockMojit_11'} )} ), null, callback );
            }

            newOrder = {
                basecontactId: order.basecontactId,
                locationId: order.locationId,
                formId: order.formId,
                stocks: order.stocks.map( ( stockItem ) => {
                    return {
                        quantity: stockItem.quantity,
                        references: stockItem.references,
                        stockType: stockItem.stockType,
                        stockLocationId: stockItem.stockLocationId,
                        checked: false,
                        isProcessed: false,
                        phPriceSale: stockItem.phPriceSale,
                        phPriceCost: stockItem.phPriceCost
                    };
                } )
            };

            [err, result] = await formatPromiseResult( _saveOrder( {
                user: user,
                data: newOrder
            } ) );

            if( err ) {
                Y.log( `Failed to save stock order as new:  ${err.stack || err}`, 'warn', NAME );
            }

            return handleResult( err, result, callback );
        }

        /**
         * Define order status depends on current order state
         * @method _setOrdersStatus
         * @param {Object} order
         *
         * @return {Array}
         */
        function _defineStatus( order ) {
            Y.log( 'Entering Y.doccirrus.api.stockorders._defineStatus', 'info', NAME );
            let error = null, previousState = null, dateField = null;

            switch( true ) {
                case isNew( order ):
                    order.status = orderStatuses.created;
                    order.dateCreated = Date.now();
                    dateField = 'dateCreated';
                    break;

                case isSending( order ):
                    order.status = orderStatuses.sent;
                    previousState = orderStatuses.created;
                    dateField = 'dateSent';
                    order.dateSent = Date.now();
                    break;

                case isArriving( order ):
                    order.status = orderStatuses.arrived;
                    previousState = orderStatuses.sent;
                    dateField = 'dateArrived';
                    order.dateArrived = Date.now();
                    break;

                case isPartialBooking( order ):
                    order.status = orderStatuses.partiallybooked;
                    previousState = {$in: [orderStatuses.arrived, orderStatuses.partiallybooked]};
                    break;

                case isClosed(order):
                    order.status = orderStatuses.closed;
                    previousState = {$in: [orderStatuses.arrived, orderStatuses.partiallybooked]};
                    dateField = 'dateClosed';
                    order.dateClosed = Date.now();
                    break;

                case isArchiving( order ):
                    order.status = orderStatuses.archived;
                    previousState = orderStatuses.closed;
                    dateField = 'dateArchived';
                    order.dateArchived = Date.now();
                    break;

                default:
                    Y.log( 'Could not set order status. Wrong date params or status', 'error', NAME );
                    error = new Y.doccirrus.commonerrors.DCError( 400, {message: Y.doccirrus.errorTable.getMessage( {code: 'instockMojit_07'} )} );
            }

            function isNew( order ) {
                return !order.dateCreated && !order.dateSent && !order.dateArchived && !order.status;
            }

            function isSending( order ) {
                return order.dateCreated && !order.dateSent && !order.dateArchived
                       && order.status === orderStatuses.sent;
            }

            function isArriving( order ) {
                return order.dateCreated && order.dateSent && !order.dateArrived && !order.dateArchived
                       && order.status === orderStatuses.arrived;
            }

            function isPartialBooking( order ) {
                return order.dateCreated && order.dateSent && !order.dateClosed && !order.dateArchived
                       && order.status === orderStatuses.partiallybooked;
            }

            function isClosed( order ) {
                return order.dateCreated && order.dateSent && order.dateArrived && !order.dateClosed
                       && !order.dateArchived && order.status === orderStatuses.closed;
            }

            function isArchiving( order ) {
                return order.dateCreated && order.dateSent && order.dateArrived && order.dateClosed
                       && !order.dateArchived && order.status === orderStatuses.archived;
            }

            return [error, order, previousState, dateField];
        }

        function _sendStockOrdersUpdateEvent( event, action ) {
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
         *Emit sendStockOrderProgress event
         * @param {Object} user,
         * @param {Object} {progress, orderNotAccepted}
         */
        function _emitOrderProgressEvent( user, {progress = 0, orderNotAcceptedLength = 0, notaMessages = [] } ) {
            Y.doccirrus.communication.emitEventForUser( {
                targetId: user.identityId,
                nsp: 'default',
                event: 'sendStockOrderProgress',
                msg: {data: {progress, orderNotAcceptedLength, notaMessages}}
            } );
        }

        /***
         * Make storeShoppingCartRequest and commitShoppingCartRequest request to galexis
         * @param {Object} user
         * @param {Array} galexisProducts
         * @param {String} galexisProducts.orderQuantity
         * @param {String} galexisProducts.pharmaCode
         * @param {String} orderNo
         * @returns {Promise.<*>}
         * @private
         */
        async function _shoppingCardRequest(user, galexisProducts, orderNo ) {
            let result, instockconfiguration, config;

            try {
                instockconfiguration = await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'instockconfiguration',
                    query: {},
                    options: {
                        fileds: {
                            suppliersConfig: 1
                        }
                    }
                } );
                config = instockconfiguration[0].suppliersConfig[0];

            } catch (err) {
                Y.log(`_shoppingCardRequest: Error: ${err.stack || err}`, 'debug', NAME);
                Y.log(`_shoppingCardRequest: Can not get galexis configuration. (${err})`, 'error', NAME);
                return handleResult(new Y.doccirrus.commonerrors.DCError( 503, {message: `No galexis configuration file`}) );
            }

            const {host, path, number, password} = config;

            if( !host || !path || !number || !password ) {
                Y.log( `_storeShoppingCardRequest: Some  of Galexis config properties are missing`, 'error', NAME );
                return handleResult( new Y.doccirrus.commonerrors.DCError( 500, {message: `Some  of Galexis config properties are missing`}), null  );
            }

            let shoppingCartId, orderStatus;
            //Send order items to galexis
            const shoppingCartRequest = getStoreShoppingCartRequest( number, password, galexisProducts, orderNo );
            _emitOrderProgressEvent(user, {progress: 20});
            try {
                result = await requestToGalexis( {host, path}, shoppingCartRequest );
            } catch( err ) {
                return handleResult( err, null );
            }
            _emitOrderProgressEvent(user, {progress: 40});
            //Get shoppingCartId from response
            try {
                shoppingCartId = result.storeShoppingCartResponse.shoppingCart[0].cartIdentifier[0].$.id;
            } catch( err ) {
                Y.log( `_storeShoppingCardRequest: Unexpected response format, can not get cartId`, 'error', 'NAME' );
                return handleResult( new Y.doccirrus.commonerrors.DCError( 500, {message: `Some  of Galexis config properties are missing`} ) );
            }
            // get request status
            const requestOrderStatus = getShoppingCardRequest( number, password, shoppingCartId );

            try {
                orderStatus = await requestToGalexis( {host, path}, requestOrderStatus );
            } catch( err ) {
                return handleResult( err, null );
            }
            _emitOrderProgressEvent(user, {progress: 60});
            let orderNotAccepted = orderStatus.loadShoppingCartResponse.shoppingCart[0].cartLinesResponse[0].cartLineResponse.filter( (i) => {
              return i.$.lineAccepted === 'false';
            });
            let notAcceptedInfo = [];
            try {
                notAcceptedInfo = orderNotAccepted.map( notAcceptedItem => {
                    if( notAcceptedItem.productResponse ) {
                        return {
                            gtinCode: notAcceptedItem.productResponse[0].EAN[0].$.id,
                            message: notAcceptedItem.availability[0].$.message
                        };
                    } else if( notAcceptedItem.productError ) {
                        return {
                            message: notAcceptedItem.productError[0].$.message,
                            phPZN: notAcceptedItem.productError[0].product[0].unsupportedProductSpecification[0].$.id
                        };
                    } else {
                        Y.log( `_shoppingCartRequest: unsuported response format: ${JSON.stringify( orderNotAccepted )}` );
                        return {
                            gtinCode: "",
                            message: ""
                        };
                    }
                } );
            } catch (err) {
                Y.log(`_shoppingCartRequest: failed to parse galexis response ${err.stack || err}, response: ${orderNotAccepted}`, 'error', NAME);
                return handleResult( err, null );
            }


            //Send commitShoppingCartRequest with received shoppingCartId
            try {
                result = await requestToGalexis( {
                    host,
                    path
                }, getCommitShoppingCartRequest( number, password, shoppingCartId ) );
                if( result.commitShoppingCartResponse && result.commitShoppingCartResponse.successful ) {
                    let cartIdentifier = result.commitShoppingCartResponse.cartIdentifier[0];
                    return handleResult( null, {
                        id: cartIdentifier.$.id,
                        humanReadableCartNumber: cartIdentifier.$.humanReadableCartNumber,
                        orderNotAccepted: orderNotAccepted.length,
                        notAcceptedInfo

                    } );
                } else {
                    Y.log( `_storeShoppingCardRequest: Unexpected galexis response ${result}`, 'error', NAME );
                    return handleResult( new Y.doccirrus.commonerrors.DCError( 500, {message: `Unexpected galexis respons`} ), null );
                }
            } catch( err ) {
                Y.log(`_shoppingCardRequest: ${err.stack || err}`, 'error', NAME);
                return handleResult( err, null );
            }

            function getStoreShoppingCartRequest( number, password, products = [], orderNo ) {
                return `<storeShoppingCartRequest
                            version="2.0"
                            xmlns="http://xml.e-galexis.com/V2/schemas/"
                            xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                            xsi:schemaLocation="http://xml.e-galexis.com/V2/schemas/ http://xml.e-galexis.com/V2/schemas/shoppingCart/storeShoppingCartRequest.xsd"
                            compressionDesired="false"
                            productDescriptionDesired="true"
                            communicationSoftwareId="DocCirrus">
                            <client number="${number}" password="${password}"/>
                            <customerSetupOverride/>
                            <cartHeader referenceNumber="${orderNo}" />
                            <cartLines>
                                ${getCartLines( products )}
                            </cartLines>
                        </storeShoppingCartRequest>`;

                function getCartLines( products ) {
                    let cartLines = ``;
                    products.forEach( ( product, index ) => {
                        cartLines += `<cartLine
                            cartLineNumber="${ index + 1 }"
                            orderQuantity="${product.orderQuantity}"
                            cartLineType="ware"
                            deliveryZone="">
                                <product>
                                 <pharmaCode id="${product.pharmaCode}"/>
                                </product>
                            </cartLine>`;
                    } );
                    return cartLines;
                }
            }

            function getShoppingCardRequest( number, password, cartId ) {
                return `<loadShoppingCartRequest
                        xmlns="http://xml.e-galexis.com/V2/schemas/"
                        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                        xsi:schemaLocation="http://xml.e-galexis.com/V2/schemas/ http://xml.e-galexis.com/V2/schemas/shoppingCart/loadShoppingCartRequest.xsd"
                        compressionDesired="false"
                        productDescriptionDesired="true"
                        communicationSoftwareId="DocCirrus" version="2.0">
                         <client number="${number}" password="${password}"/>
                            <activateCart>
                                <cartIdentifier id="${cartId}"/>
                            </activateCart>
                       </loadShoppingCartRequest>`;
            }

            function getCommitShoppingCartRequest( number, password, id ) {
                return `<commitShoppingCartRequest
                            xmlns="http://xml.e-galexis.com/V2/schemas/"
                            xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                            xsi:schemaLocation="http://xml.e-galexis.com/V2/schemas/ http://xml.e-galexis.com/V2/schemas/shoppingCart/commitShoppingCartRequest.xsd"
                            compressionDesired="false"
                            productDescriptionDesired="true"
                            communicationSoftwareId="DocCirrus" version="2.0">
                            <client number="${number}" password="${password}"/>
                            <cartIdentifier id="${id}"/>
                        </commitShoppingCartRequest>`;
            }

            async function requestToGalexis( {host, path}, postData ) {
                const
                    options = {
                        host: host,
                        path: path,
                        method: "POST",
                        headers: {
                            "Content-Type": "text/xml",
                            'Content-Length': Buffer.byteLength( postData )
                        }
                    };
                let err, xmlResponse, result;
                /*Receive galexis data via http request*/
                [err, xmlResponse] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                    const req = http.request( options, ( res ) => {
                        let response = "";
                        if( res.statusCode !== 200 ) {
                            Y.log( `_storeShoppingCardRequest: Request to galexis is not success, statusCode : ${res.statusCode}`, 'error', NAME );
                            reject( res );
                        }

                        res.setEncoding( 'utf8' );
                        res.on( 'data', ( chunk ) => {
                            response += chunk;
                        } );
                        res.on( 'end', () => {
                            Y.log( `_storeShoppingCardRequest: Finished downloading galexis`, 'info', NAME );
                            resolve( response );
                        } );
                    } );

                    req.on( 'error', ( e ) => {
                        Y.log( `_storeShoppingCardRequest: Failed to make request to hcisolutions  ${e.stack || e}`, 'error', NAME );
                        reject( e );
                    } );

                    req.write( postData );
                    req.end();
                } ) );

                if( err ) {
                    Y.log( `_storeShoppingCardRequest: Failed to do request to galexis postData: ${postData}, error: ${err}`, 'error', NAME );
                    throw  new Y.doccirrus.commonerrors.DCError( 500, {message: `Failed to make request to Galexis`} );
                }
                /*Parse xmlResponse to js object*/
                [err, result] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                    parseString( xmlResponse, async ( err, result ) => {
                        if( err ) {
                            reject( err );
                        } else {
                            resolve( result );
                        }
                    } );
                } ) );

                if( err ) {
                    Y.log( `_storeShoppingCardRequest: Failed to parse xmlResponse (cartRequest})`, 'error', NAME );
                    throw  err;
                }

                if( result && result.GalexisXMLError ) {
                    Y.log( `_storeShoppingCardRequest: Failed to make request to Galexis ${(((result.GalexisXMLError.error || [])[0] || {}).$ || {}).message || result.GalexisXMLError.error }))}`, 'error', NAME );
                    throw  new Y.doccirrus.commonerrors.DCError( 500, {message: `Failed to make request to Galexis  ${result.GalexisXMLError.error}`} );
                }

                return result;
            }
        }

        /**
         * Creates the order for items from data.instockItemIds if needed (depends on quantity and minimum quantity)
         * @param {Object} args
         * @param {Array} args.data.instockItemIds,
         * @param {String} args.data.locationId
         * @returns {Promise.<*>}
         */
        async function handleAutomaticOrdering( args ) {
            Y.log( 'Entering Y.doccirrus.api.stockorders.handleAutomaticOrdering', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.stockorders.handleAutomaticOrdering' );
            }

            const {user, callback, data: {instockItemIds = [], locationId}} = args,
                createEmptyOrderP = promisifyArgsCallback( Y.doccirrus.api.stockordersrequest.createEmptyOrder );

            if( !instockItemIds.length ) {
                return handleResult( null, [], callback );
            }

            let [err, instockItems] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'instock',
                action: 'get',
                query: {$and: [{_id: {$in: instockItemIds}}, {$expr: {$lt: ['$quantity', '$minimumQuantity']}}]}
            } ) );

            if( err ) {
                Y.log( `handleAutomaticOrdering: failed to get medications from instock ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            instockItems = (instockItems && (instockItems.result ? instockItems.result : instockItems)) || [];

            // try to get existed order
            let [error, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    model: 'stockorders',
                    query: {
                        status: 'created',
                        dateCreated: {$lte: moment().endOf( 'day' ).toDate(), $gte: moment().startOf( 'day' ).toDate()}
                    },
                    user,
                    options: {
                        sort: {
                            _id: -1
                        }
                    }
                } ) );

            if( error ) {
                Y.log( `handleAutomaticOrdering: Failed to get stock order: ${error.stack || error}`, 'error', NAME );
                return handleResult( error, null, callback );
            }

            let
                ordersReceived = (result && (result.result ? result.result : result)) || [],
                existingOrder;
            if( !ordersReceived || !ordersReceived.length ) {
                [error, result] = await formatPromiseResult(
                    createEmptyOrderP( {
                        user,
                        data: {locationId: locationId}
                    } ) );

                if( error ) {
                    Y.log( `updateWares: Failed to create empty order: ${error.stack || error}`, 'error', NAME );
                    return handleResult( error, null, callback );
                }
                existingOrder = result[0];
            } else {
                existingOrder = ordersReceived && ordersReceived[0];
            }

            instockItems.forEach( ( instockItem ) => {
                let stock = existingOrder.stocks.find( s => s.references.toString() === instockItem._id.toString() && s.patients.length === 0 );

                const quantityToOrder = Math.ceil( instockItem.minimumQuantity - instockItem.quantity );
                if( stock ) {
                    stock.quantity += quantityToOrder;
                } else {
                    existingOrder.stocks.push( {
                        stockLocationId: instockItem.stockLocationId,
                        references: instockItem._id,
                        stockType: "instock",
                        phPriceSale: instockItem.phPriceSale,
                        phPriceCost: instockItem.phPriceCost,
                        checked: false,
                        isDivisible: instockItem.isDivisible,
                        dividedQuantity: instockItem.isDivisible ? quantityToOrder * instockItem.phPackSize : quantityToOrder,
                        quantityDelivered: quantityToOrder,
                        quantity: quantityToOrder,
                        phPZN: instockItem.phPZN
                    } );
                }
            } );

            [error] = await formatPromiseResult(
                _updateOrderRecord( user, existingOrder )
            );

            return handleResult(error, [], callback);
        }

        /**
         * Update order record
         * @param {Object} user
         * @param {Object} order
         * @returns {Promise.<*>}
         * @private
         */
        async function _updateOrderRecord(user, order ) {
            order = Y.doccirrus.filters.cleanDbObject( order );

            const [error] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'stockorders',
                    action: 'put',
                    query: {_id: order._id},
                    fields: ['stocks'],
                    data: Y.doccirrus.filters.cleanDbObject( order )
                } ) );

            if( error ) {
                Y.log( `_updateOrderRecord: Failed to update new order: ${error.stack || error}`, 'error', NAME );
                return error;
            }
        }

        /**
         * @class stockordersrequest
         * @namespace doccirrus.api
         * @main
         */
        Y.namespace( 'doccirrus.api' ).stockordersrequest = {
            /**
             * @property name
             * @type {String}
             * @default stockorders-api
             * @protected
             */
            name: NAME,
            saveOrder,
            getOrders,
            updateOrder,
            removeOrder,
            sendOrder,
            arriveOrder,
            saveAsNew,
            getOrderById: _getOrderById,
            defineStatus: _defineStatus,
            updateItemInOrderOrCreateNew,
            createEmptyOrder,
            _insertItemsFromCatalogToInStock,
            _updateCatalogPricesExistinInstockItems,
            getOrderNo,
            handleAutomaticOrdering
        };

    },
    '0.0.1', {
        requires: [
            'dccommunication',
            'stockorders-schema',
            'instock-schema',
            'dcmedia'

            // @see https://confluence.intra.doc-cirrus.com/display/SD/YUI+Dependencies
            // 'activityapi',
            // 'basecontact-api',
            // 'dcauth',
            // 'dccommonerrors',
            // 'dccommonutils',
            // 'dcerror',
            // 'dcerrortable',
            // 'dcfilters',
            // 'dcforms-renderpdf',
            // 'dcmongodb',
            // 'practice-api',
            // 'sysnum-schema'
        ]
    }
);
