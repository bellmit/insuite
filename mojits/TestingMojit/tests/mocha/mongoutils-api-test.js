/**
 * Created by mp on 04.12.15.
 */


/*global Y, describe, should, it*/

describe.only( 'testing mongoutils', function() {

    this.timeout( 60 * 60 * 60 * 100 );

    var
        sourceTenantId = '0',
        targetTenantId = '99997654';

    it( 'activate tenant demo', function( done ) {
        Y.doccirrus.mongoutils.dump( null, sourceTenantId, function( err ) {
            should.not.exist( err );
            Y.doccirrus.mongoutils.restore( null, targetTenantId, sourceTenantId, null, function( err ) {
                should.not.exist( err );
                done();
            });
        } );
    });

    it('dump db', function( done ) {
        Y.doccirrus.mongoutils.dump( null, sourceTenantId, function( err ) {
            should.not.exist(err);
            done();
        });
    });

    it('restore db', function( done ) {
        Y.doccirrus.mongoutils.restore( null, targetTenantId, sourceTenantId, null, function( err ) {
            should.not.exist( err );
            done();
        });
    });

    it('dump catalog', function( done ) {
        Y.doccirrus.mongoutils.dump( 'catalogs', '0', function( err ){
            should.not.exist( err );
            done();
        } );
    });

    it('restore catalog', function( done ) {
        Y.doccirrus.mongoutils.restore( 'catalogs', targetTenantId, '0', Y.doccirrus.auth.getTmpDir() + '/dbdump/0/catalogs.bson', function( err ){
            should.not.exist( err );
            done();
        });
    });

    //it('test catalog count target tenant', function( done ) {
    //
    //    Y.doccirrus.mongodb.runDb( {
    //        user: localDBUser,
    //        db: targetTenantId + '0',
    //        model: 'catalog',
    //        action: 'count'
    //    }, function( err, result ) {
    //        should.not.exist( err );
    //        should.exist( result );
    //        expect( result ).to.equal( countCatalogs );
    //        done();
    //    });
    //});



} );

