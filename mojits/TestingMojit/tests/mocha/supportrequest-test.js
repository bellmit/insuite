/*global Y, should, describe, it, user, after*/
/**
 * whitebox integration test to check connection between PRC and DCPRC to send supportRequest
 * PUC and DCPRC should be online
 */


const
    mochaUtils = require( '../../server/mochaUtils' )( Y );


describe( 'Support request sending test', function() {
    describe( '0. Setup.', function() {
        it( 'cleans db', function( done ) {
            mochaUtils.cleanDB( {user}, function( err ) {
                should.not.exist( err );
                done();
            } );
        } );
    } );
    describe( '1. Send support request', function() {
        after( function() {
            Y.doccirrus.https = Y.doccirrus.https.original;
        } );

        it( 'Make externalPost call to DCPRC', function( done ) {
            var
            url = Y.doccirrus.auth.getDCPRCUrl( '/1/supportrequest/:saveRequest' ),
                params = {
                    timestamp: new Date(),
                    coname: 'MOCHA-TEST',
                    sendingEmployeeName: user.U,
                    supportDuration: '4',
                    status: Y.doccirrus.schemas.supportrequest.statuses.ACTIVE,
                    isPartnerRequest: false,
                    loginLink: 'testLoginToken'
                };

            Y.doccirrus.https.original.externalPost( url, params, Object.assign( { errDataCallback: true }, Y.doccirrus.auth.setInternalAccessOptions() ), function( error, result ) {
                should.not.exist( error );
                should.exist( result );
                result.should.equal( params.coname );
                done();
            } );
        } );

    } );
} );



