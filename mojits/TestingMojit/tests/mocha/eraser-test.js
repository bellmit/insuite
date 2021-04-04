const path = require( 'path' );
const util = require( 'util' );

const sinon = require( 'sinon' );
const moment = require( 'moment' );
const nmf = require( 'node-mongodb-fixtures' );

const core = require( 'dc-core' );

/* global Y, after, afterEach, before, beforeEach, describe, expect, it */

describe( 'Y.doccirrus.eraser', function() {

    before( function() {
        this.now = moment( '2012-01-07T00:00:00' );
        this.user = Y.doccirrus.auth.getSUForLocal();
    } );

    describe( '.factory()', function() {

        before( function() {
            sinon.stub( Y.doccirrus.auth, 'isMTSAppliance' ).callsFake( () => true );
            sinon.stub( Y.doccirrus.api.company, 'getActiveTenants' ).callsFake( ( args ) => args.callback( null, ['foo', 'bar', 'baz'] ) );
            sinon.stub( Y.doccirrus.auth, 'getSUForTenant' ).callsFake( ( tenant ) => ( {tenant} ) );
        } );

        after( function() {
            Y.doccirrus.auth.isMTSAppliance.restore();
            Y.doccirrus.api.company.getActiveTenants.restore();
            Y.doccirrus.auth.getSUForTenant.restore();
        } );

        describe( 'given multi tenant system', function() {

            it( 'provide service with MongoDB collection provider for all tenants', async function() {
                const candidate = await Y.doccirrus.eraser.factory( this.now );

                expect( candidate.providers['mongo/collection'].users ).to.be.deep.equal( [{tenant: this.user.tenantId}, {tenant: 'foo'}, {tenant: 'bar'}, {tenant: 'baz'}] );
            } );

        } );
    } );

    describe( 'MongoDB collection provider', function() {

        before( function() {
            this.database = {
                uri: core.utils.getDBUri( this.user.tenantId, core.db.loadDbConfig().mongoDb ),
                options: core.db.checkAndGetMongoClientOptions( core.db.loadDbConfig() ),
                // we should not use our own layer for tests
                run: util.promisify( core.db.runDb ).bind( core.db )
            };

            Y.doccirrus.schemas.foo = {
                types: {
                    root: {
                        base: {
                            type: 'any'
                        }
                    }
                },
                name: 'foo'
            };

            Y.doccirrus.schemas.bar = {
                types: {
                    root: {
                        base: {
                            type: 'any'
                        }
                    }
                },
                name: 'bar'
            };

            Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas.foo, true );
            Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas.bar, true );
        } );

        after( function() {
            delete Y.doccirrus.schemas.foo;
            delete Y.doccirrus.schemas.bar;
        } );

        describe( 'given bare collection', function() {

            beforeEach( async function() {
                this.fixtures = new nmf( {
                    dir: path.resolve( __dirname, '../fixtures/eraser/collection/bare' ),
                    mute: true
                } );

                await this.fixtures.connect( this.database.uri, this.database.options );
                await this.fixtures.unload();
                await this.fixtures.load();

                sinon.stub( Y.doccirrus.auth, 'getSUForLocal' ).callsFake( () => this.user );
                sinon.stub( Y.doccirrus.auth, 'isMTSAppliance' ).callsFake( () => false );

                this.candidate = await Y.doccirrus.eraser.factory( this.now );
            } );

            afterEach( async function() {
                await this.fixtures.disconnect();

                Y.doccirrus.auth.getSUForLocal.restore();
                Y.doccirrus.auth.isMTSAppliance.restore();
            } );

            describe( 'given single task only with expiration time', function() {

                before( function() {
                    this.tasks = [{
                        name: 'Foo',
                        model: 'foo',
                        expiration: {
                            time: 'P2D'
                        }
                    }];
                } );


                it( 'should delete only documents older than expiration time', async function() {
                    await this.candidate.run( this.tasks );

                    expect( await this.database.run( Y, {
                        model: 'foo',
                        user: this.user,
                        action: 'count'
                    } ) ).to.be.equal( 2 );
                } );
            } );

        } );

        describe( 'given small collection', function() {

            beforeEach( async function() {
                this.fixtures = new nmf( {
                    dir: path.resolve( __dirname, '../fixtures/eraser/collection/small' ),
                    mute: true
                } );

                await this.fixtures.connect( this.database.uri, this.database.options );
                await this.fixtures.unload();
                await this.fixtures.load();

                sinon.stub( Y.doccirrus.auth, 'getSUForLocal' ).callsFake( () => this.user );
                sinon.stub( Y.doccirrus.auth, 'isMTSAppliance' ).callsFake( () => false );

                this.candidate = await Y.doccirrus.eraser.factory( this.now );
            } );

            afterEach( async function() {
                await this.fixtures.disconnect();

                Y.doccirrus.auth.getSUForLocal.restore();
                Y.doccirrus.auth.isMTSAppliance.restore();
            } );

            describe( 'given single task with expiration', function() {

                before( function() {
                    this.tasks = [{
                        name: 'Foo',
                        model: 'foo',
                        expiration: {
                            field: 'baz.qux',
                            time: 'P7D'
                        }
                    }];
                } );

                it( 'should delete only documents older than expiration time', async function() {
                    await this.candidate.run( this.tasks );

                    expect( await this.database.run( Y, {
                        model: 'foo',
                        user: this.user,
                        action: 'count'
                    } ) ).to.be.equal( 4 );

                    expect( await this.database.run( Y, {
                        model: 'bar',
                        user: this.user,
                        action: 'count'
                    } ) ).to.be.equal( 10 );
                } );
            } );

            describe( 'given single task with expiration and delete criteria', function() {

                before( function() {
                    this.tasks =  [{
                        name: 'Foo',
                        model: 'foo',
                        expiration: {
                            field: 'baz.qux',
                            time: 'P6D'
                        },
                        selection: {
                            qux: {
                                $in: ['qux']
                            }
                        }
                    }];
                } );

                it( 'should delete only expired documents matching delete criteria', async function() {
                    await this.candidate.run( this.tasks );

                    expect( await this.database.run( Y, {
                        model: 'foo',
                        user: this.user,
                        action: 'count'
                    } ) ).to.be.equal( 5 );

                    expect( await this.database.run( Y, {
                        model: 'bar',
                        user: this.user,
                        action: 'count'
                    } ) ).to.be.equal( 10 );
                } );
            } );

            describe( 'given multiple tasks with expiration', function() {

                before( function() {
                    this.tasks = [{
                        name: 'Foo',
                        model: 'foo',
                        expiration: {
                            field: 'baz.qux',
                            time: 'P6D'
                        }
                    }, {
                        name: 'Bar',
                        model: 'bar',
                        expiration: {
                            field: 'bar',
                            time: 'P7D'
                        }
                    }];
                } );

                it( 'should delete only expired documents', async function() {
                    await this.candidate.run( this.tasks );

                    expect( await this.database.run( Y, {
                        model: 'foo',
                        user: this.user,
                        action: 'count'
                    } ) ).to.be.equal( 2 );

                    expect( await this.database.run( Y, {
                        model: 'bar',
                        user: this.user,
                        action: 'count'
                    } ) ).to.be.equal( 5 );
                } );
            } );

            describe( 'given multiple tasks with expiration and delete criteria', function() {

                before( function() {
                    this.tasks = [{
                        name: 'Foo',
                        model: 'foo',
                        expiration: {
                            field: 'baz.qux',
                            time: 'P6D'
                        },
                        selection: {
                            qux: {
                                $in: ['foo', 'bar', 'baz']
                            }
                        }
                    }, {
                        name: 'Bar',
                        model: 'bar',
                        expiration: {
                            field: 'bar',
                            time: 'P7D'
                        }
                    }];
                } );

                it( 'should delete only expired documents matching delete criteria', async function() {
                    await this.candidate.run( this.tasks );

                    expect( await this.database.run( Y, {
                        model: 'foo',
                        user: this.user,
                        action: 'count'
                    } ) ).to.be.equal( 7 );

                    expect( await this.database.run( Y, {
                        model: 'bar',
                        user: this.user,
                        action: 'count'
                    } ) ).to.be.equal( 5 );
                } );
            } );

            describe( 'given single task with invalid expiration time', function() {
                before( function() {
                    this.tasks = [{
                        name: 'Foo',
                        model: 'foo',
                        expiration: {
                            field: 'baz.qux',
                            time: 'foobarbaz'
                        }
                    }];
                } );

                it( 'should not delete anything and return error', async function() {
                    expect( await this.candidate.run( this.tasks ) ).to.be.instanceof( Error );

                    expect( await this.database.run( Y, {
                        model: 'foo',
                        user: this.user,
                        action: 'count'
                    } ) ).to.be.equal( 10 );

                    expect( await this.database.run( Y, {
                        model: 'bar',
                        user: this.user,
                        action: 'count'
                    } ) ).to.be.equal( 10 );
                } );
            } );

            describe( 'given single task with invalid collection', function() {
                before( function() {
                    this.tasks = [{
                        name: 'Foo',
                        model: 'fo',
                        expiration: {
                            field: 'baz.qux',
                            time: 'P7D'
                        }
                    }];
                } );

                it( 'should not delete anything and return error', async function() {
                    expect( await this.candidate.run( this.tasks ) ).to.be.instanceof( Error );

                    expect( await this.database.run( Y, {
                        model: 'foo',
                        user: this.user,
                        action: 'count'
                    } ) ).to.be.equal( 10 );

                    expect( await this.database.run( Y, {
                        model: 'bar',
                        user: this.user,
                        action: 'count'
                    } ) ).to.be.equal( 10 );
                } );
            } );

            describe( 'given single task with non existing expiration field', function() {
                before( function() {
                    this.tasks = [{
                        name: 'Foo',
                        model: 'foo',
                        expiration: {
                            field: 'baz.qux.baz',
                            time: 'P1D'
                        }
                    }];
                } );

                it( 'should not delete anything', async function() {
                    await this.candidate.run( this.tasks );

                    expect( await this.database.run( Y, {
                        model: 'foo',
                        user: this.user,
                        action: 'count'
                    } ) ).to.be.equal( 10 );

                    expect( await this.database.run( Y, {
                        model: 'bar',
                        user: this.user,
                        action: 'count'
                    } ) ).to.be.equal( 10 );
                } );
            } );

            describe( 'given multiple tasks with one invalid expiration time', function() {
                before( function() {
                    this.tasks = [{
                        name: 'Foo',
                        model: 'foo',
                        expiration: {
                            field: 'baz.qux.baz',
                            time: 'P1D'
                        }
                    }, {
                        name: 'Bar',
                        model: 'bar',
                        expiration: {
                            field: 'bar',
                            time: 'P1'
                        }
                    }];
                } );

                it( 'should not delete anything and return error', async function() {
                    expect( await this.candidate.run( this.tasks ) ).to.be.instanceof( Error );

                    expect( await this.database.run( Y, {
                        model: 'foo',
                        user: this.user,
                        action: 'count'
                    } ) ).to.be.equal( 10 );

                    expect( await this.database.run( Y, {
                        model: 'bar',
                        user: this.user,
                        action: 'count'
                    } ) ).to.be.equal( 10 );
                } );
            } );

            describe( 'given multiple tasks with one invalid task', function() {
                before( function() {
                    this.tasks = [{
                        name: 'Foo',
                        expiration: {
                            field: 'baz.qux.baz',
                            time: 'P1D'
                        }
                    }, {
                        name: 'Bar',
                        model: 'bar',
                        expiration: {
                            field: 'bar',
                            time: 'P1D'
                        }
                    }];
                } );

                it( 'should not delete anything and return error', async function() {
                    expect( await this.candidate.run( this.tasks ) ).to.be.instanceof( Error );

                    expect( await this.database.run( Y, {
                        model: 'foo',
                        user: this.user,
                        action: 'count'
                    } ) ).to.be.equal( 10 );

                    expect( await this.database.run( Y, {
                        model: 'bar',
                        user: this.user,
                        action: 'count'
                    } ) ).to.be.equal( 10 );
                } );
            } );

        } );

        describe( 'given huge collection', function() {

            beforeEach( async function() {
                this.fixtures = new nmf( {
                    dir: path.resolve( __dirname, '../fixtures/eraser/collection/huge' ),
                    mute: true
                } );

                await this.fixtures.connect( this.database.uri, this.database.options );
                await this.fixtures.unload();
                await this.fixtures.load();

                sinon.stub( Y.doccirrus.auth, 'getSUForLocal' ).callsFake( () => this.user );
                sinon.stub( Y.doccirrus.auth, 'isMTSAppliance' ).callsFake( () => false );

                this.candidate = await Y.doccirrus.eraser.factory( this.now );
            } );

            afterEach( async function() {
                await this.fixtures.disconnect();

                Y.doccirrus.auth.getSUForLocal.restore();
                Y.doccirrus.auth.isMTSAppliance.restore();
            } );

            describe( 'given multiple tasks with expiration', function() {
                before( function() {
                    this.tasks = [{
                        name: 'Foo',
                        model: 'foo',
                        expiration: {
                            field: 'baz.qux',
                            time: 'P6D'
                        }
                    }, {
                        name: 'Bar',
                        model: 'bar',
                        expiration: {
                            field: 'bar',
                            time: 'P7D'
                        }
                    }];
                } );

                it( 'should delete all expired documents', async function() {
                    this.timeout( 5000 );
                    await this.candidate.run( this.tasks );

                    expect( await this.database.run( Y, {
                        model: 'foo',
                        user: this.user,
                        action: 'count'
                    } ) ).to.be.equal( 2 );

                    expect( await this.database.run( Y, {
                        model: 'bar',
                        user: this.user,
                        action: 'count'
                    } ) ).to.be.equal( 5000 );
                } );
            } );
        } );
    } );
} );