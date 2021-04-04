/**
 * User: do
 * Date: 15/10/15  13:15
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
'use strict';

YUI.add( 'budget-api', function( Y, NAME ) {

        /**
         * @module budget-api
         */

        const
            moment = require( 'moment' ),
            ObjectId = require( 'mongoose' ).Types.ObjectId,
            {formatPromiseResult} = require( 'dc-core' ).utils;

        /**
         * @method getLocationEmployeePatientRelation
         * @private
         *
         * collect Scheins in period and group by location and inside by employee
         *
         * @param {Object} user
         * @param {Object} start
         * @param {Object} end
         * @param {Array} locationIds
         *
         * @returns {Promise}
         */
        async function getLocationEmployeePatientRelation( user, start, end, locationIds ) {
            const
                pipeline = [
                    {$match: {
                        actType: {$in: ['SCHEIN', 'PUBPRESCR', 'PRESCRT', 'PRESCRBTM', 'MEDICATION', 'KBVUTILITY', 'KBVUTILITY2']},
                        timestamp: {$gte: start, $lte: end}, locationId: { $in: locationIds }
                    }},
                    {$group: {_id: {locationId: "$locationId", employeeId: "$employeeId"}, patientIds: {$addToSet: "$patientId"}}},
                    {$group: {_id: {locationId: "$_id.locationId"}, employees: {$addToSet: {employeeId: "$_id.employeeId", patientIds: "$patientIds"}}}},
                    {$project: {_id: 0, locationId: "$_id.locationId", employees: "$employees"}}
                ];
            let [ err, patientsInlocations ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'aggregate',
                    pipeline: pipeline,
                    model: 'activity'
                } )
            );
            if( err ) {
                Y.log(`getLocationEmployeePatientRelation: Error getting patient model: ${err.stack || err}`, 'error', NAME);
                throw err;
            }
            return patientsInlocations && patientsInlocations.result;
        }

        /**
         * @method getStartBudget
         * @private
         * check if start budget is in given quarter/year and return budhet start value if so
         *
         * @param {Number} start
         * @param {Date} date
         * @param {String} quarter
         * @param {String} year
         *
         * @returns {Number} start|0
         */
        function getStartBudget( start, date, quarter, year ) {
            let mDate = moment( date );
            if( start && mDate.isValid() && mDate.quarter().toString() === quarter.toString() && mDate.year().toString() === year.toString() ) {
                return start;
            }
            return 0;
        }

        async function calcKbvUtilityTotal( user, budgetType, locationId, employees, start, end, list1Name, list2Name, unitsName ) {
            let err, casefolders;
            [ err, casefolders ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'aggregate',
                    pipeline: [
                        {$match: {type: 'PUBLIC'}},
                        {$group: {_id: null, ids: {$push: '$_id'}}}
                    ],
                    model: 'casefolder'
                } )
            );
            if( err ) {
                Y.log(`calcBudget: Error getting casefolders for ${budgetType} budgets: ${err.stack || err}`, 'error', NAME);
                throw err;
            }
            casefolders = casefolders && casefolders.result;
            let casefoldersIds = (casefolders && casefolders[0] && casefolders[0].ids || [] ).map( id => id.toString() );

            const
                query = {
                    actType: budgetType,
                    timestamp: {
                        $gte: start,
                        $lte: end
                    },
                    caseFolderId: {$in: casefoldersIds},
                    locationId: new ObjectId( locationId ),
                    status: {$ne: 'CANCELLED'}
                };

            let totalPrice1;
            [ err, totalPrice1 ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'aggregate',
                    pipeline: [
                        {
                            $match: query
                        },
                        {$project: {[list1Name]: 1}},
                        {$unwind: `$${list1Name}`},
                        {
                            $group: {
                                _id: null,
                                totalPrice1: {$sum: {$multiply: [{$ifNull: [`$${list1Name}.price`, 0]}, {$ifNull: [`$${list1Name}.${unitsName}`, 1]}]}}
                            }
                        }
                    ],
                    model: 'activity'
                } )
            );
            if( err ) {
                Y.log(`calcBudget: Error getting totalPrice1 for ${budgetType} budgets: ${err.stack || err}`, 'error', NAME);
                throw err;
            }
            totalPrice1 = totalPrice1 && totalPrice1.result;
            totalPrice1 = totalPrice1 && totalPrice1[0] && totalPrice1[0].totalPrice1 || 0;


            let totalPrice2;
            [ err, totalPrice2 ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'aggregate',
                    pipeline: [
                        {
                            $match: query
                        },
                        {$project: {[list2Name]: 1}},
                        {$unwind: `$${list2Name}`},
                        {
                            $group: {
                                _id: null,
                                totalPrice2: {$sum: {$multiply: [{$ifNull: [`$${list2Name}.price`, 0]}, {$ifNull: [`$${list2Name}.${unitsName}`, 1]}]}}
                            }
                        }
                    ],
                    model: 'activity'
                } )
            );
            if( err ) {
                Y.log(`calcBudget: Error getting totalPrice1 for ${budgetType} budgets: ${err.stack || err}`, 'error', NAME);
                throw err;
            }
            totalPrice2 = totalPrice2 && totalPrice2.result;
            totalPrice2 = totalPrice2 && totalPrice2[0] && totalPrice2[0].totalPrice2 || 0;

            return totalPrice1 + totalPrice2;
        }

        /**
         * @method calcBudget
         * @private
         * calculate actual budget spending by types
         *
         * @param {Object} user
         * @param {String} budgetType (KBVUTILITY|MEDICATION)
         * @param {String} locationId
         * @param {Array} employees - array of employeeId for budget or empty array if not needed
         * @param {Object} start
         * @param {Object} end
         *
         * @returns {Promise} - actual budget spent {Number}
         */
        async function calcBudget( user, budgetType, locationId, employees, start, end, isAfterQ42020 ) {
            let err;
            if( 'KBVUTILITY' === budgetType ) {
                if( isAfterQ42020 ) {
                    return calcKbvUtilityTotal( user, 'KBVUTILITY2', locationId, employees, start, end, 'ut2Remedy1List', 'ut2Remedy2List', 'units' );

                } else {
                    return calcKbvUtilityTotal( user, 'KBVUTILITY', locationId, employees, start, end, 'utRemedy1List', 'utRemedy2List', 'seasons' );
                }
          } else if( 'MEDICATION' === budgetType ) {
                let pipeline = [
                    {$match: {
                        actType: {$in: ['PUBPRESCR', 'PRESCRT', 'PRESCRBTM']},
                        status: {$ne: 'CANCELLED'},
                        timestamp: { $gte: start, $lte: end },
                        locationId: new ObjectId( locationId ),
                        substitutePrescription: {$ne: true}
                    }
                    },
                    {$group: { _id: null, actIds: {$push: "$activities"} }},
                    {$unwind: "$actIds"},
                    {$unwind: "$actIds"},
                    {$group: { _id: "$actIds", count: {$sum: 1} }}
                ];

                if(employees && employees.length){
                    pipeline[0].$match.employeeId = {$in: employees};
                }

                let prescriptions;
                [ err, prescriptions ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'aggregate',
                        pipeline,
                        model: 'activity'
                    } )
                );
                if( err ) {
                    Y.log(`calcBudget: Error getting totalPrice1 for medication budgets: ${err.stack || err}`, 'error', NAME);
                    throw err;
                }
                prescriptions = prescriptions && prescriptions.result;

                let sum = 0;
                for( let prescription of prescriptions){
                    let medications;
                    [ err, medications ] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            action: 'get',
                            model: 'activity',
                            query: {
                                _id: prescription._id,
                                actType: 'MEDICATION'
                            },
                            options: {
                                limit: 1,
                                select: {
                                    phPriceSale: 1
                                }
                            }

                        } )
                    );
                    if( err ) {
                        Y.log(`calcBudget: Error getting medication activity for medication budgets: ${err.stack || err}`, 'error', NAME);
                        throw err;
                    }

                    sum += (medications && medications[0] && medications[0].phPriceSale || 0) * prescription.count;
                }

                return sum;
            }
        }

        /**
         * @method getPatientAgeRangeCounts
         * @private
         * calculate counts of patients in age periods: [0-15], [16-49], [50-65], >65
         *
         * @param {Object} user
         * @param {Object} patientLocationRelation
         * @param {Array} employees - array of employeeId for budget or empty array if not needed
         *
         * @returns {Promise} - four numbers each present of patient counts in age period {Array}
         */
        async function getPatientAgeRangeCounts( user, patientLocationEmployeeRelation, employees ) {
            let patientsIds = [];

            if(employees.length) {
                patientLocationEmployeeRelation.employees.filter( el => employees.includes(el.employeeId)).forEach( el => { patientsIds = [...patientsIds, ...el.patientIds]; } );
            } else {
                patientLocationEmployeeRelation.employees.forEach( el => { patientsIds = [...patientsIds, ...el.patientIds]; } );
            }
            patientsIds = patientsIds.map( pId => new ObjectId( pId ) );

            const
                pipeline = [
                    {$match: { dob: {$exists: true}, _id: {$in: patientsIds } } },
                    {$project: {"ageInMillis": {$subtract: [new Date(), "$dob"]}}},
                    {$project: {"age": {$divide: ["$ageInMillis", 31558464000]}}},
                    {$project: {"age": {$subtract: ["$age", {$mod: ["$age", 1]}]}}},
                    {$project: { "_id": 0, "range": {
                        $concat: [
                            { $cond: [{$lte: ["$age", 15]}, "range 0-15", ""] },
                            { $cond: [{$and: [{$gte: ["$age", 16]}, {$lt: ["$age", 50]}]}, "range 16-49", ""] },
                            { $cond: [{$and: [{$gte: ["$age", 50]}, {$lt: ["$age", 66]}]}, "range 50-65", ""] },
                            { $cond: [{$and: [{$gte: ["$age", 65]}]}, "range >65", ""]}
                        ]
                    }}},
                    {$group: {_id: "$range", count: {$sum: 1}}},
                    {$sort: {"_id": 1}}
                ];
            let err;
            let ranges;
            [ err, ranges ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'aggregate',
                    pipeline: pipeline,
                    model: 'patient'
                } )
            );
            if( err ) {
                Y.log(`getPatientAgeRangeCounts: Error getting patient model: ${err.stack || err}`, 'error', NAME);
                throw err;
            }

            let counts = [0, 0, 0, 0];
            (ranges && ranges.result || []).forEach( range => {
                if( 'range 0-15' === range._id ) {
                    counts[0] = range.count;
                } else if( 'range 16-49' === range._id ) {
                    counts[1] = range.count;
                } else if( 'range 50-65' === range._id ) {
                    counts[2] = range.count;
                } else if( 'range >65' === range._id ) {
                    counts[3] = range.count;
                }
            } );
            return counts;
        }

        /**
         * @method calcBudgetFactory
         * @private
         * returns function with one argument (patientLocationEmployeeRelation) - actual budget calculation with general attributes in closure,
         *      result of execution will be one or several (in case of medication type) calculated budgets
         *
         *
         * @param {Object} user
         * @param {String} budgetType
         * @param {String} quarter
         * @param {String} year
         * @param {Object} start
         * @param {Object} end
         *
         @returns {Function}
         */
        function calcBudgetFactory( user, budgetType, quarter, year, start, end ) {
            return  async function( result, isAfterQ42020 ) {
                let err;

                let locations;
                [ err, locations ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'location',
                        query: {
                            _id: result.locationId
                        },
                        options: {
                            select: {
                                locname: 1,
                                budgets: 1
                            }
                        }
                    } )
                );
                if( err ) {
                    Y.log(`calcBudgetFactory: Error getting location: ${err.stack || err}`, 'error', NAME);
                    throw err;
                }
                let location = locations[0];
                if( !location ) {
                    throw new Error( 'location not found' );
                }
                let budgets = (location.budgets || []).filter( el => el.type === budgetType && el.patientAgeRange1 && el.patientAgeRange2 && el.patientAgeRange3 && el.patientAgeRange4 ).map( el => {
                    let {type : budgetType, ...other } = el; //rename type to budgetType
                    return {
                        budgetType,
                        ...other,
                        quarter,
                        year,
                        locationId: location._id.toString(),
                        locationName: location.locname,
                        spentBudget: getStartBudget( el.startBudget, el.startDate, quarter, year )
                    };
                });

                for( let budget of budgets ){
                    let employees = [];
                    budget.employees = employees;

                    if( budget.specialities && budget.specialities.length ){
                        [ err, employees ] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'employee',
                                query: { $and: [
                                    {specialities: { $all : budget.specialities } },
                                    {specialities: { $size : budget.specialities.length } }
                                ]},
                                options: { select: { name: 1 } }
                            } )
                        );
                        if( err ) {
                            Y.log(`calcBudgetFactory: Error getting employee for speciality ${budget.specialities} : ${err.stack || err}`, 'error', NAME);
                            throw err;
                        }
                        if( !employees.length ){
                            Y.log(`calcBudgetFactory: employees not found for speciality ${budget.specialities}`, 'info', NAME);
                            continue;
                        }
                        employees = employees.map( el => el._id.toString() );
                        budget.employees = employees;
                    }

                    let counts;
                    [ err, counts ] = await formatPromiseResult(
                        getPatientAgeRangeCounts( user, result, budget.employees )
                    );
                    if( err ) {
                        Y.log(`calcBudgetFactory: Error getting patient counts by age: ${err.stack || err}`, 'error', NAME);
                        throw err;
                    }

                    budget.totalBudget = (counts[0] * budget.patientAgeRange1) + (counts[1] * budget.patientAgeRange2) + (counts[2] * budget.patientAgeRange3) + (counts[3] * budget.patientAgeRange4);
                    budget.totalBudgetComposition = `(0-15 ${counts[0]} * ${budget.patientAgeRange1} €) + (16-49 ${counts[1]} * ${budget.patientAgeRange2} €) + (50-65 ${counts[2]} * ${budget.patientAgeRange3} €) + (>65 ${counts[3]} * ${budget.patientAgeRange4} €)`;

                    let spent;
                    [ err, spent ] = await formatPromiseResult(
                        calcBudget( user, budgetType, budget.locationId, employees, start, end, isAfterQ42020 )
                    );
                    if( err ) {
                        Y.log(`calcBudgetFactory: Error getting spent for for budget : ${err.stack || err}`, 'error', NAME);
                        throw err;
                    }

                    budget.spentBudget += spent;
                    budget.diffBudget = budget.totalBudget - budget.spentBudget;
                    budget.percBudget = budget.totalBudget ? budget.spentBudget / budget.totalBudget * 100 : 0;
                }

                return budgets;
            };
        }

        /**
         * @method calculate
         * @public
         * - search budgets settings of given budgetType
         * - calculate budgets in requested quarter/year
         * - upsert budgets collection with result of calculation, if new calculation not give results remove previous budget document if exists
         *
         * @param {Object} user
         * @param {Object} originalParams
         * @param {String} originalParams.budgetType (MEDICATION|KBVUTILITY)
         * @param {String} originalParams.quarter
         * @param {String} originalParams.year
         * @param {Function} callback
         *
         @returns {Function} callback
         */
    async function calculate({ user, originalParams: {budgetType, quarter, year}, callback }) {
            Y.log('Entering Y.doccirrus.api.budget.calculate', 'info', NAME);
            if (callback) {
                callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(callback, 'Exiting Y.doccirrus.api.budget.calculate');
            }
            if( !['MEDICATION', 'KBVUTILITY'].includes( budgetType ) ) {
                Y.log( `calculate budget: missing or unknown budgetType param: ${budgetType}`, 'error', NAME );
                return callback( new Error( 'missing budgetType param' ) );
            }

            let
                date = moment( `${quarter}/${year}`, 'Q/YYYY' ),
                start = date.clone().startOf( 'quarter' ).toDate(),
                end = date.endOf( 'quarter' ).toDate(),
                isAfterQ42020 = date.isAfter( moment( '4/2020', 'Q/YYYY' ) );

            let calcBudget = calcBudgetFactory( user, budgetType, quarter, year, start, end );
            let err;
            let locations;
            [ err, locations ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'location',
                    query: {
                        budgets: {
                            $elemMatch: {
                                type: budgetType,
                                patientAgeRange1: {$ne: null},
                                patientAgeRange2: {$ne: null},
                                patientAgeRange3: {$ne: null},
                                patientAgeRange4: {$ne: null}
                            }
                        }
                    },
                    options: {
                        select: {
                            _id: 1
                        }
                    }
                } )
            );

            if( err ) {
                Y.log(`calculate: Error getting location: ${err.stack || err}`, 'error', NAME);
                return callback( err );
            }

            if( !locations.length ){
                Y.log(`calculate: locations not found for budget ${budgetType} calculations`, 'info', NAME);
                return callback( null );
            }

            let patientsInlocations;
            [ err, patientsInlocations ] = await formatPromiseResult(
                getLocationEmployeePatientRelation( user, start, end, locations.map( el => el._id ) )
            );
            if( err ) {
                Y.log(`calculate: Error getting patients in locations: ${err.stack || err}`, 'error', NAME);
                return callback( err );
            }

            for( let locationWithPatients of patientsInlocations){
                let calculations;
                [ err, calculations ] = await formatPromiseResult(
                    calcBudget( locationWithPatients, isAfterQ42020 )
                );
                if( err ) {
                    Y.log(`calculate: Error processing calculation: ${err.stack || err}`, 'error', NAME);
                    return callback( err );
                }
                [ err ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'budget',
                        action: 'delete',
                        query: {
                            budgetType,
                            quarter,
                            year,
                            locationId: locationWithPatients.locationId
                        },
                        migrate: true,
                        option: {
                            override: true
                        }
                    } )
                );
                if( err ) {
                    Y.log(`calculate: Error deleting budgets: ${err.stack || err}`, 'error', NAME);
                    return callback( err );
                }

                for( let calculation of calculations) {

                    if ( (!calculation.specialities.length || calculation.specialities.length && !calculation.employees.length) && !calculation.diffBudget ){
                        //skiped earlier due to employees not found but specialities are provided for budget
                        continue;
                    }

                    //remove _id from data
                    let {_id, ...data} = calculation; //eslint-disable-line no-unused-vars

                    [ err ] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'budget',
                            action: 'post',
                            query: {
                                budgetType,
                                quarter,
                                year,
                                locationId: calculation.locationId,
                                specialities: calculation.specialities
                            },
                            migrate: true,
                            fields: Object.keys( data ),
                            data: {...data, skipcheck_: true}
                        } )
                    );
                    if( err ) {
                        Y.log(`calculate: Error upserting budgets: ${err.stack || err}`, 'error', NAME);
                        return callback( err );
                    }
                }
            }

            callback(null);

        }

        Y.namespace( 'doccirrus.api' ).budget = {

            name: NAME,
            calculate: calculate

        };

    },
    '0.0.1', {requires: []}
);
