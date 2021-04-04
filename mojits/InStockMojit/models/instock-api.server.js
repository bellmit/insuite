/*jshint esnext:true */
/*global YUI */


YUI.add( 'instock-api', function( Y, NAME ) {
        const
            {formatPromiseResult, handleResult} = require( 'dc-core' ).utils,
            ObjectId = require( 'mongoose' ).Types.ObjectId,
            util = require( 'util' ),
            moment = require( 'moment' );

        /**
         * @module instock-api
         */
        /**
         * Returns list of Wares from instock document
         * @method getOrders
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Function} args.callback is called with 2 args:
         *  {Object} err
         *  {Object || null} result
         */
        async function getWares( args ) {
            Y.log( 'Entering Y.doccirrus.api.instockrequest.getWares', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.instockrequest.getWares' );
            }

            const
                {options = {}, data = {}, query = {}, originalParams: {summaryRow} = {}, callback, user} = args;

            let
                err,
                result,
                wares,
                count,
                pipeline,
                locationId;
            if( query.$and && query.$and.length > 0 ) {
                query.$and.forEach( ( item ) => {
                    if( item.locationId ) {
                        locationId = item.locationId;
                        item.locationId = ObjectId( item.locationId );
                    }
                } );

                // stockLocation can be attached to more than 1 location
                if( locationId ) {
                    [err, result] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            query: {_id: locationId},
                            model: 'location',
                            options: {
                                select: {
                                    stockLocations: 1
                                }
                            }
                        } ) );

                    if( err ) {
                        Y.log( `Failed to get location ${err.stack || err}`, 'error', NAME );
                        return handleResult( err, null, callback );
                    }

                    let stockLocations = result && result[0] && result[0].stockLocations || null;

                    if( stockLocations && stockLocations.length ) {
                        [err, result] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                user,
                                query: {stockLocations: {$in: stockLocations}},
                                model: 'location',
                                options: {
                                    select: {
                                        _id: 1
                                    }
                                }
                            } ) );

                        if( err ) {
                            Y.log( `Failed to get locations for stockLocations ${err.stack || err}`, 'error', NAME );
                            return handleResult( err, null, callback );
                        }

                        let locations = ( result || [] ).map( i => i._id );
                        if( locations && locations.length ) {
                            query.$and.forEach( ( item ) => {
                                if( item.locationId ) {
                                    item.locationId = {$in: locations};
                                    item.stockLocationId = {$in: stockLocations};
                                }
                            } );
                        }
                    }
                }
            }

            let
                objFieldQuery = {};

            Object.keys( query ).forEach( key => {
                let keyParts = key.split( '.' );
                if( keyParts && keyParts.length > 1 ) {
                    objFieldQuery[key] = query[key];
                    delete query[key];
                }
            } );

            if(!query.hasOwnProperty('isDeleted') && !data.includeDeleted ) {
                let isDeleted = {isDeleted: {$ne: true}};
                Object.assign(query, isDeleted);
            }

            pipeline = [
                {
                    $match: Object.keys( query ).length ? query : {_id: {$exists: true}}
                },
                {
                    $lookup:
                        {
                            from: "basecontacts",
                            let: {supplierId: "$supplierId"},
                            pipeline: [
                                {
                                    $match:
                                        {
                                            $expr:
                                                {$eq: ["$_id", "$$supplierId"]}
                                        }
                                },
                                {$project: {content: 1, baseContactType: 1}}
                            ],
                            as: "supplier"
                        }
                },
                {
                    $unwind: {
                        path: "$supplier",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup:
                        {
                            from: "identities",
                            let: {editorId: "$editorId"},
                            pipeline: [
                                {
                                    $match:
                                        {
                                            $expr:
                                                {$eq: ["$_id", "$$editorId"]}
                                        }
                                },
                                {$project: {firstname: 1, lastname: 1}}
                            ],
                            as: "editor"
                        }
                },
                {
                    $unwind: {
                        path: "$editor",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup:
                        {
                            from: "locations",
                            let: {locationId: "$locationId"},
                            pipeline: [
                                {
                                    $match:
                                        {
                                            $expr:
                                                {$eq: ["$_id", "$$locationId"]}
                                        }
                                },
                                {$project: {locname: 1, stockLocations: 1}}
                            ],
                            as: "location"
                        }
                },
                {
                    $unwind: {
                        path: "$location",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: 'stocklocations',
                        let: {
                            stockLocs: {
                                $ifNull: ['$location.stockLocations', []]
                            }
                        },
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
                    $project: {
                        _id: 1,
                        description: 1,
                        gtinCode: 1,
                        m_extra: 1,
                        minimumQuantity: 1,
                        phPZN: 1,
                        phPriceSale: 1,
                        phPriceCost: 1,
                        phPriceSaleCatalog: 1,
                        phPriceCostCatalog: 1,
                        vatTypeCatalog: 1,
                        phPackSize: 1,
                        phSalesStatus: 1,
                        phUnit: 1,
                        quantity: 1,
                        quantityOrdered: 1,
                        supplierId: 1,
                        locationId: 1,
                        stockLocationId: 1,
                        notes: 1,
                        isDivisible: 1,
                        divisibleCount: 1,
                        prdNo: 1,
                        supplyCategory: 1,
                        ingredients: 1,
                        articleCategory: 1,
                        automaticReorder: 1,
                        vat: 1,
                        vatType: 1,
                        isDeleted: 1,
                        phForm: 1,
                        supplier: "$supplier",
                        dateCreated: 1,
                        dateUpdated: 1,
                        editor: "$editor",
                        location: "$location",
                        stockLocation: {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: "$stockLocations",
                                        as: "sl",
                                        cond: {
                                            $eq: ['$$sl._id', '$stockLocationId']
                                        }
                                    }
                                },
                                0
                            ]
                        }
                    }
                }
            ];

            if( Object.keys( objFieldQuery ).length ) {
                pipeline.push( {$match: objFieldQuery} );
            }

            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'aggregate',
                    pipeline: pipeline.slice(),
                    model: 'instock',
                    options: options
                } ) );

            if( err ) {
                Y.log( `Failed to get data from instock ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            wares = result.result ? result.result : result;
            count = result.count || 0;

            if( summaryRow ) {
                let phPriceSale = 0;
                let phPriceCost = 0;
                let KoTableColumnNumbering = 0;
                wares.forEach( ( ware ) => {
                    phPriceSale += ware.phPriceSale;
                    phPriceCost += ware.phPriceCost;
                    KoTableColumnNumbering += 1;
                } );

                wares.push( {
                    _id: null,
                    phPriceSale,
                    phPriceCost,
                    KoTableColumnNumbering
                } );
            }

            return handleResult( err, {count, query: {}, result: wares}, callback );
        }

        /**
         * Insert Ware into InStock
         * @method insertWares
         * @param {Object} args
         * @param {Object} args.data - InStock_T object
         */
        async function insertWares( args ) {
            Y.log( 'Entering Y.doccirrus.api.instockrequest.insertWares', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.instockrequest.insertWares' );
            }
            let
                {user, data = {}, callback} = args,
                error, result;
            const
                isUserHasRights = _checkUserRights( user );

            if( isUserHasRights ) {
                Y.log( 'Failed to update wares, access denied', 'error', NAME );
                return handleResult( new Y.doccirrus.commonerrors.DCError( 403, {code: 'instockMojit_24'} ), null, callback );

            }

            if( data._id ) {
                delete data._id;
            }

            data = Y.doccirrus.filters.cleanDbObject( data );

            [error, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    action: 'post',
                    model: 'instock',
                    user,
                    data
                } )
            );

            if( error ) {
                Y.log( `Failed to insert wares ${error.stack || error}`, 'error', NAME );
                return handleResult( error, null, callback );
            }

            Y.doccirrus.communication.emitEventForAll( {
                event: 'instockAction',
                msg: {
                    data: {
                        action: 'update'
                    }
                }
            } );

            return handleResult( null, result, callback );
        }

        /**
         * Update wares, allowed for Admins or Support
         * @method updateWares
         * @param {Object} args
         */
        async function updateWares( args ) {
            Y.log( 'Entering Y.doccirrus.api.instockrequest.updateWares', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.instockrequest.updateWares' );
            }
            let
                {user, data = {}, callback, options = {}} = args,
                error, result, updatedItem, fields;
            const
                isUserHasRights = _checkUserRights( user );

            if( isUserHasRights ) {
                Y.log( 'updateWares: Failed to update wares, access denied', 'error', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 403, {code: 'instockMojit_24'} ) );
            }

            [error] = await formatPromiseResult( _checkOtherProcesses( user ) );

            if( error ) {
                Y.log( `updateWares: Failed to get wares ${error.stack || error}`, 'warn', NAME );
                return handleResult( error, null, callback );
            }

            try {
                data = Y.doccirrus.filters.cleanDbObject( data );
                fields = [
                    'description',
                    'm_extra',
                    'minimumQuantity',
                    'phPriceSale',
                    'phPriceCost',
                    'phPriceSaleCatalog',
                    'phPriceCostCatalog',
                    'vatTypeCatalog',
                    'phPackSize',
                    'phUnit',
                    'phPZN',
                    'phSalesStatus',
                    'quantity',
                    'quantityOrdered',
                    'supplier',
                    'gtinCode',
                    'vat',
                    'vatType',
                    'locationId',
                    'stockLocationId',
                    'notes',
                    'isDivisible',
                    'divisibleCount',
                    'prdNo',
                    'articleCategory',
                    'supplyCategory',
                    'automaticReorder',
                    'ingredients',
                    'supplierId'
                ];

                [error, result] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        action: 'put',
                        model: 'instock',
                        query: {_id: data._id},
                        fields: [...fields, 'isDeleted'],
                        user,
                        data,
                        options
                    } ) );

                if( error ) {
                    Y.log( `updateWares: Failed to update wares: ${error.stack || error}`, 'warn', NAME );
                    Y.doccirrus.schemas.sysnum.releaseInstockLock( user, () => {
                    } );
                    return handleResult( error, null, callback );
                }

                updatedItem = result;

                [error, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    action: 'put',
                    user: user,
                    model: 'catalogusage',
                    fields: fields,
                    data: data,
                    query: {
                        phPZN: data.phPZN,
                        locationId: data.locationId
                    }
                } ) );

                if( error ) {
                    Y.log( `updateWares: Failed to update housecatalog:\n${error.stack || error}`, 'warn', NAME );
                } else {
                    Y.log( `updateWares: successfully updated housecatalog item with phPZN ${data.phPZN}`, 'info', NAME );
                }

                // update or create order
                [error, result] = await formatPromiseResult(
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
                    Y.log( `updateWares: Failed to get stock order: ${error.stack || error}`, 'warn', NAME );
                    Y.doccirrus.schemas.sysnum.releaseInstockLock( user, () => {
                    } );
                    return handleResult( error, null, callback );
                }

                Y.doccirrus.api.stockordersrequest.handleAutomaticOrdering( {
                    user,
                    data: {instockItemIds : [data._id], locationId: data.locationId}
                } );


            } catch( err ) {
                Y.log( `updateWares:Failed to update wares ${err.stack || err}`, 'error', NAME );
            } finally {
                Y.doccirrus.schemas.sysnum.releaseInstockLock( user, () => {
                } );
            }

            Y.doccirrus.communication.emitEventForAll( {
                event: 'instockAction',
                msg: {
                    data: {
                        action: 'update'
                    }
                }
            } );

            return handleResult( error, updatedItem, callback );
        }

        /**
         * Returns wares from medicationscatalog
         * @param {Object} args
         * @returns {Promise.<*>}
         */
        async function getWaresFromCatalog( args ) {
            Y.log( 'Entering Y.doccirrus.api.instockrequest.getWaresFromCatalog', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.instockrequest.getWaresFromCatalog' );
            }
            let
                {options = {}, query = {}, callback} = args;
            let
                err,
                wares,
                count;

            [err, wares] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: Y.doccirrus.auth.getSUForLocal(),
                    model: 'medicationscatalog',
                    action: 'get',
                    query: query,
                    options: options
                } )
            );

            for( let ware of wares.result ) {
                ware.ingredients = ware.phIngr.map( ( i ) => {
                    return i.name;
                } );
            }

            if( err ) {
                Y.log( `Failed to get wares from medicationscatalog ${err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            if( options.paging ) {

                [err, count] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user: Y.doccirrus.auth.getSUForLocal(),
                        model: 'medicationscatalog',
                        action: 'count',
                        query: query
                    } )
                );

                if( err ) {
                    Y.log( `Failed to get wares count in medicationscatalog ${err.stack || err}`, 'error', NAME );
                    return handleResult( err, null, callback );
                }

                wares.count = count;
            }

            return handleResult( null, wares, callback );
        }

        /**
         * Reduce ware count
         * @method reduceWaresCount
         * @param {Object} args
         * @param {string} args.data._id - stock item _id
         * @param {string} args.data[i].phPZN - works with if stockLocationId is defined
         * @param {string} args.data[i].stockLocationId -works if stockLocationId is defined
         * @param {Number} args.data[i].reduce - how many items should be reduced
         * @param {Number} args.data[i].reduceAsTp - convert reduce quantiy to TP
         */
        async function reduceWaresCount( args ) {
            Y.log( 'Entering Y.doccirrus.api.instockrequest.reduceWaresCount', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.instockrequest.reduceWaresCount' );
            }
            let
                {user, data : {waresToReduce = [], locationId},callback, options = {}} = args,
                error, result, wares,
                releaseInstockLockP = util.promisify( Y.doccirrus.schemas.sysnum.releaseInstockLock );

            if( !waresToReduce.length ) {
                Y.log( `reduceWaresCount: no wares to reducee`, 'warn', NAME );
                return handleResult( null, null, callback );
            }

            [error] = await formatPromiseResult( _checkOtherProcesses( user ) );

            if( error ) {
                Y.log( `reduceWaresCount: Failed to get wares ${error.stack || error}`, 'warn', NAME );
                return handleResult( error, null, callback );
            }

            try {
                let query = [];
                let pznReduceMap = {};
                let idReduceMap = {};
                waresToReduce.forEach( ( ware ) => {
                    if( ware._id ) {
                        query.push( {_id: new ObjectId( ware._id )} );
                        if( idReduceMap[ware._id.toString()] ) {
                            idReduceMap[ware._id.toString()].reduce += Number( ware.reduce );
                        } else {
                            idReduceMap[ware._id.toString()] = {
                                reduce: Number( ware.reduce ),
                                reduceAsTp: (ware.reduceAsTp),
                                notes: ware.notes
                            };
                        }
                    } else {
                        query.push( {
                            $and: [
                                {phPZN: ware.phPZN},
                                {stockLocationId: new ObjectId( ware.stockLocationId )}
                            ]
                        } );

                        if( pznReduceMap[ware.phPZN + ware.stockLocationId.toString()] ) {
                            pznReduceMap[ware.phPZN + ware.stockLocationId.toString()].reduce += Number( ware.reduce );
                        } else {
                            pznReduceMap[ware.phPZN + ware.stockLocationId.toString()] = {
                                reduce: Number( ware.reduce ),
                                reduceAsTp: (ware.reduceAsTp),
                                notes: ware.notes
                            };
                        }
                    }
                } );

                query = {$or: query};

                [error, wares] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'instock',
                        action: 'get',
                        query: query
                    } )
                );

                if( error ) {
                    Y.log( `reduceWaresCount: Failed to get items from instock ${error.stack || error}`, 'error', NAME );
                    return handleResult( error, null, callback );
                }

                wares = wares.result ? wares.result : wares;

                if( !wares.length ) {
                    return handleResult( Y.doccirrus.errorTable.getMessage( {code: 'instockMojit_25'} ), null, callback ); //TODO Wrong erro message
                }

                let promises = [];

                wares.forEach( ware => {
                    const reducingWare = idReduceMap.hasOwnProperty( ware._id.toString() ) ? idReduceMap[ware._id.toString()] :
                        pznReduceMap[ware.phPZN + ware.stockLocationId.toString()];
                    let reduceQuantity = reducingWare.reduce;

                    if( reducingWare.reduceAsTp ) {
                        reduceQuantity = reducingWare.reduce / (Number( ware.phPackSize ) || 1);
                    }

                    let quantity = Number( ware.quantity - reduceQuantity );
                    if( quantity < 0.001 ) {
                        quantity = 0;
                    }
                    promises.push( Y.doccirrus.mongodb.runDb( {
                        action: 'update',
                        model: 'instock',
                        query: {_id: ware._id},
                        fields: [
                            'quantity',
                            'notes'
                        ],
                        user,
                        data: {
                            skipcheck_: true,
                            quantity: quantity,
                            notes: reducingWare.notes
                        },
                        options
                    } ) );
                } );

                [error, result] = await formatPromiseResult( Promise.all( promises ) );

                if( error ) {
                    Y.log( `Failed to update instock ${error.stack || error}`, 'error', NAME );
                    return handleResult( error, null, callback );
                }

                Y.doccirrus.communication.emitEventForAll( {
                    event: 'instockAction',
                    msg: {
                        data: {
                            action: 'update'
                        }
                    }
                } );


                const instockItemIds = wares.map( w => w._id );

                Y.doccirrus.api.stockordersrequest.handleAutomaticOrdering( {
                    user,
                    data: {instockItemIds, locationId}
                } );

                return handleResult( null, result, callback );
            } catch( error ) {
                Y.log( `reduceWaresCount" Failed to reduce ware count ${error.stack || error}`, 'warn', NAME );
                return handleResult( error, null, callback );
            } finally {
                await formatPromiseResult( releaseInstockLockP( user ) );
            }
        }

        function _checkUserRights( user ) {
            return !Y.doccirrus.auth.isAdminUser( user ) && !( Y.doccirrus.auth.memberOf( user, Y.doccirrus.schemas.identity.userGroups.SUPPORT ) || Y.doccirrus.auth.memberOf( user, Y.doccirrus.schemas.identity.userGroups.SUPERUSER ) );
        }
        function _checkOtherProcesses( user ) {
            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.schemas.sysnum.getInstockLock( user, ( err, getLock ) => {
                    Y.log( 'instockLock: get instock lock', 'info', NAME );
                    if( err ) {
                        Y.log( `Error getting inStock lock ${err.message}`, 'error', NAME );
                        return reject( err );
                    }

                    if( true !== getLock ) {
                        Y.log( `instockLock: Error getting inStock lock ${getLock}`, 'error', NAME );
                        return reject( Y.doccirrus.errors.rest( 'instockMojit_01' ) );
                    }

                    resolve( null );
                } );
            } );
        }

        /**
         * Gets vat list from config file
         * @param {Object} args
         * @param {Function} args.callback
         */
        async function getVatList( args ) {
            Y.log( 'Entering Y.doccirrus.api.instockrequest.getVatList', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.instockrequest.getVatList' );
            }
            let
                callback = args.callback;

            return handleResult( null, Y.doccirrus.vat.getList(), callback );
        }

        /**
         * @class instockrequest
         * @namespace doccirrus.api
         * @main
         */
        Y.namespace( 'doccirrus.api' ).instockrequest = {
            /**
             * @property name
             * @type {String}
             * @default instock-api
             * @protected
             */
            name: NAME,
            getWares,
            getWaresFromCatalog,
            insertWares: insertWares,
            updateWares,
            getVatList: getVatList,
            reduceWaresCount
        };

    },
    '0.0.1', {
        requires: [
            'doccirrus',
            'dccommunication',
            'instock-schema',
            'medicationscatalog-schema'
        ]
    }
);
