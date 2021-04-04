/**
 * User: do
 * Date: 03.06.20  16:05
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global Y, before, describe, it, should*/

const
    mongoose = require( 'mongoose' ),
    moment = require( 'moment' ),
    ObjectId = mongoose.Types.ObjectId,
    caseFolderId = ObjectId().toString(),
    patientId = ObjectId().toString(),
    employeeId = ObjectId().toString(),
    locationId = ObjectId().toString(),
    BL_CODE_1 = '35503',
    REZIDIV_PROPHYLAXE_CODE = '35405Y',
    {formatPromiseResult} = require( 'dc-core' ).utils,
    util = require( 'util' ),
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    cleanDb = util.promisify( mochaUtils.cleanDB ),
    user = Y.doccirrus.auth.getSUForLocal();

const wait = async ( self, timeToWait = 5000 ) => {
    self.timeout( self.timeout() + timeToWait );
    await formatPromiseResult(
        new Promise( ( resolve ) => {
            setTimeout( resolve, timeToWait );
        } )
    );
};

function getScheinData( config = {}, _date ) {
    var
        date = _date || moment(),
        schein = {
            actType: 'SCHEIN',
            timestamp: date.toDate(),
            patientId,
            scheinQuarter: date.get( 'quarter' ),
            scheinYear: date.get( 'year' ),
            status: 'VALID',
            scheinType: '0101',
            scheinSubgroup: '00'
        };
    schein = mochaUtils.getActivityData( Object.assign( schein, config ) );
    return schein;
}

function getTreatmentData( config = {}, date ) {
    var
        treatment = {
            actType: 'TREATMENT',
            catalogShort: 'EBM',
            code: '01100',
            patientId,
            status: 'VALID',
            skipcheck_: true
        };
    treatment = mochaUtils.getActivityData( {...treatment, ...config, timestamp: date || new Date()} );
    return treatment;
}

describe( 'Test BL Schein Pseudo GNRs', () => {
    let scheinId, pseudoGnrId, err, results;
    before( 'Setup up', async function() {
        this.timeout( 1000 * 20 );
        await cleanDb( {user} );
    } );
    it( 'Insert BL caseFolder', async function() {
        [err] = await formatPromiseResult( mochaUtils.createCaseFolder( {
            user,
            employeeId,
            locationId,
            patientId,
            caseFolderId
        } ) );

        should.not.exist( err );
    } );

    describe( 'Test evaluateBL', function() {
        it( 'evaluateBL should pass with bl schein 2/3 treatments', async function() {
            let scheinData = getScheinData( {
                caseFolderId,
                employeeId: employeeId,
                locationId,
                fk4234: true,
                fk4235Set: [
                    {
                        fk4252: 3,
                        fk4255: 0,
                        fk4244Set: [
                            {
                                fk4246: 0,
                                fk4244: BL_CODE_1
                            }
                        ],
                        fk4247: null,
                        fk4235: moment( '2016-07-31T22:00:00.000Z' ).toISOString()
                    }
                ]
            } );
            [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'activity',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( scheinData )
            } ) );
            should.not.exist( err );
            should.exist( results );
            results.should.be.an( 'array' ).which.has.lengthOf( 1 );
            scheinId = results[0];

            let activities = [
                getTreatmentData( {
                    caseFolderId,
                    locationId,
                    employeeId,
                    code: BL_CODE_1
                } ),
                getTreatmentData( {
                    caseFolderId,
                    locationId,
                    employeeId,
                    code: BL_CODE_1
                } )
            ];

            [err, results] = await formatPromiseResult( Promise.all( activities.map( (treatment => Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                action: 'post',
                data: treatment
            } )) ) ) );

            should.not.exist( err );
            results.should.be.an( 'array' ).which.has.lengthOf( 2 );

            await wait( this ); // wait for post-processes

            [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                query: {_id: scheinId}
            } ) );

            should.not.exist( err );
            results.should.be.an( 'array' ).which.has.lengthOf( 1 );

            let schein = results[0];

            [err, results] = await formatPromiseResult( Y.doccirrus.api.activity.evaluateBL( {
                user,
                data: {
                    schein
                },
                options: {silent: true}
            } ) );

            should.not.exist( err );
            results.should.be.an( 'object' );
            results.ok.should.equal( true );
        } );
        it( 'evaluateBL should not pass with 3/3 treatments and no psuedo gnr or marked schein', async function() {
            [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                action: 'post',
                data: getTreatmentData( {
                    caseFolderId,
                    locationId,
                    employeeId,
                    code: BL_CODE_1
                } )
            } ) );

            should.not.exist( err );
            results.should.be.an( 'array' ).which.has.lengthOf( 1 );

            await wait( this ); // wait for post-processes

            [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                query: {_id: scheinId}
            } ) );

            should.not.exist( err );
            results.should.be.an( 'array' ).which.has.lengthOf( 1 );

            let schein = results[0];

            [err, results] = await formatPromiseResult( Y.doccirrus.api.activity.evaluateBL( {
                user,
                data: {
                    schein
                },
                options: {silent: true}
            } ) );

            should.not.exist( err );
            results.should.be.an( 'object' );
            results.ok.should.equal( false );
        } );
        it( 'evaluateBL should pass with 3/3 treatments and psuedo gnr', async function() {
            [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                action: 'post',
                data: getTreatmentData( {
                    caseFolderId,
                    locationId,
                    employeeId,
                    code: '88130'
                } )
            } ) );

            should.not.exist( err );
            results.should.be.an( 'array' ).which.has.lengthOf( 1 );
            pseudoGnrId = results[0];

            await wait( this ); // wait for post-processes

            [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                query: {_id: scheinId}
            } ) );

            should.not.exist( err );
            results.should.be.an( 'array' ).which.has.lengthOf( 1 );

            let schein = results[0];

            [err, results] = await formatPromiseResult( Y.doccirrus.api.activity.evaluateBL( {
                user,
                data: {
                    schein
                },
                options: {silent: true}
            } ) );

            should.not.exist( err );
            results.should.be.an( 'object' );
            results.ok.should.equal( true );
        } );
        it( 'evaluateBL should not pass with 3/3 treatments and removed psuedo gnr', async function() {
            [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                action: 'delete',
                query: {
                    _id: pseudoGnrId
                }
            } ) );

            should.not.exist( err );
            results.should.be.an( 'array' ).which.has.lengthOf( 1 );

            await wait( this ); // wait for post-processes

            [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                query: {_id: scheinId}
            } ) );

            should.not.exist( err );
            results.should.be.an( 'array' ).which.has.lengthOf( 1 );

            let schein = results[0];

            [err, results] = await formatPromiseResult( Y.doccirrus.api.activity.evaluateBL( {
                user,
                data: {
                    schein
                },
                options: {silent: true}
            } ) );

            should.not.exist( err );
            results.should.be.an( 'object' );
            results.ok.should.equal( false );
        } );
        it( 'evaluateBL should pass with 3/3 treatments and no psuedo gnr but schein is marked as finished', async function() {
            [err, results] = await formatPromiseResult( Y.doccirrus.api.activity.setScheinFinishedWithoutPseudoCode( {
                user,
                data: {
                    scheinId,
                    finishedWithoutPseudoCode: true
                }
            } ) );

            should.not.exist( err );
            results.should.be.an( 'object' );
            results.nModified.should.equal( 1 );

            await wait( this ); // wait for post-processes

            [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                query: {_id: scheinId}
            } ) );

            should.not.exist( err );
            results.should.be.an( 'array' ).which.has.lengthOf( 1 );

            let schein = results[0];

            [err, results] = await formatPromiseResult( Y.doccirrus.api.activity.evaluateBL( {
                user,
                data: {
                    schein
                },
                options: {silent: true}
            } ) );

            should.not.exist( err );
            results.should.be.an( 'object' );
            results.ok.should.equal( true );
        } );
    } );
    describe( 'Test checkRezidivProphylaxeCodes', function() {
        it( 'should pass because schein is marked as finished', async function() {
            const rezidivProphylaxeTreatment = getTreatmentData( {
                caseFolderId,
                locationId,
                employeeId,
                code: REZIDIV_PROPHYLAXE_CODE
            } );
            [err, results] = await formatPromiseResult( Y.doccirrus.api.activity.checkRezidivProphylaxeCodes( {
                user,
                data: {
                    activity: rezidivProphylaxeTreatment
                }
            } ) );
            should.not.exist( err );
            results.should.be.an( 'object' );
            results.ok.should.equal( true );
        } );
        it( 'should not pass because schein is not marked as finished and wrong pseudo gnr is documented', async function() {
            [err, results] = await formatPromiseResult( Y.doccirrus.api.activity.setScheinFinishedWithoutPseudoCode( {
                user,
                data: {
                    scheinId,
                    finishedWithoutPseudoCode: false
                }
            } ) );

            should.not.exist( err );
            results.should.be.an( 'object' );
            results.nModified.should.equal( 1 );
            const rezidivProphylaxeTreatment = getTreatmentData( {
                caseFolderId,
                locationId,
                employeeId,
                code: REZIDIV_PROPHYLAXE_CODE
            } );
            [err, results] = await formatPromiseResult( Y.doccirrus.api.activity.checkRezidivProphylaxeCodes( {
                user,
                data: {
                    activity: rezidivProphylaxeTreatment
                }
            } ) );
            should.not.exist( err );
            results.should.be.an( 'object' );
            results.ok.should.equal( false );
        } );
        it( 'should pass because the right pseudo gnr is documented', async function() {
            [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                action: 'post',
                data: getTreatmentData( {
                    caseFolderId,
                    locationId,
                    employeeId,
                    code: '88131'
                } )
            } ) );

            should.not.exist( err );
            results.should.be.an( 'array' ).which.has.lengthOf( 1 );

            await wait( this ); // wait for post-processes

            const rezidivProphylaxeTreatment = getTreatmentData( {
                caseFolderId,
                locationId,
                employeeId,
                code: REZIDIV_PROPHYLAXE_CODE
            } );
            [err, results] = await formatPromiseResult( Y.doccirrus.api.activity.checkRezidivProphylaxeCodes( {
                user,
                data: {
                    activity: rezidivProphylaxeTreatment
                }
            } ) );
            should.not.exist( err );
            results.should.be.an( 'object' );
            results.ok.should.equal( true );
        } );
    } );
    describe( 'Test checkRezidivProphylaxeCodes', function() {
        it( 'clean case folder', async function() {
            [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                action: 'delete',
                query: {
                    caseFolderId
                }
            } ) );
            should.not.exist( err );
        } );
        it( 'should add warning about complete bl schein in last quarter', async function() {
            let currentDate = moment(),
                lastQuarterDate = moment().subtract( 1, 'quarter' );
            let scheinData = getScheinData( {
                caseFolderId,
                employeeId: employeeId,
                locationId,
                fk4234: true,
                fk4235Set: [
                    {
                        fk4252: 2,
                        fk4255: 0,
                        fk4244Set: [
                            {
                                fk4246: 0,
                                fk4244: BL_CODE_1
                            }
                        ],
                        fk4247: null,
                        fk4235: moment( '2016-07-31T22:00:00.000Z' ).toISOString()
                    }
                ]
            }, lastQuarterDate );
            [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'activity',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( scheinData )
            } ) );
            should.not.exist( err );
            should.exist( results );
            results.should.be.an( 'array' ).which.has.lengthOf( 1 );
            scheinId = results[0];

            let activities = [
                getTreatmentData( {
                    caseFolderId,
                    locationId,
                    employeeId,
                    code: BL_CODE_1
                }, lastQuarterDate.clone().add( '1', 'minute' ).toDate() ),
                getTreatmentData( {
                    caseFolderId,
                    locationId,
                    employeeId,
                    code: BL_CODE_1
                }, lastQuarterDate.clone().add( '1', 'minute' ).toDate() )
            ];

            [err, results] = await formatPromiseResult( Promise.all( activities.map( (treatment => Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                action: 'post',
                data: treatment
            } )) ) ) );

            should.not.exist( err );
            results.should.be.an( 'array' ).which.has.lengthOf( 2 );

            await wait( this ); // wait for post-processes

            [err, results] = await formatPromiseResult( Y.doccirrus.api.kbv.validateBlScheins( {
                user,
                params: {
                    invoiceLogId: ObjectId(),
                    quarter: currentDate.quarter(),
                    year: currentDate.year(),
                    locationIds: [locationId]
                }
            } ) );
            should.not.exist( err );
            results.should.be.an( 'array' ).which.has.lengthOf( 1 );
            results[0].scheinId.should.equal( scheinId );
            results[0].blPseudoGnrStatus.should.equal( 'KP2-966' );

        } );
    } );

} );