/**
 * User: mahmoud
 * Date: 24/06/15  16:40
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global Y, describe, it, should, expect*/

describe( 'an example test suite.', function() {

    it( 'test something (synchronous)', function() {
        var
            user = Y.doccirrus.auth.getSUForLocal();
        user.should.contain.all.keys( ['tenantId', 'identityId'] );
    } );

    it( 'test something (asynchronous)', function( done ) {
        var
            user = Y.doccirrus.auth.getSUForLocal();
        Y.doccirrus.mongodb.runDb( {
            user: user,
            model: 'admin',
            query: {},
            callback: function( err, result ) {
                should.not.exist( err );
                should.exist( result );
                result.should.be.an( 'Array' );
                expect( result ).to.have.length.of.at.least( 1 );
                done();
            }
        } );
    } );

    it( 'test with error', function() {
        expect( 2 * 2 ).equal( 5 );
    } );
} );
