/**
 * User: pi
 * Date: 05.12.17  08:58
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global Y, it, describe, after, before, should */
const
    fs = require( 'fs' ),
    {formatPromiseResult} = require( 'dc-core' ).utils,
    getRequest = {
        method: 'GET',
        model: 'activity',
        action: 'testAction',
        options: {
            someOption: true
        },
        query: {
            myField: 'myValue'
        },
        host: 'host'
    },
    postRequest = {
        method: 'POST',
        model: 'activity',
        action: 'testPostAction',
        options: {
            someOption: true
        },
        data: {
            someDataField: 'dataHere'
        },
        host: 'host'
    },
    putRequest = {
        method: 'PUT',
        model: 'activity',
        action: 'testPutAction',
        query: {
            putQuery: 'bla'
        },
        options: {
            someOption: true
        },
        data: {
            someDataField: 'dataHere'
        },
        host: 'host'
    },
    deleteRequest = {
        method: 'DELETE',
        model: 'activity',
        action: 'testDeleteAction',
        query: {
            _id: 'deleteId'
        },
        options: {
            someOption: true
        },
        data: {
            someDataField: 'dataHere'
        },
        host: 'host'
    },

    m2mServerJson = require( '../certificates/dcprc/m2m-server.config' ),
    m2mClientJson = require( '../certificates/prc/m2m-client.config' );

let
    m2mServerJsonOrig,
    m2mClientJsonOrig;

describe( 'Test https module', function() {
    describe( '1. Test externalApiCall', function() {
        const
            externalGet = [],
            externalPut = [],
            externalPost = [],
            externalDelete = [];
        before( function() {
            Y.doccirrus.https.event.on( 'onExternalGet', ( data ) => {
                externalGet.push( data );
            } );
            Y.doccirrus.https.event.on( 'onExternalPut', ( data ) => {
                externalPut.push( data );
            } );
            Y.doccirrus.https.event.on( 'onExternalPost', ( data ) => {
                externalPost.push( data );
            } );
            Y.doccirrus.https.event.on( 'onExternalDelete', ( data ) => {
                externalDelete.push( data );
            } );
        } );
        after( function() {
            Y.doccirrus.https.event.removeAllListeners( 'externalGet' );
            Y.doccirrus.https.event.removeAllListeners( 'externalPut' );
            Y.doccirrus.https.event.removeAllListeners( 'externalPost' );
            Y.doccirrus.https.event.removeAllListeners( 'externalDelete' );
        } );
        it( 'Makes GET request without query and without action', function( done ) {
            let
                params = Object.assign( {}, getRequest );
            delete params.query;
            delete params.action;
            Y.doccirrus.https.original.externalApiCall( params, done );
        } );
        it( 'Makes GET request without query', function( done ) {
            let
                params = Object.assign( {}, getRequest );
            delete params.query;
            Y.doccirrus.https.original.externalApiCall( params, done );
        } );
        it( 'Makes GET request', function( done ) {
            Y.doccirrus.https.original.externalApiCall( getRequest, done );
        } );

        it( 'Makes POST request', function( done ) {
            Y.doccirrus.https.original.externalApiCall( postRequest, done );
        } );
        it( 'Makes PUT request', function( done ) {
            Y.doccirrus.https.original.externalApiCall( putRequest, done );
        } );
        it( 'Makes DELETE request', function( done ) {
            Y.doccirrus.https.original.externalApiCall( deleteRequest, done );
        } );

        it( 'Checks get requests', function() {
            externalGet.should.have.lengthOf( 3 );
            externalGet[0].should.deep.equal( {url: 'host/1/activity', options: {someOption: true}} );
            externalGet[1].should.deep.equal( {url: 'host/1/activity/:testAction', options: {someOption: true}} );
            externalGet[2].should.deep.equal( {
                url: 'host/1/activity/:testAction/myField/myValue',
                options: {someOption: true}
            } );
        } );

        it( 'Checks post requests', function() {
            externalPost.should.have.lengthOf( 1 );
            externalPost[0].should.deep.equal( {
                url: 'host/1/activity/:testPostAction',
                data: {someDataField: 'dataHere'},
                options: {someOption: true}
            } );
        } );

        it( 'Checks post requests', function() {
            externalPut.should.have.lengthOf( 1 );
            externalPut[0].should.deep.equal( {
                url: 'host/1/activity/:testPutAction/putQuery/bla',
                data: {someDataField: 'dataHere'},
                options: {someOption: true}
            } );
        } );

        it( 'Checks delete requests', function() {
            externalDelete.should.have.lengthOf( 1 );
            externalDelete[0].should.deep.equal( {
                url: 'host/1/activity/:testDeleteAction/_id/deleteId',
                data: {someDataField: 'dataHere'},
                options: {someOption: true}
            } );
        } );
    } );

    describe( `2. Test certificate parsing/verifying and signature methods `, function() {
        let
            dcprcPublicCertificateStr,
            prcPublicCertificateStr,
            dcprcSignatureResp;

        const
            inputString = "test input";

        before( function() {
            m2mServerJsonOrig = Y.doccirrus.https.original.getM2mServerJson();
            m2mClientJsonOrig = Y.doccirrus.https.original.getM2mClientJson();

            Y.doccirrus.https.original.setM2mServerJson( m2mServerJson );
            Y.doccirrus.https.original.setM2mClientJson( m2mClientJson );

            prcPublicCertificateStr = fs.readFileSync( m2mClientJson.clientCrtPath ).toString();
            dcprcPublicCertificateStr = fs.readFileSync( m2mServerJson.serverCrtPath ).toString();
        } );

        after( function() {
            Y.doccirrus.https.original.setM2mServerJson( m2mServerJsonOrig );
            Y.doccirrus.https.original.setM2mClientJson( m2mClientJsonOrig );
        } );

        describe( `#verifyPrcPublicCertificate()`, function() {
            it( `Throws error if systemId did not match`, async function() {
                const [err] = await formatPromiseResult(
                    Y.doccirrus.https.original.verifyPrcPublicCertificate( {
                        publicCertificate: prcPublicCertificateStr,
                        systemId: "InvalidSystemId"
                    } )
                );

                should.exist( err );
                err.should.be.an( 'error' );
                err.message.should.equal( `certificateObj.subject.commonName = CIPRCS did not match systemId = InvalidSystemId` );
            } );

            it( `Verifies certificate successfully for valid systemId`, async function() {
                const [err] = await formatPromiseResult(
                    Y.doccirrus.https.original.verifyPrcPublicCertificate( {
                        publicCertificate: prcPublicCertificateStr,
                        systemId: "CIPRCS"
                    } )
                );

                should.not.exist( err );
            } );
        } );

        describe( `#verifyDcprcPublicCertificate()`, function() {
            it( `Throws error for invalid certificate`, async function() {
                const [err] = await formatPromiseResult(
                    Y.doccirrus.https.original.verifyDcprcPublicCertificate( {
                        publicCertificate: prcPublicCertificateStr
                    } )
                );

                should.exist( err );
                err.should.be.an( 'error' );
                err.message.should.equal( `The provided DCPRC public certificate is invalid.` );
            } );

            it( `Verifies valid certificate successfully`, async function() {
                const [err] = await formatPromiseResult(
                    Y.doccirrus.https.original.verifyDcprcPublicCertificate( {
                        publicCertificate: dcprcPublicCertificateStr
                    } )
                );

                should.not.exist( err );
            } );
        } );

        describe( `#getDcprcSignatureAndPublicKey()`, function() {
            it( `Correctly signs the input string and returns Object with signature and public key string`, async function() {
                let
                    err;

                [err, dcprcSignatureResp] = await formatPromiseResult( Y.doccirrus.https.original.getDcprcSignatureAndPublicKey( inputString ) );

                should.not.exist( err );
                should.exist( dcprcSignatureResp );
                dcprcSignatureResp.should.be.an( 'object' );
                dcprcSignatureResp.should.contain.keys( ['dcprcSignature', 'publicCertificate'] );
                dcprcSignatureResp.dcprcSignature.should.be.an( 'string' );
                dcprcSignatureResp.publicCertificate.should.be.an( 'string' );
            } );
        } );

        describe( `#verifySignature()`, function() {
            it( `Correctly verifies signature of dcprc using its public certificate`, function() {
                const isValid = Y.doccirrus.https.original.verifySignature( inputString, dcprcSignatureResp.publicCertificate, dcprcSignatureResp.dcprcSignature );

                should.exist( isValid );
                isValid.should.be.an( 'boolean' );
                isValid.should.be.equal( true );
            } );
        } );

    } );
} );
