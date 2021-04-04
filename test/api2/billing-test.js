/**
 * User: rw
 * Date: 16/12/15  16:26
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global should, describe*/
'use strict';

var
    utils = require( './testUtils' ),
    whiteBoxTest = 'billing-api-test.js',
    restModel = 'test';


// we need to skip this until we have access to a real MVPRC tenant for testing.
// this is MVPRC functionality only.
describe.skip( 'billing API test.', function() {
    var
        myParams = {};

    // run the billing white box test
    // all the details of the test are in the server
    it( 'should return success', function( done ) {
        utils.get( restModel, {filename: whiteBoxTest}, function( error, body ) {
            should.exist(body);
            body.should.be.an('object');
            body.meta.query.filename.should.equal(whiteBoxTest);
            body.data[0].success.should.be.a('string');
            myParams.body = body;
            myParams.error = error;
            done();
        } );
    } );

} );