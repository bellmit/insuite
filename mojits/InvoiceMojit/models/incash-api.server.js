/*global YUI */



YUI.add( 'incash-api', function( Y, NAME ) {

         const
             util = require('util'),
             {formatPromiseResult} = require( 'dc-core' ).utils,
             ObjectId = require( 'mongoose' ).Types.ObjectId;


        /**
         * Returns all receipts - implemented paginated union of activity (RECEIPT, BADDEBT) and incash
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.options
         * @param {Function} args.callback
         */
        async function getReceiptsBook( args ) {
            Y.log( 'Entering Y.doccirrus.api.incash.getReceiptsBook', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.incash.getReceiptsBook' );
            }
            const
                { user, options = {}, query: queryParams = {}, callback } = args;

            let { $and, ...rest} = queryParams,
                aggregateQuery = { $and: Object.entries(rest || {}).reduce((arr, [key, val]) => {
                        let obj = {};
                        obj[key] = val;
                        return [ ...arr, obj ] ;
                    }, []) };

            // query in lookup aggregation should have only one $and inside
            aggregateQuery.$and = [...aggregateQuery.$and, ...$and ];

            if( !aggregateQuery.$and.length ){
                //there are no query do not execute aggregate due to performance
                Y.log( `getReceiptsBook: aggregation query can't be build for ${JSON.stringify(queryParams)}`, 'warn', NAME );
                return callback( null, [] );
            }

            //cast Dates and ObjctId for query
            Y.doccirrus.cardioutils.traverse( aggregateQuery, [], null, (pathArr, obj, parent) => {
                let changed = false,
                    lastKey = pathArr.length === 0 ? null : pathArr[pathArr.length -1];

                if( !lastKey ){
                    return;
                }

                if( (pathArr || []).includes( 'timestamp') ){
                    obj = new Date(obj);
                    changed = true;
                }

                if( (pathArr || []).includes( 'locationId') ){
                    obj = ObjectId(obj);
                    changed = true;
                }

                if( changed ){
                    parent[lastKey] = obj;
                }
            }, true );

            let pipeline = [
                { $limit: 1 },
                { $facet: {
                        collection1: [
                            { $limit: 1 },
                            { $lookup: {
                                    from: "activities",
                                    pipeline: [
                                        { $match: {
                                                $and: [
                                                    { actType: {$in: ['RECEIPT', 'BADDEBT'] } },
                                                    ...aggregateQuery.$and
                                                ]
                                            } }
                                    ],
                                    as: "collection1"
                                } },
                            { $addFields: {
                                    collection1Count: { $size: "$collection1" },
                                    collection1Sum: { $reduce: {
                                            input: "$collection1",
                                            initialValue: 0,
                                            in: { $add : ["$$value", { $cond: [ { $not: [ { $eq: [ "$$this.status", 'CANCELLED' ] } ] }, { $ifNull: [ "$$this.amount", 0 ] }, 0 ] } ] }
                                        } }
                                } }
                        ],
                        collection2: [
                            { $limit: 1 },
                            { $lookup: {
                                    from: "incashes",
                                    pipeline: [
                                        { $match: aggregateQuery }
                                    ],
                                    as: "collection2"
                                } },
                            { $addFields: {
                                    collection2Count: { $size: "$collection2" },
                                    collection2Sum: { $reduce: {
                                            input: "$collection2",
                                            initialValue: 0,
                                            in: { $add : ["$$value", { $cond: [ { $not: [ { $eq: [ "$$this.status", 'CANCELLED' ] } ] }, { $ifNull: [ "$$this.amount", 0 ] }, 0 ] } ] }
                                        } }
                                } }

                        ]
                    } },
                { $project: {
                        collection1Count: "$collection1.collection1Count",
                        collection2Count: "$collection2.collection2Count",
                        collection1Sum: "$collection1.collection1Sum",
                        collection2Sum: "$collection2.collection2Sum",
                        data: {
                            $concatArrays: [
                                { $arrayElemAt: ["$collection1.collection1", 0] },
                                { $arrayElemAt: ["$collection2.collection2", 0] }
                            ]
                        }
                    } },
                {  $addFields: {
                        "data.collection1Count": { $arrayElemAt: ["$collection1Count", 0 ] },
                        "data.collection2Count": { $arrayElemAt: ["$collection2Count", 0 ] },
                        "data.collection1TotalSum": { $arrayElemAt: ["$collection1Sum", 0 ] },
                        "data.collection2TotalSum": { $arrayElemAt: ["$collection2Sum", 0 ] }
                    } },
                { $unwind: "$data" },
                { $replaceRoot: { "newRoot": "$data" } }
            ];

            if( options.sort && Object.keys(options.sort).length ){
                pipeline.push( { $sort: options.sort } );
            } else {
                pipeline.push( { $sort: { timestamp: 1 } });
            }
            if( options.skip ){
                pipeline.push( { $skip: options.skip } );
            }
            if( options.limit ){
                pipeline.push( { $limit: options.limit } );
            }

            //to workaround ne way of aggregate total count calculation manually push part that added automatically at dc-core (in first $facet)
            pipeline.push(
                { $facet: {
                    "meta": [{ "$count": "count" }],
                    "data": [{ "$match": {} }]
                }}
            );

            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'aggregate',
                    pipeline
                } )
            );
            if( err ){
                Y.log( `getReceiptsBook: Error on aggregating data ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            let firstResult = result && result.result && result.result[0] || {},
                totalCount = (firstResult.collection1Count || 0) + (firstResult.collection2Count || 0),
                tottalSum = (firstResult.collection1TotalSum || 0) + (firstResult.collection2TotalSum || 0);

            result.count = totalCount;
            result.result = [...(result.result || []), {
                _id: null,
                amount: tottalSum
            }];

            callback( null, result );
        }

        /**
         * save/update incash entry
         *
         * @param {Object} args
         */
        function save( args ) {
            Y.log( 'Entering Y.doccirrus.api.incash.save', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.incash.save' );
            }
            const
                { user, originalParams: {_id, timestamp = new Date(), employeeName = args.user.U, amount = 0, locationId, content = '', cashbook, cashbookId }, callback } = args,
                data = {
                    _id,
                    timestamp,
                    amount,
                    employeeName,
                    cashbook,
                    cashbookId,
                    locationId,
                    content
                };

            Y.doccirrus.mongodb.runDb( {
                user,
                action: _id ? 'put' : 'post',
                model: 'incash',
                query: { _id, status: 'VALID' },
                data: Y.doccirrus.filters.cleanDbObject( data ),
                fields: Object.keys( data )
            }, callback );
        }

        /**
         * cancel VALID incash entry
         *
         * @param {Object} args
         * @return {Promise<*>}
         */
        function cancel( args ) {
            Y.log( 'Entering Y.doccirrus.api.incash.cancel', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.incash.cancel' );
            }
            const
                { user, data: { ids = [] }, callback } = args;

            if( !ids.length ){
                return callback( null );
            }

            Y.doccirrus.mongodb.runDb( {
                user,
                action: 'put',
                model: 'incash',
                query: { _id: { $in: ids }, status: 'VALID' },
                data: { status: 'CANCELLED', skipcheck_: true },
                fields: [ 'status' ],
                options: { multi: true }
            }, callback );
        }
        /**
         * @method getNextIncashNo
         * @public
         *
         * find particular number generator by locationId/cashbookId and corresponding incash settings.
         * Get next number from generator and format accordingly to settings parameters
         *
         * @param {Object} user
         * @param {Object} locationId
         * @param {String} cashbookId
         *
         * @returns {Promise<String>} callback
         */
        async function getNextIncashNo( user, locationId, cashbookId ) {
            Y.log( 'Entering Y.doccirrus.api.incash.getNextIncashNo', 'info', NAME );
            const
                getNextInCashNo = util.promisify( Y.doccirrus.schemas.sysnum.getNextInCashNo );

            //get number settings
            let [err, configs] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb({
                    user,
                    model: 'invoiceconfiguration',
                    options: {
                        limit: 1,
                        select: { receiptsSchemes: 1 }
                    }
                } )
            );
            if( err ){
                Y.log( `incash.setNo: Error getting number config ${err.stack || err}`, 'error', NAME );
                Y.log( 'Exiting Y.doccirrus.api.incash.getNextIncashNo', 'info', NAME );
                throw( err );
            }

            configs = configs && configs[0] && configs[0].receiptsSchemes || [];

            let
                did = Y.doccirrus.schemas.sysnum.getReceiptsSchemeCounterDomain( locationId.toString(), cashbookId.toString() ),
                sysnums;
            [err, sysnums] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'sysnum',
                    action: 'get',
                    query: {partition: did},
                    fields: ['_id']
                } )
            );
            if( err ){
                Y.log( `getNextIncashNo: Error getting sysnum entry for ${did} ${err.stack || err}`, 'error', NAME );
                Y.log( 'Exiting Y.doccirrus.api.incash.getNextIncashNo', 'info', NAME );
                throw( err );
            }
            if( !sysnums.length ){
                Y.log( `getNextIncashNo: sysnum entry for ${did} not found`, 'warn', NAME );

                //get previous sysnums and update invoiceconfiguration (this is one time operation)
                //on invoiceconfiguration put will be crated new sysnum entries that includes locationId and receiptScheme _id
                [err, sysnums] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'sysnum',
                        action: 'get',
                        query: {partition: /^[^\-]+-receipts-schemes/}
                    } )
                );
                if( err ){
                    Y.log( `getNextIncashNo: Error getting previous sysnum entries ${did} ${err.stack || err}`, 'error', NAME );
                    Y.log( 'Exiting Y.doccirrus.api.incash.getNextIncashNo', 'info', NAME );
                    throw( err );
                }
                if( !sysnums.length  ) {
                    Y.log( `getNextIncashNo: previous sysnum entries not found`, 'error', NAME );
                    Y.log( 'Exiting Y.doccirrus.api.incash.getNextIncashNo', 'info', NAME );
                    throw(new Error( 'incash sysnum not found' ));
                }

                //generate new sysnum that includes id of receiptsSchemes entry and keep number from previous sequence
                sysnums = sysnums.map( sysnum => {
                    let partitionParts = sysnum.partition.split( '-' );
                    sysnum.locationId = partitionParts[0];
                    return sysnum;
                });
                configs = configs.map( el => {
                    let sysnumByLocation = sysnums.find( sysnum => sysnum.locationId === el.locationId.toString());
                    if( sysnumByLocation ){
                        el.nextNumber = sysnumByLocation.number;
                    }
                    return el;
                });

                //note validation in invoiceconfiguration nextNumber have been changed to allow updating only receiptScheme
                //and do not obtain current sysnum state for invoiceNumberSchemes amd receiptNumberScheme, hence when saving from UI
                //next Number for all of them are still required
                [err] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb({
                        user,
                        model: 'invoiceconfiguration',
                        action: 'put',
                        query: {_id: '000000000000000000000001'},
                        data: { receiptsSchemes: configs, skipcheck_: true },
                        fields: [ 'receiptsSchemes' ]
                    } )
                );
                if( err ){
                    Y.log( `incash.setNo: Error regenerating new sequence format config ${err.stack || err}`, 'error', NAME );
                    Y.log( 'Exiting Y.doccirrus.api.incash.getNextIncashNo', 'info', NAME );
                    throw( err );
                }

                //repeat getting updated sysnum
                [err, sysnums] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'sysnum',
                        action: 'get',
                        query: {partition: did},
                        fields: ['_id']
                    } )
                );
                if( err ){
                    Y.log( `getNextIncashNo: Error getting updated sysnum entry for ${did} ${err.stack || err}`, 'error', NAME );
                    Y.log( 'Exiting Y.doccirrus.api.incash.getNextIncashNo', 'info', NAME );
                    throw( err );
                }
                if( !sysnums.length ) {
                    Y.log( `getNextIncashNo: updated sysnum entry for ${did} not found`, 'error', NAME );
                    Y.log( 'Exiting Y.doccirrus.api.incash.getNextIncashNo', 'info', NAME );
                    throw(new Error( `updated sysnum entry for ${did} not found` ));
                }
            }

            configs = configs.filter( el => el.locationId.toString() === locationId.toString() && el._id.toString() === cashbookId.toString() );
            if( !configs.length  ){
                Y.log( `getNextIncashNo: config for number not found`, 'error', NAME );
                Y.log( 'Exiting Y.doccirrus.api.incash.getNextIncashNo', 'info', NAME );
                throw( new Error( 'incash number config not found' ) );
            }

            let nextNo;
            [err, nextNo] = await formatPromiseResult( getNextInCashNo( user, sysnums[0] ) );
            if( err ){
                Y.log( `getNextIncashNo: Error getting next sequence number ${err.stack || err}`, 'error', NAME );
                Y.log( 'Exiting Y.doccirrus.api.incash.getNextIncashNo', 'info', NAME );
                throw( err );
            }
            if( !nextNo.number ){
                Y.log( `getNextIncashNo: Next sequence number not obtained`, 'error', NAME );
                Y.log( 'Exiting Y.doccirrus.api.incash.getNextIncashNo', 'info', NAME );
                throw( Y.doccirrus.errors.http( 500, 'Next sequence number not obtained' ) );
            }

            Y.log( 'Exiting Y.doccirrus.api.incash.getNextIncashNo', 'info', NAME );
            return `${configs[0].year || ''}${nextNo.number.toString().padStart((configs[0].digits || 7), 0)}`;
        }

        Y.namespace( 'doccirrus.api' ).incash = {
            name: NAME,
            save,
            getReceiptsBook,
            cancel,
            getNextIncashNo
        };

    },
    '0.0.1', {requires: []}
);
