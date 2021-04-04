import path from 'path';

import core from 'dc-core';

import pty from 'node-pty';

describe( 'xterminal-api', function() {

    beforeEach( async function() {
        this.stubs = [
            sinon.stub( core.config, 'load' ).callsFake( ( file ) => ( { // to socket: Y.doccirrus.communication
                env: {
                    // required by dcauth
                    directories: {
                        tmp: 'foo'
                    },
                    insuiteLogFile: 'bar.log',
                    // required by,
                    binutils: {}
                },
                db: {
                    mongoDb: {}
                },
                email: {}
            }[path.parse( file ).name] ) )
        ];
        await import( './xterminal-api.server.yui' );

    } );
    afterEach( function() {
        this.stubs.forEach( ( stub ) => stub.restore() );
        Y = null;
    } );

    describe( 'Y.doccirrus.api.xterminal', function(  ) {
        context( 'given a non master thread', function(  ) {
            beforeEach( function(  ) {
                this.master = sinon.stub( Y.doccirrus.ipc, 'isMaster' );
                this.master.returns( false );
            } );
            afterEach( function(  ) {
                this.master.restore();
            } );
            describe( '.getTerminal()', function(  ) {
                it( 'throws a 400 error', async function(  ) {
                    const spy = sinon.spy( pty, 'spawn' );
                    await expect(
                        core.utils.promisifyArgsCallback( Y.doccirrus.api.xterminal.getTerminal )( { data: { commandId: 'command1' } } )
                    ).to.be.rejectedWith( 'NOT_MASTER' );
                    expect(
                        spy.notCalled
                    ).to.be.equal( true );
                    spy.restore();
                } );
            } );

            describe( '.socketConnected()', function() {
                it( 'throws a 400 error', async function(  ) { // todo klein schreiben
                    await expect(
                        core.utils.promisifyArgsCallback( Y.doccirrus.api.xterminal.socketConnected )( {
                            event: 'message'
                        } )
                    ).to.be.rejectedWith( 'NOT_MASTER' );

                } );
            } );
        } );

        context( 'given a master thread', function() {
            beforeEach( function(  ) {
                this.master = sinon.stub( Y.doccirrus.ipc, 'isMaster' );
                this.master.returns( true );
            } );
            afterEach( function(  ) {
                this.master.restore();
            } );

            describe( '.getTerminal()', function(  ) {
                beforeEach( function(  ) {
                    this.stub = sinon.stub( pty, 'spawn' );
                    this.stub.returns( { pid: 1234 } );

                } );
                afterEach( function(  ) {
                    this.stub.restore();
                } );

                it( 'returns a valid pid', async function() {
                    const actual = await core.utils.promisifyArgsCallback( Y.doccirrus.api.xterminal.getTerminal )( { data: { commandId: 'command1' } } );
                    expect( this.stub.calledOnce ).to.be.true;
                    expect( actual ).to.equal( '1234' );
                } );

                it( 'throws error', async function() {
                    this.stub.returns( undefined );
                    await expect(
                        core.utils.promisifyArgsCallback( Y.doccirrus.api.xterminal.getTerminal )( { data: { commandId: 'command1' } } )
                    ).to.be.rejectedWith( 'NO_TERMINAL_OR_PID' );
                } );

            } );
        } );

        context( 'given a list of valid commands', function() { // todo
            beforeEach( function() {
                this.spy = sinon.spy( pty, 'spawn' );
                this.stub = sinon.stub( Y.doccirrus.logging, 'commands' ).value( {
                    foo: {
                        description: 'foo.bar.baz',
                        regex: `qux --foo --baz`,
                        file: 'foo.log'
                    },
                    bar: {
                        description: 'foo.bar.baz',
                        regex: `qux --foo --baz`,
                        file: 'foo.log',
                        filter: 'thread'
                    }
                } );
            } );
            afterEach( function() {
                this.spy.restore();
            } );
            describe( '.getTerminal()', function() {
                it( 'runs the given command if a valid command identifier is passed', async function() {
                    const expected = `qux --foo --baz '${Y.doccirrus.auth.getLogPath()}' | LESSSECURE=1 less`;

                    await core.utils.promisifyArgsCallback( Y.doccirrus.api.xterminal.getTerminal )( {
                        data: {
                            commandId: 'foo'
                        }
                    } );

                    expect( this.spy.getCall( 0 ).args[1][0] ).to.be.equal( expected );
                } );

                it( 'throws error today minus number should not smaller as 1', async function() {
                    await expect(
                        core.utils.promisifyArgsCallback( Y.doccirrus.api.xterminal.getTerminal )( {
                            data: {
                                commandId: 'foo',
                                todayMinusNumber: 0
                            }
                        } )
                    ).to.be.rejectedWith( 'DAY_IS_SMALLER_ONE' );

                    await expect(
                        core.utils.promisifyArgsCallback( Y.doccirrus.api.xterminal.getTerminal )( {
                            data: {
                                commandId: 'foo',
                                todayMinusNumber: -1
                            }
                        } )
                    ).to.be.rejectedWith( 'DAY_IS_SMALLER_ONE' );
                } );
                it( 'throws error thread must be positive', async function() {
                    await expect(
                        core.utils.promisifyArgsCallback( Y.doccirrus.api.xterminal.getTerminal )( {
                            data: {
                                commandId: 'bar',
                                threadNumber: -1
                            }
                        } )
                    ).to.be.rejectedWith( 'THREAD_IS_SMALLER_ZERO_OR_STRING' );
                } );

                it( 'throws error no string support for thread and or day value', async function() {

                    await expect(
                        core.utils.promisifyArgsCallback( Y.doccirrus.api.xterminal.getTerminal )( {
                            data: {
                                commandId: 'bar',
                                threadNumber: "1"
                            }
                        } )
                    ).to.be.rejectedWith( 'THREAD_IS_SMALLER_ZERO_OR_STRING' );

                    await expect(
                        core.utils.promisifyArgsCallback( Y.doccirrus.api.xterminal.getTerminal )( {
                            data: {
                                commandId: 'foo',
                                todayMinusNumber: "1"
                            }
                        } )
                    ).to.be.rejectedWith( 'DAY_IS_STRING' );
                } );

                it( 'throws error not supported command identifier', async function() {
                    await expect(
                        core.utils.promisifyArgsCallback( Y.doccirrus.api.xterminal.getTerminal )( {
                            data: {
                                commandId: 'qux'
                            }
                        } )
                    ).to.be.rejectedWith( 'NO_VALID_COMMANDID' );
                } );
            } );
        } );

        context( 'given a socket', function() {
            beforeEach( function(  ) {
                this.socket = {
                    emit: () => true,
                    on: () => true,
                    callback: () => true,
                    handshake: {
                        query: {
                            terminalId: "1234",
                            listenForTerminalExit: false
                        }
                    }
                };
            } );

            afterEach( function() {
                this.socket = undefined;
            } );

            describe( '.socketConnect()', function() {

                it.skip( 'returns a correct terminal identifier', function() {
                    // todo implement a correct .socketConnect() call
                } );

                it( 'throws 400 error no terminalId or handshake.query is undefined', async function( ) {
                    this.socket.handshake.query = undefined;

                    await expect(
                        core.utils.promisifyArgsCallback( Y.doccirrus.api.xterminal.socketConnected )( this.socket )
                    ).to.be.rejectedWith( 'NO_TERMINAL_ID' );
                } );
            } );
        } );

    } );
} );
