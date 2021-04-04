/**
 * User: nazar krania
 * Date: 2/7/19  1:24 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/* global expect, should, describe, it */

const
    utils = require( './testUtils' ),
    countryMode = utils.countryMode,
    formatPromiseResult = utils.formatPromiseResult,
    blobData = utils.getTestData( 'blob-test-data' ),
    model = 'blob';

let mediaId;

if ( !countryMode || countryMode === 'de' ) {
    const makeAPICall = ( apiCall, query, data ) => {
        return new Promise( ( resolve, reject ) => {
            apiCall( model, query || data, function( err, resp ) {
                if( err ) {
                    return reject( err );
                }
                return resolve( resp );
            } );
        } );
    };

    const commonAPICheck = ( err, resp ) => {
        should.not.exist( err, `error should not exist: ${err && err.message}` );
        should.exist( resp );
        resp.should.be.a( 'object' );
        resp.meta.warnings.should.to.have.length( 0 );
        resp.meta.errors.should.to.have.length( 0 );
        resp.should.have.property( 'data' );
    };

    describe( 'Test 2/blob', function() {
        this.timeout( 15000 );

        it( 'POST /blob data', async () => {
            let [err, resp] = await formatPromiseResult( makeAPICall( utils.post, null, blobData.getData() ) );
            commonAPICheck( err, resp );
            mediaId = resp.data[0];
        } );

        it( 'POST /blob return an error in case if dataURI is empty', async () => {
            let data = blobData.getData();
            data.dataURI = undefined;
            let [err, resp] = await formatPromiseResult( makeAPICall( utils.post, null, data ) );
            should.exist( err );
            should.not.exist( resp );
            expect( err.message ).to.equal( '<html><body><h1>Error: 400</h1><p>400 "Missing required parameter: dataURI"</p></body></html>' );
        } );

        it( 'GET /blob data by media ID', async () => {
            let [err, resp] = await formatPromiseResult( makeAPICall( utils.get, { _id: mediaId } ) );
            commonAPICheck( err, resp );
            resp.data.should.to.have.length( 1 );
        } );

        it( 'GET /blob data', async () => {
            let [err, resp] = await formatPromiseResult( makeAPICall( utils.get, {} ) );
            commonAPICheck( err, resp );
        } );

        it( 'GET /blob return an error in case if media id does not exist', async () => {
            let fakeMediaId = utils.getPseudoMongooseId();
            let [err, resp] = await formatPromiseResult( makeAPICall( utils.get, { _id: fakeMediaId } ) );
            should.exist( err );
            should.not.exist( resp );
            expect( err.message ).to.equal( '<html><body><h1>Error: 404</h1><p>404 "Image not found"</p></body></html>' );
        } );
    } );
}
