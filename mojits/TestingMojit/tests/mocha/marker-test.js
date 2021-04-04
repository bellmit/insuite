/*global Y, should, it, describe */

const
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    {formatPromiseResult} = require( 'dc-core' ).utils,
    user = Y.doccirrus.auth.getSUForLocal();

describe( 'Test default markers creation', function() {
    describe( '0. Setup', () => {
        it( 'Cleans db', function( done ) {
            this.timeout( 20000 );
            mochaUtils.cleanDB( {user}, err => {
                should.not.exist( err );
                done();
            } );
        } );
    } );
    describe( '1. Test inserting of default markers', function() {
        let
            markerToDelete;
        it( 'Check if marker collection is empty', async () => {
            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'marker',
                    action: 'count',
                    query: {}
                } )
            );
            should.not.exist( err );
            should.exist( result );
            result.should.equal( 0 );
        } );
        it( 'Execute checkMarkersCollection of marker-api', async () => {
            await Y.doccirrus.api.marker.checkMarkersCollection( user ).should.be.fulfilled;
        } );
        it( 'Check if marker collection has default markers', async () => {
            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'marker',
                    action: 'get'
                } )
            );
            should.not.exist( err );
            should.exist( result );
            result.should.be.an( 'array' ).which.has.lengthOf( 16 );
            markerToDelete = result[0];
        } );
        it( 'Delete one marker', async () => {
            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'marker',
                    action: 'delete',
                    query: {_id: markerToDelete._id}
                } )
            );
            should.not.exist( err );
            should.exist( result );
        } );
        it( 'Execute checkMarkersCollection of marker-api again', async () => {
            await Y.doccirrus.api.marker.checkMarkersCollection( user ).should.be.fulfilled;
        } );
        it( 'Check if marker collection still have all default markers except the deleted one', async () => {
            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'marker',
                    action: 'count'
                } )
            );
            should.not.exist( err );
            should.exist( result );
            result.should.equal( 15 );
        } );
    } );
} );