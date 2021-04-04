/*global Y, should, describe, it, user, after, before*/

/**
 * whitebox unit tests
 */


const
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    mongoose = require( 'mongoose' ),
    moment = require( 'moment' ),
    util = require( 'util' ),
    identityId = new mongoose.Types.ObjectId().toString(),
    supportIdentityId = new mongoose.Types.ObjectId().toString(),
    employeeId = new mongoose.Types.ObjectId().toString(),
    loginToken = Y.doccirrus.utils.generateSupportLoginToken() + 'MOCHA',
    supportIdentity = Y.doccirrus.schemas.identity.getSupportIdentityObj(),
    host = Y.doccirrus.auth.getMyHost( user.tenantId, true ),
    {formatPromiseResult} = require( 'dc-core' ).utils,
    cleanDb = util.promisify( mochaUtils.cleanDB ),
    loginLink = host + '/login/token?id=' + supportIdentityId + '&loginToken=' + loginToken;

describe( 'Support request sending test', () => {
    describe( '0. Setup.', () => {
        it( 'Cleans db', async () => {
            let [err] = await formatPromiseResult( cleanDb( {user} ) );
            should.not.exist( err );
        } );
        it( 'Insert employee', async () => {
            let
                employeeData = mochaUtils.getEmployeeData( {
                    _id: employeeId
                } );
            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'employee',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( employeeData )
                } )
            );
            should.not.exist( err );
            should.exist( result );
            result.should.contain( employeeId );
        } );
        it( 'Insert identity', async () => {
            let
                identityData = mochaUtils.getIdentityData( {
                    _id: identityId
                } );
            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'identity',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( identityData )
                } )
            );
            should.not.exist( err );
            should.exist( result );
            result.should.contain( identityId );
        } );
        it( 'Insert support identity', async () => {

            supportIdentity.validFrom = new Date();
            supportIdentity._id = supportIdentityId;
            supportIdentity.loginToken = loginToken;
            supportIdentity.expireDate = supportIdentity.validTo = moment().add( 'hour', 4 ).toDate();

            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'identity',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( supportIdentity )
                } )
            );
            should.not.exist( err );
            should.exist( result );
            result.should.contain( supportIdentityId );
        } );
        it( 'Insert support request', async () => {
            let
                requestData = {
                    timestamp: new Date(),
                    coname: 'TestCompany',
                    sendingEmployeeName: 'Firstname Lastname',
                    supportDuration: '4',
                    status: Y.doccirrus.schemas.supportrequest.statuses.ACTIVE,
                    isPartnerRequest: false,
                    loginToken: loginToken,
                    loginLink: loginLink
                };

            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'supportrequest',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( requestData )
                } )
            );
            should.not.exist( err );
            should.exist( result );
        } );
    } );
    describe( '1. Check login token logic - auth, token replacing', () => {
        const
            externalPost = [];

        before( () => {
            Y.doccirrus.https.event.on( 'onExternalPost', ( data ) => {
                externalPost.push( data );
            } );
        } );
        after( () => {
            Y.doccirrus.https.event.removeAllListeners( 'onExternalPost' );
            //return https functionality to original state to allow multiple test run
            Y.doccirrus.https = Y.doccirrus.https.original;
        } );

        it( 'Try to get auth for new support account -  SHOULD NOT exists', async () => {
            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'auth',
                    action: 'get',
                    query: {identityId: supportIdentityId}
                } )
            );
            should.not.exist( err );
            should.exist( result );
            result.should.be.an( 'array' );
            result.should.have.lengthOf( 0 );
        } );

        it( 'Trigger support login link', function( done ) {
            setTimeout( () => {
                Y.doccirrus.https.original.externalGet( loginLink, Object.assign( {errDataCallback: true}, Y.doccirrus.auth.setInternalAccessOptions() ), function( error ) {
                    should.not.exist( error );
                    done();
                } );
            }, 0 );
        } );

        it( 'Try to get auth for new support account -  SHOULD exists', async () => {
            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'auth',
                    action: 'get',
                    query: {identityId: supportIdentityId}
                } )
            );
            should.not.exist( err );
            should.exist( result );
            result.should.be.an( 'array' );
            result.should.have.lengthOf( 1 );
            result[0].should.be.an( 'object' );
            result[0].should.have.property( 'tenantId' );
            result[0].should.have.property( 'id' );
            result[0].should.have.property( 'U' );
            result[0].tenantId.should.equal( user.tenantId );
            result[0].id.should.equal( supportIdentity.username );
            result[0].U.should.equal( supportIdentity.firstname + ' ' + supportIdentity.lastname );
        } );

        it( 'Check request to DCPRC', () => {
            externalPost.should.have.lengthOf( 1 );
            externalPost[0].should.be.an( 'object' );
            externalPost[0].should.have.all.keys( ['url', 'data', 'options'] );
            externalPost[0].url.should.equal( Y.doccirrus.auth.getDCPRCUrl( '/1/supportrequest/:createNew' ) );
            externalPost[0].options.should.deep.equal( {errDataCallback: true, friend: true} );
            externalPost[0].data.should.have.all.keys( ['oldLoginToken', 'newLoginToken'] );
            externalPost[0].data.oldLoginToken.should.equal( loginToken );
        } );

        it( 'Get support identity to check token replacing', async () => {
            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'identity',
                    action: 'get',
                    query: {_id: supportIdentityId}
                } )
            );
            should.not.exist( err );
            should.exist( result );
            result.should.be.an( 'array' );
            result.should.have.lengthOf( 1 );
            result[0].should.be.an( 'object' );
            result[0].should.have.property( 'loginToken' );
            result[0].loginToken.should.not.equal( loginToken );
        } );

        it( 'Trigger support login link with old token - should return error', function( done ) {
            setTimeout( () => {
                Y.doccirrus.https.original.externalGet( loginLink, Object.assign( {errDataCallback: true}, Y.doccirrus.auth.setInternalAccessOptions() ), function( error ) {
                    should.exist( error );
                    done();
                } );
            }, 0 );
        } );
    } );
    describe( '2. Check supportrequest status changes', () => {
        let
            requestId;

        it( 'Create new support request', async () => {
            let
                token = Y.doccirrus.utils.generateSupportLoginToken(),
                requestData = {
                    timestamp: new Date(),
                    coname: 'TestCompany1',
                    sendingEmployeeName: 'Firstname1 Lastname1',
                    supportDuration: '4',
                    status: Y.doccirrus.schemas.supportrequest.statuses.ACTIVE,
                    isPartnerRequest: false,
                    loginToken: token,
                    loginLink: host + '/login/token?id=' + supportIdentityId + '&loginToken=' + token
                };
            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'supportrequest',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( requestData )
                } )
            );
            should.not.exist( err );
            should.exist( result );
            result.should.be.an( 'array' ).which.has.lengthOf( 1 );
            requestId = result[0];
        } );

        it( 'Check status - should be ACTIVE', async () => {
            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'supportrequest',
                    action: 'get',
                    query: {_id: requestId}
                } )
            );
            should.not.exist( err );
            should.exist( result );
            result.should.be.an( 'array' );
            result.should.have.lengthOf( 1 );
            result[0].should.be.an( 'object' );
            result[0].should.have.property( 'status' );
            result[0].status.should.equal( Y.doccirrus.schemas.supportrequest.statuses.ACTIVE );
        } );

        it( 'Accept support request - status should be ACCEPTED', async () => {
            let [err, result] = await formatPromiseResult(
                Y.doccirrus.api.supportrequest.acceptRequest( {
                    user: user,
                    query: {_id: requestId}
                } )
            );
            should.not.exist( err );
            should.exist( result );
            result.should.be.an( 'object' );
            result.should.have.property( 'status' );
            result.status.should.equal( Y.doccirrus.schemas.supportrequest.statuses.ACCEPTED );
        } );
    } );
} );



