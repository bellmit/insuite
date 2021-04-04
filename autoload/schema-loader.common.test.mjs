describe( 'schema-loader', function() {

    before( async function() {
        await import( './schema-loader.common.yui' );

        this.now = new Date();
    } );

    after( function() {
        Y = null;
    } );

    beforeEach( function() {
        Y.doccirrus.schemas = {};
    } );

    afterEach( function() {
        delete Y.doccirrus.schemas;
    } );

    describe( 'Y.doccirrus.schemaloader', function() {

        it( 'does not depend on any schema', function() {
            expect( Y.doccirrus.schemas || {}, 'Please see https://confluence.intra.doc-cirrus.com/x/MIA8' ).to.be.empty;
        } );

        context( 'given schema of a scalar type', function() {

            beforeEach( function() {
                this.fixture = {};

                Object.assign( this.fixture, {
                    name: 'foo',
                    types: {
                        root: {
                            type: String,
                            default: 'bar',
                            required: true,
                            list: [
                                { val: 'qux', i18n: 'bar' },
                                { val: 'foo', i18n: 'baz' }
                            ]
                        }
                    }
                } );
            } );

            describe( '.mixSchema()', function() {

                it( 'throws since this does not make sense in all cases', function() {
                    expect( () => Y.doccirrus.schemaloader.mixSchema( this.fixture ) ).to.throw( Error );
                } );
            } );
        } );

        context( 'given schema with scalar properties', function() {

            beforeEach( function() {
                this.fixture = {};

                Object.assign( this.fixture, {
                    name: 'foo',
                    types: {
                        root: {
                            foo: {
                                type: String,
                                default: 'bar',
                                required: true
                            },
                            bar: {
                                type: Number,
                                i18n: 'bar',
                                required: true
                            },
                            baz: {
                                type: Date,
                                i18n: 'baz',
                                default: this.now
                            },
                            qux: {
                                type: Boolean,
                                i18n: 'qux',
                                required: true
                            },
                            waldo: {
                                type: [Boolean],
                                i18n: 'waldo',
                                default: [false]
                            }
                        }
                    }
                } );
            } );

            describe( '.mixSchema()', function() {

                it( 'sets schema and transform enumeration values', function() {

                    Y.doccirrus.schemaloader.mixSchema( this.fixture );

                    expect( this.fixture.schema ).to.eql( {
                        foo: {
                            type: String,
                            default: 'bar',
                            required: true
                        },
                        bar: {
                            type: Number,
                            i18n: 'bar',
                            required: true
                        },
                        baz: {
                            type: Date,
                            i18n: 'baz',
                            default: this.now
                        },
                        qux: {
                            type: Boolean,
                            i18n: 'qux',
                            required: true
                        },
                        waldo: {
                            type: [Boolean],
                            i18n: 'waldo',
                            default: [false]
                        }
                    } );
                } );
            } );
        } );

        context( 'given schema with library of scalar types used by the root type', function() {

            beforeEach( function() {
                this.fixture = {};

                Object.assign( this.fixture, {
                    name: 'baz',
                    types: {
                        root: {
                            foo: {
                                complex: 'eq',
                                type: 'FOO',
                                lib: this.fixture
                            },
                            bar: {
                                complex: 'eq',
                                type: 'BAR',
                                lib: this.fixture
                            }
                        },
                        FOO: {
                            type: [String],
                            i18n: 'foo',
                            required: true,
                            default: []
                        },
                        BAR: {
                            type: Boolean,
                            i18n: 'bar',
                            list: [
                                { val: true, i18n: 'bar' },
                                { val: false, i18n: 'baz' }
                            ]
                        }
                    }
                } );
            } );

            describe( '.mixSchema()', function() {

                it( 'mixes in the referenced types', function() {

                    Y.doccirrus.schemaloader.mixSchema( this.fixture );

                    expect( this.fixture.schema ).to.eql( {
                        foo: {
                            type: [String],
                            i18n: 'foo',
                            required: true,
                            default: []
                        },
                        bar: {
                            type: Boolean,
                            i18n: 'bar',
                            enum: [true, false]
                        }
                    } );
                } );
            } );
        } );

        context( 'given schema with library of complex types used by the root type', function() {

            beforeEach( function() {
                this.fixture = {};

                Object.assign( this.fixture, {
                    name: 'baz',
                    types: {
                        root: {
                            base: {
                                complex: 'ext',
                                type: 'BAR',
                                lib: this.fixture
                            },
                            foo: {
                                complex: 'eq',
                                type: 'FOO',
                                lib: this.fixture
                            },
                            bar: {
                                complex: 'inc',
                                type: 'BAR',
                                lib: this.fixture
                            }
                        },
                        BAR: {
                            baz: {
                                type: Date,
                                i18n: 'baz',
                                default: this.now,
                                required: true
                            }
                        },
                        FOO: {
                            bar: {
                                type: 'Any',
                                i18n: 'baz',
                                default: null,
                                required: true
                            }
                        }
                    }
                } );
            } );

            describe( '.mixSchema()', function() {

                it( 'mixes in the referenced types', function() {

                    Y.doccirrus.schemaloader.mixSchema( this.fixture );

                    expect( this.fixture.schema ).to.eql( {
                        baz: {
                            type: Date,
                            i18n: 'baz',
                            default: this.now,
                            required: true
                        },
                        foo: {
                            bar: {
                                type: 'Any',
                                i18n: 'baz',
                                default: null,
                                required: true
                            }
                        },
                        bar: [
                            {
                                baz: {
                                    type: Date,
                                    i18n: 'baz',
                                    default: this.now,
                                    required: true
                                }
                            }
                        ]
                    } );
                } );
            } );
        } );

        context( 'given schema with root type using types of other schemas', function() {

            beforeEach( function() {
                this.fixture = {};

                Object.assign( this.fixture, {
                    name: 'baz',
                    types: {
                        root: {
                            base: {
                                complex: 'ext',
                                type: 'BAR',
                                lib: 'foo'
                            },
                            foo: {
                                complex: 'eq',
                                type: 'FOO',
                                lib: 'foo'
                            },
                            qux: {
                                complex: 'inc',
                                type: 'QUX',
                                lib: 'foo'
                            }
                        }
                    }
                } );

                Y.doccirrus.schemas.foo = {};

                Object.assign( Y.doccirrus.schemas.foo, {
                    name: 'foo',
                    types: {
                        root: {
                            base: {
                                complex: 'eq',
                                type: 'FOO',
                                lib: 'foo'
                            }
                        },
                        FOO: {
                            type: String,
                            i18n: 'foo',
                            default: 'bar',
                            required: true,
                            list: [
                                { val: 'qux', i18n: 'bar' },
                                { val: 'foo', i18n: 'baz' }
                            ]
                        },
                        BAR: {
                            baz: {
                                type: Date,
                                i18n: 'baz',
                                default: Date.now,
                                required: true
                            }
                        },
                        QUX: {
                            foo: {
                                type: ['Any'],
                                i18n: 'qux',
                                default: {}
                            }
                        }
                    }
                } );
            } );

            afterEach( function() {
                delete Y.doccirrus.schemas.foo;
            } );

            describe( '.mixSchema()', function() {

                it( 'mixes in the referenced types', function() {

                    Y.doccirrus.schemaloader.mixSchema( this.fixture );

                    expect( this.fixture.schema ).to.eql( {
                        baz: {
                            type: Date,
                            i18n: 'baz',
                            default: Date.now,
                            required: true
                        },
                        foo: {
                            type: String,
                            i18n: 'foo',
                            default: 'bar',
                            required: true,
                            enum: [
                                'qux',
                                'foo'
                            ]
                        },
                        qux: [
                            {
                                foo: {
                                    type: ['Any'],
                                    i18n: 'qux',
                                    default: {}
                                }
                            }
                        ]
                    } );
                } );
            } );
        } );

        context( 'given validators', function() {

            beforeEach( function() {
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
            } );

            afterEach( function() {
                delete Y.doccirrus.validations;
            } );

            context( 'given schema with valid validator references', function() {

                beforeEach( function() {
                    this.fixture = {};

                    Object.assign( this.fixture, {
                        name: 'baz',
                        types: {
                            root: {
                                base: {
                                    complex: 'ext',
                                    type: 'BAR',
                                    lib: this.fixture
                                }
                            },
                            BAR: {
                                baz: {
                                    type: Boolean,
                                    i18n: 'baz',
                                    default: 1,
                                    required: true,
                                    validate: 'foo'
                                },
                                qux: {
                                    complex: 'eq',
                                    type: 'FOO',
                                    lib: this.fixture
                                }
                            },
                            FOO: {
                                type: [Number],
                                i18n: 'foo',
                                default: 'bar',
                                validate: 'bar.baz'
                            }
                        }
                    } );
                } );

                describe( '.mixSchema()', function() {

                    it( 'replaces reference with corresponding validators', function() {
                        Y.doccirrus.schemaloader.mixSchema( this.fixture );

                        expect( this.fixture.schema.baz.validate ).to.eql( Y.doccirrus.validations.common.foo );
                        expect( this.fixture.schema.qux.validate ).to.eql( Y.doccirrus.validations.bar.baz );
                    } );
                } );
            } );

            context( 'given schema with invalid validator references', function() {

                beforeEach( function() {
                    this.fixture = {};

                    Object.assign( this.fixture, {
                        name: 'baz',
                        types: {
                            root: {
                                base: {
                                    complex: 'ext',
                                    type: 'BAR',
                                    lib: this.fixture
                                }
                            },
                            BAR: {
                                baz: {
                                    type: Boolean,
                                    i18n: 'baz',
                                    default: 1,
                                    required: true,
                                    validate: 'bar'
                                },
                                qux: {
                                    complex: 'eq',
                                    type: 'FOO',
                                    lib: this.fixture
                                }
                            },
                            FOO: {
                                type: [Number],
                                i18n: 'foo',
                                default: 'bar',
                                validate: 'foo.baz'
                            }
                        }
                    } );
                } );

                describe( '.mixSchema()', function() {

                    it( 'throws an error', function() {
                        expect( () => Y.doccirrus.schemaloader.mixSchema( this.fixture ) ).to.throw( Error, 'Unknown multi validator foo.baz' );
                    } );
                } );
            } );
        } );
    } );
} );
