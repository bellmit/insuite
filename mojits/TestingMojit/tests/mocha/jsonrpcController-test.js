/**
 * User: pi
 * Date: 05.12.17  08:58
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global Y, it, describe, should*/

const
    user = Y.doccirrus.auth.getSUForLocal(),
    validRequest = {
        doNotStringify: true,
        params: {
            jsonrpc: '2.0',
            method: 'someApi.someMethod',
            params: {},
            id: 1
        },
        req: {
            url: '/1/jsonrpc',
            method: 'POST',
            statusCode: null,
            statusMessage: null,

            baseUrl: '',
            originalUrl: '/1/jsonrpc'
        },
        query: {},
        realmHost: '1111111111.dev.dc',
        signedCookies: {},
        user: user,
        files: {}
    },
    friendRequest = {
        doNotStringify: true,
        params: {
            jsonrpc: '2.0',
            method: 'someApi.someMethod',
            params: {},
            id: 1
        },
        req: {
            url: '/1/jsonrpc',
            method: 'POST',
            statusCode: null,
            statusMessage: null,
            isFromFriend: true,
            baseUrl: '',
            originalUrl: '/1/jsonrpc'
        },
        query: {},
        realmHost: '1111111111.dev.dc',
        signedCookies: {},
        user: user,
        files: {}
    };

describe( 'Test jsonrpc controller', function() {
    describe( '1. Test friend request', function() {
        let
            validResult,
            friendResult;
        it( 'Makes valid request', function( done ) {
            Y.doccirrus.JSONRPCController.handleRequest( validRequest, ( err, result ) => {
                should.not.exist( err );
                validResult = result;
                done();
            } );
        } );
        it( 'Checks valid result', function() {
            should.exist( validResult );
            validResult.data.error.data.should.be.an( 'array' );
            validResult.data.error.data[0].code.should.equal( 403 );
        } );

        it( 'Makes friend request', function( done ) {
            Y.doccirrus.JSONRPCController.handleRequest( friendRequest, ( err, result ) => {
                should.not.exist( err );
                friendResult = result;
                done();
            } );
        } );
        it( 'Checks valid result', function() {
            should.exist( friendResult );
            friendResult.data.error.data.should.be.an( 'array' );
            friendResult.data.error.data[0].code.should.equal( 403 );
        } );

    } );
} );
