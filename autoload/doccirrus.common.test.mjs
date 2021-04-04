describe( 'doccirrus', function() {

    before( async function() {
        await import( './doccirrus.common.yui' );
    } );

    describe( '# Y.doccirrus', function() {
        it( 'is an object', function() {
            expect( Y.doccirrus ).to.be.an( 'object' );
        } );
        it( 'has own properties', function() {
            this.ownPropertyNames = Object.getOwnPropertyNames( Y.doccirrus );
            expect( this.ownPropertyNames ).to.deep.equal( ['intl', 'i18n'] );
        } );
        it( 'has standard prototypal properties', function() {
            this.prototypePropertyNames = Object.getOwnPropertyNames( Object.getPrototypeOf( Y.doccirrus ) );
            expect( this.prototypePropertyNames.length ).to.be.above( 0 );
        } );
    } );
} );
