import { LocalStorageMock } from '../test/mock/LocalStorageMock';

describe( 'storage-cache', function() {

    before( async function() {
        await import( './storage-cache.client.yui' );
    } );

    after( function() {
        Y = null;
    } );

    describe( 'Y.doccirrus.storage.Cache', function() {

        context( 'given storage cache using local storage having three entries having the same prefix and two with different prefixes', function() {

            beforeEach( function() {
                this.storage = new LocalStorageMock();
                this.storage.setItem( 'foo:bar', '"bar"' );
                this.storage.setItem( 'foo:baz', '"baz"' );
                this.storage.setItem( 'foo:qux', '"qux"' );
                this.storage.setItem( 'bar:foo', '"foo"' );
                this.storage.setItem( 'baz:bar', '"bar"' );

                this.cache = new Y.doccirrus.storage.Cache( this.storage );
            } );

            describe( '#has()', function() {

                context( 'with existing key as string', function() {
                    it( 'returns true', function() {
                        expect( this.cache.has( 'foo:qux' ) ).to.equal( true );
                    } );
                } );

                context( 'with non existing key as string', function() {
                    it( 'returns false', function() {
                        expect( this.cache.has( 'foo:foo' ) ).to.equal( false );
                    } );
                } );

                context( 'with any keys as regular expression', function() {
                    it( 'throws an error', function() {
                        expect( () => this.cache.has( /^foo.*/ ) ).to.throw();
                    } );
                } );

                context( 'with any keys as non string', function() {
                    it( 'throws an error', function() {
                        expect( () => this.cache.has( 123 ) ).to.throw();
                    } );
                } );
            } );

            describe( '#get()', function() {

                context( 'with existing key as string', function() {
                    it( 'returns the corresponding value', function() {
                        expect( this.cache.get( 'bar:foo' ) ).to.equal( 'foo' );
                    } );
                } );

                context( 'with non existing key as string', function() {
                    it( 'returns false', function() {
                        expect( this.cache.get( 'qux:foo' ) ).to.equal( null );
                    } );
                } );

                context( 'with any keys as regular expression', function() {
                    it( 'throws an error', function() {
                        expect( () => this.cache.has( /^foo.*/ ) ).to.throw();
                    } );
                } );

                context( 'with any keys as non string', function() {
                    it( 'throws an error', function() {
                        expect( () => this.cache.has( true ) ).to.throw();
                    } );
                } );
            } );

            describe( '#set()', function() {

                context( 'with existing key as string and a string value', function() {
                    it( 'overrides the existing value', function() {
                        this.cache.set( 'bar:foo', 'baz' );

                        expect( this.storage.length ).to.equal( 5 );
                        expect( this.storage.getItem( 'bar:foo' ) ).to.equal( JSON.stringify( 'baz' ) );
                    } );
                } );

                context( 'with existing key as string and a non string value', function() {
                    it( 'overrides the existing value', function() {
                        const value = { bar: 'baz', foo: true, qux: { baz: 123 } };

                        this.cache.set( 'foo:qux', value );

                        expect( this.storage.length ).to.equal( 5 );
                        expect( this.storage.getItem( 'foo:qux' ) ).to.equal( JSON.stringify( value ) );
                    } );
                } );

                context( 'with non existing key as string and a string value', function() {
                    it( 'adds a new entry using the given key', function() {
                        this.cache.set( 'qux:foo', 'corge' );

                        expect( this.storage.length ).to.equal( 6 );
                        expect( this.storage.getItem( 'qux:foo' ) ).to.equal( JSON.stringify( 'corge' ) );
                    } );
                } );

                context( 'with non existing key as string and a non string value', function() {
                    it( 'adds a new entry using the given key', function() {
                        this.cache.set( 'qux:foo', false );

                        expect( this.storage.length ).to.equal( 6 );
                        expect( this.storage.getItem( 'qux:foo' ) ).to.equal( JSON.stringify( false ) );
                    } );
                } );

                context( 'with any keys as regular expression', function() {
                    it( 'throws an error', function() {
                        expect( () => this.cache.set( /^foo.*/, 'foo' ) ).to.throw();
                    } );
                } );

                context( 'with any keys as non string', function() {
                    it( 'throws an error', function() {
                        expect( () => this.cache.set( true, false ) ).to.throw();
                    } );
                } );
            } );

            describe( '#remove()', function() {

                context( 'with existing key as string', function() {
                    it( 'removes the matching entry', function() {
                        this.cache.remove( 'foo:baz' );

                        expect( this.storage.length ).to.equal( 4 );
                        expect( this.storage.getItem( 'foo:baz' ) ).to.equal( null );
                    } );
                } );

                context( 'with non existing key as string', function() {
                    it( 'keeps all entries', function() {
                        this.cache.remove( 'qux:foo' );

                        expect( this.storage.length ).to.equal( 5 );
                    } );
                } );

                context( 'with existing keys as regular expression', function() {
                    it( 'removes all matching entries', function() {
                        this.cache.remove( /^foo.*/ );

                        expect( this.storage.length ).to.equal( 2 );
                        expect( this.storage.getItem( 'bar:foo' ) ).to.not.equal( null );
                        expect( this.storage.getItem( 'baz:bar' ) ).to.not.equal( null );
                    } );
                } );

                context( 'with non existing keys as regular expression', function() {
                    it( 'keeps all entries', function() {
                        this.cache.remove( /^qux.*/ );

                        expect( this.storage.length ).to.equal( 5 );
                    } );
                } );
            } );
        } );

        context( 'given storage cache using local storage having faulty entries', function() {

            beforeEach( function() {
                this.storage = new LocalStorageMock();
                this.storage.setItem( 'foo:bar', '"bar"' );
                this.storage.setItem( 'foo:baz', '*&$^%*W($&%^' );

                this.cache = new Y.doccirrus.storage.Cache( this.storage );
            } );

            describe( '#get()', function() {

                context( 'with key of faulty entry', function() {
                    it( 'throws an error', function() {
                        expect( () => this.cache.get( 'foo:baz' ) ).to.throw();
                    } );
                } );

                context( 'with key of valid entry', function() {
                    it( 'returns the value', function() {
                        expect( this.cache.get( 'foo:bar' ) ).to.equal( 'bar' );
                    } );
                } );
            } );

            describe( '#set()', function() {

                context( 'with key of faulty entry', function() {
                    it( 'overrides the faulty entry', function() {
                        this.cache.set( 'foo:baz', 'baz' );

                        expect( this.storage.length ).to.equal( 2 );
                        expect( this.storage.getItem( 'foo:baz' ) ).to.equal( JSON.stringify( 'baz' ) );
                    } );
                } );

                context( 'with key of valid entry', function() {
                    it( 'overrides the valid entry', function() {
                        this.cache.set( 'foo:bar', 'baz' );

                        expect( this.storage.length ).to.equal( 2 );
                        expect( this.storage.getItem( 'foo:bar' ) ).to.equal( JSON.stringify( 'baz' ) );
                    } );
                } );
            } );

            describe( '#has()', function() {

                context( 'with key of faulty entry', function() {
                    it( 'return true', function() {
                        expect( this.cache.has( 'foo:baz' ) ).to.equal( true );
                    } );
                } );

                context( 'with key of valid entry', function() {
                    it( 'returns true', function() {
                        expect( this.cache.has( 'foo:bar' ) ).to.equal( true );
                    } );
                } );

                context( 'with non existing key', function() {
                    it( 'returns false', function() {
                        expect( this.cache.has( 'foo:qux' ) ).to.equal( false );
                    } );
                } );
            } );

            describe( '#remove()', function() {

                context( 'with key of faulty entry', function() {
                    it( 'removes the faulty entry', function() {
                        this.cache.remove( 'foo:baz' );

                        expect( this.storage.length ).to.equal( 1 );
                        expect( this.storage.getItem( 'foo:baz' ) ).to.equal( null );
                    } );
                } );

                context( 'with key of valid entry', function() {
                    it( 'removes the valid entry', function() {
                        this.cache.remove( 'foo:bar' );

                        expect( this.storage.length ).to.equal( 1 );
                        expect( this.storage.getItem( 'foo:bar' ) ).to.equal( null );
                    } );
                } );
            } );
        } );
    } );
} );
