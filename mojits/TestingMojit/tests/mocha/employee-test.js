/*global Y, describe, it, should, before, after*/

const
    mongoose = require( 'mongoose' ),
    {formatPromiseResult, promisifyArgsCallback} = require( 'dc-core' ).utils,
    util = require( 'util' ),
    {wait} = require( '../utils' ),
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    cleanDb = util.promisify( mochaUtils.cleanDB ),
    doResetEmployeePwP = promisifyArgsCallback( Y.doccirrus.api.employee.doResetEmployeePw ),
    EMAIL_SUBJECT = Y.doccirrus.i18n( 'UserMgmtMojit.reset.SUBJECT' ),
    user = Y.doccirrus.auth.getSUForLocal();

const postEntry = async ( model, entry ) => {
    return Y.doccirrus.mongodb.runDb( {
        user,
        model,
        action: 'post',
        data: Y.doccirrus.filters.cleanDbObject( entry )
    } );
};
const cleanCollections = async () => {
    await cleanDb( {user, collections2clean: ['auth', 'employee', 'identity']} );
};
describe( 'employee-api tests', () => {
    describe( '1. Test doResetPw functionality.', () => {
        const
            employeeId = new mongoose.Types.ObjectId().toString(),
            identityId = new mongoose.Types.ObjectId().toString(),
            employeeData = mochaUtils.getEmployeeData( {_id: employeeId} ),
            identityData = mochaUtils.getIdentityData( {_id: identityId, specifiedBy: employeeId} ),
            authData = {
                "id": identityData.username,
                "U": "Mocha Admin",
                "tenantId": "mocha",
                "identityId": identityId,
                "country": "Deutschland",
                "ip": "::ffff:127.0.0.1",
                "sessionId": "eOcVwlL6Dijo2xvLpo7Kqcp4aZcDTFj3",
                "host": "mocha.dc",
                "checkinTime": new Date(),
                "TOKENS": []
            };

        let
            mailOptions;
        before( function() {
            Y.doccirrus.email.event.on( 'onSendEmail', ( _mailOptions ) => {
                mailOptions = _mailOptions;
            } );
        } );
        after( function() {
            Y.doccirrus.email.event.removeAllListeners( 'onSendEmail' );
        } );

        it( 'Checks mocked email module', function() {
            should.exist( Y.doccirrus.email.mocked );
        } );

        it( 'Clean db', async () => {
            await cleanCollections();
        } );

        it( 'Setup data', async function() {
            let err;

            [err] = await formatPromiseResult( postEntry( 'employee', Y.doccirrus.filters.cleanDbObject( employeeData ) ) );
            should.not.exist( err );
            [err] = await formatPromiseResult( postEntry( 'identity', Y.doccirrus.filters.cleanDbObject( identityData ) ) );
            should.not.exist( err );
            [err] = await formatPromiseResult( postEntry( 'auth', Y.doccirrus.filters.cleanDbObject( authData ) ) );
            should.not.exist( err );
        } );

        it( 'Execute a call of doResetEmployeePw function for created employee', async function() {
            let [err] = await formatPromiseResult( doResetEmployeePwP( {
                user,
                data: {id: employeeId}
            } ) );
            should.not.exist( err );
        } );

        it( 'Check identity pw and pwResetToken', async function() {
            let err, result, resettedIdentity;

            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'identity',
                    query: {_id: identityId}
                } )
            );
            should.not.exist( err );
            result.should.be.an( 'array' ).which.has.lengthOf( 1 );
            resettedIdentity = result[0];
            resettedIdentity.should.be.an( 'object' );
            resettedIdentity.should.have.property( 'pw' );
            resettedIdentity.pw.should.not.be.equal( identityData.pw );
            resettedIdentity.should.have.property( 'pwResetToken' );
            resettedIdentity.pw.should.not.be.equal( identityData.pwResetToken );
        } );

        it( 'Check if there are no auth records for this identity', async function() {
            let
                [err, result] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'auth',
                        query: {identityId}
                    } )
                );
            should.not.exist( err );
            result.should.be.an( 'array' ).which.has.lengthOf( 0 );
            await wait( this, 500 );
        } );

        it( 'Check if we receive resetPw email', () => {
            mailOptions.should.be.an( 'object' ).that.have.property( 'subject' );
            mailOptions.subject.should.be.equal( EMAIL_SUBJECT );
        } );
    } );
} );