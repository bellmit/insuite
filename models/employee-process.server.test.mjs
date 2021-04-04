import path from 'path';

import core from 'dc-core';

import mongoose from 'mongoose';

describe( 'employee-process', function() {

    beforeEach( async function() {
        // TODO refactor authentication handling of settings
        // TODO clean up `dcmongodb` dependencies

        this.stubs = [
            sinon.stub( core.config, 'load' ).callsFake( ( file ) => ( {
                env: {
                    // required by dcauth
                    directories: {
                        tmp: 'foo'
                    },
                    // required by
                    binutils: {}
                },
                db: {
                    mongoDb: {}
                },
                email: {}
            }[path.parse( file ).name] ) )
        ];

        await import( '../mojits/UserMgmtMojit/models/employee-process.server.yui' );

        // if we try to load directly or indirectly `dcmongodb` it crashes so for now we create the namespace manually
        const namespace = Y.namespace( 'doccirrus.mongodb' );
        // which also includes to create a dummy method
        namespace.runDb = async() => false;
    } );

    afterEach( function() {
        this.stubs.forEach( ( stub ) => stub.restore() );
        Y = null;

        for( const model of Object.keys( mongoose.connection.models ) ) {
            delete mongoose.connection.models[model];
        }
    } );

    describe( 'Y.doccirrus.schemaprocess.employee', function() {

        describe( '.pre[].run.populateAddedLocations()', async function() {

            // TODO separate the processors from the YUI loader using constructor dependency injection so it can defined directly in the tests
            beforeEach( function() {
                this.candidate = Y.doccirrus.schemaprocess.employee.pre.filter(
                    ( entry ) => entry.forAction === 'write'
                ).map(
                    ( entry ) => entry.run
                ).flat().filter(
                    ( entry ) => entry.name === 'populateAddedLocations'
                ).pop();
            } );

            context( 'with an employee which was added to an existing location', function() {

                beforeEach( function() {
                    this.fixtures = {
                        user: {},
                        employee: mongoose.model( 'Employee', new mongoose.Schema( {} ) )( {
                            locations: ['3', '4'],
                            originalData_: {
                                locations: ['1', '2']
                            }
                        } )
                    };

                    let stub = sinon.stub( Y.doccirrus.mongodb, 'runDb' );
                    stub.withArgs( sinon.match( {
                        user: this.fixtures.user,
                        action: 'get',
                        model: 'location'
                    } ) ).returns( Promise.resolve( [3, 4] ) );
                    this.stubs.push( stub );

                    stub = sinon.stub( this.fixtures.employee, 'isModified' );
                    stub.withArgs( 'locations' ).returns( true );
                    this.stubs.push( stub );
                } );

                it( 'adds location data for later audit to the given context', async function() {
                    const context = {};

                    const actual = await this.candidate.call( { context }, this.fixtures.user, this.fixtures.employee );

                    expect( actual ).to.eql( this.fixtures.employee );
                    expect( context.addedLocations ).to.eql( [3, 4] );
                } );
            } );

            context( 'with an employee which was not added to an existing location', function() {

                beforeEach( function() {

                    this.fixtures = {
                        user: {},
                        employee: mongoose.model( 'Employee', new mongoose.Schema( {} ) )( {
                            originalData_: {
                                foo: 'bar'
                            },
                            foo: 'baz'
                        } )
                    };

                    let stub = sinon.stub( this.fixtures.employee, 'isModified' );
                    stub.withArgs( 'locations' ).returns( false );
                    this.stubs.push( stub );

                    this.spy = sinon.spy( Y.doccirrus.mongodb, 'runDb' );
                } );

                afterEach( function() {
                    this.spy.restore();
                } );

                it( 'adds no data to the given context and does not read from database', async function() {
                    const context = {};

                    const actual = await this.candidate.call( context, this.fixtures.user, this.fixtures.employee );

                    expect( actual ).to.eql( this.fixtures.employee );
                    expect( context ).to.eql( {} );
                    expect( this.spy.notCalled ).to.equal( true );
                } );
            } );

        } );

        describe( '.pre[].run.populateRemovedLocations()', async function() {

            beforeEach( function() {
                this.candidate = Y.doccirrus.schemaprocess.employee.pre.filter(
                    ( entry ) => entry.forAction === 'write'
                ).map(
                    ( entry ) => entry.run
                ).flat().filter(
                    ( entry ) => entry.name === 'populateRemovedLocations'
                ).pop();
            } );

            context( 'with an employee which was removed from an existing location', function() {

                beforeEach( function() {
                    this.fixtures = {
                        locationId: new mongoose.Types.ObjectId(),
                        missingLocationId: new mongoose.Types.ObjectId(),
                        user: {},
                        employee: mongoose.model( 'Employee', new mongoose.Schema( {} ) )( {} )
                    };

                    let stub = sinon.stub( Y.doccirrus.mongodb, 'runDb' );
                    stub.withArgs( sinon.match( {
                        user: this.fixtures.user,
                        action: 'get',
                        model: 'location'
                    } ) ).returns( Promise.resolve( [this.fixtures.missingLocationId] ) );
                    this.stubs.push( stub );

                    stub = sinon.stub( this.fixtures.employee, 'isModified' );
                    stub.withArgs( 'locations' ).returns( true );
                    this.stubs.push( stub );
                } );

                it( 'adds location data for later audit to the given context', async function() {
                    const context = {
                        originalDataLocationIds: [this.fixtures.missingLocationId],
                        currentLocationIds: this.fixtures.employee.locations
                    };

                    const actual = await this.candidate.call( { context }, this.fixtures.user, this.fixtures.employee );

                    expect( actual ).to.eql( this.fixtures.employee );
                    expect( context.removedLocations ).to.eql( [this.fixtures.missingLocationId] );
                } );
            } );

            context( 'with an employee which was not removed from an existing location', function() {

                beforeEach( function() {

                    this.fixtures = {
                        user: {},
                        employee: mongoose.model( 'Employee', new mongoose.Schema( {} ) )( {
                            originalData_: {
                                foo: 'bar'
                            },
                            foo: 'baz'
                        } )
                    };

                    let stub = sinon.stub( this.fixtures.employee, 'isModified' );
                    stub.withArgs( 'locations' ).returns( false );
                    this.stubs.push( stub );

                    this.spy = sinon.spy( Y.doccirrus.mongodb, 'runDb' );
                } );

                afterEach( function() {
                    this.spy.restore();
                } );

                it( 'adds no data to the given context and does not read from database', async function() {
                    const context = {};

                    const actual = await this.candidate.call( context, this.fixtures.user, this.fixtures.employee );

                    expect( actual ).to.eql( this.fixtures.employee );
                    expect( context ).to.eql( {} );
                    expect( this.spy.notCalled ).to.equal( true );
                } );
            } );

        } );

        describe( '.audit.descrFn()', async function() {

            it( 'throws if an empty entity is given', function() {
                expect( () => Y.doccirrus.schemaprocess.employee.audit.descrFn( {} ) ).to.throw( Y.doccirrus.commonerrors.DCError );
            } );

            it( 'throws if null is given', function() {
                expect( () => Y.doccirrus.schemaprocess.employee.audit.descrFn( null ) ).to.throw( TypeError );
            } );

            it( 'throws if nothing is given', function() {
                expect( () => Y.doccirrus.schemaprocess.employee.audit.descrFn() ).to.throw( TypeError );
            } );

            it( 'returns name of the given employee and addedLocations location', function() {
                const actual = Y.doccirrus.schemaprocess.employee.audit.descrFn( {
                    _context: {
                        context: {
                            addedLocations: [
                                {
                                    locname: 'foo'
                                }
                            ]
                        }
                    },
                    firstname: 'baz',
                    lastname: 'qux'
                } );

                expect( actual ).to.include.all.string( 'foo', 'baz', 'qux' );
            } );

            it( 'returns name of the given employee and removed location', function() {
                const actual = Y.doccirrus.schemaprocess.employee.audit.descrFn( {
                    _context: {
                        context: {
                            removedLocations: [
                                {
                                    locname: 'bar'
                                }
                            ]
                        }
                    },
                    firstname: 'baz',
                    lastname: 'qux'
                } );

                expect( actual ).to.include.all.string( 'bar', 'baz', 'qux' );
            } );

            it( 'returns name of the given employee and affected locations', function() {
                const actual = Y.doccirrus.schemaprocess.employee.audit.descrFn( {
                    _context: {
                        context: {
                            addedLocations: [
                                {
                                    locname: 'fooA'
                                },
                                {
                                    locname: 'fooB'
                                }
                            ],
                            removedLocations: [
                                {
                                    locname: 'barA'
                                },
                                {
                                    locname: 'barB'
                                }
                            ]
                        }
                    },
                    firstname: 'baz',
                    lastname: 'qux'
                } );

                expect( actual ).to.include.all.string( 'fooA', 'fooB', 'barA', 'barB', 'baz', 'qux' );
            } );

            it( 'uses i18n', function() {
                const spy = sinon.spy( Y.doccirrus, 'i18n' );

                Y.doccirrus.schemaprocess.employee.audit.descrFn( {
                    _context: {
                        context: {
                            addedLocations: [
                                {
                                    locname: 'foo'
                                }],
                            removedLocations: [
                                {
                                    locname: 'bar'
                                }]
                        }
                    },
                    firstname: 'baz',
                    lastname: 'qux'
                } );

                expect( spy.called );

                spy.restore();
            } );
        } );
    } );
} );
