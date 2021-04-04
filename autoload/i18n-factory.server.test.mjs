describe( 'i18n-factory', function() {

    before( async function() {
        await import( './i18n-factory.server.yui' );
    } );

    context( 'given non global language configured', function() {

        beforeEach( function() {
            Y.config.lang = undefined;
        } );

        describe( '#createTranslator()', function() {

            it( 'throws', function() {
                expect( () => Y.doccirrus.intl.createTranslator.call( { name: 'foo', details: { lang: ['de', 'de-CH', undefined] } } ) ).to.throw();
            } );
        } );
    } );

    context( 'given a global language configured', function() {

        beforeEach( function() {
            Y.config.lang = 'de';
        } );

        describe( '#createTranslator()', function() {

            it( 'returns i18n function for a given module having matching language resources', function() {
                const i18n = Y.doccirrus.intl.createTranslator.call( { name: 'foo', details: { lang: ['de', 'de-CH'] } } );

                expect( i18n ).to.be.a( 'function' );
                expect( i18n.language ).to.equal( 'de' );
            } );

            it( 'throws for a given module having no matching language resources', function() {
                expect( () => Y.doccirrus.intl.createTranslator.call( { name: 'foo', details: { lang: ['en', 'en-US'] } } ) ).to.throw();
            } );
        } );

        describe( 'i18n', function() {

            beforeEach( function() {
                this.i18n = Y.doccirrus.intl.createTranslator.call( { name: 'bar', details: { lang: ['de', 'de-CH'] } } );
            } );

            describe( '#language', function() {

                it( 'returns configured language', function() {
                    expect( this.i18n.language ).to.equal( Y.config.lang );
                } );

                it( 'returns language set before', function() {
                    this.i18n.language = 'de-CH';

                    expect( this.i18n.language ).to.equal( 'de-CH' );
                } );

                it( 'changes current language for all instances of the same module', function() {
                    const i18n = Y.doccirrus.intl.createTranslator.call( { name: 'bar', details: { lang: ['de', 'de-CH'] } } );

                    this.i18n.language = 'de-CH';

                    expect( i18n.language ).to.equal( 'de-CH' );
                    expect( this.i18n.language ).to.equal( 'de-CH' );
                } );

                it( 'changes not current language for instances of other modules', function() {
                    const i18n = Y.doccirrus.intl.createTranslator.call( { name: 'foo', details: { lang: ['de', 'de-CH'] } } );

                    i18n.language = 'de-CH';

                    expect( i18n.language ).to.equal( 'de-CH' );
                    expect( this.i18n.language ).to.equal( 'de' );
                } );
            } );
        } );
    } );
} );
