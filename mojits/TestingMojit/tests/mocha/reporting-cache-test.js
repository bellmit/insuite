/**
 * User: md
 * Date: 11/12/20  18:04
 * (c) 2020, Doc Cirrus GmbH, Berlin
 */
/*global Y, should, expect, before, after,it, describe*/

const
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    util = require( 'util' ),
    cleanDb = util.promisify( mochaUtils.cleanDB ),
    {formatPromiseResult} = require( 'dc-core' ).utils,
    user = Y.doccirrus.auth.getSUForLocal();

const
    [ patientId ] = mochaUtils.getObjectIds(),
    patientData = mochaUtils.getPatientData( { _id: patientId } );

const
    rCache = Y.doccirrus.insight2.reportingCache.createReportingCache(),
    loadOrGetP = util.promisify( rCache.loadOrGet );

describe( 'Reporting-cache test', function() {

    before( async function() {
        this.timeout( 10000 );
        await cleanDb( {user} );
    } );
    after( async function() {
        await cleanDb( {user} );
    } );

    describe( 'check main cache functionality', function() {
        it( `should have expose exact public functions`, function() {
            rCache.should.be.an( 'object' );
            let functionList = [];
            for( const [key, value] of Object.entries( rCache ) ) {
                if( typeof value === 'function' ) {
                    functionList.push( key );
                }
            }
            expect( functionList ).to.deep.equalInAnyOrder( ['clear', 'has', 'checkMissing', 'get', 'invalidate', 'store', 'getCacheSize', 'setCacheSize', 'load', 'loadOrGet'] );
        } );

        it( `should store, retrieve model data`, function() {
            const dummyId = 'someId';
            let result = rCache.store( 'patient', dummyId, patientData );
            result.should.be.eql( true );
            result = rCache.has( 'patient', dummyId );
            result.should.be.eql( true );
            result = rCache.get( 'patient', dummyId );
            expect( result ).to.deep.equal( patientData );
        } );

        it( `should clear stored models`, function() {
            const
                dummyId1 = 'someId1',
                dummyId2 = 'someId2';
            rCache.store( 'm1', dummyId1, {someData: 1} );
            rCache.store( 'm2', dummyId2, {someData: 2} );

            let result = rCache.has( 'm1', dummyId1 );
            result.should.be.eql( true );
            result = rCache.has( 'm2', dummyId2 );
            result.should.be.eql( true );

            result = rCache.clear();
            result.should.be.eql( true );

            result = rCache.has( 'm1', dummyId1 );
            result.should.be.eql( false );
            result = rCache.has( 'm2', dummyId2 );
            result.should.be.eql( false );
        } );

        it( `should remove item from cache by id`, function() {
            const
                dummyId1 = 'someId1',
                dummyId2 = 'someId2';
            rCache.store( 'm1', dummyId1, {someData: 1} );
            rCache.store( 'm1', dummyId2, {someData: 2} );

            let result = rCache.invalidate( 'm1', 'notInCache' );
            result.should.be.eql( false );
            result = rCache.invalidate( 'm1', dummyId1 );
            result.should.be.eql( true );

            result = rCache.has( 'm1', dummyId1 );
            result.should.be.eql( false );
            result = rCache.has( 'm1', dummyId2 );
            result.should.be.eql( true );
        } );

        it( `should load data from cache or from db if not found`, async function() {
            let [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'patient',
                    action: 'post',
                    data: {...patientData, skipcheck_: true}
                } )
            );
            should.not.exist( err );
            result.should.be.an( 'array' ).that.has.lengthOf( 1 ).and.contain.all.members( [patientId] );

            //grab patientData pre/post processed
            let patients;
            [err, patients] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'patient',
                    action: 'get',
                    query: {_id: patientId}
                } )
            );
            should.not.exist( err );
            patients.should.be.an( 'array' ).that.has.lengthOf( 1 );
            const patientDataDB = patients[0];

            [err, result] = await formatPromiseResult( loadOrGetP( user, 'patient', patientId ) );
            should.not.exist( err );
            expect( result ).to.deep.equal( patientDataDB );

            result = rCache.has( 'patient', patientId );
            result.should.be.eql( true );

            //remove data from db to ensure it will take from cache
            [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'patient',
                    action: 'delete',
                    query: {_id: patientId}
                } )
            );
            should.not.exist( err );

            //note: data stored in cache as JSON.stringify object therefore it lost Data and ObjectId
            [err, result] = await formatPromiseResult( loadOrGetP( user, 'patient', patientId ) );
            should.not.exist( err );
            expect( result ).to.deep.equal( JSON.parse( JSON.stringify( patientDataDB ) ) );
        } );
    } );

    describe( 'check edge cases and additional cache limitations', function() {
        it( `should not allow store large object (stringify length > 10e4 )`, function() {
            const
                dummyId1 = 'someId1';
            let result = rCache.store( 'm1', dummyId1, {someLargeData: 'a'.repeat(10e4 ) } );
            result.should.be.eql( false );
            result = rCache.has( 'm1', dummyId1 );
            result.should.be.eql( false );

            result = rCache.store( 'm1', dummyId1, {someLargeData: 'a'.repeat(10e4 - 100 ) } );
            result.should.be.eql( true );
            result = rCache.has( 'm1', dummyId1 );
            result.should.be.eql( true );
        } );
    } );

} );



