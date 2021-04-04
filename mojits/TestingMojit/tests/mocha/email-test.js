/**
 * User: pi
 * Date: 13/07/2018  14:35
 * (c) 2018, Doc Cirrus GmbH, Berlin
 */
/*global Y, should, it, describe */

const
    mongoose = require( 'mongoose' ),
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    locationId = new mongoose.Types.ObjectId().toString(),
    user = Y.doccirrus.auth.getSUForLocal(),
    locationSmtp = {
        'smtpEmailFrom': 'location@SmtpEmailFrom.com',
        'smtpHost': 'locationSmtpHost',
        'smtpPort': 2222,
        'smtpSsl': false,
        'smtpUserName': 'locationSmtpUserName',
        'smtpPassword': 'locationSmtpPassword'
    },
    identity = {
        _id: "554cab460d94b2c90bbb4731",
        username: "Test",
        firstname: "Test",
        lastname: "Mocha",
        pwResetToken: "",
        status: "ACTIVE",
        specifiedBy: "554cab460d94b2c90bbb472f",
        memberOf: [
            {
                group: "ADMIN"
            },
            {
                group: "REDUCED_USER"
            }
        ],
        locations: [
            {
                _id: locationId,
                locname: "test"
            }
        ],
        roles: []
    };

describe( 'Email service test', function() {
    describe( 'Setup.', function() {
        it( 'Cleans db', function( done ) {
            this.timeout( 10000 );
            mochaUtils.cleanDB( {user}, function( err ) {
                should.not.exist( err );
                done();
            } );
        } );
        it( 'Inserts location', function( done ) {
            let
                locationData = mochaUtils.getLocationData( {
                    _id: locationId,
                    ...locationSmtp
                } );
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'location',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( locationData )
            }, function( err, result ) {
                should.not.exist( err );
                should.exist( result );
                result.should.contain( locationId );
                done();
            } );
        } );
    } );
    /**
     * This test covers Y.doccirrus.email.findSmtpConfiguration - this function is part of Y.doccirrus.email.sendEmail
     */
    describe( 'Test smtp settings', function() {
        let locationUser = Y.doccirrus.auth.buildUserByIdentity( {
            identity: identity,
            tenantId: user.tenantId
        } );
        it( 'calls findSmtpConfiguration with location user', function() {
            return Y.doccirrus.email.findSmtpConfiguration( {
                user: locationUser
            } )
                .then( smtpConfig => {
                    smtpConfig.smtpEmailFrom.should.equal( locationSmtp.smtpEmailFrom );
                    smtpConfig.smtpHost.should.equal( locationSmtp.smtpHost );
                    smtpConfig.smtpPort.should.equal( locationSmtp.smtpPort );
                    smtpConfig.smtpSsl.should.equal( locationSmtp.smtpSsl );
                    smtpConfig.smtpUserName.should.equal( locationSmtp.smtpUserName );
                    smtpConfig.smtpPassword.should.equal( locationSmtp.smtpPassword );
                } );
        } );
    } );
} );