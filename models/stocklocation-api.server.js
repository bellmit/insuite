/**
 * User: dcdev
 * Date: 8/25/20  11:37 AM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */

'use strict';

YUI.add( 'stocklocation-api', function( Y, NAME ) {
    const {formatPromiseResult} = require( 'dc-core' ).utils,
        ObjectId = require( 'mongoose' ).Types.ObjectId;

    /**
     * Gets stocklocations
     *
     * @method getWithStockLocations
     * @param {Object} args arguments
     * @param {Object} args.user
     * @param {Object} args.query
     * @param {Object} args.options
     * @param {Function} args.callback
     * @returns {Function} callback
     */
    async function get( args ) {
        Y.log( 'Entering Y.doccirrus.api.stocklocation.get', 'info', NAME );
        if( args.callback ) {
            args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.stocklocation.get' );
        }
        const {user, query = {}, options = {}} = args;

        let error, result;
        [error, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            user,
            model: 'stocklocation',
            query,
            options,
            migrate: true
        } ) );

        if( error ) {
            Y.log( `getStockLocations.stockLocation not found. Query: ${JSON.stringify( query )}`, 'error', NAME );
            return args.callback( error );
        }
        return args.callback( null, result );
    }

    /**
     * Update or remove existing stocklocations, create new
     *
     * @method getWithStockLocations
     * @param {Object} args arguments
     * @param {Object} args.locationId
     * @param {Array} args.stockLocationList
     * @param {Array} args.oldStockLocations
     * @returns {Array} new array of stocklocations
     */
    async function updateFromLocationData( {user, locationId, stockLocationList, oldStockLocations} ) {
        Y.log( 'Entering Y.doccirrus.api.stocklocation.updateFromLocationData', 'info', NAME );
        let error, result, stocklocationModel;

        [error, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            user,
            model: 'stocklocation',
            query: {
                _id: {
                    $in: stockLocationList.map( s => s._id ).concat( oldStockLocations )
                }
            },
            migrate: true
        } ) );

        if( error ) {
            Y.log( `Error when trying to get stocklocations. Error: ${error.stack || error}`, 'error', NAME );
            Y.log( 'Exiting Y.doccirrus.api.stocklocation.updateFromLocationData', 'info', NAME );
            throw error;
        }

        const editedStockLocations = stockLocationList.filter( item => {
                const correspondingItem = result.find( i => i._id.toString() === item._id.toString() );
                return correspondingItem &&
                       (correspondingItem.title !== item.title || correspondingItem.description !== item.description);
            } ),
            newStockLocations = stockLocationList.filter( item => !result.find( i => i._id.toString() === item._id.toString() ) ),
            deleteList = result.filter( item => !stockLocationList.find( i => i._id.toString() === item._id.toString() ) );

        [error, stocklocationModel] = await formatPromiseResult( Y.doccirrus.api.reporting.getModel( user, 'stocklocation' ) );

        if( error ) {
            Y.log( `Error when trying to get stocklocation model. Error: ${error.stack || error}`, 'error', NAME );
            Y.log( 'Exiting Y.doccirrus.api.stocklocation.updateFromLocationData', 'info', NAME );
            throw Y.doccirrus.errors.rest( 'stocklocation_03' );
        }

        let bulk = stocklocationModel.mongoose.collection.initializeUnorderedBulkOp(),
            added = false;

        newStockLocations.forEach( item => {
            bulk.insert( {
                ...item,
                _id: new ObjectId( item._id )
            } );
            if( !added ) {
                added = true;
            }
        } );

        for( let item of editedStockLocations ) {
            [error, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'stocklocation',
                query: {
                    _id: {
                        $ne: item._id
                    },
                    title: item.title
                },
                migrate: true
            } ) );

            if( error || Array.isArray( result ) && result.length ) {
                Y.log(`Stock location ${item.title} cannot be updated because a stock location with the same name already exists`, 'error', NAME);
                Y.log( 'Exiting Y.doccirrus.api.stocklocation.updateFromLocationData', 'info', NAME );
                throw Y.doccirrus.errors.rest( 'stocklocation_05', {$stocklocation: item.title}, true );
            }

            let obj = {};
            for( let field of Object.keys( item ) ) {
                if( field === '_id' ) {
                    continue;
                }
                obj[field] = item[field];
            }
            if( item._id && Object.keys( obj ).length ) {
                bulk.find( {_id: new ObjectId( item._id )} ).updateOne( {$set: obj} );
                if( !added ) {
                    added = true;
                }
            }
        }

        [error] = await formatPromiseResult( deleteStockLocations( {
            user,
            deleteList,
            stockLocationList,
            locationId
        } ) );

        if( error ) {
            Y.log( `updateFromLocationData(): Error in deleting stocklocations. Error: ${error.stack || error}`, 'error', NAME );
            Y.log( 'Exiting Y.doccirrus.api.stocklocation.updateFromLocationData', 'info', NAME );
            throw error;
        }

        if( added ) {
            [error] = await formatPromiseResult( bulk.execute() );

            if( error ) {
                Y.log( `batchUpdate: error executing bulk operation ${error.stack || error}`, 'error', NAME );
                Y.log( 'Exiting Y.doccirrus.api.stocklocation.updateFromLocationData', 'info', NAME );
                throw Y.doccirrus.errors.rest( 'stocklocation_03' );
            }
        }

        Y.log( 'Exiting Y.doccirrus.api.stocklocation.updateFromLocationData', 'info', NAME );
        return stockLocationList.map( s => new ObjectId( s._id ) );
    }

    /**
     * Find out which stocklocation to remove and removes them
     *
     * @method getWithStockLocations
     * @param {Object} args arguments
     * @param {Object} args.locationId
     * @param {Array} args.deleteList
     */

    async function deleteStockLocations( {user, deleteList, locationId} ) {
        Y.log( 'Entering Y.doccirrus.api.stocklocation.deleteStockLocations', 'info', NAME );
        let error, result;
        const itemsToDelete = [];

        for( let item of deleteList ) {
            const itemId = new ObjectId( item._id );
            [error, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'stocklocation',
                action: 'aggregate',
                migrate: true,
                pipeline: [
                    {$match: {_id: itemId}},
                    {
                        $lookup: {
                            from: "locations",
                            let: {stocklocation_id: "$_id"},
                            pipeline: [
                                {
                                    $match: {
                                        _id: {$ne: locationId},
                                        $expr: {
                                            $in: [
                                                "$$stocklocation_id",
                                                "$stockLocations"
                                            ]
                                        }
                                    }
                                },
                                {$project: {locname: 1, stockLocations: 1}}
                            ],
                            as: "locations"
                        }
                    },
                    {
                        $lookup: {
                            from: "stockorders",
                            pipeline: [
                                {
                                    $match: {
                                        'stocks.stockLocationId': itemId
                                    }
                                },
                                {$project: {stocks: 1, status: 1}}
                            ],
                            as: "stockorders"
                        }
                    },
                    {
                        $lookup: {
                            from: "stockdeliveries",
                            pipeline: [
                                {
                                    $match: {
                                        'stocks.stockLocationId': itemId
                                    }
                                },
                                {$project: {stocks: 1, status: 1, orderId: 1}}
                            ],
                            as: "stockdeliveries"
                        }
                    },
                    {
                        $lookup: {
                            from: "instocks",
                            localField: "_id",
                            foreignField: "stockLocationId",
                            as: "instocks"
                        }
                    }
                ]
            } ) );

            if( error ) {
                Y.log( `Error in getting location, orders and instock data: ${error.stack || error}`, 'error', NAME );
                Y.log( 'Exiting Y.doccirrus.api.stocklocation.deleteStockLocations', 'info', NAME );
                throw Y.doccirrus.errors.rest( 'stocklocation_03', true );
            }

            result = result.result || result;
            result = result[0] || {};

            const otherLocationsUse = (result.locations || []).length,
                hasActiveOrders = (result.stockorders || []).find( order => ['created', 'sent'].includes( order.status ) ) ||
                                  (result.stockdeliveries || []).find( order => order.status === 'arrived' ),
                hasInstockQuantity = (result.instocks || []).find( stock => stock.quantity > 0 );

            if( !otherLocationsUse ) {
                const $stocklocation = `${item.title} (${item.description})`;
                if( !hasActiveOrders && !hasInstockQuantity ) {
                    itemsToDelete.push( item._id );
                }
                if( hasInstockQuantity ) {
                    Y.log( 'Exiting Y.doccirrus.api.stocklocation.deleteStockLocations', 'info', NAME );
                    throw Y.doccirrus.errors.rest( 'stocklocation_02', {$stocklocation}, true );
                }
                if( hasActiveOrders ) {
                    Y.log( 'Exiting Y.doccirrus.api.stocklocation.deleteStockLocations', 'info', NAME );
                    throw Y.doccirrus.errors.rest( 'stocklocation_01', {$stocklocation}, true );
                }
            }
        }

        [error] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            user,
            model: 'stocklocation',
            action: 'delete',
            query: {
                _id: {
                    $in: itemsToDelete
                }
            },
            migrate: true
        } ) );

        if( error ) {
            Y.log( `Failed to remove stocklocations. Error: ${error.stack || error}`, 'error', NAME );
            Y.log( 'Exiting Y.doccirrus.api.stocklocation.deleteStockLocations', 'info', NAME );
            throw Y.doccirrus.errors.rest( 'stocklocation_04' );
        }
        Y.log( 'Exiting Y.doccirrus.api.stocklocation.deleteStockLocations', 'info', NAME );
    }

    Y.namespace( 'doccirrus.api' ).stocklocation = {

        name: NAME,
        get,
        updateFromLocationData,
        deleteStockLocations
    };
}, '0.0.1', {
    requires: [
        'stocklocation-schema'
    ]
} );