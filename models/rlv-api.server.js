/**
 * User: do
 * Date: 06/08/15  12:19
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
'use strict';

YUI.add( 'rlv-api', function( Y, NAME ) {

        /**
         * @module rlv-api
         */

        function get( args ) {
            Y.log('Entering Y.doccirrus.api.rlv.get', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.rlv.get');
            }
            var user = args.user,
                callback = args.callback,
                queryParams = args.query || {},
                options = args.options || {},
                Prom = require( 'bluebird' ),
                runDb = Prom.promisify( Y.doccirrus.mongodb.runDb ),
                employeeCache = {};

            options.sort = {
                year: -1,
                quarter: -1
            };

            function findSpecialityByKey( key, specialities ) {
                var found;
                specialities.some( function( speciality ) {
                    if( speciality.key === key ) {
                        found = speciality.value;
                        return true;
                    }
                } );
                return found || '';
            }

            function populateSpecialities( employee ) {
                return new Prom( function( resolve, reject ) {
                    Y.doccirrus.api.kbv.fachgruppe( {
                        user: user,
                        originalParams: {},
                        callback: function( err, result ) {
                            var specialitiesList, mappedSpecialities = [];
                            if( err ) {
                                return reject( err );
                            } else {
                                specialitiesList = result && result[0] && result[0].kvValue;
                                if( specialitiesList ) {
                                    employee.specialities.forEach( function( specialityKey ) {
                                        var text = findSpecialityByKey( specialityKey, specialitiesList );
                                        if( text ) {
                                            mappedSpecialities.push( text );
                                        }
                                    } );
                                    employee.specialities = mappedSpecialities;
                                }
                                resolve( employee );
                            }
                        }
                    } );
                } );
            }

            function populateEmployee( rlvEntry ) {

                function populate( employee ) {
                    rlvEntry.employeeId = employee;
                    return rlvEntry;
                }

                rlvEntry = JSON.parse( JSON.stringify( rlvEntry ) );

                if( employeeCache[rlvEntry.employeeId] ) {
                    return populate( employeeCache[rlvEntry.employeeId] );
                } else {
                    return runDb( {
                        user: user,
                        model: 'employee',
                        query: {
                            _id: rlvEntry.employeeId
                        },
                        options: {
                            select: {
                                firstname: 1,
                                lastname: 1,
                                rlvCapacity: 1,
                                specialities: 1
                            }
                        }
                    } ).then( function( employees ) {
                        if( employees[0] ) {
                            employeeCache[rlvEntry.employeeId] = JSON.parse( JSON.stringify( employees[0] ) );
                        } else {
                            throw new Error( 'Could not find Employee' );
                        }
                        return employeeCache[rlvEntry.employeeId];
                    } ).then( function( employee ) {
                        if( employee.specialities && employee.specialities.length ) {
                            return populateSpecialities( employee );
                        } else {
                            return employee;
                        }
                    } ).then( function( employee ) {
                        return populate( employee );
                    } );
                }
            }

            function getRlv() {

                return runDb( {
                    user: user,
                    model: 'rlv',
                    query: queryParams,
                    options: options
                } ).then( function( result ) {
                    return result.result;
                } ).map( populateEmployee );
            }

            function getPossibleEmployeeIds() {
                var empQuery = {
                    type: 'PHYSICIAN',
                    rlvCapacity: {$ne: null},
                    physicianInQualification: {$ne: true}
                }, needsEmployees = false;

                if( queryParams['employeeId.name'] ) {
                    needsEmployees = true;
                    empQuery.$or = [
                        {firstname: queryParams['employeeId.name']},
                        {lastname: queryParams['employeeId.name']}
                    ];
                }

                if( queryParams['employeeId.rlvCapacity'] ) {
                    needsEmployees = true;
                    empQuery.rlvCapacity = queryParams['employeeId.rlvCapacity'];
                }

                if( !needsEmployees ) {
                    return Prom.resolve();
                }

                return runDb( {
                    user: user,
                    model: 'employee',
                    query: empQuery,
                    options: {
                        select: {
                            _id: 1
                        }
                    }
                } ).map( function( employee ) {
                    return employee._id.toString();
                } ).then( function( ids ) {
                    delete queryParams['employeeId.name'];
                    delete queryParams['employeeId.rlvCapacity'];
                    queryParams.employeeId = {$in: ids};
                } );

            }

            getPossibleEmployeeIds().then( getRlv ).then( function( results ) {
                callback( null, results );
            } ).catch( function( err ) {
                Y.log( 'could not load rlv entries ' + err.stack, 'error', NAME );
                callback( err );
            } );

        }

        function calculate( args ) {
            Y.log('Entering Y.doccirrus.api.rlv.calculate', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.rlv.calculate');
            }
            var moment = require( 'moment' ),

                Prom = require( 'bluebird' ),
                runDb = Prom.promisify( Y.doccirrus.mongodb.runDb ),
                getModel = Prom.promisify( Y.doccirrus.mongodb.getModel ),
                aggregatePrices = Prom.promisify( _aggregatePrices ),
                aggregateCases = Prom.promisify( _aggregateCases ),

                user = args.user,
                params = args.originalParams || {},
                callback = args.callback,

                quarter, year, activityModel;

            function removeCurrent() {
                return runDb( {
                    user: user,
                    model: 'rlv',
                    action: 'delete',
                    query: {
                        quarter: quarter,
                        year: year
                    },
                    options: {
                        override: true
                    }
                } );

            }

            function cacheModel( model ) {
                activityModel = model;
            }

            function getRlvEmployees() {
                return runDb( {
                    user: user,
                    model: 'employee',
                    query: {
                        type: 'PHYSICIAN',
                        rlvCapacity: {$ne: null},
                        physicianInQualification: {$ne: true}
                    },
                    options: {
                        select: {
                            _id: 1
                        }
                    }
                } ).map( mapEmployee );
            }

            function mapEmployee( employee ) {
                return runDb( {
                    user: user,
                    model: 'employee',
                    query: {
                        type: 'PHYSICIAN',
                        physicianInQualification: true,
                        rlvPhysician: employee._id.toString()
                    },
                    options: {
                        select: {
                            _id: 1
                        }
                    }
                } ).map( function( additionalEmployee ) {
                    return additionalEmployee._id.toString();
                } ).then( function( additionalEmployeeIds ) {
                    return {
                        employeeId: employee._id.toString(),
                        capacity: employee.rlvCapacity,
                        additionalEmployeeIds: additionalEmployeeIds
                    };
                } );
            }

            function mergeResults( prices, cases ) {
                if( Array.isArray( prices.locations ) && Array.isArray( cases.details ) ) {
                    prices.locations.forEach( function( locationStats ) {
                        var locId = locationStats.locationId.toString();
                        locationStats.cases = 0;
                        cases.details.forEach( function( casesDetail ) {
                            if( locId === casesDetail.locationId.toString() ) {
                                locationStats.cases += casesDetail.cases;
                            }
                        } );

                    } );
                }
            }

            function handleEmployee( mappedEmployee ) {
                var empIds = mappedEmployee.additionalEmployeeIds.concat( [mappedEmployee.employeeId] ),
                    priceResult, casesResult;
                return aggregatePrices( quarter, year, empIds ).then( function( results ) {
                    priceResult = results && results[0] || {};
                    return aggregateCases(quarter, year, empIds);
                } ).then( function( results ) {
                    casesResult = results && results[0] || {};
                    mergeResults(priceResult, casesResult);
                    return runDb( {
                        user: user,
                        model: 'rlv',
                        action: 'post',
                        data: {
                            quarter: quarter,
                            year: year,
                            employeeId: mappedEmployee.employeeId,
                            total: priceResult.total,
                            count: priceResult.count,
                            cases: casesResult.total,
                            locations: priceResult.locations,
                            skipcheck_: true
                        }
                    } );
                });

            }

            function _aggregateCases( quarter, year, employeeIds, cb ) {
                var date = moment( quarter + '' + year, 'QYYYY' ),
                    startOf = date.startOf( 'quarter' ).clone().toDate(),
                    endOf = date.endOf( 'quarter' ).toDate();
                Y.log( 'calculate rlv amount of cases for employeeIds ' + employeeIds + ' quarter ' + quarter + ' year ' + year, 'debug', NAME );
                activityModel.mongoose.aggregate( [
                    {
                        $match: {
                            actType: 'SCHEIN',
                            employeeId: {$in: employeeIds},
                            status: {$ne: 'CANCELLED'},
                            timestamp: {
                                $gt: startOf,
                                $lt: endOf
                            },
                            locationId: {
                                $exists: true
                            }
                        }
                    },
                    {
                        $group: {
                            _id: {employeeId: "$employeeId", locationId: "$locationId"},
                            patients: {$addToSet: "$patientId"}
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            employeeId: "$_id.employeeId",
                            locationId: "$_id.locationId",
                            cases: {$size: "$patients"}
                        }
                    }, {

                        $group: {
                            _id: null,
                            total: {$sum: "$cases"},
                            details: {$push: {locationId: "$locationId", employeeId: "$employeeId", cases: "$cases"}}
                        }
                    }
                ], cb );
            }

            function _aggregatePrices( quarter, year, employeeIds, cb ) {
                var date = moment( quarter + '' + year, 'QYYYY' ),
                    startOf = date.startOf( 'quarter' ).clone().toDate(),
                    endOf = date.endOf( 'quarter' ).toDate();
                Y.log( 'calculate rlv for employeeIds ' + employeeIds + ' quarter ' + quarter + ' year ' + year, 'debug', NAME );
                activityModel.mongoose.aggregate( [
                    {
                        $match: {
                            catalogShort: 'EBM',
                            actType: 'TREATMENT',
                            employeeId: {$in: employeeIds},
                            status: {$ne: 'CANCELLED'},
                            timestamp: {
                                $gt: startOf,
                                $lt: endOf
                            },
                            locationId: {
                                $exists: true
                            }
                        }
                    },
                    {
                        $group: {
                            _id: {locationId: "$locationId"},
                            locTotal: {$sum: "$price"},
                            locCount: {$sum: 1}
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            locationId: "$_id.locationId",
                            locTotal: 1,
                            locCount: 1
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: {$sum: "$locTotal"},
                            count: {$sum: "$locCount"},
                            locations: {$push: {locationId: "$locationId", total: "$locTotal", count: "$locCount"}}
                        }

                    }, {
                        $project: {_id: 0, total: 1, count: 1, locations: 1}
                    }
                ], cb );

            }

            if( !params.year || !params.quarter ) {
                return callback( new Error( 'insufficient arguments' ) );
            }

            year = params.year;
            quarter = params.quarter;

            getModel( user, 'activity' )
                .then( cacheModel )
                .then( removeCurrent )
                .then( getRlvEmployees )
                .map( handleEmployee )
                .then( function( result ) {
                    callback( null, result );
                } )
                .catch( function( err ) {
                    Y.log( 'could not calculate rlv ' + err.stack, 'error', NAME );
                    callback( err );
                } );

        }

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        /**
         * @class rlv
         * @namespace doccirrus.api
         */
        Y.namespace( 'doccirrus.api' ).rlv = {

            name: NAME,
            get: get,
            calculate: calculate

        };

    },
    '0.0.1', {requires: []}
);
