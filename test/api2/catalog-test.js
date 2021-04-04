/**
 * User: dcdev
 * Date: 6/11/20  3:25 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/* global describe, it, should */

describe( '/2/catalog', function() {

    var
        utils = require( './testUtils' ),
        testLib = require( './testLib' ),
        testData = utils.getTestData( 'catalog-test-data' ),
        formatPromiseResult = utils.formatPromiseResult,
        makeAPICall = utils.makeAPICall;

    describe( 'Clean up data', function() {
        testLib.cleanUpWellKnownIds();
    } );

    testLib.insertCommonSuites( 'catalog', testData, { negate: true } );

    describe( '.getIcd10Catalog', function() {
        this.timeout( 15000 );

        before( function() {
            this.getIcd10CatalogEndpoint = 'catalog/:getIcd10Catalog';
        } );

        // Should return ICD10 list of results for given title, matching results in seq, title and infos properties
        it( 'Return all the results when title has not been passed', async function() {
            let
                err,
                resp;

            [err, resp] = await formatPromiseResult( makeAPICall( utils.post, null, {  }, this.getIcd10CatalogEndpoint ) );

            if ( err ) {
                err.should.be.equal(  null );
            }

            should.not.exist( err );

            resp.data.length.should.be.greaterThan( 0 );
        } );

        it( 'Return empty result when not matching anything in the ICD10 catalog', async function() {
            let
                err,
                resp;

            [err, resp] = await formatPromiseResult( makeAPICall( utils.post, null, { title: 'lorem ipsum dolor sit amet' }, this.getIcd10CatalogEndpoint ) );

            if ( err ) {
                err.should.be.equal(  null );
            }

            should.not.exist( err );

            resp.data.length.should.be.equal( 0 );
        } );

        for ( const testItem of testData.testData ) {
            it( `return ICD10 catalog result(s) for given title --> ${testItem.title} <--. Matching results in seq, title and infos properties`, async function() {
                let err,
                    resp;

                [err, resp] = await formatPromiseResult( makeAPICall( utils.post, null, { title: testItem.title }, this.getIcd10CatalogEndpoint ) );

                if ( err ) {
                    err.should.be.equal(  null );
                }

                should.not.exist( err );

                resp.data.length.should.be.equal( testItem.expectedCodeResults.length );

                // For given title should match following ICD10

                let resultCodes = resp.data.map( catalog => catalog.seq );

                testItem.expectedCodeResults.forEach( expectedCode => expect( resultCodes.includes( expectedCode ), `expecting ${expectedCode} to be in the result for the search: ${testItem.title}` ).to.be.true );
            } );
        }
    } );
} );
