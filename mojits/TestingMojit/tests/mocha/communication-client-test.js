/**
 * User: pi
 * Date: 10/03/16  15:25
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */
/*global Y, should, describe, it*/

const
    mochaUtils = require( '../../server/mochaUtils' )( Y );

let
    collection = 'testCollection',
    documentId = 'testDocumentId';

function resultObjectCheck( result, withCollection, withDocumentId ) {
    should.exist( result );
    result.should.be.an( 'object' );
    should.exist( result.listener );
    result.listener.should.be.a( 'function' );
    should.exist( result.removeEventListener );
    result.removeEventListener.should.be.a( 'function' );
    result.handlerId.should.be.a( 'string' );
    if( withCollection ) {
        result.collection.should.be.a( 'string' ).which.equals( collection );
    }

    if( withDocumentId ) {
        result.documentId.should.be.a( 'string' ).which.equals( documentId );
    }
}

function getFakeEvent( socket ) {
    return {
        event: 'test',
        handlerId: (new require( 'mongoose' ).Types.ObjectId()).toString(),
        collection: collection,
        documentId: documentId,
        socket
    };
}

describe( '1. Check communication.client.js', function() {
    let
        tmpFilePath,
        communication,
        fakeSocket = {
            on() {
            },
            once() {
            },
            emit() {
            }
        };
    it( '1.1. File should be required', function( done ) {
        tmpFilePath = mochaUtils.requireClientScript( {
            filename: 'autoload/communications/communication.client.js'
        }, function( err, _communication ) {
            should.not.exist( err );
            communication = _communication;
            should.exist( communication );
            communication.socket = fakeSocket;
            done();
        } );
    } );

    it( '1.2. fake socket should be set', function() {
        should.exist( communication.socket );
        communication.socket.should.be.an( 'object' );
        communication.socket.on.should.be.an( 'function' );
        communication.socket.once.should.be.an( 'function' );
        communication.socket.emit.should.be.an( 'function' );

    } );

    it( '1.3. communication.on/once should be a function', function() {
        communication.on.should.be.a( 'function' );
        communication.once.should.be.a( 'function' );
    } );

    it( '1.4. communication.on/once should return object', function() {
        var
            onResult,
            onceResult;
        onResult = communication.on( getFakeEvent( fakeSocket ) );
        resultObjectCheck( onResult );
        onceResult = communication.once( getFakeEvent( fakeSocket ) );
        resultObjectCheck( onceResult );
    } );

    it( '1.5. communication.subscribeCollection/subscribeCollectionId should be a function', function() {
        communication.subscribeCollection.should.be.a( 'function' );
        communication.subscribeCollectionId.should.be.a( 'function' );
    } );

    it( '1.6. communication.on/once should return object', function() {
        var
            onResult,
            onceResult;
        onResult = communication.subscribeCollection( getFakeEvent( fakeSocket ) );
        resultObjectCheck( onResult, true );
        onceResult = communication.subscribeCollectionId( getFakeEvent( fakeSocket ) );
        resultObjectCheck( onceResult, true, true );
    } );

    it( '1.7. File should be removed', function( done ) {
        let

            fs = require( 'fs' );
        fs.unlink( tmpFilePath, function( err ) {
            should.not.exist( err );
            done();
        } );
    } );
} );



