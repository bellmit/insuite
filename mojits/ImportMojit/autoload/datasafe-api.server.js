/**
 * User: bhagyashributada
 * Date: 5/7/18  12:41 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */



YUI.add( 'datasafe-api', function( Y, NAME ) {

        const
            { formatPromiseResult } = require( 'dc-core' ).utils,
            types = Y.doccirrus.schemas.datasafe.types.Datasafe_T,
            DCError = Y.doccirrus.commonerrors.DCError,
            modelsArr = ['activity', 'basecontact', 'calendar', 'casefolder', 'employee', 'identity', 'location', 'patient', 'patientversion', 'schedule'],
            collectionArr = [ 'activity', 'calendar'];


        async function populateDatasafe( args ) {  //jshint ignore:line
            Y.log('Entering Y.doccirrus.api.datasafe.populateDatasafe', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.datasafe.populateDatasafe');
            }

            let callback = args.callback,
                error,
                result,
                aggResult,
                data = {};

            Object.keys( types ).forEach( key => {
                data[key] = {};
            });

            //================================================
            // Get Locations

            [ error, result ] = await formatPromiseResult( //jshint ignore:line
                Y.doccirrus.mongodb.runDb( {
                    action: 'get',
                    model: 'location',
                    query: {},
                    options: {
                        lean: true,
                        select: {
                            locname: 1, commercialNo: 1
                        }
                    },
                    user: Y.doccirrus.auth.getSUForLocal()
                } )
            );

            if( error ) {
                Y.log( `populateDatasafe: Error while querying locations. Error: ${error} `, "error", NAME );
                return callback( error );
            }

            if( result && Array.isArray(result) ) {
                Y.log( `populateDatasafe: No of locations: ${result.length} `, "info", NAME );
               data.practice.locations = result;
            }

            //================================================
            // Get Employees

            [ error, result ] = await formatPromiseResult( //jshint ignore:line
                Y.doccirrus.mongodb.runDb( {
                    action: 'get',
                    model: 'employee',
                    query: {username: {$ne: Y.doccirrus.schemas.identity.getSupportIdentityObj().username}},
                    options: {
                        lean: true,
                        select: {
                            lastname: 1, officialNo: 1
                        }
                    },
                    user: Y.doccirrus.auth.getSUForLocal()
                } )
            );

            if( error ) {
                Y.log( `populateDatasafe: Error while querying employees. Error: ${error} `, "error", NAME );
                return callback( error );
            }

            if( result && Array.isArray(result) ) {
                Y.log( `populateDatasafe: No of employees: ${result.length} `, "info", NAME );
                data.practice.employees = result;
            }

            //================================================
            //Get Collection Counts

            for( let i = 0 ; i < modelsArr.length; i++ ) {

                [error, result] = await formatPromiseResult( //jshint ignore:line
                    Y.doccirrus.mongodb.runDb( {
                        action: 'count',
                        model: modelsArr[i],
                        query: {},
                        options: {lean: true},
                        user: Y.doccirrus.auth.getSUForLocal()
                    } )
                );

                if( error ) {
                    Y.log( `populateDatasafe: Error while querying ${modelsArr[i]}. Error: ${error}`, "error", NAME );
                    return callback( error );
                }

               // if( result ) {
                    Y.log( `populateDatasafe: No of records in ${modelsArr[i]}: ${result || 0}`, "info", NAME );
                    data.collections[modelsArr[i]] = result || 0;
                //}
            }

            //================================================
            //Get Aggregation of Activities

            [ error, aggResult ] = await formatPromiseResult( //jshint ignore:line
                Y.doccirrus.mongodb.runDb( {
                    action: 'aggregate',
                    model: 'activity',
                    pipeline: [
                        {
                            $group: {
                                _id: "$actType", cnt: {$sum: 1}
                            }
                        },
                        {$sort: {cnt: 1}}
                    ],
                    options: {lean: true},
                    user: Y.doccirrus.auth.getSUForLocal()
                } )
            );

            if( error ) {
                Y.log( `populateDatasafe: Error while aggregation of activities. Error: ${error} `, "error", NAME );
                return callback( error );
            }

            if( aggResult && aggResult.result && Array.isArray( aggResult.result ) ) {
                Y.log( `populateDatasafe: Aggregated result : ${JSON.stringify( aggResult.result )} `, "info", NAME );
                aggResult.result.reduce( ( red, currentObj ) => {
                    red[currentObj._id] = currentObj.cnt;
                    return red;
                }, data.activities );
            }

            //================================================
            //Get EmployeeId, LocationId Reference errors in activities & Calendars

            for( let i = 0; i < collectionArr.length; i++ ) {

                let errorCode = collectionArr[i] === 'activity' ? ['26510','26511'] : ['26512','26513'],
                    empKey = collectionArr[i] === 'activity' ? 'employeeId' : 'employee';

                //Get EmployeeId Reference errors
                [error, aggResult] = await formatPromiseResult( //jshint ignore:line
                    Y.doccirrus.mongodb.runDb( {
                        action: 'aggregate',
                        model: collectionArr[i],
                        pipeline: [
                            {$match: { [empKey] : {$exists:true, $not: /^[0-9a-fA-F]{24}$|^$/}}},
                            {
                                $group: {
                                    _id: `$${empKey}`,
                                    cnt: {$sum: 1}
                                }
                            },
                            {
                                $group: {
                                    _id: null, n: {$sum: {$add: "$cnt"}},
                                    "descr": { "$addToSet": "$$ROOT"}
                                }
                            },
                            {
                                $project: {_id: 0, n: 1, descr: 1}
                            }
                        ],
                        options: {
                            lean: true
                        },
                        user: Y.doccirrus.auth.getSUForLocal()
                    } )
                );

                if( error ) {
                    Y.log( `populateDatasafe: Error while querying ${collectionArr[i]} collection. Error: ${error} `, "error", NAME );
                    return callback( error );
                }

                if( aggResult && aggResult.result && Array.isArray(aggResult.result) && aggResult.result.length ){
                    data.errors[ errorCode[0] ] = Object.assign( { "msg": new DCError( errorCode[0] ).message }, aggResult.result[0]);
                }

                //================================================
                //Get LocationId Reference errors

                [error, aggResult] = await formatPromiseResult( //jshint ignore:line
                    Y.doccirrus.mongodb.runDb( {
                        action: 'aggregate',
                        model: collectionArr[i],
                        pipeline: [
                            {$match: {locationId: {$exists: true, $not: {$type: "objectId"}}}},
                            {
                                $group: {
                                    _id: "$locationId",
                                    cnt: {$sum: 1}
                                }
                            },
                            {
                                $group: {
                                    _id: null, n: {$sum: {$add: "$cnt"}},
                                    descr: {"$addToSet": "$$ROOT"}
                                }
                            },
                            {
                                $project: {_id: 0, n: 1, descr: 1}
                            }
                        ],
                        options: {
                            lean: true
                        },
                        user: Y.doccirrus.auth.getSUForLocal()
                    } )
                );

                if( error ) {
                    Y.log( `populateDatasafe: Error while querying ${collectionArr[i]} collection. Error: ${error} `, "error", NAME );
                    return callback( error );
                }

                if( aggResult && aggResult.result && Array.isArray(aggResult.result) && aggResult.result.length ){
                    data.errors[ errorCode[1] ] = Object.assign( { "msg": new DCError( errorCode[1] ).message }, aggResult.result[0]);
                }
            }

            //================================================
            //Get patient reference errors in schedules

            [error, aggResult] = await formatPromiseResult( //jshint ignore:line
                Y.doccirrus.mongodb.runDb( {
                    action: 'aggregate',
                    model: 'schedule',
                    pipeline: [
                        {$match: {patient: {$exists: true, $ne: null, $not: {$type: "objectId"}}}},
                        {
                            $group: {
                                _id: "$patient",
                                cnt: {$sum: 1}
                            }
                        },
                        {
                            $group: {
                                _id: null, n: {$sum: {$add: "$cnt"}},
                                descr: {"$addToSet": "$$ROOT"}
                            }
                        },
                        {
                            $project: {_id: 0, n: 1, descr: 1}
                        }
                    ],
                    options: {
                        lean: true
                    },
                    user: Y.doccirrus.auth.getSUForLocal()
                } )
            );

            if( error ) {
                Y.log( `populateDatasafe: Error while querying activities collection. Error: ${error} `, "error", NAME );
                return callback( error );
            }

            if( aggResult && aggResult.result && Array.isArray(aggResult.result) && aggResult.result.length ){
                data.errors['26514'] = Object.assign( { "msg": new DCError('26514').message }, aggResult.result[0]);
            }

            //================================================
            //Get scheduletype reference errors in schedules

            [error, aggResult] = await formatPromiseResult( //jshint ignore:line
                Y.doccirrus.mongodb.runDb( {
                    action: 'aggregate',
                    model: 'schedule',
                    pipeline: [
                        {$match: {scheduletype: {$exists: true, $not: /^[0-9a-fA-F]{24}$|^$/}}},
                        {
                            $group: {
                                _id: "$scheduletype",
                                cnt: {$sum: 1}
                            }
                        },
                        {
                            $group: {
                                _id: null, n: {$sum: {$add: "$cnt"}},
                                descr: {"$addToSet": "$$ROOT"}
                            }
                        },
                        {
                            $project: {_id: 0, n: 1, descr: 1}
                        }
                    ],
                    options: {
                        lean: true
                    },
                    user: Y.doccirrus.auth.getSUForLocal()
                } )
            );

            if( error ) {
                Y.log( `populateDatasafe: Error while querying activities collection. Error: ${error} `, "error", NAME );
                return callback( error );
            }

            if( aggResult && aggResult.result && Array.isArray(aggResult.result) && aggResult.result.length ){
                data.errors['26515'] = Object.assign( { "msg": new DCError('26515').message }, aggResult.result[0]);
            }

            //================================================
            //Get physician reference errors in patient

            [error, aggResult] = await formatPromiseResult( //jshint ignore:line
                Y.doccirrus.mongodb.runDb( {
                    action: 'aggregate',
                    model: 'patient',
                    pipeline: [
                        {$match: {physicians: {$exists: true, $not: {$gte: []}}}},
                        {
                            $group: {
                                _id: "$physicians",
                                cnt: {$sum: 1}
                            }
                        },
                        {
                            $group: {
                                _id: null, n: {$sum: {$add: "$cnt"}},
                                descr: {"$addToSet": "$$ROOT"}
                            }
                        },
                        {
                            $project: {_id: 0, n: 1, descr: 1}
                        }
                    ],
                    options: {
                        lean: true
                    },
                    user: Y.doccirrus.auth.getSUForLocal()
                } )
            );

            if( error ) {
                Y.log( `populateDatasafe: Error while querying patients collection. Error: ${error} `, "error", NAME );
                return callback( error );
            }

            if( aggResult && aggResult.result && Array.isArray(aggResult.result) && aggResult.result.length ){
                data.errors['26516'] = Object.assign( { "msg": new DCError('26516').message }, aggResult.result[0]);
            }

            //================================================
            Y.log( `populateDatasafe: Datasafe Stats: ${JSON.stringify(data)} `, "info", NAME );

            callback(null, data);
        }

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        /**
         * @class datasafe
         * @namespace doccirrus.api
         */
        Y.namespace( 'doccirrus.api' ).datasafe = {

            name: NAME,
            get: populateDatasafe,
            put: function() {
                return;
            },
            post: function() {
                return;
            }
        };

    },
    '0.0.1', {requires: ['datasafe-schema']}
);