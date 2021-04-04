import sinon from 'sinon';

describe( 'i18n', function() {

    before( async function() {
        await import( './i18n.common.yui' );
    } );

    after( function() {
        Y = null;
    } );

    context( 'given a in-memory backend for i18n and a namespace', function() {

        beforeEach( function() {
            this.namespace = 'bar';
            this.backend = sinon.spy( ( namespace, language, callback ) => {
                const labels = {
                    'en': { foo: 'bar' },
                    'en-US': { bar: 'baz', qux: 'baz {foo} bar', baz: { qux: 'bar' } }
                };

                callback( labels[language] );
            } );

            // update to @dc/yui-loader 2.0.0 and implement reset `Y` correctly

            const labels = Y.Intl._mod( this.namespace );

            for ( const language of Object.keys( labels ) ) {
                delete labels[language];
            }
        } );

        describe( '#constructor()', function() {

            it( 'creates a new instance with a namespace, language and backend', function() {
                expect( new Y.doccirrus.intl.I18n( 'bar', 'en', this.backend ) ).instanceOf( Y.doccirrus.intl.I18n );
            } );

            it( 'fetches labels from the backend for the given language', function() {
                const candidate = new Y.doccirrus.intl.I18n( 'bar', 'en', this.backend );

                expect( this.backend.callCount ).to.equal( 1 );
                expect( this.backend.args[0][0] ).to.equal( 'bar' );
                expect( this.backend.args[0][1] ).to.equal( 'en' );
                expect( this.backend.args[0][2] ).instanceOf( Function );
            } );

            it( 'throws when a namespace, a language or a backend is missing', function() {
                expect( () => new Y.doccirrus.intl.I18n( ) ).to.throw();
                expect( () => new Y.doccirrus.intl.I18n( 'bar', undefined, this.backend ) ).to.throw();
                expect( () => new Y.doccirrus.intl.I18n( undefined, 'de', this.backend ) ).to.throw();
                expect( () => new Y.doccirrus.intl.I18n( 'baz', 'en' ) ).to.throw();
            } );
        } );

        context( 'given an i18n instance with an in-memory backend a namespace and a language', function() {

            beforeEach( function() {
                this.candidate = new Y.doccirrus.intl.I18n( 'bar', 'en-US', this.backend );
            } );

            describe( '#load()', function() {

                it( 'does not use the backend if the language is already loaded', function() {
                    this.candidate.load( 'en-US' );

                    expect( this.backend.callCount ).to.equal( 1 );
                } );

                it( 'does use the backend if the language is not loaded yet', function() {
                    this.candidate.load( 'en' );

                    expect( this.backend.callCount ).to.equal( 2 );
                    expect( this.backend.args[1][0] ).to.equal( 'bar' );
                    expect( this.backend.args[1][1] ).to.equal( 'en' );
                    expect( this.backend.args[1][2] ).instanceOf( Function );
                } );
            } );

            describe( '#language', function() {

                it( 'returns the current language', function() {
                    expect( this.candidate.language ).to.equal( 'en-US' );
                } );

                it( 'changes the current language and calls the backend if needed', function() {
                    this.candidate.language = 'en';

                    expect( this.backend.callCount ).to.equal( 2 );
                    expect( this.backend.args[1][0] ).to.equal( 'bar' );
                    expect( this.backend.args[1][1] ).to.equal( 'en' );
                    expect( this.backend.args[1][2] ).instanceOf( Function );

                    expect( this.candidate.language ).to.equal( 'en' );
                } );
            } );

            describe( '#translate()', function() {

                it( 'returns label for the given simple path and current language', function() {
                    expect( this.candidate.translate( 'bar' ) ).to.equal( 'baz' );
                } );

                it( 'returns label for the given nested path and current language', function() {
                    expect( this.candidate.translate( 'baz.qux' ) ).to.equal( 'bar' );
                } );

                it( 'returns dynamic label for the given nested path and data and current language', function() {
                    expect( this.candidate.translate( 'qux', { foo: 'foo' } ) ).to.equal( 'baz foo bar' );
                } );
            } );

            describe( '.wrap()', function() {

                it( 'returns i18n wrapper function for easy usage', function() {
                    const wrapper = Y.doccirrus.intl.I18n.wrap( this.candidate );

                    expect( wrapper ).instanceOf( Function );
                    expect( wrapper( 'qux', { data: { foo: 'baz' } } ) ).to.equal( 'baz baz bar' );
                    expect( wrapper.language ).to.equal( 'en-US' );
                } );
            } );
        } );
    } );
} );
