/**
 * User: pi
 * Date: 10/03/16  15:25
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */
/*global Y, should, describe, it*/
/**
 * TURN OFF VPRC!!! before run these tests.
 * PUC should be online
 */

describe( '1. Test socket connection', function() {
    describe( '1.0. wait for PUC connect', function() {
        it( 'sets onPUCConnection event listener', function( done ) {
            this.timeout( 90000 );
            Y.doccirrus.communication.onPUCConnection( true, () => {
                done();
            } );
        } );
    } );
    describe( '1.1. Check error handling', function() {
        let
            err, data;
        it( 'sends test action call to PUC with error', function( done ) {
            Y.doccirrus.communication.callPUCAction( {
                action: 'echo',
                params: {
                    data: {
                        a: 'a',
                        b: 3
                    },
                    error: new Y.doccirrus.commonerrors.DCError( 123098, { message: 'aaaaaaaaa' } )
                }
            }, ( _err, _data ) => {
                err = _err;
                data = _data;
                done();
            } );
        } );
        it( 'checks error', () => {
            should.exist( err );
            err.should.be.an( 'object' );
            err.code.should.equal( 123098 );
            err.message.should.equal( 'aaaaaaaaa' );
        } );
        it( 'checks data', () => {
            should.not.exist( data );
        } );
    } );
    describe( '1.2. Check success response', function() {
        let
            err, data;
        it( 'sends test action call to PUC without error', function( done ) {
            Y.doccirrus.communication.callPUCAction( {
                action: 'echo',
                params: {
                    data: {
                        a: 'a',
                        b: 3
                    }
                }
            }, ( _err, _data ) => {
                err = _err;
                data = _data;
                done();
            } );
        } );
        it( 'checks error', () => {
            should.not.exist( err );
        } );
        it( 'checks data', () => {
            should.exist( data );
            data.should.be.an( 'object' );
            data.a.should.equal( 'a' );
            data.b.should.equal( 3 );
        } );
    } );
    describe( '1.2. Check existing action', function() {
        it( 'sets delay 15000 to allow tenants register on PUC', function( done ) {
            this.timeout( 16000 );
            setTimeout( done, 15000 );
        } );
        it( 'sends getOnlineSystemList action call to PUC', function( done ) {
            Y.doccirrus.communication.callPUCAction( {
                action: 'getOnlineSystemList'
            }, ( err, data ) => {
                should.not.exist( err );
                should.exist( data );
                data.should.be.an( 'array' );
                done();
            } );
        } );
    } );
} );
