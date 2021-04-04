'use strict';

var
    request = require( 'superagent'),
    //_assert = require( 'assert' ),
    should = require( 'should' ),

    _URL = 'http://prcs.dev.dc/r/';

/**
 * superagent differentiates between error on communication and application level
 * @param testError
 * @param applicationError
 */
function testOnErrors( testError, applicationError ) {
    //appicationError is false if no error exists OR contains the error message
    return testError || ( !applicationError ? undefined : applicationError );
}

describe('request', function()
{
    describe('persistent agent', function()
    {
        var agent = request.agent();

        it('should receive a datetime', function(done) {
            agent
                .get( _URL+'getTime/?action=getTime' )
                .set( 'Access-Control-Allow-Headers', 'content-type, authorization, origin, x-requested-with, x-frame-options' )
                .set( 'X-Requested-With', 'XMLHttpRequest' )
                .set( 'X-DC-Friend', 'lkjasdpo9izf8q234r98' )
                .end( function( err, res ) {
                    should.not.exist( testOnErrors( err, res.error ) );
                    res.should.have.status( 200 );
                    done();
                });
        });
    });
});