/**
 * User: md
 * Date: 10/10/18  10:40
 * (c) 2018, Doc Cirrus GmbH, Berlin
 */
/*global Y, should, it, describe, expect */

const
    {formatPromiseResult, promisifyArgsCallback} = require( 'dc-core' ).utils,
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    moment = require( 'moment' ),
    user = Y.doccirrus.auth.getSUForLocal();

const
    locationUpdate = async ( data ) => {
        return Y.doccirrus.mongodb.runDb( {
            user,
            model: 'location',
            action: 'update',
            query: {_id: locationId},
            data: {
                $set: data
            }
        } );
    },
    budgetsAction = async ( action, query = {} ) => {
        return Y.doccirrus.mongodb.runDb( {
            user,
            model: 'budget',
            action,
            query
        } );
    },
    wait = async ( self, timeToWait = 4000 ) => {
        self.timeout( self.timeout() + timeToWait );
        await formatPromiseResult(
            new Promise( ( resolve ) => {
                setTimeout( resolve, timeToWait );
            } )
        );
    };

let locationId, patientId, employeeId, caseFolderId;

describe( 'Budgets-api  test ', () => {
    describe( '0. Setup.', function() {
        this.timeout( 4000 );
        it( 'cleans db', function( done ) {
            mochaUtils.cleanDB( {user}, function( err ) {
                should.not.exist( err );
                done();
            } );
        } );
        it( 'insert location', async function() {
            let locationData = mochaUtils.getLocationData( {budgets: [], skipcheck_: true} );

            let [err, results] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'location',
                    action: 'post',
                    data: locationData
                } )
            );
            should.not.exist( err );
            should.exist( results );
            results.should.contain( locationData._id );
            locationId = locationData._id;
        } );
        it( 'insert patient', async function() {
            let patientData = mochaUtils.getPatientData( {
                dob: moment().add( -19, 'years' ).toISOString(),
                skipcheck_: true
            } );

            let [err, results] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'patient',
                    action: 'post',
                    data: patientData
                } )
            );
            should.not.exist( err );
            should.exist( results );

            results.should.contain( patientData._id );
            patientId = patientData._id;
        } );
        it( 'insert employee', async function() {
            let employeeData = mochaUtils.getEmployeeData( {specialities: ['15', '20'], skipcheck_: true} );

            let [err, results] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'employee',
                    action: 'post',
                    data: employeeData
                } )
            );
            should.not.exist( err );
            should.exist( results );
            results.should.contain( employeeData._id );
            employeeId = employeeData._id;
        } );
        it( 'insert casefolder', async function() {
            let casefolderData = {
                "_id": "5bbdd33c58285026d9ebe21b",
                "type": "PUBLIC",
                patientId,
                "title": "GKV Test",
                "start": "2018-01-01T00:00:01.000Z",
                skipcheck_: true
            };

            let [err, results] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'casefolder',
                    action: 'post',
                    data: casefolderData
                } )
            );
            should.not.exist( err );
            should.exist( results );
            results.should.be.instanceOf( Array );
            results.should.contain( casefolderData._id );
            caseFolderId = casefolderData._id;
        } );
        it( 'insert activities', async function() {
            let scheinData = {
                "_id": "5bbc4e543bf592197f4c06b5",
                "actType": "SCHEIN",
                "status": "VALID",
                "timestamp": "2018-10-08T22:00:00.001Z",
                "scheinQuarter": "4",
                "scheinYear": "2018",
                "scheinType": "0101",
                "scheinSubgroup": "00",
                patientId,
                employeeId,
                locationId,
                caseFolderId
            }, prescriptionData = {
                "_id": "5a79922d97a5a51bbdbdf21c",
                "actType": "PUBPRESCR",
                "status": "VALID",
                "timestamp": "2018-10-09T11:31:56.068Z",
                employeeId,
                locationId,
                patientId,
                caseFolderId,
                "activities": [
                    "5a79922c97a5a51bbdbdf218",
                    "5a79922c97a5a51bbdbdf219"
                ],
                "referencedBy": [
                    "5a79922c97a5a51bbdbdf219",
                    "5a79922c97a5a51bbdbdf218"
                ]
            }, medicationsData = [
                {
                    "_id": "5a79922c97a5a51bbdbdf218",
                    "actType": "MEDICATION",
                    "status": "VALID",
                    "code": "03875348",
                    "timestamp": "2018-10-09T11:31:56.058Z",
                    "phPriceSale": 12,
                    "phNLabel": "Biatain® Silicone Schaumverb. 7,5x7,5cm 10 St.",
                    employeeId,
                    locationId,
                    patientId,
                    caseFolderId
                },
                {
                    "_id": "5a79922c97a5a51bbdbdf219",
                    "actType": "MEDICATION",
                    "status": "VALID",
                    "code": "03875348",
                    "timestamp": "2018-10-09T11:35:56.058Z",
                    "phPriceSale": 13,
                    "phNLabel": "Biatain® Silicone Schaumverb. 7,5x7,5cm 10 St.",
                    employeeId,
                    locationId,
                    patientId,
                    caseFolderId
                }
            ], kbvutility = {
                "_id": "5bbc51f43bf592197f4c070d",
                "status": "VALID",
                "actType": "KBVUTILITY",
                "utRemedy1List": [
                    {
                        "seasons": 2,
                        "price:": 1.1
                    }],
                "utRemedy2List": [
                    {
                        "seasons": 3,
                        "price": 2.2
                    }],
                "timestamp": "2018-10-09T06:59:17.377Z",
                "subType": "PHYSIO",
                patientId,
                employeeId,
                locationId,
                caseFolderId
            };

            for( let actData of [scheinData, prescriptionData, ...medicationsData, kbvutility] ) {

                let [err, results] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activity',
                        action: 'post',
                        data: Y.doccirrus.filters.cleanDbObject( actData )
                    } )
                );
                should.not.exist( err );
                should.exist( results );
                results.should.be.instanceOf( Array );
            }
            await wait( this, 5000 ); //wait to ensure all setup operations are completed
        } );
    } );

    describe( '1. calculate', function() {
        const calculate = promisifyArgsCallback( Y.doccirrus.api.budget.calculate );

        it( 'fails on unknown budget type', async function() {
            let [err] = await formatPromiseResult(
                calculate( {
                    user,
                    originalParams: {budgetType: 'Unknown'}
                } )
            );
            should.exist( err );
            err.should.be.an.instanceOf( Error );
            err.message.should.equal( 'missing budgetType param' );
        } );
        it( 'returns earlier when there are no budgets in locations', async function() {
            let [err, results] = await formatPromiseResult(
                locationUpdate( {budgets: []} )
            );
            should.not.exist( err );
            should.exist( results );
            results.ok.should.equal( 1 );

            [err, results] = await formatPromiseResult(
                calculate( {
                    user,
                    originalParams: {budgetType: 'MEDICATION'}
                } )
            );
            should.equal( err, null );
            should.not.exist( results );
        } );

        it( 'returns without creating budgets when there are no scheins in the quarter', async function() {
            let [err, results] = await formatPromiseResult(
                locationUpdate( {
                    budgets: [
                        {
                            "specialities": [
                                "080"
                            ],
                            "type": "MEDICATION",
                            "startBudget": 55,
                            "startDate": "2018-06-01T14:14:24.322Z",
                            "patientAgeRange1": 56,
                            "patientAgeRange2": 57,
                            "patientAgeRange3": 58,
                            "patientAgeRange4": 59
                        }]
                } )
            );
            should.not.exist( err );
            should.exist( results );
            results.ok.should.equal( 1 );

            [err, results] = await formatPromiseResult(
                calculate( {
                    user,
                    originalParams: {
                        budgetType: 'MEDICATION',
                        quarter: '1',
                        year: '2018'
                    }
                } )
            );
            should.equal( err, null );
            should.not.exist( results );

            [err, results] = await formatPromiseResult(
                budgetsAction( 'count' )
            );
            should.not.exist( err );
            should.equal( results, 0 );
        } );
        it( 'returns earlier when there are budgets not fully populated', async function() {
            let [err, results] = await formatPromiseResult(
                locationUpdate( {
                    budgets: [
                        {
                            "specialities": [
                                "080"
                            ],
                            "type": "MEDICATION",
                            "startBudget": 55,
                            "startDate": "2018-06-01T14:14:24.322Z",
                            "patientAgeRange1": 56,
                            "patientAgeRange2": 57,
                            "patientAgeRange3": 58,
                            "patientAgeRange4": 59
                        }, {
                            "specialities": [],
                            "type": "KBVUTILITY",
                            "startBudget": 62,
                            "startDate": "2018-08-31T21:00:00.000Z",
                            "patientAgeRange1": 63,
                            "patientAgeRange2": 64,
                            "patientAgeRange3": 65,
                            "patientAgeRange4": null //here is not populated field
                        }]
                } )
            );
            should.not.exist( err );
            should.exist( results );
            results.ok.should.equal( 1 );

            [err, results] = await formatPromiseResult(
                calculate( {
                    user,
                    originalParams: {budgetType: 'KBVUTILITY'}
                } )
            );
            should.equal( err, null );
            should.not.exist( results );

            [err, results] = await formatPromiseResult(
                budgetsAction( 'count' )
            );
            should.not.exist( err );
            should.equal( results, 0 );
        } );
        it( 'create budget when start is not in calculated quarter', async function() {
            let [err, results] = await formatPromiseResult(
                locationUpdate( {
                    budgets: [
                        {
                            "specialities": [],
                            "type": "MEDICATION",
                            "startBudget": 55,
                            "startDate": "2018-01-01T14:14:24.322Z",
                            "patientAgeRange1": 56,
                            "patientAgeRange2": 57,
                            "patientAgeRange3": 58,
                            "patientAgeRange4": 59
                        }]
                } )
            );
            should.not.exist( err );
            should.exist( results );
            results.ok.should.equal( 1 );

            [err, results] = await formatPromiseResult(
                calculate( {
                    user,
                    originalParams: {
                        budgetType: 'MEDICATION',
                        quarter: '4',
                        year: '2018'
                    }
                } )
            );
            should.equal( err, null );
            should.not.exist( results );

            [err, results] = await formatPromiseResult(
                budgetsAction( 'get' )
            );
            should.not.exist( err );
            should.equal( results.length, 1 );

            let {_id, ...budget} = results[0]; //eslint-disable-line no-unused-vars
            expect( budget ).to.deep.equal( {
                "specialities": [],
                "budgetType": "MEDICATION",
                "quarter": "4",
                "year": "2018",
                locationId,
                "locationName": "TestPraxis1",
                "spentBudget": 25,
                "totalBudget": 57,
                "totalBudgetComposition": "(0-15 0 * 56 €) + (16-49 1 * 57 €) + (50-65 0 * 58 €) + (>65 0 * 59 €)",
                "diffBudget": 32,
                "percBudget": 43.859649122807014
            } );
        } );
        it( 'create budget when start is in calculated quarter AND employ match specialities', async function() {
            let [err, results] = await formatPromiseResult(
                locationUpdate( {
                    budgets: [
                        {
                            "specialities": ['20', '15'],
                            "type": "MEDICATION",
                            "startBudget": 55,
                            "startDate": "2018-10-01T14:14:24.322Z",
                            "patientAgeRange1": 56,
                            "patientAgeRange2": 57,
                            "patientAgeRange3": 58,
                            "patientAgeRange4": 59
                        }]
                } )
            );
            should.not.exist( err );
            should.exist( results );
            results.ok.should.equal( 1 );

            //clenup previously populated budgets, because changed speciality
            let ids;
            [err, ids] = await formatPromiseResult(
                budgetsAction( 'get' )
            );
            should.not.exist( err );
            should.exist( ids );
            ids = ids.map( el => el._id.toString() );

            if( ids.length ) {
                [err, results] = await formatPromiseResult(
                    budgetsAction( 'delete', {_id: {$in: ids}} )
                );
                should.not.exist( err );
                should.exist( results );
            }

            [err, results] = await formatPromiseResult(
                calculate( {
                    user,
                    originalParams: {
                        budgetType: 'MEDICATION',
                        quarter: '4',
                        year: '2018'
                    }
                } )
            );
            should.equal( err, null );
            should.not.exist( results );

            [err, results] = await formatPromiseResult(
                budgetsAction( 'get' )
            );
            should.not.exist( err );
            should.exist( results );
            should.equal( results.length, 1 );

            let {_id, ...budget} = results[0]; //eslint-disable-line no-unused-vars
            expect( budget ).to.deep.equal( {
                "specialities": ['20', '15'],
                "budgetType": "MEDICATION",
                "quarter": "4",
                "year": "2018",
                locationId,
                "locationName": "TestPraxis1",
                "spentBudget": 80,
                "totalBudget": 57,
                "totalBudgetComposition": "(0-15 0 * 56 €) + (16-49 1 * 57 €) + (50-65 0 * 58 €) + (>65 0 * 59 €)",
                "diffBudget": -23,
                "percBudget": 140.35087719298244
            } );
        } );
        it( 'create budget only for matched when there are several valid budget settings (matched and not matched specialities)', async function() {
            let [err, results] = await formatPromiseResult(
                locationUpdate( {
                    budgets: [
                        {
                            "specialities": ['20', '15'],
                            "type": "MEDICATION",
                            "startBudget": 55,
                            "startDate": "2018-10-01T14:14:24.322Z",
                            "patientAgeRange1": 56,
                            "patientAgeRange2": 57,
                            "patientAgeRange3": 58,
                            "patientAgeRange4": 59
                        },
                        {
                            "specialities": ['20'],
                            "type": "MEDICATION",
                            "startBudget": 55,
                            "startDate": "2018-10-01T14:14:24.322Z",
                            "patientAgeRange1": 56,
                            "patientAgeRange2": 57,
                            "patientAgeRange3": 58,
                            "patientAgeRange4": 59
                        }
                    ]
                } )
            );
            should.not.exist( err );
            should.exist( results );
            results.ok.should.equal( 1 );

            //clenup previously populated budgets, because changed speciality
            let ids;
            [err, ids] = await formatPromiseResult(
                budgetsAction( 'get' )
            );
            should.not.exist( err );
            should.exist( ids );
            ids = ids.map( el => el._id.toString() );

            if( ids.length ) {
                [err, results] = await formatPromiseResult(
                    budgetsAction( 'delete', {_id: {$in: ids}} )
                );
                should.not.exist( err );
                should.exist( results );
            }

            [err, results] = await formatPromiseResult(
                calculate( {
                    user,
                    originalParams: {
                        budgetType: 'MEDICATION',
                        quarter: '4',
                        year: '2018'
                    }
                } )
            );
            should.equal( err, null );
            should.not.exist( results );

            [err, results] = await formatPromiseResult(
                budgetsAction( 'get' )
            );
            should.not.exist( err );
            should.exist( results );
            should.equal( results.length, 1 );

            let budgets = results.map( el => {
                let {_id, ...budget} = el; //eslint-disable-line no-unused-vars
                return budget;
            } );

            expect( budgets ).to.deep.equal( [
                {
                    "specialities": ['20', '15'],
                    "budgetType": "MEDICATION",
                    "quarter": "4",
                    "year": "2018",
                    locationId,
                    "locationName": "TestPraxis1",
                    "spentBudget": 80,
                    "totalBudget": 57,
                    "totalBudgetComposition": "(0-15 0 * 56 €) + (16-49 1 * 57 €) + (50-65 0 * 58 €) + (>65 0 * 59 €)",
                    "diffBudget": -23,
                    "percBudget": 140.35087719298244
                }] );
        } );
        it( 'create 2 budgets when there are several valid budget settings (matched and not specified specialities)', async function() {
            let [err, results] = await formatPromiseResult(
                locationUpdate( {
                    budgets: [
                        {
                            "specialities": ['20', '15'],
                            "type": "MEDICATION",
                            "startBudget": 55,
                            "startDate": "2018-01-01T14:14:24.322Z",
                            "patientAgeRange1": 56,
                            "patientAgeRange2": 57,
                            "patientAgeRange3": 58,
                            "patientAgeRange4": 59
                        },
                        {
                            "specialities": [],
                            "type": "MEDICATION",
                            "startBudget": 55,
                            "startDate": "2018-10-01T14:14:24.322Z",
                            "patientAgeRange1": 56,
                            "patientAgeRange2": 57,
                            "patientAgeRange3": 58,
                            "patientAgeRange4": 59
                        }]
                } )
            );
            should.not.exist( err );
            should.exist( results );
            results.ok.should.equal( 1 );

            //clenup previously populated budgets, because changed speciality
            let ids;
            [err, ids] = await formatPromiseResult(
                budgetsAction( 'get' )
            );
            should.not.exist( err );
            should.exist( ids );
            ids = ids.map( el => el._id.toString() );

            if( ids.length ) {
                [err, results] = await formatPromiseResult(
                    budgetsAction( 'delete', {_id: {$in: ids}} )
                );
                should.not.exist( err );
                should.exist( results );
            }

            [err, results] = await formatPromiseResult(
                calculate( {
                    user,
                    originalParams: {
                        budgetType: 'MEDICATION',
                        quarter: '4',
                        year: '2018'
                    }
                } )
            );
            should.equal( err, null );
            should.not.exist( results );

            [err, results] = await formatPromiseResult(
                budgetsAction( 'get' )
            );
            should.not.exist( err );
            should.exist( results );
            should.equal( results.length, 2 );
            let budgets = results.map( el => {
                let {_id, ...budget} = el; //eslint-disable-line no-unused-vars
                return budget;
            } );

            expect( budgets ).to.deep.equal( [
                {
                    "specialities": ['20', '15'],
                    "budgetType": "MEDICATION",
                    "quarter": "4",
                    "year": "2018",
                    locationId,
                    "locationName": "TestPraxis1",
                    "spentBudget": 25,
                    "totalBudget": 57,
                    "totalBudgetComposition": "(0-15 0 * 56 €) + (16-49 1 * 57 €) + (50-65 0 * 58 €) + (>65 0 * 59 €)",
                    "diffBudget": 32,
                    "percBudget": 43.859649122807014
                },
                {
                    "specialities": [],
                    "budgetType": "MEDICATION",
                    "quarter": "4",
                    "year": "2018",
                    locationId,
                    "locationName": "TestPraxis1",
                    "spentBudget": 80,
                    "totalBudget": 57,
                    "totalBudgetComposition": "(0-15 0 * 56 €) + (16-49 1 * 57 €) + (50-65 0 * 58 €) + (>65 0 * 59 €)",
                    "diffBudget": -23,
                    "percBudget": 140.35087719298244
                }] );
        } );
        it( 'create utility budget', async function() {
            let [err, results] = await formatPromiseResult(
                locationUpdate( {
                    budgets: [
                        {
                            "specialities": [],
                            "type": "KBVUTILITY",
                            "startBudget": 55,
                            "startDate": "2018-10-01T14:14:24.322Z",
                            "patientAgeRange1": 56,
                            "patientAgeRange2": 57,
                            "patientAgeRange3": 58,
                            "patientAgeRange4": 59
                        }]
                } )
            );
            should.not.exist( err );
            should.exist( results );
            results.ok.should.equal( 1 );

            //clenup previously populated budgets, because changed speciality
            let ids;
            [err, ids] = await formatPromiseResult(
                budgetsAction( 'get' )
            );
            should.not.exist( err );
            should.exist( ids );
            ids = ids.map( el => el._id.toString() );

            if( ids.length ) {
                [err, results] = await formatPromiseResult(
                    budgetsAction( 'delete', {_id: {$in: ids}} )
                );
                should.not.exist( err );
                should.exist( results );
            }

            [err, results] = await formatPromiseResult(
                calculate( {
                    user,
                    originalParams: {
                        budgetType: 'KBVUTILITY',
                        quarter: '4',
                        year: '2018'
                    }
                } )
            );
            should.equal( err, null );
            should.not.exist( results );

            [err, results] = await formatPromiseResult(
                budgetsAction( 'get' )
            );
            should.not.exist( err );
            should.exist( results );
            should.equal( results.length, 1 );

            let budgets = results.map( el => {
                let {_id, ...budget} = el; //eslint-disable-line no-unused-vars
                return budget;
            } );

            expect( budgets ).to.deep.equal( [
                {
                    "specialities": [],
                    "budgetType": "KBVUTILITY",
                    "quarter": "4",
                    "year": "2018",
                    locationId,
                    "locationName": "TestPraxis1",
                    "spentBudget": 61.6,
                    "totalBudget": 57,
                    "totalBudgetComposition": "(0-15 0 * 56 €) + (16-49 1 * 57 €) + (50-65 0 * 58 €) + (>65 0 * 59 €)",
                    "diffBudget": -4.600000000000001,
                    "percBudget": 108.0701754385965
                }] );
        } );
    } );
} );

