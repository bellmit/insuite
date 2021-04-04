import { LocalStorageMock } from '../test/mock/LocalStorageMock';
import { JQueryMock } from '../test/mock/JQueryMock';

describe( 'schema-cache', function() {

    before( async function() {
        global.jQuery = new JQueryMock();

        sinon.stub( global.jQuery, 'ajax' ).yieldsTo( 'success', {} );

        await import( './schema-cache.client.yui' );
        await import( './validator-registry.common.yui' );
    } );

    after( function() {
        Y = null;
        delete global.jQuery;
    } );

    it( 'does not depend on any schema', function() {
        expect( Y.doccirrus.schemas || {}, 'Please see https://confluence.intra.doc-cirrus.com/x/MIA8' ).to.be.empty;
    } );

    it( 'does not depend on any validators', function() {
        expect( Y.doccirrus.validations || {}, 'Please see https://confluence.intra.doc-cirrus.com/x/MIA8' ).to.be.empty;
    } );

    describe( 'Y.doccirrus.schema.Cache', function() {

        context( 'given cache storage with a specific schema version and corresponding validators at run-time', function() {

            beforeEach( function() {
                this.version = '1.0.0';
                this.storage = new LocalStorageMock();
                this.storage.setItem( 'schema:meta:version', JSON.stringify( this.version ) );

                Y.doccirrus.validations = {
                    common: {
                        foo: [
                            { validate: () => false }
                        ]
                    },
                    bar: {
                        baz: [
                            { validate: () => false }
                        ]
                    }
                };

                // this is because we are using just an array for multi validators
                // better would be a dedicated type respectively object structure
                Y.doccirrus.validations.common.foo.__identifier = 'foo';
                Y.doccirrus.validations.bar.baz.__identifier = 'bar.baz';
            } );

            context( 'given schema with type and validator references', function() {

                beforeEach( function() {
                    this.fixture = {
                        foo: {
                            type: [String],
                            i18n: 'foo',
                            validate: Y.doccirrus.validations.common.foo,
                            required: true,
                            default: []
                        },
                        bar: {
                            type: Boolean,
                            i18n: 'bar',
                            enum: [true, false]
                        },
                        baz: {
                            type: Number,
                            default: true
                        },
                        // This could be the result of 'inc' which
                        // represents a list of complex types by
                        // putting the definition into an array
                        // having this leads to unnecessary
                        // complicated implementation since we put
                        // further list related information as custom
                        // property into the array (e.g. i18n labels)
                        // which can't be serialized without converting them.
                        // The better approach is to have an object for
                        // list types at runtime or even better just using a
                        // more mature schema language like JSON schema.
                        qux: [
                            {
                                type: Date,
                                validate: Y.doccirrus.validations.bar.baz,
                                default: Date.now,
                                required: true
                            }
                        ]
                    };
                    this.fixture.qux.i18n = 'qux';
                } );

                describe( '#set()', function() {

                    it( 'serialize given schema', function() {
                        const cache = new Y.doccirrus.schema.Cache( Y.doccirrus.validator.registry, new Y.doccirrus.storage.Cache( this.storage ), '1.0.0' );

                        cache.set( 'foo', this.fixture );

                        expect( this.storage.getItem( 'schema:foo' ) ).to.eql( JSON.stringify( {
                            foo: {
                                type: ['String'],
                                i18n: 'foo',
                                validate: 'foo',
                                required: true,
                                default: []
                            },
                            bar: {
                                type: 'Boolean',
                                i18n: 'bar',
                                enum: { 0: true, 1: false }
                            },
                            baz: {
                                type: 'Number',
                                default: true
                            },
                            qux: {
                                0: {
                                    type: 'Date',
                                    validate: 'bar.baz',
                                    default: 'now',
                                    required: true
                                },
                                i18n: 'qux'
                            }
                        } ) );
                    } );
                } );
            } );

            context( 'given cache storage with serialized schemas having valid type and validator references', function() {

                beforeEach( function() {
                    this.storage.setItem( 'schema:foo', JSON.stringify( {
                        foo: {
                            type: ['String'],
                            i18n: 'foo',
                            required: true,
                            default: []
                        },
                        bar: {
                            type: 'Boolean',
                            i18n: 'bar',
                            validate: 'bar.baz',
                            enum: [true, false]
                        },
                        baz: {
                            type: 'Number',
                            default: true
                        },
                        // This could be the result of 'inc' which
                        // represents a list of complex types by
                        // putting the definition into an array
                        // having this leads to unnecessary
                        // complicated implementation since we put
                        // further list related information as custom
                        // property into the array which can't be
                        // serialized without converting them.
                        // The better approach is to have an object for
                        // list types at runtimeor even better just using a
                        // more mature schema language like JSON schema.
                        qux: {
                            0: {
                                type: 'Date',
                                validate: 'foo',
                                required: true,
                                default: 'now',
                                foo: null
                            },
                            i18n: 'qux'
                        }
                    } ) );

                    this.storage.setItem( 'schema:bar', JSON.stringify( {
                        bar: {
                            type: 'Boolean',
                            i18n: 'bar',
                            validate: 'bar.baz',
                            enum: [true, false]
                        }
                    } ) );
                } );

                describe( '#constructor()', function() {

                    context( 'with given storage and different schema version', function() {

                        it( 'clears the storage', function() {
                            const cache = new Y.doccirrus.schema.Cache( Y.doccirrus.validator.registry, new Y.doccirrus.storage.Cache( this.storage ), '1.0.1' );

                            expect( this.storage.length ).to.equal( 1 );
                        } );
                    } );

                    context( 'with given storage and same schema version', function() {

                        it( 'keeps the storage', function() {
                            const cache = new Y.doccirrus.schema.Cache( Y.doccirrus.validator.registry, new Y.doccirrus.storage.Cache( this.storage ), '1.0.0' );

                            expect( this.storage.length ).to.equal( 3 );
                        } );
                    } );
                } );

                describe( '#get()', function() {

                    it( 'restores given schema', function() {
                        const cache = new Y.doccirrus.schema.Cache( Y.doccirrus.validator.registry, new Y.doccirrus.storage.Cache( this.storage ), '1.0.0' );

                        expect( cache.get( 'foo' ) ).to.eql( {
                            foo: {
                                type: ['String'],
                                i18n: 'foo',
                                required: true,
                                default: []
                            },
                            bar: {
                                type: 'Boolean',
                                i18n: 'bar',
                                enum: [true, false],
                                validate: Y.doccirrus.validations.bar.baz
                            },
                            baz: {
                                type: 'Number',
                                default: true
                            },
                            qux: [
                                {
                                    type: 'Date',
                                    required: true,
                                    validate: Y.doccirrus.validations.common.foo,
                                    default: Date.now,
                                    foo: null
                                }
                            ]
                        } );
                    } );
                } );

                describe( '#has()', function() {

                    it( 'returns true for the given schema', function() {
                        const cache = new Y.doccirrus.schema.Cache( Y.doccirrus.validator.registry, new Y.doccirrus.storage.Cache( this.storage ), '1.0.0' );

                        expect( cache.has( 'foo' ) ).to.be.true;
                    } );
                } );
            } );
        } );
    } );
} );
