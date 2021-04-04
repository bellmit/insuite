/**
 * User: mahmoud
 * Date: 15/06/15  16:26
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/* global expect, should, describe, it */

const
    utils = require( './testUtils' ),
    countryMode = utils.countryMode,
    formatPromiseResult = utils.formatPromiseResult,
    testLib = require( './testLib' ),
    cardReaderTestData = utils.getTestData( 'cardreader-test-data' ),
    cardReaderTITestData = utils.getTestData( 'cardreader-TI-test-data' ),
    modelName = 'cardreader';

if ( !countryMode || countryMode === 'de' ) {
    const
        cardReaderData = cardReaderTestData.getData(),
        cardReaderTIData = cardReaderTITestData.getData();

    describe.skip( 'cardreader, only GET is supported.', function() {
        var
            myParams = {};
        testLib.insertGETSuite( modelName, cardReaderData, { description: 'GET cardreader names' }, function( error, body ) {
            myParams.body = body;
        } );

        describe( 'GET cardreader data.', function() {
            it( 'should have list of cardreader names', function() {
                should.exist( myParams.body );
                expect( myParams.body.data ).to.have.length.of.at.least( 1 );
                expect( myParams.body.data[0] ).to.have.property( 'name' );
                myParams.body.data[0].name.should.be.a( 'string' );
                myParams.crName = myParams.body.data[0].name;
            } );

            it( 'should return cardreader data', function( done ) {
                should.exist( myParams.crName );
                utils.get( modelName, { name: myParams.crName }, function( error, body ) {
                    myParams.body = body;
                    myParams.error = error;
                    done();
                } );
            } );

            testLib.insertCommonChecks( myParams );

            it( 'checking cardreader data', function() {
                expect( myParams.body.data ).to.have.length.of.at.least( 1 );
                expect( myParams.body.data[0] ).to.have.property( 'name' );
                myParams.body.data[0].name.should.equal( myParams.crName );
                expect( myParams.body.data[0] ).to.have.property( 'data' );
                expect( myParams.body.data[0].data ).to.have.length.of.at.least( 1 );
                expect( myParams.body.data[0].data[0] ).to.contain.all.keys( ['_id', 'firstname', 'lastname'] ); // all the keys that must be there
            } );
        } );

        testLib.insertPOSTSuite( modelName, cardReaderData, { negate: true, errorCode: 403 } );
        testLib.insertPUTSuite( modelName, cardReaderData, { negate: true, errorCode: 403 } );
        testLib.insertDELETESuite( modelName, cardReaderData, { negate: true, errorCode: 403 } );
    } );

    const makeAPICall = function( apiCall, query, data, model = modelName ) {
        return new Promise( function( resolve, reject ) {
            apiCall( model, query || data, function( err, resp ) {
                if( err ) {
                    return reject( err );
                }
                return resolve( resp );
            } );
        } );
    };

    const commonAPICheck = function( err, resp ) {
        should.not.exist( err );
        should.exist( resp );
        resp.should.be.a( 'object' );
        resp.should.have.property( 'data' );
    };

    let firstCard;

    describe( 'Cardreader TI', function() {
        describe( 'Get list of card readers for this tenant', function() {
            it( 'should have list of card readers', async function() {
                let [err, resp] = await formatPromiseResult( makeAPICall( utils.get, { ti: true }, cardReaderTIData ) );
                commonAPICheck( err, resp );
                expect( resp.data[0] ).to.have.property( 'CtNames' );
                expect( resp.data[0].CtNames ).to.be.an( 'array' );
                firstCard = resp.data[0];
            } );
        } );
        describe( 'Read the card in the terminal, and get the response', function() {
            it( 'should return Card Read Error', async function() {
                let [err, resp] = await formatPromiseResult(
                    makeAPICall( utils.post, {}, firstCard, `${modelName}/:getPatientFromCard` )
                );
                commonAPICheck( err, resp );
                expect( resp.data ).to.have.property( 'errors' );
                expect( resp.data.errors[0] ).to.have.property( 'code' );
                expect( resp.data.errors[0].code ).to.be.equal( 112201 );
            } );
        } );

    } );
}
